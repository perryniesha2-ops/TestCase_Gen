// app/api/test-cases/[testCaseId]/versions/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ─── GET /api/test-cases/[testCaseId]/versions ────────────────────────────────
// Returns all saved versions for a test case, newest first.

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ testCaseId: string }> },
) {
  const { testCaseId } = await ctx.params;

  const supabase = await createClient();
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();
  if (authErr || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify the test case belongs to this user
  const { data: tc } = await supabase
    .from("test_cases")
    .select("id")
    .eq("id", testCaseId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!tc) {
    return NextResponse.json({ error: "Test case not found" }, { status: 404 });
  }

  const { data, error } = await supabase
    .from("test_case_versions")
    .select(
      "id, version_number, created_at, change_note, title, description, preconditions, test_steps, expected_result, priority, status",
    )
    .eq("test_case_id", testCaseId)
    .order("version_number", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ versions: data ?? [] });
}

// ─── POST /api/test-cases/[testCaseId]/versions ───────────────────────────────
// Snapshots the current state of the test case as a new version.
// Optionally accepts a { change_note } body.

export async function POST(
  request: Request,
  ctx: { params: Promise<{ testCaseId: string }> },
) {
  const { testCaseId } = await ctx.params;

  const supabase = await createClient();
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();
  if (authErr || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Fetch the current test case (verifies ownership)
  const { data: tc, error: tcErr } = await supabase
    .from("test_cases")
    .select(
      "id, title, description, preconditions, test_steps, expected_result, priority, status",
    )
    .eq("id", testCaseId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (tcErr || !tc) {
    return NextResponse.json({ error: "Test case not found" }, { status: 404 });
  }

  // Determine the next version number
  const { data: latest } = await supabase
    .from("test_case_versions")
    .select("version_number")
    .eq("test_case_id", testCaseId)
    .order("version_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextVersion = (latest?.version_number ?? 0) + 1;

  const body = await request.json().catch(() => ({}));
  const changeNote = (body?.change_note ?? "").trim() || null;

  const { data: version, error: insertErr } = await supabase
    .from("test_case_versions")
    .insert({
      test_case_id: testCaseId,
      version_number: nextVersion,
      change_note: changeNote,
      title: tc.title,
      description: tc.description,
      preconditions: tc.preconditions,
      test_steps: tc.test_steps,
      expected_result: tc.expected_result,
      priority: tc.priority,
      status: tc.status,
    })
    .select()
    .single();

  if (insertErr) {
    return NextResponse.json({ error: insertErr.message }, { status: 500 });
  }

  return NextResponse.json({ version }, { status: 201 });
}
