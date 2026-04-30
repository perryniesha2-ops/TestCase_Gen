// components/testcase-management/test-cases/VersionHistoryPanel.tsx
"use client";

import * as React from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Loader2,
  History,
  RotateCcw,
  ChevronDown,
  ChevronRight,
  GitBranch,
} from "lucide-react";
import type { TestCase } from "@/types/test-cases";

// ─── Types ────────────────────────────────────────────────────────────────────

interface TestCaseVersion {
  id: string;
  version_number: number;
  created_at: string;
  change_note: string | null;
  title: string;
  description: string;
  preconditions: string | null;
  test_steps: TestCase["test_steps"];
  expected_result: string;
  priority: string;
  status: string;
}

// Fields we diff — label maps to the human-readable name
const DIFF_FIELDS: Array<{ key: keyof TestCaseVersion; label: string }> = [
  { key: "title", label: "Title" },
  { key: "description", label: "Description" },
  { key: "priority", label: "Priority" },
  { key: "status", label: "Status" },
  { key: "preconditions", label: "Preconditions" },
  { key: "expected_result", label: "Expected Result" },
  { key: "test_steps", label: "Test Steps" },
];

interface VersionHistoryPanelProps {
  testCaseId: string;
  currentTestCase: TestCase;
  onRestored: () => void; // called after a successful restore so parent can refetch
}

// ─── Diff helpers ─────────────────────────────────────────────────────────────

function stringify(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "string") return value || "—";
  return JSON.stringify(value, null, 2);
}

function FieldDiff({
  label,
  current,
  version,
  versionNumber,
}: {
  label: string;
  current: unknown;
  version: unknown;
  versionNumber: number;
}) {
  const a = stringify(current);
  const b = stringify(version);
  if (a === b) return null;

  return (
    <div className="space-y-1">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
        {label}
      </p>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="rounded border border-blue-200 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-900 p-2 whitespace-pre-wrap break-words">
          <p className="text-[10px] font-medium text-blue-600 dark:text-blue-400 mb-1">
            Current
          </p>
          {a}
        </div>
        <div className="rounded border border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-900 p-2 whitespace-pre-wrap break-words">
          <p className="text-[10px] font-medium text-green-600 dark:text-green-400 mb-1">
            Version {versionNumber}
          </p>
          {b}
        </div>
      </div>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function VersionHistoryPanel({
  testCaseId,
  currentTestCase,
  onRestored,
}: VersionHistoryPanelProps) {
  const [versions, setVersions] = React.useState<TestCaseVersion[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [restoring, setRestoring] = React.useState<string | null>(null);
  const [expandedId, setExpandedId] = React.useState<string | null>(null);
  const [confirmRestore, setConfirmRestore] =
    React.useState<TestCaseVersion | null>(null);

  const fetchVersions = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/test-cases/${testCaseId}/versions`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error("Failed to load versions");
      const data = await res.json();
      setVersions(data.versions ?? []);
    } catch {
      toast.error("Failed to load version history");
    } finally {
      setLoading(false);
    }
  }, [testCaseId]);

  React.useEffect(() => {
    void fetchVersions();
  }, [fetchVersions]);

  const handleSaveVersion = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/test-cases/${testCaseId}/versions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d?.error ?? "Failed to save version");
      }
      const data = await res.json();
      toast.success(`Version ${data.version.version_number} saved`);
      void fetchVersions();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save version");
    } finally {
      setSaving(false);
    }
  };

  const handleRestore = async (version: TestCaseVersion) => {
    setRestoring(version.id);
    setConfirmRestore(null);
    try {
      const res = await fetch(
        `/api/test-cases/${testCaseId}/versions/${version.id}/restore`,
        {
          method: "POST",
        },
      );
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d?.error ?? "Failed to restore");
      }
      toast.success(`Restored to version ${version.version_number}`);
      onRestored();
      void fetchVersions();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to restore");
    } finally {
      setRestoring(null);
    }
  };

  const getDiffCount = (version: TestCaseVersion): number => {
    return DIFF_FIELDS.filter(({ key }) => {
      return (
        stringify(currentTestCase[key as keyof TestCase]) !==
        stringify(version[key])
      );
    }).length;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground gap-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading version history…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <GitBranch className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">
            {versions.length === 0
              ? "No versions saved yet"
              : `${versions.length} version${versions.length !== 1 ? "s" : ""}`}
          </span>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={handleSaveVersion}
          disabled={saving}
          className="gap-2"
        >
          {saving ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <History className="h-3.5 w-3.5" />
          )}
          Save current as version
        </Button>
      </div>

      {/* Empty state */}
      {versions.length === 0 && (
        <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
          <History className="h-8 w-8 mx-auto mb-3 opacity-40" />
          <p className="font-medium mb-1">No versions saved</p>
          <p>
            Click "Save current as version" to checkpoint the current state of
            this test case.
          </p>
        </div>
      )}

      {/* Version list */}
      <div className="space-y-2">
        {versions.map((version) => {
          const isExpanded = expandedId === version.id;
          const diffCount = getDiffCount(version);
          const isRestoring = restoring === version.id;

          return (
            <div
              key={version.id}
              className="rounded-lg border bg-card overflow-hidden"
            >
              {/* Version row */}
              <div className="flex items-center gap-3 p-3">
                <button
                  className="flex items-center gap-2 flex-1 text-left min-w-0"
                  onClick={() => setExpandedId(isExpanded ? null : version.id)}
                >
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  )}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold">
                        v{version.version_number}
                      </span>
                      {version.change_note && (
                        <span className="text-sm text-muted-foreground truncate">
                          {version.change_note}
                        </span>
                      )}
                      {diffCount > 0 ? (
                        <Badge
                          variant="secondary"
                          className="text-[10px] h-4 px-1.5"
                        >
                          {diffCount} field{diffCount !== 1 ? "s" : ""} differ
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="text-[10px] h-4 px-1.5 text-green-600 border-green-200"
                        >
                          identical
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {new Date(version.created_at).toLocaleString()}
                    </p>
                  </div>
                </button>

                <Button
                  size="sm"
                  variant="ghost"
                  className="gap-1.5 shrink-0 text-xs"
                  disabled={isRestoring || diffCount === 0}
                  onClick={() => setConfirmRestore(version)}
                >
                  {isRestoring ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <RotateCcw className="h-3.5 w-3.5" />
                  )}
                  Restore
                </Button>
              </div>

              {/* Diff panel */}
              {isExpanded && (
                <div className="border-t bg-muted/20 p-4 space-y-4">
                  {diffCount === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-2">
                      This version is identical to the current state.
                    </p>
                  ) : (
                    DIFF_FIELDS.map(({ key, label }) => (
                      <FieldDiff
                        key={key}
                        label={label}
                        current={currentTestCase[key as keyof TestCase]}
                        version={version[key]}
                        versionNumber={version.version_number}
                      />
                    )).filter(Boolean)
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Restore confirmation dialog */}
      <AlertDialog
        open={!!confirmRestore}
        onOpenChange={(open) => {
          if (!open) setConfirmRestore(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Restore version {confirmRestore?.version_number}?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <span>
                This will overwrite the current test case with the state saved
                in version {confirmRestore?.version_number} (
                {confirmRestore
                  ? new Date(confirmRestore.created_at).toLocaleString()
                  : ""}
                ).
              </span>
              <span className="block font-medium text-foreground mt-2">
                Any unsaved changes will be lost. Consider saving the current
                state as a version first.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmRestore && handleRestore(confirmRestore)}
              className="bg-destructive hover:bg-destructive/90"
            >
              Restore version {confirmRestore?.version_number}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
