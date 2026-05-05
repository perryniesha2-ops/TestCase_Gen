// app/api/dashboard/metrics/route.ts
// All stats are scoped to the last 7 days for consistency.
// The execution_timeline chart, pass rate, distribution, automation stats,
// and flaky tests all reflect the same 7-day window.

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const WINDOW_DAYS = 7;

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
  startDate: Date,
) {
  const groups = new Map<string, { passed: number; failed: number }>();
  executions.forEach((exec) => {
    const date = new Date(exec.created_at).toISOString().split("T")[0];
    if (!groups.has(date)) groups.set(date, { passed: 0, failed: 0 });
    const group = groups.get(date)!;
    if (exec.execution_status === "passed") group.passed++;
    else if (exec.execution_status === "failed") group.failed++;
  });

  // Pre-fill every day in the window so chart has no gaps
  const result: Array<{
    date: string;
    passed: number;
    failed: number;
    total: number;
  }> = [];
  const today = new Date();
  for (let i = WINDOW_DAYS - 1; i >= 0; i--) {
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
  const map = new Map<
    string,
    { title: string; passed: number; failed: number; total: number }
  >();
  executions.forEach((exec) => {
    if (!map.has(exec.test_case_id)) {
      map.set(exec.test_case_id, {
        title: exec.title ?? "Unknown Test",
        passed: 0,
        failed: 0,
        total: 0,
      });
    }
    const row = map.get(exec.test_case_id)!;
    if (exec.title) row.title = exec.title;
    row.total++;
    if (exec.execution_status === "passed") row.passed++;
    else if (exec.execution_status === "failed") row.failed++;
  });
  const result: Array<{ id: string; title: string; flakiness_score: number }> =
    [];
  map.forEach((row, id) => {
    if (row.passed > 0 && row.failed > 0 && row.total >= 3) {
      result.push({
        id,
        title: row.title,
        flakiness_score: Math.round((row.failed / row.total) * 100),
      });
    }
  });
  return result
    .sort((a, b) => b.flakiness_score - a.flakiness_score)
    .slice(0, 5);
}

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

    const now = new Date();

    // ── 7-day window ──────────────────────────────────────────────────────────
    const windowStart = new Date(now);
    windowStart.setDate(windowStart.getDate() - WINDOW_DAYS);
    const windowStartIso = windowStart.toISOString();

    // ── Previous 7-day window (for trend arrows) ──────────────────────────────
    const prevWindowStart = new Date(windowStart);
    prevWindowStart.setDate(prevWindowStart.getDate() - WINDOW_DAYS);
    const prevWindowStartIso = prevWindowStart.toISOString();

    // ── Library sizes (not time-scoped — these are current totals) ────────────
    const [regularTCRes, platformTCRes, requirementsRes] = await Promise.all([
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
      supabase
        .from("requirements")
        .select("id, priority")
        .eq("user_id", user.id),
    ]);

    const regularIds = (regularTCRes.data ?? []).map((t) => t.id);
    const platformIds = (platformTCRes.data ?? []).map((t) => t.id);
    const requirementIds = (requirementsRes.data ?? []).map((r) => r.id);
    const allTestIds = [...regularIds, ...platformIds];
    const libraryTotal = allTestIds.length;

    // ── All 7-day scoped queries in parallel ──────────────────────────────────
    const [
      regularExecsRes,
      platformExecsRes,
      automationRunsStatsRes,
      automationRunsRecentRes,
      recentRegularRes,
      recentPlatformRes,
      reqLinksRes,
      regularPrevCountRes,
      platformPrevCountRes,
      reqPrevCountRes,
    ] = await Promise.all([
      // Manual + automated executions for regular test cases — 7-day window
      regularIds.length > 0
        ? supabase
            .from("test_executions")
            .select(
              "test_case_id, execution_status, created_at, test_cases(title)",
            )
            .in("test_case_id", regularIds)
            .gte("created_at", windowStartIso)
            .order("created_at", { ascending: false })
        : Promise.resolve({ data: [], error: null }),

      // Platform executions — 7-day window
      platformIds.length > 0
        ? supabase
            .from("platform_test_executions")
            .select(
              "test_case_id, execution_status, created_at, platform_test_cases(title)",
            )
            .in("test_case_id", platformIds)
            .gte("created_at", windowStartIso)
            .order("created_at", { ascending: false })
        : Promise.resolve({ data: [], error: null }),

      // All automation runs in the 7-day window (no limit — for accurate stats)
      supabase
        .from("automation_runs")
        .select("id, status, started_at")
        .eq("user_id", user.id)
        .gte("started_at", windowStartIso)
        .order("started_at", { ascending: false }),

      // Recent 10 automation runs for activity feed (includes suite name)
      supabase
        .from("automation_runs")
        .select("id, status, started_at, framework, suite_id, suites(name)")
        .eq("user_id", user.id)
        .gte("started_at", windowStartIso)
        .order("started_at", { ascending: false })
        .limit(10),

      // Recent manual executions for activity feed
      supabase
        .from("test_executions")
        .select(
          "id, execution_status, created_at, test_case_id, test_cases(title)",
        )
        .eq("executed_by", user.id)
        .is("automation_run_id", null)
        .gte("created_at", windowStartIso)
        .order("created_at", { ascending: false })
        .limit(5),

      supabase
        .from("platform_test_executions")
        .select(
          "id, execution_status, created_at, test_case_id, platform_test_cases(title)",
        )
        .eq("executed_by", user.id)
        .is("automation_run_id", null)
        .gte("created_at", windowStartIso)
        .order("created_at", { ascending: false })
        .limit(5),

      // Requirement coverage links
      requirementIds.length > 0
        ? supabase
            .from("requirement_test_cases")
            .select("requirement_id")
            .in("requirement_id", requirementIds)
        : Promise.resolve({ data: [], error: null }),

      // Previous window counts for trend arrows
      supabase
        .from("test_cases")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .neq("status", "archived")
        .gte("created_at", prevWindowStartIso)
        .lt("created_at", windowStartIso),
      supabase
        .from("platform_test_cases")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .neq("status", "archived")
        .gte("created_at", prevWindowStartIso)
        .lt("created_at", windowStartIso),
      supabase
        .from("requirements")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .gte("created_at", prevWindowStartIso)
        .lt("created_at", windowStartIso),
    ]);

    const regularExecs = (regularExecsRes.data ?? []) as any[];
    const platformExecs = (platformExecsRes.data ?? []) as any[];

    // ── Pass rate and distribution — 7-day window executions ─────────────────
    let windowPassed = 0,
      windowFailed = 0,
      windowBlocked = 0,
      windowSkipped = 0;
    for (const e of regularExecs) {
      if (e.execution_status === "passed") windowPassed++;
      else if (e.execution_status === "failed") windowFailed++;
      else if (e.execution_status === "blocked") windowBlocked++;
      else if (e.execution_status === "skipped") windowSkipped++;
    }
    for (const e of platformExecs) {
      if (e.execution_status === "passed") windowPassed++;
      else if (e.execution_status === "failed") windowFailed++;
      else if (e.execution_status === "blocked") windowBlocked++;
      else if (e.execution_status === "skipped") windowSkipped++;
    }
    const windowTotal =
      windowPassed + windowFailed + windowBlocked + windowSkipped;
    const pass_rate =
      windowTotal > 0 ? Math.round((windowPassed / windowTotal) * 100) : 0;

    // not_run = tests in library that had zero executions in the 7-day window
    const executedInWindow = new Set([
      ...regularExecs.map((e: any) => e.test_case_id),
      ...platformExecs.map((e: any) => e.test_case_id),
    ]);
    const notRunCount = allTestIds.filter(
      (id) => !executedInWindow.has(id),
    ).length;

    // ── Flaky tests — 7-day window ────────────────────────────────────────────
    const flakinessInput = [
      ...regularExecs.map((e: any) => ({
        test_case_id: e.test_case_id,
        execution_status: e.execution_status,
        title: (e.test_cases as any)?.title ?? null,
      })),
      ...platformExecs.map((e: any) => ({
        test_case_id: e.test_case_id,
        execution_status: e.execution_status,
        title: (e.platform_test_cases as any)?.title ?? null,
      })),
    ];
    const flaky_tests = calculateFlakyTests(flakinessInput);

    // ── Requirements coverage ─────────────────────────────────────────────────
    const requirements = requirementsRes.data ?? [];
    const testedSet = new Set(
      (reqLinksRes.data ?? []).map((x: any) => x.requirement_id),
    );
    const reqTotal = requirements.length;
    const reqTested = testedSet.size;
    const by_priority = requirements.reduce(
      (acc, r) => {
        const key = String((r as any).priority ?? "medium").toLowerCase();
        acc[key] = (acc[key] ?? 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );
    const coverage_percentage =
      reqTotal > 0 ? Math.round((reqTested / reqTotal) * 100) : 0;

    // ── Automation — 7-day window ─────────────────────────────────────────────
    const allAutomationRuns = automationRunsStatsRes.data ?? [];
    const automationTotal = allAutomationRuns.length;
    const automationPassed = allAutomationRuns.filter(
      (r: any) => r.status === "passed",
    ).length;
    const automation_runs = {
      total: automationTotal,
      pass_rate:
        automationTotal > 0
          ? Math.round((automationPassed / automationTotal) * 100)
          : 0,
      last_run: (allAutomationRuns[0] as any)?.started_at ?? null,
    };

    // ── Recent activity feed ──────────────────────────────────────────────────
    const recentAutomation = automationRunsRecentRes.data ?? [];
    const recent_activity = [
      ...(recentRegularRes.data ?? []).map((e: any) => ({
        id: e.id,
        type: "execution" as const,
        description: `Test "${e.test_cases?.title ?? "Unknown"}" ${e.execution_status}`,
        timestamp: e.created_at,
        status: e.execution_status,
      })),
      ...(recentPlatformRes.data ?? []).map((e: any) => ({
        id: e.id,
        type: "execution" as const,
        description: `Cross-Platform Test "${e.platform_test_cases?.title ?? "Unknown"}" ${e.execution_status}`,
        timestamp: e.created_at,
        status: e.execution_status,
      })),
      ...recentAutomation.slice(0, 5).map((r: any) => ({
        id: r.id,
        type: "suite_started" as const,
        description: `${r.framework} run for "${r.suites?.name ?? "Unknown Suite"}" ${r.status}`,
        timestamp: r.started_at,
        status: r.status,
      })),
    ]
      .sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
      )
      .slice(0, 10);

    // ── Execution timeline — 7-day chart ─────────────────────────────────────
    const execution_timeline = groupExecutionsByDay(
      [...regularExecs, ...platformExecs],
      windowStart,
    );

    // ── Priority failures — tests currently failed at critical/high priority ──
    const PRIORITY_ORDER: Record<string, number> = { critical: 0, high: 1 };
    const [regularPFRes, platformPFRes] = await Promise.all([
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
    ]);
    const priority_failures = [
      ...(regularPFRes.data ?? []).map((t: any) => ({
        id: t.id,
        title: t.title,
        priority: t.priority,
        failed_count: 1,
      })),
      ...(platformPFRes.data ?? []).map((t: any) => ({
        id: t.id,
        title: t.title,
        priority: t.priority,
        failed_count: 1,
      })),
    ]
      .sort(
        (a, b) =>
          (PRIORITY_ORDER[a.priority] ?? 99) -
          (PRIORITY_ORDER[b.priority] ?? 99),
      )
      .slice(0, 5);

    // ── Trend arrows (library size change vs previous window) ─────────────────
    const previousTotal =
      (regularPrevCountRes.count ?? 0) + (platformPrevCountRes.count ?? 0);
    const previousReqTotal = reqPrevCountRes.count ?? 0;

    return NextResponse.json({
      // Window label so the client can show "Last 7 days" accurately
      window_days: WINDOW_DAYS,
      test_cases: {
        total: windowTotal, // executions in the 7-day window
        library_size: libraryTotal, // kept for reference if needed elsewhere
        regular: regularIds.length,
        cross_platform: platformIds.length,
        // All counts scoped to the 7-day window
        passed: windowPassed,
        failed: windowFailed,
        blocked: windowBlocked,
        skipped: windowSkipped,
        not_run: notRunCount,
        pass_rate,
        trend: calculateTrend(libraryTotal, previousTotal),
        trend_value: calculateTrendPercentage(libraryTotal, previousTotal),
      },
      requirements: {
        total: reqTotal,
        tested: reqTested,
        coverage_percentage,
        by_priority,
        trend: calculateTrend(reqTotal, previousReqTotal),
      },
      automation_runs,
      flaky_tests,
      recent_activity,
      execution_timeline,
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
