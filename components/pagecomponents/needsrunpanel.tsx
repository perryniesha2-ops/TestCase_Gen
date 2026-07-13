"use client";

// components/NeedsRerunPanel.tsx

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/lib/auth/auth-context";
import { useRouter } from "next/navigation";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  RefreshCw,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Play,
  CheckCircle2,
  Loader2,
  Bug,
} from "lucide-react";
import { toastSuccess, toastError } from "@/lib/utils/toast-utils";

// ── Types ─────────────────────────────────────────────────────────────────────

type Priority = "low" | "medium" | "high" | "critical";

interface RerunCase {
  id: string;
  title: string;
  description: string | null;
  test_type: string;
  priority: Priority;
  status: string;
  updated_at: string;
  jira_issue_key: string | null;
  jira_issue_url: string | null;
  project_id: string | null;
}

interface Suite {
  id: string;
  name: string;
}

interface NeedsRerunPanelProps {
  projectId?: string | null;
  suiteId?: string | null;
}

// ── Priority chip ─────────────────────────────────────────────────────────────

const priorityChip: Record<Priority, string> = {
  critical: "bg-rose-100 text-rose-600 dark:bg-rose-400/10 dark:text-rose-300",
  high: "bg-orange-100 text-orange-600 dark:bg-orange-400/10 dark:text-orange-300",
  medium:
    "bg-amber-100 text-amber-600 dark:bg-amber-400/10 dark:text-amber-300",
  low: "bg-slate-100 text-slate-500 dark:bg-slate-700/60 dark:text-slate-400",
};

// ── Component ─────────────────────────────────────────────────────────────────

