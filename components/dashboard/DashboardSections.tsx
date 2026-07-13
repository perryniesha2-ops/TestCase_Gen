// components/dashboard/DashboardSections.tsx
"use client";

import Link from "next/link";
import type {
  DashboardMetrics,
  FixQueueItem,
  CoverageGap,
  OnboardingStep,
} from "@/lib/dashboard-types";

function fmtDuration(s: number): string {
  const m = Math.floor(s / 60);
  return m > 0 ? `${m}m ${s % 60}s` : `${s}s`;
}

const severityChip: Record<FixQueueItem["severity"], string> = {
  high: "bg-rose-100 text-rose-600 dark:bg-rose-400/10 dark:text-rose-300",
  medium:
    "bg-amber-100 text-amber-600 dark:bg-amber-400/10 dark:text-amber-300",
  low: "bg-slate-100 text-slate-500 dark:bg-slate-700/60 dark:text-slate-400",
};

/* ── MetricsStrip ─────────────────────────────────────────────────────────── */

export function MetricsStrip({ metrics }: { metrics: DashboardMetrics }) {
  const cells: {
    label: string;
    value: string;
    tone?: "ok" | "bad";
    delta?: string;
    deltaUp?: boolean;
  }[] = [
    {
      label: "Pass rate",
      value: `${metrics.passRatePct}%`,
      tone:
        metrics.passRatePct >= 90
          ? "ok"
          : metrics.passRatePct < 70
            ? "bad"
            : undefined,
      delta:
        metrics.passRateDeltaPct !== undefined
          ? `${metrics.passRateDeltaPct > 0 ? "▲" : "▼"} ${Math.abs(metrics.passRateDeltaPct)}%`
          : undefined,
      deltaUp: (metrics.passRateDeltaPct ?? 0) >= 0,
    },
    {
      label: "Executions · 7d",
      value: String(metrics.executions7d),
      delta:
        metrics.executionsDelta !== undefined
          ? `${metrics.executionsDelta >= 0 ? "▲" : "▼"} ${Math.abs(metrics.executionsDelta)}`
          : undefined,
      deltaUp: (metrics.executionsDelta ?? 0) >= 0,
    },
    { label: "Coverage", value: `${metrics.coveragePct}%` },
    {
      label: "Open failures",
      value: String(metrics.openFailures),
      tone: metrics.openFailures > 0 ? "bad" : "ok",
    },
    { label: "Avg run time", value: fmtDuration(metrics.avgRunSeconds) },
  ];

  return (
    <section
      aria-label="Key metrics"
      className="mb-6 grid grid-cols-2 overflow-hidden rounded-2xl border border-slate-200 bg-white sm:grid-cols-3 lg:grid-cols-5 lg:divide-x lg:divide-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:lg:divide-slate-800"
    >
      {cells.map((c) => (
        <div key={c.label} className="px-6 py-5">
          <div className="text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
            {c.label}
          </div>
          <div
            className={`mt-2 font-mono text-3xl font-bold leading-none ${
              c.tone === "ok"
                ? "text-emerald-500 dark:text-emerald-400"
                : c.tone === "bad"
                  ? "text-rose-500 dark:text-rose-400"
                  : "text-slate-800 dark:text-slate-100"
            }`}
          >
            {c.value}
          </div>
          {c.delta && (
            <div
              className={`mt-1.5 font-mono text-xs ${
                c.deltaUp
                  ? "text-emerald-500 dark:text-emerald-400"
                  : "text-rose-500 dark:text-rose-400"
              }`}
            >
              {c.delta}
            </div>
          )}
        </div>
      ))}
    </section>
  );
}

/* ── FixNextQueue ─────────────────────────────────────────────────────────── */

