// app/api/executions/route.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ─── GET /api/executions ──────────────────────────────────────────────────────
// Query params:
//   testCaseId  — required
//   caseType    — "regular" | "cross-platform" (default: "regular")
//   sessionId   — optional, scopes to a specific test session (regular only)
//
// Returns the most recent execution row for the given test case.

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();

  if (authErr || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const testCaseId = url.searchParams.get("testCaseId");
  const caseType = url.searchParams.get("caseType") ?? "regular";
  const sessionId = url.searchParams.get("sessionId") || null;

  if (!testCaseId) {
    return NextResponse.json(
      { error: "testCaseId is required" },
      { status: 400 },
    );
  }

  const table =
    caseType === "cross-platform"
      ? "platform_test_executions"
      : "test_executions";

  let query = supabase
    .from(table)
    .select("*")
    .eq("test_case_id", testCaseId)
    .eq("executed_by", user.id)
    .order("created_at", { ascending: false })
    .limit(1);

  // Session scoping only applies to regular test executions
  if (sessionId && caseType === "regular") {
    query = query.eq("session_id", sessionId);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const row = data?.[0] ?? null;
  if (!row) {
    return NextResponse.json({ execution: null });
  }

  // Normalise to a consistent shape regardless of which table was queried
  const execution = {
    id: row.id,
    status: row.execution_status,
    completedSteps: row.completed_steps ?? [],
    failedSteps: row.failed_steps ?? [],
    notes: row.notes ?? row.execution_notes ?? null,
    failure_reason: row.failure_reason ?? null,
    started_at: row.started_at ?? null,
    completed_at: row.completed_at ?? null,
    duration_minutes:
      row.duration_minutes ??
      (row.duration_seconds ? Math.round(row.duration_seconds / 60) : null),
    test_environment: row.test_environment ?? null,
    browser: row.browser ?? null,
    os_version: row.os_version ?? null,
    device_type: row.device_type ?? null,
    attachments: row.attachments ?? [],
  };

  return NextResponse.json({ execution });
}

// ─── POST /api/executions ─────────────────────────────────────────────────────
// Upserts an execution row and syncs execution_status on the test case.
// Duration is computed server-side from started_at → completed_at.
//
// Body: {
//   testCaseId:      string
//   caseType:        "regular" | "cross-platform"
//   executionId?:    string   — existing row ID for updates
//   sessionId?:      string
//   status:          ExecutionStatus
//   completedSteps?: number[]
//   failedSteps?:    Array<{ step_number: number; failure_reason: string }>
//   notes?:          string
//   failure_reason?: string
//   test_environment?: string
//   browser?:        string
//   os_version?:     string
//   started_at?:     string   — ISO timestamp, set by client on first start
// }

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();

  if (authErr || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));

  const testCaseId: string = body.testCaseId;
  const caseType: "regular" | "cross-platform" = body.caseType ?? "regular";
  const executionId: string | null = body.executionId ?? null;
  const sessionId: string | null = body.sessionId ?? null;
  const status: string = body.status ?? "in_progress";
  const completedSteps: number[] = Array.isArray(body.completedSteps)
    ? body.completedSteps
    : [];
  const failedSteps: unknown[] = Array.isArray(body.failedSteps)
    ? body.failedSteps
    : [];
  const clientStartedAt: string | null = body.started_at ?? null;

  if (!testCaseId) {
    return NextResponse.json(
      { error: "testCaseId is required" },
      { status: 400 },
    );
  }

  const FINAL_STATUSES = new Set(["passed", "failed", "blocked", "skipped"]);
  const isFinal = FINAL_STATUSES.has(status);
  const now = new Date().toISOString();

  // Determine timestamps
  const startedAt =
    status === "not_run"
      ? null
      : (clientStartedAt ?? (status === "in_progress" ? now : null));

  const completedAt = isFinal ? now : null;

  // Compute duration server-side — no trust of client-sent duration values
  let durationSeconds: number | null = null;
  if (completedAt && startedAt) {
    durationSeconds = Math.round(
      (new Date(completedAt).getTime() - new Date(startedAt).getTime()) / 1000,
    );
  }

  const execTable =
    caseType === "cross-platform"
      ? "platform_test_executions"
      : "test_executions";

  const caseTable =
    caseType === "cross-platform" ? "platform_test_cases" : "test_cases";

  const commonPayload: Record<string, unknown> = {
    test_case_id: testCaseId,
    executed_by: user.id,
    execution_status: status,
    execution_type: "manual",
    completed_steps: completedSteps,
    failed_steps: failedSteps,
    notes: body.notes ?? null,
    failure_reason: body.failure_reason ?? null,
    test_environment: body.test_environment ?? "staging",
    browser: body.browser ?? null,
    os_version: body.os_version ?? null,
    started_at: startedAt,
    completed_at: completedAt,
    updated_at: now,
    ...(durationSeconds !== null && { duration_seconds: durationSeconds }),
  };

  // session_id only for regular executions
  if (caseType === "regular") {
    commonPayload.session_id = sessionId;
  }

  let savedId = executionId;

  if (executionId) {
    // Update existing row — verify ownership first
    const { data: existing } = await supabase
      .from(execTable)
      .select("id")
      .eq("id", executionId)
      .eq("executed_by", user.id)
      .maybeSingle();

    if (!existing) {
      return NextResponse.json(
        { error: "Execution not found" },
        { status: 404 },
      );
    }

    const { error } = await supabase
      .from(execTable)
      .update(commonPayload)
      .eq("id", executionId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  } else {
    // Insert new row
    const { data, error } = await supabase
      .from(execTable)
      .insert(commonPayload)
      .select("id")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    savedId = data.id;
  }

  // Sync execution_status on the test case — atomic with the execution save
  // Non-fatal: log but don't fail the response if this update errors
  const { error: syncErr } = await supabase
    .from(caseTable)
    .update({ execution_status: status })
    .eq("id", testCaseId)
    .eq("user_id", user.id);

  if (syncErr) {
    console.error(
      "[executions] Failed to sync execution_status:",
      syncErr.message,
    );
  }

  return NextResponse.json({
    success: true,
    executionId: savedId,
    startedAt,
    completedAt,
    durationSeconds,
  });
}
