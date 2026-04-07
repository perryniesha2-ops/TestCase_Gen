// app/api/test-cases/needs-rerun/route.ts

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

function serviceClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

// ─── GET /api/test-cases/needs-rerun?project_id=<id> ─────────────────────────

export async function GET(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  const project_id = url.searchParams.get("project_id");

  const db = serviceClient();

  // Fetch needs_rerun cases
  let q = db
    .from("test_cases")
    .select(
      "id, title, description, test_type, priority, status, updated_at, project_id, requirement_id",
    )
    .eq("user_id", user.id)
    .eq("status", "needs_rerun")
    .order("updated_at", { ascending: false });

  if (project_id) q = q.eq("project_id", project_id);

  const { data: cases, error } = await q;

  if (error) {
    console.error("[needs-rerun] GET cases error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!cases || cases.length === 0) {
    return NextResponse.json({ cases: [], total: 0 });
  }

  // Resolve jira_issue_key from most recent failed execution per case
  const caseIds = cases.map((c) => c.id);

  const { data: executions } = await db
    .from("test_executions")
    .select("test_case_id, jira_issue_key")
    .in("test_case_id", caseIds)
    .eq("execution_status", "failed")
    .not("jira_issue_key", "is", null)
    .order("created_at", { ascending: false });

  const jiraKeyByCaseId = new Map<string, string>();
  for (const exec of executions ?? []) {
    if (!jiraKeyByCaseId.has(exec.test_case_id) && exec.jira_issue_key) {
      jiraKeyByCaseId.set(exec.test_case_id, exec.jira_issue_key);
    }
  }

  // Resolve Jira URLs from integration_issues
  const jiraKeys = [...new Set(jiraKeyByCaseId.values())];
  const issueUrlMap = new Map<string, string>();

  if (jiraKeys.length > 0) {
    const { data: integrationIssues } = await db
      .from("integration_issues")
      .select("external_issue_id, external_issue_url")
      .in("external_issue_id", jiraKeys);

    for (const issue of integrationIssues ?? []) {
      issueUrlMap.set(issue.external_issue_id, issue.external_issue_url);
    }
  }

  // Check for existing open re-run sessions per case
  const { data: openSessions } = await db
    .from("test_executions")
    .select(
      "test_case_id, session_id, test_run_sessions!inner(id, name, status)",
    )
    .in("test_case_id", caseIds)
    .in("test_run_sessions.status", ["planned", "in_progress"]);

  const openSessionByCaseId = new Map<
    string,
    { id: string; name: string; status: string }
  >();
  for (const row of openSessions ?? []) {
    if (!openSessionByCaseId.has(row.test_case_id)) {
      const session = Array.isArray(row.test_run_sessions)
        ? row.test_run_sessions[0]
        : row.test_run_sessions;
      if (session) openSessionByCaseId.set(row.test_case_id, session);
    }
  }

  const shaped = cases.map((c) => {
    const jiraKey = jiraKeyByCaseId.get(c.id) ?? null;
    const openSession = openSessionByCaseId.get(c.id) ?? null;
    return {
      ...c,
      jira_issue_key: jiraKey,
      jira_issue_url: jiraKey ? (issueUrlMap.get(jiraKey) ?? null) : null,
      open_session_id: openSession?.id ?? null,
      open_session_name: openSession?.name ?? null,
      open_session_status: openSession?.status ?? null,
    };
  });

  return NextResponse.json({ cases: shaped, total: shaped.length });
}

// ─── POST /api/test-cases/needs-rerun ────────────────────────────────────────

export async function POST(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const { suite_id, case_ids } = body as {
    suite_id: string;
    case_ids: string[];
  };

  if (!suite_id)
    return NextResponse.json(
      { error: "suite_id is required" },
      { status: 400 },
    );
  if (!case_ids || case_ids.length === 0)
    return NextResponse.json(
      { error: "case_ids is required" },
      { status: 400 },
    );

  const db = serviceClient();

  // Verify cases belong to this user and are needs_rerun
  const { data: cases, error: casesError } = await db
    .from("test_cases")
    .select("id, title")
    .eq("user_id", user.id)
    .eq("status", "needs_rerun")
    .in("id", case_ids);

  if (casesError) {
    console.error("[needs-rerun] POST cases verify error:", casesError);
    return NextResponse.json({ error: casesError.message }, { status: 500 });
  }
  if (!cases || cases.length === 0)
    return NextResponse.json(
      { error: "No eligible cases found" },
      { status: 400 },
    );

  const verifiedIds = cases.map((c) => c.id);
  const now = new Date().toISOString();

  // Check if there is already an open session for any of these cases
  // Return it instead of creating a duplicate
  const { data: existingSession } = await db
    .from("test_executions")
    .select("session_id, test_run_sessions!inner(id, name, status)")
    .in("test_case_id", verifiedIds)
    .in("test_run_sessions.status", ["planned", "in_progress"])
    .limit(1)
    .maybeSingle();

  if (existingSession) {
    const session = Array.isArray(existingSession.test_run_sessions)
      ? existingSession.test_run_sessions[0]
      : existingSession.test_run_sessions;
    if (session) {
      console.log("[needs-rerun] Returning existing open session:", session.id);
      return NextResponse.json({
        session_id: session.id,
        session_name: session.name,
        case_count: verifiedIds.length,
        existing: true,
      });
    }
  }

  // Create the run session
  const { data: session, error: sessionError } = await db
    .from("test_run_sessions")
    .insert({
      user_id: user.id,
      suite_id,
      name: `Re-run: ${verifiedIds.length} fix verification${verifiedIds.length !== 1 ? "s" : ""} — ${new Date().toLocaleDateString()}`,
      status: "planned",
      test_cases_total: verifiedIds.length,
      test_cases_completed: 0,
      passed_cases: 0,
      failed_cases: 0,
      skipped_cases: 0,
      blocked_cases: 0,
      progress_percentage: 0,
      auto_advance: true,
      planned_start: now,
    })
    .select("id, name")
    .single();

  if (sessionError || !session) {
    console.error("[needs-rerun] Session creation error:", sessionError);
    return NextResponse.json(
      { error: sessionError?.message ?? "Failed to create session" },
      { status: 500 },
    );
  }

  // Create executions for each case
  const { error: execError } = await db.from("test_executions").insert(
    verifiedIds.map((caseId) => ({
      user_id: user.id,
      executed_by: user.id,
      suite_id,
      session_id: session.id,
      test_case_id: caseId,
      execution_status: "not_run",
      execution_type: "manual",
      created_at: now,
    })),
  );

  if (execError) {
    console.error("[needs-rerun] Execution insert error:", execError);
    // Roll back the session
    await db.from("test_run_sessions").delete().eq("id", session.id);
    return NextResponse.json({ error: execError.message }, { status: 500 });
  }

  // NOTE: needs_rerun flag is NOT cleared here.
  // It gets cleared when the re-run session completes:
  //   - passed  → status = 'active'   (fix verified)
  //   - failed  → status = 'needs_rerun' (fix didn't work, stays in panel)
  //   - blocked/skipped → status = 'needs_rerun' (still needs attention)
  // This prevents cases from disappearing if the user never executes the session.

  return NextResponse.json({
    session_id: session.id,
    session_name: session.name,
    case_count: verifiedIds.length,
  });
}
