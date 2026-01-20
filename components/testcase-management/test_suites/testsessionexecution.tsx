// components/test-management/TestSessionExecution.tsx
// FIXED VERSION - All UI issues resolved
"use client";

import { useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Play,
  Pause,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  SkipForward,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from "lucide-react";

// Import your types
import type {
  TestSuite,
  TestSession,
  TestAttachment,
} from "@/types/test-cases";
import { ScreenshotUpload } from "../ScreenshotUpload";
import { ExtensionRequiredCallout } from "@/components/extensions/extensionrequiredcallout";
import { detectExtensionInstalled } from "@/lib/extensions/detectExtension";

interface TestCase {
  id: string;
  title: string;
  description: string;
  test_type: string;
  test_steps: Array<{
    step_number: number;
    action: string;
    expected: string;
  }>;
  expected_result: string;
}

interface SuiteTestCase {
  id: string;
  test_case_id: string;
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

export function TestSessionExecution({
  suite,
  open,
  onOpenChange,
  onSessionComplete,
}: TestSessionExecutionProps) {
  // State
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

  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [testsLoading, setTestsLoading] = useState(false);

  const [currentExecutionStatus, setCurrentExecutionStatus] =
    useState<ExecutionStatus | null>(null);
  const [isCurrentExecutionReadOnly, setIsCurrentExecutionReadOnly] =
    useState(false);

  const [showExecutionDialog, setShowExecutionDialog] = useState(false);
  const [showPauseDialog, setShowPauseDialog] = useState(false);
  const [attachments, setAttachments] = useState<TestAttachment[]>([]);
  const [targetUrl, setTargetUrl] = useState<string>("");

  // Refs
  const dialogRef = useRef<HTMLDivElement>(null);

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

  const [extensionInstalled, setExtensionInstalled] = useState<boolean>(true);
  <ExtensionRequiredCallout
    docHref="/guides/browser-extension"
    onDetected={(ok) => setExtensionInstalled(ok)}
  />;

  // Fetch test cases when suite changes
  useEffect(() => {
    if (!suite.id) return;
    void fetchSuiteTestCases();
  }, [suite.id]);

  // When parent sets open=true, start session
  useEffect(() => {
    if (!open) return;
    void startNewSession();
  }, [open]);

  useEffect(() => {
    if (currentExecutionId) {
      fetchAttachments(currentExecutionId);
    }
  }, [currentExecutionId]);

  // ✅ FIX: Improved keyboard shortcuts
  useEffect(() => {
    function handleKeyPress(e: KeyboardEvent) {
      // Ignore if typing in input/textarea
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      // Only work when execution dialog is open
      if (!showExecutionDialog) return;

      // Check required state
      if (!currentTest || !currentSession || !currentExecutionId) return;

      // Don't allow on read-only executions
      if (isCurrentExecutionReadOnly || actionLoading) return;

      switch (e.key.toLowerCase()) {
        case "p":
          e.preventDefault();
          void completeTestExecution("passed");
          break;
        case "f":
          e.preventDefault();
          if (!failureReason.trim()) {
            toast.error("Please provide a failure reason first");
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
        default:
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
    isCurrentExecutionReadOnly,
    actionLoading,
    failureReason,
  ]);

  // Focus dialog when opened
  useEffect(() => {
    if (showExecutionDialog && dialogRef.current) {
      dialogRef.current.focus();
    }
  }, [showExecutionDialog]);

  async function fetchSuiteTestCases(): Promise<SuiteTestCase[]> {
    setTestsLoading(true);
    try {
      const supabase = createClient();

      // First, get the test_suite_cases
      const { data: suiteLinks, error: linksError } = await supabase
        .from("test_suite_cases")
        .select(
          "id, test_case_id, sequence_order, priority, estimated_duration_minutes",
        )
        .eq("suite_id", suite.id)
        .order("sequence_order");

      if (linksError) {
        console.error("❌ Error fetching suite links:", linksError);
        throw linksError;
      }

      if (!suiteLinks || suiteLinks.length === 0) {
        console.warn("⚠️ No test cases linked to this suite");
        setSuiteTestCases([]);
        return [];
      }

      // Now fetch each test case individually with its steps
      const testCaseIds = suiteLinks.map((link) => link.test_case_id);

      const { data: testCases, error: testCasesError } = await supabase
        .from("test_cases")
        .select(
          "id, title, description, test_type, test_steps, expected_result",
        )
        .in("id", testCaseIds);

      if (testCasesError) {
        console.error("❌ Error fetching test cases:", testCasesError);
        throw testCasesError;
      }

      // Create a map of test cases by ID for quick lookup
      const testCaseMap = new Map((testCases || []).map((tc) => [tc.id, tc]));

      // Combine suite links with test case data
      const transformed: SuiteTestCase[] = suiteLinks
        .map((link, mapIndex) => {
          const testCase = testCaseMap.get(link.test_case_id);

          if (!testCase) {
            console.warn(`⚠️ Test case ${link.test_case_id} not found`);
            return null;
          }

          let normalizedSteps: Array<{
            step_number: number;
            action: string;
            expected: string;
          }> = [];

          if (testCase?.test_steps) {
            // If it's a string (JSON), parse it
            if (typeof testCase.test_steps === "string") {
              try {
                normalizedSteps = JSON.parse(testCase.test_steps);
              } catch (e) {
                normalizedSteps = [];
              }
            }
            // If it's already an array, use it
            else if (Array.isArray(testCase.test_steps)) {
              normalizedSteps = testCase.test_steps;
            }
            // If it's an object (PostgreSQL array format), convert to array
            else if (typeof testCase.test_steps === "object") {
              normalizedSteps = Object.values(testCase.test_steps);
            }
          } else {
          }

          return {
            id: link.id,
            test_case_id: link.test_case_id,
            sequence_order: link.sequence_order,
            priority: link.priority,
            estimated_duration_minutes: link.estimated_duration_minutes,
            test_cases: {
              ...testCase,
              test_steps: normalizedSteps,
            },
          };
        })
        .filter((item): item is SuiteTestCase => item !== null);

      setSuiteTestCases(transformed);
      return transformed;
    } catch (error) {
      console.error("Error fetching suite test cases:", error);
      toast.error("Failed to load test cases for execution");
      setSuiteTestCases([]);
      return [];
    } finally {
      setTestsLoading(false);
    }
  }

  async function fetchAttachments(executionId: string) {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("test_attachments")
      .select("*")
      .eq("execution_id", executionId)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setAttachments(data);
    }

    setAttachments((data ?? []) as TestAttachment[]);
  }

  async function startNewSession() {
    try {
      setLoading(true);
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        console.error("❌ No user found");
        toast.error("Please log in to start a test session");
        return;
      }

      const tests = await fetchSuiteTestCases();

      if (!tests || tests.length === 0) {
        onOpenChange(false);
        return;
      }

      const { data, error } = await supabase
        .from("test_run_sessions")
        .insert({
          user_id: user.id,
          suite_id: suite.id,
          name: `${suite.name} - ${new Date().toLocaleString()}`,
          status: "in_progress",
          environment: "staging",
          actual_start: new Date().toISOString(),
          test_cases_total: tests.length,
          test_cases_completed: 0,
          progress_percentage: 0,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) {
        console.error("❌ Error creating session:", error);
        throw error;
      }

      const session: TestSession = {
        ...data,
        stats: { passed: 0, failed: 0, blocked: 0, skipped: 0 },
      };

      setSessionId(session.id);
      setCurrentSession(session);
      setCurrentTestIndex(0);
      setCompletedSteps(new Set());
      setExecutionNotes("");
      setFailureReason("");
      setCurrentExecutionStatus("in_progress");
      setIsCurrentExecutionReadOnly(false);
      setShowExecutionDialog(true);

      await startTestExecutionWithTestCase(tests[0], session.id);

      toast.success("Test session started");
    } catch (error) {
      toast.error("Failed to start test session");
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  }

  async function startTestExecution(
    index: number,
    currentSessionId: string | null,
  ) {
    const testCase = suiteTestCases[index];
    if (!testCase || !currentSessionId) {
      console.error("❌ startTestExecution: Missing testCase or sessionId", {
        index,
        testCase: !!testCase,
        currentSessionId,
        suiteTestCasesLength: suiteTestCases.length,
      });
      return;
    }

    await startTestExecutionWithTestCase(testCase, currentSessionId);
  }

  async function startTestExecutionWithTestCase(
    testCase: SuiteTestCase,
    currentSessionId: string,
  ) {
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        return;
      }

      // Check if execution already exists for this session + test case
      const { data: existing, error: existingError } = await supabase
        .from("test_executions")
        .select(
          "id, execution_status, execution_notes, failure_reason, completed_steps",
        )
        .eq("session_id", currentSessionId)
        .eq("test_case_id", testCase.test_case_id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existingError) {
        console.error("❌ Error checking existing execution:", existingError);
        throw existingError;
      }

      if (existing) {
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
        setIsCurrentExecutionReadOnly(
          existing.execution_status !== "in_progress",
        );
        return;
      }

      const { data: created, error: createError } = await supabase
        .from("test_executions")
        .insert({
          test_case_id: testCase.test_case_id,
          suite_id: suite.id,
          session_id: currentSessionId,
          executed_by: user.id,
          execution_status: "in_progress",
          started_at: new Date().toISOString(),
          completed_steps: [],
          failed_steps: [],
          execution_notes: null,
          failure_reason: null,
        })
        .select()
        .single();

      if (createError) {
        console.error("❌ Error creating execution:", createError);
        throw createError;
      }

      setCurrentExecutionId(created.id);
      setExecutionNotes("");
      setFailureReason("");
      setCompletedSteps(new Set());
      setCurrentExecutionStatus("in_progress");
      setIsCurrentExecutionReadOnly(false);
    } catch (error) {
      toast.error("Failed to start test execution");
    }
  }

  // ✅ FIX: Improved completeTestExecution with better state management
  async function completeTestExecution(status: ExecutionStatus) {
    // Validate all required state
    if (!currentExecutionId || !currentSession || !currentTest) {
      return;
    }

    if (isCurrentExecutionReadOnly) {
      return;
    }

    if (actionLoading) {
      return;
    }

    if (!["passed", "failed", "skipped", "blocked"].includes(status)) {
      return;
    }

    // Validate failure reason for failed tests
    if (status === "failed" && !failureReason.trim()) {
      toast.error("Please provide a failure reason");
      return;
    }

    setActionLoading(true);
    try {
      const supabase = createClient();
      const completedStepsArray = Array.from(completedSteps);

      const { error } = await supabase
        .from("test_executions")
        .update({
          execution_status: status,
          completed_at: new Date().toISOString(),
          execution_notes: executionNotes || null,
          failure_reason: status === "failed" ? failureReason || null : null,
          completed_steps: completedStepsArray,
        })
        .eq("id", currentExecutionId);

      if (error) throw error;

      const newCompleted = completedCount + 1;
      const newProgress = Math.round((newCompleted / totalTests) * 100);

      // ✅ Calculate new stats FIRST
      const newStats: SessionStats = { ...stats };
      if (status === "passed") newStats.passed++;
      if (status === "failed") newStats.failed++;
      if (status === "blocked") newStats.blocked++;
      if (status === "skipped") newStats.skipped++;

      // ✅ Save stats to database
      await supabase
        .from("test_run_sessions")
        .update({
          test_cases_completed: newCompleted,
          progress_percentage: newProgress,
          status: newProgress === 100 ? "completed" : "in_progress",
          actual_end: newProgress === 100 ? new Date().toISOString() : null,
          // ✅ ADD THESE LINES:
          passed_cases: newStats.passed,
          failed_cases: newStats.failed,
          blocked_cases: newStats.blocked,
          skipped_cases: newStats.skipped,
        })
        .eq("id", currentSession.id);

      const updatedSession: TestSession = {
        ...currentSession,
        test_cases_completed: newCompleted,
        progress_percentage: newProgress,
        stats: newStats,
      };

      setCurrentSession(updatedSession);
      setCurrentExecutionStatus(status);
      setIsCurrentExecutionReadOnly(true);

      toast.success(`Test ${status}`);

      // Reset form
      setExecutionNotes("");
      setFailureReason("");
      setCompletedSteps(new Set());

      if (newProgress === 100) {
        await completeSession();
      } else if (autoAdvance && currentTestIndex < totalTests - 1) {
        const nextIndex = currentTestIndex + 1;
        setCurrentTestIndex(nextIndex);
        await startTestExecution(nextIndex, updatedSession.id);
      }
    } catch (error) {
      console.error("Error completing test execution:", error);
      toast.error("Failed to complete test execution");
    } finally {
      setActionLoading(false);
    }
  }

  async function completeSession() {
    if (!currentSession) return;
    try {
      const supabase = createClient();

      await supabase
        .from("test_run_sessions")
        .update({
          status: "completed",
          actual_end: new Date().toISOString(),
        })
        .eq("id", currentSession.id);

      toast.success("Test session completed!");
      setShowExecutionDialog(false);
      onSessionComplete();
      onOpenChange(false);
    } catch (error) {
      console.error("Error completing session:", error);
      toast.error("Failed to complete session");
    }
  }

  async function pauseSession() {
    if (!currentSession) return;
    try {
      const supabase = createClient();
      await supabase
        .from("test_run_sessions")
        .update({ status: "paused" })
        .eq("id", currentSession.id);

      toast.success("Session paused");
      setShowExecutionDialog(false);
      onOpenChange(false);
    } catch (error) {
      console.error("Error pausing session:", error);
      toast.error("Failed to pause session");
    }
  }

  function toggleStep(stepIndex: number) {
    if (isCurrentExecutionReadOnly) return;
    setCompletedSteps((prev) => {
      const next = new Set(prev);
      if (next.has(stepIndex)) {
        next.delete(stepIndex);
      } else {
        next.add(stepIndex);
      }
      return next;
    });
  }

  const isResultActionDisabled =
    !currentSession ||
    !currentExecutionId ||
    isCurrentExecutionReadOnly ||
    actionLoading ||
    testsLoading;

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
          className="
            w-[95vw]
            sm:max-w-[95vw]
            lg:max-w-[1200px]
            h-[95vh]
            max-h-[95vh]
            flex
            flex-col
            p-0
            overflow-hidden
          "
        >
          {/* ✅ FIX: Fixed header */}
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

          {/* ✅ FIX: Scrollable body with proper padding */}
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

                {/* ✅ FIX: Two-column layout with proper overflow */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Current Test (2/3 width) */}
                  <div className="lg:col-span-2">
                    {currentTest && currentSession ? (
                      <Card>
                        <CardHeader>
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <CardTitle className="text-lg break-words">
                                {currentTest.test_cases.title}
                              </CardTitle>
                              <CardDescription className="text-sm mt-1">
                                Test {currentTestIndex + 1} of {totalTests} •{" "}
                                {currentTest.test_cases.test_type}
                              </CardDescription>
                            </div>
                            <Badge variant="outline" className="flex-shrink-0">
                              {currentTest.priority}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-6">
                          {/* Read-only warning */}
                          {isCurrentExecutionReadOnly &&
                            currentExecutionStatus !== "in_progress" && (
                              <Alert className="border-amber-300 bg-amber-50">
                                <AlertTriangle className="h-4 w-4 text-amber-600" />
                                <AlertTitle className="text-amber-900">
                                  Result Locked
                                </AlertTitle>
                                <AlertDescription className="text-amber-800 text-xs">
                                  This test was marked as{" "}
                                  <span className="font-semibold uppercase">
                                    {currentExecutionStatus}
                                  </span>
                                  . Use Previous/Next to navigate.
                                </AlertDescription>
                              </Alert>
                            )}

                          {/* Description */}
                          <div>
                            <h4 className="font-medium mb-2">Description</h4>
                            <p className="text-sm text-muted-foreground break-words">
                              {currentTest.test_cases.description}
                            </p>
                          </div>

                          {/* ✅ FIX: Test Steps with proper overflow */}
                          <div>
                            <div className="flex items-center justify-between mb-3">
                              <h4 className="font-medium">Test Steps</h4>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  const allSteps =
                                    currentTest.test_cases.test_steps || [];
                                  if (completedSteps.size === allSteps.length) {
                                    setCompletedSteps(new Set());
                                  } else {
                                    setCompletedSteps(
                                      new Set(allSteps.map((_, idx) => idx)),
                                    );
                                  }
                                }}
                                disabled={isCurrentExecutionReadOnly}
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
                              <>
                                <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
                                  {currentTest.test_cases.test_steps.map(
                                    (step, index) => {
                                      return (
                                        <div
                                          key={index}
                                          className="flex items-start gap-3 p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                                        >
                                          <Checkbox
                                            checked={completedSteps.has(index)}
                                            onCheckedChange={() =>
                                              toggleStep(index)
                                            }
                                            disabled={
                                              isCurrentExecutionReadOnly
                                            }
                                            className="mt-1"
                                          />
                                          <div className="flex-1 min-w-0 space-y-2">
                                            <div className="flex items-start gap-2">
                                              <Badge
                                                variant="outline"
                                                className="text-xs font-mono shrink-0"
                                              >
                                                Step{" "}
                                                {step.step_number || index + 1}
                                              </Badge>
                                              <div className="flex-1 min-w-0">
                                                <p
                                                  className={`text-sm font-medium break-words ${
                                                    completedSteps.has(index)
                                                      ? "line-through text-muted-foreground"
                                                      : ""
                                                  }`}
                                                >
                                                  {step.action}
                                                </p>
                                              </div>
                                            </div>
                                            <div className="pl-0">
                                              <p className="text-xs text-muted-foreground break-words">
                                                <span className="font-semibold">
                                                  Expected:{" "}
                                                </span>
                                                {step.expected}
                                              </p>
                                            </div>
                                          </div>
                                        </div>
                                      );
                                    },
                                  )}
                                </div>
                              </>
                            )}
                          </div>

                          {/* Expected Result */}
                          <div>
                            <h4 className="font-medium mb-2">
                              Expected Result
                            </h4>
                            <div className="bg-muted p-3 rounded-lg">
                              <p className="text-sm text-muted-foreground break-words">
                                {currentTest.test_cases.expected_result}
                              </p>
                            </div>
                          </div>

                          {/* ✅ FIX: Notes with proper height constraints */}
                          <div className="space-y-2">
                            <Label htmlFor="execution-notes">
                              Execution Notes
                            </Label>
                            <Textarea
                              id="execution-notes"
                              value={executionNotes}
                              onChange={(e) =>
                                setExecutionNotes(e.target.value)
                              }
                              placeholder="Add notes about the test execution..."
                              rows={3}
                              className="resize-none"
                              disabled={isCurrentExecutionReadOnly}
                            />
                          </div>

                          {/* ✅ FIX: Action Buttons with loading states */}
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
                                  isResultActionDisabled ||
                                  !failureReason.trim()
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
                                onChange={(e) =>
                                  setFailureReason(e.target.value)
                                }
                                placeholder="Describe what went wrong..."
                                rows={2}
                                className="resize-none"
                                disabled={isCurrentExecutionReadOnly}
                              />
                            </div>

                            <div className="flex items-center gap-2">
                              <Checkbox
                                id="auto-advance"
                                checked={autoAdvance}
                                onCheckedChange={(checked) =>
                                  setAutoAdvance(!!checked)
                                }
                                disabled={isCurrentExecutionReadOnly}
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
                              Pass •{" "}
                              <kbd className="px-1.5 py-0.5 bg-muted rounded">
                                F
                              </kbd>{" "}
                              Fail •{" "}
                              <kbd className="px-1.5 py-0.5 bg-muted rounded">
                                B
                              </kbd>{" "}
                              Block •{" "}
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
                  </div>

                  {/* Right rail: sticky queue + evidence */}
                  <div className="lg:col-span-1">
                    <div className="lg:sticky lg:top-4 space-y-4">
                      {/* Test Queue */}
                      <Card className="h-[360px] flex flex-col">
                        <CardHeader className="flex-shrink-0 pb-3">
                          <CardTitle className="text-sm font-medium">
                            Test Queue
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="flex-1 overflow-hidden p-0">
                          <div className="h-full overflow-y-auto px-4 pb-4">
                            {/* keep your existing queue map here */}
                            <div className="space-y-2">
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
                                      if (index < currentTestIndex) {
                                        setCurrentTestIndex(index);
                                        await startTestExecution(
                                          index,
                                          currentSession.id,
                                        );
                                      }
                                    }}
                                    className={`
                    w-full text-left p-3 rounded-lg border transition-colors
                    ${
                      isCurrent
                        ? "bg-primary/10 border-primary/70"
                        : isCompleted
                          ? "bg-emerald-500/10 border-emerald-500/60"
                          : "bg-muted/40 border-border/60 hover:bg-muted/60"
                    }
                  `}
                                  >
                                    <div className="flex items-center gap-2">
                                      <span className="font-mono text-xs text-muted-foreground">
                                        {index + 1}
                                      </span>
                                      {/* ...existing icon/title... */}
                                      <div className="flex-1 min-w-0">
                                        <p className="text-xs font-medium truncate">
                                          {testCase.test_cases.title}
                                        </p>
                                        <p className="text-[10px] uppercase text-muted-foreground">
                                          {testCase.test_cases.test_type}
                                        </p>
                                      </div>
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Evidence */}
                      {currentTest && currentExecutionId && (
                        <Card className="flex flex-col h-[420px]">
                          <CardHeader className="pb-3">
                            <div className="space-y-2">
                              <Label htmlFor="target-url">Target URL</Label>
                              <h1 className="text-xs text-muted-foreground">
                                Enter the site you are testing. Use the
                                extension to capture evidence from that page.
                              </h1>
                              <Input
                                id="target-url"
                                placeholder="https://app.example.com/login"
                                value={targetUrl}
                                onChange={(
                                  e: React.ChangeEvent<HTMLInputElement>,
                                ) => setTargetUrl(e.target.value)}
                              />
                            </div>
                            <div className="mt-2" />
                            <CardTitle className="text-sm font-medium">
                              Test Evidence
                            </CardTitle>
                            <CardDescription className="text-xs">
                              Upload or capture screenshots for this test.
                            </CardDescription>
                          </CardHeader>

                          {/* key part: keep evidence usable without growing the dialog */}
                          <CardContent className="flex-1 overflow-y-auto">
                            <ScreenshotUpload
                              executionId={currentExecutionId}
                              testCaseId={currentTest.test_case_id}
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
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* ✅ FIX: Fixed footer */}
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
              <Button
                variant="destructive"
                onClick={() => void completeSession()}
              >
                End Session
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Pause Dialog */}
      <Dialog open={showPauseDialog} onOpenChange={setShowPauseDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Pause Test Session?</DialogTitle>
            <DialogDescription>
              Your progress will be saved and you can resume anytime.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPauseDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                void pauseSession();
                setShowPauseDialog(false);
              }}
            >
              <Pause className="h-4 w-4 mr-2" />
              Pause Session
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
