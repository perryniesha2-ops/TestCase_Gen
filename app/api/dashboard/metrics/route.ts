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

// ─── Helper functions ─────────────────────────────────────────────────────────

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
    if (!groups.has(date)) groups.set(date, { passed: 0, failed: 0 });
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
    const group = groups.get(dateStr) ?? { passed: 0, failed: 0 };
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
    title?: string | null;
  }>,
): Array<{ id: string; title: string; flakiness_score: number }> {
  const testResults = new Map<
    string,
    { title: string; passed: number; failed: number; total: number }
  >();

  executions.forEach((exec) => {
    if (!testResults.has(exec.test_case_id)) {
      testResults.set(exec.test_case_id, {
        title: exec.title ?? "Unknown Test",
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
      flakyTests.push({
        id: testId,
        title: result.title,
        flakiness_score: Math.round((result.failed / result.total) * 100),
      });
    }
  });

  return flakyTests
    .sort((a, b) => b.flakiness_score - a.flakiness_score)
    .slice(0, 5);
}

// ─── Route handler ────────────────────────────────────────────────────────────

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

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const sevenDaysAgoIso = sevenDaysAgo.toISOString();

    // ─── Batch 1: Independent queries — all fire in parallel ─────────────────
    const [
      regularTCRes,
      platformTCRes,
      requirementsRes,
      automationRunsRes,
      recentRegularRes,
      recentPlatformRes,
      regularHistoryRes,
      platformHistoryRes,
      regularPrevCountRes,
      platformPrevCountRes,
      reqPrevCountRes,
    ] = await Promise.all([
      // Test cases
      supabase
        .from("test_cases")
        .select("id")
        .eq("user_id", user.id)
        .neq("status", "archived"),

      supabase
        .from("platform_test_cases")
        .select("id")
        .eq("user_id", user.id)
        .neq("status", "archived"),

      // Requirements
      supabase
        .from("requirements")
        .select("id, priority")
        .eq("user_id", user.id),

      // Automation runs — used for both activity feed and stats
      supabase
        .from("automation_runs")
        .select("id, status, started_at, framework, suite_id, suites(name)")
        .eq("user_id", user.id)
        .order("started_at", { ascending: false })
        .limit(10),

      // Recent manual executions (regular)
      supabase
        .from("test_executions")
        .select(
          "id, execution_status, created_at, test_case_id, test_cases(title)",
        )
        .eq("executed_by", user.id)
        .is("automation_run_id", null)
        .order("created_at", { ascending: false })
        .limit(5),

      // Recent manual executions (platform)
      supabase
        .from("platform_test_executions")
        .select(
          "id, execution_status, created_at, test_case_id, platform_test_cases(title)",
        )
        .eq("executed_by", user.id)
        .is("automation_run_id", null)
        .order("created_at", { ascending: false })
        .limit(5),

      // Execution timeline (7 days)
      supabase
        .from("test_executions")
        .select("created_at, execution_status")
        .eq("executed_by", user.id)
        .gte("created_at", sevenDaysAgoIso)
        .order("created_at", { ascending: true }),

      supabase
        .from("platform_test_executions")
        .select("created_at, execution_status")
        .eq("executed_by", user.id)
        .gte("created_at", sevenDaysAgoIso)
        .order("created_at", { ascending: true }),

      // Trend counts — head:true returns count only, no row data
      supabase
        .from("test_cases")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .neq("status", "archived")
        .lt("created_at", sevenDaysAgoIso),

      supabase
        .from("platform_test_cases")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .neq("status", "archived")
        .lt("created_at", sevenDaysAgoIso),

      supabase
        .from("requirements")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .lt("created_at", sevenDaysAgoIso),
    ]);

    // Extract IDs for dependent queries
    const regularIds = (regularTCRes.data ?? []).map((t) => t.id);
    const platformIds = (platformTCRes.data ?? []).map((t) => t.id);
    const requirementIds = (requirementsRes.data ?? []).map((r) => r.id);

    // ─── Batch 2: Queries that depend on IDs from batch 1 ────────────────────
    const [regularExecsRes, platformExecsRes, reqLinksRes, priorityFailedRes] =
      await Promise.all([
        // All executions for regular test cases (for status + flakiness)
        regularIds.length > 0
          ? supabase
              .from("test_executions")
              .select("test_case_id, execution_status, created_at")
              .in("test_case_id", regularIds)
              .order("created_at", { ascending: false })
          : Promise.resolve({ data: [], error: null }),

        // All executions for platform test cases (for status + flakiness)
        platformIds.length > 0
          ? supabase
              .from("platform_test_executions")
              .select("test_case_id, execution_status, created_at")
              .in("test_case_id", platformIds)
              .order("created_at", { ascending: false })
          : Promise.resolve({ data: [], error: null }),

        // Requirement coverage links
        requirementIds.length > 0
          ? supabase
              .from("requirement_test_cases")
              .select("requirement_id")
              .in("requirement_id", requirementIds)
          : Promise.resolve({ data: [], error: null }),

        // Priority failures — both tables in parallel
        Promise.all([
          supabase
            .from("test_cases")
            .select("id, title, priority")
            .eq("user_id", user.id)
            .eq("execution_status", "failed")
            .in("priority", ["critical", "high"])
            .limit(3),
          supabase
            .from("platform_test_cases")
            .select("id, title, priority")
            .eq("user_id", user.id)
            .eq("execution_status", "failed")
            .in("priority", ["critical", "high"])
            .limit(3),
        ]),
      ]);

    // ─── Compute test case status counts ─────────────────────────────────────

    // Build latest-status map for regular test cases
    const latestMap = new Map<string, ExecutionStatus>();
    const seenRegular = new Set<string>();
    for (const exec of (regularExecsRes.data ?? []) as any[]) {
      if (!seenRegular.has(exec.test_case_id)) {
        latestMap.set(exec.test_case_id, exec.execution_status);
        seenRegular.add(exec.test_case_id);
      }
    }
    const seenPlatform = new Set<string>();
    for (const exec of (platformExecsRes.data ?? []) as any[]) {
      if (!seenPlatform.has(exec.test_case_id)) {
        latestMap.set(exec.test_case_id, exec.execution_status);
        seenPlatform.add(exec.test_case_id);
      }
    }

    const allTestIds = [...regularIds, ...platformIds];
    const counts = { passed: 0, failed: 0, blocked: 0, skipped: 0, not_run: 0 };
    for (const id of allTestIds) {
      const s = latestMap.get(id) ?? "not_run";
      if (s === "passed") counts.passed++;
      else if (s === "failed") counts.failed++;
      else if (s === "blocked") counts.blocked++;
      else if (s === "skipped") counts.skipped++;
      else counts.not_run++;
    }
    const total = allTestIds.length;
    const pass_rate = total > 0 ? Math.round((counts.passed / total) * 100) : 0;

    // ─── Flaky tests — reuse already-fetched execution data ──────────────────
    const flakiness_input = [
      ...(regularExecsRes.data ?? []).map((e: any) => ({
        test_case_id: e.test_case_id,
        execution_status: e.execution_status,
        title: null,
      })),
      ...(platformExecsRes.data ?? []).map((e: any) => ({
        test_case_id: e.test_case_id,
        execution_status: e.execution_status,
        title: null,
      })),
    ];
    const flaky_tests = calculateFlakyTests(flakiness_input);

    // ─── Requirements ─────────────────────────────────────────────────────────
    const requirements = requirementsRes.data ?? [];
    const testedSet = new Set(
      (reqLinksRes.data ?? []).map((x: any) => x.requirement_id),
    );
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

    // ─── Automation runs ──────────────────────────────────────────────────────
    const automationRuns = automationRunsRes.data ?? [];
    const automationTotal = automationRuns.length;
    const automationPassed = automationRuns.filter(
      (r: any) => r.status === "passed",
    ).length;
    const automation_runs = {
      total: automationTotal,
      pass_rate:
        automationTotal > 0
          ? Math.round((automationPassed / automationTotal) * 100)
          : 0,
      last_run: (automationRuns[0] as any)?.started_at ?? null,
    };

    // ─── Recent activity ──────────────────────────────────────────────────────
    const recentRegularMapped = (recentRegularRes.data ?? []).map(
      (exec: any) => ({
        id: exec.id,
        type: "execution" as const,
        description: `Test "${exec.test_cases?.title ?? "Unknown"}" ${exec.execution_status}`,
        timestamp: exec.created_at,
        status: exec.execution_status,
      }),
    );

    const recentPlatformMapped = (recentPlatformRes.data ?? []).map(
      (exec: any) => ({
        id: exec.id,
        type: "execution" as const,
        description: `Cross-Platform Test "${exec.platform_test_cases?.title ?? "Unknown"}" ${exec.execution_status}`,
        timestamp: exec.created_at,
        status: exec.execution_status,
      }),
    );

    const recentAutomationMapped = automationRuns
      .slice(0, 5)
      .map((run: any) => ({
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

    // ─── Execution timeline ───────────────────────────────────────────────────
    const execution_timeline = groupExecutionsByDay([
      ...(regularHistoryRes.data ?? []),
      ...(platformHistoryRes.data ?? []),
    ]);

    // ─── Priority failures ────────────────────────────────────────────────────
    const [regularPriorityFailed, platformPriorityFailed] = priorityFailedRes;
    const priority_failures = [
      ...(regularPriorityFailed.data ?? []).map((t: any) => ({
        id: t.id,
        title: t.title,
        priority: t.priority,
        failed_count: 1,
      })),
      ...(platformPriorityFailed.data ?? []).map((t: any) => ({
        id: t.id,
        title: t.title,
        priority: t.priority,
        failed_count: 1,
      })),
    ]
      .sort((a, b) => {
        const order: Record<string, number> = { critical: 0, high: 1 };
        return (order[a.priority] ?? 99) - (order[b.priority] ?? 99);
      })
      .slice(0, 5);

    // ─── Trends ───────────────────────────────────────────────────────────────
    const previousTotal =
      (regularPrevCountRes.count ?? 0) + (platformPrevCountRes.count ?? 0);
    const previousReqTotal = reqPrevCountRes.count ?? 0;

    const trend = calculateTrend(total, previousTotal);
    const trend_value = calculateTrendPercentage(total, previousTotal);
    const reqTrend = calculateTrend(reqTotal, previousReqTotal);

    // ─── Response ─────────────────────────────────────────────────────────────
    return NextResponse.json({
      test_cases: {
        total,
        regular: regularIds.length,
        cross_platform: platformIds.length,
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
    console.error("[dashboard/metrics]", e);
    return NextResponse.json(
      { error: e?.message ?? "Unexpected error" },
      { status: 500 },
    );
  }
}
