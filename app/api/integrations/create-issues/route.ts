// app/api/integrations/create-issues/route.ts
import { createClient } from "@/lib/supabase/server";
import { JiraIntegration } from "@/lib/integration/jira-client";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type ExecPayload = {
  execution_id: string;
  test_case_id: string;
  test_title: string;
  failure_reason?: string | null;
  suite_name: string;
};

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { integration_id?: string; executions?: ExecPayload[] };
  try {
    body = await request.json();
  } catch (e) {
    return NextResponse.json(
      { error: "Invalid JSON in request body" },
      { status: 400 },
    );
  }

  const { integration_id, executions } = body;

  // Validate inputs
  if (!integration_id) {
    return NextResponse.json(
      { error: "integration_id is required" },
      { status: 400 },
    );
  }

  if (!executions || !Array.isArray(executions) || executions.length === 0) {
    return NextResponse.json(
      { error: "executions array is required and must not be empty" },
      { status: 400 },
    );
  }

  // Fetch integration
  const { data: integration, error: intError } = await supabase
    .from("integrations")
    .select("*")
    .eq("id", integration_id)
    .eq("user_id", user.id)
    .maybeSingle(); // Use maybeSingle instead of single

  if (intError) {
    return NextResponse.json({ error: intError.message }, { status: 500 });
  }

  if (!integration) {
    return NextResponse.json(
      { error: "Integration not found or you don't have permission" },
      { status: 404 },
    );
  }

  // Validate integration type
  if (integration.integration_type !== "jira") {
    return NextResponse.json(
      {
        error: `Integration type '${integration.integration_type}' is not supported yet. Only 'jira' is currently supported.`,
      },
      { status: 400 },
    );
  }

  // Validate Jira config
  const config = integration.config;
  if (
    !config?.url ||
    !config?.email ||
    !config?.apiToken ||
    !config?.projectKey
  ) {
    return NextResponse.json(
      {
        error:
          "Jira integration is missing required configuration (url, email, apiToken, projectKey)",
      },
      { status: 400 },
    );
  }

  const results: Array<{
    success: boolean;
    execution_id: string;
    issue_key?: string;
    run_id?: number;
    error?: string;
  }> = [];

  // Find the main loop in your POST function and update it:

  let created = 0;

  try {
    // Initialize Jira client
    const jira = new JiraIntegration({
      url: integration.config.url,
      email: integration.config.email,
      apiToken: integration.config.apiToken,
      projectKey: integration.config.projectKey,
    });

    console.log("✅ Jira client initialized for:", integration.config.url);

    // Process executions
    for (const exec of executions) {
      console.log(`\n📝 Processing execution ${exec.execution_id}:`, {
        test_title: exec.test_title,
        suite_name: exec.suite_name,
      });

      try {
        // Fetch attachments for this execution
        const { data: attachments, error: attError } = await supabase
          .from("test_attachments")
          .select("file_path")
          .eq("execution_id", exec.execution_id);

        if (attError) {
          console.error("❌ Attachment fetch error:", attError);
          throw new Error(`Failed to fetch attachments: ${attError.message}`);
        }

        console.log(`📎 Found ${attachments?.length ?? 0} attachments`);

        // Generate signed URLs for evidence
        const evidenceUrls: string[] = [];
        for (const att of attachments || []) {
          try {
            const { data } = await supabase.storage
              .from("test-attachments")
              .createSignedUrl(att.file_path, 60 * 60 * 24 * 7);

            if (data?.signedUrl) {
              evidenceUrls.push(data.signedUrl);
              console.log(`✅ Created signed URL for: ${att.file_path}`);
            }
          } catch (err) {
            console.error(
              `⚠️ Failed to create signed URL for ${att.file_path}:`,
              err,
            );
          }
        }

        console.log(`🔗 Total evidence URLs: ${evidenceUrls.length}`);

        // Create Jira issue
        console.log("📤 Creating Jira issue...");
        const issue = await jira.createIssueFromFailure(
          {
            test_title: exec.test_title,
            failure_reason: exec.failure_reason || "Test failed - see details",
            suite_name: exec.suite_name,
            evidence_urls: evidenceUrls,
          },
          integration.config.projectKey,
        );

        console.log("✅ Jira issue created:", issue);

        const issueKey = issue?.key;
        if (!issueKey) {
          console.error("❌ No issue key returned from Jira");
          throw new Error("Jira did not return an issue key");
        }

        console.log(`✅ Issue key: ${issueKey}`);

        // Store in integration_issues table
        const { error: issueInsertError } = await supabase
          .from("integration_issues")
          .insert({
            integration_id: integration.id,
            execution_id: exec.execution_id,
            external_issue_id: issueKey,
            external_issue_url: `${integration.config.url}/browse/${issueKey}`,
            issue_type: "bug",
            status: "open",
          });

        if (issueInsertError) {
          console.error(
            "⚠️ Failed to insert integration_issue:",
            issueInsertError,
          );
          // Continue anyway - the issue was created in Jira
        } else {
          console.log("✅ Saved to integration_issues table");
        }

        // Update test execution with Jira issue key
        const { error: updateError } = await supabase
          .from("test_executions")
          .update({ jira_issue_key: issueKey })
          .eq("id", exec.execution_id);

        if (updateError) {
          console.error("❌ Failed to update execution:", updateError);
          throw new Error(`Failed to update execution: ${updateError.message}`);
        }

        console.log("✅ Updated test_executions with issue key");

        results.push({
          success: true,
          execution_id: exec.execution_id,
          issue_key: issueKey,
        });
        created++;
        console.log(
          `✅ Successfully created issue ${created}/${executions.length}`,
        );
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        console.error(`❌ Failed to create issue for ${exec.execution_id}:`, {
          error: errorMessage,
          stack: error instanceof Error ? error.stack : undefined,
        });
        results.push({
          success: false,
          execution_id: exec.execution_id,
          error: errorMessage,
        });
      }
    }

    console.log(
      `\n📊 Final results: Created ${created} of ${executions.length} issues`,
    );

    return NextResponse.json({
      total: executions.length,
      created,
      failed: executions.length - created,
      results,
    });
  } catch (error) {
    console.error("❌ Fatal error in create-issues:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to create issues",
        total: executions.length,
        created,
        failed: executions.length - created,
        results,
      },
      { status: 500 },
    );
  }
}
