"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
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
  BarChart3,
  Target,
  FileText,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ArrowUpRight,
  Activity,
  TrendingUp,
  TrendingDown,
  Minus,
  Zap,
  Play,
  Plus,
  AlertCircle,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import {
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface DashboardMetrics {
  test_cases: {
    total: number;
    passed: number;
    failed: number;
    blocked: number;
    skipped: number;
    not_run: number;
    pass_rate: number;
    trend?: "up" | "down" | "stable";
    trend_value?: number;
  };
  requirements: {
    total: number;
    tested: number;
    coverage_percentage: number;
    by_priority: Record<string, number>;
    trend?: "up" | "down" | "stable";
  };
  recent_activity: Array<{
    id: string;
    type: "execution" | "suite_started" | "requirement_linked";
    description: string;
    timestamp: string;
    status?: string;
  }>;
  automation_runs?: {
    total: number;
    pass_rate: number;
    last_run?: string;
  };
  execution_timeline?: Array<{
    date: string;
    passed: number;
    failed: number;
    total: number;
  }>;
  flaky_tests?: Array<{
    id: string;
    title: string;
    flakiness_score: number;
  }>;
  priority_failures?: Array<{
    id: string;
    title: string;
    priority: string;
    failed_count: number;
  }>;
}

const PIE_COLORS = ["#10b981", "#ef4444", "#f59e0b", "#9ca3af"];

export function TestManagementDashboard() {
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    test_cases: {
      total: 0,
      passed: 0,
      failed: 0,
      blocked: 0,
      skipped: 0,
      not_run: 0,
      pass_rate: 0,
    },
    requirements: {
      total: 0,
      tested: 0,
      coverage_percentage: 0,
      by_priority: {},
    },
    recent_activity: [],
    automation_runs: { total: 0, pass_rate: 0 },
    execution_timeline: [],
    flaky_tests: [],
    priority_failures: [],
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        const res = await fetch("/api/dashboard/metrics", {
          cache: "no-store",
          credentials: "include",
        });

        if (res.status === 401) {
          if (!cancelled) setMetrics((m) => ({ ...m, recent_activity: [] }));
          return;
        }

        if (!res.ok) {
          const msg = await res.text().catch(() => "");
          throw new Error(`Dashboard metrics failed (${res.status}): ${msg}`);
        }

        const data = (await res.json()) as DashboardMetrics;
        if (!cancelled) setMetrics(data);
      } catch (e) {
        console.error(e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const pieChartData = useMemo(() => {
    return [
      { name: "Passed", value: metrics.test_cases.passed },
      { name: "Failed", value: metrics.test_cases.failed },
      { name: "Blocked", value: metrics.test_cases.blocked },
      { name: "Not Run", value: metrics.test_cases.not_run },
    ].filter((item) => item.value > 0);
  }, [metrics.test_cases]);

  // Split recent activity into manual and automation
  const manualActivity = useMemo(
    () =>
      metrics.recent_activity.filter((a) => a.type === "execution").slice(0, 5),
    [metrics.recent_activity],
  );

  const automationActivity = useMemo(
    () =>
      metrics.recent_activity
        .filter((a) => a.type === "suite_started")
        .slice(0, 5),
    [metrics.recent_activity],
  );

  function getTrendIcon(trend?: "up" | "down" | "stable") {
    if (trend === "up")
      return <TrendingUp className="h-4 w-4 text-green-600" />;
    if (trend === "down")
      return <TrendingDown className="h-4 w-4 text-red-600" />;
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  }

  function getPassRateColor(rate: number) {
    if (rate >= 80) return "text-green-600";
    if (rate >= 60) return "text-yellow-600";
    return "text-red-600";
  }

  function getRelativeTime(dateString: string) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  }

  function getPriorityBadgeClass(priority: string) {
    switch (priority) {
      case "critical":
        return "bg-red-500/10 text-red-700 border-red-200";
      case "high":
        return "bg-orange-500/10 text-orange-700 border-orange-200";
      case "medium":
        return "bg-yellow-500/10 text-yellow-700 border-yellow-200";
      case "low":
        return "bg-blue-500/10 text-blue-700 border-blue-200";
      default:
        return "bg-gray-500/10 text-gray-700 border-gray-200";
    }
  }

  function getActivityIcon(activity: DashboardMetrics["recent_activity"][0]) {
    if (activity.status === "passed")
      return <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />;
    if (activity.status === "failed")
      return <XCircle className="h-4 w-4 text-red-600 flex-shrink-0" />;
    if (activity.status === "blocked")
      return (
        <AlertTriangle className="h-4 w-4 text-orange-600 flex-shrink-0" />
      );
    return <Activity className="h-4 w-4 text-blue-600 flex-shrink-0" />;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const hasData = metrics.test_cases.total > 0;
  const hasPriorityFailures = (metrics.priority_failures?.length ?? 0) > 0;

  return (
    <div className="space-y-8 px-1 md:px-2">
      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Link href="/generate">
          <Button
            variant="outline"
            className="w-full h-auto py-3 flex flex-col items-center gap-1.5 hover:bg-primary hover:text-primary-foreground transition-colors"
          >
            <Sparkles className="h-5 w-5" />
            <span className="text-xs font-medium">Generate Tests</span>
          </Button>
        </Link>
        <Link href="/automation">
          <Button
            variant="outline"
            className="w-full h-auto py-3 flex flex-col items-center gap-1.5 hover:bg-primary hover:text-primary-foreground transition-colors"
          >
            <Zap className="h-5 w-5" />
            <span className="text-xs font-medium">Automation</span>
          </Button>
        </Link>
        <Link href="/test-cases?runStatus=failed">
          <Button
            variant="outline"
            className="w-full h-auto py-3 flex flex-col items-center gap-1.5 hover:bg-destructive hover:text-destructive-foreground transition-colors"
          >
            <XCircle className="h-5 w-5" />
            <span className="text-xs font-medium">View Failures</span>
          </Button>
        </Link>
        <Link href="/test-cases">
          <Button
            variant="outline"
            className="w-full h-auto py-3 flex flex-col items-center gap-1.5 hover:bg-primary hover:text-primary-foreground transition-colors"
          >
            <Play className="h-5 w-5" />
            <span className="text-xs font-medium">Run Tests</span>
          </Button>
        </Link>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Test Cases */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Tests</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{metrics.test_cases.total}</div>
            <p className="text-xs text-muted-foreground mt-2">
              {metrics.test_cases.not_run} not yet executed
            </p>
          </CardContent>
        </Card>

        {/* Pass Rate */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pass Rate</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div
              className={`text-3xl font-bold ${getPassRateColor(metrics.test_cases.pass_rate)}`}
            >
              {metrics.test_cases.pass_rate}%
            </div>
            <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden mt-3">
              <div
                className="bg-green-500 h-2 transition-all duration-500"
                style={{ width: `${metrics.test_cases.pass_rate}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {metrics.test_cases.passed} of {metrics.test_cases.total} passed
            </p>
          </CardContent>
        </Card>

        {/* Requirements Coverage */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Coverage</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {metrics.requirements.coverage_percentage}%
            </div>
            <div className="flex items-center gap-2 mt-3">
              {getTrendIcon(metrics.requirements.trend)}
              <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
                <div
                  className="bg-blue-500 h-2 transition-all duration-500"
                  style={{
                    width: `${metrics.requirements.coverage_percentage}%`,
                  }}
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {metrics.requirements.tested} of {metrics.requirements.total}{" "}
              requirements
            </p>
          </CardContent>
        </Card>

        {/* Failed Tests */}
        <Card className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 border border-red-200 dark:border-red-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Failed Tests</CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">
              {metrics.test_cases.failed}
            </div>
            <Link href="/test-cases?runStatus=failed">
              <Button
                variant="link"
                className="h-auto p-0 text-xs mt-2 text-red-600 hover:text-red-700"
              >
                View failures
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Automation Runs */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Automation Runs
            </CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {metrics.automation_runs?.total ?? 0}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {metrics.automation_runs?.pass_rate ?? 0}% pass rate
            </p>
            {metrics.automation_runs?.last_run && (
              <p className="text-xs text-muted-foreground">
                Last: {getRelativeTime(metrics.automation_runs.last_run)}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Execution Timeline - full width */}
      {hasData && (
        <Card>
          <CardHeader>
            <CardTitle>Execution Trend</CardTitle>
            <CardDescription>
              Daily test results over the last 7 days
            </CardDescription>
          </CardHeader>
          <CardContent>
            {metrics.execution_timeline &&
            metrics.execution_timeline.length > 0 ? (
              <ResponsiveContainer width="100%" height={360}>
                <LineChart data={metrics.execution_timeline}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis
                    dataKey="date"
                    style={{ fontSize: "12px" }}
                    tickFormatter={(value) => {
                      const date = new Date(value);
                      return `${date.getMonth() + 1}/${date.getDate()}`;
                    }}
                  />
                  <YAxis style={{ fontSize: "12px" }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "rgba(255, 255, 255, 0.95)",
                      border: "1px solid #e5e7eb",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="passed"
                    stroke="#10b981"
                    strokeWidth={2}
                    dot={{ fill: "#10b981", r: 4 }}
                    name="Passed"
                  />
                  <Line
                    type="monotone"
                    dataKey="failed"
                    stroke="#ef4444"
                    strokeWidth={2}
                    dot={{ fill: "#ef4444", r: 4 }}
                    name="Failed"
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[360px] flex items-center justify-center text-muted-foreground">
                <div className="text-center space-y-2">
                  <Activity className="h-8 w-8 mx-auto opacity-50" />
                  <p className="text-sm">No execution data yet</p>
                  <Link href="/test-cases">
                    <Button variant="outline" size="sm">
                      <Play className="h-4 w-4 mr-2" />
                      Run Tests
                    </Button>
                  </Link>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Status Distribution - full width */}
      {hasData && (
        <Card>
          <CardHeader>
            <CardTitle>Test Status Distribution</CardTitle>
            <CardDescription>Breakdown of current test states</CardDescription>
          </CardHeader>
          <CardContent>
            {pieChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={360}>
                <PieChart>
                  <Pie
                    data={pieChartData}
                    cx="50%"
                    cy="50%"
                    labelLine={true}
                    label={({ name, percent }) =>
                      `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
                    }
                    outerRadius={140}
                    dataKey="value"
                  >
                    {pieChartData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={PIE_COLORS[index % PIE_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[360px] flex items-center justify-center text-muted-foreground">
                <div className="text-center space-y-2">
                  <Target className="h-8 w-8 mx-auto opacity-50" />
                  <p className="text-sm">No test data available</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Priority Failures — only render when there's data */}
      {hasPriorityFailures && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-red-600" />
                Priority Failures
              </CardTitle>
              <CardDescription>
                High-priority tests that need attention
              </CardDescription>
            </div>
            <Link href="/test-cases?status=failed&priority=critical,high">
              <Button variant="ghost" size="sm">
                View All <ArrowUpRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {metrics.priority_failures!.slice(0, 5).map((test) => (
                <Link
                  key={test.id}
                  href={`/test-cases/${test.id}`}
                  className="block"
                >
                  <div className="flex items-start gap-3 p-3 border rounded-lg hover:bg-accent transition-colors">
                    <XCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {test.title}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge
                          variant="outline"
                          className={`text-xs ${getPriorityBadgeClass(test.priority)}`}
                        >
                          {test.priority}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          Failed {test.failed_count}x
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Activity — split into two columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Manual Executions */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Manual Executions
            </CardTitle>
            <CardDescription>Recent manual test runs</CardDescription>
          </CardHeader>
          <CardContent>
            {manualActivity.length === 0 ? (
              <div className="text-center py-8 space-y-3">
                <Activity className="h-8 w-8 mx-auto text-muted-foreground opacity-50" />
                <p className="text-sm text-muted-foreground">
                  No manual executions yet
                </p>
                <Link href="/test-cases">
                  <Button variant="outline" size="sm">
                    <Play className="h-4 w-4 mr-2" />
                    Run Tests
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {manualActivity.map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-start gap-3 p-3 border rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    {getActivityIcon(activity)}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate">{activity.description}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {getRelativeTime(activity.timestamp)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Automation Runs Activity */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Automation Activity
            </CardTitle>
            <CardDescription>Recent automated test runs</CardDescription>
          </CardHeader>
          <CardContent>
            {automationActivity.length === 0 ? (
              <div className="text-center py-8 space-y-3">
                <Zap className="h-8 w-8 mx-auto text-muted-foreground opacity-50" />
                <p className="text-sm text-muted-foreground">
                  No automation runs yet
                </p>
                <Link href="/automation">
                  <Button variant="outline" size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Automation{" "}
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {automationActivity.map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-start gap-3 p-3 border rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    {getActivityIcon(activity)}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate">{activity.description}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {getRelativeTime(activity.timestamp)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="h-2" />
    </div>
  );
}