export function NeedsRerunPanel({
  projectId,
  suiteId: defaultSuiteId,
}: NeedsRerunPanelProps) {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [cases, setCases] = useState<RerunCase[]>([]);
  const [suites, setSuites] = useState<Suite[]>([]);
  const [selectedSuiteId, setSelectedSuiteId] = useState<string>(
    defaultSuiteId ?? "",
  );
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [isOpen, setIsOpen] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);

  // ── Fetch ────────────────────────────────────────────────────────────────

  const fetchCases = useCallback(async () => {
    setLoading(true);
    try {
      const qs = projectId
        ? `?project_id=${encodeURIComponent(projectId)}`
        : "";
      const res = await fetch(`/api/test-cases/needs-rerun${qs}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Failed to load");
      const fetched: RerunCase[] = json.cases ?? [];
      setCases(fetched);
      setSelectedIds(new Set(fetched.map((c) => c.id)));
      setLastRefreshed(new Date());
    } catch (err) {
      console.error("[NeedsRerunPanel] fetch error:", err);
      toastError("Failed to load re-run candidates");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  const fetchSuites = useCallback(async () => {
    if (!projectId) return;
    try {
      const res = await fetch(`/api/projects/${projectId}?days=1`);
      if (!res.ok) return;
      const data = await res.json();
      const suiteList: Suite[] = (data.suites ?? []).map((s: any) => ({
        id: s.suite_id ?? s.id,
        name: s.name,
      }));
      setSuites(suiteList);
      if (!defaultSuiteId && suiteList.length > 0)
        setSelectedSuiteId(suiteList[0].id);
    } catch (err) {
      console.error("[NeedsRerunPanel] suites fetch error:", err);
    }
  }, [projectId, defaultSuiteId]);

  useEffect(() => {
    if (authLoading || !user) return;
    void fetchCases();
    void fetchSuites();
  }, [authLoading, user, fetchCases, fetchSuites]);

  // ── Selection ─────────────────────────────────────────────────────────────

  function toggleCase(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelectedIds(
      selectedIds.size === cases.length
        ? new Set()
        : new Set(cases.map((c) => c.id)),
    );
  }

  // ── Create session ────────────────────────────────────────────────────────

  async function createRerunSession() {
    if (!selectedSuiteId) {
      toastError("Please select a suite to run in");
      return;
    }
    if (selectedIds.size === 0) {
      toastError("Select at least one test case");
      return;
    }
    setCreating(true);
    try {
      const res = await fetch("/api/test-cases/needs-rerun", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          suite_id: selectedSuiteId,
          case_ids: Array.from(selectedIds),
          project_id: projectId ?? undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Failed to create session");
      toastSuccess(
        `Re-run session created — ${json.case_count} case${json.case_count !== 1 ? "s" : ""} queued`,
      );
      router.push(
        `/test-library/${selectedSuiteId}?session=${json.session_id}`,
      );
    } catch (err) {
      console.error("[NeedsRerunPanel] create error:", err);
      toastError(
        err instanceof Error ? err.message : "Failed to create re-run session",
      );
    } finally {
      setCreating(false);
    }
  }

  // ── Empty state ───────────────────────────────────────────────────────────

  if (!loading && cases.length === 0) {
    return (
      <div className="flex items-center gap-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-6 py-4 dark:border-emerald-400/20 dark:bg-emerald-400/5">
        <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500 dark:text-emerald-400" />
        <div className="flex-1">
          <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
            All clear
          </p>
          <p className="text-xs text-emerald-600 dark:text-emerald-500">
            No test cases are waiting for fix verification.
          </p>
        </div>
        <button
          onClick={fetchCases}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-emerald-500 hover:bg-emerald-100 transition dark:hover:bg-emerald-400/10"
          title="Refresh"
        >
          <RefreshCw className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  }

  // ── Main panel ────────────────────────────────────────────────────────────

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <section className="rounded-2xl border border-amber-200 bg-white dark:border-amber-400/20 dark:bg-slate-900">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-400/10">
              <Bug className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100">
                  Fix verification
                </h3>
                {!loading && (
                  <span className="rounded-full bg-amber-100 px-2.5 py-0.5 font-mono text-[10px] text-amber-700 dark:bg-amber-400/10 dark:text-amber-300">
                    {cases.length}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 dark:text-slate-500">
                Jira bugs closed — re-run these tests to verify the fixes
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={fetchCases}
              disabled={loading}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 transition dark:hover:bg-slate-800"
              title="Refresh"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`}
              />
            </button>
            <CollapsibleTrigger asChild>
              <button className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 transition dark:hover:bg-slate-800">
                {isOpen ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </button>
            </CollapsibleTrigger>
          </div>
        </div>

        <CollapsibleContent>
          {/* Divider */}
          <div className="border-t border-slate-100 dark:border-slate-800" />

          {/* Body */}
          <div className="px-6 py-4">
            {loading ? (
              <div className="flex items-center justify-center gap-2 py-8 text-slate-400 dark:text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Loading…</span>
              </div>
            ) : (
              <div className="space-y-2">
                {/* Select all */}
                <div className="flex items-center gap-3 border-b border-slate-100 pb-3 dark:border-slate-800">
                  <input
                    type="checkbox"
                    id="select-all-rerun"
                    checked={
                      selectedIds.size === cases.length && cases.length > 0
                    }
                    onChange={toggleAll}
                    className="h-4 w-4 rounded border-slate-300 accent-cyan-500 dark:border-slate-600"
                  />
                  <label
                    htmlFor="select-all-rerun"
                    className="cursor-pointer select-none text-xs font-medium text-slate-500 dark:text-slate-400"
                  >
                    Select all ({cases.length})
                  </label>
                  {selectedIds.size > 0 && selectedIds.size < cases.length && (
                    <span className="ml-auto font-mono text-xs text-slate-400 dark:text-slate-500">
                      {selectedIds.size} selected
                    </span>
                  )}
                </div>

                {/* Case list */}
                <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
                  {cases.map((c) => (
                    <div
                      key={c.id}
                      onClick={() => toggleCase(c.id)}
                      className={`flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-3 transition ${
                        selectedIds.has(c.id)
                          ? "border-amber-200 bg-amber-50 dark:border-amber-400/20 dark:bg-amber-400/5"
                          : "border-slate-100 bg-slate-50 hover:border-slate-200 dark:border-slate-800 dark:bg-slate-950/60 dark:hover:border-slate-700"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedIds.has(c.id)}
                        onChange={() => toggleCase(c.id)}
                        onClick={(e) => e.stopPropagation()}
                        className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 accent-cyan-500 dark:border-slate-600"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-slate-700 dark:text-slate-200">
                          {c.title}
                        </p>
                        <div className="mt-1 flex flex-wrap items-center gap-2">
                          <span
                            className={`rounded-full px-2.5 py-0.5 font-mono text-[10px] ${priorityChip[c.priority as Priority] ?? priorityChip.medium}`}
                          >
                            {c.priority}
                          </span>
                          <span className="text-xs text-slate-400 dark:text-slate-500">
                            {c.test_type}
                          </span>
                          {c.jira_issue_key && (
                            <a
                              href={c.jira_issue_url ?? "#"}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline dark:text-blue-400"
                            >
                              <svg
                                className="h-3 w-3"
                                viewBox="0 0 24 24"
                                fill="currentColor"
                              >
                                <path d="M11.53 2c0 2.4 1.97 4.35 4.35 4.35h1.78v1.7c0 2.4 1.94 4.34 4.34 4.34V2.84a.84.84 0 0 0-.84-.84h-9.63zm-.84 7.32c0 2.4 1.97 4.35 4.35 4.35h1.78v1.7c0 2.4 1.94 4.34 4.34 4.34V10.16a.84.84 0 0 0-.84-.84h-9.63zm-9.63 7.32c0 2.4 1.97 4.35 4.35 4.35h1.78v1.7c0 2.4 1.94 4.34 4.34 4.34V17.48a.84.84 0 0 0-.84-.84H1.06z" />
                              </svg>
                              {c.jira_issue_key}
                              <ExternalLink className="h-2.5 w-2.5" />
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center gap-3 border-t border-slate-100 px-6 py-4 dark:border-slate-800">
            {!defaultSuiteId && suites.length > 0 && (
              <Select
                value={selectedSuiteId}
                onValueChange={setSelectedSuiteId}
              >
                <SelectTrigger className="h-9 flex-1 border-slate-200 bg-white text-sm dark:border-slate-700 dark:bg-slate-800">
                  <SelectValue placeholder="Select suite to run in…" />
                </SelectTrigger>
                <SelectContent className="border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
                  {suites.map((s) => (
                    <SelectItem key={s.id} value={s.id} className="text-sm">
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            <button
              onClick={createRerunSession}
              disabled={
                creating ||
                loading ||
                selectedIds.size === 0 ||
                !selectedSuiteId
              }
              className="ml-auto flex items-center gap-1.5 rounded-full border border-cyan-500/40 bg-cyan-50 px-4 py-2 text-xs font-medium text-cyan-700 transition hover:bg-cyan-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-cyan-400/40 dark:bg-cyan-400/10 dark:text-cyan-300 dark:hover:bg-cyan-400/20"
            >
              {creating ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Creating…
                </>
              ) : (
                <>
                  <Play className="h-3.5 w-3.5" /> Start re-run (
                  {selectedIds.size})
                </>
              )}
            </button>
          </div>
        </CollapsibleContent>
      </section>
    </Collapsible>
  );
}
