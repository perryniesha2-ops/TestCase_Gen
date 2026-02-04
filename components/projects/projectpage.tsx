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
} from "lucide-react";

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

export function ProjectPageClient({ projectId }: { projectId: string }) {
  const supabase = useMemo(() => createClient(), []);
  const { user, loading: authLoading } = useAuth();

  const [project, setProject] = useState<ProjectRow | null>(null);
  const [dashboard, setDashboard] = useState<ProjectDashboardRpc | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProject = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    try {
      const [{ data: dash, error: dashErr }, { data: proj, error: projErr }] =
        await Promise.all([
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
        ]);

      if (dashErr) throw dashErr;
      if (projErr) throw projErr;

      const payload = dash as ProjectDashboardRpc | null;
      if (!payload) {
        toast.error("Project dashboard returned no data.");
        setDashboard(null);
        setProject(null);
        return;
      }

      setDashboard(payload);
      setProject(proj as ProjectRow);
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

  // ---- derived values (new RPC shape) ----
  const c = dashboard?.counts;
  const reg = dashboard?.executions?.regular;
  const plat = dashboard?.executions?.platform;

  const totalExecutions = (reg?.total ?? 0) + (plat?.total ?? 0);
  const passedExecutions = (reg?.passed ?? 0) + (plat?.passed ?? 0);
  const failedExecutions = (reg?.failed ?? 0) + (plat?.failed ?? 0);
  const blockedExecutions = (reg?.blocked ?? 0) + (plat?.blocked ?? 0);
  const skippedExecutions = (reg?.skipped ?? 0) + (plat?.skipped ?? 0);

  // weighted combined pass rate
  const combinedPassRate =
    totalExecutions > 0
      ? Math.round((100 * passedExecutions) / totalExecutions)
      : 0;

  const daysLabel = dashboard?.days ?? 30;

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

                  <Button asChild variant="outline" className="gap-2">
                    <Link
                      href={`/test-cases?project=${encodeURIComponent(
                        projectId,
                      )}&runStatus=failed`}
                    >
                      View failures <XCircle className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </div>

              {/* KPI Cards (now based on counts + combined executions) */}
              {dashboard ? (
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
                        {totalExecutions}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {combinedPassRate}% pass rate · Avg{" "}
                        {dashboard.avg_duration_minutes ?? 0}m
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
                        {passedExecutions}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Failed: {failedExecutions}
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
                        {blockedExecutions + skippedExecutions}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Blocked: {blockedExecutions} · Skipped:{" "}
                        {skippedExecutions}
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

              {/* IMPORTANT: These sections depended on fields your RPC no longer returns.
                  Keep placeholders so the page remains functional without breaking. */}

              <Card>
                <CardHeader>
                  <CardTitle>Execution trend</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  Execution trend timeseries is not included in the current{" "}
                  <code className="text-xs">project_dashboard</code> payload.
                  Add <code className="text-xs">execution_timeseries</code> to
                  the RPC if you want to render the chart here.
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Top problem tests</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  Top problem tests are not included in the current{" "}
                  <code className="text-xs">project_dashboard</code> payload.
                  Add <code className="text-xs">top_problem_tests</code> to the
                  RPC (and include platform cases if desired) to render this
                  section.
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Suites</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  Suite summary is not included in the current{" "}
                  <code className="text-xs">project_dashboard</code> payload.
                  Add <code className="text-xs">suites_summary</code> to the RPC
                  to render it here.
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
        <div className="h-4" />
      </div>
    </div>
  );
}
