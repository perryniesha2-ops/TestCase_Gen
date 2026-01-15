import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export const dynamic = "force-dynamic";

type ExecutionStatus =
  | "passed"
  | "failed"
  | "blocked"
  | "skipped"
  | "not_run"
  | "in_progress";

export async function GET() {
  try {
    const supabase = await createClient();

    // Server-side auth (real verification)
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();

    if (authErr || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // -------------------------
    // 1) Test case metrics
    // -------------------------
    const { data: testCases, error: tcErr } = await supabase
      .from("test_cases")
      .select("id")
      .eq("user_id", user.id)
      .neq("status", "archived");

    if (tcErr) {
      return NextResponse.json({ error: tcErr.message }, { status: 500 });
    }

    const testCaseIds = (testCases ?? []).map((t) => t.id);

    let latestRows: Array<{
      test_case_id: string;
      execution_status: ExecutionStatus;
    }> = [];
    if (testCaseIds.length > 0) {
      const { data, error: leErr } = await supabase
        .from("v_test_case_latest_execution")
        .select("test_case_id, execution_status")
        .in("test_case_id", testCaseIds);

      if (leErr) {
        return NextResponse.json({ error: leErr.message }, { status: 500 });
      }

      latestRows = (data ?? []) as any;
    }

    const latestMap = new Map<string, ExecutionStatus>();
    for (const r of latestRows) {
      latestMap.set(r.test_case_id, r.execution_status);
    }

    const counts = { passed: 0, failed: 0, blocked: 0, skipped: 0, not_run: 0 };
    for (const id of testCaseIds) {
      const s = latestMap.get(id) ?? "not_run";
      if (s === "passed") counts.passed++;
      else if (s === "failed") counts.failed++;
      else if (s === "blocked") counts.blocked++;
      else if (s === "skipped") counts.skipped++;
      else counts.not_run++; // includes not_run + in_progress for dashboard
    }

    const total = testCaseIds.length;
    const pass_rate = total > 0 ? Math.round((counts.passed / total) * 100) : 0;

    // -------------------------
    // 2) Requirements metrics
    // -------------------------
    const { data: reqs, error: reqErr } = await supabase
      .from("requirements")
      .select("id, priority")
      .eq("user_id", user.id);

    if (reqErr) {
      return NextResponse.json({ error: reqErr.message }, { status: 500 });
    }

    const requirements = reqs ?? [];
    const requirementIds = requirements.map((r) => r.id);

    let linked: Array<{ requirement_id: string }> = [];
    if (requirementIds.length > 0) {
      const { data, error: linkErr } = await supabase
        .from("requirement_test_cases")
        .select("requirement_id")
        .in("requirement_id", requirementIds);

      if (linkErr) {
        return NextResponse.json({ error: linkErr.message }, { status: 500 });
      }
      linked = (data ?? []) as any;
    }

    const testedSet = new Set(linked.map((x) => x.requirement_id));

    const by_priority = requirements.reduce((acc, r) => {
      const key = String(r.priority ?? "medium").toLowerCase();
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const reqTotal = requirements.length;
    const reqTested = testedSet.size;
    const coverage_percentage =
      reqTotal > 0 ? Math.round((reqTested / reqTotal) * 100) : 0;

    // -------------------------
    // 3) Recent activity
    // -------------------------
    const { data: recent, error: raErr } = await supabase
      .from("test_executions")
      .select(
        `
          id,
          execution_status,
          created_at,
          test_case_id,
          test_cases ( title )
        `
      )
      .eq("executed_by", user.id)
      .order("created_at", { ascending: false })
      .limit(5);

    if (raErr) {
      return NextResponse.json({ error: raErr.message }, { status: 500 });
    }

    const recent_activity =
      (recent ?? []).map((exec: any) => ({
        id: exec.id,
        type: "execution" as const,
        description: `Test "${exec.test_cases?.title ?? "Unknown Test"}" ${
          exec.execution_status
        }`,
        timestamp: exec.created_at,
        status: exec.execution_status,
      })) ?? [];

    // One response payload for the UI
    return NextResponse.json({
      test_cases: { total, ...counts, pass_rate },
      requirements: {
        total: reqTotal,
        tested: reqTested,
        coverage_percentage,
        by_priority,
      },
      recent_activity,
    });
  } catch (e: any) {
    console.error("dashboard metrics route error:", e);
    return NextResponse.json(
      { error: e?.message ?? "Unexpected error" },
      { status: 500 }
    );
  }
}
