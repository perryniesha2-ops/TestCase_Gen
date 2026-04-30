// app/api/test-sessions/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ─── POST /api/test-sessions ──────────────────────────────────────────────────
// Creates a new test run session.
// Body: { suite_id, name, test_cases_total, environment? }

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();
  if (authErr || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const { suite_id, name, test_cases_total, environment = "staging" } = body;

  if (!suite_id) {
    return NextResponse.json(
      { error: "suite_id is required" },
      { status: 400 },
    );
  }
  if (!name?.trim()) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  // Verify suite belongs to user
  const { data: suite } = await supabase
    .from("suites")
    .select("id")
    .eq("id", suite_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!suite) {
    return NextResponse.json({ error: "Suite not found" }, { status: 404 });
  }

  const { data, error } = await supabase
    .from("test_run_sessions")
    .insert({
      user_id: user.id,
      suite_id,
      name: name.trim(),
      status: "in_progress",
      environment,
      actual_start: new Date().toISOString(),
      test_cases_total: test_cases_total ?? 0,
      test_cases_completed: 0,
      progress_percentage: 0,
      created_by: user.id,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const session = {
    ...data,
    stats: { passed: 0, failed: 0, blocked: 0, skipped: 0 },
  };

  return NextResponse.json({ session }, { status: 201 });
}
