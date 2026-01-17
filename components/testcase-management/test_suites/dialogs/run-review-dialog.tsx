"use client";

import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { Loader2, Eye, X } from "lucide-react";

export type AllowedStatus = "passed" | "failed" | "skipped" | "blocked";
export type RunStatus =
  | "planned"
  | "in_progress"
  | "paused"
  | "completed"
  | "aborted";

export type ExecutionHistoryRow = {
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

export type RunWithStats = {
  id: string;
  suite_name: string;
  name: string;
  status: RunStatus;
  evidence_total: number;
  review_done: boolean;
  test_cases_total: number;
  test_cases_completed: number;
  progress_percentage: number;
  passed_cases: number;
  failed_cases: number;
  skipped_cases: number;
  blocked_cases: number;
  created_at: string;
};

function formatDuration(ms: number | null) {
  if (!ms) return "-";
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}

type IntegrationRow = {
  id: string;
  integration_type: "jira" | "testrail";
  project_id?: string | null;
  sync_enabled: boolean;
};

export function RunReviewDialog({
  open,
  onOpenChange,
  activeRun,
  rows,
  loading,

  integrations,
  integrationLoading,
  selectedIntegrationId,
  onSelectedIntegrationIdChange,
  onCreateIssues,
  creatingIssues,

  onMarkFailuresNeedsUpdate,
  onClearFailuresNeedsUpdate,
  onMarkAllCreateIssue,
  onClearAllCreateIssue,

  onPatchRow,
  onOpenEvidence,
  onSave,
  saving,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;

  activeRun: RunWithStats | null;
  rows: ExecutionHistoryRow[];
  loading: boolean;

  integrations: IntegrationRow[];
  integrationLoading: boolean;
  selectedIntegrationId: string; // "none" | integration.id
  onSelectedIntegrationIdChange: (id: string) => void;
  onCreateIssues: () => void;
  creatingIssues: boolean;

  onMarkFailuresNeedsUpdate: () => void;
  onClearFailuresNeedsUpdate: () => void;
  onMarkAllCreateIssue: () => void;
  onClearAllCreateIssue: () => void;

  onPatchRow: (
    executionId: string,
    patch: Partial<ExecutionHistoryRow>
  ) => void;
  onOpenEvidence: (row: ExecutionHistoryRow) => void;

  onSave: () => void;
  saving: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="w-[95vw] sm:max-w-5xl lg:max-w-6xl max-h-[90vh] flex flex-col p-0 overflow-hidden"
        onInteractOutside={(e) => e.preventDefault()}
      >
        {/* Sticky header (like your TestCaseFormDialog) */}
        <DialogHeader className="sticky top-0 z-10 bg-background p-6 border-b">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <DialogTitle className="truncate">Post-run review</DialogTitle>
              <DialogDescription className="mt-1">
                {activeRun ? (
                  <>
                    {activeRun.suite_name} •{" "}
                    {activeRun.name || `Run ${activeRun.id.slice(0, 8)}…`}
                  </>
                ) : (
                  "Review failed tests, mark updates, and queue issues."
                )}
              </DialogDescription>
            </div>

            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full shrink-0"
              onClick={() => onOpenChange(false)}
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        {/* Bulk actions */}
        <div className="px-6 pt-4">
          <Card>
            <CardContent className="p-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div className="text-xs text-muted-foreground">
                Mark “Needs update” for tests that should be improved, and
                “Create issue” for product bugs.
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onMarkFailuresNeedsUpdate}
                  disabled={loading || rows.length === 0}
                >
                  Mark failures: Needs update
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onClearFailuresNeedsUpdate}
                  disabled={loading || rows.length === 0}
                >
                  Clear failures: Needs update
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onMarkAllCreateIssue}
                  disabled={loading || rows.length === 0}
                >
                  Mark all: Create issue
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onClearAllCreateIssue}
                  disabled={loading || rows.length === 0}
                >
                  Clear all: Create issue
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
        <div className="px-6 pt-3">
          <Card>
            <CardContent className="p-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div className="text-xs text-muted-foreground">
                Select an integration and create issues for rows marked “Create
                issue”.
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Select
                  value={selectedIntegrationId}
                  onValueChange={onSelectedIntegrationIdChange}
                  disabled={integrationLoading || creatingIssues}
                >
                  <SelectTrigger className="w-[240px]">
                    <SelectValue
                      placeholder={
                        integrationLoading ? "Loading…" : "Select integration"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No integration</SelectItem>
                    {integrations.map((i) => (
                      <SelectItem key={i.id} value={i.id}>
                        {i.integration_type.toUpperCase()}{" "}
                        {i.sync_enabled ? "" : "(disabled)"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Button
                  size="sm"
                  onClick={onCreateIssues}
                  disabled={
                    loading ||
                    rows.length === 0 ||
                    creatingIssues ||
                    integrationLoading ||
                    selectedIntegrationId === "none" ||
                    !rows.some(
                      (r) =>
                        r.review_create_issue &&
                        !r.jira_issue_key &&
                        !r.testrail_defect_id
                    )
                  }
                >
                  {creatingIssues ? "Creating…" : "Create issues"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Table body */}
        <div className="flex-1 overflow-auto px-6 py-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span className="ml-3 text-muted-foreground">
                Loading run data…
              </span>
            </div>
          ) : rows.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No executions found for this run.
            </div>
          ) : (
            <div className="border rounded-md overflow-hidden">
              <div className="grid grid-cols-12 gap-0 bg-muted/40 text-xs font-medium">
                <div className="col-span-3 p-3">Test</div>
                <div className="col-span-1 p-3">Status</div>
                <div className="col-span-1 p-3">Ev</div>
                <div className="col-span-2 p-3">Failure</div>
                <div className="col-span-1 p-3">Update</div>
                <div className="col-span-1 p-3">Issue</div>

                <div className="col-span-1 p-3">Linked</div>
                <div className="col-span-2 p-3">Review note</div>
              </div>

              {rows.map((r) => (
                <div
                  key={r.execution_id}
                  className="grid grid-cols-12 gap-0 border-t"
                >
                  <div className="col-span-3 p-3">
                    <div className="font-medium">{r.test_title}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {new Date(r.created_at).toLocaleString()} •{" "}
                      {formatDuration(r.duration_ms)}
                    </div>
                    <div className="mt-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1"
                        onClick={() => onOpenEvidence(r)}
                      >
                        <Eye className="h-4 w-4" />
                        Evidence
                      </Button>
                    </div>
                  </div>

                  <div className="col-span-1 p-3">
                    <Badge variant="secondary" className="text-xs">
                      {r.execution_status}
                    </Badge>
                  </div>

                  <div className="col-span-1 p-3 text-sm">
                    {r.evidence_count}
                  </div>

                  <div className="col-span-2 p-3 text-sm text-muted-foreground">
                    {r.failure_reason ? (
                      <div className="line-clamp-4">{r.failure_reason}</div>
                    ) : (
                      "—"
                    )}
                  </div>

                  <div className="col-span-1 p-3">
                    <Checkbox
                      checked={r.review_needs_update}
                      onCheckedChange={(v) =>
                        onPatchRow(r.execution_id, {
                          review_needs_update: Boolean(v),
                        })
                      }
                    />
                  </div>

                  <div className="col-span-1 p-3">
                    <Checkbox
                      checked={r.review_create_issue}
                      onCheckedChange={(v) =>
                        onPatchRow(r.execution_id, {
                          review_create_issue: Boolean(v),
                        })
                      }
                    />
                  </div>
                  <div className="col-span-1 p-3 text-xs">
                    {r.jira_issue_key ? (
                      <Badge variant="secondary" className="text-[10px]">
                        {r.jira_issue_key}
                      </Badge>
                    ) : r.testrail_defect_id ? (
                      <Badge variant="secondary" className="text-[10px]">
                        {r.testrail_defect_id}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </div>

                  <div className="col-span-2 p-3">
                    <Input
                      value={r.review_note ?? ""}
                      onChange={(e) =>
                        onPatchRow(r.execution_id, {
                          review_note: e.target.value,
                        })
                      }
                      placeholder="What should change / what bug is this?"
                      className="w-full"
                    />
                    {r.reviewed_at ? (
                      <div className="text-[10px] text-muted-foreground mt-1">
                        Reviewed: {new Date(r.reviewed_at).toLocaleString()}
                      </div>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sticky footer */}
        <DialogFooter className="sticky bottom-0 bg-background px-6 py-4 border-t">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Close
          </Button>
          <Button
            onClick={onSave}
            disabled={loading || rows.length === 0 || saving}
          >
            {saving ? "Saving…" : "Save review"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
