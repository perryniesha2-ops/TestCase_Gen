// app/api/integrations/jira/webhook/route.ts
//
// Receives Jira issue events and syncs status back to test executions.
//
// Setup in Jira:
//   Project Settings → Automation → Webhooks → Add webhook
//   URL: https://your-app.com/api/integrations/jira/webhook?integration_id=<id>
//   Events: Issue updated, Issue transitioned
//
// Or via Jira Admin → System → WebHooks (Cloud admin required for global hooks).

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import crypto from "crypto";

export const runtime = "nodejs";

// ─── Types ────────────────────────────────────────────────────────────────────

// Jira webhook payload shape (simplified — Jira sends a lot more)
interface JiraWebhookPayload {
  webhookEvent: string; // "jira:issue_updated", "jira:issue_deleted", etc.
  issue?: {
    id: string;
    key: string; // e.g. "PROJ-123"
    fields?: {
      status?: {
        name: string; // "To Do", "In Progress", "Done", "Closed", etc.
        statusCategory?: {
          key: string; // "new", "indeterminate", "done"
        };
      };
      resolution?: {
        name: string; // "Fixed", "Won't Fix", "Duplicate", etc.
      } | null;
      assignee?: {
        displayName: string;
        emailAddress: string;
      } | null;
      comment?: {
        comments?: Array<{
          body: string;
          author: { displayName: string };
          created: string;
        }>;
      };
    };
  };
  changelog?: {
    items: Array<{
      field: string;
      fromString: string | null;
      toString: string | null;
    }>;
  };
  user?: {
    displayName: string;
    emailAddress: string;
  };
  timestamp: number;
}

// What we store in integration_issues.status
type IssueStatus = "open" | "in_progress" | "resolved" | "closed" | "wont_fix";

// What we update test_executions.status to when an issue is resolved
type ExecutionStatus = "passed" | "failed" | "blocked" | "pending_rerun";

// ─── Status mapping ───────────────────────────────────────────────────────────

/**
 * Maps Jira status category keys and common status names to our internal status.
 * Jira's statusCategory.key is more reliable than status.name (which is user-customisable).
 */
function mapJiraStatusToInternal(
  statusName: string,
  statusCategoryKey?: string,
  resolutionName?: string | null,
): IssueStatus {
  // Resolution takes priority — if set, the issue is done in some form
  if (resolutionName) {
    const res = resolutionName.toLowerCase();
    if (
      res.includes("won't fix") ||
      res.includes("wont fix") ||
      res.includes("duplicate") ||
      res.includes("invalid")
    ) {
      return "wont_fix";
    }
    return "resolved";
  }

  // Status category is the most reliable signal
  if (statusCategoryKey === "done") return "closed";
  if (statusCategoryKey === "indeterminate") return "in_progress";

  // Fall back to name matching for common Jira defaults
  const name = statusName.toLowerCase();
  if (
    name.includes("done") ||
    name.includes("closed") ||
    name.includes("resolved") ||
    name.includes("complete")
  ) {
    return "closed";
  }
  if (
    name.includes("progress") ||
    name.includes("review") ||
    name.includes("testing")
  ) {
    return "in_progress";
  }
  if (
    name.includes("won't") ||
    name.includes("wont") ||
    name.includes("duplicate") ||
    name.includes("invalid")
  ) {
    return "wont_fix";
  }

  return "open";
}

/**
 * When a Jira issue is resolved/closed, decide what to do with the linked test execution.
 * "resolved" → mark test as pending re-run so QA can verify the fix
 * "wont_fix"  → mark test as blocked (the bug is accepted, test expectation may change)
 * "closed"    → same as resolved
 */
function mapIssueStatusToExecutionAction(
  issueStatus: IssueStatus,
): { executionStatus: ExecutionStatus; shouldRequeue: boolean } | null {
  switch (issueStatus) {
    case "resolved":
    case "closed":
      return { executionStatus: "pending_rerun", shouldRequeue: true };
    case "wont_fix":
      return { executionStatus: "blocked", shouldRequeue: false };
    default:
      return null; // no change to execution for open/in_progress
  }
}

// ─── Signature verification ───────────────────────────────────────────────────

/**
 * Jira can send a secret in a header for webhook verification.
 * This is optional but recommended — store the secret in the integration config.
 */
