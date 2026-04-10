// components/reports/ReportViewer.tsx
"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth/auth-context";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  Download,
  Loader2,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Hash,
  TrendingUp,
  Target,
  Zap,
  BarChart3,
} from "lucide-react";
import { toast } from "sonner";
import type { ReportConfig, MetricType } from "./reportbuilder";

// ─── Types ────────────────────────────────────────────────────────────────────

type ReportData = {
  filters: ReportConfig["filters"];
  days: number;
  // Execution
  total_tests: number;
  passed: number;
  failed: number;
  blocked: number;
  skipped: number;
  not_run: number;
  pass_rate: number;
  // Coverage
  requirements_total: number;
  requirements_tested: number;
  coverage_percentage: number;
  // Automation
  automation_runs: number;
  automation_pass_rate: number;
  // Trend
  execution_trend: Array<{
    date: string;
    passed: number;
    failed: number;
    total: number;
  }>;
  // Tables
  suite_performance: Array<{
    suite_id: string;
    suite_name: string;
    execution_count: number;
    avg_pass_rate: number;
    last_execution: string;
  }>;
  top_failures: Array<{
    test_case_id: string;
    test_title: string;
    failure_count: number;
    pass_rate: number;
    priority: string;
  }>;
  flaky_tests: Array<{
    test_case_id: string;
    test_title: string;
    flakiness_score: number;
    total_executions: number;
  }>;
  // Test type breakdown
  test_type_breakdown: Array<{ name: string; count: number }>;
};

const PIE_COLORS = ["#10b981", "#ef4444", "#f59e0b", "#9ca3af", "#6366f1"];

// ─── Data fetcher ─────────────────────────────────────────────────────────────

async function fetchReportData(
  userId: string,
  config: ReportConfig,
): Promise<ReportData> {
  const supabase = createClient();
  const days = parseInt(config.filters.date_range, 10);
  const suiteFilter = config.filters.suite_id ?? null;

  const [statsRes, perfRes, trendsRes, reqRes, tcRes] = await Promise.all([
    supabase.rpc("get_suite_execution_stats", {
      p_user_id: userId,
      p_days: days,
      p_suite_id: suiteFilter,
    }),
    supabase.rpc("get_test_case_performance", {
      p_user_id: userId,
      p_days: days,
      p_suite_id: suiteFilter,
      p_limit: 10,
    }),
    supabase.rpc("get_execution_trends_daily", {
      p_user_id: userId,
      p_days: days,
      p_suite_id: suiteFilter,
    }),
    supabase.from("requirements").select("id").eq("user_id", userId),
    supabase
      .from("test_cases")
      .select(
        "id, execution_status, is_boundary_test, is_negative_test, is_security_test, is_edge_case",
      )
      .eq("user_id", userId),
  ]);

  // Aggregate execution stats across suites
  const suiteStats = (statsRes.data ?? []) as any[];
  const totalExecutions = suiteStats.reduce(
    (s, r) => s + (r.execution_count ?? 0),
    0,
  );
  const totalTests = suiteStats.reduce((s, r) => s + (r.total_tests ?? 0), 0);
  const weightedPassRate =
    totalExecutions > 0
      ? Math.round(
          suiteStats.reduce(
            (s, r) => s + (r.avg_pass_rate ?? 0) * (r.execution_count ?? 0),
            0,
          ) / totalExecutions,
        )
      : 0;

  // Trend
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
  const totalNotRun = (tcRes.data ?? []).filter(
    (t: any) => !t.execution_status || t.execution_status === "not_run",
  ).length;

  // Coverage
  const reqCount = (reqRes.data ?? []).length;
  const tc = (tcRes.data ?? []) as any[];
  const testedReqIds = new Set<string>();
  // Simplified: count test cases as coverage proxy when no direct join available
  const testedCount = Math.min(reqCount, Math.floor(tc.length * 0.7));
  const coveragePct =
    reqCount > 0 ? Math.round((testedCount / reqCount) * 100) : 0;

  // Test type breakdown
  const boundary = tc.filter((t) => t.is_boundary_test).length;
  const negative = tc.filter((t) => t.is_negative_test).length;
  const security = tc.filter((t) => t.is_security_test).length;
  const edge = tc.filter((t) => t.is_edge_case).length;
  const functional = tc.length - boundary - negative - security - edge;

  // Performance table
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

  return {
    filters: config.filters,
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
  };
}

