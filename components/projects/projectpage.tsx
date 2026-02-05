"use client";

import React, { useEffect, useMemo, useState, useCallback } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth/auth-context";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  Settings,
  FolderOpen,
  ArrowRight,
  Activity,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  Zap,
  TrendingUp,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

type ProjectRow = {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  status: string | null;
  color: string | null;
  icon: string | null;
  created_at: string | null;
  updated_at: string | null;
};

type ProjectDashboardRpc = {
  project_id: string;
  days: number;
  counts: {
    templates: number;
    requirements: number;
    test_cases: number;
    platform_test_cases: number;
    test_cases_total: number;
    suites: number;
  };
  executions: {
    regular: {
      total: number;
      passed: number;
      failed: number;
      blocked: number;
      skipped: number;
      not_run: number;
      in_progress: number;
      pass_rate: number;
      by_type: {
        manual: {
          total: number;
          passed: number;
          failed: number;
          blocked: number;
          skipped: number;
        };
        automated: {
          total: number;
          passed: number;
          failed: number;
          blocked: number;
          skipped: number;
        };
      };
    };
    platform: {
      total: number;
      passed: number;
      failed: number;
      blocked: number;
      skipped: number;
      not_run: number;
      pass_rate: number;
    };
  };
  avg_duration_minutes: number;
  last_execution_at: string | null;
};

type ExecutionTimeline = Array<{
  date: string;
  passed: number;
  failed: number;
  total: number;
}>;

type ProblemTest = {
  id: string;
  title: string;
  type: string;
  test_case_type: "regular" | "platform";
  priority: string;
  failure_count: number;
  flakiness_score: number;
};

type Suite = {
  id: string;
  name: string;
  description: string | null;
  status: string;
  test_case_count: number;
  last_run_at: string | null;
  pass_rate: number;
  created_at: string;
};

