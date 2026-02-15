"use client";

import React, { useEffect, useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth/auth-context";
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
  Download,
  Clock,
  Calendar,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  PlayCircle,
  Monitor,
  GitBranch,
  Activity,
  TrendingUp,
  TrendingDown,
  MinusCircle,
  FileText,
  AlertCircle,
  ChevronDown,
} from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { useRouter } from "next/navigation";

// Unified automation run type
type AutomationRun = {
  id: string;
  suite_id: string;
  run_number: number;
  status: "passed" | "failed";
  framework:
    | "playwright"
    | "selenium"
    | "cypress"
    | "puppeteer"
    | "testcafe"
    | "webdriverio";
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
};

// Individual test execution within a run
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
  test_cases: {
    title: string;
    description: string | null;
  } | null;
};

interface AutomationHistoryProps {
  suiteId: string;
}

export function AutomationHistory({ suiteId }: AutomationHistoryProps) {
  const [runs, setRuns] = useState<AutomationRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [frameworkFilter, setFrameworkFilter] = useState<string>("all");

  // Detail view
  const [selectedRun, setSelectedRun] = useState<AutomationRun | null>(null);
  const [selectedRunExecutions, setSelectedRunExecutions] = useState<
    TestExecution[]
  >([]);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);

  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user) {
      void loadRuns();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [suiteId, dateFilter, statusFilter, frameworkFilter, user]);

  async function loadRuns() {
    if (!user) return;
    try {
      setLoading(true);
      const supabase = createClient();

      let query = supabase
        .from("automation_runs")
        .select("*")
        .eq("suite_id", suiteId)
        .order("started_at", { ascending: false })
        .limit(200);

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      if (frameworkFilter !== "all") {
        query = query.eq("framework", frameworkFilter);
      }

      if (dateFilter !== "all") {
        const startDate = computeStartDate(dateFilter);
        if (startDate) {
          query = query.gte("created_at", startDate);
        }
      }

      const { data, error } = await query;

      if (error) throw error;

      setRuns((data as AutomationRun[]) ?? []);
    } catch (err) {
      console.error("Error loading automation runs:", err);
      toast.error("Failed to load automation history");
      setRuns([]);
    } finally {
      setLoading(false);
    }
  }

  function computeStartDate(dateFilterValue: string): string | null {
    const now = new Date();

    if (dateFilterValue === "today") {
      return new Date(now.setHours(0, 0, 0, 0)).toISOString();
    } else if (dateFilterValue === "week") {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return weekAgo.toISOString();
    } else if (dateFilterValue === "month") {
      const monthAgo = new Date();
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      return monthAgo.toISOString();
    }

    return null;
  }

  async function openRunDetails(run: AutomationRun) {
    setSelectedRun(run);
    setDetailsOpen(true);
    setLoadingDetails(true);

    try {
      const supabase = createClient();

      // Load individual test executions for this run
      const { data, error } = await supabase
        .from("test_executions")
        .select(
          `
          *,
          test_cases:test_case_id (title, description)
        `,
        )
        .eq("suite_id", run.suite_id)
        .gte("started_at", run.started_at)
        .lte("completed_at", run.completed_at)
        .eq("framework", run.framework)
        .order("started_at", { ascending: true });

      if (error) throw error;

      setSelectedRunExecutions((data as any[]) ?? []);
    } catch (err) {
      console.error("Error loading run details:", err);
      toast.error("Failed to load test details");
      setSelectedRunExecutions([]);
    } finally {
      setLoadingDetails(false);
    }
  }

  function getStatusBadge(status: string) {
    switch (status) {
      case "passed":
        return (
          <Badge className="bg-green-600 gap-1">
            <CheckCircle2 className="h-3 w-3" />
            Passed
          </Badge>
        );
      case "failed":
        return (
          <Badge variant="destructive" className="gap-1">
            <XCircle className="h-3 w-3" />
            Failed
          </Badge>
        );
      case "skipped":
        return (
          <Badge className="bg-slate-600 gap-1">
            <MinusCircle className="h-3 w-3" />
            Skipped
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary" className="gap-1">
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
      <Badge className={`${colors[framework] || "bg-gray-700"} text-white`}>
        {framework}
      </Badge>
    );
  }

  function formatDuration(ms: number | null) {
    if (!ms) return "-";
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  }

  function calculatePassRate(run: AutomationRun) {
    if (run.total_tests === 0) return 0;
    return Math.round((run.passed_tests / run.total_tests) * 100);
  }

  // Calculate stats
  const stats = useMemo(() => {
    const total = runs.length;
    const passed = runs.filter((r) => r.status === "passed").length;
    const failed = runs.filter((r) => r.status === "failed").length;
    const avgDuration =
      runs.length > 0
        ? Math.round(
            runs.reduce((sum, r) => sum + (r.duration_ms || 0), 0) /
              runs.length,
          )
        : 0;

    // Calculate trend (compare last 5 vs previous 5)
    const recent = runs.slice(0, 5);
    const previous = runs.slice(5, 10);

    const recentPassRate =
      recent.length > 0
        ? recent.filter((r) => r.status === "passed").length / recent.length
        : 0;
    const previousPassRate =
      previous.length > 0
        ? previous.filter((r) => r.status === "passed").length / previous.length
        : 0;

    const trend = recentPassRate - previousPassRate;

    return { total, passed, failed, avgDuration, trend };
  }, [runs]);

  return (
    <div className="space-y-6">
      {/* Automation Runs Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <CardTitle>Automation Test Runs</CardTitle>

          <div className="flex items-center gap-3">
            <Select value={frameworkFilter} onValueChange={setFrameworkFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Framework" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All frameworks</SelectItem>
                <SelectItem value="playwright">Playwright</SelectItem>
                <SelectItem value="selenium">Selenium</SelectItem>
                <SelectItem value="cypress">Cypress</SelectItem>
                <SelectItem value="puppeteer">Puppeteer</SelectItem>
                <SelectItem value="testcafe">TestCafe</SelectItem>
                <SelectItem value="webdriverio">WebdriverIO</SelectItem>
              </SelectContent>
            </Select>

            <Select value="dateFilter" onValueChange={setDateFilter}>
              <SelectTrigger className="w-[160px]">
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
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All status</SelectItem>
                <SelectItem value="passed">Passed</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" size="sm" onClick={() => void loadRuns()}>
              Refresh
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span className="ml-3 text-muted-foreground">
                Loading test runs...
              </span>
            </div>
          ) : runs.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <PlayCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="font-medium">No automation test runs yet</p>
              <p className="text-sm mt-2">
                Export your suite and run tests to see results here
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Run #</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Framework</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Results</TableHead>
                  <TableHead>Pass Rate</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Environment</TableHead>
                  <TableHead>Browser</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {runs.map((run) => {
                  const passRate = calculatePassRate(run);

                  return (
                    <TableRow key={run.id}>
                      <TableCell className="font-mono text-sm">
                        #{run.run_number}
                      </TableCell>

                      <TableCell className="text-sm">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <div>
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

                      <TableCell>{getFrameworkBadge(run.framework)}</TableCell>

                      <TableCell>{getStatusBadge(run.status)}</TableCell>

                      <TableCell className="text-sm">
                        <div className="flex items-center gap-2">
                          <span className="text-green-600 font-medium">
                            {run.passed_tests}
                          </span>
                          <span className="text-muted-foreground">/</span>
                          <span className="text-red-600 font-medium">
                            {run.failed_tests}
                          </span>
                          <span className="text-muted-foreground">/</span>
                          <span className="text-slate-600 font-medium">
                            {run.skipped_tests}
                          </span>
                          <span className="text-muted-foreground">/</span>
                          <span className="text-muted-foreground">
                            {run.total_tests}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          P / F / S / Total
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className={`h-full ${
                                passRate === 100
                                  ? "bg-green-600"
                                  : passRate >= 80
                                    ? "bg-yellow-600"
                                    : "bg-red-600"
                              }`}
                              style={{ width: `${passRate}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium">
                            {passRate}%
                          </span>
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="flex items-center gap-2 text-sm">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          {formatDuration(run.duration_ms)}
                        </div>
                      </TableCell>

                      <TableCell>
                        <Badge variant="outline">{run.environment}</Badge>
                        {run.ci_provider && (
                          <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                            <GitBranch className="h-3 w-3" />
                            {run.ci_provider}
                          </div>
                        )}
                      </TableCell>

                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <Monitor className="h-4 w-4 text-muted-foreground" />
                          {run.browser}
                        </div>
                      </TableCell>

                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => void openRunDetails(run)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      <div className="h-4" />

      {/* Run Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent
          className="w-[95vw] sm:max-w-4xl lg:max-w-5xl max-h-[90vh] flex flex-col p-0"
          onInteractOutside={(e) => e.preventDefault()}
        >
          {" "}
          <DialogHeader className="sticky top-0 z-10 bg-background p-6 border-b">
            <div className="flex items-start justify-between">
              <div className="space-y-2 min-w-0">
                <DialogTitle className="text-2xl flex items-center gap-3">
                  Test Run #{selectedRun?.run_number}
                  {selectedRun && getStatusBadge(selectedRun.status)}
                  {selectedRun && getFrameworkBadge(selectedRun.framework)}
                </DialogTitle>
                {selectedRun && (
                  <DialogDescription className="flex items-center gap-4 text-base">
                    <span className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      {new Date(selectedRun.started_at).toLocaleString()}
                    </span>
                    <span className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      {formatDuration(selectedRun.duration_ms)}
                    </span>
                  </DialogDescription>
                )}
              </div>
            </div>
          </DialogHeader>
          {selectedRun && (
            <div className="flex-1 overflow-y-auto space-y-6 px-6 py-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-4 gap-4">
                <Card className="border-green-200 bg-green-50 dark:bg-green-950/20">
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-green-600">
                        {selectedRun.passed_tests}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        Passed
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-red-200 bg-red-50 dark:bg-red-950/20">
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-red-600">
                        {selectedRun.failed_tests}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        Failed
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-slate-200 bg-slate-50 dark:bg-slate-950/20">
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-slate-600">
                        {selectedRun.skipped_tests}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        Skipped
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950/20">
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-blue-600">
                        {calculatePassRate(selectedRun)}%
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        Pass Rate
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Execution Info */}
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
                      <div>{getFrameworkBadge(selectedRun.framework)}</div>
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
                      <p className="text-muted-foreground text-xs">
                        Operating System
                      </p>
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
                      <>
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

                        {selectedRun.branch && (
                          <div className="space-y-1">
                            <p className="text-muted-foreground text-xs">
                              Branch
                            </p>
                            <span className="font-mono text-xs font-medium">
                              {selectedRun.branch}
                            </span>
                          </div>
                        )}

                        {selectedRun.commit_sha && (
                          <div className="space-y-1">
                            <p className="text-muted-foreground text-xs">
                              Commit
                            </p>
                            <span className="font-mono text-xs font-medium">
                              {selectedRun.commit_sha.substring(0, 8)}
                            </span>
                          </div>
                        )}
                      </>
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

              {/* Test Results */}
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
                      <div className="text-center space-y-3">
                        <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">
                          Loading test details...
                        </p>
                      </div>
                    </div>
                  ) : selectedRunExecutions.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground space-y-3">
                      <FileText className="h-12 w-12 mx-auto opacity-50" />
                      <div>
                        <p className="font-medium">
                          No individual test execution details available
                        </p>
                        <p className="text-sm mt-1">
                          This may be because test cases weren't linked to the
                          suite.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {selectedRunExecutions.map((exec, index) => (
                        <div
                          key={exec.id}
                          className="group relative flex items-start gap-4 p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                        >
                          {/* Test Number */}
                          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-mono font-semibold">
                            {index + 1}
                          </div>

                          {/* Test Info */}
                          <div className="flex-1 min-w-0 space-y-2">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <h4 className="font-semibold text-sm truncate">
                                  {exec.test_cases?.title || "Untitled Test"}
                                </h4>
                                {exec.test_cases?.description && (
                                  <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                                    {exec.test_cases.description}
                                  </p>
                                )}
                              </div>

                              <div className="flex items-center gap-3 flex-shrink-0">
                                <div className="text-xs text-muted-foreground">
                                  {exec.duration_minutes
                                    ? `${exec.duration_minutes.toFixed(2)}m`
                                    : "-"}
                                </div>
                                {getStatusBadge(exec.execution_status)}
                              </div>
                            </div>

                            {/* Failure Details */}
                            {exec.failure_reason && (
                              <div className="bg-destructive/10 border border-destructive/20 rounded-md p-3 space-y-2">
                                <div className="flex items-start gap-2">
                                  <AlertCircle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs font-medium text-destructive">
                                      Failure Reason:
                                    </p>
                                    <p className="text-xs text-destructive/90 mt-1">
                                      {exec.failure_reason}
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
                                      {exec.stack_trace}
                                    </pre>
                                  </details>
                                )}
                              </div>
                            )}

                            {/* Execution Notes */}
                            {exec.execution_notes &&
                              exec.execution_status === "passed" && (
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                  <CheckCircle2 className="h-3 w-3" />
                                  {exec.execution_notes}
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
