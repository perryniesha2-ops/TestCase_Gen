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

import {
  Loader2,
  Eye,
  X,
  ImageIcon,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { Label } from "@radix-ui/react-label";

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
    patch: Partial<ExecutionHistoryRow>,
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

        <div className="px-6 pt-4 space-y-2">
          {/* Bulk actions toolbar - compact */}
          <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-muted/50 rounded-lg border">
            <div className="text-xs text-muted-foreground">Bulk actions:</div>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={onMarkFailuresNeedsUpdate}
                disabled={loading || rows.length === 0}
              >
                Mark failures: Update
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={onClearFailuresNeedsUpdate}
                disabled={loading || rows.length === 0}
              >
                Clear failures: Update
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={onMarkAllCreateIssue}
                disabled={loading || rows.length === 0}
              >
                Mark all: Issue
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={onClearAllCreateIssue}
                disabled={loading || rows.length === 0}
              >
                Clear all: Issue
              </Button>
            </div>
          </div>

          {/* Integration toolbar - compact */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-muted/50 rounded-lg border">
            <div className="flex items-center gap-2 text-xs">
              <span className="text-muted-foreground">Integration:</span>
              {selectedIntegrationId !== "none" &&
                !integrations.find((i) => i.id === selectedIntegrationId)
                  ?.sync_enabled && (
                  <span className="text-amber-600">⚠️ Manual only</span>
                )}
            </div>

            <div className="flex items-center gap-2">
              <Select
                value={selectedIntegrationId}
                onValueChange={onSelectedIntegrationIdChange}
                disabled={integrationLoading || creatingIssues}
              >
                <SelectTrigger className="w-[180px] h-9">
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
                      {i.integration_type.toUpperCase()}
                      {!i.sync_enabled && " (manual only)"}
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
                      !r.testrail_defect_id,
                  )
                }
              >
                {creatingIssues ? "Creating…" : "Create issues"}
              </Button>
            </div>
          </div>
        </div>

        {/* Table body  */}
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
            <div className="space-y-3">
              {rows.map((r, index) => {
                const [isExpanded, setIsExpanded] = React.useState(false);

                return (
                  <Card key={r.execution_id} className="overflow-hidden">
                    <CardContent className="p-0">
                      {/* Main row - always visible */}
                      <div className="p-4 hover:bg-muted/50 transition-colors">
                        <div className="flex items-start gap-4">
                          {/* Left: Test info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge
                                variant="secondary"
                                className="text-xs font-mono"
                              >
                                #{index + 1}
                              </Badge>
                              <Badge
                                variant={
                                  r.execution_status === "passed"
                                    ? "default"
                                    : r.execution_status === "failed"
                                      ? "destructive"
                                      : "secondary"
                                }
                                className="text-xs"
                              >
                                {r.execution_status}
                              </Badge>
                              {r.evidence_count > 0 && (
                                <Badge
                                  variant="outline"
                                  className="text-xs gap-1"
                                >
                                  <ImageIcon className="h-3 w-3" />
                                  {r.evidence_count}
                                </Badge>
                              )}
                            </div>

                            <h4 className="font-semibold mb-1">
                              {r.test_title}
                            </h4>

                            <div className="text-xs text-muted-foreground">
                              {new Date(r.created_at).toLocaleString()} •{" "}
                              {formatDuration(r.duration_ms)}
                            </div>

                            {/* Failure reason preview */}
                            {r.failure_reason && (
                              <div className="mt-2 p-2 bg-red-50 dark:bg-red-950/20 rounded border border-red-200 dark:border-red-900">
                                <p className="text-xs text-red-900 dark:text-red-100 line-clamp-2">
                                  <span className="font-semibold">
                                    Failed:{" "}
                                  </span>
                                  {r.failure_reason}
                                </p>
                              </div>
                            )}

                            {/* Linked issue */}
                            {(r.jira_issue_key || r.testrail_defect_id) && (
                              <div className="mt-2 flex items-center gap-2">
                                <Badge variant="secondary" className="text-xs">
                                  {r.jira_issue_key || r.testrail_defect_id}
                                </Badge>
                              </div>
                            )}
                          </div>

                          {/* Right: Actions */}
                          <div className="flex flex-col items-end gap-3">
                            <div className="flex items-center gap-4">
                              {/* Checkboxes */}
                              <div className="flex items-center gap-2">
                                <div className="flex flex-col items-center gap-1">
                                  <Checkbox
                                    checked={r.review_needs_update}
                                    onCheckedChange={(v) =>
                                      onPatchRow(r.execution_id, {
                                        review_needs_update: Boolean(v),
                                      })
                                    }
                                  />
                                  <span className="text-[10px] text-muted-foreground">
                                    Update
                                  </span>
                                </div>

                                <div className="flex flex-col items-center gap-1">
                                  <Checkbox
                                    checked={r.review_create_issue}
                                    onCheckedChange={(v) =>
                                      onPatchRow(r.execution_id, {
                                        review_create_issue: Boolean(v),
                                      })
                                    }
                                  />
                                  <span className="text-[10px] text-muted-foreground">
                                    Issue
                                  </span>
                                </div>
                              </div>

                              {/* Actions */}
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

                            {/* Expand button */}
                            <Button
                              size="sm"
                              variant="ghost"
                              className="gap-1"
                              onClick={() => setIsExpanded(!isExpanded)}
                            >
                              {isExpanded ? (
                                <>
                                  <ChevronUp className="h-4 w-4" />
                                  Collapse
                                </>
                              ) : (
                                <>
                                  <ChevronDown className="h-4 w-4" />
                                  Details
                                </>
                              )}
                            </Button>
                          </div>
                        </div>

                        {/* Review note - always visible */}
                        <div className="mt-3">
                          <Input
                            value={r.review_note ?? ""}
                            onChange={(e) =>
                              onPatchRow(r.execution_id, {
                                review_note: e.target.value,
                              })
                            }
                            placeholder="Review note: What should change / what bug is this?"
                            className="w-full"
                          />
                          {r.reviewed_at && (
                            <div className="text-[10px] text-muted-foreground mt-1">
                              Reviewed:{" "}
                              {new Date(r.reviewed_at).toLocaleString()}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Expanded details */}
                      {isExpanded && (
                        <div className="border-t bg-muted/30 p-4 space-y-3">
                          {/* Full failure reason */}
                          {r.failure_reason && (
                            <div>
                              <Label className="text-xs font-semibold text-destructive">
                                Failure Reason
                              </Label>
                              <div className="mt-1 p-3 bg-background rounded-lg border text-sm">
                                {r.failure_reason}
                              </div>
                            </div>
                          )}

                          {/* Execution notes */}
                          {r.execution_notes && (
                            <div>
                              <Label className="text-xs font-semibold">
                                Execution Notes
                              </Label>
                              <div className="mt-1 p-3 bg-background rounded-lg border text-sm">
                                {r.execution_notes}
                              </div>
                            </div>
                          )}

                          {/* Test description */}
                          {r.test_description && (
                            <div>
                              <Label className="text-xs font-semibold">
                                Test Description
                              </Label>
                              <div className="mt-1 p-3 bg-background rounded-lg border text-sm text-muted-foreground">
                                {r.test_description}
                              </div>
                            </div>
                          )}

                          {/* Metadata */}
                          <div className="grid grid-cols-2 gap-3 text-xs">
                            <div>
                              <Label className="text-xs font-semibold">
                                Started
                              </Label>
                              <div className="mt-1 text-muted-foreground">
                                {r.started_at
                                  ? new Date(r.started_at).toLocaleString()
                                  : "—"}
                              </div>
                            </div>
                            <div>
                              <Label className="text-xs font-semibold">
                                Completed
                              </Label>
                              <div className="mt-1 text-muted-foreground">
                                {r.completed_at
                                  ? new Date(r.completed_at).toLocaleString()
                                  : "—"}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
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
