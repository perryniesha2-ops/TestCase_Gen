// app/api/integrations/jira/webhook/route.ts

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";
[
  {
    column_name: "execution_notes",
  },
  {
    column_name: "review_note",
  },
  {
    column_name: "notes",
  },
];
export const runtime = "nodejs";

type IssueStatus = "open" | "in_progress" | "resolved" | "closed" | "wont_fix";
type ExecutionStatus = "pending_rerun" | "blocked";

interface JiraWebhookPayload {
  webhookEvent: string;
  issue?: {
    id: string;
    key: string;
    fields?: {
      status?: {
        name: string;
        statusCategory?: { key: string };
      };
      resolution?: { name: string } | null;
    };
  };
  changelog?: {
    items: Array<{
      field: string;
      fieldtype?: string;
      from?: string | null;
      fromString?: string | null;
      to?: string | null;
      toString?: string | null;
    }>;
  };
  user?: { displayName: string };
  timestamp: number;
}

function mapJiraStatusToInternal(
  statusName: string,
  statusCategoryKey?: string,
  resolutionName?: string | null,
): IssueStatus {
  // Resolution set → done in some form
  if (resolutionName) {
    const r = resolutionName.toLowerCase();
    if (
      r.includes("won't fix") ||
      r.includes("wont fix") ||
      r.includes("duplicate") ||
      r.includes("invalid")
    )
      return "wont_fix";
    return "resolved";
  }
  // Status category is the most reliable signal
  if (statusCategoryKey === "done") return "closed";
  if (statusCategoryKey === "indeterminate") return "in_progress";
  // Name-based fallback
  const n = statusName.toLowerCase();
  if (
    n.includes("done") ||
    n.includes("closed") ||
    n.includes("resolved") ||
    n.includes("complete")
  )
    return "closed";
  if (n.includes("progress") || n.includes("review") || n.includes("testing"))
    return "in_progress";
  if (
    n.includes("won't") ||
    n.includes("wont") ||
    n.includes("duplicate") ||
    n.includes("invalid")
  )
    return "wont_fix";
  return "open";
}

