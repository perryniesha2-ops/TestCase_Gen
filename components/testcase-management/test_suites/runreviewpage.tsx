"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Search,
  Save,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  MinusCircle,
  Eye,
  ChevronDown,
  ChevronUp,
  Zap,
} from "lucide-react";
import { toastError, toastInfo, toastSuccess } from "@/lib/utils/toast-utils";
import { ExecutionHistoryRow, AllowedStatus } from "@/types/executions";

// ─── Types ────────────────────────────────────────────────────────────────────

type ExecutionRow = {
  execution_id: string;
  suite_id: string;
  suite_name: string;
  session_id: string | null;
  automation_run_id: string | null;
  test_case_id: string;
  test_title: string;
  test_description: string | null;
  execution_status: AllowedStatus;
  execution_notes: string | null;
  failure_reason: string | null;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  duration_ms: number | null;
  evidence_count: number;
  review_needs_update: boolean;
  review_create_issue: boolean;
  review_note: string | null;
  reviewed_at: string | null;
  jira_issue_key: string | null;
  testrail_defect_id: string | null;
};

type RunMeta = {
  id: string;
  suite_id: string | null;
  suite_name: string;
  name: string;
  status: string;
  test_cases_total: number;
  test_cases_completed: number;
  passed_cases: number;
  failed_cases: number;
  skipped_cases: number;
  blocked_cases: number;
  created_at: string;
  is_automation: boolean;
};

