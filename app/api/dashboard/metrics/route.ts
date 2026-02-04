// app/api/dashboard/metrics/route.ts
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

    // Server-side auth
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
      .select("id, execution_status")
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
      else counts.not_run++;
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

    const by_priority = requirements.reduce(
      (acc, r) => {
        const key = String(r.priority ?? "medium").toLowerCase();
        acc[key] = (acc[key] ?? 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

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
        `,
      )
      .eq("executed_by", user.id)
      .order("created_at", { ascending: false })
      .limit(10);

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

    // -------------------------
    // 4) Health Score
    // -------------------------
    const health_score = calculateHealthScore({
      passRate: pass_rate,
      coverage: coverage_percentage,
      failedCount: counts.failed,
      totalTests: total,
      notRunCount: counts.not_run,
    });

    // -------------------------
    // 5) Execution Timeline (Last 7 days)
    // -------------------------
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data: executionHistory, error: ehErr } = await supabase
      .from("test_executions")
      .select("created_at, execution_status")
      .eq("executed_by", user.id)
      .gte("created_at", sevenDaysAgo.toISOString())
      .order("created_at", { ascending: true });

    if (ehErr) {
      console.error("Execution history error:", ehErr);
    }

    const execution_timeline = groupExecutionsByDay(executionHistory ?? []);

    // -------------------------
    // 6) Priority Failures
    // -------------------------
    const { data: priorityFailedTests, error: pfErr } = await supabase
      .from("test_cases")
      .select("id, title, priority, execution_status")
      .eq("user_id", user.id)
      .eq("execution_status", "failed")
      .in("priority", ["critical", "high"])
      .order("priority", { ascending: true })
      .limit(5);

    if (pfErr) {
      console.error("Priority failures error:", pfErr);
    }

    const priority_failures =
      (priorityFailedTests ?? []).map((test) => ({
        id: test.id,
        title: test.title,
        priority: test.priority,
        failed_count: 1, // You could enhance this with actual count from executions table
      })) ?? [];

    // -------------------------
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: recentExecutions, error: reErr } = await supabase
      .from("test_executions")
      .select("test_case_id, execution_status, test_cases(title)")
      .eq("executed_by", user.id)
      .gte("created_at", thirtyDaysAgo.toISOString());

    if (reErr) {
      console.error("Flaky tests error:", reErr);
    }

    const transformedExecutions = (recentExecutions ?? []).map((exec: any) => ({
      test_case_id: exec.test_case_id,
      execution_status: exec.execution_status,
      test_cases: Array.isArray(exec.test_cases)
        ? (exec.test_cases[0] ?? null)
        : exec.test_cases,
    }));

    const flaky_tests = calculateFlakyTests(transformedExecutions);

    // -------------------------
    // 8) Trends (compare with last week)
    // -------------------------
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

    const { data: previousTestCases } = await supabase
      .from("test_cases")
      .select("id")
      .eq("user_id", user.id)
      .neq("status", "archived")
      .lt("created_at", sevenDaysAgo.toISOString());

    const previousTotal = (previousTestCases ?? []).length;
    const trend = calculateTrend(total, previousTotal);
    const trend_value = calculateTrendPercentage(total, previousTotal);

    const { data: previousReqs } = await supabase
      .from("requirements")
      .select("id")
      .eq("user_id", user.id)
      .lt("created_at", sevenDaysAgo.toISOString());

    const previousReqTotal = (previousReqs ?? []).length;
    const reqTrend = calculateTrend(reqTotal, previousReqTotal);

    // -------------------------
    // Response
    // -------------------------
    return NextResponse.json({
      test_cases: {
        total,
        ...counts,
        pass_rate,
        trend,
        trend_value,
      },
      requirements: {
        total: reqTotal,
        tested: reqTested,
        coverage_percentage,
        by_priority,
        trend: reqTrend,
      },
      recent_activity,
      health_score,
      execution_timeline,
      flaky_tests,
      priority_failures,
      coverage_gaps: [], // Optional: implement if you have coverage gap logic
    });
  } catch (e: any) {
    console.error("Dashboard metrics error:", e);
    return NextResponse.json(
      { error: e?.message ?? "Unexpected error" },
      { status: 500 },
    );
  }
}

// -------------------------
// Helper Functions
// -------------------------

function calculateHealthScore(params: {
  passRate: number;
  coverage: number;
  failedCount: number;
  totalTests: number;
  notRunCount: number;
}): number {
  const { passRate, coverage, failedCount, totalTests, notRunCount } = params;

  if (totalTests === 0) return 100; // No tests = perfect health (or could be 0)

  if (notRunCount === totalTests) return 0;

  const executedTests = totalTests - notRunCount;

  if (executedTests === 0) {
    return Math.round(coverage * 0.5);
  }

  // Weighted scoring
  const passRateScore = passRate * 0.4; // 40% weight
  const coverageScore = coverage * 0.3; // 30% weight
  const failurePenalty =
    totalTests > 0 ? (failedCount / totalTests) * 100 * 0.3 : 0; // 30% weight

  const score = passRateScore + coverageScore - failurePenalty;

  return Math.max(0, Math.min(100, Math.round(score)));
}

function calculateTrend(
  current: number,
  previous: number,
): "up" | "down" | "stable" {
  if (current > previous) return "up";
  if (current < previous) return "down";
  return "stable";
}

function calculateTrendPercentage(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

function groupExecutionsByDay(
  executions: Array<{ created_at: string; execution_status: string }>,
) {
  const groups = new Map<string, { passed: number; failed: number }>();

  executions.forEach((exec) => {
    const date = new Date(exec.created_at).toISOString().split("T")[0];
    if (!groups.has(date)) {
      groups.set(date, { passed: 0, failed: 0 });
    }
    const group = groups.get(date)!;
    if (exec.execution_status === "passed") group.passed++;
    else if (exec.execution_status === "failed") group.failed++;
  });

  // Fill in missing days with zeros
  const result: Array<{
    date: string;
    passed: number;
    failed: number;
    total: number;
  }> = [];
  const today = new Date();
  for (let i = 6; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split("T")[0];
    const group = groups.get(dateStr) || { passed: 0, failed: 0 };
    result.push({
      date: dateStr,
      passed: group.passed,
      failed: group.failed,
      total: group.passed + group.failed,
    });
  }

  return result;
}

function calculateFlakyTests(
  executions: Array<{
    test_case_id: string;
    execution_status: string;
    test_cases: { title: string } | null;
  }>,
): Array<{ id: string; title: string; flakiness_score: number }> {
  const testResults = new Map<
    string,
    { title: string; passed: number; failed: number; total: number }
  >();

  executions.forEach((exec) => {
    if (!testResults.has(exec.test_case_id)) {
      testResults.set(exec.test_case_id, {
        title: exec.test_cases?.title ?? "Unknown Test",
        passed: 0,
        failed: 0,
        total: 0,
      });
    }
    const result = testResults.get(exec.test_case_id)!;
    result.total++;
    if (exec.execution_status === "passed") result.passed++;
    else if (exec.execution_status === "failed") result.failed++;
  });

  // Find tests with both passes and failures
  const flakyTests: Array<{
    id: string;
    title: string;
    flakiness_score: number;
  }> = [];

  testResults.forEach((result, testId) => {
    if (result.passed > 0 && result.failed > 0 && result.total >= 3) {
      // Only consider flaky if executed at least 3 times
      const flakiness = Math.round((result.failed / result.total) * 100);
      flakyTests.push({
        id: testId,
        title: result.title,
        flakiness_score: flakiness,
      });
    }
  });

  // Sort by flakiness score descending
  return flakyTests
    .sort((a, b) => b.flakiness_score - a.flakiness_score)
    .slice(0, 5);
}