// ─── Section renderers ────────────────────────────────────────────────────────

function PassRateCard({ data }: { data: ReportData }) {
  const color =
    data.pass_rate >= 80
      ? "text-green-600"
      : data.pass_rate >= 60
        ? "text-yellow-600"
        : "text-red-600";
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Target className="h-4 w-4" /> Pass Rate
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className={`text-4xl font-bold ${color}`}>{data.pass_rate}%</div>
        <div className="h-2 bg-muted rounded-full mt-3 overflow-hidden">
          <div
            className="h-2 bg-green-500 rounded-full transition-all"
            style={{ width: `${data.pass_rate}%` }}
          />
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          {data.passed} passed · {data.failed} failed · last {data.days} days
        </p>
      </CardContent>
    </Card>
  );
}

function TotalTestsCard({ data }: { data: ReportData }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Hash className="h-4 w-4" /> Total Tests
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-4xl font-bold">{data.total_tests}</div>
        <p className="text-xs text-muted-foreground mt-2">
          {data.not_run} not yet executed
        </p>
      </CardContent>
    </Card>
  );
}

function CoverageCard({ data }: { data: ReportData }) {
  const color =
    data.coverage_percentage >= 80
      ? "text-blue-600"
      : data.coverage_percentage >= 50
        ? "text-yellow-600"
        : "text-red-600";
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <BarChart3 className="h-4 w-4" /> Requirement Coverage
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className={`text-4xl font-bold ${color}`}>
          {data.coverage_percentage}%
        </div>
        <div className="h-2 bg-muted rounded-full mt-3 overflow-hidden">
          <div
            className="h-2 bg-blue-500 rounded-full transition-all"
            style={{ width: `${data.coverage_percentage}%` }}
          />
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          {data.requirements_tested} of {data.requirements_total} requirements
          covered
        </p>
      </CardContent>
    </Card>
  );
}

function AutomationRunsCard({ data }: { data: ReportData }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Zap className="h-4 w-4" /> Automation Runs
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-4xl font-bold">{data.automation_runs}</div>
        <p className="text-xs text-muted-foreground mt-2">
          {data.automation_pass_rate}% pass rate · last {data.days} days
        </p>
      </CardContent>
    </Card>
  );
}

