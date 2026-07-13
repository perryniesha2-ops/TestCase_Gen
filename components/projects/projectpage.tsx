"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth/auth-context";
import { toast } from "sonner";
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
  ArrowLeft,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { NeedsRerunPanel } from "@/components/pagecomponents/needsrunpanel";

// ── Types ─────────────────────────────────────────────────────────────────────

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
      in_progress: number;
      pass_rate: number;
    };
    automation: {
      total: number;
      passed: number;
      failed: number;
      skipped: number;
      runs: number;
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
  auto_passed: number;
  auto_failed: number;
  auto_total: number;
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

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

const priorityChip: Record<string, string> = {
  critical: "bg-rose-100 text-rose-600 dark:bg-rose-400/10 dark:text-rose-300",
  high: "bg-orange-100 text-orange-600 dark:bg-orange-400/10 dark:text-orange-300",
  medium:
    "bg-amber-100 text-amber-600 dark:bg-amber-400/10 dark:text-amber-300",
  low: "bg-blue-100 text-blue-600 dark:bg-blue-400/10 dark:text-blue-300",
};

// ── Sub-components ────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string | number;
  sub?: React.ReactNode;
  tone?: "ok" | "bad" | "neutral";
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-6 py-5 dark:border-slate-800 dark:bg-slate-900">
      <div className="text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
        {label}
      </div>
      <div
        className={`mt-2 font-mono text-3xl font-bold leading-none ${
          tone === "ok"
            ? "text-emerald-500 dark:text-emerald-400"
            : tone === "bad"
              ? "text-rose-500 dark:text-rose-400"
              : "text-slate-800 dark:text-slate-100"
        }`}
      >
        {value}
      </div>
      {sub && (
        <div className="mt-1.5 text-xs text-slate-400 dark:text-slate-500">
          {sub}
        </div>
      )}
    </div>
  );
}

function SectionCard({
  title,
  action,
  children,
}: {
  title: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100">
          {title}
        </h3>
        {action}
      </div>
      {children}
    </section>
  );
}