export function FixNextQueue({ items }: { items: FixQueueItem[] }) {
  return (
    <section
      aria-label="Fix next"
      className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900"
    >
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100">
          Fix next — ranked by impact
        </h3>
        <Link
          href="/failures"
          className="text-sm text-cyan-600 hover:text-cyan-500 dark:text-cyan-400 dark:hover:text-cyan-300"
        >
          View all →
        </Link>
      </div>

      {items.length === 0 ? (
        <p className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-8 text-center text-sm text-slate-400 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-500">
          Nothing to fix — all tests passing. Nice work.
        </p>
      ) : (
        <ol className="space-y-2.5">
          {items.map((f, i) => (
            <li
              key={f.id}
              className="flex items-center gap-4 rounded-xl border border-slate-100 bg-slate-50 px-5 py-4 dark:border-slate-800 dark:bg-slate-950/60"
            >
              <span className="w-6 shrink-0 font-mono text-xs text-slate-400 dark:text-slate-600">
                {String(i + 1).padStart(2, "0")}
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium text-slate-700 dark:text-slate-200">
                  {f.title}
                </div>
                <div className="mt-0.5 truncate text-xs text-slate-400 dark:text-slate-500">
                  {f.reason}
                </div>
              </div>
              <span
                className={`shrink-0 rounded-full px-3 py-1 font-mono text-xs ${severityChip[f.severity]}`}
              >
                {f.severity}
              </span>
              <Link
                href={f.href}
                className="shrink-0 rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition hover:border-cyan-400 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-200 dark:hover:border-cyan-400"
              >
                Diagnose
              </Link>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

/* ── CoverageGaps ─────────────────────────────────────────────────────────── */

export function CoverageGaps({ gaps }: { gaps: CoverageGap[] }) {
  return (
    <section
      aria-label="Coverage gaps"
      className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900"
    >
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100">
          Coverage gaps
        </h3>
        <Link
          href="/requirements"
          className="text-sm text-cyan-600 hover:text-cyan-500 dark:text-cyan-400 dark:hover:text-cyan-300"
        >
          All requirements →
        </Link>
      </div>

      {gaps.length === 0 ? (
        <p className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-8 text-center text-sm text-slate-400 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-500">
          Every requirement has coverage. Add requirements to keep going.
        </p>
      ) : (
        <ul className="space-y-2.5">
          {gaps.map((g) => (
            <li
              key={g.requirementId}
              className="flex items-center gap-4 rounded-xl border border-slate-100 bg-slate-50 px-5 py-4 dark:border-slate-800 dark:bg-slate-950/60"
            >
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium text-slate-700 dark:text-slate-200">
                  {g.title}
                </div>
                <div className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">
                  {g.coveredCriteria} of {g.totalCriteria} acceptance criteria
                  covered
                </div>
              </div>
              <Link
                href={g.generateHref}
                className="shrink-0 rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-cyan-600 transition hover:border-cyan-400 dark:border-slate-700 dark:bg-slate-800/60 dark:text-cyan-300 dark:hover:border-cyan-400"
              >
                Generate
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/* ── OnboardingChecklist ──────────────────────────────────────────────────── */

export function OnboardingChecklist({ steps }: { steps: OnboardingStep[] }) {
  const done = steps.filter((s) => s.done).length;
  return (
    <section
      aria-label="Setup progress"
      className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900"
    >
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100">
          Setup progress
        </h3>
        <span className="rounded-full bg-slate-100 px-3 py-1 font-mono text-xs text-slate-500 dark:bg-slate-800 dark:text-slate-400">
          {done} of {steps.length}
        </span>
      </div>
      <ul>
        {steps.map((s) => (
          <li
            key={s.id}
            className="flex items-center gap-4 border-b border-slate-100 py-4 last:border-b-0 dark:border-slate-800"
          >
            <span
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs ${
                s.done
                  ? "border-emerald-500 bg-emerald-500 text-white dark:border-emerald-400 dark:bg-emerald-400 dark:text-slate-950"
                  : "border-slate-300 dark:border-slate-600"
              }`}
            >
              {s.done ? "✓" : ""}
            </span>
            <span
              className={`flex-1 text-sm ${
                s.done
                  ? "text-slate-400 line-through dark:text-slate-500"
                  : "text-slate-700 dark:text-slate-200"
              }`}
            >
              {s.label}
            </span>
            {!s.done && (
              <Link
                href={s.href}
                className="text-sm text-cyan-600 hover:text-cyan-500 dark:text-cyan-400 dark:hover:text-cyan-300"
              >
                Start →
              </Link>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
