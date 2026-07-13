// app/api/dashboard/data/route.ts
// Returns the full DashboardData shape consumed by the new dashboard.
// The old /api/dashboard/metrics route is kept intact for backward compat.

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { composeBriefing } from "@/lib/compose-briefing";
import type {
  DashboardData,
  DashboardMetrics,
  FixQueueItem,
  CoverageGap,
  OnboardingStep,
} from "@/lib/dashboard-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const WINDOW_DAYS = 7;

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
    const windowStart = new Date(now);
    windowStart.setDate(windowStart.getDate() - WINDOW_DAYS);
    const windowStartIso = windowStart.toISOString();

    const prevWindowStart = new Date(windowStart);
    prevWindowStart.setDate(prevWindowStart.getDate() - WINDOW_DAYS);
    const prevWindowStartIso = prevWindowStart.toISOString();

    // ── Library sizes ────────────────────────────────────────────────────────
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
        .select("id, title, priority")
        .eq("user_id", user.id),
    ]);

    const regularIds = (regularTCRes.data ?? []).map((t) => t.id);
    const platformIds = (platformTCRes.data ?? []).map((t) => t.id);
    const allTestIds = [...regularIds, ...platformIds];

    // ── 7-day executions ─────────────────────────────────────────────────────
    const [
      regularExecsRes,
      platformExecsRes,
      reqLinksRes,
      automationRunsRes,
      regularPFRes,
      platformPFRes,
      prevRegularRes,
      prevPlatformRes,
      prevReqRes,
    ] = await Promise.all([
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

      supabase
        .from("requirement_test_links")
        .select("requirement_id")
        .eq("user_id", user.id),

      supabase
        .from("automation_runs")
        .select("id, status, started_at")
        .eq("user_id", user.id)
        .gte("started_at", windowStartIso),

      // Priority failures — currently failed critical/high tests
      supabase
        .from("test_cases")
        .select("id, title, priority")
        .eq("user_id", user.id)
        .eq("execution_status", "failed")
        .in("priority", ["critical", "high"])
        .limit(10),

      supabase
        .from("platform_test_cases")
        .select("id, title, priority")
        .eq("user_id", user.id)
        .eq("execution_status", "failed")
        .in("priority", ["critical", "high"])
        .limit(10),

      // Previous window for trend deltas
      supabase
        .from("test_executions")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .gte("created_at", prevWindowStartIso)
        .lt("created_at", windowStartIso),

      supabase
        .from("platform_test_executions")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
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
    const allExecs = [...regularExecs, ...platformExecs];

    // ── Pass rate ─────────────────────────────────────────────────────────────
    let windowPassed = 0,
      windowFailed = 0;
    for (const e of allExecs) {
      if (e.execution_status === "passed") windowPassed++;
      else if (e.execution_status === "failed") windowFailed++;
    }
    const windowTotal = allExecs.length;
    const passRatePct =
      windowTotal > 0 ? Math.round((windowPassed / windowTotal) * 100) : 0;

    // ── Coverage ──────────────────────────────────────────────────────────────
    const requirements = requirementsRes.data ?? [];
    const testedSet = new Set(
      (reqLinksRes.data ?? []).map((x: any) => x.requirement_id),
    );
    const reqTotal = requirements.length;
    const coveragePct =
      reqTotal > 0 ? Math.round((testedSet.size / reqTotal) * 100) : 0;

    // ── Open failures ─────────────────────────────────────────────────────────
    const priorityFailures = [
      ...(regularPFRes.data ?? []).map((t: any) => ({
        ...t,
        source: "regular",
      })),
      ...(platformPFRes.data ?? []).map((t: any) => ({
        ...t,
        source: "platform",
      })),
    ];
    const openFailures = priorityFailures.length;
    const highPriorityFailures = priorityFailures.filter(
      (t) => t.priority === "critical" || t.priority === "high",
    ).length;

    // ── Trend deltas ──────────────────────────────────────────────────────────
    const prevExecTotal =
      (prevRegularRes.count ?? 0) + (prevPlatformRes.count ?? 0);
    const prevPassRate =
      prevExecTotal > 0
        ? Math.round(((prevRegularRes.count ?? 0) / prevExecTotal) * 100)
        : 0;
    const passRateDeltaPct = passRatePct - prevPassRate;
    const executionsDelta = windowTotal - prevExecTotal;
    const coverageDeltaReqs = prevReqRes.count ?? 0;

    // ── Metrics object ────────────────────────────────────────────────────────
    const metrics: DashboardMetrics = {
      passRatePct,
      executions7d: windowTotal,
      coveragePct,
      openFailures,
      highPriorityFailures,
      avgRunSeconds: 0, // extend later with timing data
      passRateDeltaPct,
      executionsDelta,
      coverageDeltaReqs,
    };

    // ── Fix queue — ranked by severity then consecutive fails ─────────────────
    const PRIORITY_ORDER: Record<string, number> = { critical: 0, high: 1 };
    const fixQueue: FixQueueItem[] = priorityFailures
      .sort(
        (a, b) =>
          (PRIORITY_ORDER[a.priority] ?? 99) -
          (PRIORITY_ORDER[b.priority] ?? 99),
      )
      .slice(0, 5)
      .map((t, i) => ({
        id: t.id,
        title: t.title,
        reason:
          t.priority === "critical"
            ? "Critical priority — blocks release"
            : "High priority — impacts core flow",
        severity: (t.priority === "critical"
          ? "high"
          : "medium") as FixQueueItem["severity"],
        consecutiveFails: 1,
        href: `/test-cases/${t.id}`,
      }));

    // ── Coverage gaps — requirements with uncovered acceptance criteria ────────
    const coverageGaps: CoverageGap[] = requirements
      .filter((r: any) => !testedSet.has(r.id))
      .slice(0, 5)
      .map((r: any) => ({
        requirementId: r.id,
        title: r.title ?? "Untitled requirement",
        coveredCriteria: 0,
        totalCriteria: 1,
        generateHref: `/generate?requirement=${r.id}`,
      }));

    // ── Onboarding — shown when user has no data yet ──────────────────────────
    const hasData = windowTotal > 0 || allTestIds.length > 0;
    const onboarding: OnboardingStep[] | undefined = !hasData
      ? [
          {
            id: "add-requirements",
            label: "Add your first requirement",
            done: reqTotal > 0,
            href: "/requirements/new",
          },
          {
            id: "generate-tests",
            label: "Generate test cases from a requirement",
            done: allTestIds.length > 0,
            href: "/generate",
          },
          {
            id: "run-tests",
            label: "Run your test suite",
            done: windowTotal > 0,
            href: "/test-cases",
          },
          {
            id: "connect-automation",
            label: "Connect an automation framework",
            done: (automationRunsRes.data ?? []).length > 0,
            href: "/automation",
          },
        ]
      : undefined;

    // ── Last run timestamp ────────────────────────────────────────────────────
    const lastRunAt =
      allExecs.length > 0
        ? allExecs.sort(
            (a, b) =>
              new Date(b.created_at).getTime() -
              new Date(a.created_at).getTime(),
          )[0].created_at
        : null;

    // ── Briefing ──────────────────────────────────────────────────────────────
    const briefing = composeBriefing(metrics, fixQueue, coverageGaps);

    const payload: DashboardData = {
      projectName: "QA Vault",
      lastRunAt,
      metrics,
      briefing,
      fixQueue,
      coverageGaps,
      onboarding,
    };

    return NextResponse.json(payload);
  } catch (e: any) {
    console.error("[dashboard/data]", e);
    return NextResponse.json(
      { error: e?.message ?? "Unexpected error" },
      { status: 500 },
    );
  }
}