function EmptyState({
  icon: Icon,
  message,
  action,
}: {
  icon: React.ElementType;
  message: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-slate-100 bg-slate-50 px-4 py-10 text-center dark:border-slate-800 dark:bg-slate-950/60">
      <Icon className="h-7 w-7 text-slate-300 dark:text-slate-600" />
      <p className="text-sm text-slate-400 dark:text-slate-500">{message}</p>
      {action}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function ProjectPageClient({ projectId }: { projectId: string }) {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

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
      const res = await fetch(`/api/projects/${projectId}?days=30`);
      if (res.status === 401) {
        router.replace("/login");
        return;
      }
      if (res.status === 404) {
        setProject(null);
        setLoading(false);
        return;
      }
      if (!res.ok) throw new Error(`Request failed (${res.status})`);
      const data = await res.json();
      setProject(data.project ?? null);
      setDashboard(data.dashboard ?? null);
      setTimeline(data.timeline ?? []);
      setProblemTests(data.problem_tests ?? []);
      setSuites(data.suites ?? []);
    } catch (e: any) {
      toast.error(e?.message || "Failed to load project");
      setProject(null);
      setDashboard(null);
    } finally {
      setLoading(false);
    }
  }, [projectId, user, router]);

  useEffect(() => {
    if (authLoading || !user) return;
    void loadProject();
  }, [authLoading, loadProject, user]);

  // ── Derived ───────────────────────────────────────────────────────────────

  const c = dashboard?.counts;
  const reg = dashboard?.executions?.regular;
  const plat = dashboard?.executions?.platform;
  const auto = dashboard?.executions?.automation;

  const totalExec = (reg?.total ?? 0) + (plat?.total ?? 0) + (auto?.total ?? 0);
  const passedExec =
    (reg?.passed ?? 0) + (plat?.passed ?? 0) + (auto?.passed ?? 0);
  const failedExec =
    (reg?.failed ?? 0) + (plat?.failed ?? 0) + (auto?.failed ?? 0);
  const blockedExec = (reg?.blocked ?? 0) + (plat?.blocked ?? 0);
  const skippedExec =
    (reg?.skipped ?? 0) + (plat?.skipped ?? 0) + (auto?.skipped ?? 0);
  const passRate =
    totalExec > 0 ? Math.round((100 * passedExec) / totalExec) : 0;
  const daysLabel = dashboard?.days ?? 30;

  // ── Loading ───────────────────────────────────────────────────────────────

  if (loading || authLoading)
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400 dark:text-slate-500" />
        <span className="ml-3 text-sm text-slate-400 dark:text-slate-500">
          Loading project…
        </span>
      </div>
    );

  // ── Not found ─────────────────────────────────────────────────────────────

  if (!project)
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white px-6 py-16 text-center dark:border-slate-800 dark:bg-slate-900">
        <FolderOpen className="h-8 w-8 text-slate-300 dark:text-slate-600" />
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Project not found or you don't have access.
        </p>
        <Link
          href="/project-manager"
          className="rounded-full border border-slate-200 px-4 py-1.5 text-xs font-medium text-slate-600 hover:border-slate-300 transition dark:border-slate-700 dark:text-slate-300"
        >
          ← Back to Projects
        </Link>
      </div>
    );

  // ── Main render ───────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* ── Page header ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-lg font-semibold text-slate-800 dark:text-slate-100 truncate">
            {project.name}
          </h1>
          {project.description && (
            <p className="mt-0.5 text-sm text-slate-400 dark:text-slate-500 line-clamp-1">
              {project.description}
            </p>
          )}
        </div>
        <span
          className={`shrink-0 rounded-full px-2.5 py-1 font-mono text-[11px] ${
            project.status === "active"
              ? "bg-cyan-100 text-cyan-700 dark:bg-cyan-400/10 dark:text-cyan-300"
              : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
          }`}
        >
          {project.status ?? "—"}
        </span>
      </div>

      <div className="flex flex-wrap gap-2 shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-slate-600"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back
          </button>
          <Link
            href={`/projects/${projectId}/settings/integrations`}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-slate-600"
          >
            <Settings className="h-3.5 w-3.5" /> Settings
          </Link>
          <Link
            href={`/requirements?project=${encodeURIComponent(projectId)}`}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-slate-600"
          >
            Requirements <ArrowRight className="h-3.5 w-3.5" />
          </Link>
          <Link
            href={`/test-cases?project=${encodeURIComponent(projectId)}`}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-slate-600"
          >
            Test cases <ArrowRight className="h-3.5 w-3.5" />
          </Link>
          {failedExec > 0 && (
            <Link
              href={`/test-cases?project=${encodeURIComponent(projectId)}&runStatus=failed`}
              className="flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-600 transition hover:border-rose-300 dark:border-rose-400/20 dark:bg-rose-400/5 dark:text-rose-400"
            >
              <XCircle className="h-3.5 w-3.5" /> View failures
            </Link>
          )}
        </div>
      </div>

      {/* ── KPI strip ── */}
      {dashboard && (
        <div className="grid grid-cols-2 overflow-hidden rounded-2xl border border-slate-200 bg-white lg:grid-cols-4 lg:divide-x lg:divide-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:lg:divide-slate-800">
          {[
            {
              label: "Executions",
              value: totalExec,
              sub: `${passRate}% pass rate · avg ${dashboard.avg_duration_minutes ?? 0}m`,
            },
            {
              label: "Passed",
              value: passedExec,
              tone: passedExec > 0 ? ("ok" as const) : undefined,
              sub: `${failedExec} failed`,
            },
            {
              label: "Blocked / Skipped",
              value: blockedExec + skippedExec,
              tone:
                blockedExec + skippedExec > 0 ? ("bad" as const) : undefined,
              sub: `${blockedExec} blocked · ${skippedExec} skipped`,
            },
            {
              label: "Artifacts",
              value: c?.suites ?? 0,
              sub: `${c?.test_cases_total ?? 0} cases · ${c?.requirements ?? 0} reqs · ${c?.templates ?? 0} templates`,
            },
          ].map((s) => (
            <div key={s.label} className="px-6 py-5">
              <div className="text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
                {s.label}
              </div>
              <div
                className={`mt-2 font-mono text-3xl font-bold leading-none ${
                  s.tone === "ok"
                    ? "text-emerald-500 dark:text-emerald-400"
                    : s.tone === "bad"
                      ? "text-rose-500 dark:text-rose-400"
                      : "text-slate-800 dark:text-slate-100"
                }`}
              >
                {s.value}
              </div>
              <div className="mt-1.5 text-xs text-slate-400 dark:text-slate-500">
                {s.sub}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Execution trend ── */}
      <SectionCard
        title={
          <span className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-cyan-500" /> Execution trend ·
            last {daysLabel} days
          </span>
        }
      >
        {timeline.length > 0 ? (
          <ResponsiveContainer width="100%" height={260}>
            <LineChart
              data={timeline}
              margin={{ top: 4, right: 4, left: -20, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="currentColor"
                className="text-slate-100 dark:text-slate-800"
                opacity={0.5}
              />
              <XAxis
                dataKey="date"
                style={{ fontSize: "11px" }}
                stroke="currentColor"
                className="text-slate-400"
                tickFormatter={(v) => {
                  const d = new Date(v);
                  return `${d.getMonth() + 1}/${d.getDate()}`;
                }}
              />
              <YAxis
                style={{ fontSize: "11px" }}
                stroke="currentColor"
                className="text-slate-400"
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--tooltip-bg, white)",
                  border: "1px solid var(--tooltip-border, #e2e8f0)",
                  borderRadius: "12px",
                  fontSize: "12px",
                }}
              />
              <Line
                type="monotone"
                dataKey="passed"
                stroke="#10b981"
                strokeWidth={2}
                dot={false}
                name="Passed"
              />
              <Line
                type="monotone"
                dataKey="failed"
                stroke="#f43f5e"
                strokeWidth={2}
                dot={false}
                name="Failed"
              />
              <Line
                type="monotone"
                dataKey="auto_passed"
                stroke="#10b981"
                strokeWidth={1.5}
                strokeDasharray="4 3"
                dot={false}
                name="Auto passed"
              />
              <Line
                type="monotone"
                dataKey="auto_failed"
                stroke="#f43f5e"
                strokeWidth={1.5}
                strokeDasharray="4 3"
                dot={false}
                name="Auto failed"
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <EmptyState
            icon={Activity}
            message={`No executions in the last ${daysLabel} days.`}
          />
        )}
      </SectionCard>

      {/* ── Needs rerun ── */}
      <NeedsRerunPanel projectId={projectId} />

      {/* ── Problem tests + suites side by side ── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Problem tests */}
        <SectionCard
          title={
            <span className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-amber-500" /> Top problem tests
            </span>
          }
          action={
            problemTests.length > 0 ? (
              <Link
                href={`/test-cases?project=${encodeURIComponent(projectId)}&runStatus=failed`}
                className="text-sm text-cyan-600 hover:text-cyan-500 dark:text-cyan-400 dark:hover:text-cyan-300"
              >
                View all →
              </Link>
            ) : undefined
          }
        >
          {problemTests.length > 0 ? (
            <ol className="space-y-2.5">
              {problemTests.map((t, i) => (
                <li key={t.id}>
                  <Link
                    href={`/test-cases/${t.id}`}
                    className="flex items-center gap-4 rounded-xl border border-slate-100 bg-slate-50 px-5 py-4 transition hover:border-cyan-200 dark:border-slate-800 dark:bg-slate-950/60 dark:hover:border-cyan-400/30"
                  >
                    <span className="w-5 shrink-0 font-mono text-xs text-slate-400 dark:text-slate-600">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium text-slate-700 dark:text-slate-200">
                        {t.title}
                      </div>
                      <div className="mt-0.5 flex items-center gap-2 text-xs text-slate-400 dark:text-slate-500">
                        <span>Failed {t.failure_count}×</span>
                        <span>·</span>
                        <span>{t.flakiness_score}% flaky</span>
                      </div>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-1 font-mono text-[10px] ${priorityChip[t.priority] ?? priorityChip.low}`}
                    >
                      {t.priority}
                    </span>
                  </Link>
                </li>
              ))}
            </ol>
          ) : (
            <EmptyState
              icon={CheckCircle}
              message={`No failed tests in the last ${daysLabel} days.`}
            />
          )}
        </SectionCard>

        {/* Test suites */}
        <SectionCard
          title="Test suites"
          action={
            suites.length > 0 ? (
              <Link
                href={`/test-library?project=${encodeURIComponent(projectId)}`}
                className="text-sm text-cyan-600 hover:text-cyan-500 dark:text-cyan-400 dark:hover:text-cyan-300"
              >
                View all →
              </Link>
            ) : undefined
          }
        >
          {suites.length > 0 ? (
            <ul className="space-y-2.5">
              {suites.slice(0, 5).map((s) => (
                <li
                  key={s.id}
                  className="flex items-center gap-4 rounded-xl border border-slate-100 bg-slate-50 px-5 py-4 dark:border-slate-800 dark:bg-slate-950/60"
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-slate-700 dark:text-slate-200">
                      {s.name}
                    </div>
                    {s.description && (
                      <div className="mt-0.5 truncate text-xs text-slate-400 dark:text-slate-500">
                        {s.description}
                      </div>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="font-mono text-xs text-slate-500 dark:text-slate-400">
                      {s.test_case_count} tests
                    </span>
                    <span
                      className={`rounded-full px-2.5 py-1 font-mono text-[10px] ${
                        s.pass_rate >= 90
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300"
                          : s.pass_rate > 0
                            ? "bg-amber-100 text-amber-700 dark:bg-amber-400/10 dark:text-amber-300"
                            : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                      }`}
                    >
                      {s.pass_rate}%
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              icon={Clock}
              message="No test suites yet."
              action={
                <Link
                  href="/test-library"
                  className="rounded-full border border-slate-200 px-4 py-1.5 text-xs font-medium text-slate-600 hover:border-slate-300 transition dark:border-slate-700 dark:text-slate-300"
                >
                  Create suite
                </Link>
              }
            />
          )}
        </SectionCard>
      </div>

      {/* ── Overview + project details ── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <SectionCard title="Overview">
          <p className="text-sm leading-relaxed text-slate-500 dark:text-slate-400">
            This project contains{" "}
            <span className="font-semibold text-slate-700 dark:text-slate-200">
              {c?.test_cases_total ?? 0}
            </span>{" "}
            test cases,{" "}
            <span className="font-semibold text-slate-700 dark:text-slate-200">
              {c?.requirements ?? 0}
            </span>{" "}
            requirements, and{" "}
            <span className="font-semibold text-slate-700 dark:text-slate-200">
              {c?.suites ?? 0}
            </span>{" "}
            test suites.
          </p>
          {totalExec === 0 && (
            <p className="mt-3 text-sm text-amber-600 dark:text-amber-400">
              No tests have been run yet. Execute your test suites to start
              tracking metrics.
            </p>
          )}
        </SectionCard>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900 lg:col-span-2">
          <h3 className="mb-4 text-base font-semibold text-slate-800 dark:text-slate-100">
            Project details
          </h3>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-3">
            {[
              { label: "Status", value: project.status ?? "—" },
              {
                label: "Created",
                value: project.created_at ? fmtDate(project.created_at) : "—",
              },
              {
                label: "Updated",
                value: project.updated_at ? fmtDate(project.updated_at) : "—",
              },
              {
                label: "Last run",
                value: dashboard?.last_execution_at
                  ? fmtDateTime(dashboard.last_execution_at)
                  : "Never",
              },
              { label: "Pass rate", value: `${passRate}%` },
              {
                label: "Avg run",
                value: `${dashboard?.avg_duration_minutes ?? 0}m`,
              },
            ].map((d) => (
              <div key={d.label}>
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
                  {d.label}
                </dt>
                <dd className="mt-1 font-medium text-slate-700 dark:text-slate-200">
                  {d.value}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      </div>
    </div>
  );
}
