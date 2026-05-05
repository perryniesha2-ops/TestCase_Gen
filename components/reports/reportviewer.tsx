// components/reports/ReportViewer.tsx
"use client";

import { useEffect, useState, useCallback, useRef } from "react";
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
  total_tests: number;
  passed: number;
  failed: number;
  blocked: number;
  skipped: number;
  not_run: number;
  pass_rate: number;
  requirements_total: number;
  requirements_tested: number;
  coverage_percentage: number;
  automation_runs: number;
  automation_pass_rate: number;
  execution_trend: Array<{
    date: string;
    passed: number;
    failed: number;
    total: number;
  }>;
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
  test_type_breakdown: Array<{ name: string; count: number }>;
};

const PIE_COLORS: Record<string, string> = {
  Passed: "#10b981",
  Failed: "#ef4444",
  Blocked: "#f59e0b",
  Skipped: "#9ca3af",
  "Not Run": "#6366f1",
};
const RADIAN = Math.PI / 180;

// ─── Chart theme hook ─────────────────────────────────────────────────────────
// Resolves CSS variables to actual hex/rgb values at runtime so they work
// in both HTML tooltip styles AND SVG stroke/fill attributes (which don't
// support CSS custom properties).
function useChartTheme() {
  const [theme, setTheme] = useState(() => getChartTheme());

  useEffect(() => {
    // Re-resolve whenever the document class changes (dark/light toggle)
    const observer = new MutationObserver(() => setTheme(getChartTheme()));
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => observer.disconnect();
  }, []);

  return theme;
}

function resolveCssVar(variable: string, fallback: string): string {
  if (typeof window === "undefined") return fallback;
  const raw = getComputedStyle(document.documentElement)
    .getPropertyValue(variable)
    .trim();
  if (!raw) return fallback;
  // shadcn/ui stores vars as raw HSL channels: "214.3 31.8% 91.4%"
  // Other setups may store full values: "#e2e8f0" or "hsl(...)"
  // Only wrap in hsl() if it looks like raw channels (no letters at start)
  if (/^[\d.]+\s/.test(raw)) return `hsl(${raw})`;
  return raw;
}

function getChartTheme() {
  const isDark = document.documentElement.classList.contains("dark");
  return {
    border: resolveCssVar("--border", isDark ? "#334155" : "#e2e8f0"),
    mutedForeground: resolveCssVar(
      "--muted-foreground",
      isDark ? "#94a3b8" : "#64748b",
    ),
    card: resolveCssVar("--card", isDark ? "#1e293b" : "#ffffff"),
    cardForeground: resolveCssVar(
      "--card-foreground",
      isDark ? "#f1f5f9" : "#0f172a",
    ),
    muted: resolveCssVar("--muted", isDark ? "#1e293b" : "#f1f5f9"),
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
            className="h-2 bg-green-500 rounded-full"
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
            className="h-2 bg-blue-500 rounded-full"
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
  const passed = Math.round(
    (data.automation_runs * data.automation_pass_rate) / 100,
  );
  const failed = data.automation_runs - passed;
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Zap className="h-4 w-4" /> Automation Runs
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-4xl font-bold">{data.automation_runs}</div>
        <div className="h-2 bg-muted rounded-full mt-3 overflow-hidden">
          <div
            className="h-2 bg-green-500 rounded-full"
            style={{ width: `${data.automation_pass_rate}%` }}
          />
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          {passed} passed · {failed} failed · {data.automation_pass_rate}% pass
          rate
        </p>
      </CardContent>
    </Card>
  );
}

function ExecutionTrendLine({ data }: { data: ReportData }) {
  const ct = useChartTheme();
  const tooltipStyle: React.CSSProperties = {
    fontSize: "12px",
    borderRadius: "8px",
    boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
    padding: "8px 12px",
    backgroundColor: ct.card,
    borderColor: ct.border,
    color: ct.cardForeground,
  };
  const tooltipTextStyle: React.CSSProperties = { color: ct.cardForeground };

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
        <ResponsiveContainer width="100%" height={320}>
          <LineChart
            data={data.execution_trend}
            margin={{ top: 8, right: 24, left: 8, bottom: 4 }}
          >
            <CartesianGrid
              strokeDasharray="1 0"
              stroke={ct.border}
              strokeWidth={1}
            />
            <XAxis
              dataKey="date"
              style={{ fontSize: "12px" }}
              tick={{ fill: ct.mutedForeground }}
              axisLine={{ stroke: ct.border }}
              tickLine={false}
              tickFormatter={(v) => {
                const d = new Date(v);
                return `${d.getMonth() + 1}/${d.getDate()}`;
              }}
            />
            <YAxis
              style={{ fontSize: "12px" }}
              tick={{ fill: ct.mutedForeground }}
              axisLine={false}
              tickLine={false}
              width={36}
            />
            <Tooltip
              contentStyle={tooltipStyle}
              labelStyle={tooltipTextStyle}
              itemStyle={tooltipTextStyle}
              cursor={{ stroke: ct.border, strokeWidth: 1 }}
            />
            <Legend
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ fontSize: 12, paddingTop: 12 }}
            />
            <Line
              type="monotone"
              dataKey="passed"
              stroke="#10b981"
              strokeWidth={2}
              dot={{ r: 3, fill: "#10b981", strokeWidth: 0 }}
              activeDot={{ r: 5 }}
              name="Passed"
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="failed"
              stroke="#ef4444"
              strokeWidth={2}
              dot={{ r: 3, fill: "#ef4444", strokeWidth: 0 }}
              activeDot={{ r: 5 }}
              name="Failed"
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

