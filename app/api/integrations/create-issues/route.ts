// app/api/integrations/create-issues/route.ts
import { createClient } from "@/lib/supabase/server";
import { JiraIntegration } from "@/lib/integration/jira-client";
import { NextResponse } from "next/server";

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

  const body = await request.json();
  const { integration_id, executions } = body as {
    integration_id: string;
    executions: ExecPayload[];
  };

  const { data: integration, error: intError } = await supabase
    .from("integrations")
    .select("*")
    .eq("id", integration_id)
    .eq("user_id", user.id)
    .single();

  if (intError || !integration) {
    return NextResponse.json(
      { error: "Integration not found" },
      { status: 404 }
    );
  }

  const results: Array<{
    success: boolean;
    execution_id: string;
    issue_key?: string;
    run_id?: number;
    error?: string;
  }> = [];

  if (integration.integration_type === "jira") {
    const jira = new JiraIntegration(integration.config);

    for (const exec of executions) {
      try {
        const { data: attachments } = await supabase
          .from("test_attachments")
          .select("file_path")
          .eq("execution_id", exec.execution_id);

        const evidenceUrls = await Promise.all(
          (attachments || []).map(async (att) => {
            const { data } = await supabase.storage
              .from("test-attachments")
              .createSignedUrl(att.file_path, 60 * 60 * 24 * 7);
            return data?.signedUrl || "";
          })
        );

        const issue = await jira.createIssueFromFailure(
          {
            test_title: exec.test_title,
            failure_reason: exec.failure_reason || "Test failed - see details",
            suite_name: exec.suite_name,
            evidence_urls: evidenceUrls.filter(Boolean),
          },
          integration.config.projectKey
        );

        await supabase.from("integration_issues").insert({
          integration_id: integration.id,
          execution_id: exec.execution_id,
          external_issue_id: issue.key,
          external_issue_url: `${integration.config.url}/browse/${issue.key}`,
          issue_type: "bug",
          status: "open",
        });

        await supabase
          .from("test_executions")
          .update({ jira_issue_key: issue.key })
          .eq("id", exec.execution_id);

        results.push({
          success: true,
          execution_id: exec.execution_id,
          issue_key: issue.key,
        });
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        results.push({
          success: false,
          execution_id: exec.execution_id,
          error: errorMessage,
        });
      }
    }
  }
}
