"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Loader2,
  Eye,
  Clock,
  Calendar,
  CheckCircle2,
  XCircle,
  MinusCircle,
  Monitor,
  GitBranch,
  Activity,
  FileText,
  AlertCircle,
  ChevronDown,
  Zap,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  Download,
  FileSpreadsheet,
} from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { ExportAutomationButton } from "@/components/automation/export-automation-button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// ─── Export helpers ───────────────────────────────────────────────────────────

function escapeCSV(value: string | number | null | undefined): string {
  const str = String(value ?? "");
  return str.includes(",") || str.includes('"') || str.includes("\n")
    ? `"${str.replace(/"/g, '""')}"`
    : str;
}

function exportRunsCSV(runs: AutomationRun[]) {
  const headers = [
    "Run #",
    "Suite",
    "Date",
    "Framework",
    "Status",
    "Passed",
    "Failed",
    "Skipped",
    "Total",
    "Pass Rate %",
    "Duration",
    "Environment",
    "Branch",
    "CI Provider",
  ];
  const rows = runs.map((r) => [
    r.run_number,
    r.suite_name ?? "",
    new Date(r.started_at).toLocaleString(),
    r.framework,
    r.status,
    r.passed_tests,
    r.failed_tests,
    r.skipped_tests,
    r.total_tests,
    calcPassRate(r),
    formatDuration(r.duration_ms),
    r.environment,
    r.branch ?? "",
    r.ci_provider ?? "",
  ]);
  const csv = [headers, ...rows]
    .map((row) => row.map(escapeCSV).join(","))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `automation-runs-${new Date().toISOString().split("T")[0]}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

async function exportRunsXLSX(runs: AutomationRun[]) {
  const ExcelJS = await import("exceljs");
  const wb = new ExcelJS.Workbook();
  wb.creator = "Automation Runs Export";
  wb.created = new Date();
  const ws = wb.addWorksheet("Automation Runs");

  ws.columns = [
    { header: "Run #", key: "run_number", width: 10 },
    { header: "Suite", key: "suite", width: 30 },
    { header: "Date", key: "date", width: 22 },
    { header: "Framework", key: "framework", width: 14 },
    { header: "Status", key: "status", width: 10 },
    { header: "Passed", key: "passed", width: 10 },
    { header: "Failed", key: "failed", width: 10 },
    { header: "Skipped", key: "skipped", width: 10 },
    { header: "Total", key: "total", width: 10 },
    { header: "Pass Rate %", key: "pass_rate", width: 12 },
    { header: "Duration", key: "duration", width: 12 },
    { header: "Environment", key: "environment", width: 14 },
    { header: "Branch", key: "branch", width: 20 },
    { header: "CI Provider", key: "ci_provider", width: 14 },
  ];

  const headerRow = ws.getRow(1);
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" }, name: "Arial" };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF4F46E5" },
    };
    cell.alignment = { vertical: "middle", horizontal: "left" };
  });
  headerRow.height = 22;

  runs.forEach((r, i) => {
    const row = ws.addRow({
      run_number: r.run_number,
      suite: r.suite_name ?? "",
      date: new Date(r.started_at).toLocaleString(),
      framework: r.framework,
      status: r.status,
      passed: r.passed_tests,
      failed: r.failed_tests,
      skipped: r.skipped_tests,
      total: r.total_tests,
      pass_rate: calcPassRate(r),
      duration: formatDuration(r.duration_ms),
      environment: r.environment,
      branch: r.branch ?? "",
      ci_provider: r.ci_provider ?? "",
    });
    row.eachCell((cell) => {
      cell.font = { name: "Arial", size: 10 };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: i % 2 === 0 ? "FFFFFFFF" : "FFF8FAFC" },
      };
      cell.alignment = { vertical: "middle" };
    });
    row.height = 18;
  });

  ws.views = [{ state: "frozen", ySplit: 1 }];
  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: 14 } };

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `automation-runs-${new Date().toISOString().split("T")[0]}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

type Suite = {
  id: string;
  name: string;
  automation_framework: string | null;
};

type AutomationRun = {
  id: string;
  suite_id: string;
  run_number: number;
  status: "passed" | "failed";
  framework: string;
  environment: string;
  browser: string;
  os_version: string | null;
  ci_provider: string | null;
  branch: string | null;
  commit_sha: string | null;
  commit_message: string | null;
  triggered_by: string;
  total_tests: number;
  passed_tests: number;
  failed_tests: number;
  skipped_tests: number;
  started_at: string;
  completed_at: string;
  duration_ms: number;
  framework_version: string | null;
  created_at: string;
  suite_name?: string;
};

type TestExecution = {
  id: string;
  test_case_id: string | null;
  execution_status: "passed" | "failed" | "skipped";
  started_at: string;
  completed_at: string;
  duration_minutes: number;
  execution_notes: string | null;
  failure_reason: string | null;
  stack_trace: string | null;
  browser: string;
  os_version: string;
  test_environment: string;
  framework: string;
  framework_version: string | null;
  test_cases: { title: string; description: string | null } | null;
};

const stripAnsi = (str: string) => str.replace(/\u001b\[[0-9;]*m/g, "");

function formatDuration(ms: number | null) {
  if (!ms) return "—";
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  return m > 0 ? `${m}m ${s % 60}s` : `${s}s`;
}

function calcPassRate(run: AutomationRun) {
  return run.total_tests === 0
    ? 0
    : Math.round((run.passed_tests / run.total_tests) * 100);
}

function getStatusBadge(status: string) {
  switch (status) {
    case "passed":
      return (
        <Badge className="bg-green-600 gap-1 text-xs h-5 px-1.5">
          <CheckCircle2 className="h-3 w-3" />
          Passed
        </Badge>
      );
    case "failed":
      return (
        <Badge variant="destructive" className="gap-1 text-xs h-5 px-1.5">
          <XCircle className="h-3 w-3" />
          Failed
        </Badge>
      );
    case "skipped":
      return (
        <Badge className="bg-slate-600 gap-1 text-xs h-5 px-1.5">
          <MinusCircle className="h-3 w-3" />
          Skipped
        </Badge>
      );
    default:
      return (
        <Badge variant="secondary" className="text-xs h-5 px-1.5">
          {status}
        </Badge>
      );
  }
}

function getFrameworkBadge(framework: string) {
  const colors: Record<string, string> = {
    playwright: "bg-green-700",
    selenium: "bg-orange-700",
    cypress: "bg-teal-700",
    puppeteer: "bg-blue-700",
    testcafe: "bg-purple-700",
    webdriverio: "bg-pink-700",
  };
  return (
    <Badge
      className={`${colors[framework] ?? "bg-gray-700"} text-white text-xs h-5 px-1.5`}
    >
      {framework}
    </Badge>
  );
}

export function AutomationHub() {
  const router = useRouter();

  const [suites, setSuites] = useState<Suite[]>([]);
  const [runs, setRuns] = useState<AutomationRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 50;

  const [suiteFilter, setSuiteFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [frameworkFilter, setFrameworkFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");

  const [selectedRun, setSelectedRun] = useState<AutomationRun | null>(null);
  const [runExecutions, setRunExecutions] = useState<TestExecution[]>([]);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);

  useEffect(() => {
    fetch("/api/automation/suites")
      .then((r) => r.json())
      .then((d) => setSuites(d.suites ?? []))
      .catch(console.error);
  }, []);

  const fetchRuns = useCallback(
    async (page = 1) => {
      setLoading(true);
      try {
        const p = new URLSearchParams({
          page: String(page),
          pageSize: String(pageSize),
        });
        if (suiteFilter !== "all") p.set("suiteId", suiteFilter);
        if (statusFilter !== "all") p.set("status", statusFilter);
        if (frameworkFilter !== "all") p.set("framework", frameworkFilter);
        if (dateFilter !== "all") p.set("dateRange", dateFilter);

        const res = await fetch(`/api/automation/runs?${p.toString()}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Failed to load runs");
        setRuns(data.runs ?? []);
        setTotalCount(data.totalCount ?? 0);
        setTotalPages(data.totalPages ?? 1);
      } catch (err: any) {
        toast.error(err?.message ?? "Failed to load automation runs");
        setRuns([]);
      } finally {
        setLoading(false);
      }
    },
    [suiteFilter, statusFilter, frameworkFilter, dateFilter],
  );

  useEffect(() => {
    setCurrentPage(1);
    void fetchRuns(1);
  }, [suiteFilter, statusFilter, frameworkFilter, dateFilter]);
  useEffect(() => {
    void fetchRuns(currentPage);
  }, [currentPage]);

  async function openRunDetails(run: AutomationRun) {
    setSelectedRun(run);
    setDetailsOpen(true);
    setLoadingDetails(true);
    try {
      const res = await fetch(`/api/automation/runs/${run.id}/executions`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load details");
      setRunExecutions(data.executions ?? []);
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to load test details");
      setRunExecutions([]);
    } finally {
      setLoadingDetails(false);
    }
  }

  const stats = useMemo(() => {
    const total = runs.length;
    const passed = runs.filter((r) => r.status === "passed").length;
    const failed = runs.filter((r) => r.status === "failed").length;
    const passRate = total > 0 ? Math.round((passed / total) * 100) : 0;
    const avgDuration =
      total > 0
        ? Math.round(runs.reduce((s, r) => s + (r.duration_ms || 0), 0) / total)
        : 0;
    const frameworks = [...new Set(runs.map((r) => r.framework))];
    return { total, passed, failed, passRate, avgDuration, frameworks };
  }, [runs]);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-slate-200 dark:border-slate-800 hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Runs
            </CardTitle>
            <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800">
              <Activity className="h-4 w-4 text-slate-600 dark:text-slate-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalCount}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.passed} passed · {stats.failed} failed
            </p>
          </CardContent>
        </Card>

        <Card className="border-green-200 dark:border-green-800 hover:shadow-md transition-shadow bg-green-50/50 dark:bg-green-950/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-green-700 dark:text-green-300">
              Pass Rate
            </CardTitle>
            <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900">
              <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-900 dark:text-green-100">
              {stats.passRate}%
            </div>
            <div className="w-full bg-green-200 dark:bg-green-900 rounded-full h-1.5 mt-2 overflow-hidden">
              <div
                className="h-1.5 bg-green-600 transition-all duration-500"
                style={{ width: `${stats.passRate}%` }}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="border-blue-200 dark:border-blue-800 hover:shadow-md transition-shadow bg-blue-50/50 dark:bg-blue-950/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-blue-700 dark:text-blue-300">
              Avg Duration
            </CardTitle>
            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900">
              <Clock className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-900 dark:text-blue-100">
              {formatDuration(stats.avgDuration)}
            </div>
            <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
              per run average
            </p>
          </CardContent>
        </Card>

        <Card className="border-purple-200 dark:border-purple-800 hover:shadow-md transition-shadow bg-purple-50/50 dark:bg-purple-950/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-purple-700 dark:text-purple-300">
              Frameworks
            </CardTitle>
            <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900">
              <Zap className="h-4 w-4 text-purple-600 dark:text-purple-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-900 dark:text-purple-100">
              {stats.frameworks.length}
            </div>
            {stats.frameworks.length > 0 ? (
              <div className="flex flex-wrap gap-1 mt-2">
                {stats.frameworks.map((f) => (
                  <Badge
                    key={f}
                    variant="outline"
                    className="text-[10px] px-1.5 py-0 border-purple-300 dark:border-purple-700 text-purple-700 dark:text-purple-300"
                  >
                    {f}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">
                None yet
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <Select value={suiteFilter} onValueChange={setSuiteFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All suites" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All suites</SelectItem>
            {suites.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={frameworkFilter} onValueChange={setFrameworkFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Framework" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All frameworks</SelectItem>
            <SelectItem value="playwright">Playwright</SelectItem>
            <SelectItem value="selenium">Selenium</SelectItem>
            <SelectItem value="cypress">Cypress</SelectItem>
            <SelectItem value="puppeteer">Puppeteer</SelectItem>
          </SelectContent>
        </Select>
        <Select value={dateFilter} onValueChange={setDateFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Date range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All time</SelectItem>
            <SelectItem value="today">Today</SelectItem>
            <SelectItem value="week">Last 7 days</SelectItem>
            <SelectItem value="month">Last 30 days</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="passed">Passed</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          size="sm"
          onClick={() => void fetchRuns(currentPage)}
        >
          Refresh
        </Button>

        {/* Export current page runs */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              disabled={runs.length === 0}
            >
              <Download className="h-4 w-4" />
              Export
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => exportRunsCSV(runs)}>
              <FileText className="h-4 w-4 mr-2 text-green-600" />
              CSV
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => exportRunsXLSX(runs)}>
              <FileSpreadsheet className="h-4 w-4 mr-2 text-emerald-600" />
              Excel (.xlsx)
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {suiteFilter !== "all" && (
          <ExportAutomationButton
            suiteId={suiteFilter}
            suiteName={
              suites.find((s) => s.id === suiteFilter)?.name ?? "Suite"
            }
            framework={
              suites.find((s) => s.id === suiteFilter)?.automation_framework ??
              "playwright"
            }
          />
        )}
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin mr-3 text-muted-foreground" />
          <span className="text-muted-foreground">Loading runs…</span>
        </div>
      ) : runs.length === 0 ? (
        <div className="border rounded-lg overflow-hidden bg-card">
          <div className="text-center py-16 text-muted-foreground">
            <Zap className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p className="font-medium">No automation runs found</p>
            <p className="text-sm mt-1">
              Export a suite and run your tests to see results here
            </p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => router.push("/test-library")}
            >
              Go to Test Suites
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="border rounded-lg overflow-hidden bg-card">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow className="hover:bg-transparent border-b">
                  {[
                    "Run #",
                    "Suite",
                    "Date",
                    "Framework",
                    "Status",
                    "Results",
                    "Pass Rate",
                    "Duration",
                    "Environment",
                  ].map((h) => (
                    <TableHead
                      key={h}
                      className="font-semibold text-xs uppercase tracking-wide text-muted-foreground"
                    >
                      {h}
                    </TableHead>
                  ))}
                  <TableHead className="w-[80px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {runs.map((run) => {
                  const passRate = calcPassRate(run);
                  return (
                    <TableRow
                      key={run.id}
                      className="group hover:bg-muted/20 transition-colors border-b last:border-0 cursor-pointer"
                      onClick={() => void openRunDetails(run)}
                    >
                      <TableCell className="py-3 font-mono text-sm font-medium">
                        #{run.run_number}
                      </TableCell>

                      <TableCell className="py-3">
                        <button
                          className="text-sm font-medium hover:text-primary transition-colors text-left"
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/automation/suites/${run.suite_id}`);
                          }}
                        >
                          {run.suite_name}
                        </button>
                      </TableCell>

                      <TableCell className="py-3">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <div>
                            <div className="text-sm">
                              {new Date(run.started_at).toLocaleDateString()}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(run.started_at), {
                                addSuffix: true,
                              })}
                            </div>
                          </div>
                        </div>
                      </TableCell>

                      <TableCell className="py-3">
                        {getFrameworkBadge(run.framework)}
                      </TableCell>
                      <TableCell className="py-3">
                        {getStatusBadge(run.status)}
                      </TableCell>

                      <TableCell className="py-3">
                        <div className="flex items-center gap-1 text-xs">
                          <span className="text-green-600 font-medium">
                            {run.passed_tests}
                          </span>
                          <span className="text-muted-foreground">/</span>
                          <span className="text-red-600 font-medium">
                            {run.failed_tests}
                          </span>
                          <span className="text-muted-foreground">/</span>
                          <span className="text-muted-foreground">
                            {run.total_tests}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          P / F / Total
                        </div>
                      </TableCell>

                      <TableCell className="py-3">
                        <div className="flex items-center gap-1.5">
                          <div className="w-12 h-1.5 bg-muted rounded-full overflow-hidden">
                            <div
                              className={`h-full ${passRate === 100 ? "bg-green-600" : passRate >= 80 ? "bg-yellow-500" : "bg-red-500"}`}
                              style={{ width: `${passRate}%` }}
                            />
                          </div>
                          <span className="text-xs font-medium">
                            {passRate}%
                          </span>
                        </div>
                      </TableCell>

                      <TableCell className="py-3">
                        <div className="flex items-center gap-1 text-sm">
                          <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                          {formatDuration(run.duration_ms)}
                        </div>
                      </TableCell>

                      <TableCell className="py-3">
                        <Badge variant="outline" className="text-xs h-5 px-1.5">
                          {run.environment}
                        </Badge>
                        {run.ci_provider && (
                          <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                            <GitBranch className="h-3 w-3" />
                            {run.ci_provider}
                          </div>
                        )}
                      </TableCell>

                      <TableCell
                        className="py-3 pr-3"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 gap-1"
                          onClick={() => void openRunDetails(run)}
                        >
                          <Eye className="h-3.5 w-3.5" /> Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between px-1">
            <p className="text-sm text-muted-foreground">
              Showing{" "}
              <span className="font-medium text-foreground">
                {Math.min((currentPage - 1) * pageSize + 1, totalCount)}
              </span>
              –
              <span className="font-medium text-foreground">
                {Math.min(currentPage * pageSize, totalCount)}
              </span>{" "}
              of{" "}
              <span className="font-medium text-foreground">{totalCount}</span>{" "}
              runs
            </p>
            {totalPages > 1 && (
              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 px-3"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" /> Previous
                </Button>
                <span className="text-sm px-2 text-muted-foreground">
                  {currentPage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 px-3"
                  onClick={() =>
                    setCurrentPage((p) => Math.min(totalPages, p + 1))
                  }
                  disabled={currentPage === totalPages}
                >
                  Next <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Detail Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent
          className="w-[95vw] sm:max-w-4xl lg:max-w-5xl max-h-[90vh] flex flex-col p-0"
          onInteractOutside={(e) => e.preventDefault()}
        >
          <DialogHeader className="sticky top-0 z-10 bg-background p-6 border-b">
            <DialogTitle className="text-2xl flex items-center gap-3">
              Test Run #{selectedRun?.run_number}
              {selectedRun && getStatusBadge(selectedRun.status)}
              {selectedRun && getFrameworkBadge(selectedRun.framework)}
            </DialogTitle>
            {selectedRun && (
              <DialogDescription className="flex items-center gap-4 text-base">
                <span className="font-medium text-foreground">
                  {selectedRun.suite_name}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {new Date(selectedRun.started_at).toLocaleString()}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {formatDuration(selectedRun.duration_ms)}
                </span>
              </DialogDescription>
            )}
          </DialogHeader>

          {selectedRun && (
            <div className="flex-1 overflow-y-auto space-y-6 px-6 py-6">
              <div className="grid grid-cols-4 gap-4">
                {[
                  {
                    label: "Passed",
                    value: selectedRun.passed_tests,
                    color: "green",
                  },
                  {
                    label: "Failed",
                    value: selectedRun.failed_tests,
                    color: "red",
                  },
                  {
                    label: "Skipped",
                    value: selectedRun.skipped_tests,
                    color: "slate",
                  },
                  {
                    label: "Pass Rate",
                    value: `${calcPassRate(selectedRun)}%`,
                    color: "blue",
                  },
                ].map(({ label, value, color }) => (
                  <Card
                    key={label}
                    className={`border-${color}-200 bg-${color}-50 dark:bg-${color}-950/20`}
                  >
                    <CardContent className="pt-6 text-center">
                      <div className={`text-3xl font-bold text-${color}-600`}>
                        {value}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {label}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    Execution Information
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-x-8 gap-y-4 text-sm">
                    <div className="space-y-1">
                      <p className="text-muted-foreground text-xs">Framework</p>
                      {getFrameworkBadge(selectedRun.framework)}
                    </div>
                    <div className="space-y-1">
                      <p className="text-muted-foreground text-xs">
                        Environment
                      </p>
                      <Badge variant="outline">{selectedRun.environment}</Badge>
                    </div>
                    <div className="space-y-1">
                      <p className="text-muted-foreground text-xs">Browser</p>
                      <div className="flex items-center gap-2">
                        <Monitor className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">
                          {selectedRun.browser}
                        </span>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <p className="text-muted-foreground text-xs">OS</p>
                      <span className="font-medium">
                        {selectedRun.os_version || "Unknown"}
                      </span>
                    </div>
                    <div className="space-y-1">
                      <p className="text-muted-foreground text-xs">
                        Triggered By
                      </p>
                      <span className="font-medium capitalize">
                        {selectedRun.triggered_by}
                      </span>
                    </div>
                    {selectedRun.framework_version && (
                      <div className="space-y-1">
                        <p className="text-muted-foreground text-xs">
                          Framework Version
                        </p>
                        <span className="font-mono text-xs font-medium">
                          {selectedRun.framework_version}
                        </span>
                      </div>
                    )}
                    {selectedRun.ci_provider && (
                      <div className="space-y-1">
                        <p className="text-muted-foreground text-xs">
                          CI Provider
                        </p>
                        <div className="flex items-center gap-2">
                          <GitBranch className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">
                            {selectedRun.ci_provider}
                          </span>
                        </div>
                      </div>
                    )}
                    {selectedRun.branch && (
                      <div className="space-y-1">
                        <p className="text-muted-foreground text-xs">Branch</p>
                        <span className="font-mono text-xs font-medium">
                          {selectedRun.branch}
                        </span>
                      </div>
                    )}
                    {selectedRun.commit_sha && (
                      <div className="space-y-1">
                        <p className="text-muted-foreground text-xs">Commit</p>
                        <span className="font-mono text-xs font-medium">
                          {selectedRun.commit_sha.substring(0, 8)}
                        </span>
                      </div>
                    )}
                  </div>
                  {selectedRun.commit_message && (
                    <div className="mt-4 pt-4 border-t">
                      <p className="text-muted-foreground text-xs mb-2">
                        Commit Message
                      </p>
                      <p className="text-sm bg-muted p-3 rounded-md font-mono">
                        {selectedRun.commit_message}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      Individual Test Results ({selectedRun.total_tests})
                    </CardTitle>
                    {loadingDetails && (
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {loadingDetails ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                  ) : runExecutions.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground space-y-2">
                      <FileText className="h-10 w-10 mx-auto opacity-40" />
                      <p className="font-medium">
                        No individual test results available
                      </p>
                      <p className="text-sm">
                        Test cases may not have been linked to the suite
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {runExecutions.map((exec, index) => (
                        <div
                          key={exec.id}
                          className="flex items-start gap-4 p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                        >
                          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-mono font-semibold">
                            {index + 1}
                          </div>
                          <div className="flex-1 min-w-0 space-y-2">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <h4 className="font-semibold text-sm truncate">
                                  {exec.test_cases?.title || "Untitled Test"}
                                </h4>
                                {exec.test_cases?.description && (
                                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                                    {exec.test_cases.description}
                                  </p>
                                )}
                              </div>
                              <div className="flex items-center gap-3 shrink-0">
                                <div className="text-xs text-muted-foreground">
                                  {exec.duration_minutes
                                    ? `${exec.duration_minutes.toFixed(2)}m`
                                    : "—"}
                                </div>
                                {getStatusBadge(exec.execution_status)}
                              </div>
                            </div>
                            {exec.failure_reason && (
                              <div className="bg-destructive/10 border border-destructive/20 rounded-md p-3 space-y-2">
                                <div className="flex items-start gap-2">
                                  <AlertCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs font-medium text-destructive">
                                      Failure Reason:
                                    </p>
                                    <p className="text-xs text-destructive/90 mt-1">
                                      {stripAnsi(exec.failure_reason)}
                                    </p>
                                  </div>
                                </div>
                                {exec.stack_trace && (
                                  <details className="group/details">
                                    <summary className="text-xs text-destructive/80 cursor-pointer hover:text-destructive font-medium flex items-center gap-1">
                                      <span>View stack trace</span>
                                      <ChevronDown className="h-3 w-3 transition-transform group-open/details:rotate-180" />
                                    </summary>
                                    <pre className="text-[10px] bg-destructive/5 p-3 rounded mt-2 overflow-x-auto max-h-32 border border-destructive/10">
                                      {stripAnsi(exec.stack_trace)}
                                    </pre>
                                  </details>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          <DialogFooter className="border-t px-6 py-4">
            <Button variant="outline" onClick={() => setDetailsOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
