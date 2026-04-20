// app/api/test-sessions/[sessionId]/executions/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ─── GET /api/test-sessions/[sessionId]/executions ───────────────────────────
// Finds an existing execution for a test case within this session.
// Query params: testCaseId, isRegular (true|false)

export async function GET(
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

  const url = new URL(req.url);
  const testCaseId = url.searchParams.get("testCaseId");
  const isRegular = url.searchParams.get("isRegular") !== "false";

  if (!testCaseId) {
    return NextResponse.json(
      { error: "testCaseId is required" },
      { status: 400 },
    );
  }

  let query = supabase
    .from("test_executions")
    .select(
      "id, execution_status, execution_notes, failure_reason, completed_steps",
    )
    .eq("session_id", sessionId);

  query = isRegular
    ? query.eq("test_case_id", testCaseId)
    : query.eq("platform_test_case_id", testCaseId);
  const { data, error } = await query
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ execution: data ?? null });
}

// ─── POST /api/test-sessions/[sessionId]/executions ──────────────────────────
// Creates a new execution row for a test case within this session.
// Body: {
//   test_case_id?:          string  (regular)
//   platform_test_case_id?: string  (cross-platform)
//   suite_id:               string
// }

export async function POST(
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

  const body = await req.json().catch(() => ({}));
  const { test_case_id, platform_test_case_id, suite_id } = body;

  if (!test_case_id && !platform_test_case_id) {
    return NextResponse.json(
      { error: "test_case_id or platform_test_case_id is required" },
      { status: 400 },
    );
  }
  if (!suite_id) {
    return NextResponse.json(
      { error: "suite_id is required" },
      { status: 400 },
    );
  }

  const { data, error } = await supabase
    .from("test_executions")
    .insert({
      test_case_id: test_case_id ?? null,
      platform_test_case_id: platform_test_case_id ?? null,
      suite_id,
      session_id: sessionId,
      executed_by: user.id,
      execution_status: "in_progress",
      started_at: new Date().toISOString(),
      completed_steps: [],
      failed_steps: [],
      execution_notes: null,
      failure_reason: null,
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ executionId: data.id }, { status: 201 });
}
