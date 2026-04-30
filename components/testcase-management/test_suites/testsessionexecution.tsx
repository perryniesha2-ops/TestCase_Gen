// components/test-management/TestSessionExecution.tsx
"use client";

import { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Play,
  Pause,
  CheckCircle,
  XCircle,
  AlertTriangle,
  SkipForward,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Camera,
  List,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

import type {
  TestSuite,
  TestSession,
  TestAttachment,
} from "@/types/test-cases";
import { ScreenshotUpload } from "../ScreenshotUpload";
import {
  toastSuccess,
  toastError,
  toastWarning,
} from "@/lib/utils/toast-utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface TestCase {
  id: string;
  title: string;
  description: string;
  test_type: string;
  test_steps: Array<{ step_number: number; action: string; expected: string }>;
  expected_result: string;
}

interface SuiteTestCase {
  id: string;
  test_case_id: string | null;
  platform_test_case_id: string | null;
  sequence_order: number;
  priority: string;
  estimated_duration_minutes: number;
  test_cases: TestCase;
}

type ExecutionStatus =
  | "not_run"
  | "in_progress"
  | "passed"
  | "failed"
  | "skipped"
  | "blocked";

interface SessionStats {
  passed: number;
  failed: number;
  blocked: number;
  skipped: number;
}

interface TestSessionExecutionProps {
  suite: TestSuite;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSessionComplete: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function safeJson(res: Response) {
  const text = await res.text().catch(() => "");
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return null;
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export function TestSessionExecution({
  suite,
  open,
  onOpenChange,
  onSessionComplete,
}: TestSessionExecutionProps) {
  const [suiteTestCases, setSuiteTestCases] = useState<SuiteTestCase[]>([]);
  const [currentTestIndex, setCurrentTestIndex] = useState(0);
  const [currentExecutionId, setCurrentExecutionId] = useState<string | null>(
    null,
  );
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [currentSession, setCurrentSession] = useState<TestSession | null>(
    null,
  );

  const [executionNotes, setExecutionNotes] = useState("");
  const [failureReason, setFailureReason] = useState("");
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [autoAdvance, setAutoAdvance] = useState(true);
  const [showEvidenceDrawer, setShowEvidenceDrawer] = useState(false);

  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [testsLoading, setTestsLoading] = useState(false);
  const [isStartingSession, setIsStartingSession] = useState(false);

  const [currentExecutionStatus, setCurrentExecutionStatus] =
    useState<ExecutionStatus | null>(null);
  const [showExecutionDialog, setShowExecutionDialog] = useState(false);
  const [showPauseDialog, setShowPauseDialog] = useState(false);
  const [attachments, setAttachments] = useState<TestAttachment[]>([]);
  const [targetUrl, setTargetUrl] = useState<string>("");

  const dialogRef = useRef<HTMLDivElement>(null);
  const sessionStartedRef = useRef(false);

  const currentTest = suiteTestCases[currentTestIndex] ?? null;
  const totalTests = suiteTestCases.length;
  const completedCount = currentSession?.test_cases_completed ?? 0;
  const progressPercentage = currentSession?.progress_percentage ?? 0;
  const stats: SessionStats = currentSession?.stats ?? {
    passed: 0,
    failed: 0,
    blocked: 0,
    skipped: 0,
  };

  // ── API helpers ───────────────────────────────────────────────────────────

  async function fetchSuiteTestCases(): Promise<SuiteTestCase[]> {
    setTestsLoading(true);
    try {
      const res = await fetch(`/api/test-sessions/suite/${suite.id}/cases`, {
        cache: "no-store",
      });
      const payload = await safeJson(res);
      if (!res.ok)
        throw new Error(payload?.error ?? "Failed to load test cases");
      const cases = payload?.cases ?? [];
      if (cases.length === 0)
        toastWarning("No test cases linked to this suite");
      setSuiteTestCases(cases);
      return cases;
    } catch (error: any) {
      console.error("[TestSessionExecution] fetchSuiteTestCases error:", error);
      toastError("Failed to load test cases for execution");
      setSuiteTestCases([]);
      return [];
    } finally {
      setTestsLoading(false);
    }
  }

  // Both IDs passed explicitly — avoids state timing race
  async function fetchAttachments(executionId: string, sid: string) {
    try {
      const res = await fetch(
        `/api/test-sessions/${sid}/executions/${executionId}/attachments`,
        { cache: "no-store" },
      );
      const payload = await safeJson(res);
      if (res.ok) setAttachments(payload?.attachments ?? []);
      else setAttachments([]);
    } catch {
      setAttachments([]);
    }
  }

  // ── Effects ───────────────────────────────────────────────────────────────

  // Start session when dialog opens.
  // sessionId in deps makes this StrictMode-safe: second invocation sees sessionId
  // already set and just shows the dialog instead of creating a duplicate session.
  useEffect(() => {
    if (!open) {
      sessionStartedRef.current = false;
      return;
    }
    if (sessionId) {
      setShowExecutionDialog(true);
      return;
    }
    if (sessionStartedRef.current) return;
    sessionStartedRef.current = true;
    void startNewSession();
  }, [open, sessionId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      setSessionId(null);
      setCurrentSession(null);
      setIsStartingSession(false);
      sessionStartedRef.current = false;
    };
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    function handleKeyPress(e: KeyboardEvent) {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      )
        return;
      if (!showExecutionDialog) return;
      if (!currentTest || !currentSession || !currentExecutionId) return;
      if (actionLoading) return;
      switch (e.key.toLowerCase()) {
        case "p":
          e.preventDefault();
          void completeTestExecution("passed");
          break;
        case "f":
          e.preventDefault();
          if (!failureReason.trim()) {
            toastError("Please provide a failure reason first");
            return;
          }
          void completeTestExecution("failed");
          break;
        case "b":
          e.preventDefault();
          void completeTestExecution("blocked");
          break;
        case "s":
          e.preventDefault();
          void completeTestExecution("skipped");
          break;
      }
    }
    document.addEventListener("keydown", handleKeyPress);
    return () => document.removeEventListener("keydown", handleKeyPress);
  }, [
    showExecutionDialog,
    currentTest,
    currentSession,
    currentExecutionId,
    actionLoading,
    failureReason,
  ]);

