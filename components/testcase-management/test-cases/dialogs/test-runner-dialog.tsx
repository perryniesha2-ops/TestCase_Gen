"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Circle,
  Clock,
  RotateCcw,
  Play,
  Pause,
  Save,
  Loader2,
  AlertCircle,
} from "lucide-react";
import type {
  TestCase,
  CrossPlatformTestCase,
  TestExecution,
  ExecutionStatus,
  ExecutionDetails,
} from "@/types/test-cases";

type CaseType = "regular" | "cross-platform";
type ExecutionRow = TestExecution[string] | undefined;

interface TestRunnerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  testCase: TestCase | CrossPlatformTestCase;
  caseType: CaseType;
  executionRow: ExecutionRow;
  onSaveProgress: (
    testCaseId: string,
    updates: Partial<TestExecution[string]>,
    caseType: CaseType,
  ) => Promise<void> | void;
  onFinalize: (
    testCaseId: string,
    status: ExecutionStatus,
    details: ExecutionDetails,
    caseType: CaseType,
  ) => Promise<void> | void;
  onReset: (testCaseId: string, caseType: CaseType) => Promise<void> | void;
  onToggleStep?: (
    testCaseId: string,
    stepNumber: number,
    caseType: CaseType,
  ) => void;
}

function formatDuration(startedAt?: string | null): string {
  if (!startedAt) return "—";
  const start = new Date(startedAt).getTime();
  const now = Date.now();
  const seconds = Math.max(0, Math.floor((now - start) / 1000));
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins > 0) return `${mins}m ${secs}s`;
  return `${secs}s`;
}

