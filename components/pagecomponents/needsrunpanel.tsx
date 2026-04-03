"use client";

// components/NeedsRerunPanel.tsx
//
// Surfaces test cases flagged needs_rerun (Jira bug was fixed) and lets the
// user launch a verification run directly. Drop this anywhere — dashboard,
// test-cases page, or as a sidebar widget.
//
// Usage:
//   <NeedsRerunPanel projectId={currentProject.id} suiteId={defaultSuite.id} />

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
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
import { createClient } from "@/lib/supabase/client";

// ─── Types ────────────────────────────────────────────────────────────────────

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
  // If provided, used as the default suite for the re-run session.
  // If not provided, user must pick a suite from the selector.
  suiteId?: string | null;
}

// ─── Priority badge ───────────────────────────────────────────────────────────

const PRIORITY_CLASS: Record<Priority, string> = {
  critical:
    "bg-red-100 text-red-800 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800",
  high: "bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-800",
  medium:
    "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800",
  low: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800/40 dark:text-slate-300 dark:border-slate-700",
};

// ─── Component ────────────────────────────────────────────────────────────────

export function NeedsRerunPanel({
  projectId,
  suiteId: defaultSuiteId,
}: NeedsRerunPanelProps) {
  const router = useRouter();
  const supabase = createClient();

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

  // ── Fetch cases ─────────────────────────────────────────────────────────────

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
      // Auto-select all by default
      setSelectedIds(new Set(fetched.map((c) => c.id)));
      setLastRefreshed(new Date());
    } catch (err) {
      console.error("[NeedsRerunPanel] fetch error:", err);
      toastError("Failed to load re-run candidates");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  // ── Fetch suites (for the selector) ────────────────────────────────────────

  const fetchSuites = useCallback(async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      let q = supabase
        .from("suites")
        .select("id, name")
        .eq("user_id", user.id)
        .order("name");
      if (projectId) q = q.eq("project_id", projectId);

      const { data } = await q;
      setSuites(data ?? []);

      // If no default suite set, pick the first
      if (!defaultSuiteId && data && data.length > 0) {
        setSelectedSuiteId(data[0].id);
      }
    } catch (err) {
      console.error("[NeedsRerunPanel] suites fetch error:", err);
    }
  }, [projectId, defaultSuiteId, supabase]);

  useEffect(() => {
    void fetchCases();
    void fetchSuites();
  }, [fetchCases, fetchSuites]);

  // ── Selection ───────────────────────────────────────────────────────────────

  function toggleCase(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (selectedIds.size === cases.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(cases.map((c) => c.id)));
    }
  }

  // ── Create re-run session ───────────────────────────────────────────────────

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

      // Navigate to the new run session
      router.push(`/test-runs/${json.session_id}`);
    } catch (err) {
      console.error("[NeedsRerunPanel] create error:", err);
      toastError(
        err instanceof Error ? err.message : "Failed to create re-run session",
      );
    } finally {
      setCreating(false);
    }
  }

  // ── Empty state ─────────────────────────────────────────────────────────────

  if (!loading && cases.length === 0) {
    return (
      <Card className="border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-950/20">
        <CardContent className="py-5 flex items-center gap-3">
          <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 shrink-0" />
          <div>
            <p className="text-sm font-medium text-green-800 dark:text-green-300">
              All clear
            </p>
            <p className="text-xs text-green-600 dark:text-green-500 mt-0.5">
              No test cases are waiting for fix verification.
            </p>
          </div>
          {lastRefreshed && (
            <Button
              variant="ghost"
              size="icon"
              className="ml-auto h-7 w-7 text-green-600"
              onClick={fetchCases}
              title="Refresh"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  // ── Main panel ──────────────────────────────────────────────────────────────

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="border-amber-200 dark:border-amber-800">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900">
                <Bug className="h-4 w-4 text-amber-700 dark:text-amber-400" />
              </div>
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  Fix Verification
                  {!loading && (
                    <Badge className="bg-amber-100 text-amber-800 border border-amber-200 dark:bg-amber-900/60 dark:text-amber-300 dark:border-amber-700 text-xs">
                      {cases.length}
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription className="text-xs mt-0.5">
                  Jira bugs closed — re-run these tests to verify the fixes
                </CardDescription>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={fetchCases}
                disabled={loading}
                title="Refresh"
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`}
                />
              </Button>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7">
                  {isOpen ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </Button>
              </CollapsibleTrigger>
            </div>
          </div>
        </CardHeader>

        <CollapsibleContent>
          <CardContent className="pt-0 pb-3 space-y-2">
            {loading ? (
              <div className="flex items-center justify-center py-6 gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Loading...</span>
              </div>
            ) : (
              <>
                {/* Select all row */}
                <div className="flex items-center gap-2 pb-1 border-b">
                  <Checkbox
                    checked={
                      selectedIds.size === cases.length && cases.length > 0
                    }
                    onCheckedChange={toggleAll}
                    id="select-all-rerun"
                  />
                  <label
                    htmlFor="select-all-rerun"
                    className="text-xs font-medium text-muted-foreground cursor-pointer select-none"
                  >
                    Select all ({cases.length})
                  </label>
                  {selectedIds.size > 0 && selectedIds.size < cases.length && (
                    <span className="text-xs text-muted-foreground ml-auto">
                      {selectedIds.size} selected
                    </span>
                  )}
                </div>

                {/* Case list */}
                <div className="space-y-1 max-h-72 overflow-y-auto pr-1">
                  {cases.map((c) => (
                    <div
                      key={c.id}
                      className={`flex items-start gap-3 p-2.5 rounded-lg border cursor-pointer transition-colors ${
                        selectedIds.has(c.id)
                          ? "bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800"
                          : "bg-background border-transparent hover:border-border hover:bg-muted/50"
                      }`}
                      onClick={() => toggleCase(c.id)}
                    >
                      <Checkbox
                        checked={selectedIds.has(c.id)}
                        onCheckedChange={() => toggleCase(c.id)}
                        onClick={(e) => e.stopPropagation()}
                        className="mt-0.5 shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium leading-snug truncate">
                          {c.title}
                        </p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <Badge
                            variant="outline"
                            className={`text-[10px] border ${PRIORITY_CLASS[c.priority as Priority] ?? PRIORITY_CLASS.medium}`}
                          >
                            {c.priority}
                          </Badge>
                          <span className="text-[11px] text-muted-foreground">
                            {c.test_type}
                          </span>
                          {c.jira_issue_key && (
                            <a
                              href={c.jira_issue_url ?? "#"}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="inline-flex items-center gap-1 text-[11px] text-blue-600 hover:underline dark:text-blue-400"
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
              </>
            )}
          </CardContent>

          <CardFooter className="pt-0 pb-4 flex items-center gap-2 border-t mt-1">
            {/* Suite selector — shown when no default suite is provided */}
            {!defaultSuiteId && suites.length > 0 && (
              <Select
                value={selectedSuiteId}
                onValueChange={setSelectedSuiteId}
              >
                <SelectTrigger className="flex-1 h-8 text-xs">
                  <SelectValue placeholder="Select suite to run in…" />
                </SelectTrigger>
                <SelectContent>
                  {suites.map((s) => (
                    <SelectItem key={s.id} value={s.id} className="text-xs">
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            <Button
              size="sm"
              className="gap-1.5 ml-auto"
              disabled={
                creating ||
                loading ||
                selectedIds.size === 0 ||
                !selectedSuiteId
              }
              onClick={createRerunSession}
            >
              {creating ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Play className="h-3.5 w-3.5" />
              )}
              {creating ? "Creating…" : `Start re-run (${selectedIds.size})`}
            </Button>
          </CardFooter>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
