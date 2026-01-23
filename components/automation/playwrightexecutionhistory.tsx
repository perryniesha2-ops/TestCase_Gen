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

// Matches your existing test_executions schema
type TestExecution = {
  id: string;
  test_case_id: string;
  suite_id: string;
  executed_by: string | null; // null for automated tests
  execution_status: "passed" | "failed" | "blocked" | "skipped";
  started_at: string | null;
  completed_at: string | null;
  duration_minutes: number | null;
  execution_notes: string | null;
  failure_reason: string | null;
  browser: string | null;
  os_version: string | null;
  test_environment: string | null;
  created_at: string;
  session_id: string | null;

  // Playwright-specific fields (new)
  execution_type: "manual" | "automated";
  ci_provider: string | null;
  branch: string | null;
  commit_sha: string | null;
  playwright_version: string | null;
  total_tests: number;
  passed_tests: number;
  failed_tests: number;
  skipped_tests: number;
  report_url: string | null;

  // Joined data
  test_cases: {
    title: string;
    description: string | null;
  } | null;
};

// Grouped run (multiple executions with same session_id or timestamp)
type PlaywrightRun = {
  run_id: string; // session_id or created_at timestamp
  started_at: string;
  completed_at: string | null;
  status: "passed" | "failed" | "mixed";
  total_tests: number;
  passed_tests: number;
  failed_tests: number;
  skipped_tests: number;
  duration_ms: number | null;
  environment: string | null;
  browser: string | null;
  ci_provider: string | null;
  branch: string | null;
  commit_sha: string | null;
  playwright_version: string | null;
  report_url: string | null;
  executions: TestExecution[];
};

interface PlaywrightExecutionHistoryProps {
  suiteId: string;
}