// ─── Custom pie label ─────────────────────────────────────────────────────────
// Renders outside the slice with enough offset that labels never clip against
// the top/bottom edges of the chart, and anchors left/right based on midAngle.

function PieLabel({
  cx,
  cy,
  midAngle,
  outerRadius,
  name,
  percent,
}: {
  cx?: number;
  cy?: number;
  midAngle?: number;
  outerRadius?: number;
  name?: string;
  percent?: number;
}) {
  if (cx == null || cy == null || midAngle == null || outerRadius == null)
    return null;
  const radius = outerRadius + 28;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text
      x={x}
      y={y}
      textAnchor={x > cx ? "start" : "end"}
      dominantBaseline="central"
      fontSize={12}
      fill="currentColor"
    >
      {`${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
    </text>
  );
}

function StatusDistributionPie({ data }: { data: ReportData }) {
  const ct = useChartTheme();
  const tooltipStyle: React.CSSProperties = {
    fontSize: "12px",
    borderRadius: "8px",
    boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
    padding: "8px 12px",
    backgroundColor: ct.card,
    borderColor: ct.border,
    color: ct.cardForeground,
  };
  const tooltipLabelStyle: React.CSSProperties = { color: ct.cardForeground };
  const tooltipItemStyle: React.CSSProperties = { color: ct.cardForeground };

  const pieData = [
    { name: "Passed", value: data.passed },
    { name: "Failed", value: data.failed },
    { name: "Blocked", value: data.blocked },
    { name: "Skipped", value: data.skipped },
    { name: "Not Run", value: data.not_run },
  ].filter((d) => d.value > 0);

  if (pieData.length === 0)
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Status Distribution</CardTitle>
        <CardDescription>Breakdown of test states</CardDescription>
      </CardHeader>
      <CardContent>
        {/*
          Extra height (360) + generous margins give the custom labels room to
          breathe above and below the pie without being clipped by the SVG
          viewport. outerRadius is reduced to 100 so the label offset (28px)
          fits comfortably within the margins.
        */}
        <ResponsiveContainer width="100%" height={360}>
          <PieChart margin={{ top: 28, right: 56, bottom: 8, left: 56 }}>
            <Pie
              data={pieData}
              cx="50%"
              cy="48%"
              outerRadius={100}
              dataKey="value"
              isAnimationActive={false}
              labelLine={false}
              label={(props) => <PieLabel {...props} />}
            >
              {pieData.map((_, idx) => (
                <Cell key={idx} fill={PIE_COLORS[_.name] ?? "#9ca3af"} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={tooltipStyle}
              labelStyle={tooltipLabelStyle}
              itemStyle={tooltipItemStyle}
            />
            <Legend
              verticalAlign="bottom"
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ paddingTop: 12, fontSize: 12 }}
            />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

function TestTypeBreakdownBar({ data }: { data: ReportData }) {
  const ct = useChartTheme();
  const tooltipStyle: React.CSSProperties = {
    fontSize: "12px",
    borderRadius: "8px",
    boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
    padding: "8px 12px",
    backgroundColor: ct.card,
    borderColor: ct.border,
    color: ct.cardForeground,
  };
  const tooltipTextStyle: React.CSSProperties = { color: ct.cardForeground };

  if (data.test_type_breakdown.length === 0)
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
  return (
    <Card>
      <CardHeader>
        <CardTitle>Test Type Breakdown</CardTitle>
        <CardDescription>Distribution of test case types</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart
            data={data.test_type_breakdown}
            margin={{ top: 8, right: 24, left: 8, bottom: 4 }}
          >
            <CartesianGrid
              strokeDasharray="1 0"
              stroke={ct.border}
              strokeWidth={1}
              vertical={false}
            />
            <XAxis
              dataKey="name"
              style={{ fontSize: "12px" }}
              tick={{ fill: ct.mutedForeground }}
              axisLine={{ stroke: ct.border }}
              tickLine={false}
            />
            <YAxis
              style={{ fontSize: "12px" }}
              tick={{ fill: ct.mutedForeground }}
              axisLine={false}
              tickLine={false}
              width={36}
            />
            <Tooltip
              contentStyle={tooltipStyle}
              labelStyle={tooltipTextStyle}
              itemStyle={tooltipTextStyle}
              cursor={{ fill: ct.muted, opacity: 0.4 }}
            />
            <Bar
              dataKey="count"
              fill="#6366f1"
              radius={[4, 4, 0, 0]}
              name="Tests"
              isAnimationActive={false}
            />
          </BarChart>
        </ResponsiveContainer>
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
  reportId?: string;
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
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [resolvedConfig, setResolvedConfig] = useState<ReportConfig | null>(
    configProp ?? null,
  );
  const [resolvedName, setResolvedName] = useState<string>(
    reportNameProp ?? "Report",
  );
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (configProp || !reportId || !user?.id) return;
    fetch(`/api/reports/${reportId}`, { cache: "no-store" })
      .then((res) => res.json())
      .then((payload) => {
        if (payload.error) {
          setError("Report not found");
          setLoading(false);
          return;
        }
        setResolvedConfig(payload.report.config as ReportConfig);
        setResolvedName(payload.report.name);
      })
      .catch(() => {
        setError("Failed to load report");
        setLoading(false);
      });
  }, [reportId, configProp, user?.id]);

  const load = useCallback(async () => {
    if (!user?.id || !resolvedConfig) return;
    setLoading(true);
    setError(null);
    try {
      const days = parseInt(resolvedConfig.filters.date_range, 10);
      const suiteId = resolvedConfig.filters.suite_id ?? null;
      const id = reportId ?? "preview";
      const qs = new URLSearchParams({ days: String(days) });
      if (suiteId) qs.set("suiteId", suiteId);

      const res = await fetch(`/api/reports/${id}/data?${qs.toString()}`, {
        cache: "no-store",
      });
      const payload = await res.json();
      if (!res.ok)
        throw new Error(payload?.error ?? "Failed to load report data");

      setData({ ...payload, filters: resolvedConfig.filters });
    } catch (e: any) {
      console.error(e);
      setError("Failed to load report data");
    } finally {
      setLoading(false);
    }
  }, [user?.id, resolvedConfig, reportId]);

  useEffect(() => {
    if (!user?.id || !resolvedConfig) return;
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    void load();
  }, [user?.id, resolvedConfig]);

  useEffect(() => {
    fetchedRef.current = false;
  }, [resolvedConfig]);

  const config = resolvedConfig;
  const reportName = resolvedName;

  const handleExport = async () => {
    if (!data || !config) return;
    setExporting(true);
    try {
      const periodLabel =
        DATE_RANGE_LABELS[config.filters.date_range] ??
        config.filters.date_range;

      const filename = `${reportName.replace(/\s+/g, "-")}-${new Date().toISOString().split("T")[0]}.pdf`;

      const payload = {
        type: "report" as const,
        filename,
        data: {
          reportName,
          periodLabel,
          generatedAt: new Date().toLocaleString(),
          days: data.days,
          // Pass the user's configured sections so the PDF mirrors the viewer
          sections: config.sections.map((s) => ({
            id: s.id,
            metric: s.metric,
          })),
          total_tests: data.total_tests,
          passed: data.passed,
          failed: data.failed,
          blocked: data.blocked,
          skipped: data.skipped,
          not_run: data.not_run,
          pass_rate: data.pass_rate,
          requirements_total: data.requirements_total,
          requirements_tested: data.requirements_tested,
          coverage_percentage: data.coverage_percentage,
          automation_runs: data.automation_runs,
          automation_pass_rate: data.automation_pass_rate,
          execution_trend: data.execution_trend,
          suite_performance: data.suite_performance,
          top_failures: data.top_failures,
          flaky_tests: data.flaky_tests,
          test_type_breakdown: data.test_type_breakdown,
        },
      };

      const res = await fetch("/api/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.error ?? `PDF generation failed (${res.status})`);
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success("PDF downloaded");
    } catch (e: any) {
      console.error("[PDF export]", e);
      toast.error(e?.message ?? "Failed to generate PDF");
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
        <Button
          variant="outline"
          size="sm"
          className="mt-4"
          onClick={() => {
            fetchedRef.current = false;
            void load();
          }}
        >
          Retry
        </Button>
      </div>
    );
  }

  const cardMetrics: MetricType[] = [
    "pass_rate_card",
    "total_tests_card",
    "coverage_card",
    "automation_runs_card",
  ];

  // Deduplicate by metric — if the report config has the same metric twice
  // (e.g. user added pass_rate_card twice in the builder), only show it once.
  const seenMetrics = new Set<string>();
  const cardSections = config.sections.filter((s) => {
    if (!cardMetrics.includes(s.metric)) return false;
    if (seenMetrics.has(s.metric)) return false;
    seenMetrics.add(s.metric);
    return true;
  });
  const otherSections = config.sections.filter((s) => {
    if (cardMetrics.includes(s.metric)) return false;
    if (seenMetrics.has(s.metric)) return false;
    seenMetrics.add(s.metric);
    return true;
  });

  return (
    <div className="space-y-6" id="report-content">
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
            <div key={s.id} data-report-card>
              <ReportSection metric={s.metric} data={data} />
            </div>
          ))}
        </div>
      )}
      {otherSections.length > 0 && (
        <div className="space-y-6">
          {otherSections.map((s) => (
            <div key={s.id} data-report-card>
              <ReportSection metric={s.metric} data={data} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
