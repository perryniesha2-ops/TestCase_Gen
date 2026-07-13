"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import MorningBriefing from "@/components/dashboard/MorningBriefing";
import {
  MetricsStrip,
  FixNextQueue,
  CoverageGaps,
  OnboardingChecklist,
} from "@/components/dashboard/DashboardSections";
import type { DashboardData } from "@/lib/dashboard-types";

// ── Skeleton ──────────────────────────────────────────────────────────────────

function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div className={`animate-pulse rounded-2xl bg-slate-800/60 ${className}`} />
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-16 w-full" />
      <Skeleton className="h-48 w-full" />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Skeleton className="h-48" />
        <Skeleton className="h-48" />
      </div>
    </div>
  );
}

// ── Last run badge ────────────────────────────────────────────────────────────

function LastRunBadge({ iso }: { iso: string | null }) {
  if (!iso) return null;
  const date = new Date(iso);
  const now = new Date();
  const diffMins = Math.floor((now.getTime() - date.getTime()) / 60000);
  const label =
    diffMins < 60
      ? `${diffMins}m ago`
      : diffMins < 1440
        ? `${Math.floor(diffMins / 60)}h ago`
        : date.toLocaleDateString();
  return (
    <span className="rounded-full bg-slate-800 px-2.5 py-1 font-mono text-[10.5px] text-slate-400">
      Last run {label}
    </span>
  );
}

// ── Main dashboard ────────────────────────────────────────────────────────────

export function TestManagementDashboard() {
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        setLoading(true);
        const res = await fetch("/api/dashboard/data", {
          cache: "no-store",
          credentials: "include",
        });
        if (res.status === 401) {
          router.push("/login");
          return;
        }
        if (!res.ok) throw new Error(`Dashboard data failed (${res.status})`);
        const json = (await res.json()) as DashboardData;
        if (!cancelled) setData(json);
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? "Failed to load dashboard");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [router]);

  const handleAction = useCallback(
    (actionId: string) => {
      switch (actionId) {
        case "run-suite":
          router.push("/test-cases");
          break;
        case "rerun-failed":
          router.push("/test-cases?status=failed");
          break;
        default:
          console.warn("Unknown action:", actionId);
      }
    },
    [router],
  );

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loading) return <DashboardSkeleton />;

  // ── Error ────────────────────────────────────────────────────────────────
  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-slate-800 bg-slate-900 px-6 py-16 text-center">
        <p className="text-sm text-slate-400">
          {error ?? "Something went wrong loading your dashboard."}
        </p>
        <button
          onClick={() => window.location.reload()}
          className="rounded-full border border-slate-700 px-4 py-1.5 text-xs font-medium text-slate-300 hover:border-slate-500 transition"
        >
          Retry
        </button>
      </div>
    );
  }

  const { metrics, briefing, fixQueue, coverageGaps, onboarding, lastRunAt } =
    data;

  // ── Onboarding mode — user has no data yet ───────────────────────────────
  const showOnboarding =
    onboarding !== undefined && onboarding.some((s) => !s.done);

  return (
    <div className="space-y-4">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <h1 className="text-base font-semibold text-slate-100">Dashboard</h1>
        <LastRunBadge iso={lastRunAt} />
      </div>

      {/* Morning briefing */}
      <MorningBriefing briefing={briefing} onAction={handleAction} />

      {/* Metrics strip */}
      <MetricsStrip metrics={metrics} />

      {/* Main content — onboarding OR fix queue + coverage gaps */}
      {showOnboarding ? (
        <OnboardingChecklist steps={onboarding!} />
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <FixNextQueue items={fixQueue} />
          <CoverageGaps gaps={coverageGaps} />
        </div>
      )}
    </div>
  );
}
