// app/api/integrations/jira/sync/route.ts
//
// Polls Jira for current status of all tracked open issues for a given integration.
// Use this as a fallback when webhooks aren't available, or run it on a schedule
// via Vercel Cron / any cron service hitting GET /api/integrations/jira/sync.
//
// GET  /api/integrations/jira/sync?integration_id=<id>   → sync one integration
// GET  /api/integrations/jira/sync                        → sync all active integrations (cron use)
// POST /api/integrations/jira/sync                        → same as GET, but callable from UI

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { JiraIntegration } from "@/lib/integration/jira-client";

export const runtime = "nodejs";

// Reuse the same mapping logic from the webhook handler
type IssueStatus = "open" | "in_progress" | "resolved" | "closed" | "wont_fix";

function mapJiraStatusToInternal(
  statusName: string,
  statusCategoryKey?: string,
  resolutionName?: string | null,
): IssueStatus {
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
  if (statusCategoryKey === "done") return "closed";
  if (statusCategoryKey === "indeterminate") return "in_progress";
  const name = statusName.toLowerCase();
  if (
    name.includes("done") ||
    name.includes("closed") ||
    name.includes("resolved") ||
    name.includes("complete")
  )
    return "closed";
  if (
    name.includes("progress") ||
    name.includes("review") ||
    name.includes("testing")
  )
    return "in_progress";
  if (
    name.includes("won't") ||
    name.includes("wont") ||
    name.includes("duplicate") ||
    name.includes("invalid")
  )
    return "wont_fix";
  return "open";
}

// ─── Core sync for one integration ───────────────────────────────────────────

interface SyncResult {
  integration_id: string;
  synced: number;
  changed: number;
  errors: number;
  details: Array<{
    issue_key: string;
    old_status: string;
    new_status: string;
    changed: boolean;
    error?: string;
  }>;
}

async function syncIntegration(
  supabase: Awaited<ReturnType<typeof createClient>>,
  integration: {
    id: string;
    config: Record<string, string>;
  },
): Promise<SyncResult> {
  const result: SyncResult = {
    integration_id: integration.id,
    synced: 0,
    changed: 0,
    errors: 0,
    details: [],
  };

  // Fetch all non-closed tracked issues for this integration
  const { data: trackedIssues, error: fetchError } = await supabase
    .from("integration_issues")
    .select("id, execution_id, external_issue_id, status")
    .eq("integration_id", integration.id)
    .not("status", "in", '("closed","wont_fix","resolved")'); // skip already-done issues

  if (fetchError || !trackedIssues?.length) {
    if (fetchError)
      console.error(
        `[jira-sync] Fetch error for ${integration.id}:`,
        fetchError,
      );
    return result;
  }

  const jira = new JiraIntegration({
    url: integration.config.url,
    email: integration.config.email,
    apiToken: integration.config.apiToken,
    projectKey: integration.config.projectKey,
  });

  // Batch fetch issue statuses from Jira using JQL
  // JQL: issue in (PROJ-1, PROJ-2, ...) — Jira handles up to ~100 keys per request
  const issueKeys = trackedIssues.map((i) => i.external_issue_id);

  let jiraIssues: Array<{
    key: string;
    fields: {
      status: { name: string; statusCategory?: { key: string } };
      resolution: { name: string } | null;
    };
  }> = [];

  try {
    jiraIssues = await jira.searchIssuesByKeys(issueKeys);
  } catch (err) {
    console.error(`[jira-sync] Failed to fetch issues from Jira:`, err);
    result.errors = trackedIssues.length;
    return result;
  }

  // Build a lookup map for quick access
  const jiraMap = new Map(jiraIssues.map((i) => [i.key, i]));

  for (const tracked of trackedIssues) {
    const jiraIssue = jiraMap.get(tracked.external_issue_id);
    if (!jiraIssue) {
      result.details.push({
        issue_key: tracked.external_issue_id,
        old_status: tracked.status,
        new_status: tracked.status,
        changed: false,
        error: "Not found in Jira — may have been deleted",
      });
      result.errors++;
      continue;
    }

    const newStatus = mapJiraStatusToInternal(
      jiraIssue.fields.status.name,
      jiraIssue.fields.status.statusCategory?.key,
      jiraIssue.fields.resolution?.name ?? null,
    );

    result.synced++;

    if (newStatus === tracked.status) {
      result.details.push({
        issue_key: tracked.external_issue_id,
        old_status: tracked.status,
        new_status: newStatus,
        changed: false,
      });
      continue;
    }

    // Status changed — update integration_issues
    const { error: updateError } = await supabase
      .from("integration_issues")
      .update({
        status: newStatus,
        updated_at: new Date().toISOString(),
        metadata: {
          jira_status: jiraIssue.fields.status.name,
          jira_resolution: jiraIssue.fields.resolution?.name ?? null,
          synced_at: new Date().toISOString(),
          sync_source: "poll",
        },
      })
      .eq("id", tracked.id);

    if (updateError) {
      result.errors++;
      result.details.push({
        issue_key: tracked.external_issue_id,
        old_status: tracked.status,
        new_status: newStatus,
        changed: false,
        error: updateError.message,
      });
      continue;
    }

    result.changed++;

    // Propagate status change to test execution if resolved/closed/wont_fix
    if (
      (newStatus === "resolved" || newStatus === "closed") &&
      tracked.execution_id
    ) {
      await supabase
        .from("test_executions")
        .update({
          status: "pending_rerun",
          updated_at: new Date().toISOString(),
          notes: `Jira issue ${tracked.external_issue_id} resolved — awaiting re-run`,
        })
        .eq("id", tracked.execution_id);

      // Mark the linked test case as needing a re-run
      const { data: exec } = await supabase
        .from("test_executions")
        .select("test_case_id")
        .eq("id", tracked.execution_id)
        .maybeSingle();

      if (exec?.test_case_id) {
        await supabase
          .from("test_cases")
          .update({ status: "needs_rerun" })
          .eq("id", exec.test_case_id);
      }
    }

    if (newStatus === "wont_fix" && tracked.execution_id) {
      await supabase
        .from("test_executions")
        .update({
          status: "blocked",
          updated_at: new Date().toISOString(),
          notes: `Jira issue ${tracked.external_issue_id} marked Won't Fix`,
        })
        .eq("id", tracked.execution_id);
    }

    result.details.push({
      issue_key: tracked.external_issue_id,
      old_status: tracked.status,
      new_status: newStatus,
      changed: true,
    });
  }

  // Update last_synced_at on the integration
  await supabase
    .from("integrations")
    .update({ last_synced_at: new Date().toISOString() })
    .eq("id", integration.id);

  return result;
}

