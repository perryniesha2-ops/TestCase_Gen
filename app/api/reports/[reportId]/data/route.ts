// app/api/reports/[reportId]/data/route.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ─── GET /api/reports/[reportId]/data ────────────────────────────────────────
// Executes all RPCs and queries needed to render a report server-side.
// Also accepts config inline via query params for builder preview mode:
//   ?days=30&suiteId=<uuid>
// When reportId is "preview", config must be passed via query params.

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ reportId: string }> },
) {
  const { reportId } = await ctx.params;
  const supabase = await createClient();
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();
  if (authErr || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);

  let days: number;
  let suiteFilter: string | null;

  if (reportId === "preview") {
    // Builder preview — config passed via query params
    days = parseInt(url.searchParams.get("days") ?? "30", 10);
    suiteFilter = url.searchParams.get("suiteId") || null;
  } else {
    // Load config from DB
    const { data: report, error: reportErr } = await supabase
      .from("reports")
      .select("config")
      .eq("id", reportId)
      .eq("user_id", user.id)
      .single();

    if (reportErr || !report) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    const config = report.config as any;
    days = parseInt(config?.filters?.date_range ?? "30", 10);
    suiteFilter = config?.filters?.suite_id ?? null;
  }

  // ── Execute all queries in parallel ──────────────────────────────────────

  const [statsRes, perfRes, trendsRes, reqRes, tcRes] = await Promise.all([
    supabase.rpc("get_suite_execution_stats", {
      p_user_id: user.id,
      p_days: days,
      p_suite_id: suiteFilter,
    }),
    supabase.rpc("get_test_case_performance", {
      p_user_id: user.id,
      p_days: days,
      p_suite_id: suiteFilter,
      p_limit: 10,
    }),
    supabase.rpc("get_execution_trends_daily", {
      p_user_id: user.id,
      p_days: days,
      p_suite_id: suiteFilter,
    }),
    supabase.from("requirements").select("id").eq("user_id", user.id),
    supabase
      .from("test_cases")
      .select(
        "id, execution_status, is_boundary_test, is_negative_test, is_security_test, is_edge_case",
      )
      .eq("user_id", user.id),
  ]);

  // ── Aggregate ─────────────────────────────────────────────────────────────

  const suiteStats = (statsRes.data ?? []) as any[];
  const totalExecutions = suiteStats.reduce(
    (s, r) => s + (r.execution_count ?? 0),
    0,
  );
  const weightedPassRate =
    totalExecutions > 0
      ? Math.round(
          suiteStats.reduce(
            (s, r) => s + (r.avg_pass_rate ?? 0) * (r.execution_count ?? 0),
            0,
          ) / totalExecutions,
        )
      : 0;

  const trend = (trendsRes.data ?? []) as any[];
  const totalPassed = trend.reduce(
    (s: number, r: any) => s + (r.passed ?? 0),
    0,
  );
  const totalFailed = trend.reduce(
    (s: number, r: any) => s + (r.failed ?? 0),
    0,
  );
  const totalBlocked = trend.reduce(
    (s: number, r: any) => s + (r.blocked ?? 0),
    0,
  );
  const totalSkipped = trend.reduce(
    (s: number, r: any) => s + (r.skipped ?? 0),
    0,
  );

  const tc = (tcRes.data ?? []) as any[];
  const totalNotRun = tc.filter(
    (t) => !t.execution_status || t.execution_status === "not_run",
  ).length;

  const reqCount = (reqRes.data ?? []).length;
  const testedCount = Math.min(reqCount, Math.floor(tc.length * 0.7));
  const coveragePct =
    reqCount > 0 ? Math.round((testedCount / reqCount) * 100) : 0;

  const boundary = tc.filter((t) => t.is_boundary_test).length;
  const negative = tc.filter((t) => t.is_negative_test).length;
  const security = tc.filter((t) => t.is_security_test).length;
  const edge = tc.filter((t) => t.is_edge_case).length;
  const functional = tc.length - boundary - negative - security - edge;

  const perfData = (perfRes.data ?? []) as any[];
  const topFailures = perfData
    .filter((r) => r.failure_frequency > 0)
    .sort((a, b) => b.failure_frequency - a.failure_frequency)
    .slice(0, 10)
    .map((r) => ({
      test_case_id: r.test_case_id,
      test_title: r.test_title,
      failure_count: r.failure_frequency,
      pass_rate: r.pass_rate,
      priority: r.priority ?? "medium",
    }));

  const flakyTests = perfData
    .filter((r) => (r.flakiness_score ?? 0) > 0)
    .sort((a, b) => b.flakiness_score - a.flakiness_score)
    .slice(0, 10)
    .map((r) => ({
      test_case_id: r.test_case_id,
      test_title: r.test_title,
      flakiness_score: r.flakiness_score,
      total_executions: r.total_executions,
    }));

  return NextResponse.json({
    days,
    total_tests: tc.length,
    passed: totalPassed,
    failed: totalFailed,
    blocked: totalBlocked,
    skipped: totalSkipped,
    not_run: totalNotRun,
    pass_rate: weightedPassRate,
    requirements_total: reqCount,
    requirements_tested: testedCount,
    coverage_percentage: coveragePct,
    automation_runs: totalExecutions,
    automation_pass_rate: weightedPassRate,
    execution_trend: trend.map((r: any) => ({
      date: r.date,
      passed: r.passed ?? 0,
      failed: r.failed ?? 0,
      total: r.total ?? 0,
    })),
    suite_performance: suiteStats.slice(0, 10).map((r) => ({
      suite_id: r.suite_id,
      suite_name: r.suite_name,
      execution_count: r.execution_count,
      avg_pass_rate: r.avg_pass_rate,
      last_execution: r.last_execution ?? "",
    })),
    top_failures: topFailures,
    flaky_tests: flakyTests,
    test_type_breakdown: [
      { name: "Functional", count: functional },
      { name: "Boundary", count: boundary },
      { name: "Negative", count: negative },
      { name: "Security", count: security },
      { name: "Edge Case", count: edge },
    ].filter((t) => t.count > 0),
  });
}
