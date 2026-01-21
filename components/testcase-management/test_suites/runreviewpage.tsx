"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
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
} from "lucide-react";

type AllowedStatus = "passed" | "failed" | "skipped" | "blocked";

type ExecutionHistoryRow = {
  execution_id: string;
  suite_id: string;
  suite_name: string;
  session_id: string | null;
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

type RunWithStats = {
  id: string;
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
};

type IntegrationRow = {
  id: string;
  integration_type: "jira" | "testrail";
  sync_enabled: boolean;
  config?: any;
};

function formatDuration(ms: number | null) {
  if (!ms) return "—";
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}

export function RunReviewPage({ runId }: { runId: string }) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [run, setRun] = useState<RunWithStats | null>(null);
  const [rows, setRows] = useState<ExecutionHistoryRow[]>([]);
  const [integrations, setIntegrations] = useState<IntegrationRow[]>([]);
  const [selectedIntegrationId, setSelectedIntegrationId] = useState("none");
  const [jiraBaseUrl, setJiraBaseUrl] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [creatingIssues, setCreatingIssues] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | AllowedStatus>(
    "all",
  );
  const [showOnlyNeedsReview, setShowOnlyNeedsReview] = useState(false);

  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  useEffect(() => {
    void loadRunData();
  }, [runId]);

  useEffect(() => {
    if (!hasUnsavedChanges) return;
    const timer = setTimeout(() => void saveReview(), 30000);
    return () => clearTimeout(timer);
  }, [hasUnsavedChanges, rows]);

  async function loadRunData() {
    setLoading(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) {
        toast.error("You must be signed in");
        router.push("/execution-history");
        return;
      }

      const { data: runData, error: runError } = await supabase
        .from("test_run_sessions")
        .select("*, test_suites:suite_id(id, name, project_id)")
        .eq("id", runId)
        .single();

      if (runError) throw runError;

      const runWithStats: RunWithStats = {
        id: runData.id,
        suite_name: runData.test_suites?.name ?? "Unknown Suite",
        name: runData.name,
        status: runData.status,
        test_cases_total: runData.test_cases_total ?? 0,
        test_cases_completed: runData.test_cases_completed ?? 0,
        passed_cases: runData.passed_cases ?? 0,
        failed_cases: runData.failed_cases ?? 0,
        skipped_cases: runData.skipped_cases ?? 0,
        blocked_cases: runData.blocked_cases ?? 0,
        created_at: runData.created_at,
      };

      setRun(runWithStats);

      const { data: execsRaw, error: execError } = await supabase
        .from("test_executions")
        .select(
          `
          id,
          suite_id,
          session_id,
          test_case_id,
          execution_status,
          execution_notes,
          failure_reason,
          created_at,
          started_at,
          completed_at,
          review_needs_update,
          review_create_issue,
          review_note,
          reviewed_at,
          jira_issue_key,
          testrail_defect_id,
          test_suites:suite_id(id, name, project_id),
          test_cases:test_case_id(id, title, description)
        `,
        )
        .eq("session_id", runId)
        .in("execution_status", ["passed", "failed", "blocked", "skipped"])
        .order("created_at", { ascending: true });

      if (execError) throw execError;

      const execIds = (execsRaw ?? []).map((e: any) => e.id);
      const evidenceCounts = new Map<string, number>();

      if (execIds.length > 0) {
        const { data: attachments } = await supabase
          .from("test_attachments")
          .select("execution_id")
          .in("execution_id", execIds);

        for (const att of attachments ?? []) {
          evidenceCounts.set(
            att.execution_id,
            (evidenceCounts.get(att.execution_id) ?? 0) + 1,
          );
        }
      }

      const mapped: ExecutionHistoryRow[] = (execsRaw ?? []).map((e: any) => {
        let duration: number | null = null;
        if (e.started_at && e.completed_at) {
          duration =
            new Date(e.completed_at).getTime() -
            new Date(e.started_at).getTime();
        }

        return {
          execution_id: e.id,
          suite_id: e.suite_id,
          suite_name: e.test_suites?.name ?? "Unknown Suite",
          session_id: e.session_id,
          test_case_id: e.test_case_id,
          test_title: e.test_cases?.title ?? "Unknown Test",
          test_description: e.test_cases?.description ?? null,
          execution_status: e.execution_status ?? "passed",
          execution_notes: e.execution_notes ?? null,
          failure_reason: e.failure_reason ?? null,
          created_at: e.created_at,
          started_at: e.started_at ?? null,
          completed_at: e.completed_at ?? null,
          duration_ms: duration,
          evidence_count: evidenceCounts.get(e.id) ?? 0,
          review_needs_update: Boolean(e.review_needs_update ?? false),
          review_create_issue: Boolean(e.review_create_issue ?? false),
          review_note: e.review_note ?? null,
          reviewed_at: e.reviewed_at ?? null,
          jira_issue_key: e.jira_issue_key ?? null,
          testrail_defect_id: e.testrail_defect_id ?? null,
        };
      });

      setRows(mapped);

      const projectId = runData.test_suites?.project_id;
      if (projectId) {
        const { data: intData } = await supabase
          .from("integrations")
          .select("id, integration_type, sync_enabled, config")
          .eq("project_id", projectId)
          .eq("integration_type", "jira");

        setIntegrations(intData ?? []);
        const firstEnabled =
          (intData ?? []).find((i) => i.sync_enabled) ?? intData?.[0];
        setSelectedIntegrationId(firstEnabled?.id ?? "none");

        if (firstEnabled?.config?.url) {
          setJiraBaseUrl(firstEnabled.config.url);
        }
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to load run data");
      router.push("/execution-history");
    } finally {
      setLoading(false);
    }
  }

  function patchRow(executionId: string, patch: Partial<ExecutionHistoryRow>) {
    setRows((prev) =>
      prev.map((r) =>
        r.execution_id === executionId ? { ...r, ...patch } : r,
      ),
    );
    setHasUnsavedChanges(true);
  }

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

  async function saveReview() {
    if (rows.length === 0) return;

    setSaving(true);
    try {
      const batchSize = 50;
      for (let i = 0; i < rows.length; i += batchSize) {
        const slice = rows.slice(i, i + batchSize);

        for (const r of slice) {
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
      toast.success("Review saved");
    } catch (error) {
      console.error(error);
      toast.error("Failed to save review");
    } finally {
      setSaving(false);
    }
  }

  async function createIssues() {
    if (selectedIntegrationId === "none") {
      toast.error("Select an integration first");
      return;
    }

    const targets = rows.filter(
      (r) =>
        r.review_create_issue && !r.jira_issue_key && !r.testrail_defect_id,
    );

    if (targets.length === 0) {
      toast.info("No rows selected for issue creation");
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

      const results = json.results ?? [];

      // ← ADD THIS: Log failed results
      const failures = results.filter((r: any) => !r.success);
      if (failures.length > 0) {
        failures.forEach((f: any) => {});
      }

      // Update local state
      setRows((prev) =>
        prev.map((r) => {
          const match = results.find(
            (x: any) => x.execution_id === r.execution_id && x.success,
          );
          if (!match) return r;
          if (match.issue_key) {
            return { ...r, jira_issue_key: match.issue_key };
          }
          return r;
        }),
      );

      // ← IMPROVED: Show detailed feedback
      if (json.created > 0) {
        toast.success(`Created ${json.created} of ${json.total} issues`);
      }

      if (json.failed > 0) {
        // Show first error as an example
        const firstError = failures[0]?.error ?? "Unknown error";
        toast.error(
          `Failed to create ${json.failed} issues. First error: ${firstError}`,
        );
      }
    } catch (error) {
      console.error("Create issues error:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to create issues",
      );
    } finally {
      setCreatingIssues(false);
    }
  }
  const filteredRows = useMemo(() => {
    let filtered = rows;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (r) =>
          r.test_title.toLowerCase().includes(q) ||
          r.failure_reason?.toLowerCase().includes(q) ||
          r.review_note?.toLowerCase().includes(q),
      );
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((r) => r.execution_status === statusFilter);
    }

    if (showOnlyNeedsReview) {
      filtered = filtered.filter((r) => !r.reviewed_at);
    }

    return filtered;
  }, [rows, searchQuery, statusFilter, showOnlyNeedsReview]);

  const stats = useMemo(() => {
    const needsUpdate = rows.filter((r) => r.review_needs_update).length;
    const createIssue = rows.filter((r) => r.review_create_issue).length;
    const reviewed = rows.filter((r) => r.reviewed_at).length;
    const hasIssues = rows.filter(
      (r) => r.jira_issue_key || r.testrail_defect_id,
    ).length;

    return { needsUpdate, createIssue, reviewed, hasIssues };
  }, [rows]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-3">Loading run data...</span>
      </div>
    );
  }

  if (!run) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="space-y-4">
        {/* Breadcrumb */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/execution-history")}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Execution History
        </Button>

        {/* Title & Save */}
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold">{run.name}</h2>
            <p className="text-sm text-muted-foreground">
              {run.suite_name} • {new Date(run.created_at).toLocaleString()}
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

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          <Card>
            <CardContent className="p-3">
              <div className="text-xl font-bold">{run.test_cases_total}</div>
              <div className="text-xs text-muted-foreground">Total</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3">
              <div className="text-xl font-bold text-green-600">
                {run.passed_cases}
              </div>
              <div className="text-xs text-muted-foreground">Passed</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3">
              <div className="text-xl font-bold text-red-600">
                {run.failed_cases}
              </div>
              <div className="text-xs text-muted-foreground">Failed</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3">
              <div className="text-xl font-bold">{stats.reviewed}</div>
              <div className="text-xs text-muted-foreground">Reviewed</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3">
              <div className="text-xl font-bold">{stats.needsUpdate}</div>
              <div className="text-xs text-muted-foreground">Needs Update</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3">
              <div className="text-xl font-bold">{stats.hasIssues}</div>
              <div className="text-xs text-muted-foreground">Issues</div>
            </CardContent>
          </Card>
        </div>

        {/* Bulk Actions */}
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

        {/* Filters & Actions */}
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
              const selected = integrations.find((i) => i.id === id);
              if (selected?.config?.url) {
                setJiraBaseUrl(selected.config.url);
              } else {
                setJiraBaseUrl(null);
              }
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

      {/* Test Cases List */}
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

function ReviewTestCard({
  row,
  index,
  jiraBaseUrl,
  onPatch,
}: {
  row: ExecutionHistoryRow;
  index: number;
  jiraBaseUrl: string | null;
  onPatch: (id: string, patch: Partial<ExecutionHistoryRow>) => void;
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <Card className="hover:bg-muted/30 transition-colors">
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <div className="flex gap-3 pt-1">
            <div className="flex flex-col items-center gap-1">
              <Checkbox
                checked={row.review_needs_update}
                onCheckedChange={(v) =>
                  onPatch(row.execution_id, {
                    review_needs_update: Boolean(v),
                  })
                }
              />
              <span className="text-[10px] text-muted-foreground">Update</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <Checkbox
                checked={row.review_create_issue}
                onCheckedChange={(v) =>
                  onPatch(row.execution_id, {
                    review_create_issue: Boolean(v),
                  })
                }
              />
              <span className="text-[10px] text-muted-foreground">Issue</span>
            </div>
          </div>

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
              {new Date(row.created_at).toLocaleString()} •{" "}
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
            onClick={() => setIsExpanded(!isExpanded)}
            className="gap-1"
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
