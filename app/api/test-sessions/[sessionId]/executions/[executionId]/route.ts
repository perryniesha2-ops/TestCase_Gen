// app/api/test-sessions/[sessionId]/executions/[executionId]/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ─── PATCH /api/test-sessions/[sessionId]/executions/[executionId] ───────────
// Updates an execution result (pass/fail/block/skip).
// Also updates the test case's execution_status to keep it in sync.
// Body: {
//   execution_status:  "passed" | "failed" | "blocked" | "skipped"
//   execution_notes?:  string
//   failure_reason?:   string
//   completed_steps?:  number[]
//   test_case_id?:     string   (for syncing execution_status on test_cases)
//   platform_test_case_id?: string
// }

const VALID_STATUSES = new Set(["passed", "failed", "blocked", "skipped"]);

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ sessionId: string; executionId: string }> },
) {
  const { sessionId, executionId } = await ctx.params;

  const supabase = await createClient();
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();
  if (authErr || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify session belongs to user
  const { data: session } = await supabase
    .from("test_run_sessions")
    .select("id")
    .eq("id", sessionId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  // Verify execution belongs to session
  const { data: existing } = await supabase
    .from("test_executions")
    .select("id, test_case_id, platform_test_case_id")
    .eq("id", executionId)
    .eq("session_id", sessionId)
    .maybeSingle();

  if (!existing) {
    return NextResponse.json({ error: "Execution not found" }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));
  const { execution_status, execution_notes, failure_reason, completed_steps } =
    body;

  if (!execution_status || !VALID_STATUSES.has(execution_status)) {
    return NextResponse.json(
      { error: "Valid execution_status is required" },
      { status: 400 },
    );
  }

  if (execution_status === "failed" && !failure_reason?.trim()) {
    return NextResponse.json(
      { error: "failure_reason is required when status is failed" },
      { status: 400 },
    );
  }

  const completedAt = new Date().toISOString();

  // Update execution row
  const { error: updateError } = await supabase
    .from("test_executions")
    .update({
      execution_status,
      completed_at: completedAt,
      execution_notes: execution_notes || null,
      failure_reason:
        execution_status === "failed" ? failure_reason || null : null,
      completed_steps: Array.isArray(completed_steps) ? completed_steps : [],
    })
    .eq("id", executionId);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  // Sync execution_status onto the test case — non-fatal if this fails
  const testCaseId = body.test_case_id ?? existing.test_case_id;
  const platformTestCaseId =
    body.platform_test_case_id ?? existing.platform_test_case_id;

  if (testCaseId) {
    await supabase
      .from("test_cases")
      .update({ execution_status })
      .eq("id", testCaseId)
      .eq("user_id", user.id);
  } else if (platformTestCaseId) {
    await supabase
      .from("platform_test_cases")
      .update({ execution_status })
      .eq("id", platformTestCaseId)
      .eq("user_id", user.id);
  }

  return NextResponse.json({ success: true, completedAt });
}
