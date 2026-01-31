"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth/auth-context";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart3,
  TrendingUp,
  CheckCircle,
  XCircle,
  Download,
  Activity,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";

interface TestSuite {
  id: string;
  name: string;
  kind: string;
}

interface SuiteExecutionStats {
  suite_id: string;
  suite_name: string;
  suite_type: string;
  execution_count: number;
  total_tests: number;
  avg_pass_rate: number;
  avg_execution_time: number;
  last_execution: string;
  trend: "up" | "down" | "stable";
}

interface TestCasePerformance {
  test_case_id: string;
  test_title: string;
  total_executions: number;
  pass_rate: number;
  avg_execution_time: number;
  last_failure_date?: string;
  failure_frequency: number;
  last_failure_reason?: string;
}

interface ExecutionTrend {
  date: string;
  passed: number;
  failed: number;
  blocked: number;
  skipped: number;
  total: number;
}

interface SuiteReportsProps {
  suiteId?: string;
  showAllSuites?: boolean;
}

export function SuiteReports({
  suiteId,
  showAllSuites = false,
}: SuiteReportsProps) {
  const { user, loading: authLoading } = useAuth();
  const [suiteStats, setSuiteStats] = useState<SuiteExecutionStats[]>([]);
  const [testCasePerformance, setTestCasePerformance] = useState<
    TestCasePerformance[]
  >([]);
  const [executionTrends, setExecutionTrends] = useState<ExecutionTrend[]>([]);
  const [availableSuites, setAvailableSuites] = useState<TestSuite[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState("30"); // days
  const [selectedSuite, setSelectedSuite] = useState<string>("all");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (suiteId) {
      setSelectedSuite(suiteId);
    }
  }, [suiteId]);

  useEffect(() => {
    if (!authLoading && user) {
      fetchReportsData();
    }
  }, [timeRange, selectedSuite, user, authLoading]);

  async function fetchReportsData() {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      // 1) Get suites and store them
      const suites = await fetchAvailableSuites();

      // 2) Fetch all report data using the fresh suite list
      const supabase = createClient();

      const days = parseInt(timeRange, 10);
      const suiteFilter = selectedSuite !== "all" ? selectedSuite : null;

      const [statsRes, perfRes, trendsRes] = await Promise.all([
        supabase.rpc("get_suite_execution_stats", {
          p_user_id: user.id,
          p_days: days,
          p_suite_id: suiteFilter,
        }),
        supabase.rpc("get_test_case_performance", {
          p_user_id: user.id,
          p_days: days,
          p_suite_id: suiteFilter,
          p_limit: 200,
        }),
        supabase.rpc("get_execution_trends_daily", {
          p_user_id: user.id,
          p_days: days,
          p_suite_id: suiteFilter,
        }),
      ]);

      if (statsRes.error) throw statsRes.error;
      if (perfRes.error) throw perfRes.error;
      if (trendsRes.error) throw trendsRes.error;

      const kindBySuiteId = new Map(suites.map((s) => [s.id, s.kind]));

      setSuiteStats(
        (statsRes.data || []).map((row: any) => ({
          suite_id: row.suite_id,
          suite_name: row.suite_name,
          suite_type:
            kindBySuiteId.get(row.suite_id) === "cross-platform"
              ? "cross-platform"
              : "regular",
          execution_count: row.execution_count,
          total_tests: row.total_tests,
          avg_pass_rate: row.avg_pass_rate,
          avg_execution_time: row.avg_execution_time,
          last_execution: row.last_execution ?? "",
          trend: row.trend as "up" | "down" | "stable",
        })),
      );

      setTestCasePerformance(
        (perfRes.data || []).map((row: any) => ({
          test_case_id: row.test_case_id,
          test_title: row.test_title,
          total_executions: row.total_executions,
          pass_rate: row.pass_rate,
          avg_execution_time: row.avg_execution_time,
          last_failure_date: row.last_failure_date ?? undefined,
          failure_frequency: row.failure_frequency,
          last_failure_reason: row.last_failure_reason ?? undefined,
        })),
      );

      setExecutionTrends(
        (trendsRes.data || []).map((row: any) => ({
          date: row.date,
          passed: row.passed,
          failed: row.failed,
          blocked: row.blocked,
          skipped: row.skipped,
          total: row.total,
        })),
      );
    } catch (error) {
      console.error("Error fetching reports data:", error);
      setError("Failed to load report data");
      toast.error("Failed to load reports");
    } finally {
      setLoading(false);
    }
  }

  async function fetchAvailableSuites(): Promise<TestSuite[]> {
    if (!user) {
      setAvailableSuites([]);
      return [];
    }
    try {
      const supabase = createClient();

      const { data, error } = await supabase
        .from("suites")
        .select("id, name, kind")
        .eq("user_id", user.id)
        .order("name");

      if (error) throw error;

      const suites = data || [];
      setAvailableSuites(suites);
      return suites;
    } catch (error) {
      console.error("Error fetching available suites:", error);
      setAvailableSuites([]);
      return [];
    }
  }

  async function fetchSuiteExecutionStats(suitesFromCaller?: TestSuite[]) {
    if (!user) {
      setSuiteStats([]);
      return;
    }
    try {
      const supabase = createClient();

      let suitesToAnalyze =
        suitesFromCaller && suitesFromCaller.length > 0
          ? suitesFromCaller
          : availableSuites;

      if (selectedSuite !== "all" && selectedSuite) {
        suitesToAnalyze = suitesToAnalyze.filter((s) => s.id === selectedSuite);
      }

      if (suitesToAnalyze.length === 0) {
        setSuiteStats([]);
        return;
      }

      const cutoffDate = new Date(
        Date.now() - parseInt(timeRange) * 24 * 60 * 60 * 1000,
      ).toISOString();

      const stats = await Promise.all(
        suitesToAnalyze.map(async (suite) => {
          const { data: executions, error } = await supabase
            .from("test_executions")
            .select("execution_status, started_at, completed_at, created_at")
            .eq("suite_id", suite.id)
            .gte("created_at", cutoffDate);

          if (error) {
            console.error(
              `Error fetching executions for suite ${suite.id}:`,
              error,
            );
            return null;
          }

          if (!executions || executions.length === 0) {
            return {
              suite_id: suite.id,
              suite_name: suite.name,
              suite_type: suite.kind,
              execution_count: 0,
              total_tests: 0,
              avg_pass_rate: 0,
              avg_execution_time: 0,
              last_execution: "",
              trend: "stable" as const,
            };
          }

          const totalExecutions = executions.length;
          const passedExecutions = executions.filter(
            (e) => e.execution_status === "passed",
          ).length;
          const passRate =
            totalExecutions > 0
              ? (passedExecutions / totalExecutions) * 100
              : 0;

          const completedExecutions = executions.filter(
            (e) => e.started_at && e.completed_at,
          );
          const avgTime =
            completedExecutions.length > 0
              ? completedExecutions.reduce((acc, exec) => {
                  const start = new Date(exec.started_at!).getTime();
                  const end = new Date(exec.completed_at!).getTime();
                  return acc + (end - start);
                }, 0) /
                completedExecutions.length /
                1000 /
                60
              : 0;

          const now = Date.now();
          const oneWeekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
          const twoWeeksAgo = new Date(now - 14 * 24 * 60 * 60 * 1000);

          const recentExecs = executions.filter(
            (e) => new Date(e.created_at) >= oneWeekAgo,
          );
          const recentPass = recentExecs.filter(
            (e) => e.execution_status === "passed",
          ).length;
          const recentTotal = recentExecs.length;

          const previousExecs = executions.filter((e) => {
            const d = new Date(e.created_at);
            return d >= twoWeeksAgo && d < oneWeekAgo;
          });
          const previousPass = previousExecs.filter(
            (e) => e.execution_status === "passed",
          ).length;
          const previousTotal = previousExecs.length;

          let trend: "up" | "down" | "stable" = "stable";
          if (recentTotal > 0 && previousTotal > 0) {
            const recentRate = recentPass / recentTotal;
            const previousRate = previousPass / previousTotal;
            if (recentRate > previousRate + 0.1) trend = "up";
            else if (recentRate < previousRate - 0.1) trend = "down";
          }

          const sortedByDate = [...executions].sort(
            (a, b) =>
              new Date(b.created_at).getTime() -
              new Date(a.created_at).getTime(),
          );

          return {
            suite_id: suite.id,
            suite_name: suite.name,
            suite_type: suite.kind,
            execution_count: totalExecutions,
            total_tests: totalExecutions,
            avg_pass_rate: Math.round(passRate),
            avg_execution_time: Math.round(avgTime * 10) / 10,
            last_execution: sortedByDate[0]?.created_at || "",
            trend,
          };
        }),
      );

      setSuiteStats(stats.filter(Boolean) as SuiteExecutionStats[]);
    } catch (error) {
      console.error("Error fetching suite execution stats:", error);
      throw error;
    }
  }

  async function fetchTestCasePerformance() {
    if (!user) return;

    try {
      const supabase = createClient();

      const cutoffDate = new Date(
        Date.now() - parseInt(timeRange) * 24 * 60 * 60 * 1000,
      ).toISOString();

      let query = supabase
        .from("test_executions")
        .select(
          "test_case_id, platform_test_case_id, execution_status, started_at, completed_at, failure_reason, created_at", // ✅ added platform_test_case_id
        )
        .gte("created_at", cutoffDate);

      if (selectedSuite !== "all" && selectedSuite) {
        query = query.eq("suite_id", selectedSuite);
      }

      const { data: executions, error } = await query;

      if (error) throw error;
      if (!executions || executions.length === 0) {
        setTestCasePerformance([]);
        return;
      }

      // ✅ Separate regular and platform test case IDs
      const regularIds = [
        ...new Set(executions.map((e: any) => e.test_case_id).filter(Boolean)),
      ];
      const platformIds = [
        ...new Set(
          executions.map((e: any) => e.platform_test_case_id).filter(Boolean),
        ),
      ];

      // ✅ Batch fetch both tables
      const titleMap = new Map<string, string>();

      if (regularIds.length > 0) {
        const { data: cases } = await supabase
          .from("test_cases")
          .select("id, title")
          .in("id", regularIds);
        (cases ?? []).forEach((c: any) => titleMap.set(c.id, c.title));
      }

      if (platformIds.length > 0) {
        const { data: cases } = await supabase
          .from("platform_test_cases")
          .select("id, title")
          .in("id", platformIds);
        (cases ?? []).forEach((c: any) => titleMap.set(c.id, c.title));
      }

      // ✅ Group by whichever ID is set
      const testCaseGroups = executions.reduce(
        (acc: Record<string, any[]>, exec: any) => {
          const id = exec.test_case_id || exec.platform_test_case_id;
          if (!id) return acc;
          if (!acc[id]) acc[id] = [];
          acc[id].push(exec);
          return acc;
        },
        {} as Record<string, any[]>,
      );

      const performance = Object.entries(testCaseGroups).map(
        ([testCaseId, execs]) => {
          const totalExecs = execs.length;
          const passedExecs = execs.filter(
            (e) => e.execution_status === "passed",
          ).length;
          const failedExecs = execs.filter(
            (e) => e.execution_status === "failed",
          );

          const passRate =
            totalExecs > 0 ? (passedExecs / totalExecs) * 100 : 0;

          const completedExecs = execs.filter(
            (e) => e.started_at && e.completed_at,
          );
          const avgTime =
            completedExecs.length > 0
              ? completedExecs.reduce((acc, exec) => {
                  const start = new Date(exec.started_at!).getTime();
                  const end = new Date(exec.completed_at!).getTime();
                  return acc + (end - start);
                }, 0) /
                completedExecs.length /
                1000 /
                60
              : 0;

          const sortedFailures = failedExecs.sort(
            (a, b) =>
              new Date(b.created_at).getTime() -
              new Date(a.created_at).getTime(),
          );
          const lastFailure = sortedFailures[0];

          return {
            test_case_id: testCaseId,
            test_title: titleMap.get(testCaseId) || "Unknown Test", // ✅ uses combined map
            total_executions: totalExecs,
            pass_rate: Math.round(passRate),
            avg_execution_time: Math.round(avgTime * 10) / 10,
            last_failure_date: lastFailure?.created_at,
            failure_frequency: Math.round(
              (failedExecs.length / totalExecs) * 100,
            ),
            last_failure_reason: lastFailure?.failure_reason,
          };
        },
      );

      performance.sort((a, b) => b.failure_frequency - a.failure_frequency);
      setTestCasePerformance(performance);
    } catch (error) {
      console.error("Error fetching test case performance:", error);
      throw error;
    }
  }
  async function fetchExecutionTrends() {
    if (!user) return;

    try {
      const supabase = createClient();

      const cutoffDate = new Date(
        Date.now() - parseInt(timeRange) * 24 * 60 * 60 * 1000,
      ).toISOString();

      // Build query
      let query = supabase
        .from("test_executions")
        .select("execution_status, created_at")
        .gte("created_at", cutoffDate);

      if (selectedSuite !== "all" && selectedSuite) {
        query = query.eq("suite_id", selectedSuite);
      }

      const { data: executions, error } = await query;

      if (error) throw error;
      if (!executions || executions.length === 0) {
        setExecutionTrends([]);
        return;
      }

      // Group by date
      const dailyStats = new Map<
        string,
        {
          passed: number;
          failed: number;
          blocked: number;
          skipped: number;
          total: number;
        }
      >();

      executions.forEach((exec) => {
        const date = new Date(exec.created_at).toISOString().split("T")[0];
        if (!dailyStats.has(date)) {
          dailyStats.set(date, {
            passed: 0,
            failed: 0,
            blocked: 0,
            skipped: 0,
            total: 0,
          });
        }
        const stats = dailyStats.get(date)!;
        stats.total++;
        if (exec.execution_status === "passed") stats.passed++;
        else if (exec.execution_status === "failed") stats.failed++;
        else if (exec.execution_status === "blocked") stats.blocked++;
        else if (exec.execution_status === "skipped") stats.skipped++;
      });

      const trends = Array.from(dailyStats.entries())
        .map(([date, stats]) => ({ date, ...stats }))
        .sort((a, b) => a.date.localeCompare(b.date));

      setExecutionTrends(trends);
    } catch (error) {
      console.error("Error fetching execution trends:", error);
      throw error;
    }
  }

  function getTrendIcon(trend: "up" | "down" | "stable") {
    switch (trend) {
      case "up":
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      case "down":
        return <TrendingUp className="h-4 w-4 text-red-600 rotate-180" />;
      default:
        return <Activity className="h-4 w-4 text-gray-600" />;
    }
  }

  function exportReport() {
    try {
      const csvContent = [
        "Suite Name,Total Tests,Pass Rate,Avg Time (min),Last Execution",
        ...suiteStats.map(
          (suite) =>
            `"${suite.suite_name}",${suite.total_tests},${
              suite.avg_pass_rate
            }%,${suite.avg_execution_time},"${
              suite.last_execution
                ? new Date(suite.last_execution).toLocaleString()
                : "Never"
            }"`,
        ),
      ].join("\n");

      const blob = new Blob([csvContent], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `test-suite-report-${
        new Date().toISOString().split("T")[0]
      }.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success("Report exported successfully");
    } catch (error) {
      console.error("Error exporting report:", error);
      toast.error("Failed to export report");
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading reports...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Error Loading Reports</h3>
          <p className="text-muted-foreground mb-4">{error}</p>
          <Button onClick={fetchReportsData}>Try Again</Button>
        </div>
      </div>
    );
  }

  const hasAnyData =
    suiteStats.length > 0 ||
    testCasePerformance.length > 0 ||
    executionTrends.length > 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div></div>
        <div className="flex items-center gap-4">
          {showAllSuites && (
            <Select value={selectedSuite} onValueChange={setSelectedSuite}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All Suites" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Suites</SelectItem>
                {availableSuites.map((suite) => (
                  <SelectItem key={suite.id} value={suite.id}>
                    {suite.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="14">Last 2 weeks</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 3 months</SelectItem>
            </SelectContent>
          </Select>
          <Button
            onClick={exportReport}
            variant="outline"
            disabled={!hasAnyData}
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {!hasAnyData ? (
        <Card>
          <CardContent className="text-center py-12">
            <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Data Available</h3>
            <p className="text-muted-foreground">
              Execute some test cases to see reports and analytics
            </p>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="overview" className="space-y-20">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="performance">Test Performance</TabsTrigger>
            <TabsTrigger value="trends">Trends</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Total Executions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {suiteStats.reduce(
                      (acc, suite) => acc + suite.execution_count,
                      0,
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Across {suiteStats.length} test suite
                    {suiteStats.length !== 1 ? "s" : ""}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Average Pass Rate</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">
                    {suiteStats.length > 0
                      ? Math.round(
                          suiteStats.reduce(
                            (acc, suite) => acc + suite.avg_pass_rate,
                            0,
                          ) / suiteStats.length,
                        )
                      : 0}
                    %
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {timeRange} day average
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">
                    Avg Execution Time
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {suiteStats.length > 0
                      ? (
                          suiteStats.reduce(
                            (acc, suite) => acc + suite.avg_execution_time,
                            0,
                          ) / suiteStats.length
                        ).toFixed(1)
                      : 0}
                    m
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Per test case
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Suite Performance Table */}
            <Card>
              <CardHeader>
                <CardTitle>Suite Performance Overview</CardTitle>
                <CardDescription>
                  Performance metrics for test suites in the selected time
                  period
                </CardDescription>
              </CardHeader>
              <CardContent>
                {suiteStats.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No suite execution data available for the selected period
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Suite Name</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Executions</TableHead>
                        <TableHead>Pass Rate</TableHead>
                        <TableHead>Avg Time</TableHead>
                        <TableHead>Trend</TableHead>
                        <TableHead>Last Run</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {suiteStats.map((suite) => (
                        <TableRow key={suite.suite_id}>
                          <TableCell className="font-medium">
                            {suite.suite_name}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="capitalize">
                              {suite.suite_type}
                            </Badge>
                          </TableCell>
                          <TableCell>{suite.execution_count}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span
                                className={`font-medium ${
                                  suite.avg_pass_rate >= 80
                                    ? "text-green-600"
                                    : suite.avg_pass_rate >= 60
                                      ? "text-yellow-600"
                                      : "text-red-600"
                                }`}
                              >
                                {suite.avg_pass_rate}%
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>{suite.avg_execution_time}m</TableCell>
                          <TableCell>{getTrendIcon(suite.trend)}</TableCell>
                          <TableCell className="text-muted-foreground">
                            {suite.last_execution
                              ? new Date(
                                  suite.last_execution,
                                ).toLocaleDateString()
                              : "Never"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="performance" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Test Case Performance Analysis</CardTitle>
                <CardDescription>
                  Identify problematic test cases and performance bottlenecks
                </CardDescription>
              </CardHeader>
              <CardContent>
                {testCasePerformance.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No test case execution data available for the selected
                    period
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Test Case</TableHead>
                        <TableHead>Executions</TableHead>
                        <TableHead>Pass Rate</TableHead>
                        <TableHead>Failure Rate</TableHead>
                        <TableHead>Avg Time</TableHead>
                        <TableHead>Last Failure</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {testCasePerformance.slice(0, 20).map((test) => (
                        <TableRow key={test.test_case_id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">
                                {test.test_title}
                              </div>
                              {test.last_failure_reason && (
                                <div className="text-xs text-red-600 mt-1 line-clamp-1">
                                  {test.last_failure_reason}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>{test.total_executions}</TableCell>
                          <TableCell>
                            <span
                              className={`font-medium ${
                                test.pass_rate >= 80
                                  ? "text-green-600"
                                  : test.pass_rate >= 60
                                    ? "text-yellow-600"
                                    : "text-red-600"
                              }`}
                            >
                              {test.pass_rate}%
                            </span>
                          </TableCell>
                          <TableCell>
                            <span
                              className={`font-medium ${
                                test.failure_frequency <= 10
                                  ? "text-green-600"
                                  : test.failure_frequency <= 25
                                    ? "text-yellow-600"
                                    : "text-red-600"
                              }`}
                            >
                              {test.failure_frequency}%
                            </span>
                          </TableCell>
                          <TableCell>{test.avg_execution_time}m</TableCell>
                          <TableCell className="text-muted-foreground">
                            {test.last_failure_date
                              ? new Date(
                                  test.last_failure_date,
                                ).toLocaleDateString()
                              : "None"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="trends" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Execution Trends</CardTitle>
                <CardDescription>
                  Daily test execution patterns and quality trends
                </CardDescription>
              </CardHeader>
              <CardContent>
                {executionTrends.length === 0 ? (
                  <div className="text-center py-12">
                    <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">
                      No execution data for the selected period
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {executionTrends.slice(-14).map((trend) => (
                      <div key={trend.date} className="flex items-center gap-4">
                        <div className="w-24 text-sm text-muted-foreground">
                          {new Date(trend.date).toLocaleDateString()}
                        </div>
                        <div className="flex-1 flex items-center gap-2">
                          <div className="w-full bg-gray-200 rounded-full h-6 flex overflow-hidden">
                            {trend.total > 0 && (
                              <>
                                {trend.passed > 0 && (
                                  <div
                                    className="bg-green-500 h-full flex items-center justify-center text-white text-xs font-medium"
                                    style={{
                                      width: `${
                                        (trend.passed / trend.total) * 100
                                      }%`,
                                    }}
                                  >
                                    {trend.passed}
                                  </div>
                                )}
                                {trend.failed > 0 && (
                                  <div
                                    className="bg-red-500 h-full flex items-center justify-center text-white text-xs font-medium"
                                    style={{
                                      width: `${
                                        (trend.failed / trend.total) * 100
                                      }%`,
                                    }}
                                  >
                                    {trend.failed}
                                  </div>
                                )}
                                {trend.blocked > 0 && (
                                  <div
                                    className="bg-orange-500 h-full flex items-center justify-center text-white text-xs font-medium"
                                    style={{
                                      width: `${
                                        (trend.blocked / trend.total) * 100
                                      }%`,
                                    }}
                                  >
                                    {trend.blocked}
                                  </div>
                                )}
                                {trend.skipped > 0 && (
                                  <div
                                    className="bg-gray-500 h-full flex items-center justify-center text-white text-xs font-medium"
                                    style={{
                                      width: `${
                                        (trend.skipped / trend.total) * 100
                                      }%`,
                                    }}
                                  >
                                    {trend.skipped}
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                          <div className="w-16 text-sm text-muted-foreground">
                            {trend.total} test{trend.total !== 1 ? "s" : ""}
                          </div>
                        </div>
                      </div>
                    ))}
                    <div className="flex items-center justify-center gap-6 pt-4 text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-green-500 rounded"></div>
                        <span>Passed</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-red-500 rounded"></div>
                        <span>Failed</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-orange-500 rounded"></div>
                        <span>Blocked</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-gray-500 rounded"></div>
                        <span>Skipped</span>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
