// app/api/automation/runs/[runId]/executions/route.ts
// GET /api/automation/runs/[runId]/executions
// Returns test_executions for a specific automation run, joined with test case titles.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ runId: string }> },
) {
  try {
    const { runId } = await ctx.params;
    const supabase = await createClient();
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();
    if (authErr || !user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Verify the run belongs to the user via suite ownership
    const { data: run, error: runErr } = await supabase
      .from("automation_runs")
      .select("id, suite_id")
      .eq("id", runId)
      .single();

    if (runErr || !run)
      return NextResponse.json({ error: "Run not found" }, { status: 404 });

    const { data: suite } = await supabase
      .from("suites")
      .select("id")
      .eq("id", run.suite_id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!suite)
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    const { data, error } = await supabase
      .from("test_executions")
      .select(
        `
        id,
        test_case_id,
        execution_status,
        started_at,
        completed_at,
        duration_minutes,
        execution_notes,
        failure_reason,
        stack_trace,
        browser,
        os_version,
        test_environment,
        framework,
        framework_version,
        test_cases:test_case_id (title, description)
      `,
      )
      .eq("automation_run_id", runId)
      .order("started_at", { ascending: true });

    if (error)
      return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ executions: data ?? [] });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Unexpected error" },
      { status: 500 },
    );
  }
}
