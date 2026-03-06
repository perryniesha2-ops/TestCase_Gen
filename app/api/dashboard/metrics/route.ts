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

    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();

    if (authErr || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // -------------------------
    // 1) Test case metrics (BOTH regular and cross-platform)
    // -------------------------
    const { data: regularTestCases, error: tcErr } = await supabase
      .from("test_cases")
      .select("id, execution_status")
      .eq("user_id", user.id)
      .neq("status", "archived");

    if (tcErr) {
      return NextResponse.json({ error: tcErr.message }, { status: 500 });
    }

    const { data: platformTestCases, error: ptcErr } = await supabase
      .from("platform_test_cases")
      .select("id, execution_status")
      .eq("user_id", user.id)
      .neq("status", "archived");

    if (ptcErr) {
      return NextResponse.json({ error: ptcErr.message }, { status: 500 });
    }

    const testCases = [
      ...(regularTestCases ?? []),
      ...(platformTestCases ?? []),
    ];
    const testCaseIds = testCases.map((t) => t.id);
    const regularIds = (regularTestCases ?? []).map((t) => t.id);
    const platformIds = (platformTestCases ?? []).map((t) => t.id);

    let latestRows: Array<{
      test_case_id: string;
      execution_status: ExecutionStatus;
    }> = [];

    if (regularIds.length > 0) {
      const { data: regularExecs, error: reErr } = await supabase
        .from("test_executions")
        .select("test_case_id, execution_status, created_at")
        .in("test_case_id", regularIds)
        .order("created_at", { ascending: false });

      if (!reErr && regularExecs) {
        const seen = new Set<string>();
        regularExecs.forEach((exec) => {
          if (!seen.has(exec.test_case_id)) {
            latestRows.push(exec);
            seen.add(exec.test_case_id);
          }
        });
      }
    }

    if (platformIds.length > 0) {
      const { data: platformExecs, error: peErr } = await supabase
        .from("platform_test_executions")
        .select("test_case_id, execution_status, created_at")
        .in("test_case_id", platformIds)
        .order("created_at", { ascending: false });

      if (!peErr && platformExecs) {
        const seen = new Set<string>();
        platformExecs.forEach((exec) => {
          if (!seen.has(exec.test_case_id)) {
            latestRows.push(exec);
            seen.add(exec.test_case_id);
          }
        });
      }
    }

    const latestMap = new Map<string, ExecutionStatus>();
    for (const r of latestRows) {
      latestMap.set(r.test_case_id, r.execution_status);
    }

    const counts = {
      passed: 0,
      failed: 0,
      blocked: 0,
      skipped: 0,
      not_run: 0,
    };
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
    // 3) Recent activity (BOTH types)
    // -------------------------
    const { data: recentRegular } = await supabase
      .from("test_executions")
      .select(
        "id, execution_status, created_at, test_case_id, test_cases ( title )",
      )
      .eq("executed_by", user.id)
      .is("automation_run_id", null)
      .order("created_at", { ascending: false })
      .limit(5);

    const { data: recentPlatform } = await supabase
      .from("platform_test_executions")
      .select(
        "id, execution_status, created_at, test_case_id, platform_test_cases ( title )",
      )
      .eq("executed_by", user.id)
      .is("automation_run_id", null)
      .order("created_at", { ascending: false })
      .limit(5);

    const { data: recentAutomation } = await supabase
      .from("automation_runs")
      .select("id, status, started_at, framework, suite_id, suites ( name )")
      .eq("user_id", user.id)
      .order("started_at", { ascending: false })
      .limit(5);

    const recentRegularMapped = (recentRegular ?? []).map((exec: any) => ({
      id: exec.id,
      type: "execution" as const,
      description: `Test "${exec.test_cases?.title ?? "Unknown Test"}" ${exec.execution_status}`,
      timestamp: exec.created_at,
      status: exec.execution_status,
    }));

    const recentPlatformMapped = (recentPlatform ?? []).map((exec: any) => ({
      id: exec.id,
      type: "execution" as const,
      description: `Cross-Platform Test "${exec.platform_test_cases?.title ?? "Unknown Test"}" ${exec.execution_status}`,
      timestamp: exec.created_at,
      status: exec.execution_status,
    }));

    const recentAutomationMapped = (recentAutomation ?? []).map((run: any) => ({
      id: run.id,
      type: "suite_started" as const,
      description: `${run.framework} run for "${run.suites?.name ?? "Unknown Suite"}" ${run.status}`,
      timestamp: run.started_at,
      status: run.status,
    }));

    const recent_activity = [
      ...recentRegularMapped,
      ...recentPlatformMapped,
      ...recentAutomationMapped,
    ]
      .sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
      )
      .slice(0, 10);

    // -------------------------
    // 4) Automation Runs Stats — NEW
    // -------------------------
    const { data: automationRuns } = await supabase
      .from("automation_runs")
      .select("id, status, started_at")
      .eq("user_id", user.id)
      .order("started_at", { ascending: false });

    const automationTotal = (automationRuns ?? []).length;
    const automationPassed = (automationRuns ?? []).filter(
      (r) => r.status === "passed",
    ).length;
    const automationPassRate =
      automationTotal > 0
        ? Math.round((automationPassed / automationTotal) * 100)
        : 0;
    const lastAutomationRun = automationRuns?.[0]?.started_at ?? null;

    const automation_runs = {
      total: automationTotal,
      pass_rate: automationPassRate,
      last_run: lastAutomationRun,
    };

    // -------------------------
    // 5) Execution Timeline (Last 7 days)
    // -------------------------
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data: regularHistory } = await supabase
      .from("test_executions")
      .select("created_at, execution_status")
      .eq("executed_by", user.id)
      .gte("created_at", sevenDaysAgo.toISOString())
      .order("created_at", { ascending: true });

    const { data: platformHistory } = await supabase
      .from("platform_test_executions")
      .select("created_at, execution_status")
      .eq("executed_by", user.id)
      .gte("created_at", sevenDaysAgo.toISOString())
      .order("created_at", { ascending: true });

    const executionHistory = [
      ...(regularHistory ?? []),
      ...(platformHistory ?? []),
    ];

    const execution_timeline = groupExecutionsByDay(executionHistory);

    // -------------------------
    // 6) Priority Failures
    // -------------------------
    const { data: regularPriorityFailed } = await supabase
      .from("test_cases")
      .select("id, title, priority, execution_status")
      .eq("user_id", user.id)
      .eq("execution_status", "failed")
      .in("priority", ["critical", "high"])
      .order("priority", { ascending: true })
      .limit(3);

    const { data: platformPriorityFailed } = await supabase
      .from("platform_test_cases")
      .select("id, title, priority, execution_status")
      .eq("user_id", user.id)
      .eq("execution_status", "failed")
      .in("priority", ["critical", "high"])
      .order("priority", { ascending: true })
      .limit(3);

    const priority_failures = [
      ...(regularPriorityFailed ?? []).map((test) => ({
        id: test.id,
        title: test.title,
        priority: test.priority,
        failed_count: 1,
      })),
      ...(platformPriorityFailed ?? []).map((test) => ({
        id: test.id,
        title: test.title,
        priority: test.priority,
        failed_count: 1,
      })),
    ]
      .sort((a, b) => {
        const priorityOrder = { critical: 0, high: 1 };
        return (
          (priorityOrder[a.priority as keyof typeof priorityOrder] ?? 99) -
          (priorityOrder[b.priority as keyof typeof priorityOrder] ?? 99)
        );
      })
      .slice(0, 5);

    // -------------------------
    // 7) Flaky Tests
    // -------------------------
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: regularRecentExecs } = await supabase
      .from("test_executions")
      .select("test_case_id, execution_status, test_cases(title)")
      .eq("executed_by", user.id)
      .gte("created_at", thirtyDaysAgo.toISOString());

    const { data: platformRecentExecs } = await supabase
      .from("platform_test_executions")
      .select("test_case_id, execution_status, platform_test_cases(title)")
      .eq("executed_by", user.id)
      .gte("created_at", thirtyDaysAgo.toISOString());

    const transformedRegularExecs = (regularRecentExecs ?? []).map(
      (exec: any) => ({
        test_case_id: exec.test_case_id,
        execution_status: exec.execution_status,
        test_cases: Array.isArray(exec.test_cases)
          ? (exec.test_cases[0] ?? null)
          : exec.test_cases,
      }),
    );

    const transformedPlatformExecs = (platformRecentExecs ?? []).map(
      (exec: any) => ({
        test_case_id: exec.test_case_id,
        execution_status: exec.execution_status,
        test_cases: Array.isArray(exec.platform_test_cases)
          ? (exec.platform_test_cases[0] ?? null)
          : exec.platform_test_cases,
      }),
    );

    const allRecentExecutions = [
      ...transformedRegularExecs,
      ...transformedPlatformExecs,
    ];

    const flaky_tests = calculateFlakyTests(allRecentExecutions);

    // -------------------------
    // 8) Trends
    // -------------------------
    const { data: previousRegularCases } = await supabase
      .from("test_cases")
      .select("id")
      .eq("user_id", user.id)
      .neq("status", "archived")
      .lt("created_at", sevenDaysAgo.toISOString());

    const { data: previousPlatformCases } = await supabase
      .from("platform_test_cases")
      .select("id")
      .eq("user_id", user.id)
      .neq("status", "archived")
      .lt("created_at", sevenDaysAgo.toISOString());

    const previousTotal =
      (previousRegularCases ?? []).length +
      (previousPlatformCases ?? []).length;

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
        regular: (regularTestCases ?? []).length,
        cross_platform: (platformTestCases ?? []).length,
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
      automation_runs,
      execution_timeline,
      flaky_tests,
      priority_failures,
      coverage_gaps: [],
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

  const flakyTests: Array<{
    id: string;
    title: string;
    flakiness_score: number;
  }> = [];

  testResults.forEach((result, testId) => {
    if (result.passed > 0 && result.failed > 0 && result.total >= 3) {
      const flakiness = Math.round((result.failed / result.total) * 100);
      flakyTests.push({
        id: testId,
        title: result.title,
        flakiness_score: flakiness,
      });
    }
  });

  return flakyTests
    .sort((a, b) => b.flakiness_score - a.flakiness_score)
    .slice(0, 5);
}