// ─── Route handlers ───────────────────────────────────────────────────────────

async function handleSync(request: Request) {
  const supabase = await createClient();

  // Cron requests come in without a user session — allow via CRON_SECRET header
  const cronSecret = request.headers.get("x-cron-secret");
  const isCron =
    cronSecret === process.env.CRON_SECRET && Boolean(process.env.CRON_SECRET);

  if (!isCron) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const integration_id = url.searchParams.get("integration_id");

  // Sync a specific integration
  if (integration_id) {
    const { data: integration, error } = await supabase
      .from("integrations")
      .select("id, config, status")
      .eq("id", integration_id)
      .eq("integration_type", "jira")
      .eq("status", "active")
      .maybeSingle();

    if (error || !integration) {
      return NextResponse.json(
        { error: "Integration not found or inactive" },
        { status: 404 },
      );
    }

    const result = await syncIntegration(supabase, integration);
    return NextResponse.json({ ok: true, results: [result] });
  }

  // Cron mode: sync all active Jira integrations with sync_enabled = true
  const { data: integrations, error: listError } = await supabase
    .from("integrations")
    .select("id, config, status")
    .eq("integration_type", "jira")
    .eq("status", "active")
    .eq("sync_enabled", true);

  if (listError) {
    return NextResponse.json({ error: listError.message }, { status: 500 });
  }

  const results = await Promise.allSettled(
    (integrations ?? []).map((i) => syncIntegration(supabase, i)),
  );

  const summary = results.map((r) =>
    r.status === "fulfilled"
      ? r.value
      : { error: r.reason?.message ?? "Unknown error" },
  );

  return NextResponse.json({
    ok: true,
    synced_at: new Date().toISOString(),
    total: integrations?.length ?? 0,
    results: summary,
  });
}

export async function GET(request: Request) {
  return handleSync(request);
}

export async function POST(request: Request) {
  return handleSync(request);
}
