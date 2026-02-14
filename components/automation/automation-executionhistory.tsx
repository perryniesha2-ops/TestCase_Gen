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
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between pr-8">
              <span>Test Run #{selectedRun?.run_number} Details</span>
              {selectedRun && getStatusBadge(selectedRun.status)}
            </DialogTitle>
            {selectedRun && (
              <DialogDescription>
                {getFrameworkBadge(selectedRun.framework)} •{" "}
                {new Date(selectedRun.started_at).toLocaleString()} •{" "}
                {formatDuration(selectedRun.duration_ms)}
              </DialogDescription>
            )}
          </DialogHeader>

          {selectedRun && (
            <div className="space-y-4">
              {/* Run Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    Execution Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Framework:</span>
                    <div className="mt-1">
                      {getFrameworkBadge(selectedRun.framework)}
                    </div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Status:</span>
                    <div className="mt-1">
                      {getStatusBadge(selectedRun.status)}
                    </div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Duration:</span>
                    <div className="font-medium mt-1">
                      {formatDuration(selectedRun.duration_ms)}
                    </div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Environment:</span>
                    <div className="font-medium mt-1">
                      {selectedRun.environment}
                    </div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Browser:</span>
                    <div className="font-medium mt-1">
                      {selectedRun.browser}
                    </div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">OS:</span>
                    <div className="font-medium mt-1">
                      {selectedRun.os_version || "-"}
                    </div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Triggered By:</span>
                    <div className="font-medium mt-1">
                      {selectedRun.triggered_by}
                    </div>
                  </div>
                  {selectedRun.framework_version && (
                    <div>
                      <span className="text-muted-foreground">
                        Framework Version:
                      </span>
                      <div className="font-medium mt-1">
                        {selectedRun.framework_version}
                      </div>
                    </div>
                  )}
                  {selectedRun.ci_provider && (
                    <>
                      <div>
                        <span className="text-muted-foreground">
                          CI Provider:
                        </span>
                        <div className="font-medium mt-1">
                          {selectedRun.ci_provider}
                        </div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Branch:</span>
                        <div className="font-medium mt-1">
                          {selectedRun.branch || "-"}
                        </div>
                      </div>
                    </>
                  )}
                  {selectedRun.commit_sha && (
                    <div>
                      <span className="text-muted-foreground">Commit:</span>
                      <div className="font-mono text-xs mt-1">
                        {selectedRun.commit_sha.substring(0, 8)}
                      </div>
                    </div>
                  )}
                  {selectedRun.commit_message && (
                    <div className="col-span-2">
                      <span className="text-muted-foreground">
                        Commit Message:
                      </span>
                      <div className="text-sm mt-1 line-clamp-2">
                        {selectedRun.commit_message}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Test Results */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    Test Results ({selectedRun.total_tests})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {loadingDetails ? (
                    <div className="flex items-center justify-center py-10">
                      <Loader2 className="h-6 w-6 animate-spin" />
                      <span className="ml-3 text-muted-foreground">
                        Loading test details...
                      </span>
                    </div>
                  ) : selectedRunExecutions.length === 0 ? (
                    <div className="text-center py-10 text-muted-foreground">
                      <p className="text-sm">
                        No individual test execution details available
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {selectedRunExecutions.map((exec) => (
                        <div
                          key={exec.id}
                          className="flex items-center justify-between p-3 rounded-lg border"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm truncate">
                              {exec.test_cases?.title || "Untitled Test"}
                            </div>
                            {exec.failure_reason && (
                              <div className="text-xs text-destructive mt-1 line-clamp-2">
                                {exec.failure_reason}
                              </div>
                            )}
                            {exec.stack_trace && (
                              <details className="mt-2">
                                <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                                  View stack trace
                                </summary>
                                <pre className="text-xs bg-muted p-2 rounded mt-1 overflow-x-auto">
                                  {exec.stack_trace}
                                </pre>
                              </details>
                            )}
                          </div>
                          <div className="flex items-center gap-3 ml-4">
                            <div className="text-sm text-muted-foreground">
                              {exec.duration_minutes
                                ? `${exec.duration_minutes.toFixed(2)}m`
                                : "-"}
                            </div>
                            {getStatusBadge(exec.execution_status)}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailsOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