function verifyWebhookSignature(
  rawBody: string,
  signatureHeader: string | null,
  secret: string,
): boolean {
  if (!signatureHeader || !secret) return true; // skip if not configured
  const expected = `sha256=${crypto.createHmac("sha256", secret).update(rawBody).digest("hex")}`;
  try {
    return crypto.timingSafeEqual(
      Buffer.from(signatureHeader),
      Buffer.from(expected),
    );
  } catch {
    return false;
  }
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export async function POST(request: Request) {
  const url = new URL(request.url);
  const integration_id = url.searchParams.get("integration_id");

  if (!integration_id) {
    return NextResponse.json(
      { error: "integration_id query param required" },
      { status: 400 },
    );
  }

  // Read raw body for signature verification before parsing
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

  const supabase = await createClient();

  // Fetch the integration to verify it exists and get the webhook secret
  const { data: integration, error: intError } = await supabase
    .from("integrations")
    .select("id, user_id, config, status")
    .eq("id", integration_id)
    .eq("integration_type", "jira")
    .maybeSingle();

  if (intError || !integration) {
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

  // Verify signature if a webhook secret is configured
  const webhookSecret = integration.config?.webhookSecret as string | undefined;
  const signatureHeader = request.headers.get("x-hub-signature-256");
  if (
    webhookSecret &&
    !verifyWebhookSignature(rawBody, signatureHeader, webhookSecret)
  ) {
    console.warn(
      `[jira-webhook] Signature mismatch for integration ${integration_id}`,
    );
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  // We only care about issue events
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

  // Check if a status transition happened
  const statusChanged = payload.changelog?.items.some(
    (item) => item.field === "status",
  );
  const resolutionChanged = payload.changelog?.items.some(
    (item) => item.field === "resolution",
  );

  if (!statusChanged && !resolutionChanged) {
    return NextResponse.json({
      ok: true,
      skipped: true,
      reason: "no status/resolution change",
    });
  }

  const jiraStatus = issue.fields?.status?.name ?? "";
  const categoryKey = issue.fields?.status?.statusCategory?.key;
  const resolutionName = issue.fields?.resolution?.name ?? null;

  const internalStatus = mapJiraStatusToInternal(
    jiraStatus,
    categoryKey,
    resolutionName,
  );
  const executionAction = mapIssueStatusToExecutionAction(internalStatus);

  // Find the linked integration_issue row
  const { data: integrationIssue, error: issueError } = await supabase
    .from("integration_issues")
    .select("id, execution_id, status")
    .eq("integration_id", integration_id)
    .eq("external_issue_id", issue.key)
    .maybeSingle();

  if (issueError || !integrationIssue) {
    // Issue exists in Jira but not in our DB — log and move on
    console.warn(`[jira-webhook] No integration_issue found for ${issue.key}`);
    return NextResponse.json({
      ok: true,
      skipped: true,
      reason: "issue not tracked",
    });
  }

  // Skip if status hasn't actually changed
  if (integrationIssue.status === internalStatus) {
    return NextResponse.json({
      ok: true,
      skipped: true,
      reason: "status unchanged",
    });
  }

  // Update integration_issues status
  const { error: updateIssueError } = await supabase
    .from("integration_issues")
    .update({
      status: internalStatus,
      updated_at: new Date().toISOString(),
      // Store the full Jira status name for display
      metadata: {
        jira_status: jiraStatus,
        jira_resolution: resolutionName,
        last_updated_by: payload.user?.displayName ?? "Jira automation",
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

  // If there's an execution action, update the test execution too
  if (executionAction && integrationIssue.execution_id) {
    const { error: updateExecError } = await supabase
      .from("test_executions")
      .update({
        status: executionAction.executionStatus,
        updated_at: new Date().toISOString(),
        notes: `Status updated via Jira webhook: ${jiraStatus}${resolutionName ? ` (${resolutionName})` : ""}`,
      })
      .eq("id", integrationIssue.execution_id);

    if (updateExecError) {
      console.error(
        "[jira-webhook] Failed to update test_execution:",
        updateExecError,
      );
    }

    // If the fix is verified, mark the related test case for re-run
    if (executionAction.shouldRequeue) {
      // Fetch the test_case_id from the execution
      const { data: execution } = await supabase
        .from("test_executions")
        .select("test_case_id")
        .eq("id", integrationIssue.execution_id)
        .maybeSingle();

      if (execution?.test_case_id) {
        await supabase
          .from("test_cases")
          .update({ status: "needs_rerun" })
          .eq("id", execution.test_case_id);
      }
    }
  }

  // Log the webhook event for audit trail
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
      if (error) console.warn("[jira-webhook] Failed to log event:", error);
    });

  console.log(
    `[jira-webhook] ${issue.key}: ${integrationIssue.status} → ${internalStatus}`,
  );

  return NextResponse.json({
    ok: true,
    issue_key: issue.key,
    old_status: integrationIssue.status,
    new_status: internalStatus,
    execution_updated: Boolean(
      executionAction && integrationIssue.execution_id,
    ),
  });
}