  useEffect(() => {
    if (showExecutionDialog && dialogRef.current) dialogRef.current.focus();
  }, [showExecutionDialog]);

  // ── Session management ────────────────────────────────────────────────────

  async function startNewSession() {
    if (isStartingSession) return;
    if (sessionId) {
      setShowExecutionDialog(true);
      return;
    }

    try {
      setIsStartingSession(true);
      setLoading(true);

      const tests = await fetchSuiteTestCases();
      if (!tests || tests.length === 0) {
        onOpenChange(false);
        return;
      }

      const res = await fetch("/api/test-sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          suite_id: suite.id,
          name: `${suite.name} - ${new Date().toLocaleString()}`,
          test_cases_total: tests.length,
        }),
      });
      const payload = await safeJson(res);
      if (!res.ok)
        throw new Error(payload?.error ?? "Failed to create session");

      const session: TestSession = payload.session;
      setSessionId(session.id);
      setCurrentSession(session);
      setCurrentTestIndex(0);
      setCompletedSteps(new Set());
      setExecutionNotes("");
      setFailureReason("");
      setCurrentExecutionStatus("in_progress");
      setShowExecutionDialog(true);

      await startTestExecutionWithTestCase(tests[0], session.id);
      toastSuccess("Test session started");
    } catch (error: any) {
      console.error("[TestSessionExecution] startNewSession error:", error);
      toastError("Failed to start test session");
      onOpenChange(false);
      sessionStartedRef.current = false;
    } finally {
      setLoading(false);
      setIsStartingSession(false);
    }
  }

  async function startTestExecution(
    index: number,
    currentSessionId: string | null,
  ) {
    const testCase = suiteTestCases[index];
    if (!testCase || !currentSessionId) return;
    await startTestExecutionWithTestCase(testCase, currentSessionId);
  }

  async function startTestExecutionWithTestCase(
    testCase: SuiteTestCase,
    currentSessionId: string,
  ) {
    try {
      const isRegular = !!testCase.test_case_id;
      const actualTestCaseId =
        testCase.test_case_id || testCase.platform_test_case_id;

      // Check for existing execution in this session
      const qs = new URLSearchParams({
        testCaseId: actualTestCaseId!,
        isRegular: String(isRegular),
      });
      const getRes = await fetch(
        `/api/test-sessions/${currentSessionId}/executions?${qs.toString()}`,
        { cache: "no-store" },
      );
      const getPayload = await safeJson(getRes);

      if (getRes.ok && getPayload?.execution) {
        // Resume existing — call fetchAttachments directly with known IDs
        const existing = getPayload.execution;
        setCurrentExecutionId(existing.id);
        setExecutionNotes(existing.execution_notes || "");
        setFailureReason(existing.failure_reason || "");
        setCompletedSteps(
          new Set<number>(
            Array.isArray(existing.completed_steps)
              ? existing.completed_steps
              : [],
          ),
        );
        setCurrentExecutionStatus(existing.execution_status as ExecutionStatus);
        void fetchAttachments(existing.id, currentSessionId);
        return;
      }

      // Create new execution
      const postRes = await fetch(
        `/api/test-sessions/${currentSessionId}/executions`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            test_case_id: isRegular ? actualTestCaseId : null,
            platform_test_case_id: isRegular ? null : actualTestCaseId,
            suite_id: suite.id,
          }),
        },
      );
      const postPayload = await safeJson(postRes);
      if (!postRes.ok)
        throw new Error(postPayload?.error ?? "Failed to create execution");

      // Set state and fetch attachments with known IDs — no effect needed
      const newExecutionId = postPayload.executionId;
      setCurrentExecutionId(newExecutionId);
      setExecutionNotes("");
      setFailureReason("");
      setCompletedSteps(new Set());
      setCurrentExecutionStatus("in_progress");
      void fetchAttachments(newExecutionId, currentSessionId);
    } catch (error: any) {
      console.error(
        "[TestSessionExecution] startTestExecutionWithTestCase error:",
        error,
      );
      toastError("Failed to start test execution");
    }
  }

  async function completeTestExecution(status: ExecutionStatus) {
    if (!currentExecutionId || !currentSession || !currentTest) return;
    if (actionLoading) return;
    if (!["passed", "failed", "skipped", "blocked"].includes(status)) return;
    if (status === "failed" && !failureReason.trim()) {
      toastError("Please provide a failure reason");
      return;
    }

    setActionLoading(true);
    try {
      const execRes = await fetch(
        `/api/test-sessions/${currentSession.id}/executions/${currentExecutionId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            execution_status: status,
            execution_notes: executionNotes || null,
            failure_reason: status === "failed" ? failureReason || null : null,
            completed_steps: Array.from(completedSteps),
            test_case_id: currentTest.test_case_id || null,
            platform_test_case_id: currentTest.platform_test_case_id || null,
          }),
        },
      );
      const execPayload = await safeJson(execRes);
      if (!execRes.ok)
        throw new Error(execPayload?.error ?? "Failed to update execution");

      setCurrentExecutionStatus(status);

      const newCompleted = completedCount + 1;
      const newProgress = Math.round((newCompleted / totalTests) * 100);
      const newStats: SessionStats = { ...stats };
      if (status === "passed") newStats.passed++;
      if (status === "failed") newStats.failed++;
      if (status === "blocked") newStats.blocked++;
      if (status === "skipped") newStats.skipped++;

      const sessionRes = await fetch(
        `/api/test-sessions/${currentSession.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            test_cases_completed: newCompleted,
            progress_percentage: newProgress,
            status: newProgress === 100 ? "completed" : "in_progress",
            passed_cases: newStats.passed,
            failed_cases: newStats.failed,
            blocked_cases: newStats.blocked,
            skipped_cases: newStats.skipped,
            ...(newProgress === 100 && {
              actual_end: new Date().toISOString(),
            }),
          }),
        },
      );
      if (!sessionRes.ok) {
        const p = await safeJson(sessionRes);
        throw new Error(p?.error ?? "Failed to update session");
      }

      const updatedSession: TestSession = {
        ...currentSession,
        test_cases_completed: newCompleted,
        progress_percentage: newProgress,
        stats: newStats,
      };
      setCurrentSession(updatedSession);
      toastSuccess(`Test ${status}`);

      if (newProgress === 100) {
        await completeSession();
      } else if (autoAdvance && currentTestIndex < totalTests - 1) {
        const nextIndex = currentTestIndex + 1;
        setCurrentTestIndex(nextIndex);
        await startTestExecution(nextIndex, updatedSession.id);
      }
    } catch (error: any) {
      console.error(
        "[TestSessionExecution] completeTestExecution error:",
        error,
      );
      toastError("Failed to complete test execution");
    } finally {
      setActionLoading(false);
    }
  }

  // ── Session lifecycle ─────────────────────────────────────────────────────

  async function updateSessionStatus(
    status: "completed" | "aborted" | "paused",
  ) {
    if (!currentSession) return;
    const res = await fetch(`/api/test-sessions/${currentSession.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status,
        ...(status !== "paused" && { actual_end: new Date().toISOString() }),
      }),
    });
    if (!res.ok) {
      const p = await safeJson(res);
      throw new Error(p?.error ?? `Failed to ${status} session`);
    }
  }

  async function completeSession() {
    if (!currentSession) return;
    try {
      await updateSessionStatus("completed");
      toastSuccess("Test session completed!");
      setShowExecutionDialog(false);
      setSessionId(null);
      setCurrentSession(null);
      sessionStartedRef.current = false;
      onSessionComplete();
      onOpenChange(false);
    } catch {
      toastError("Failed to complete session");
    }
  }

  async function abortSession() {
    if (!currentSession) return;
    try {
      await updateSessionStatus("aborted");
      toastSuccess("Test session aborted");
      setShowExecutionDialog(false);
      setSessionId(null);
      setCurrentSession(null);
      sessionStartedRef.current = false;
      onSessionComplete();
      onOpenChange(false);
    } catch {
      toastError("Failed to abort session");
    }
  }

  async function pauseSession() {
    if (!currentSession) return;
    try {
      await updateSessionStatus("paused");
      toastSuccess("Session paused");
      setShowExecutionDialog(false);
      sessionStartedRef.current = false;
      onOpenChange(false);
    } catch {
      toastError("Failed to pause session");
    }
  }

  async function endSession() {
    if (!currentSession) return;
    if (currentSession.progress_percentage === 100) await completeSession();
    else await abortSession();
  }

  function toggleStep(stepIndex: number) {
    setCompletedSteps((prev) => {
      const next = new Set(prev);
      next.has(stepIndex) ? next.delete(stepIndex) : next.add(stepIndex);
      return next;
    });
  }

  const isResultActionDisabled =
    !currentSession || !currentExecutionId || actionLoading || testsLoading;

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <>
      <Dialog
        open={showExecutionDialog}
        onOpenChange={(openValue) => {
          if (!openValue && currentSession?.status === "in_progress") {
            setShowPauseDialog(true);
          } else {
            setShowExecutionDialog(false);
            onOpenChange(false);
          }
        }}
      >
        <DialogContent
          ref={dialogRef}
          tabIndex={-1}
          className="w-[95vw] sm:max-w-[95vw] lg:max-w-5xl h-[95vh] max-h-[95vh] flex flex-col p-0 overflow-hidden"
        >
          <DialogHeader className="px-6 pt-6 pb-4 border-b flex-shrink-0">
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Play className="h-5 w-5" />
              Test Session: {suite.name}
            </DialogTitle>
            <DialogDescription>
              Session Progress: {progressPercentage}% — {completedCount} of{" "}
              {totalTests} tests complete
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
            {testsLoading && suiteTestCases.length === 0 ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="ml-3 text-muted-foreground">
                  Loading test cases...
                </span>
              </div>
            ) : (
              <>
                {/* Progress Card */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Session Progress</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Progress value={progressPercentage} className="mb-4 h-3" />
                    <div className="grid grid-cols-5 gap-4 text-center">
                      <div>
                        <div className="text-2xl font-bold text-green-500">
                          {stats.passed}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Passed
                        </div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-red-500">
                          {stats.failed}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Failed
                        </div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-orange-600">
                          {stats.blocked}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Blocked
                        </div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-gray-600">
                          {stats.skipped}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Skipped
                        </div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold">
                          {totalTests - completedCount}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Remaining
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Action Buttons Row */}
                <div className="flex gap-2 justify-end">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="gap-2">
                        <List className="h-4 w-4" />
                        Test Queue ({currentTestIndex + 1}/{totalTests})
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80" align="end">
                      <div className="space-y-2">
                        <h4 className="font-medium text-sm mb-3">Test Queue</h4>
                        <div className="max-h-[400px] overflow-y-auto space-y-2">
                          {suiteTestCases.map((testCase, index) => {
                            const isCurrent = index === currentTestIndex;
                            const isCompleted = index < completedCount;
                            return (
                              <button
                                key={testCase.id}
                                type="button"
                                onClick={async () => {
                                  if (
                                    !currentSession ||
                                    index === currentTestIndex
                                  )
                                    return;
                                  setCurrentTestIndex(index);
                                  await startTestExecution(
                                    index,
                                    currentSession.id,
                                  );
                                }}
                                className={`w-full text-left p-3 rounded-lg border transition-colors text-sm ${
                                  isCurrent
                                    ? "bg-primary/10 border-primary/70 font-medium"
                                    : isCompleted
                                      ? "bg-emerald-500/10 border-emerald-500/60"
                                      : "bg-muted/40 border-border/60 hover:bg-muted/60"
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  <span className="font-mono text-xs text-muted-foreground">
                                    {index + 1}
                                  </span>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs font-medium truncate">
                                      {testCase.test_cases.title}
                                    </p>
                                    <p className="text-[10px] uppercase text-muted-foreground mt-0.5">
                                      {testCase.test_cases.test_type}
                                    </p>
                                  </div>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>

                  <Button
                    variant="outline"
                    className="gap-2"
                    onClick={() => setShowEvidenceDrawer(true)}
                  >
                    <Camera className="h-4 w-4" />
                    Evidence & Screenshots
                    {attachments.length > 0 && (
                      <Badge variant="secondary" className="ml-1">
                        {attachments.length}
                      </Badge>
                    )}
                  </Button>
                </div>

                {/* Current Test */}
                {currentTest && currentSession ? (
                  <Card>
                    <CardHeader>
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-lg break-words">
                            {currentTest.test_cases.title}
                          </CardTitle>
                          <CardDescription className="text-sm mt-1">
                            Test {currentTestIndex + 1} of {totalTests} ·{" "}
                            {currentTest.test_cases.test_type}
                          </CardDescription>
                        </div>
                        <Badge variant="outline" className="flex-shrink-0">
                          {currentTest.priority}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div>
                        <h4 className="font-medium mb-2">Description</h4>
                        <p className="text-sm text-muted-foreground break-words">
                          {currentTest.test_cases.description}
                        </p>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-medium">Test Steps</h4>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              const allSteps =
                                currentTest.test_cases.test_steps || [];
                              if (completedSteps.size === allSteps.length)
                                setCompletedSteps(new Set());
                              else
                                setCompletedSteps(
                                  new Set(allSteps.map((_, idx) => idx)),
                                );
                            }}
                          >
                            Toggle All
                          </Button>
                        </div>
                        {!currentTest.test_cases.test_steps ||
                        currentTest.test_cases.test_steps.length === 0 ? (
                          <div className="text-sm text-muted-foreground border border-dashed rounded-lg p-4">
                            No test steps defined for this test case.
                          </div>
                        ) : (
                          <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                            {currentTest.test_cases.test_steps.map(
                              (step, index) => (
                                <div
                                  key={index}
                                  className="flex items-start gap-3 p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                                >
                                  <Checkbox
                                    checked={completedSteps.has(index)}
                                    onCheckedChange={() => toggleStep(index)}
                                    className="mt-1"
                                  />
                                  <div className="flex-1 min-w-0 space-y-2">
                                    <div className="flex items-start gap-2">
                                      <Badge
                                        variant="outline"
                                        className="text-xs font-mono shrink-0"
                                      >
                                        Step {step.step_number || index + 1}
                                      </Badge>
                                      <p
                                        className={`text-sm font-medium break-words ${completedSteps.has(index) ? "line-through text-muted-foreground" : ""}`}
                                      >
                                        {step.action}
                                      </p>
                                    </div>
                                    <p className="text-xs text-muted-foreground break-words">
                                      <span className="font-semibold">
                                        Expected:{" "}
                                      </span>
                                      {step.expected}
                                    </p>
                                  </div>
                                </div>
                              ),
                            )}
                          </div>
                        )}
                      </div>

                      <div>
                        <h4 className="font-medium mb-2">Expected Result</h4>
                        <div className="bg-muted p-3 rounded-lg">
                          <p className="text-sm text-muted-foreground break-words">
                            {currentTest.test_cases.expected_result}
                          </p>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="execution-notes">Execution Notes</Label>
                        <Textarea
                          id="execution-notes"
                          value={executionNotes}
                          onChange={(e) => setExecutionNotes(e.target.value)}
                          placeholder="Add notes about the test execution..."
                          rows={3}
                          className="resize-none"
                        />
                      </div>

                      <div className="space-y-3">
                        <Label>Test Result</Label>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            onClick={() => completeTestExecution("passed")}
                            disabled={isResultActionDisabled}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            {actionLoading ? (
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                              <CheckCircle className="h-4 w-4 mr-2" />
                            )}
                            Pass (P)
                          </Button>
                          <Button
                            onClick={() => completeTestExecution("failed")}
                            disabled={
                              isResultActionDisabled || !failureReason.trim()
                            }
                            variant="destructive"
                          >
                            {actionLoading ? (
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                              <XCircle className="h-4 w-4 mr-2" />
                            )}
                            Fail (F)
                          </Button>
                          <Button
                            onClick={() => completeTestExecution("blocked")}
                            disabled={isResultActionDisabled}
                            variant="outline"
                            className="text-orange-600"
                          >
                            {actionLoading ? (
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                              <AlertTriangle className="h-4 w-4 mr-2" />
                            )}
                            Blocked (B)
                          </Button>
                          <Button
                            onClick={() => completeTestExecution("skipped")}
                            disabled={isResultActionDisabled}
                            variant="outline"
                          >
                            {actionLoading ? (
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                              <SkipForward className="h-4 w-4 mr-2" />
                            )}
                            Skip (S)
                          </Button>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="failure-reason">
                            Failure Reason (required for Fail)
                          </Label>
                          <Textarea
                            id="failure-reason"
                            value={failureReason}
                            onChange={(e) => setFailureReason(e.target.value)}
                            placeholder="Describe what went wrong..."
                            rows={2}
                            className="resize-none"
                          />
                        </div>

                        <div className="flex items-center gap-2">
                          <Checkbox
                            id="auto-advance"
                            checked={autoAdvance}
                            onCheckedChange={(checked) =>
                              setAutoAdvance(!!checked)
                            }
                          />
                          <Label
                            htmlFor="auto-advance"
                            className="text-sm font-normal cursor-pointer"
                          >
                            Auto-advance to next test after marking result
                          </Label>
                        </div>

                        <div className="text-xs text-muted-foreground pt-2 border-t">
                          <strong>Keyboard Shortcuts:</strong>{" "}
                          <kbd className="px-1.5 py-0.5 bg-muted rounded">
                            P
                          </kbd>{" "}
                          Pass ·{" "}
                          <kbd className="px-1.5 py-0.5 bg-muted rounded">
                            F
                          </kbd>{" "}
                          Fail ·{" "}
                          <kbd className="px-1.5 py-0.5 bg-muted rounded">
                            B
                          </kbd>{" "}
                          Block ·{" "}
                          <kbd className="px-1.5 py-0.5 bg-muted rounded">
                            S
                          </kbd>{" "}
                          Skip
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold">
                        Session Complete!
                      </h3>
                      <p className="text-muted-foreground">
                        All test cases executed.
                      </p>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </div>

          <DialogFooter className="px-6 py-4 border-t flex-shrink-0 flex justify-between">
            <Button variant="outline" onClick={() => setShowPauseDialog(true)}>
              <Pause className="h-4 w-4 mr-2" />
              Pause Session
            </Button>
            <div className="flex gap-2">
              <Button
                variant="outline"
                disabled={currentTestIndex === 0 || !currentSession}
                onClick={async () => {
                  if (!currentSession || currentTestIndex === 0) return;
                  const prevIndex = currentTestIndex - 1;
                  setCurrentTestIndex(prevIndex);
                  await startTestExecution(prevIndex, currentSession.id);
                }}
              >
                <ChevronLeft className="h-4 w-4 mr-2" />
                Previous
              </Button>
              <Button
                variant="outline"
                disabled={!currentSession || currentTestIndex >= totalTests - 1}
                onClick={async () => {
                  if (!currentSession || currentTestIndex >= totalTests - 1)
                    return;
                  const nextIndex = currentTestIndex + 1;
                  setCurrentTestIndex(nextIndex);
                  await startTestExecution(nextIndex, currentSession.id);
                }}
              >
                Next
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
              <Button variant="destructive" onClick={() => void endSession()}>
                <XCircle className="h-4 w-4 mr-2" />
                End Session
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Evidence Drawer */}
      <Sheet open={showEvidenceDrawer} onOpenChange={setShowEvidenceDrawer}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-2xl overflow-y-auto p-0"
        >
          <div className="p-6 sm:p-8">
            <SheetHeader className="space-y-3">
              <SheetTitle className="flex items-center gap-2">
                <Camera className="h-5 w-5" />
                Test Evidence & Screenshots
              </SheetTitle>
              <SheetDescription>
                Capture or upload screenshots as evidence for the current test
              </SheetDescription>
            </SheetHeader>
            <div className="mt-8 space-y-6" />
            {currentTest && (
              <div className="pt-6">
                <p className="text-sm font-medium">Current Test</p>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {currentTest.test_cases.title}
                </p>
                <Badge variant="outline" className="text-xs">
                  Test {currentTestIndex + 1} of {totalTests}
                </Badge>
              </div>
            )}
            <div className="h-4" />
            <div className="space-y-2">
              <Label
                htmlFor="target-url-drawer"
                className="text-sm font-medium"
              >
                Target URL
              </Label>
              <p className="text-xs text-muted-foreground">
                Enter the site you are testing. Use the extension to capture
                evidence from that page.
              </p>
            </div>
            <div className="flex gap-2">
              <Input
                id="target-url-drawer"
                placeholder="https://app.example.com/login"
                value={targetUrl}
                onChange={(e) => setTargetUrl(e.target.value)}
                className="h-10 flex-1 max-w-lg"
              />
            </div>
          </div>
          {currentExecutionId && currentTest && (
            <div className="pt-2">
              <ScreenshotUpload
                executionId={currentExecutionId}
                testCaseId={currentTest.test_case_id || undefined}
                platformTestCaseId={
                  currentTest.platform_test_case_id || undefined
                }
                attachments={attachments}
                targetUrl={targetUrl}
                onUploadComplete={(attachment) =>
                  setAttachments((prev) => [attachment, ...prev])
                }
                onDeleteAttachment={(attachmentId) =>
                  setAttachments((prev) =>
                    prev.filter((a) => a.id !== attachmentId),
                  )
                }
              />
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Pause Dialog */}
      <Dialog open={showPauseDialog} onOpenChange={setShowPauseDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>End Test Session?</DialogTitle>
            <DialogDescription>
              You can pause to resume later, or abort to end the session
              permanently.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => setShowPauseDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                void pauseSession();
                setShowPauseDialog(false);
              }}
            >
              <Pause className="h-4 w-4 mr-2" />
              Pause Session
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                void abortSession();
                setShowPauseDialog(false);
              }}
            >
              <XCircle className="h-4 w-4 mr-2" />
              Abort Session
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
