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

const PIE_COLORS = ["#10b981", "#ef4444", "#f59e0b", "#9ca3af", "#6366f1"];

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
        <ResponsiveContainer width="100%" height={300}>
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
            <Tooltip contentStyle={{ fontSize: "12px", borderRadius: "8px" }} />
            <Legend />
            <Line
              type="monotone"
              dataKey="passed"
              stroke="#10b981"
              strokeWidth={2}
              dot={{ r: 3 }}
              name="Passed"
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="failed"
              stroke="#ef4444"
              strokeWidth={2}
              dot={{ r: 3 }}
              name="Failed"
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
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
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={pieData}
              cx="50%"
              cy="50%"
              outerRadius={110}
              dataKey="value"
              isAnimationActive={false}
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
          <BarChart data={data.test_type_breakdown}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
            <XAxis dataKey="name" style={{ fontSize: "12px" }} />
            <YAxis style={{ fontSize: "12px" }} />
            <Tooltip contentStyle={{ fontSize: "12px", borderRadius: "8px" }} />
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

  // Fetch report config from API when only reportId provided
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

  // Gate on user?.id + resolvedConfig — ref prevents double-fetch
  useEffect(() => {
    if (!user?.id || !resolvedConfig) return;
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    void load();
  }, [user?.id, resolvedConfig]);

  // Reset ref when config changes (filter change should re-fetch)
  useEffect(() => {
    fetchedRef.current = false;
  }, [resolvedConfig]);

  const config = resolvedConfig;
  const reportName = resolvedName;

  const handleExport = async () => {
    setExporting(true);
    try {
      const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
        import("html2canvas-pro"),
        import("jspdf"),
      ]);
      const reportEl = document.getElementById("report-content");
      if (!reportEl) {
        toast.error("Report content not found");
        return;
      }

      const wrapper = document.createElement("div");
      Object.assign(wrapper.style, {
        position: "fixed",
        top: "-99999px",
        left: "0",
        width: "1200px",
        backgroundColor: "#ffffff",
        color: "#0f172a",
        padding: "40px",
        boxSizing: "border-box",
        fontFamily: "system-ui, -apple-system, sans-serif",
        zIndex: "-1",
      });
      const lightVars: [string, string][] = [
        ["--background", "#ffffff"],
        ["--foreground", "#0f172a"],
        ["--card", "#ffffff"],
        ["--card-foreground", "#0f172a"],
        ["--muted", "#f1f5f9"],
        ["--muted-foreground", "#64748b"],
        ["--border", "#e2e8f0"],
        ["--primary", "#1e293b"],
        ["--primary-foreground", "#f8fafc"],
      ];
      lightVars.forEach(([k, v]) => wrapper.style.setProperty(k, v));
      const clone = reportEl.cloneNode(true) as HTMLElement;
      clone.classList.remove("dark");
      wrapper.appendChild(clone);
      document.body.appendChild(wrapper);

      wrapper.querySelectorAll("*").forEach((el) => {
        const htmlEl = el as HTMLElement;
        const cs = window.getComputedStyle(htmlEl);
        const bg = cs.backgroundColor;
        if (bg && bg !== "rgba(0, 0, 0, 0)" && bg !== "transparent") {
          const nums = bg.match(/[\d.]+/g)?.map(Number) ?? [];
          if (nums.length >= 3) {
            const lum = (nums[0] * 299 + nums[1] * 587 + nums[2] * 114) / 1000;
            htmlEl.style.backgroundColor = lum < 80 ? "#ffffff" : bg;
          }
        } else {
          htmlEl.style.backgroundColor = "transparent";
        }
        const fg = cs.color;
        if (fg) {
          const nums = fg.match(/[\d.]+/g)?.map(Number) ?? [];
          if (nums.length >= 3) {
            const lum = (nums[0] * 299 + nums[1] * 587 + nums[2] * 114) / 1000;
            htmlEl.style.color = lum > 200 ? "#0f172a" : fg;
          }
        }
        const border = cs.borderColor;
        if (border?.includes("oklch")) htmlEl.style.borderColor = "#e2e8f0";
      });

      const styleTag = document.createElement("style");
      styleTag.textContent =
        "* { animation-duration: 0s !important; transition-duration: 0s !important; }";
      wrapper.appendChild(styleTag);
      await new Promise((resolve) => setTimeout(resolve, 300));

      const canvas = await html2canvas(wrapper, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        width: 1200,
        logging: false,
        onclone: (_doc, el) => {
          const s = _doc.createElement("style");
          s.textContent =
            "* { animation-duration: 0s !important; transition-duration: 0s !important; }";
          _doc.head.appendChild(s);
          el.querySelectorAll("[style]").forEach((node) => {
            const htmlNode = node as HTMLElement;
            if (
              htmlNode.style.cssText.includes("oklch") ||
              htmlNode.style.cssText.includes("lab(")
            ) {
              htmlNode.style.backgroundColor = "#ffffff";
              htmlNode.style.color = "#0f172a";
              htmlNode.style.borderColor = "#e2e8f0";
            }
          });
        },
      });
      document.body.removeChild(wrapper);

      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 12;
      const contentWidth = pageWidth - margin * 2;
      const scale = canvas.width / contentWidth;
      const pageSlicePx = Math.floor((pageHeight - margin * 2) * scale);
      const sliceCanvas = document.createElement("canvas");
      sliceCanvas.width = canvas.width;
      const sliceCtx = sliceCanvas.getContext("2d")!;
      let offsetY = 0,
        pageNum = 0;
      while (offsetY < canvas.height) {
        const slicePx = Math.min(pageSlicePx, canvas.height - offsetY);
        sliceCanvas.height = slicePx;
        sliceCtx.fillStyle = "#ffffff";
        sliceCtx.fillRect(0, 0, sliceCanvas.width, slicePx);
        sliceCtx.drawImage(
          canvas,
          0,
          offsetY,
          canvas.width,
          slicePx,
          0,
          0,
          canvas.width,
          slicePx,
        );
        if (pageNum > 0) pdf.addPage();
        pdf.addImage(
          sliceCanvas.toDataURL("image/png"),
          "PNG",
          margin,
          margin,
          contentWidth,
          slicePx / scale,
        );
        offsetY += slicePx;
        pageNum++;
      }
      pdf.save(
        `${reportName.replace(/\s+/g, "-")}-${new Date().toISOString().split("T")[0]}.pdf`,
      );
      toast.success("PDF downloaded");
    } catch (e: any) {
      console.error("[PDF export]", e);
      toast.error("Failed to generate PDF");
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
  const cardSections = config.sections.filter((s) =>
    cardMetrics.includes(s.metric),
  );
  const otherSections = config.sections.filter(
    (s) => !cardMetrics.includes(s.metric),
  );

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
            <ReportSection key={s.id} metric={s.metric} data={data} />
          ))}
        </div>
      )}
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