type IntegrationRow = {
  id: string;
  integration_type: "jira" | "testrail";
  sync_enabled: boolean;
  config?: Record<string, string>;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const INCLUDED_STATUSES = ["passed", "failed", "blocked", "skipped"];

const EXECUTION_SELECT = `
  id, suite_id, session_id, automation_run_id,
  test_case_id, platform_test_case_id,
  execution_status, execution_notes, failure_reason,
  created_at, started_at, completed_at,
  review_needs_update, review_create_issue, review_note, reviewed_at,
  jira_issue_key, testrail_defect_id
`;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDuration(ms: number | null) {
  if (!ms) return "—";
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  return m > 0 ? `${m}m ${s % 60}s` : `${s}s`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function RunReviewPage({ runId }: { runId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  // ?type=automation is set by ExecutionHistory when navigating
  const isAutomation = searchParams.get("type") === "automation";

  const supabase = useMemo(() => createClient(), []);

  const [run, setRun] = useState<RunMeta | null>(null);
  const [rows, setRows] = useState<ExecutionRow[]>([]);
  const [integrations, setIntegrations] = useState<IntegrationRow[]>([]);
  const [selectedIntegrationId, setSelectedIntegrationId] = useState("none");
  const [jiraBaseUrl, setJiraBaseUrl] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [creatingIssues, setCreatingIssues] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | AllowedStatus>(
    "all",
  );
  const [showOnlyNeedsReview, setShowOnlyNeedsReview] = useState(false);

  // Auto-save every 30s when there are pending changes
  useEffect(() => {
    if (!hasUnsavedChanges) return;
    const t = setTimeout(() => void saveReview(), 30_000);
    return () => clearTimeout(t);
  }, [hasUnsavedChanges, rows]);

  useEffect(() => {
    void loadRunData();
  }, [runId]);

  // ─── Load ──────────────────────────────────────────────────────────────────

  async function loadRunData() {
    setLoading(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) {
        toastError("You must be signed in");
        router.push("/login");
        return;
      }

      let resolvedRun: RunMeta | null = null;
      let projectId: string | null = null;

      // ── Resolve run metadata ────────────────────────────────────────────────
      if (!isAutomation) {
        const { data } = await supabase
          .from("test_run_sessions")
          .select("*")
          .eq("id", runId)
          .maybeSingle();

        if (data) {
          let suiteName = "Unknown Suite";
          if (data.suite_id) {
            const { data: suite } = await supabase
              .from("suites")
              .select("id, name, project_id")
              .eq("id", data.suite_id)
              .single();
            suiteName = suite?.name ?? "Unknown Suite";
            projectId = suite?.project_id ?? null;
          }
          resolvedRun = {
            id: data.id,
            suite_id: data.suite_id ?? null,
            suite_name: suiteName,
            name: data.name,
            status: data.status,
            test_cases_total: data.test_cases_total ?? 0,
            test_cases_completed: data.test_cases_completed ?? 0,
            passed_cases: data.passed_cases ?? 0,
            failed_cases: data.failed_cases ?? 0,
            skipped_cases: data.skipped_cases ?? 0,
            blocked_cases: data.blocked_cases ?? 0,
            created_at: data.created_at,
            is_automation: false,
          };
        }
      } else {
        const { data } = await supabase
          .from("automation_runs")
          .select("*")
          .eq("id", runId)
          .maybeSingle();

        if (data) {
          let suiteName = "Unknown Suite";
          if (data.suite_id) {
            const { data: suite } = await supabase
              .from("suites")
              .select("id, name, project_id")
              .eq("id", data.suite_id)
              .single();
            suiteName = suite?.name ?? "Unknown Suite";
            projectId = suite?.project_id ?? null;
          }
          resolvedRun = {
            id: data.id,
            suite_id: data.suite_id ?? null,
            suite_name: suiteName,
            name: `Run #${data.run_number} — ${data.framework ?? "playwright"}`,
            status: "completed",
            test_cases_total: Number(data.total_tests ?? 0),
            test_cases_completed: Number(data.total_tests ?? 0),
            passed_cases: Number(data.passed_tests ?? 0),
            failed_cases: Number(data.failed_tests ?? 0),
            skipped_cases: Number(data.skipped_tests ?? 0),
            blocked_cases: 0,
            created_at: data.created_at,
            is_automation: true,
          };
        }
      }

      if (!resolvedRun) {
        toastError("Run not found");
        router.push("/test-library");
        return;
      }

      setRun(resolvedRun);

      // ── Fetch executions ────────────────────────────────────────────────────
      const { data: execsRaw, error: execError } = resolvedRun.is_automation
        ? await supabase
            .from("test_executions")
            .select(EXECUTION_SELECT)
            .eq("automation_run_id", runId)
            .in("execution_status", INCLUDED_STATUSES)
            .order("created_at", { ascending: true })
        : await supabase
            .from("test_executions")
            .select(EXECUTION_SELECT)
            .eq("session_id", runId)
            .in("execution_status", INCLUDED_STATUSES)
            .order("created_at", { ascending: true });

      if (execError) throw execError;

      const execs = (execsRaw ?? []) as Record<string, unknown>[];

      // ── Resolve test case titles ────────────────────────────────────────────
      const regularIds = [
        ...new Set(execs.map((e) => e.test_case_id).filter(Boolean)),
      ] as string[];
      const platformIds = [
        ...new Set(execs.map((e) => e.platform_test_case_id).filter(Boolean)),
      ] as string[];

      const regularMap = new Map<
        string,
        { title: string; description: string | null }
      >();
      const platformMap = new Map<
        string,
        { title: string; description: string | null }
      >();

      if (regularIds.length > 0) {
        const { data } = await supabase
          .from("test_cases")
          .select("id, title, description")
          .in("id", regularIds);
        (data ?? []).forEach((c) =>
          regularMap.set(c.id, { title: c.title, description: c.description }),
        );
      }
      if (platformIds.length > 0) {
        const { data } = await supabase
          .from("platform_test_cases")
          .select("id, title, description")
          .in("id", platformIds);
        (data ?? []).forEach((c) =>
          platformMap.set(c.id, { title: c.title, description: c.description }),
        );
      }

      // ── Evidence counts ─────────────────────────────────────────────────────
      const execIds = execs.map((e) => e.id as string);
      const evidenceCounts = new Map<string, number>();
      if (execIds.length > 0) {
        const { data: atts } = await supabase
          .from("test_attachments")
          .select("execution_id")
          .in("execution_id", execIds);
        for (const a of atts ?? [])
          evidenceCounts.set(
            a.execution_id,
            (evidenceCounts.get(a.execution_id) ?? 0) + 1,
          );
      }

      // ── Map to rows ─────────────────────────────────────────────────────────
      const mapped: ExecutionRow[] = execs.map((e) => {
        const testCase = e.test_case_id
          ? regularMap.get(e.test_case_id as string)
          : platformMap.get(e.platform_test_case_id as string);

        const duration =
          e.started_at && e.completed_at
            ? new Date(e.completed_at as string).getTime() -
              new Date(e.started_at as string).getTime()
            : null;

        return {
          execution_id: e.id as string,
          suite_id: e.suite_id as string,
          suite_name: resolvedRun!.suite_name,
          session_id: (e.session_id as string) ?? null,
          automation_run_id: (e.automation_run_id as string) ?? null,
          test_case_id: (e.test_case_id || e.platform_test_case_id) as string,
          test_title: testCase?.title ?? "Unknown Test",
          test_description: testCase?.description ?? null,
          execution_status: (e.execution_status as AllowedStatus) ?? "passed",
          execution_notes: (e.execution_notes as string) ?? null,
          failure_reason: (e.failure_reason as string) ?? null,
          created_at: e.created_at as string,
          started_at: (e.started_at as string) ?? null,
          completed_at: (e.completed_at as string) ?? null,
          duration_ms: duration,
          evidence_count: evidenceCounts.get(e.id as string) ?? 0,
          review_needs_update: Boolean(e.review_needs_update ?? false),
          review_create_issue: Boolean(e.review_create_issue ?? false),
          review_note: (e.review_note as string) ?? null,
          reviewed_at: (e.reviewed_at as string) ?? null,
          jira_issue_key: (e.jira_issue_key as string) ?? null,
          testrail_defect_id: (e.testrail_defect_id as string) ?? null,
        };
      });

      setRows(mapped);

      // ── Load integrations ───────────────────────────────────────────────────
      if (projectId) {
        const { data: intData } = await supabase
          .from("integrations")
          .select("id, integration_type, sync_enabled, config")
          .eq("project_id", projectId)
          .eq("integration_type", "jira");

        setIntegrations(intData ?? []);
        const first =
          (intData ?? []).find((i) => i.sync_enabled) ?? intData?.[0];
        setSelectedIntegrationId(first?.id ?? "none");
        if (first?.config?.url) setJiraBaseUrl(first.config.url);
      }
    } catch (err) {
      console.error(err);
      toastError("Failed to load run data");
      router.push("/test-library");
    } finally {
      setLoading(false);
    }
  }

  // ─── Mutations ─────────────────────────────────────────────────────────────

  const patchRow = useCallback(
    (executionId: string, patch: Partial<ExecutionRow>) => {
      setRows((prev) =>
        prev.map((r) =>
          r.execution_id === executionId ? { ...r, ...patch } : r,
        ),
      );
      setHasUnsavedChanges(true);
    },
    [],
  );

  function bulkMarkFailuresNeedsUpdate(value: boolean) {
    setRows((prev) =>
      prev.map((r) =>
        r.execution_status === "failed"
          ? { ...r, review_needs_update: value }
          : r,
      ),
    );
    setHasUnsavedChanges(true);
  }

  function bulkMarkAllCreateIssue(value: boolean) {
    setRows((prev) => prev.map((r) => ({ ...r, review_create_issue: value })));
    setHasUnsavedChanges(true);
  }

  // ─── Save ──────────────────────────────────────────────────────────────────

  async function saveReview() {
    if (rows.length === 0) return;
    setSaving(true);
    try {
      for (let i = 0; i < rows.length; i += 50) {
        for (const r of rows.slice(i, i + 50)) {
          await supabase
            .from("test_executions")
            .update({
              review_needs_update: r.review_needs_update,
              review_create_issue: r.review_create_issue,
              review_note: r.review_note?.trim() || null,
              reviewed_at: new Date().toISOString(),
            })
            .eq("id", r.execution_id);
        }
      }
      setLastSaved(new Date());
      setHasUnsavedChanges(false);
      toastSuccess("Review saved");
    } catch (err) {
      console.error(err);
      toastError("Failed to save review");
    } finally {
      setSaving(false);
    }
  }

  // ─── Create issues ─────────────────────────────────────────────────────────

  async function createIssues() {
    if (selectedIntegrationId === "none") {
      toastError("Select an integration first");
      return;
    }

    const targets = rows.filter(
      (r) =>
        r.review_create_issue && !r.jira_issue_key && !r.testrail_defect_id,
    );
    if (targets.length === 0) {
      toastInfo("No rows selected for issue creation");
      return;
    }

    setCreatingIssues(true);
    try {
      const res = await fetch("/api/integrations/create-issues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          integration_id: selectedIntegrationId,
          executions: targets.map((r) => ({
            execution_id: r.execution_id,
            test_case_id: r.test_case_id,
            test_title: r.test_title,
            suite_name: r.suite_name,
            failure_reason: r.failure_reason,
          })),
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Failed to create issues");

      const results: Array<{
        success: boolean;
        execution_id: string;
        issue_key?: string;
      }> = json.results ?? [];

      setRows((prev) =>
        prev.map((r) => {
          const match = results.find(
            (x) => x.execution_id === r.execution_id && x.success,
          );
          if (!match?.issue_key) return r;
          return { ...r, jira_issue_key: match.issue_key };
        }),
      );

      if (json.created > 0)
        toastSuccess(`Created ${json.created} of ${json.total} issues`);
      const failures = results.filter((r) => !r.success);
      if (failures.length > 0)
        toastError(`${failures.length} issue(s) failed to create`);
    } catch (err) {
      toastError(
        err instanceof Error ? err.message : "Failed to create issues",
      );
    } finally {
      setCreatingIssues(false);
    }
  }

  // ─── Derived state ─────────────────────────────────────────────────────────

  const filteredRows = useMemo(() => {
    let f = rows;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      f = f.filter(
        (r) =>
          r.test_title.toLowerCase().includes(q) ||
          r.failure_reason?.toLowerCase().includes(q) ||
          r.review_note?.toLowerCase().includes(q),
      );
    }
    if (statusFilter !== "all")
      f = f.filter((r) => r.execution_status === statusFilter);
    if (showOnlyNeedsReview) f = f.filter((r) => !r.reviewed_at);
    return f;
  }, [rows, searchQuery, statusFilter, showOnlyNeedsReview]);

  const stats = useMemo(
    () => ({
      needsUpdate: rows.filter((r) => r.review_needs_update).length,
      createIssue: rows.filter((r) => r.review_create_issue).length,
      reviewed: rows.filter((r) => r.reviewed_at).length,
      hasIssues: rows.filter((r) => r.jira_issue_key || r.testrail_defect_id)
        .length,
    }),
    [rows],
  );

  // ─── Render ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-3">Loading run data...</span>
      </div>
    );
  }

  if (!run) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            router.push(
              run.suite_id ? `/test-library/${run.suite_id}` : "/test-library",
            )
          }
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>

        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-xl font-bold">{run.name}</h2>
              {run.is_automation && (
                <Badge
                  variant="outline"
                  className="text-[10px] gap-1 border-blue-200 text-blue-600 dark:border-blue-800 dark:text-blue-400"
                >
                  <Zap className="h-2.5 w-2.5" />
                  automated
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {run.suite_name} · {new Date(run.created_at).toLocaleString()}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {hasUnsavedChanges && (
              <Badge variant="outline" className="gap-1">
                <div className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                Unsaved changes
              </Badge>
            )}
            {lastSaved && (
              <span className="text-xs text-muted-foreground">
                Saved: {lastSaved.toLocaleTimeString()}
              </span>
            )}
            <Button
              onClick={saveReview}
              disabled={saving || !hasUnsavedChanges}
            >
              {saving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Save Review
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          {[
            { value: run.test_cases_total, label: "Total", color: "" },
            {
              value: run.passed_cases,
              label: "Passed",
              color: "text-green-600",
            },
            { value: run.failed_cases, label: "Failed", color: "text-red-600" },
            { value: stats.reviewed, label: "Reviewed", color: "" },
            { value: stats.needsUpdate, label: "Needs Update", color: "" },
            { value: stats.hasIssues, label: "Issues", color: "" },
          ].map(({ value, label, color }) => (
            <Card key={label}>
              <CardContent className="p-3">
                <div className={`text-xl font-bold ${color}`}>{value}</div>
                <div className="text-xs text-muted-foreground">{label}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Bulk actions */}
        <div className="flex flex-wrap items-center gap-2 p-3 bg-muted/50 rounded-lg">
          <span className="text-xs text-muted-foreground">Bulk:</span>
          <Button
            size="sm"
            variant="outline"
            onClick={() => bulkMarkFailuresNeedsUpdate(true)}
          >
            Mark failures: Update
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => bulkMarkFailuresNeedsUpdate(false)}
          >
            Clear failures: Update
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => bulkMarkAllCreateIssue(true)}
          >
            Mark all: Issue
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => bulkMarkAllCreateIssue(false)}
          >
            Clear all: Issue
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search tests, failures, notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          <Select
            value={statusFilter}
            onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="passed">Passed</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
              <SelectItem value="blocked">Blocked</SelectItem>
              <SelectItem value="skipped">Skipped</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex items-center gap-2">
            <Checkbox
              checked={showOnlyNeedsReview}
              onCheckedChange={(v) => setShowOnlyNeedsReview(Boolean(v))}
            />
            <span className="text-sm">Only unreviewed</span>
          </div>

          <Select
            value={selectedIntegrationId}
            onValueChange={(id) => {
              setSelectedIntegrationId(id);
              const sel = integrations.find((i) => i.id === id);
              setJiraBaseUrl(sel?.config?.url ?? null);
            }}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Integration" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No integration</SelectItem>
              {integrations.map((i) => (
                <SelectItem key={i.id} value={i.id}>
                  {i.integration_type.toUpperCase()}
                  {!i.sync_enabled && " (manual)"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            onClick={createIssues}
            disabled={
              creatingIssues ||
              selectedIntegrationId === "none" ||
              stats.createIssue === 0
            }
          >
            {creatingIssues ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : null}
            Create Issues ({stats.createIssue})
          </Button>
        </div>
      </div>

      {/* Test case cards */}
      {filteredRows.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No tests match your filters
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredRows.map((r, index) => (
            <ReviewTestCard
              key={r.execution_id}
              row={r}
              index={index}
              jiraBaseUrl={jiraBaseUrl}
              onPatch={patchRow}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── ReviewTestCard ───────────────────────────────────────────────────────────

function ReviewTestCard({
  row,
  index,
  jiraBaseUrl,
  onPatch,
}: {
  row: ExecutionRow;
  index: number;
  jiraBaseUrl: string | null;
  onPatch: (id: string, patch: Partial<ExecutionRow>) => void;
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <Card className="hover:bg-muted/30 transition-colors">
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          {/* Checkboxes */}
          <div className="flex gap-3 pt-1 shrink-0">
            <div className="flex flex-col items-center gap-1">
              <Checkbox
                checked={row.review_needs_update}
                onCheckedChange={(v) =>
                  onPatch(row.execution_id, { review_needs_update: Boolean(v) })
                }
              />
              <span className="text-[10px] text-muted-foreground">Update</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <Checkbox
                checked={row.review_create_issue}
                disabled={Boolean(row.jira_issue_key || row.testrail_defect_id)}
                onCheckedChange={(v) =>
                  onPatch(row.execution_id, { review_create_issue: Boolean(v) })
                }
              />
              <span className="text-[10px] text-muted-foreground">Issue</span>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <Badge variant="secondary" className="text-xs font-mono">
                #{index + 1}
              </Badge>
              <Badge
                variant={
                  row.execution_status === "passed"
                    ? "default"
                    : row.execution_status === "failed"
                      ? "destructive"
                      : "secondary"
                }
                className="text-xs gap-1"
              >
                {row.execution_status === "passed" && (
                  <CheckCircle2 className="h-3 w-3" />
                )}
                {row.execution_status === "failed" && (
                  <XCircle className="h-3 w-3" />
                )}
                {row.execution_status === "blocked" && (
                  <AlertTriangle className="h-3 w-3" />
                )}
                {row.execution_status === "skipped" && (
                  <MinusCircle className="h-3 w-3" />
                )}
                {row.execution_status}
              </Badge>
              {row.automation_run_id && (
                <Badge
                  variant="outline"
                  className="text-[10px] gap-1 border-blue-200 text-blue-600 dark:border-blue-800 dark:text-blue-400"
                >
                  <Zap className="h-2.5 w-2.5" />
                  automated
                </Badge>
              )}
              {row.evidence_count > 0 && (
                <Badge variant="outline" className="text-xs gap-1">
                  <Eye className="h-3 w-3" />
                  {row.evidence_count}
                </Badge>
              )}
              {row.jira_issue_key && jiraBaseUrl && (
                <a
                  href={`${jiraBaseUrl}/browse/${row.jira_issue_key}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:underline"
                >
                  <Badge variant="outline">{row.jira_issue_key}</Badge>
                </a>
              )}
            </div>

            <h4 className="font-semibold mb-1">{row.test_title}</h4>

            <div className="text-xs text-muted-foreground mb-2">
              {new Date(row.created_at).toLocaleString()} ·{" "}
              {formatDuration(row.duration_ms)}
            </div>

            {row.failure_reason && (
              <div className="mb-2 p-2 bg-red-50 dark:bg-red-950/20 rounded border border-red-200 dark:border-red-900">
                <p className="text-xs text-red-900 dark:text-red-100 line-clamp-2">
                  <span className="font-semibold">Failed: </span>
                  {row.failure_reason}
                </p>
              </div>
            )}

            <Input
              value={row.review_note ?? ""}
              onChange={(e) =>
                onPatch(row.execution_id, { review_note: e.target.value })
              }
              placeholder="Review note: What should change / what bug is this?"
              className="text-sm"
            />

            {row.reviewed_at && (
              <div className="text-[10px] text-muted-foreground mt-1">
                Reviewed: {new Date(row.reviewed_at).toLocaleString()}
              </div>
            )}
          </div>

          <Button
            size="sm"
            variant="ghost"
            onClick={() => setIsExpanded((v) => !v)}
            className="gap-1 shrink-0"
          >
            {isExpanded ? (
              <>
                <ChevronUp className="h-4 w-4" />
                Less
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4" />
                More
              </>
            )}
          </Button>
        </div>

        {isExpanded && (
          <div className="mt-4 pt-4 border-t space-y-3">
            {row.test_description && (
              <div>
                <div className="text-xs font-semibold mb-1">Description</div>
                <div className="text-sm text-muted-foreground">
                  {row.test_description}
                </div>
              </div>
            )}
            {row.execution_notes && (
              <div>
                <div className="text-xs font-semibold mb-1">
                  Execution Notes
                </div>
                <div className="text-sm p-3 bg-background rounded border">
                  {row.execution_notes}
                </div>
              </div>
            )}
            {row.failure_reason && (
              <div>
                <div className="text-xs font-semibold mb-1 text-destructive">
                  Full Failure Reason
                </div>
                <div className="text-sm p-3 bg-background rounded border">
                  {row.failure_reason}
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <div className="font-semibold mb-1">Started</div>
                <div className="text-muted-foreground">
                  {row.started_at
                    ? new Date(row.started_at).toLocaleString()
                    : "—"}
                </div>
              </div>
              <div>
                <div className="font-semibold mb-1">Completed</div>
                <div className="text-muted-foreground">
                  {row.completed_at
                    ? new Date(row.completed_at).toLocaleString()
                    : "—"}
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