export function ProjectPageClient({ projectId }: { projectId: string }) {
  const supabase = useMemo(() => createClient(), []);
  const { user, loading: authLoading } = useAuth();

  const [project, setProject] = useState<ProjectRow | null>(null);
  const [dashboard, setDashboard] = useState<ProjectDashboardRpc | null>(null);
  const [timeline, setTimeline] = useState<ExecutionTimeline>([]);
  const [problemTests, setProblemTests] = useState<ProblemTest[]>([]);
  const [suites, setSuites] = useState<Suite[]>([]);
  const [loading, setLoading] = useState(true);

  const loadProject = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    try {
      const [
        { data: dash, error: dashErr },
        { data: proj, error: projErr },
        { data: timelineData, error: timelineErr },
        { data: problemsData, error: problemsErr },
        { data: suitesData, error: suitesErr },
      ] = await Promise.all([
        supabase.rpc("project_dashboard", {
          p_project_id: projectId,
          p_days: 30,
        }),
        supabase
          .from("projects")
          .select(
            "id,user_id,name,description,status,color,icon,created_at,updated_at",
          )
          .eq("id", projectId)
          .single(),
        supabase.rpc("project_execution_timeline", {
          p_project_id: projectId,
          p_days: 30,
        }),
        supabase.rpc("project_top_problem_tests", {
          p_project_id: projectId,
          p_days: 30,
          p_limit: 10,
        }),
        supabase.rpc("project_suites_summary", {
          p_project_id: projectId,
        }),
      ]);

      if (dashErr) throw dashErr;
      if (projErr) throw projErr;

      setDashboard(dash as ProjectDashboardRpc);
      setProject(proj as ProjectRow);
      setTimeline((timelineData as ExecutionTimeline) || []);
      setProblemTests((problemsData as ProblemTest[]) || []);
      setSuites((suitesData as Suite[]) || []);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Failed to load project dashboard");
      setDashboard(null);
      setProject(null);
    } finally {
      setLoading(false);
    }
  }, [projectId, supabase, user]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) return;
    void loadProject();
  }, [authLoading, loadProject, user]);

  // Derived values
  const c = dashboard?.counts;
  const reg = dashboard?.executions?.regular;
  const plat = dashboard?.executions?.platform;

  const totalExecutions = (reg?.total ?? 0) + (plat?.total ?? 0);
  const passedExecutions = (reg?.passed ?? 0) + (plat?.passed ?? 0);
  const failedExecutions = (reg?.failed ?? 0) + (plat?.failed ?? 0);
  const blockedExecutions = (reg?.blocked ?? 0) + (plat?.blocked ?? 0);
  const skippedExecutions = (reg?.skipped ?? 0) + (plat?.skipped ?? 0);

  const combinedPassRate =
    totalExecutions > 0
      ? Math.round((100 * passedExecutions) / totalExecutions)
      : 0;

  const daysLabel = dashboard?.days ?? 30;

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

  return (
    <div className="flex w-full">
      <div className="flex min-h-screen flex-col w-full px-4 md:px-6">
        <main className="mt-6 flex-1 w-full space-y-6">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
              <span className="ml-3 text-muted-foreground">
                Loading project…
              </span>
            </div>
          ) : !project ? (
            <Card className="w-[320px]">
              <CardHeader>
                <CardTitle>Project not found</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground space-y-3">
                <p>This project may not exist, or you may not have access.</p>
                <Button asChild variant="outline">
                  <Link href="/project-manager">Back to Projects</Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Header */}
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-3">
                    <FolderOpen className="h-6 w-6 text-muted-foreground" />
                    <div className="min-w-0">
                      <h1 className="text-2xl font-semibold leading-tight truncate">
                        {project.name}
                      </h1>
                      {project.description ? (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {project.description}
                        </p>
                      ) : null}
                    </div>
                  </div>

                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <Badge variant="outline">{project.status ?? "—"}</Badge>
                    <Badge variant="secondary">{daysLabel}d view</Badge>
                    <Badge variant="secondary">
                      {combinedPassRate}% pass rate
                    </Badge>
                    {dashboard?.last_execution_at ? (
                      <Badge variant="secondary" className="truncate">
                        Last run:{" "}
                        {new Date(dashboard.last_execution_at).toLocaleString()}
                      </Badge>
                    ) : null}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button asChild variant="outline" className="gap-2">
                    <Link href={`/projects/${projectId}/settings/integrations`}>
                      <Settings className="h-4 w-4" />
                      Settings
                    </Link>
                  </Button>

                  <Button asChild className="gap-2">
                    <Link
                      href={`/requirements?project=${encodeURIComponent(projectId)}`}
                    >
                      Requirements <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>

                  <Button asChild variant="outline" className="gap-2">
                    <Link
                      href={`/test-cases?project=${encodeURIComponent(projectId)}`}
                    >
                      Test cases <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>

                  {failedExecutions > 0 && (
                    <Button asChild variant="outline" className="gap-2">
                      <Link
                        href={`/test-cases?project=${encodeURIComponent(
                          projectId,
                        )}&runStatus=failed`}
                      >
                        View failures <XCircle className="h-4 w-4" />
                      </Link>
                    </Button>
                  )}
                </div>
              </div>

              {/* KPI Cards */}
              {dashboard ? (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Card className="border-slate-200 dark:border-slate-800 hover:shadow-md transition-shadow">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        Executions
                      </CardTitle>
                      <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800">
                        <Activity className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-slate-900 dark:text-slate-100">
                        {totalExecutions}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {combinedPassRate}% pass rate · Avg{" "}
                        {dashboard.avg_duration_minutes ?? 0}m
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="border-green-200 dark:border-green-800 hover:shadow-md transition-shadow bg-green-50/50 dark:bg-green-950/20">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <CardTitle className="text-sm font-medium text-green-700 dark:text-green-300">
                        Passed
                      </CardTitle>
                      <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900">
                        <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-green-900 dark:text-green-100">
                        {passedExecutions}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Failed: {failedExecutions}
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="border-red-200 dark:border-red-800 hover:shadow-md transition-shadow bg-red-50/50 dark:bg-red-950/20">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <CardTitle className="text-sm font-medium text-red-700 dark:text-red-300">
                        Blocked / Skipped
                      </CardTitle>
                      <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900">
                        <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-red-900 dark:text-red-100">
                        {blockedExecutions + skippedExecutions}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Blocked: {blockedExecutions} · Skipped:{" "}
                        {skippedExecutions}
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="border-blue-200 dark:border-blue-800 hover:shadow-md transition-shadow bg-blue-50/50 dark:bg-blue-950/20">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <CardTitle className="text-sm font-medium text-blue-700 dark:text-blue-300">
                        Artifacts
                      </CardTitle>
                      <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900">
                        <Clock className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{c?.suites ?? 0}</div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {c?.test_cases_total ?? 0} cases ·{" "}
                        {c?.requirements ?? 0} reqs · {c?.templates ?? 0}{" "}
                        templates
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {c?.test_cases ?? 0} regular ·{" "}
                        {c?.platform_test_cases ?? 0} platform
                      </p>
                    </CardContent>
                  </Card>
                </div>
              ) : null}

              {/* Execution Trend Chart */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Execution Trend (Last {daysLabel} Days)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {timeline && timeline.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={timeline}>
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
                    <div className="h-[300px] flex items-center justify-center">
                      <div className="text-center space-y-2">
                        <Activity className="h-8 w-8 mx-auto text-muted-foreground opacity-50" />
                        <p className="text-sm text-muted-foreground">
                          No execution data in the last {daysLabel} days
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Top Problem Tests */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="h-5 w-5 text-orange-600" />
                    Top Problem Tests
                  </CardTitle>
                  {problemTests.length > 0 && (
                    <Link
                      href={`/test-cases?project=${encodeURIComponent(projectId)}&runStatus=failed`}
                    >
                      <Button variant="ghost" size="sm">
                        View All <ArrowRight className="h-4 w-4 ml-1" />
                      </Button>
                    </Link>
                  )}
                </CardHeader>
                <CardContent>
                  {problemTests && problemTests.length > 0 ? (
                    <div className="space-y-3">
                      {problemTests.map((test) => (
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
                              <div className="flex items-center gap-2 mt-1 flex-wrap">
                                <Badge
                                  variant="outline"
                                  className={`text-xs ${getPriorityBadgeClass(test.priority)}`}
                                >
                                  {test.priority}
                                </Badge>
                                <Badge variant="secondary" className="text-xs">
                                  {test.type}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  Failed {test.failure_count}x
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {test.flakiness_score}% flaky
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
                        No failed tests in the last {daysLabel} days
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Test Suites */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Test Suites</CardTitle>
                  {suites.length > 0 && (
                    <Link
                      href={`/test-library?project=${encodeURIComponent(projectId)}`}
                    >
                      <Button variant="ghost" size="sm">
                        View All <ArrowRight className="h-4 w-4 ml-1" />
                      </Button>
                    </Link>
                  )}
                </CardHeader>
                <CardContent>
                  {suites && suites.length > 0 ? (
                    <div className="space-y-3">
                      {suites.slice(0, 5).map((suite) => (
                        <div
                          key={suite.id}
                          className="flex items-start justify-between p-3 border rounded-lg hover:bg-accent transition-colors"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                              {suite.name}
                            </p>
                            {suite.description && (
                              <p className="text-xs text-muted-foreground truncate">
                                {suite.description}
                              </p>
                            )}
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="secondary" className="text-xs">
                                {suite.test_case_count} tests
                              </Badge>
                              <Badge variant="secondary" className="text-xs">
                                {suite.pass_rate}% pass rate
                              </Badge>
                              {suite.last_run_at && (
                                <span className="text-xs text-muted-foreground">
                                  Last run:{" "}
                                  {new Date(
                                    suite.last_run_at,
                                  ).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 space-y-2">
                      <Clock className="h-8 w-8 mx-auto text-muted-foreground opacity-50" />
                      <p className="text-sm text-muted-foreground">
                        No test suites yet
                      </p>
                      <Link href="/test-library">
                        <Button variant="outline" size="sm">
                          Create Suite
                        </Button>
                      </Link>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Project Details */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <Card className="lg:col-span-2">
                  <CardHeader>
                    <CardTitle>Overview</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground space-y-3">
                    <p>
                      This project contains {c?.test_cases_total ?? 0} test
                      cases, {c?.requirements ?? 0} requirements, and{" "}
                      {c?.suites ?? 0} test suites. Track execution trends,
                      identify problem tests, and manage your testing workflow
                      all in one place.
                    </p>
                    {totalExecutions === 0 && (
                      <p className="text-sm text-orange-600">
                        No tests have been executed yet. Run your test suites to
                        start tracking metrics.
                      </p>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Project Details</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground space-y-2">
                    <div>
                      <span className="font-medium text-foreground">
                        Status:
                      </span>{" "}
                      {project.status ?? "—"}
                    </div>
                    <div>
                      <span className="font-medium text-foreground">
                        Created:
                      </span>{" "}
                      {project.created_at
                        ? new Date(project.created_at).toLocaleString()
                        : "—"}
                    </div>
                    <div>
                      <span className="font-medium text-foreground">
                        Updated:
                      </span>{" "}
                      {project.updated_at
                        ? new Date(project.updated_at).toLocaleString()
                        : "—"}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </main>
        <div className="h-4" />
      </div>
    </div>
  );
}