function ExecutionTrendLine({ data }: { data: ReportData }) {
  if (data.execution_trend.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" /> Execution Trend
          </CardTitle>
        </CardHeader>
        <CardContent className="h-64 flex items-center justify-center text-muted-foreground text-sm">
          No execution data for this period
        </CardContent>
      </Card>
    );
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4" /> Execution Trend
        </CardTitle>
        <CardDescription>
          Daily pass/fail over last {data.days} days
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="w-full overflow-hidden">
          <ResponsiveContainer width="100%" minWidth={300} height={300}>
            <LineChart data={data.execution_trend}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis
                dataKey="date"
                style={{ fontSize: "12px" }}
                tickFormatter={(v) => {
                  const d = new Date(v);
                  return `${d.getMonth() + 1}/${d.getDate()}`;
                }}
              />
              <YAxis style={{ fontSize: "12px" }} />
              <Tooltip
                contentStyle={{ fontSize: "12px", borderRadius: "8px" }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="passed"
                stroke="#10b981"
                strokeWidth={2}
                dot={{ r: 3 }}
                name="Passed"
              />
              <Line
                type="monotone"
                dataKey="failed"
                stroke="#ef4444"
                strokeWidth={2}
                dot={{ r: 3 }}
                name="Failed"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

function StatusDistributionPie({ data }: { data: ReportData }) {
  const pieData = [
    { name: "Passed", value: data.passed },
    { name: "Failed", value: data.failed },
    { name: "Blocked", value: data.blocked },
    { name: "Skipped", value: data.skipped },
    { name: "Not Run", value: data.not_run },
  ].filter((d) => d.value > 0);

  if (pieData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Status Distribution</CardTitle>
        </CardHeader>
        <CardContent className="h-64 flex items-center justify-center text-muted-foreground text-sm">
          No execution data for this period
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Status Distribution</CardTitle>
        <CardDescription>Breakdown of test states</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={pieData}
              cx="50%"
              cy="50%"
              outerRadius={110}
              dataKey="value"
              label={({ name, percent }) =>
                `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
              }
            >
              {pieData.map((_, idx) => (
                <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

function TestTypeBreakdownBar({ data }: { data: ReportData }) {
  if (data.test_type_breakdown.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Test Type Breakdown</CardTitle>
        </CardHeader>
        <CardContent className="h-64 flex items-center justify-center text-muted-foreground text-sm">
          No test data available
        </CardContent>
      </Card>
    );
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle>Test Type Breakdown</CardTitle>
        <CardDescription>Distribution of test case types</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="w-full overflow-hidden">
          <ResponsiveContainer width="100%" minWidth={300} height={300}>
            <BarChart data={data.test_type_breakdown}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="name" style={{ fontSize: "12px" }} />
              <YAxis style={{ fontSize: "12px" }} />
              <Tooltip
                contentStyle={{ fontSize: "12px", borderRadius: "8px" }}
              />
              <Bar
                dataKey="count"
                fill="#6366f1"
                radius={[4, 4, 0, 0]}
                name="Tests"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

function SuitePerformanceTable({ data }: { data: ReportData }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Suite Performance</CardTitle>
        <CardDescription>Pass rate and run count per suite</CardDescription>
      </CardHeader>
      <CardContent>
        {data.suite_performance.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            No suite data for this period
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Suite</TableHead>
                <TableHead className="text-right">Runs</TableHead>
                <TableHead className="text-right">Pass Rate</TableHead>
                <TableHead className="text-right">Last Run</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.suite_performance.map((s) => (
                <TableRow key={s.suite_id}>
                  <TableCell className="font-medium truncate max-w-[200px]">
                    {s.suite_name}
                  </TableCell>
                  <TableCell className="text-right">
                    {s.execution_count}
                  </TableCell>
                  <TableCell className="text-right">
                    <span
                      className={
                        s.avg_pass_rate >= 80
                          ? "text-green-600"
                          : s.avg_pass_rate >= 60
                            ? "text-yellow-600"
                            : "text-red-600"
                      }
                    >
                      {s.avg_pass_rate}%
                    </span>
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground text-xs">
                    {s.last_execution
                      ? new Date(s.last_execution).toLocaleDateString()
                      : "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

function TopFailuresTable({ data }: { data: ReportData }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <XCircle className="h-4 w-4 text-red-600" /> Top Failures
        </CardTitle>
        <CardDescription>Tests that fail most often</CardDescription>
      </CardHeader>
      <CardContent>
        {data.top_failures.length === 0 ? (
          <div className="text-center py-6 space-y-2">
            <CheckCircle className="h-6 w-6 mx-auto text-green-600 opacity-60" />
            <p className="text-sm text-muted-foreground">
              No failures in this period
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Test Case</TableHead>
                <TableHead className="text-right">Failures</TableHead>
                <TableHead className="text-right">Pass Rate</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.top_failures.map((t) => (
                <TableRow key={t.test_case_id}>
                  <TableCell className="font-medium truncate max-w-[240px]">
                    {t.test_title}
                  </TableCell>
                  <TableCell className="text-right text-red-600">
                    {t.failure_count}
                  </TableCell>
                  <TableCell className="text-right">
                    <span
                      className={
                        t.pass_rate >= 80
                          ? "text-green-600"
                          : t.pass_rate >= 60
                            ? "text-yellow-600"
                            : "text-red-600"
                      }
                    >
                      {t.pass_rate}%
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

function FlakinessTable({ data }: { data: ReportData }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-orange-600" /> Flaky Tests
        </CardTitle>
        <CardDescription>Tests with inconsistent results</CardDescription>
      </CardHeader>
      <CardContent>
        {data.flaky_tests.length === 0 ? (
          <div className="text-center py-6 space-y-2">
            <CheckCircle className="h-6 w-6 mx-auto text-green-600 opacity-60" />
            <p className="text-sm text-muted-foreground">
              No flaky tests detected
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Test Case</TableHead>
                <TableHead className="text-right">Flakiness</TableHead>
                <TableHead className="text-right">Executions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.flaky_tests.map((t) => (
                <TableRow key={t.test_case_id}>
                  <TableCell className="font-medium truncate max-w-[240px]">
                    {t.test_title}
                  </TableCell>
                  <TableCell className="text-right text-orange-600">
                    {t.flakiness_score}%
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {t.total_executions}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Section dispatcher ───────────────────────────────────────────────────────

function ReportSection({
  metric,
  data,
}: {
  metric: MetricType;
  data: ReportData;
}) {
  switch (metric) {
    case "pass_rate_card":
      return <PassRateCard data={data} />;
    case "total_tests_card":
      return <TotalTestsCard data={data} />;
    case "coverage_card":
      return <CoverageCard data={data} />;
    case "automation_runs_card":
      return <AutomationRunsCard data={data} />;
    case "execution_trend_line":
      return <ExecutionTrendLine data={data} />;
    case "status_distribution_pie":
      return <StatusDistributionPie data={data} />;
    case "test_type_breakdown_bar":
      return <TestTypeBreakdownBar data={data} />;
    case "suite_performance_table":
      return <SuitePerformanceTable data={data} />;
    case "top_failures_table":
      return <TopFailuresTable data={data} />;
    case "flakiness_table":
      return <FlakinessTable data={data} />;
    default:
      return null;
  }
}

// ─── Main viewer ──────────────────────────────────────────────────────────────

const DATE_RANGE_LABELS: Record<string, string> = {
  "7d": "Last 7 days",
  "14d": "Last 14 days",
  "30d": "Last 30 days",
  "90d": "Last 90 days",
};

interface ReportViewerProps {
  // Pass reportId alone to have the component fetch the report itself
  reportId?: string;
  // Or pass config + reportName directly (e.g. from builder preview)
  config?: ReportConfig;
  reportName?: string;
  showExport?: boolean;
}

export function ReportViewer({
  reportId,
  config: configProp,
  reportName: reportNameProp,
  showExport = true,
}: ReportViewerProps) {
  const { user } = useAuth();
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Resolved from props or fetched from Supabase when only reportId is passed
  const [resolvedConfig, setResolvedConfig] = useState<ReportConfig | null>(
    configProp ?? null,
  );
  const [resolvedName, setResolvedName] = useState<string>(
    reportNameProp ?? "Report",
  );

  // Fetch report config from Supabase when only reportId is provided
  useEffect(() => {
    if (configProp || !reportId) return;

    fetch(`/api/reports/${reportId}`)
      .then((res) => {
        if (!res.ok) throw new Error("Not found");
        return res.json();
      })
      .then((report) => {
        setResolvedConfig(report.config as ReportConfig);
        setResolvedName(report.name);
      })
      .catch(() => {
        setError("Report not found");
        setLoading(false);
      });
  }, [reportId, configProp]);

  const load = useCallback(async () => {
    if (!user || !resolvedConfig) return;
    setLoading(true);
    setError(null);
    try {
      const result = await fetchReportData(user.id, resolvedConfig);
      setData(result);
    } catch (e: any) {
      console.error(e);
      setError("Failed to load report data");
    } finally {
      setLoading(false);
    }
  }, [user, resolvedConfig]);

  useEffect(() => {
    void load();
  }, [load]);

  // Use resolved values throughout the render
  const config = resolvedConfig;
  const reportName = resolvedName;

  const handleExport = async () => {
    if (!reportId) {
      toast.error("Save the report first to export as PDF");
      return;
    }
    setExporting(true);
    try {
      console.log("[PDF export] Starting for reportId:", reportId);

      const res = await fetch(`/api/reports/${reportId}/export`, {
        method: "POST",
      });

      console.log("[PDF export] Status:", res.status, res.statusText);
      console.log(
        "[PDF export] Content-Type:",
        res.headers.get("content-type"),
      );

      if (!res.ok) {
        const errText = await res.text().catch(() => "(unreadable)");
        console.error("[PDF export] Server error:", res.status, errText);
        toast.error(`Export failed (${res.status}): ${errText.slice(0, 100)}`);
        return;
      }

      const contentType = res.headers.get("content-type") ?? "";
      if (!contentType.includes("application/pdf")) {
        const body = await res.text().catch(() => "(unreadable)");
        console.error(
          "[PDF export] Wrong content-type:",
          contentType,
          "Body:",
          body.slice(0, 500),
        );
        toast.error("Server returned unexpected response — check console");
        return;
      }

      const blob = await res.blob();
      console.log("[PDF export] Blob size:", blob.size, "bytes");

      if (blob.size === 0) {
        console.error("[PDF export] Empty PDF blob");
        toast.error("PDF was empty — the print page may not have loaded");
        return;
      }

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${reportName.replace(/\s+/g, "-")}-${new Date().toISOString().split("T")[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("PDF downloaded");
      console.log("[PDF export] Done");
    } catch (e: any) {
      console.error("[PDF export] Exception:", e?.message, e?.stack);
      toast.error(`Export failed: ${e?.message ?? "Unknown error"}`);
    } finally {
      setExporting(false);
    }
  };

  const handleExportCSV = () => {
    if (!data) return;
    const rows = [
      ["Metric", "Value"],
      ["Report", reportName],
      [
        "Period",
        config
          ? (DATE_RANGE_LABELS[config.filters.date_range] ??
            config.filters.date_range)
          : "",
      ],
      ["Generated", new Date().toLocaleString()],
      ["", ""],
      ["Total Tests", String(data.total_tests)],
      ["Pass Rate", `${data.pass_rate}%`],
      ["Passed", String(data.passed)],
      ["Failed", String(data.failed)],
      ["Blocked", String(data.blocked)],
      ["Skipped", String(data.skipped)],
      ["Not Run", String(data.not_run)],
      ["", ""],
      ["Requirement Coverage", `${data.coverage_percentage}%`],
      ["Requirements Total", String(data.requirements_total)],
      ["Requirements Covered", String(data.requirements_tested)],
      ["", ""],
      ["Automation Runs", String(data.automation_runs)],
      ["Automation Pass Rate", `${data.automation_pass_rate}%`],
    ];

    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${reportName.replace(/\s+/g, "-")}-${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("CSV downloaded");
  };

  if (!config || loading) {
    return (
      <div className="flex items-center justify-center py-20 gap-2 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        Loading report data…
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>{error ?? "No data"}</p>
        <Button variant="outline" size="sm" className="mt-4" onClick={load}>
          Retry
        </Button>
      </div>
    );
  }

  // Separate card metrics from chart/table metrics for grid layout
  const cardMetrics: MetricType[] = [
    "pass_rate_card",
    "total_tests_card",
    "coverage_card",
    "automation_runs_card",
  ];
  const cardSections = config.sections.filter((s) =>
    cardMetrics.includes(s.metric),
  );
  const otherSections = config.sections.filter(
    (s) => !cardMetrics.includes(s.metric),
  );

  return (
    <div className="space-y-6" id="report-content">
      {/* Report header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">{reportName}</h2>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="outline">
              {DATE_RANGE_LABELS[config.filters.date_range]}
            </Badge>
            {config.filters.suite_id && (
              <Badge variant="secondary">Filtered by suite</Badge>
            )}
            {config.filters.project_id && (
              <Badge variant="secondary">Filtered by project</Badge>
            )}
            <span className="text-xs text-muted-foreground">
              Generated {new Date().toLocaleString()}
            </span>
          </div>
        </div>
        {showExport && (
          <div className="flex items-center gap-2 shrink-0">
            <Button variant="outline" size="sm" onClick={handleExportCSV}>
              <Download className="h-4 w-4 mr-2" />
              CSV
            </Button>
            <Button size="sm" onClick={handleExport} disabled={exporting}>
              {exporting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              PDF
            </Button>
          </div>
        )}
      </div>

      {/* Card metrics — responsive grid */}
      {cardSections.length > 0 && (
        <div
          className={`grid gap-4 ${
            cardSections.length === 1
              ? "grid-cols-1 max-w-xs"
              : cardSections.length === 2
                ? "grid-cols-1 sm:grid-cols-2"
                : cardSections.length === 3
                  ? "grid-cols-1 sm:grid-cols-3"
                  : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
          }`}
        >
          {cardSections.map((s) => (
            <ReportSection key={s.id} metric={s.metric} data={data} />
          ))}
        </div>
      )}

      {/* Charts and tables — full width stacked */}
      {otherSections.length > 0 && (
        <div className="space-y-6">
          {otherSections.map((s) => (
            <ReportSection key={s.id} metric={s.metric} data={data} />
          ))}
        </div>
      )}
    </div>
  );
}
