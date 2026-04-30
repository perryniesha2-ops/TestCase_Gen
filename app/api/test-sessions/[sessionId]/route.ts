// app/api/test-sessions/[sessionId]/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ─── PATCH /api/test-sessions/[sessionId] ────────────────────────────────────
// Updates session state: progress, status, or completion.
// Body: {
//   status?:                "in_progress" | "paused" | "completed" | "aborted"
//   test_cases_completed?:  number
//   progress_percentage?:   number
//   passed_cases?:          number
//   failed_cases?:          number
//   blocked_cases?:         number
//   skipped_cases?:         number
//   actual_end?:            string (ISO) — set on complete/abort
// }

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ sessionId: string }> },
) {
  const { sessionId } = await ctx.params;

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

  const body = await req.json().catch(() => ({}));

  const VALID_STATUSES = new Set([
    "in_progress",
    "paused",
    "completed",
    "aborted",
  ]);
  const patch: Record<string, unknown> = {};

  if (body.status !== undefined) {
    if (!VALID_STATUSES.has(body.status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }
    patch.status = body.status;
  }
  if (body.test_cases_completed !== undefined)
    patch.test_cases_completed = body.test_cases_completed;
  if (body.progress_percentage !== undefined)
    patch.progress_percentage = body.progress_percentage;
  if (body.passed_cases !== undefined) patch.passed_cases = body.passed_cases;
  if (body.failed_cases !== undefined) patch.failed_cases = body.failed_cases;
  if (body.blocked_cases !== undefined)
    patch.blocked_cases = body.blocked_cases;
  if (body.skipped_cases !== undefined)
    patch.skipped_cases = body.skipped_cases;

  // Auto-set actual_end on terminal statuses
  const isTerminal = body.status === "completed" || body.status === "aborted";
  if (isTerminal) {
    patch.actual_end = body.actual_end ?? new Date().toISOString();
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json(
      { error: "No valid fields to update" },
      { status: 400 },
    );
  }

  const { error } = await supabase
    .from("test_run_sessions")
    .update(patch)
    .eq("id", sessionId)
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