export function PlaywrightExecutionHistory({
  suiteId,
}: PlaywrightExecutionHistoryProps) {
  const [executions, setExecutions] = useState<TestExecution[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Detail view
  const [selectedRun, setSelectedRun] = useState<PlaywrightRun | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      void loadExecutions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [suiteId, dateFilter, statusFilter, user]);

  async function loadExecutions() {
    if (!user) return;
    try {
      setLoading(true);
      const supabase = createClient();

      let query = supabase
        .from("test_executions")
        .select(
          `
          *,
          test_cases:test_case_id (title, description)
        `
        )
        .eq("suite_id", suiteId)
        .eq("execution_type", "automated") // Only get automated tests
        .order("started_at", { ascending: false })
        .limit(200);

      if (statusFilter !== "all") {
        query = query.eq("execution_status", statusFilter);
      }

      if (dateFilter !== "all") {
        const startDate = computeStartDate(dateFilter);
        if (startDate) {
          query = query.gte("created_at", startDate);
        }
      }

      const { data, error } = await query;

      if (error) throw error;

      setExecutions((data as any[]) ?? []);
    } catch (err) {
      console.error("Error loading Playwright executions:", err);
      toast.error("Failed to load automation history");
      setExecutions([]);
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

  // Group executions into runs (by session_id or time window)
  const runs = useMemo(() => {
    const grouped = new Map<string, TestExecution[]>();

    executions.forEach((exec) => {
      // Group by session_id if available, otherwise by date+time
      const key = exec.session_id || exec.created_at.slice(0, 16); // Group by minute

      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key)!.push(exec);
    });

    const runList: PlaywrightRun[] = [];

    grouped.forEach((execs, key) => {
      const sortedExecs = execs.sort(
        (a, b) =>
          new Date(a.started_at || a.created_at).getTime() -
          new Date(b.started_at || b.created_at).getTime()
      );

      const firstExec = sortedExecs[0];
      const lastExec = sortedExecs[sortedExecs.length - 1];

      const passed = execs.filter(
        (e) => e.execution_status === "passed"
      ).length;
      const failed = execs.filter(
        (e) => e.execution_status === "failed"
      ).length;
      const skipped = execs.filter(
        (e) => e.execution_status === "skipped"
      ).length;

      const status: "passed" | "failed" | "mixed" =
        failed > 0 ? "failed" : passed === execs.length ? "passed" : "mixed";

      let duration: number | null = null;
      if (firstExec.started_at && lastExec.completed_at) {
        duration =
          new Date(lastExec.completed_at).getTime() -
          new Date(firstExec.started_at).getTime();
      }

      runList.push({
        run_id: key,
        started_at: firstExec.started_at || firstExec.created_at,
        completed_at: lastExec.completed_at,
        status,
        total_tests: execs.length,
        passed_tests: passed,
        failed_tests: failed,
        skipped_tests: skipped,
        duration_ms: duration,
        environment: firstExec.test_environment,
        browser: firstExec.browser,
        ci_provider: firstExec.ci_provider,
        branch: firstExec.branch,
        commit_sha: firstExec.commit_sha,
        playwright_version: firstExec.playwright_version,
        report_url: firstExec.report_url,
        executions: sortedExecs,
      });
    });

    return runList.sort(
      (a, b) =>
        new Date(b.started_at).getTime() - new Date(a.started_at).getTime()
    );
  }, [executions]);

  function openRunDetails(run: PlaywrightRun) {
    setSelectedRun(run);
    setDetailsOpen(true);
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
      case "mixed":
        return (
          <Badge className="bg-yellow-600 gap-1">
            <AlertTriangle className="h-3 w-3" />
            Mixed
          </Badge>
        );
      case "blocked":
        return (
          <Badge className="bg-orange-600 gap-1">
            <AlertTriangle className="h-3 w-3" />
            Blocked
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

  function formatDuration(ms: number | null) {
    if (!ms) return "-";
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  }

  function calculatePassRate(run: PlaywrightRun) {
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
            runs.reduce((sum, r) => sum + (r.duration_ms || 0), 0) / runs.length
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
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold">{stats.total}</div>
                <p className="text-xs text-muted-foreground">Total Runs</p>
              </div>
              <PlayCircle className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-green-600">
                  {stats.passed}
                </div>
                <p className="text-xs text-muted-foreground">Passed</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-red-600">
                  {stats.failed}
                </div>
                <p className="text-xs text-muted-foreground">Failed</p>
              </div>
              <XCircle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold">
                  {formatDuration(stats.avgDuration)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Avg Duration
                  {stats.trend !== 0 && (
                    <span className="ml-2">
                      {stats.trend > 0 ? (
                        <TrendingUp className="h-3 w-3 inline text-green-600" />
                      ) : (
                        <TrendingDown className="h-3 w-3 inline text-red-600" />
                      )}
                    </span>
                  )}
                </p>
              </div>
              <Clock className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Execution History Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <CardTitle>Playwright Test Runs</CardTitle>

          <div className="flex items-center gap-3">
            <Select value={dateFilter} onValueChange={setDateFilter}>
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
                <SelectItem value="skipped">Skipped</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              size="sm"
              onClick={() => void loadExecutions()}
            >
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
              <p className="font-medium">No Playwright test runs yet</p>
              <p className="text-sm mt-2">
                Export your suite and run tests with Playwright to see results
                here
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
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
                    <TableRow key={run.run_id}>
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
                        {run.environment ? (
                          <Badge variant="outline">{run.environment}</Badge>
                        ) : (
                          <span className="text-muted-foreground text-sm">
                            -
                          </span>
                        )}
                        {run.ci_provider && (
                          <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                            <GitBranch className="h-3 w-3" />
                            {run.ci_provider}
                          </div>
                        )}
                      </TableCell>

                      <TableCell>
                        {run.browser ? (
                          <div className="flex items-center gap-1 text-sm">
                            <Monitor className="h-4 w-4 text-muted-foreground" />
                            {run.browser}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">
                            -
                          </span>
                        )}
                      </TableCell>

                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1"
                          onClick={() => openRunDetails(run)}
                        >
                          <Eye className="h-4 w-4" />
                          View
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

      {/* Run Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between pr-8">
              <span>Playwright Test Run Details</span>
              {selectedRun && getStatusBadge(selectedRun.status)}
            </DialogTitle>
            {selectedRun && (
              <DialogDescription>
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
                      {selectedRun.environment || "-"}
                    </div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Browser:</span>
                    <div className="font-medium mt-1">
                      {selectedRun.browser || "-"}
                    </div>
                  </div>
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
                  {selectedRun.playwright_version && (
                    <div>
                      <span className="text-muted-foreground">
                        Playwright Version:
                      </span>
                      <div className="font-medium mt-1">
                        {selectedRun.playwright_version}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Test Results */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    Test Results ({selectedRun.executions.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {selectedRun.executions.map((exec) => (
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
                        </div>
                        <div className="flex items-center gap-3 ml-4">
                          <div className="text-sm text-muted-foreground">
                            {exec.duration_minutes
                              ? `${exec.duration_minutes}m`
                              : "-"}
                          </div>
                          {getStatusBadge(exec.execution_status)}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailsOpen(false)}>
              Close
            </Button>
            {selectedRun?.report_url && (
              <Button asChild>
                <a
                  href={selectedRun.report_url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Download className="h-4 w-4 mr-2" />
                  View Full Report
                </a>
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
