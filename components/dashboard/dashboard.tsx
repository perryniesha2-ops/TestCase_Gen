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
  Clock,
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
  HeartPulseIcon,
} from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
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
    trend?: "up" | "down" | "stable"; // New
    trend_value?: number; // New: percentage change
  };
  requirements: {
    total: number;
    tested: number;
    coverage_percentage: number;
    by_priority: Record<string, number>;
    trend?: "up" | "down" | "stable"; // New
  };
  recent_activity: Array<{
    id: string;
    type: "execution" | "suite_started" | "requirement_linked";
    description: string;
    timestamp: string;
    status?: string;
  }>;
  // New fields for enhanced dashboard
  health_score?: number; // 0-100
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
  coverage_gaps?: Array<{
    area: string;
    gap_percentage: number;
  }>;
}

const PRIORITY_ORDER = ["critical", "high", "medium", "low"] as const;

const CHART_COLORS = {
  passed: "#10b981",
  failed: "#ef4444",
  blocked: "#f59e0b",
  skipped: "#6b7280",
  not_run: "#9ca3af",
};

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
    health_score: 0,
    execution_timeline: [],
    flaky_tests: [],
    priority_failures: [],
    coverage_gaps: [],
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

  function getTrendIcon(trend?: "up" | "down" | "stable") {
    if (trend === "up")
      return <TrendingUp className="h-4 w-4 text-green-600" />;
    if (trend === "down")
      return <TrendingDown className="h-4 w-4 text-red-600" />;
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  }

  function getHealthColor(score: number) {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    if (score === 0) return "text-blue-600";

    return "text-red-600";
  }

  function getHealthBgGradient(score: number) {
    if (score === 0) return "from-blue-500/10 to-blue-500/5";

    if (score >= 80) return "from-green-500/10 to-green-500/5";
    if (score >= 60) return "from-yellow-500/10 to-yellow-500/5";
    return "from-red-500/10 to-red-500/5";
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

  return (
    <div className="space-y-8 px-1 md:px-2">
      {/* Health Score Hero Card */}
      {hasData && (
        <Card
          className={`bg-gradient-to-br ${getHealthBgGradient(
            metrics.health_score ?? 0,
          )} border-none shadow-lg`}
        >
          <CardContent className="p-8">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <HeartPulseIcon className="h-5 w-5 text-primary" />
                  <p className="text-sm font-medium text-muted-foreground">
                    Test Suite Health Score
                  </p>
                </div>
                <div className="flex items-end gap-3">
                  <span
                    className={`text-6xl font-bold ${getHealthColor(
                      metrics.health_score ?? 0,
                    )}`}
                  >
                    {metrics.health_score ?? 0}
                  </span>
                  <span className="text-2xl text-muted-foreground mb-2">
                    / 100
                  </span>
                </div>
                <p className="text-sm text-muted-foreground max-w-md">
                  {(() => {
                    const score = metrics.health_score ?? 0;

                    if (score === 0) {
                      return "No tests have been executed yet. Run your tests to see your health score.";
                    }

                    // Normal messages
                    if (score >= 80) {
                      return "Excellent! Your test suite is in great shape.";
                    }
                    if (score >= 60) {
                      return "Good, but there's room for improvement.";
                    }
                    return "Needs attention. Focus on fixing failing tests.";
                  })()}
                </p>
              </div>
              {/* ... rest of the card */}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Test Cases */}
        <Card className="overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Total Test Cases
            </CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{metrics.test_cases.total}</div>
            <div className="flex items-center gap-2 mt-2">
              <p className="text-xs text-muted-foreground">
                {metrics.test_cases.trend_value
                  ? `${metrics.test_cases.trend_value > 0 ? "+" : ""}${metrics.test_cases.trend_value}% from last week`
                  : `${metrics.test_cases.not_run} not executed`}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Pass Rate */}
        <Card className="overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pass Rate</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div
              className={`text-3xl font-bold ${getPassRateColor(
                metrics.test_cases.pass_rate,
              )}`}
            >
              {metrics.test_cases.pass_rate}%
            </div>
            <div className="flex items-center gap-2 mt-2">
              <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
                <div
                  className="bg-green-500 h-2 transition-all duration-500"
                  style={{ width: `${metrics.test_cases.pass_rate}%` }}
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {metrics.test_cases.passed} passed of {metrics.test_cases.total}
            </p>
          </CardContent>
        </Card>

        {/* Coverage */}
        <Card className="overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Requirements Coverage
            </CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {metrics.requirements.coverage_percentage}%
            </div>
            <div className="flex items-center gap-2 mt-2">
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
        <Card className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 p-4 rounded-lg border border-red-200 dark:border-red-800 shadow-sm">
          <CardHeader className="flex flex-row items-left justify-between pb-2">
            <CardTitle className="text-sm font-medium justify-left">
              Failed Tests
            </CardTitle>
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
      </div>

      {/* Charts Row */}
      {hasData && (
        <div className="grid grid-cols-2 lg:grid-cols-7 gap-6">
          {/* Execution Timeline */}
          <Card className="lg:col-span-8">
            <CardHeader>
              <CardTitle>Execution Trend (Last 7 Days)</CardTitle>
              <CardDescription>
                Daily test execution results over time
              </CardDescription>
            </CardHeader>
            <CardContent>
              {metrics.execution_timeline &&
              metrics.execution_timeline.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
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
                <div className="h-[280px] flex items-center justify-center text-muted-foreground">
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

          {/* Status Distribution Pie Chart */}
          <Card className="lg:col-span-8">
            <CardHeader>
              <CardTitle>Test Status Distribution</CardTitle>
              <CardDescription>
                Breakdown of current test states
              </CardDescription>
            </CardHeader>
            <CardContent>
              {pieChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={pieChartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) =>
                        `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
                      }
                      outerRadius={80}
                      fill="#8884d8"
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
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[280px] flex items-center justify-center text-muted-foreground">
                  <div className="text-center space-y-2">
                    <Target className="h-8 w-8 mx-auto opacity-50" />
                    <p className="text-sm">No test data available</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Action Items Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Priority Failures */}
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
            {metrics.priority_failures &&
            metrics.priority_failures.length > 0 ? (
              <div className="space-y-3">
                {metrics.priority_failures.slice(0, 5).map((test) => (
                  <Link
                    key={test.id}
                    href={`/test-cases/${test.id}`}
                    className="block"
                  >
                    <div className="flex items-start gap-3 p-3 border rounded-lg hover:bg-accent transition-colors">
                      <XCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
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
            ) : (
              <div className="text-center py-8 space-y-2">
                <CheckCircle className="h-8 w-8 mx-auto text-green-600 opacity-50" />
                <p className="text-sm text-muted-foreground">
                  No failed priority tests
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Flaky Tests */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-orange-600" />
                Flaky Tests
              </CardTitle>
              <CardDescription>Tests with inconsistent results</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {metrics.flaky_tests && metrics.flaky_tests.length > 0 ? (
              <div className="space-y-3">
                {metrics.flaky_tests.slice(0, 5).map((test) => (
                  <Link
                    key={test.id}
                    href={`/test-cases/${test.id}`}
                    className="block"
                  >
                    <div className="flex items-start gap-3 p-3 border rounded-lg hover:bg-accent transition-colors">
                      <Zap className="h-5 w-5 text-orange-600 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {test.title}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="flex-1 bg-muted rounded-full h-1.5 overflow-hidden">
                            <div
                              className="bg-orange-500 h-1.5"
                              style={{
                                width: `${test.flakiness_score}%`,
                              }}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {test.flakiness_score}%
                          </span>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 space-y-2">
                <CheckCircle className="h-8 w-8 mx-auto text-green-600 opacity-50" />
                <p className="text-sm text-muted-foreground">
                  No flaky tests detected
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Recent Activity
          </CardTitle>
          <CardDescription>Latest test executions and updates</CardDescription>
        </CardHeader>
        <CardContent className="pt-2">
          {metrics.recent_activity.length === 0 ? (
            <div className="text-center py-10 space-y-3">
              <Activity className="h-10 w-10 mx-auto text-muted-foreground opacity-50" />
              <div>
                <p className="text-sm font-medium">No recent activity</p>
                <p className="text-sm text-muted-foreground">
                  Start by running some tests or generating new ones
                </p>
              </div>
              <div className="flex items-center gap-2 justify-center">
                <Link href="/test-cases">
                  <Button variant="outline" size="sm">
                    <Play className="h-4 w-4 mr-2" />
                    Run Tests
                  </Button>
                </Link>
                <Link href="/generator">
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Generate Tests
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {metrics.recent_activity.slice(0, 10).map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-start gap-3 p-3 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  {activity.status === "passed" && (
                    <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                  )}
                  {activity.status === "failed" && (
                    <XCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                  )}
                  {activity.status === "blocked" && (
                    <AlertTriangle className="h-5 w-5 text-orange-600 mt-0.5 flex-shrink-0" />
                  )}
                  {!activity.status && (
                    <Activity className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm">{activity.description}</p>
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

      <div className="h-2" />
    </div>
  );
}
