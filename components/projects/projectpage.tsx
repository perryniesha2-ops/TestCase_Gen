"use client";

import React, { useEffect, useMemo, useState } from "react";
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
} from "lucide-react";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
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

type DashboardPayload = {
  project: ProjectRow;
  metrics: {
    requirements_count: number;
    test_cases_count: number;
    test_suites_count: number;
    templates_count: number;
    total_executions: number;
    passed_executions: number;
    failed_executions: number;
    blocked_executions: number;
    skipped_executions: number;
    pass_rate: number;
  };
  execution_timeseries: Array<{
    date: string;
    passed: number;
    failed: number;
    blocked: number;
    skipped: number;
    total: number;
  }>;
  top_problem_tests: Array<{
    test_case_id: string;
    test_title: string;
    total_executions: number;
    pass_rate: number;
    avg_execution_time: number;
    last_failure_date: string | null;
    failure_frequency: number;
    last_failure_reason: string | null;
  }>;
  suites_summary: Array<{
    suite_id: string;
    name: string;
    suite_type: string;
    status: string;
    test_case_count: number;
    total: number;
    passed: number;
    failed: number;
    skipped: number;
    blocked: number;
  }>;
  meta: {
    days: number;
    suite_id: string | null;
    generated_at: string;
    by_type?: any;
  };
};

function fmtDateLabel(isoOrDate: string) {
  // iso may come as "2026-01-22"
  const d = new Date(isoOrDate);
  if (Number.isNaN(d.getTime())) return isoOrDate;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function ProjectPageClient({ projectId }: { projectId: string }) {
  const supabase = useMemo(() => createClient(), []);
  const { user, loading: authLoading } = useAuth();

  const [project, setProject] = useState<ProjectRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState<DashboardPayload | null>(null);

  useEffect(() => {
    if (!user) return;
    void loadProject();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, projectId]);

  async function loadProject() {
    if (!user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("project_dashboard", {
        p_project_id: projectId,
        p_days: 30,
      });

      if (error) {
        // If you kept "raise exception 'Unauthorized'" in the RPC, you'll land here.
        console.error("[project_dashboard] rpc error:", error);
        toast.error(error.message || "Failed to load project dashboard");
        setDashboard(null);
        setProject(null);
        return;
      }

      // data is JSON (your RPC returns json)
      const payload = data as DashboardPayload | null;

      if (!payload || !payload.project) {
        toast.error("Project dashboard returned no data.");
        setDashboard(null);
        setProject(null);
        return;
      }

      setDashboard(payload);
      setProject(payload.project);
    } catch (e) {
      console.error(e);
      toast.error("Failed to load project dashboard");
      setDashboard(null);
      setProject(null);
    } finally {
      setLoading(false);
    }
  }

  const m = dashboard?.metrics;

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
                    {dashboard?.meta?.days ? (
                      <Badge variant="secondary">
                        {dashboard.meta.days}d view
                      </Badge>
                    ) : null}
                    {dashboard?.metrics ? (
                      <Badge variant="secondary">
                        {dashboard.metrics.pass_rate}% pass rate
                      </Badge>
                    ) : null}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button asChild variant="outline" className="gap-2">
                    <Link href={`/projects/${projectId}/settings/integrations`}>
                      <Settings className="h-4 w-4" />
                      Integrations
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
                </div>
              </div>

              {/* KPI Cards */}
              {m ? (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <CardTitle className="text-sm font-medium">
                        Executions
                      </CardTitle>
                      <Activity className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {m.total_executions}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {m.pass_rate}% pass rate
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <CardTitle className="text-sm font-medium">
                        Passed
                      </CardTitle>
                      <CheckCircle className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {m.passed_executions}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Failed: {m.failed_executions}
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <CardTitle className="text-sm font-medium">
                        Blocked / Skipped
                      </CardTitle>
                      <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {(m.blocked_executions ?? 0) +
                          (m.skipped_executions ?? 0)}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Blocked: {m.blocked_executions} · Skipped:{" "}
                        {m.skipped_executions}
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <CardTitle className="text-sm font-medium">
                        Artifacts
                      </CardTitle>
                      <Clock className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {m.test_suites_count}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {m.test_cases_count} cases · {m.requirements_count} reqs
                        · {m.templates_count} templates
                      </p>
                    </CardContent>
                  </Card>
                </div>
              ) : null}

              {/* Timeseries Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Execution trend</CardTitle>
                </CardHeader>
                <CardContent className="h-[320px]">
                  {dashboard?.execution_timeseries?.length ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={dashboard.execution_timeseries}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                          dataKey="date"
                          tickFormatter={fmtDateLabel}
                          minTickGap={16}
                        />
                        <YAxis allowDecimals={false} />
                        <Tooltip
                          labelFormatter={(v) => fmtDateLabel(String(v))}
                        />
                        <Legend />
                        <Line type="monotone" dataKey="total" dot={false} />
                        <Line type="monotone" dataKey="passed" dot={false} />
                        <Line type="monotone" dataKey="failed" dot={false} />
                        <Line type="monotone" dataKey="blocked" dot={false} />
                        <Line type="monotone" dataKey="skipped" dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No execution data in the selected range.
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Top failing tests */}
              <Card>
                <CardHeader>
                  <CardTitle>Top problem tests</CardTitle>
                </CardHeader>
                <CardContent className="text-sm">
                  {dashboard?.top_problem_tests?.length ? (
                    <div className="space-y-3">
                      {dashboard.top_problem_tests.map((t) => (
                        <div
                          key={t.test_case_id}
                          className="flex items-start justify-between gap-4 border rounded-lg p-3"
                        >
                          <div className="min-w-0">
                            <div className="font-medium truncate">
                              {t.test_title}
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                              Pass rate: {t.pass_rate}% · Runs:{" "}
                              {t.total_executions} · Avg: {t.avg_execution_time}
                              m
                            </div>
                            {t.last_failure_reason ? (
                              <div className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                Last failure: {t.last_failure_reason}
                              </div>
                            ) : null}
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <Badge variant="outline">
                              {t.failure_frequency}% fail
                            </Badge>
                            <Button asChild size="sm" variant="outline">
                              <Link href={`/test-cases/${t.test_case_id}`}>
                                Open
                              </Link>
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground">
                      No failures detected for this project in the selected
                      range.
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Suites summary */}
              <Card>
                <CardHeader>
                  <CardTitle>Suites</CardTitle>
                </CardHeader>
                <CardContent className="text-sm">
                  {dashboard?.suites_summary?.length ? (
                    <div className="space-y-2">
                      {dashboard.suites_summary.slice(0, 10).map((s) => (
                        <div
                          key={s.suite_id}
                          className="flex items-center justify-between border rounded-lg p-3"
                        >
                          <div className="min-w-0">
                            <div className="font-medium truncate">{s.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {s.test_case_count} cases · {s.total} runs ·{" "}
                              {s.passed} passed · {s.failed} failed
                            </div>
                          </div>
                          <Button asChild size="sm" variant="outline">
                            <Link href={`/test-suites/${s.suite_id}`}>
                              Open
                            </Link>
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground">
                      No suites found for this project.
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Project details */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <Card className="lg:col-span-2">
                  <CardHeader>
                    <CardTitle>Overview</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground space-y-3">
                    <p>
                      Use this project as the container for requirements, test
                      cases, suites, and integrations.
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Project details</CardTitle>
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
      </div>
    </div>
  );
}