function verifySignature(
  rawBody: string,
  header: string | null,
  secret: string,
): boolean {
  if (!header || !secret) return true;
  const expected = `sha256=${crypto.createHmac("sha256", secret).update(rawBody).digest("hex")}`;
  try {
    return crypto.timingSafeEqual(Buffer.from(header), Buffer.from(expected));
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  const url = new URL(request.url);
  const integration_id = url.searchParams.get("integration_id");

  if (!integration_id) {
    return NextResponse.json(
      { error: "integration_id query param required" },
      { status: 400 },
    );
  }

  const rawBody = await request.text();
  let payload: JiraWebhookPayload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON payload" },
      { status: 400 },
    );
  }

  // Log the full payload shape for debugging
  console.log("[jira-webhook] Received event:", payload.webhookEvent);
  console.log("[jira-webhook] Issue key:", payload.issue?.key);
  console.log("[jira-webhook] Status:", payload.issue?.fields?.status?.name);
  console.log(
    "[jira-webhook] Status category:",
    payload.issue?.fields?.status?.statusCategory?.key,
  );
  console.log(
    "[jira-webhook] Resolution:",
    payload.issue?.fields?.resolution?.name ?? null,
  );
  console.log(
    "[jira-webhook] Changelog items:",
    JSON.stringify(payload.changelog?.items ?? []),
  );

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );

  const { data: integration, error: intError } = await supabase
    .from("integrations")
    .select("id, user_id, config, status")
    .eq("id", integration_id)
    .eq("integration_type", "jira")
    .maybeSingle();

  if (intError || !integration) {
    console.error("[jira-webhook] Integration not found:", integration_id);
    return NextResponse.json(
      { error: "Integration not found" },
      { status: 404 },
    );
  }
  if (integration.status !== "active") {
    return NextResponse.json(
      { error: "Integration is not active" },
      { status: 403 },
    );
  }

  // Signature verification
  const webhookSecret = integration.config?.webhookSecret as string | undefined;
  const signatureHeader = request.headers.get("x-hub-signature-256");
  if (
    webhookSecret &&
    !verifySignature(rawBody, signatureHeader, webhookSecret)
  ) {
    console.warn(
      "[jira-webhook] Signature mismatch — check that the secret in your app matches Jira exactly",
    );
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  // Only handle issue events
  if (!payload.webhookEvent?.startsWith("jira:issue")) {
    return NextResponse.json({
      ok: true,
      skipped: true,
      reason: "non-issue event",
    });
  }

  const issue = payload.issue;
  if (!issue?.key) {
    return NextResponse.json({
      ok: true,
      skipped: true,
      reason: "no issue key",
    });
  }

  const jiraStatus = issue.fields?.status?.name ?? "";
  const categoryKey = issue.fields?.status?.statusCategory?.key;
  const resolutionName = issue.fields?.resolution?.name ?? null;

  console.log(
    `[jira-webhook] Mapping: status="${jiraStatus}" category="${categoryKey}" resolution="${resolutionName}"`,
  );

  const internalStatus = mapJiraStatusToInternal(
    jiraStatus,
    categoryKey,
    resolutionName,
  );
  console.log(`[jira-webhook] Mapped to internal status: "${internalStatus}"`);

  // Check if this issue is tracked — look it up regardless of changelog
  // (Jira doesn't always send a changelog for every transition type)
  const { data: integrationIssue, error: issueError } = await supabase
    .from("integration_issues")
    .select("id, execution_id, status")
    .eq("integration_id", integration_id)
    .eq("external_issue_id", issue.key)
    .maybeSingle();

  if (issueError) {
    console.error(
      "[jira-webhook] DB error looking up integration_issue:",
      issueError,
    );
    return NextResponse.json({ error: issueError.message }, { status: 500 });
  }

  if (!integrationIssue) {
    console.warn(
      `[jira-webhook] No integration_issue row found for key="${issue.key}" integration="${integration_id}"`,
    );
    console.warn(
      "[jira-webhook] Tip: the issue may have been created before the integration_issues table existed, or the create-issues call failed to insert a row",
    );
    return NextResponse.json({
      ok: true,
      skipped: true,
      reason: "issue not tracked in integration_issues",
    });
  }

  console.log(
    `[jira-webhook] Found integration_issue id=${integrationIssue.id} current_status="${integrationIssue.status}"`,
  );

  // Skip if already at this status
  if (integrationIssue.status === internalStatus) {
    console.log("[jira-webhook] Status unchanged, skipping");
    return NextResponse.json({
      ok: true,
      skipped: true,
      reason: "status unchanged",
    });
  }

  // Update integration_issues
  const { error: updateIssueError } = await supabase
    .from("integration_issues")
    .update({
      status: internalStatus,
      metadata: {
        jira_status: jiraStatus,
        jira_resolution: resolutionName,
        last_updated_by: payload.user?.displayName ?? "Jira",
        last_updated_at: new Date(payload.timestamp).toISOString(),
      },
    })
    .eq("id", integrationIssue.id);

  if (updateIssueError) {
    console.error(
      "[jira-webhook] Failed to update integration_issue:",
      updateIssueError,
    );
    return NextResponse.json(
      { error: updateIssueError.message },
      { status: 500 },
    );
  }

  console.log(
    `[jira-webhook] Updated integration_issue ${issue.key}: "${integrationIssue.status}" → "${internalStatus}"`,
  );

  // Propagate to test_executions and test_cases when resolved/closed
  let executionUpdated = false;

  if (
    (internalStatus === "resolved" || internalStatus === "closed") &&
    integrationIssue.execution_id
  ) {
    const { error: execError } = await supabase
      .from("test_executions")
      .update({
        status: "pending_rerun" as ExecutionStatus,
        updated_at: new Date().toISOString(),
        notes: `Jira issue ${issue.key} resolved — awaiting re-run`,
      })
      .eq("id", integrationIssue.execution_id);

    if (execError) {
      console.error(
        "[jira-webhook] Failed to update test_execution:",
        execError,
      );
    } else {
      executionUpdated = true;

      // Mark the test case needs_rerun
      const { data: exec } = await supabase
        .from("test_executions")
        .select("test_case_id")
        .eq("id", integrationIssue.execution_id)
        .maybeSingle();

      if (exec?.test_case_id) {
        const { error: caseError } = await supabase
          .from("test_cases")
          .update({ status: "needs_rerun" })
          .eq("id", exec.test_case_id);

        if (caseError) {
          console.error(
            "[jira-webhook] Failed to update test_case:",
            caseError,
          );
        } else {
          console.log(
            `[jira-webhook] Marked test_case ${exec.test_case_id} as needs_rerun`,
          );
        }
      }
    }
  }

  if (internalStatus === "wont_fix" && integrationIssue.execution_id) {
    await supabase
      .from("test_executions")
      .update({
        status: "blocked" as ExecutionStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", integrationIssue.execution_id);
  }

  // Audit log — non-fatal if this table doesn't exist yet
  await supabase
    .from("integration_webhook_events")
    .insert({
      integration_id,
      event_type: payload.webhookEvent,
      issue_key: issue.key,
      old_status: integrationIssue.status,
      new_status: internalStatus,
      raw_payload: payload,
      processed_at: new Date().toISOString(),
    })
    .then(({ error }) => {
      if (error)
        console.warn(
          "[jira-webhook] Audit log insert failed (non-fatal):",
          error.message,
        );
    });

  return NextResponse.json({
    ok: true,
    issue_key: issue.key,
    old_status: integrationIssue.status,
    new_status: internalStatus,
    execution_updated: executionUpdated,
  });
}