export function TestRunnerDialog(props: TestRunnerDialogProps) {
  const {
    open,
    onOpenChange,
    testCase,
    caseType,
    executionRow,
    onSaveProgress,
    onFinalize,
    onReset,
    onToggleStep,
  } = props;

  // Form state
  const [environment, setEnvironment] = useState("staging");
  const [browser, setBrowser] = useState("");
  const [osVersion, setOsVersion] = useState("");
  const [notes, setNotes] = useState("");

  // UI state
  const [saving, setSaving] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [finalStatus, setFinalStatus] = useState<ExecutionStatus | null>(null);
  const [finalReason, setFinalReason] = useState("");
  const [failStepNumber, setFailStepNumber] = useState<number | null>(null);
  const [failStepReason, setFailStepReason] = useState("");
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Duration ticker
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!open || !executionRow?.started_at) return;
    const interval = setInterval(() => setTick((x) => x + 1), 1000);
    return () => clearInterval(interval);
  }, [open, executionRow?.started_at]);

  // Parse steps
  const steps = useMemo(() => {
    if (caseType === "regular") {
      const tc = testCase as TestCase;
      return tc.test_steps.map((s) => ({
        stepNumber: s.step_number,
        action: s.action,
        expected: s.expected,
      }));
    }
    const cp = testCase as CrossPlatformTestCase;
    return (cp.steps || []).map((s, idx) => ({
      stepNumber: idx + 1,
      action: s,
      expected: cp.expected_results?.[idx] || "Expected result defined",
    }));
  }, [testCase, caseType]);

  const completed = executionRow?.completedSteps || [];
  const failedSteps = executionRow?.failedSteps || [];
  const status = executionRow?.status || "not_run";

  // Progress calculation
  const progress = useMemo(() => {
    if (steps.length === 0) return 0;
    return Math.round((completed.length / steps.length) * 100);
  }, [completed.length, steps.length]);

  // Initialize form when dialog opens
  useEffect(() => {
    if (!open || !testCase) return;

    setEnvironment(executionRow?.test_environment || "staging");
    setBrowser(executionRow?.browser || "");
    setOsVersion(executionRow?.os_version || "");
    setNotes(executionRow?.notes || "");
    setFinalStatus(null);
    setFinalReason("");
    setFailStepNumber(null);
    setFailStepReason("");
    setHasUnsavedChanges(false);
  }, [open, testCase?.id, executionRow]);

  // Track unsaved changes
  useEffect(() => {
    const hasChanges =
      environment !== (executionRow?.test_environment || "staging") ||
      browser !== (executionRow?.browser || "") ||
      osVersion !== (executionRow?.os_version || "") ||
      notes !== (executionRow?.notes || "");
    setHasUnsavedChanges(hasChanges);
  }, [environment, browser, osVersion, notes, executionRow]);

  // Auto-save when marking steps (debounced)
  const autoSave = useCallback(async () => {
    if (!hasUnsavedChanges) return;
    try {
      await onSaveProgress(
        testCase.id,
        {
          test_environment: environment,
          browser,
          os_version: osVersion,
          notes,
        },
        caseType,
      );
      setHasUnsavedChanges(false);
    } catch (e) {
      console.error("Auto-save failed:", e);
    }
  }, [
    hasUnsavedChanges,
    testCase.id,
    environment,
    browser,
    osVersion,
    notes,
    caseType,
    onSaveProgress,
  ]);

  // Start or resume execution
  const handleStartOrResume = async () => {
    setSaving(true);
    try {
      await onSaveProgress(
        testCase.id,
        {
          status: "in_progress",
          test_environment: environment,
          browser,
          os_version: osVersion,
          notes,
        },
        caseType,
      );
      toast.success("Test execution started");
      setHasUnsavedChanges(false);
    } catch (e: any) {
      console.error("Start/resume failed:", e);
      toast.error(e?.message || "Failed to start test execution");
    } finally {
      setSaving(false);
    }
  };

  // Save metadata only
  const handleSaveMetadata = async () => {
    setSaving(true);
    try {
      await onSaveProgress(
        testCase.id,
        {
          test_environment: environment,
          browser,
          os_version: osVersion,
          notes,
        },
        caseType,
      );
      toast.success("Execution details saved");
      setHasUnsavedChanges(false);
    } catch (e: any) {
      console.error("Save metadata failed:", e);
      toast.error(e?.message || "Failed to save execution details");
    } finally {
      setSaving(false);
    }
  };

  // Toggle step completion
  const handleToggleStep = async (stepNumber: number) => {
    if (onToggleStep) {
      onToggleStep(testCase.id, stepNumber, caseType);
      return;
    }

    const isCompleted = completed.includes(stepNumber);
    const updated = isCompleted
      ? completed.filter((n) => n !== stepNumber)
      : [...completed, stepNumber];

    try {
      await onSaveProgress(
        testCase.id,
        {
          completedSteps: updated,
          status: status === "not_run" ? "in_progress" : status,
        },
        caseType,
      );
      // Auto-save metadata if there are unsaved changes
      if (hasUnsavedChanges) {
        await autoSave();
      }
    } catch (e: any) {
      console.error("Toggle step failed:", e);
      toast.error("Failed to update step");
    }
  };

  // Mark step as failed
  const handleCommitFailStep = async () => {
    if (!failStepNumber) return;

    setSaving(true);
    try {
      const nextFailed = [
        ...failedSteps.filter((fs) => fs.step_number !== failStepNumber),
        {
          step_number: failStepNumber,
          failure_reason: failStepReason || "Step failed",
        },
      ];

      await onSaveProgress(
        testCase.id,
        {
          failedSteps: nextFailed,
          status: status === "not_run" ? "in_progress" : status,
          test_environment: environment,
          browser,
          os_version: osVersion,
          notes,
        },
        caseType,
      );

      toast.success(`Step ${failStepNumber} marked as failed`);
      setFailStepNumber(null);
      setFailStepReason("");
      setHasUnsavedChanges(false);
    } catch (e: any) {
      console.error("Mark step failed:", e);
      toast.error(e?.message || "Failed to mark step as failed");
    } finally {
      setSaving(false);
    }
  };

  // Finalize execution
  const handleFinalize = async (statusToSet: ExecutionStatus) => {
    const needsReason =
      statusToSet === "failed" ||
      statusToSet === "blocked" ||
      statusToSet === "skipped";

    if (needsReason && !finalReason.trim()) {
      toast.error("Please provide a reason");
      return;
    }

    setFinalizing(true);
    try {
      const details: ExecutionDetails = {
        notes,
        failure_reason: needsReason ? finalReason : "",
        environment,
        browser,
        os_version: osVersion,
      };

      await onFinalize(testCase.id, statusToSet, details, caseType);
      toast.success(`Test marked as ${statusToSet}`);
      onOpenChange(false);
    } catch (e: any) {
      console.error("Finalize failed:", e);
      toast.error(e?.message || "Failed to finalize test execution");
    } finally {
      setFinalizing(false);
    }
  };

  // Reset execution
  const handleReset = async () => {
    if (
      !confirm(
        "Reset this test execution? All progress and notes will be cleared.",
      )
    )
      return;

    setResetting(true);
    try {
      await onReset(testCase.id, caseType);
      toast.success("Test execution reset");
    } catch (e: any) {
      console.error("Reset failed:", e);
      toast.error(e?.message || "Failed to reset test execution");
    } finally {
      setResetting(false);
    }
  };

  // Status icon helper
  const getStatusIcon = (s: ExecutionStatus) => {
    switch (s) {
      case "passed":
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case "failed":
        return <XCircle className="h-4 w-4 text-red-600" />;
      case "blocked":
        return <AlertTriangle className="h-4 w-4 text-orange-600" />;
      case "skipped":
        return <Circle className="h-4 w-4 text-gray-400" />;
      case "in_progress":
        return <Clock className="h-4 w-4 text-blue-600 animate-pulse" />;
      default:
        return <Circle className="h-4 w-4 text-gray-400" />;
    }
  };

  const progressText = `${completed.length}/${steps.length}`;
  const isExecuting = status === "in_progress";
  const isFinished = ["passed", "failed", "blocked", "skipped"].includes(
    status,
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:max-w-4xl lg:max-w-5xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="p-6 border-b">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <DialogTitle className="flex items-center gap-2 mb-2">
                {getStatusIcon(status)}
                <span className="truncate">{testCase.title}</span>
              </DialogTitle>
              <DialogDescription className="flex flex-wrap items-center gap-3">
                <Badge variant="secondary">
                  {caseType === "regular" ? "Regular" : "Cross-Platform"}
                </Badge>
                {"test_type" in testCase && (
                  <Badge variant="outline">{testCase.test_type}</Badge>
                )}
                {"platform" in testCase && (
                  <Badge variant="outline">{testCase.platform}</Badge>
                )}
                <Badge
                  variant={status === "in_progress" ? "default" : "secondary"}
                >
                  {status.replace("_", " ")}
                </Badge>
              </DialogDescription>
            </div>
            {hasUnsavedChanges && (
              <Badge variant="outline" className="shrink-0">
                <AlertCircle className="h-3 w-3 mr-1" />
                Unsaved
              </Badge>
            )}
          </div>

          {/* Progress Bar */}
          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Progress</span>
              <div className="flex items-center gap-3">
                <span className="font-medium">{progressText} steps</span>
                <span className="text-muted-foreground">
                  {formatDuration(executionRow?.started_at)}
                </span>
              </div>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Execution Metadata */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Environment *</Label>
              <Select value={environment} onValueChange={setEnvironment}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="staging">Staging</SelectItem>
                  <SelectItem value="production">Production</SelectItem>
                  <SelectItem value="development">Development</SelectItem>
                  <SelectItem value="qa">QA</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Browser</Label>
              <Input
                value={browser}
                onChange={(e) => setBrowser(e.target.value)}
                placeholder="e.g., Chrome 119"
              />
            </div>

            <div className="space-y-2">
              <Label>OS Version</Label>
              <Input
                value={osVersion}
                onChange={(e) => setOsVersion(e.target.value)}
                placeholder="e.g., Windows 11"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Execution Notes</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Add notes about this test execution..."
            />
          </div>

          {/* Test Steps */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Test Steps</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSaveMetadata}
                disabled={saving || !hasUnsavedChanges}
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Save Details
              </Button>
            </div>

            {steps.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No steps defined for this test case
              </div>
            ) : (
              steps.map((s) => {
                const isCompleted = completed.includes(s.stepNumber);
                const failed = failedSteps.find(
                  (fs) => fs.step_number === s.stepNumber,
                );

                return (
                  <div
                    key={s.stepNumber}
                    className={`rounded-lg border p-4 transition-colors ${
                      failed
                        ? "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800"
                        : isCompleted
                          ? "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800"
                          : "bg-background"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={isCompleted}
                        onCheckedChange={() => handleToggleStep(s.stepNumber)}
                        className="mt-1"
                        disabled={saving}
                      />

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge
                            variant="outline"
                            className="font-mono text-xs"
                          >
                            Step {s.stepNumber}
                          </Badge>
                          <span
                            className={
                              isCompleted
                                ? "line-through text-muted-foreground"
                                : "font-medium"
                            }
                          >
                            {s.action}
                          </span>
                        </div>
                        <div className="text-sm text-muted-foreground mt-2">
                          <span className="font-semibold">Expected:</span>{" "}
                          {s.expected}
                        </div>

                        {failed && (
                          <div className="mt-2 text-sm text-red-700 dark:text-red-400 bg-red-100 dark:bg-red-900/30 p-2 rounded">
                            <span className="font-semibold">Failed:</span>{" "}
                            {failed.failure_reason}
                          </div>
                        )}
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        className="shrink-0"
                        onClick={() => {
                          setFailStepNumber(s.stepNumber);
                          setFailStepReason(failed?.failure_reason || "");
                        }}
                        disabled={saving}
                      >
                        {failed ? "Edit Failure" : "Mark Failed"}
                      </Button>
                    </div>

                    {/* Step Failure Input */}
                    {failStepNumber === s.stepNumber && (
                      <div className="mt-3 ml-8 space-y-2 animate-in fade-in duration-200">
                        <Label className="text-sm">Failure reason</Label>
                        <Textarea
                          value={failStepReason}
                          onChange={(e) => setFailStepReason(e.target.value)}
                          rows={2}
                          placeholder="Describe what failed and why..."
                          autoFocus
                        />
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={handleCommitFailStep}
                            disabled={saving || !failStepReason.trim()}
                          >
                            {saving ? (
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : null}
                            Save Failure
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setFailStepNumber(null);
                              setFailStepReason("");
                            }}
                            disabled={saving}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <DialogFooter className="p-6 border-t flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-2">
            {!isFinished && (
              <Button
                variant="outline"
                onClick={handleStartOrResume}
                disabled={saving || finalizing || resetting}
                className="gap-2"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : isExecuting ? (
                  <Pause className="h-4 w-4" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
                {isExecuting ? "Update" : "Start"}
              </Button>
            )}

            <Button
              variant="ghost"
              onClick={handleReset}
              disabled={saving || finalizing || resetting}
              className="gap-2"
            >
              {resetting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RotateCcw className="h-4 w-4" />
              )}
              Reset
            </Button>
          </div>

          <div className="flex flex-col gap-2 sm:items-end">
            {/* Final Status Reason Input */}
            {finalStatus &&
            ["failed", "blocked", "skipped"].includes(finalStatus) ? (
              <div className="w-full sm:w-[420px] space-y-2">
                <Label>
                  {finalStatus === "failed"
                    ? "Why did the test fail?"
                    : finalStatus === "blocked"
                      ? "Why is the test blocked?"
                      : "Why is the test being skipped?"}
                </Label>
                <Textarea
                  value={finalReason}
                  onChange={(e) => setFinalReason(e.target.value)}
                  rows={2}
                  placeholder={
                    finalStatus === "failed"
                      ? "Describe what went wrong..."
                      : finalStatus === "blocked"
                        ? "e.g., Environment issue, missing dependency..."
                        : "e.g., Out of scope, not applicable..."
                  }
                  autoFocus
                />
                <div className="flex gap-2 justify-end">
                  <Button
                    onClick={() => handleFinalize(finalStatus)}
                    disabled={finalizing || !finalReason.trim()}
                  >
                    {finalizing ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : null}
                    Confirm {finalStatus}
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setFinalStatus(null);
                      setFinalReason("");
                    }}
                    disabled={finalizing}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              /* Finalization Buttons */
              <div className="flex flex-wrap gap-2 justify-end">
                <Button
                  variant="outline"
                  className="gap-2"
                  onClick={() => handleFinalize("passed")}
                  disabled={saving || finalizing || resetting}
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Pass
                </Button>

                <Button
                  variant="destructive"
                  className="gap-2"
                  onClick={() => setFinalStatus("failed")}
                  disabled={saving || finalizing || resetting}
                >
                  <XCircle className="h-4 w-4" />
                  Fail
                </Button>

                <Button
                  variant="secondary"
                  className="gap-2"
                  onClick={() => setFinalStatus("blocked")}
                  disabled={saving || finalizing || resetting}
                >
                  <AlertTriangle className="h-4 w-4" />
                  Block
                </Button>

                <Button
                  variant="outline"
                  className="gap-2"
                  onClick={() => setFinalStatus("skipped")}
                  disabled={saving || finalizing || resetting}
                >
                  <Circle className="h-4 w-4" />
                  Skip
                </Button>
              </div>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
