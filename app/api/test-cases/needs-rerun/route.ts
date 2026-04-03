// app/api/test-cases/needs-rerun/route.ts

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  const project_id = url.searchParams.get("project_id");

  // Fetch needs_rerun cases — no jira_issue_key on this table
  let q = supabase
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
    console.error("[needs-rerun] DB error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!cases || cases.length === 0) {
    return NextResponse.json({ cases: [], total: 0 });
  }

  // Look up the most recent failed execution per case to get the jira_issue_key
  const caseIds = cases.map((c) => c.id);

  const { data: executions } = await supabase
    .from("test_executions")
    .select("test_case_id, jira_issue_key")
    .in("test_case_id", caseIds)
    .eq("execution_status", "failed")
    .not("jira_issue_key", "is", null)
    .order("created_at", { ascending: false });

  // Keep only the most recent jira key per case
  const jiraKeyByCaseId = new Map<string, string>();
  for (const exec of executions ?? []) {
    if (!jiraKeyByCaseId.has(exec.test_case_id) && exec.jira_issue_key) {
      jiraKeyByCaseId.set(exec.test_case_id, exec.jira_issue_key);
    }
  }

  // Resolve Jira issue URLs from integration_issues
  const jiraKeys = [...new Set(jiraKeyByCaseId.values())];
  const issueUrlMap = new Map<string, string>();

  if (jiraKeys.length > 0) {
    const { data: integrationIssues } = await supabase
      .from("integration_issues")
      .select("external_issue_id, external_issue_url")
      .in("external_issue_id", jiraKeys);

    for (const issue of integrationIssues ?? []) {
      issueUrlMap.set(issue.external_issue_id, issue.external_issue_url);
    }
  }

  const shaped = cases.map((c) => {
    const jiraKey = jiraKeyByCaseId.get(c.id) ?? null;
    return {
      ...c,
      jira_issue_key: jiraKey,
      jira_issue_url: jiraKey ? (issueUrlMap.get(jiraKey) ?? null) : null,
    };
  });

  return NextResponse.json({ cases: shaped, total: shaped.length });
}

export async function POST(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const { suite_id, case_ids, project_id } = body as {
    suite_id: string;
    case_ids: string[];
    project_id?: string;
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

  // Verify cases belong to this user and are needs_rerun
  const { data: cases, error: casesError } = await supabase
    .from("test_cases")
    .select("id, title")
    .eq("user_id", user.id)
    .eq("status", "needs_rerun")
    .in("id", case_ids);

  if (casesError)
    return NextResponse.json({ error: casesError.message }, { status: 500 });
  if (!cases || cases.length === 0)
    return NextResponse.json(
      { error: "No eligible cases found" },
      { status: 400 },
    );

  const verifiedIds = cases.map((c) => c.id);
  const now = new Date().toISOString();

  // Create the run session
  const { data: session, error: sessionError } = await supabase
    .from("test_run_sessions")
    .insert({
      user_id: user.id,
      suite_id,
      project_id: project_id ?? null,
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
    console.error("[rerun] Session creation error:", sessionError);
    return NextResponse.json(
      { error: sessionError?.message ?? "Failed to create session" },
      { status: 500 },
    );
  }

  // Create draft executions
  const { error: execError } = await supabase.from("test_executions").insert(
    verifiedIds.map((caseId) => ({
      user_id: user.id,
      suite_id,
      session_id: session.id,
      test_case_id: caseId,
      execution_status: "not_run",
      created_at: now,
    })),
  );

  if (execError) {
    console.error("[rerun] Execution insert error:", execError);
    await supabase.from("test_run_sessions").delete().eq("id", session.id);
    return NextResponse.json({ error: execError.message }, { status: 500 });
  }

  // Clear needs_rerun flag
  await supabase
    .from("test_cases")
    .update({ status: "draft" })
    .eq("user_id", user.id)
    .in("id", verifiedIds);

  return NextResponse.json({
    session_id: session.id,
    session_name: session.name,
    case_count: verifiedIds.length,
  });
}
