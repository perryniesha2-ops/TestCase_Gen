// app/api/dashboard/metrics/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const sevenDaysAgoIso = sevenDaysAgo.toISOString();

    // ── Batch 1: all independent queries ─────────────────────────────────────
    const [
      regularTCRes,
      platformTCRes,
      requirementsRes,
      automationRunsStatsRes,
      automationRunsRecentRes,
      recentRegularRes,
      recentPlatformRes,
      regularHistoryRes,
      platformHistoryRes,
      regularPrevCountRes,
      platformPrevCountRes,
      reqPrevCountRes,
    ] = await Promise.all([
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

      // All automation runs for accurate pass rate + total (no .limit())
      supabase
        .from("automation_runs")
        .select("id, status, started_at")
        .eq("user_id", user.id)
        .order("started_at", { ascending: false }),

      // Recent 10 for activity feed (needs suite name join)
      supabase
        .from("automation_runs")
        .select("id, status, started_at, framework, suite_id, suites(name)")
        .eq("user_id", user.id)
        .order("started_at", { ascending: false })
        .limit(10),

      supabase
        .from("test_executions")
        .select(
          "id, execution_status, created_at, test_case_id, test_cases(title)",
        )
        .eq("executed_by", user.id)
        .is("automation_run_id", null)
        .order("created_at", { ascending: false })
        .limit(5),
      supabase
        .from("platform_test_executions")
        .select(
          "id, execution_status, created_at, test_case_id, platform_test_cases(title)",
        )
        .eq("executed_by", user.id)
        .is("automation_run_id", null)
        .order("created_at", { ascending: false })
        .limit(5),

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

    const regularIds = (regularTCRes.data ?? []).map((t) => t.id);
    const platformIds = (platformTCRes.data ?? []).map((t) => t.id);
    const requirementIds = (requirementsRes.data ?? []).map((r) => r.id);

    // ── Batch 2: queries that depend on IDs ───────────────────────────────────
    const [regularExecsRes, platformExecsRes, reqLinksRes, priorityFailedRes] =
      await Promise.all([
        regularIds.length > 0
          ? supabase
              .from("test_executions")
              .select(
                "test_case_id, execution_status, created_at, test_cases(title)",
              )
              .in("test_case_id", regularIds)
              .order("created_at", { ascending: false })
          : Promise.resolve({ data: [], error: null }),

        platformIds.length > 0
          ? supabase
              .from("platform_test_executions")
              .select(
                "test_case_id, execution_status, created_at, platform_test_cases(title)",
              )
              .in("test_case_id", platformIds)
              .order("created_at", { ascending: false })
          : Promise.resolve({ data: [], error: null }),

        requirementIds.length > 0
          ? supabase
              .from("requirement_test_cases")
              .select("requirement_id")
              .in("requirement_id", requirementIds)
          : Promise.resolve({ data: [], error: null }),

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

    const regularExecs = (regularExecsRes.data ?? []) as any[];
    const platformExecs = (platformExecsRes.data ?? []) as any[];

    // ── Pass rate: all-time executions (passed / total executed) ─────────────
    // Uses every execution row — not latest-per-test — for true all-time rate.
    let allTimePassed = 0,
      allTimeFailed = 0,
      allTimeBlocked = 0,
      allTimeSkipped = 0;
    for (const e of regularExecs) {
      if (e.execution_status === "passed") allTimePassed++;
      else if (e.execution_status === "failed") allTimeFailed++;
      else if (e.execution_status === "blocked") allTimeBlocked++;
      else if (e.execution_status === "skipped") allTimeSkipped++;
    }
    for (const e of platformExecs) {
      if (e.execution_status === "passed") allTimePassed++;
      else if (e.execution_status === "failed") allTimeFailed++;
      else if (e.execution_status === "blocked") allTimeBlocked++;
      else if (e.execution_status === "skipped") allTimeSkipped++;
    }
    const allTimeTotal =
      allTimePassed + allTimeFailed + allTimeBlocked + allTimeSkipped;
    const allTestIds = [...regularIds, ...platformIds];
    const libraryTotal = allTestIds.length;

    // not_run = tests in library with zero executions ever
    const executedIds = new Set([
      ...regularExecs.map((e: any) => e.test_case_id),
      ...platformExecs.map((e: any) => e.test_case_id),
    ]);
    const notRunCount = allTestIds.filter((id) => !executedIds.has(id)).length;
    const pass_rate =
      allTimeTotal > 0 ? Math.round((allTimePassed / allTimeTotal) * 100) : 0;

    // ── Flaky tests — with real titles ────────────────────────────────────────
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

    // ── Requirements ──────────────────────────────────────────────────────────
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

    // ── Automation — from ALL runs (no limit distortion) ──────────────────────
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

    // ── Recent activity ───────────────────────────────────────────────────────
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

    // ── Execution timeline (7-day chart) ──────────────────────────────────────
    const execution_timeline = groupExecutionsByDay([
      ...(regularHistoryRes.data ?? []),
      ...(platformHistoryRes.data ?? []),
    ]);

    // ── Priority failures ─────────────────────────────────────────────────────
    const PRIORITY_ORDER: Record<string, number> = { critical: 0, high: 1 };
    const [regularPF, platformPF] = priorityFailedRes;
    const priority_failures = [
      ...(regularPF.data ?? []).map((t: any) => ({
        id: t.id,
        title: t.title,
        priority: t.priority,
        failed_count: 1,
      })),
      ...(platformPF.data ?? []).map((t: any) => ({
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

    // ── Trend arrows ──────────────────────────────────────────────────────────
    const previousTotal =
      (regularPrevCountRes.count ?? 0) + (platformPrevCountRes.count ?? 0);
    const previousReqTotal = reqPrevCountRes.count ?? 0;

    return NextResponse.json({
      test_cases: {
        total: libraryTotal,
        regular: regularIds.length,
        cross_platform: platformIds.length,
        passed: allTimePassed,
        failed: allTimeFailed,
        blocked: allTimeBlocked,
        skipped: allTimeSkipped,
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
