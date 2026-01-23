"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
    updates: Partial<TestExecution[string]>
  ) => Promise<void> | void;
  onFinalize: (
    testCaseId: string,
    status: ExecutionStatus,
    details: ExecutionDetails
  ) => Promise<void> | void;
  onReset: (testCaseId: string) => Promise<void> | void;
  onToggleStep?: (testCaseId: string, stepNumber: number) => void;
}

function formatDurationMinutes(startedAt?: string | null) {
  if (!startedAt) return "—";
  const start = new Date(startedAt).getTime();
  const now = Date.now();
  const mins = Math.max(0, Math.round((now - start) / 60000));
  return `${mins}m`;
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

  const [environment, setEnvironment] = useState<string>("staging");
  const [browser, setBrowser] = useState<string>("");
  const [osVersion, setOsVersion] = useState<string>("");
  const [notes, setNotes] = useState<string>("");

  // Finalization flow
  const [finalStatus, setFinalStatus] = useState<ExecutionStatus | null>(null);
  const [finalReason, setFinalReason] = useState<string>("");

  // Fail-step flow (optional)
  const [failStepNumber, setFailStepNumber] = useState<number | null>(null);
  const [failStepReason, setFailStepReason] = useState<string>("");

  // Tick for duration display (lightweight)
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!open) return;
    const t = setInterval(() => setTick((x) => x + 1), 15000);
    return () => clearInterval(t);
  }, [open]);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, testCase?.id]);

  async function startOrResume() {
    await onSaveProgress(testCase.id, {
      status: "in_progress",
      test_environment: environment,
      browser,
      os_version: osVersion,
      notes,
    });
  }

  async function saveMetaOnly() {
    await onSaveProgress(testCase.id, {
      test_environment: environment,
      browser,
      os_version: osVersion,
      notes,
    });
  }

  async function toggleStep(stepNumber: number) {
    // If parent wants to own toggle logic, use it:
    if (onToggleStep) {
      onToggleStep(testCase.id, stepNumber);
      return;
    }

    // Otherwise do it locally with onSaveProgress:
    const isCompleted = completed.includes(stepNumber);
    const updated = isCompleted
      ? completed.filter((n) => n !== stepNumber)
      : [...completed, stepNumber];

    await onSaveProgress(testCase.id, {
      completedSteps: updated,
      status: status === "not_run" ? "in_progress" : status,
    });
  }

  async function commitFailStep() {
    if (!failStepNumber) return;

    const nextFailed = [
      ...failedSteps.filter((fs) => fs.step_number !== failStepNumber),
      {
        step_number: failStepNumber,
        failure_reason: failStepReason || "Step failed",
      },
    ];

    await onSaveProgress(testCase.id, {
      failedSteps: nextFailed,
      status: status === "not_run" ? "in_progress" : status,
      test_environment: environment,
      browser,
      os_version: osVersion,
      notes,
    });

    setFailStepNumber(null);
    setFailStepReason("");
  }

  async function finalize(statusToSet: ExecutionStatus) {
    const needsReason =
      statusToSet === "failed" ||
      statusToSet === "blocked" ||
      statusToSet === "skipped";
    const details: ExecutionDetails = {
      notes,
      failure_reason: needsReason ? finalReason : "",
      environment,
      browser,
      os_version: osVersion,
    };

    await onFinalize(testCase.id, statusToSet, details);
    onOpenChange(false);
  }

  function statusIcon(s: ExecutionStatus) {
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
        return <Clock className="h-4 w-4 text-blue-600" />;
      default:
        return <Circle className="h-4 w-4 text-gray-400" />;
    }
  }

  const progressText = `${completed.length}/${steps.length}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="w-[95vw] sm:max-w-4xl lg:max-w-5xl max-h-[90vh] flex flex-col p-0"
        onInteractOutside={(e) => e.preventDefault()}
      >
        {" "}
        <DialogHeader className="p-6 border-b">
          <DialogTitle className="flex items-center gap-2 min-w-0">
            {statusIcon(status)}
            <span className="truncate">Run Test: {testCase.title}</span>
          </DialogTitle>
          <DialogDescription className="flex flex-wrap items-center gap-3">
            <Badge variant="secondary">
              {caseType === "regular" ? "Regular" : "Cross-Platform"}
            </Badge>
            {"test_type" in testCase ? (
              <Badge variant="outline">{testCase.test_type}</Badge>
            ) : null}
            {"platform" in testCase ? (
              <Badge variant="outline">{testCase.platform}</Badge>
            ) : null}
            <span className="text-xs text-muted-foreground">
              Progress: {progressText}
            </span>
            <span className="text-xs text-muted-foreground">
              Duration: {formatDurationMinutes(executionRow?.started_at)}
            </span>
            <span className="text-xs text-muted-foreground">
              Status: {status}
            </span>
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Meta */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Environment</Label>
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
              placeholder="Notes while running..."
            />
          </div>

          {/* Steps */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Steps</h3>
              <Button variant="outline" size="sm" onClick={saveMetaOnly}>
                Save Notes/Meta
              </Button>
            </div>

            {steps.map((s) => {
              const isCompleted = completed.includes(s.stepNumber);
              const failed = failedSteps.find(
                (fs) => fs.step_number === s.stepNumber
              );

              return (
                <div
                  key={s.stepNumber}
                  className={`rounded-lg border p-3 ${
                    failed ? "bg-red-50 border-red-200" : "bg-background"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={isCompleted}
                      onCheckedChange={() => toggleStep(s.stepNumber)}
                      className="mt-1"
                    />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs bg-muted px-2 py-1 rounded">
                          Step {s.stepNumber}
                        </span>
                        <span
                          className={
                            isCompleted
                              ? "line-through text-muted-foreground"
                              : ""
                          }
                        >
                          {s.action}
                        </span>
                      </div>
                      <div className="text-sm text-muted-foreground mt-2 pl-16">
                        <span className="font-semibold">Expected:</span>{" "}
                        {s.expected}
                      </div>

                      {failed ? (
                        <div className="mt-2 ml-16 text-sm text-red-700 bg-red-100 p-2 rounded">
                          <span className="font-semibold">Failed:</span>{" "}
                          {failed.failure_reason}
                        </div>
                      ) : null}
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      className="shrink-0"
                      onClick={() => {
                        setFailStepNumber(s.stepNumber);
                        setFailStepReason(failed?.failure_reason || "");
                      }}
                    >
                      Fail step
                    </Button>
                  </div>

                  {failStepNumber === s.stepNumber ? (
                    <div className="mt-3 ml-8 space-y-2">
                      <Label className="text-sm">Step failure reason</Label>
                      <Textarea
                        value={failStepReason}
                        onChange={(e) => setFailStepReason(e.target.value)}
                        rows={2}
                        placeholder="What failed and why?"
                      />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={commitFailStep}>
                          Save step failure
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setFailStepNumber(null);
                            setFailStepReason("");
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
        {/* Footer */}
        <DialogFooter className="p-6 border-t flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={startOrResume}
              className="gap-2"
              disabled={status === "passed" || status === "failed"}
            >
              <Play className="h-4 w-4" />
              {status === "in_progress" ? "Resume" : "Start"}
            </Button>

            <Button
              variant="ghost"
              onClick={async () => {
                await onReset(testCase.id);
              }}
              className="gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              Reset
            </Button>
          </div>

          <div className="flex flex-col gap-2 sm:items-end">
            {finalStatus &&
            (finalStatus === "failed" ||
              finalStatus === "blocked" ||
              finalStatus === "skipped") ? (
              <div className="w-full sm:w-[420px] space-y-2">
                <Label>
                  {finalStatus === "failed"
                    ? "Failure reason"
                    : finalStatus === "blocked"
                    ? "Blocked reason"
                    : "Skipped reason"}
                </Label>
                <Textarea
                  value={finalReason}
                  onChange={(e) => setFinalReason(e.target.value)}
                  rows={2}
                  placeholder={
                    finalStatus === "failed"
                      ? "Describe what went wrong..."
                      : finalStatus === "blocked"
                      ? "Dependency, env issue, missing access, etc."
                      : "Out of scope, not applicable, etc."
                  }
                />
                <div className="flex gap-2 justify-end">
                  <Button
                    onClick={() => finalize(finalStatus)}
                    disabled={!finalReason.trim()}
                  >
                    Save {finalStatus}
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setFinalStatus(null);
                      setFinalReason("");
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2 justify-end">
                <Button
                  variant="outline"
                  className="gap-2"
                  onClick={() => finalize("passed")}
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Pass
                </Button>

                <Button
                  variant="destructive"
                  className="gap-2"
                  onClick={() => setFinalStatus("failed")}
                >
                  <XCircle className="h-4 w-4" />
                  Fail
                </Button>

                <Button
                  variant="secondary"
                  className="gap-2"
                  onClick={() => setFinalStatus("blocked")}
                >
                  <AlertTriangle className="h-4 w-4" />
                  Block
                </Button>

                <Button
                  variant="outline"
                  className="gap-2"
                  onClick={() => setFinalStatus("skipped")}
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
