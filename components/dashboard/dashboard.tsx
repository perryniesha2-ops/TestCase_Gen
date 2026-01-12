"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
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
  Users,
} from "lucide-react";
import { useAuth } from "@/lib/auth/auth-context";

interface DashboardMetrics {
  test_cases: {
    total: number;
    passed: number;
    failed: number;
    blocked: number;
    skipped: number;
    not_run: number;
    pass_rate: number;
  };
  requirements: {
    total: number;
    tested: number;
    coverage_percentage: number;
    by_priority: Record<string, number>;
  };
  recent_activity: Array<{
    id: string;
    type: "execution" | "suite_started" | "requirement_linked";
    description: string;
    timestamp: string;
    status?: string;
  }>;
}

type ExecutionStatus =
  | "passed"
  | "failed"
  | "blocked"
  | "skipped"
  | "not_run"
  | "in_progress";

const PRIORITY_ORDER = ["critical", "high", "medium", "low"] as const;

export function TestManagementDashboard() {
  const { user } = useAuth();

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
  });

  const [loading, setLoading] = useState(true);

  // Team switcher placeholder (wire this to your team/org model later)
  const [selectedTeamId, setSelectedTeamId] = useState<string>("personal");
  const selectedTeamLabel =
    selectedTeamId === "personal" ? "Personal" : "Team (Coming Soon)";

  useEffect(() => {
    if (!user?.id) return;
    fetchDashboardData();
  }, [user?.id]);

  async function fetchDashboardData() {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      await Promise.all([
        fetchTestCaseMetrics(),
        fetchRequirementsMetrics(),
        fetchRecentActivity(),
      ]);
    } catch (error) {
    } finally {
      setLoading(false);
    }
  }

  async function fetchTestCaseMetrics() {
    if (!user) return;

    const supabase = createClient();

    const { data: testCases, error: tcErr } = await supabase
      .from("test_cases")
      .select("id")
      .eq("user_id", user.id)
      .neq("status", "archived");

    if (tcErr) throw tcErr;

    if (!testCases || testCases.length === 0) {
      setMetrics((prev) => ({
        ...prev,
        test_cases: {
          total: 0,
          passed: 0,
          failed: 0,
          blocked: 0,
          skipped: 0,
          not_run: 0,
          pass_rate: 0,
        },
      }));
      return;
    }

    const testCaseIds = testCases.map((tc) => tc.id);

    const { data: latestRows, error: leErr } = await supabase
      .from("v_test_case_latest_execution")
      .select("test_case_id, execution_status")
      .in("test_case_id", testCaseIds);

    if (leErr) throw leErr;

    const latestMap = (latestRows || []).reduce((acc, row) => {
      acc[row.test_case_id] = row.execution_status as ExecutionStatus;
      return acc;
    }, {} as Record<string, ExecutionStatus>);

    const counts = {
      passed: 0,
      failed: 0,
      blocked: 0,
      skipped: 0,
      not_run: 0,
    };

    for (const id of testCaseIds) {
      const status = latestMap[id] ?? "not_run";
      if (status === "passed") counts.passed++;
      else if (status === "failed") counts.failed++;
      else if (status === "blocked") counts.blocked++;
      else if (status === "skipped") counts.skipped++;
      else counts.not_run++; // includes not_run + in_progress for dashboard “health”
    }

    const total = testCaseIds.length;
    const pass_rate = total > 0 ? Math.round((counts.passed / total) * 100) : 0;

    setMetrics((prev) => ({
      ...prev,
      test_cases: {
        total,
        passed: counts.passed,
        failed: counts.failed,
        blocked: counts.blocked,
        skipped: counts.skipped,
        not_run: counts.not_run,
        pass_rate,
      },
    }));
  }

  async function fetchRequirementsMetrics() {
    if (!user) return;

    const supabase = createClient();

    const { data: requirements, error: reqErr } = await supabase
      .from("requirements")
      .select("id, priority")
      .eq("user_id", user.id);

    if (reqErr) throw reqErr;
    if (!requirements) return;

    const { data: linkedRequirements, error: linkErr } = await supabase
      .from("requirement_test_cases")
      .select("requirement_id")
      .in(
        "requirement_id",
        requirements.map((r) => r.id)
      );

    if (linkErr) throw linkErr;

    const testedRequirements = new Set(
      linkedRequirements?.map((lr) => lr.requirement_id) || []
    );

    const byPriority = requirements.reduce((acc, req) => {
      const key = (req.priority || "medium") as string;
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    setMetrics((prev) => ({
      ...prev,
      requirements: {
        total: requirements.length,
        tested: testedRequirements.size,
        coverage_percentage:
          requirements.length > 0
            ? Math.round((testedRequirements.size / requirements.length) * 100)
            : 0,
        by_priority: byPriority,
      },
    }));
  }

  async function fetchRecentActivity() {
    if (!user) return;

    const supabase = createClient();

    const { data, error } = await supabase
      .from("test_executions")
      .select(
        `
        id,
        execution_status,
        created_at,
        test_case_id,
        test_cases ( title )
      `
      )
      .eq("executed_by", user.id)
      .order("created_at", { ascending: false })
      .limit(5);

    if (error) throw error;

    const activity = (data || []).map((exec) => ({
      id: exec.id,
      type: "execution" as const,
      description: `Test "${
        (exec as unknown as { test_cases?: { title?: string } }).test_cases
          ?.title || "Unknown Test"
      }" ${exec.execution_status}`,
      timestamp: exec.created_at,
      status: exec.execution_status,
    }));

    setMetrics((prev) => ({ ...prev, recent_activity: activity }));
  }

  function getStatusIcon(status: string) {
    switch (status) {
      case "passed":
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "failed":
        return <XCircle className="h-4 w-4 text-red-600" />;
      case "blocked":
        return <AlertTriangle className="h-4 w-4 text-orange-600" />;
      case "skipped":
        return <Clock className="h-4 w-4 text-gray-600" />;
      default:
        return <XCircle className="h-4 w-4 text-gray-400" />;
    }
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

  const priorityRows = useMemo(() => {
    const entries = Object.entries(metrics.requirements.by_priority || {});
    // Sort into a stable, user-friendly order
    entries.sort((a, b) => {
      const aKey = a[0].toLowerCase();
      const bKey = b[0].toLowerCase();
      const aIdx = PRIORITY_ORDER.indexOf(
        aKey as (typeof PRIORITY_ORDER)[number]
      );
      const bIdx = PRIORITY_ORDER.indexOf(
        bKey as (typeof PRIORITY_ORDER)[number]
      );
      const safeA = aIdx === -1 ? 999 : aIdx;
      const safeB = bIdx === -1 ? 999 : bIdx;
      return safeA - safeB;
    });
    return entries;
  }, [metrics.requirements.by_priority]);

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

  return (
    <div className="space-y-10 px-1 md:px-2">
      {/* Header + Team Switcher Space */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1"></div>

        {/* Team switcher placeholder */}
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            className="gap-2"
            onClick={() =>
              setSelectedTeamId((v) => (v === "personal" ? "team" : "personal"))
            }
            title="Team switcher placeholder"
          >
            <Users className="h-4 w-4" />
            Team: {selectedTeamLabel}
          </Button>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-sm font-medium">
              Total Test Cases
            </CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="text-2xl font-semibold">
              {metrics.test_cases.total}
            </div>
            <p className="text-xs text-muted-foreground">
              {metrics.test_cases.not_run} not executed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-sm font-medium">Pass Rate</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-1">
            <div
              className={`text-2xl font-semibold ${getPassRateColor(
                metrics.test_cases.pass_rate
              )}`}
            >
              {metrics.test_cases.pass_rate}%
            </div>
            <p className="text-xs text-muted-foreground">
              {metrics.test_cases.passed} of {metrics.test_cases.total} tests
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-sm font-medium">
              Requirements Coverage
            </CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="text-2xl font-semibold">
              {metrics.requirements.coverage_percentage}%
            </div>
            <p className="text-xs text-muted-foreground">
              {metrics.requirements.tested} of {metrics.requirements.total}{" "}
              requirements
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Test Execution Status */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between gap-4">
              <span>Test Execution Status</span>
              <Link href="/test-cases">
                <Button variant="outline" size="sm">
                  View All <ArrowUpRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
            </CardTitle>
            <CardDescription>
              Current status of all test cases (latest execution).
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-2">
            <div className="space-y-5">
              {[
                {
                  label: "Passed",
                  icon: <CheckCircle className="h-4 w-4 text-green-600" />,
                  value: metrics.test_cases.passed,
                  barClass: "bg-green-500",
                },
                {
                  label: "Failed",
                  icon: <XCircle className="h-4 w-4 text-red-600" />,
                  value: metrics.test_cases.failed,
                  barClass: "bg-red-500",
                },
                {
                  label: "Blocked",
                  icon: <AlertTriangle className="h-4 w-4 text-orange-600" />,
                  value: metrics.test_cases.blocked,
                  barClass: "bg-orange-500",
                },
                {
                  label: "Not Run",
                  icon: <Clock className="h-4 w-4 text-gray-600" />,
                  value: metrics.test_cases.not_run,
                  barClass: "bg-gray-500",
                },
              ].map((row) => (
                <div
                  key={row.label}
                  className="flex items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-2 min-w-[120px]">
                    {row.icon}
                    <span className="text-sm">{row.label}</span>
                  </div>

                  <div className="flex items-center gap-3 min-w-[170px] justify-end">
                    <span className="text-sm font-medium tabular-nums">
                      {row.value}
                    </span>
                    <div className="w-28 bg-muted rounded-full h-3 overflow-hidden">
                      <div
                        className={`${row.barClass} h-3 rounded-full transition-all duration-300`}
                        style={{
                          width: `${
                            metrics.test_cases.total > 0
                              ? (row.value / metrics.test_cases.total) * 100
                              : 0
                          }%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Requirements by Priority */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Requirements by Priority</CardTitle>
            <CardDescription>Distribution of requirements.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {priorityRows.length === 0 ? (
              <div className="text-center py-8 space-y-2">
                <p className="text-sm text-muted-foreground">
                  No requirements found.
                </p>
                <Link href="/requirements">
                  <Button variant="outline" size="sm">
                    Add Requirement
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {priorityRows.map(([priority, count]) => (
                  <div
                    key={priority}
                    className="flex items-center justify-between py-1"
                  >
                    <Badge
                      variant="outline"
                      className={`capitalize ${
                        priority === "critical"
                          ? "text-red-600"
                          : priority === "high"
                          ? "text-orange-600"
                          : priority === "medium"
                          ? "text-yellow-600"
                          : "text-blue-600"
                      }`}
                    >
                      {priority}
                    </Badge>
                    <span className="text-sm font-medium tabular-nums">
                      {count}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Recent Activity
            </CardTitle>
            <CardDescription>
              Latest test executions and updates.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-2">
            {metrics.recent_activity.length === 0 ? (
              <div className="text-center py-10 space-y-2">
                <Activity className="h-8 w-8 mx-auto text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  No recent activity
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {metrics.recent_activity.map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-start gap-3 p-4 border border-muted rounded-lg bg-background"
                  >
                    {activity.status && getStatusIcon(activity.status)}
                    <div className="flex-1 space-y-1">
                      <p className="text-sm leading-relaxed">
                        {activity.description}
                      </p>
                      <p className="text-xs text-muted-foreground">
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
    </div>
  );
}
