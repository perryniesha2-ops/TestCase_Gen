"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Textarea } from "@/components/ui/textarea"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert"
import {
  Play,
  Pause,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  SkipForward,
  History,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Trash2,
} from "lucide-react"

//
// ---- Types ----
//

interface TestSuite {
  id: string
  name: string
  description?: string
  suite_type: string
  status: string
}

interface TestCase {
  id: string
  title: string
  description: string
  test_type: string
  steps: string[]
  expected_result: string
}

interface SuiteTestCase {
  id: string
  test_case_id: string
  sequence_order: number
  priority: string
  estimated_duration_minutes: number
  assigned_to?: string
  test_cases: TestCase
}

type ExecutionStatus =
  | "not_run"
  | "in_progress"
  | "passed"
  | "failed"
  | "skipped"
  | "blocked"

type TestExecutionStatusRow = {
  execution_status: ExecutionStatus
}

interface SessionStats {
  passed: number
  failed: number
  blocked: number
  skipped: number
}

interface TestRunSessionRow {
  id: string
  user_id: string
  suite_id: string | null
  name: string
  description: string | null
  status: "planned" | "in_progress" | "paused" | "completed" | "aborted"
  planned_start: string | null
  actual_start: string | null
  actual_end: string | null
  environment: string | null
  test_cases_total: number
  test_cases_completed: number
  progress_percentage: number
  passed_cases: number
  failed_cases: number
  skipped_cases: number
  blocked_cases: number
  created_at: string | null
  updated_at: string | null
  created_by: string | null
}

interface TestSession extends TestRunSessionRow {
  stats: SessionStats
}

interface SessionDialogData {
  session: TestSession
  suite: TestSuite
}

interface TestExecutionHistoryRow {
  id: string
  session_id: string
  execution_status: ExecutionStatus
  started_at: string | null
  completed_at: string | null
}

interface TestSessionExecutionProps {
  suite: TestSuite
  open: boolean
  onOpenChange: (open: boolean) => void
  onSessionComplete: () => void
}

export function TestSessionExecution({
  suite,
  open,
  onOpenChange,
  onSessionComplete,
}: TestSessionExecutionProps) {
  const [suiteTestCases, setSuiteTestCases] = useState<SuiteTestCase[]>([])
  const [currentTestIndex, setCurrentTestIndex] = useState(0)
  const [currentExecutionId, setCurrentExecutionId] = useState<string | null>(
    null,
  )
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [currentSession, setCurrentSession] = useState<TestSession | null>(null)

  const [executionNotes, setExecutionNotes] = useState("")
  const [failureReason, setFailureReason] = useState("")
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set())
  const [autoAdvance, setAutoAdvance] = useState(true)

  const [loading, setLoading] = useState(false)
  const [testsLoading, setTestsLoading] = useState(false)

  // execution row state / guard
  const [currentExecutionStatus, setCurrentExecutionStatus] =
    useState<ExecutionStatus | null>(null)
  const [isCurrentExecutionReadOnly, setIsCurrentExecutionReadOnly] =
    useState(false)

  // Smart-flow dialogs
  const [showResumeDialog, setShowResumeDialog] = useState(false)
  const [showNewRunDialog, setShowNewRunDialog] = useState(false)
  const [showExecutionDialog, setShowExecutionDialog] = useState(false)
  const [showHistorySheet, setShowHistorySheet] = useState(false)
  const [showPauseDialog, setShowPauseDialog] = useState(false)
  const [showCompleteDialog, setShowCompleteDialog] = useState(false)

  const [resumeDialogData, setResumeDialogData] =
    useState<SessionDialogData | null>(null)
  const [newRunDialogData, setNewRunDialogData] = useState<{
    lastSession: TestSession
    suite: TestSuite
  } | null>(null)
  const [sessionHistory, setSessionHistory] = useState<TestSession[]>([])

  // per-test execution history side panel
  const [testExecutionHistory, setTestExecutionHistory] = useState<
    TestExecutionHistoryRow[]
  >([])
  const [testHistoryLoading, setTestHistoryLoading] = useState(false)

  const currentTest = suiteTestCases[currentTestIndex] ?? null
  const totalTests = suiteTestCases.length
  const completedCount = currentSession?.test_cases_completed ?? 0
  const progressPercentage = currentSession?.progress_percentage ?? 0
  const stats: SessionStats =
    currentSession?.stats ?? ({
      passed: 0,
      failed: 0,
      blocked: 0,
      skipped: 0,
    } as SessionStats)

  //
  // ---- Effects ----
  //

  // Load test cases when suite changes
  useEffect(() => {
    if (!suite.id) return
    void fetchSuiteTestCases()
  }, [suite.id])

  // When parent sets open=true, kick off Smart Session Detection
  useEffect(() => {
    if (!open) return
    void handleExecuteClick()
  }, [open])

  // Keyboard shortcuts
  useEffect(() => {
    function handleKeyPress(e: KeyboardEvent) {
      if (!showExecutionDialog) return

      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return
      }

      if (
        !currentTest ||
        !currentSession ||
        !currentExecutionId ||
        isCurrentExecutionReadOnly
      ) {
        return
      }

      switch (e.key.toLowerCase()) {
        case "p":
          e.preventDefault()
          void completeTestExecution("passed")
          break
        case "f":
          e.preventDefault()
          void completeTestExecution("failed")
          break
        case "b":
          e.preventDefault()
          void completeTestExecution("blocked")
          break
        case "s":
          e.preventDefault()
          void completeTestExecution("skipped")
          break
        case " ":
          e.preventDefault()
          toggleStep(0)
          break
        default:
          break
      }
    }

    window.addEventListener("keydown", handleKeyPress)
    return () => window.removeEventListener("keydown", handleKeyPress)
  }, [
    showExecutionDialog,
    currentTest,
    currentSession,
    currentExecutionId,
    isCurrentExecutionReadOnly,
    completedSteps,
  ])

  // Load per-test execution history for side panel
  useEffect(() => {
    const test = suiteTestCases[currentTestIndex]
    if (!test) {
      setTestExecutionHistory([])
      return
    }
    void fetchTestExecutionHistory(test.test_case_id)
  }, [currentTestIndex, suiteTestCases, suite.id])

  //
  // ---- Supabase helpers ----
  //

  async function fetchSuiteTestCases(): Promise<SuiteTestCase[]> {
    setTestsLoading(true)
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from("test_suite_cases")
        .select(`
          id,
          test_case_id,
          sequence_order,
          priority,
          estimated_duration_minutes,
          assigned_to,
          test_cases(
            id,
            title,
            description,
            test_type,
            steps,
            expected_result
          )
        `)
        .eq("suite_id", suite.id)
        .order("sequence_order")

      if (error) throw error

      type RawRow = {
        id: string
        test_case_id: string
        sequence_order: number
        priority: string
        estimated_duration_minutes: number
        assigned_to?: string
        test_cases: TestCase | TestCase[]
      }

      const raw = (data ?? []) as RawRow[]

      const transformed: SuiteTestCase[] = raw.map((item) => ({
        id: item.id,
        test_case_id: item.test_case_id,
        sequence_order: item.sequence_order,
        priority: item.priority,
        estimated_duration_minutes: item.estimated_duration_minutes,
        assigned_to: item.assigned_to,
        test_cases: Array.isArray(item.test_cases)
          ? item.test_cases[0]
          : item.test_cases,
      }))

      setSuiteTestCases(transformed)
      return transformed
    } catch (error) {
      console.error("Error fetching suite test cases:", error)
      toast.error("Failed to load test cases for execution")
      setSuiteTestCases([])
      return []
    } finally {
      setTestsLoading(false)
    }
  }

  async function getSessionStats(sessionId: string): Promise<SessionStats> {
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from("test_executions")
        .select("execution_status")
        .eq("session_id", sessionId)

      if (error) throw error

      const rows = (data ?? []) as TestExecutionStatusRow[]

      const stats: SessionStats = {
        passed: 0,
        failed: 0,
        blocked: 0,
        skipped: 0,
      }

      rows.forEach((exec) => {
        if (exec.execution_status === "passed") stats.passed++
        if (exec.execution_status === "failed") stats.failed++
        if (exec.execution_status === "blocked") stats.blocked++
        if (exec.execution_status === "skipped") stats.skipped++
      })

      return stats
    } catch (error) {
      console.error("Error getting session stats:", error)
      return { passed: 0, failed: 0, blocked: 0, skipped: 0 }
    }
  }

  async function syncSessionTotalsWithStats(
  row: TestRunSessionRow,
  stats: SessionStats,
): Promise<TestSession> {
  const executedCount =
    stats.passed + stats.failed + stats.blocked + stats.skipped

  const currentTotal = row.test_cases_total ?? 0
  // Always use at least the number of executed tests as the total
  const safeTotal =
    executedCount > 0 ? Math.max(currentTotal, executedCount) : currentTotal

  // Only update DB if we need to bump the total up
  if (safeTotal !== currentTotal) {
    try {
      const supabase = createClient()
      await supabase
        .from("test_run_sessions")
        .update({ test_cases_total: safeTotal })
        .eq("id", row.id)
    } catch (error) {
      console.error("Error syncing session totals:", error)
      // Non-fatal – UI can still render with safeTotal in memory
    }
  }

  return { ...row, test_cases_total: safeTotal, stats }
}


  async function getLastCompletedSession(
  suiteId: string,
): Promise<TestSession | null> {
  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from("test_run_sessions")
      .select("*")
      .eq("suite_id", suiteId)
      .eq("status", "completed")
      .order("actual_end", { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) throw error
    if (!data) return null

    const row = data as TestRunSessionRow
    const stats = await getSessionStats(row.id)

    return await syncSessionTotalsWithStats(row, stats)
  } catch (error) {
    console.error("Error getting last session:", error)
    return null
  }
}


  async function getActiveSession(suiteId: string): Promise<TestSession | null> {
  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from("test_run_sessions")
      .select("*")
      .eq("suite_id", suiteId)
      .in("status", ["in_progress", "paused"])
      .order("actual_start", { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) throw error
    if (!data) return null

    const row = data as TestRunSessionRow
    const stats = await getSessionStats(row.id)

    return await syncSessionTotalsWithStats(row, stats)
  } catch (error) {
    console.error("Error getting active session:", error)
    return null
  }
}


  async function fetchSessionHistory() {
  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from("test_run_sessions")
      .select("*")
      .eq("suite_id", suite.id)
      .order("actual_start", { ascending: false })
      .limit(10)

    if (error) throw error

    const raw: TestRunSessionRow[] = data ?? []

    const sessionsWithStats: TestSession[] = await Promise.all(
      raw.map(async (row) => {
        const stats = await getSessionStats(row.id)
        return await syncSessionTotalsWithStats(row, stats)
      }),
    )

    setSessionHistory(sessionsWithStats)
  } catch (error) {
    console.error("Error fetching session history:", error)
  }
}

  async function deleteSessionRun(sessionId: string) {
    const confirmed = window.confirm(
      "Delete this test run and all of its executions? This cannot be undone.",
    )
    if (!confirmed) return

    try {
      const supabase = createClient()

      // 1) Delete executions for this session
      const { error: execError } = await supabase
        .from("test_executions")
        .delete()
        .eq("session_id", sessionId)

      if (execError) throw execError

      // 2) Delete the session itself
      const { error: sessionError } = await supabase
        .from("test_run_sessions")
        .delete()
        .eq("id", sessionId)

      if (sessionError) throw sessionError

      // 3) Update local state
      setSessionHistory((prev) => prev.filter((s) => s.id !== sessionId))

      if (currentSession?.id === sessionId) {
        setCurrentSession(null)
        setSessionId(null)
      }

      toast.success("Test run deleted")
    } catch (error) {
      console.error("Error deleting test run:", error)
      toast.error("Failed to delete test run")
    }
  }

  async function getIncompleteSessions(suiteId: string): Promise<TestSession[]> {
  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from("test_run_sessions")
      .select("*")
      .eq("suite_id", suiteId)
      .in("status", ["in_progress", "paused"])
      .order("actual_start", { ascending: false })

    if (error) throw error
    if (!data) return []

    const sessions = await Promise.all(
      (data as TestRunSessionRow[]).map(async (row) => {
        const stats = await getSessionStats(row.id)
        return await syncSessionTotalsWithStats(row, stats)
      }),
    )

    return sessions
  } catch (error) {
    console.error("Error getting incomplete sessions:", error)
    return []
  }
}


  async function fetchTestExecutionHistory(testCaseId: string) {
    try {
      setTestHistoryLoading(true)
      const supabase = createClient()
      const { data, error } = await supabase
        .from("test_executions")
        .select("id, session_id, execution_status, started_at, completed_at")
        .eq("suite_id", suite.id)
        .eq("test_case_id", testCaseId)
        .order("started_at", { ascending: false })
        .limit(5)

      if (error) throw error

      setTestExecutionHistory((data ?? []) as TestExecutionHistoryRow[])
    } catch (error) {
      console.error("Error fetching test execution history:", error)
    } finally {
      setTestHistoryLoading(false)
    }
  }

  //
  // ---- Smart Session Detection ----
  //

  async function handleExecuteClick() {
    if (!suite.id) return

    setLoading(true)
    try {
      // Ensure we have fresh test cases
      const tests =
        suiteTestCases.length > 0 ? suiteTestCases : await fetchSuiteTestCases()

      if (!tests || tests.length === 0) {
        toast.error("No test cases available for this suite")
        onOpenChange(false)
        return
      }

      // Check for any incomplete session (in_progress OR paused)
      const activeSession = await getActiveSession(suite.id)
      const lastSession = await getLastCompletedSession(suite.id)

      if (activeSession && activeSession.progress_percentage < 100) {
        // Found an incomplete session - ask user to resume or start new
        setResumeDialogData({ session: activeSession, suite })
        setShowResumeDialog(true)
      } else if (lastSession) {
        // No incomplete session, but there's a completed one
        setNewRunDialogData({ lastSession, suite })
        setShowNewRunDialog(true)
      } else {
        // No sessions at all - start fresh
        await startNewSession()
      }
    } catch (error) {
      console.error("Error handling execute click:", error)
      toast.error("Failed to start test execution")
      onOpenChange(false)
    } finally {
      setLoading(false)
    }
  }

  //
  // ---- Session lifecycle ----
  //

  async function startNewSession() {
    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        toast.error("Please log in to start a test session")
        return
      }

      const { data, error } = await supabase
        .from("test_run_sessions")
        .insert({
          user_id: user.id,
          suite_id: suite.id,
          name: `${suite.name} - ${new Date().toLocaleString()}`,
          description: null,
          status: "in_progress",
          environment: "staging",
          planned_start: null,
          actual_start: new Date().toISOString(),
          actual_end: null,
          test_cases_total: totalTests,
          test_cases_completed: 0,
          progress_percentage: 0,
          passed_cases: 0,
          failed_cases: 0,
          skipped_cases: 0,
          blocked_cases: 0,
          created_by: user.id,
        })
        .select()
        .single()

      if (error) throw error

      const stats: SessionStats = {
        passed: 0,
        failed: 0,
        blocked: 0,
        skipped: 0,
      }

      const session: TestSession = { ...(data as TestRunSessionRow), stats }
      setSessionId(session.id)
      setCurrentSession(session)
      setCurrentTestIndex(0)
      setCompletedSteps(new Set())
      setExecutionNotes("")
      setFailureReason("")
      setCurrentExecutionStatus("in_progress")
      setIsCurrentExecutionReadOnly(false)
      setShowResumeDialog(false)
      setShowNewRunDialog(false)
      setShowExecutionDialog(true)

      await startTestExecution(0, session.id)

      toast.success("Test session started")
    } catch (error) {
      console.error("Error starting new session:", error)
      toast.error("Failed to start test session")
      onOpenChange(false)
    }
  }

  async function resumeSession(session: TestSession) {
    try {
      const supabase = createClient()

      // Get all executions for this session
      const { data, error } = await supabase
        .from("test_executions")
        .select("test_case_id, execution_status")
        .eq("session_id", session.id)
        .order("created_at", { ascending: true })

      if (error) throw error

      const completedIds = new Set<string>(
        (data ?? [])
          .filter((e) =>
            ["passed", "failed", "blocked", "skipped"].includes(
              e.execution_status,
            ),
          )
          .map((e) => e.test_case_id),
      )

      const nextIndex = suiteTestCases.findIndex(
        (tc) => !completedIds.has(tc.test_case_id),
      )

      const safeIndex = nextIndex >= 0 ? nextIndex : 0

      setCurrentSession(session)
      setSessionId(session.id)
      setCurrentTestIndex(safeIndex)
      setCompletedSteps(new Set())
      setExecutionNotes("")
      setFailureReason("")
      setCurrentExecutionStatus(null)
      setIsCurrentExecutionReadOnly(false)
      setShowResumeDialog(false)
      setShowHistorySheet(false)
      setShowExecutionDialog(true)

      await startTestExecution(safeIndex, session.id)
      toast.success(
        `Resumed from test ${safeIndex + 1} of ${suiteTestCases.length}`,
      )
    } catch (error) {
      console.error("Error resuming session:", error)
      toast.error("Failed to resume session")
    }
  }

  async function pauseSession() {
    if (!currentSession) return
    try {
      const supabase = createClient()
      await supabase
        .from("test_run_sessions")
        .update({ status: "paused" })
        .eq("id", currentSession.id)

      toast.success("Session paused - Resume anytime")
    } catch (error) {
      console.error("Error pausing session:", error)
      toast.error("Failed to pause session")
    }
  }

  async function completeSession() {
    if (!currentSession) return
    try {
      const supabase = createClient()

      await supabase
        .from("test_run_sessions")
        .update({
          status: "completed",
          actual_end: new Date().toISOString(),
        })
        .eq("id", currentSession.id)

      await supabase
        .from("test_suites")
        .update({
          status: "completed",
          actual_end_date: new Date().toISOString(),
        })
        .eq("id", suite.id)

      toast.success("Test session completed!")
      setShowExecutionDialog(false)
      setShowCompleteDialog(true)
      onSessionComplete()
      onOpenChange(false)
    } catch (error) {
      console.error("Error completing session:", error)
      toast.error("Failed to complete session")
    }
  }

  //
  // ---- Execution helpers ----
  //

  async function startTestExecution(
    index: number,
    currentSessionId: string | null,
  ) {
    const testCase = suiteTestCases[index]
    if (!testCase || !currentSessionId) return

    try {
      const supabase = createClient()

      // Try to reuse an existing execution row for this session + test case
      const { data: existing, error: existingError } = await supabase
        .from("test_executions")
        .select(
          "id, execution_status, execution_notes, failure_reason, completed_steps",
        )
        .eq("session_id", currentSessionId)
        .eq("test_case_id", testCase.test_case_id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()

      if (existingError) throw existingError

      if (existing) {
        const row = existing as {
          id: string
          execution_status: ExecutionStatus
          execution_notes: string | null
          failure_reason: string | null
          completed_steps: number[] | null
        }

        setCurrentExecutionId(row.id)
        setExecutionNotes(row.execution_notes ?? "")
        setFailureReason(row.failure_reason ?? "")
        setCompletedSteps(
          new Set<number>(Array.isArray(row.completed_steps) ? row.completed_steps : []),
        )
        setCurrentExecutionStatus(row.execution_status)
        setIsCurrentExecutionReadOnly(row.execution_status !== "in_progress")
        return
      }

      // No existing execution row: create a fresh one in-progress
      const {
        data: userData,
      } = await supabase.auth.getUser()

      if (!userData.user) {
        toast.error("You must be logged in to execute tests.")
        return
      }

      const { data: created, error: createError } = await supabase
        .from("test_executions")
        .insert({
          test_case_id: testCase.test_case_id,
          suite_id: suite.id,
          session_id: currentSessionId,
          executed_by: userData.user.id,
          execution_status: "in_progress",
          started_at: new Date().toISOString(),
          completed_steps: [],
          failed_steps: [],
          execution_notes: null,
          failure_reason: null,
        })
        .select()
        .single()

      if (createError) throw createError

      setCurrentExecutionId(created.id as string)
      setExecutionNotes("")
      setFailureReason("")
      setCompletedSteps(new Set())
      setCurrentExecutionStatus("in_progress")
      setIsCurrentExecutionReadOnly(false)
    } catch (error) {
      console.error("Error starting test execution:", error)
      toast.error("Failed to start test execution")
    }
  }

  async function completeTestExecution(status: ExecutionStatus) {
    if (
      !currentExecutionId ||
      !currentSession ||
      !currentTest ||
      !["passed", "failed", "skipped", "blocked"].includes(status) ||
      isCurrentExecutionReadOnly
    ) {
      return
    }

    try {
      const supabase = createClient()

      const completedStepsArray = Array.from(completedSteps)

      const { error } = await supabase
        .from("test_executions")
        .update({
          execution_status: status,
          completed_at: new Date().toISOString(),
          execution_notes: executionNotes || null,
          failure_reason: status === "failed" ? failureReason || null : null,
          completed_steps: completedStepsArray,
          failed_steps: status === "failed" ? completedStepsArray : [],
        })
        .eq("id", currentExecutionId)

      if (error) throw error

      const newCompleted = currentSession.test_cases_completed + 1
      const newProgress = Math.round((newCompleted / totalTests) * 100)

      await supabase
        .from("test_run_sessions")
        .update({
          test_cases_completed: newCompleted,
          progress_percentage: newProgress,
          status: newProgress === 100 ? "completed" : "in_progress",
          actual_end: newProgress === 100 ? new Date().toISOString() : null,
        })
        .eq("id", currentSession.id)

      const newStats: SessionStats = { ...stats }
      if (status === "passed") newStats.passed++
      if (status === "failed") newStats.failed++
      if (status === "blocked") newStats.blocked++
      if (status === "skipped") newStats.skipped++

      const updatedSession: TestSession = {
        ...currentSession,
        test_cases_completed: newCompleted,
        progress_percentage: newProgress,
        stats: newStats,
      }

      setCurrentSession(updatedSession)
      setCurrentExecutionStatus(status)
      setIsCurrentExecutionReadOnly(true)

      toast.success(`Test ${status}`)

      setExecutionNotes("")
      setFailureReason("")
      setCompletedSteps(new Set())

      if (newProgress === 100) {
        await completeSession()
      } else if (
        autoAdvance &&
        currentTestIndex < suiteTestCases.length - 1
      ) {
        const nextIndex = currentTestIndex + 1
        setCurrentTestIndex(nextIndex)
        await startTestExecution(nextIndex, updatedSession.id)
      }
    } catch (error) {
      console.error("Error completing test execution:", error)
      toast.error("Failed to complete test execution")
    }
  }

  function toggleStep(stepIndex: number) {
    setCompletedSteps((prev) => {
      const next = new Set(prev)
      if (next.has(stepIndex)) {
        next.delete(stepIndex)
      } else {
        next.add(stepIndex)
      }
      return next
    })
  }

  function formatRelativeTime(dateString?: string | null) {
    if (!dateString) return "N/A"
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)

    if (diffMins < 1) return "Just now"
    if (diffMins < 60) return `${diffMins} minutes ago`
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)} hours ago`
    return `${Math.floor(diffMins / 1440)} days ago`
  }

  function formatDuration(start?: string | null, end?: string | null) {
    if (!start || !end) return "N/A"
    const startDate = new Date(start)
    const endDate = new Date(end)
    const diffMins = Math.floor(
      (endDate.getTime() - startDate.getTime()) / 60000,
    )
    return `${diffMins} minutes`
  }

  function getStatusIconSmall(status: ExecutionStatus) {
    switch (status) {
      case "passed":
        return <CheckCircle className="h-3 w-3 text-green-600" />
      case "failed":
        return <XCircle className="h-3 w-3 text-red-600" />
      case "blocked":
        return <AlertTriangle className="h-3 w-3 text-orange-600" />
      case "skipped":
        return <SkipForward className="h-3 w-3 text-gray-500" />
      case "in_progress":
        return <Clock className="h-3 w-3 text-blue-500" />
      default:
        return <Clock className="h-3 w-3 text-gray-400" />
    }
  }

  function calculatePassRate(session: TestSession): number {
  const executedCount =
    session.stats.passed +
    session.stats.failed +
    session.stats.blocked +
    session.stats.skipped

  // Prefer the DB total, but fall back to executedCount if needed
  const denominator =
    (session.test_cases_total ?? 0) > 0
      ? session.test_cases_total!
      : executedCount

  if (!denominator) return 0

  return Math.round((session.stats.passed / denominator) * 100)
}


  const isResultActionDisabled =
    !currentSession || !currentExecutionId || isCurrentExecutionReadOnly

  //
  // ---- UI ----
  //

  return (
    <>
      {/* Resume Dialog */}
      <Dialog open={showResumeDialog} onOpenChange={setShowResumeDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Resume Test Session</DialogTitle>
            <DialogDescription>Active session detected</DialogDescription>
          </DialogHeader>

          {resumeDialogData && (
            <div className="space-y-4 py-4">
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>Active session in progress</AlertDescription>
              </Alert>

              <div className="bg-muted p-4 rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span>Session Progress:</span>
                  <span className="font-bold">
                    {resumeDialogData.session.progress_percentage}%
                  </span>
                </div>
                <Progress value={resumeDialogData.session.progress_percentage} />
                <div className="text-sm text-muted-foreground">
                  {resumeDialogData.session.test_cases_completed} of{" "}
                  {resumeDialogData.session.test_cases_total} tests complete
                </div>
              </div>

              <div className="grid grid-cols-4 gap-2 text-center">
                <div>
                  <div className="text-lg font-bold text-green-600">
                    {resumeDialogData.session.stats.passed}
                  </div>
                  <div className="text-xs">Passed</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-red-600">
                    {resumeDialogData.session.stats.failed}
                  </div>
                  <div className="text-xs">Failed</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-orange-600">
                    {resumeDialogData.session.stats.blocked}
                  </div>
                  <div className="text-xs">Blocked</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-gray-600">
                    {resumeDialogData.session.stats.skipped}
                  </div>
                  <div className="text-xs">Skipped</div>
                </div>
              </div>

              <div className="text-sm text-muted-foreground">
                <Clock className="inline h-3 w-3 mr-1" />
                Started:{" "}
                {formatRelativeTime(resumeDialogData.session.actual_start)}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                void startNewSession()
              }}
            >
              Start New
            </Button>
            <Button
              onClick={() =>
                resumeDialogData &&
                void resumeSession(resumeDialogData.session)
              }
            >
              Continue Session
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Run Dialog */}
      <Dialog open={showNewRunDialog} onOpenChange={setShowNewRunDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Start New Test Run</DialogTitle>
            <DialogDescription>Previous run completed</DialogDescription>
          </DialogHeader>

          {newRunDialogData && (
            <div className="space-y-4 py-4">
              <div className="text-sm text-muted-foreground">
                Last run finished:{" "}
                {formatRelativeTime(newRunDialogData.lastSession.actual_end)}
              </div>

              <div className="bg-muted p-4 rounded-lg space-y-2">
                <div className="font-medium text-sm mb-2">Last Results:</div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex justify-between">
                    <span>Passed:</span>
                    <Badge className="bg-green-600">
                      {newRunDialogData.lastSession.stats.passed}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Failed:</span>
                    <Badge variant="destructive">
                      {newRunDialogData.lastSession.stats.failed}
                    </Badge>
                  </div>
                </div>
                <div className="pt-2 border-t mt-2 text-sm">
                  <div className="flex justify-between">
                    <span>Pass Rate:</span>
                    <span className="font-bold">
  {calculatePassRate(newRunDialogData.lastSession)}%
</span>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground">
                  Duration:{" "}
                  {formatDuration(
                    newRunDialogData.lastSession.actual_start,
                    newRunDialogData.lastSession.actual_end,
                  )}
                </div>
              </div>

              <Alert>
                <AlertDescription className="text-xs">
                  Starting a new run will create a fresh session and preserve
                  the previous results for comparison.
                </AlertDescription>
              </Alert>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                void fetchSessionHistory()
                setShowHistorySheet(true)
              }}
            >
              <History className="h-4 w-4 mr-2" />
              View History
            </Button>
            <Button
              onClick={() => {
                void startNewSession()
              }}
            >
              <Play className="h-4 w-4 mr-2" />
              Start New Run
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Execution Dialog */}
      <Dialog
        open={showExecutionDialog}
        onOpenChange={(openValue) => {
          if (!openValue) {
            if (
              currentSession &&
              currentSession.status === "in_progress"
            ) {
              void pauseSession()
            }
            setShowExecutionDialog(false)
            onOpenChange(false)
          } else {
            setShowExecutionDialog(true)
          }
        }}
      >
        <DialogContent
          className="
            w-[95vw]
            sm:max-w-[95vw]
            lg:max-w-[1100px]
            h-[95vh]
            max-h-[95vh]
            flex
            flex-col
            p-0
            overflow-hidden
          "
        >
          <DialogHeader className="px-6 pt-6 pb-4 border-b">
            <DialogTitle className="flex items-center gap-2">
              <Play className="h-5 w-5" />
              Test Session: {suite.name}
            </DialogTitle>
            <DialogDescription>
              Session Progress: {progressPercentage}% — {completedCount} of{" "}
              {totalTests} tests complete
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-6 pr-2">
            {testsLoading && suiteTestCases.length === 0 ? (
              <div className="flex items-center justify-center py-12 text-muted-foreground">
                Preparing test session…
              </div>
            ) : (
              <>
                {/* Session Progress */}
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">
                        Session Progress
                      </CardTitle>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>
                          {completedCount} of {totalTests} tests complete
                        </span>
                        <span>{progressPercentage}%</span>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Progress value={progressPercentage} className="mb-4" />
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
                    {totalTests > 0 && (
                      <div className="mt-2 text-xs text-muted-foreground">
                        Pass Rate:{" "}
                        {completedCount > 0
                          ? `${Math.round(
                              (stats.passed / completedCount) * 100,
                            )}% (${stats.passed}/${completedCount})`
                          : "N/A"}
                      </div>
                    )}
                  </CardContent>
                </Card>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Current test execution (2/3) */}
                  <div className="lg:col-span-2">
                    {currentTest && currentSession ? (
                      <Card>
                        <CardHeader>
                          <div className="flex items-center justify-between">
                            <div>
                              <CardTitle>
                                {currentTest.test_cases.title}
                              </CardTitle>
                              <CardDescription>
                                Test {currentTestIndex + 1} of {totalTests} •{" "}
                                {currentTest.test_cases.test_type}
                              </CardDescription>
                            </div>
                            <Badge variant="outline">
                              {currentTest.priority}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-6">
                          {isCurrentExecutionReadOnly &&
                            currentExecutionStatus &&
                            currentExecutionStatus !== "in_progress" && (
                              <Alert className="border-amber-300 bg-amber-50 text-amber-800">
                                <AlertTitle>Result locked</AlertTitle>
                                <AlertDescription className="text-xs">
                                  This test was already marked as{" "}
                                  <span className="font-semibold">
                                    {currentExecutionStatus
                                      .replace("_", " ")
                                      .toUpperCase()}
                                  </span>{" "}
                                  in this session. Result changes are disabled
                                  to preserve history.
                                </AlertDescription>
                              </Alert>
                            )}

                          <div>
                            <h4 className="font-medium mb-2">Description</h4>
                            <p className="text-sm text-muted-foreground">
                              {currentTest.test_cases.description}
                            </p>
                          </div>

                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="font-medium mb-0">Test Steps</h4>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  if (
                                    completedSteps.size ===
                                    (currentTest.test_cases.steps?.length ?? 0)
                                  ) {
                                    setCompletedSteps(new Set())
                                  } else {
                                    const all = new Set<number>()
                                    currentTest.test_cases.steps.forEach(
                                      (_, idx) => {
                                        all.add(idx)
                                      },
                                    )
                                    setCompletedSteps(all)
                                  }
                                }}
                              >
                                Toggle All
                              </Button>
                            </div>
                            <div className="space-y-2">
                              {currentTest.test_cases.steps?.map(
                                (step, index) => (
                                  <div
                                    key={index}
                                    className="flex items-start gap-3"
                                  >
                                    <button
                                      type="button"
                                      onClick={() => toggleStep(index)}
                                      disabled={isCurrentExecutionReadOnly}
                                      className={`mt-0.5 h-4 w-4 rounded border-2 flex items-center justify-center ${
                                        completedSteps.has(index)
                                          ? "bg-green-500 border-green-500"
                                          : "border-gray-300"
                                      } ${
                                        isCurrentExecutionReadOnly
                                          ? "opacity-60 cursor-not-allowed"
                                          : "cursor-pointer"
                                      }`}
                                    >
                                      {completedSteps.has(index) && (
                                        <CheckCircle className="h-3 w-3 text-white" />
                                      )}
                                    </button>
                                    <div className="flex-1">
                                      <p
                                        className={`text-sm ${
                                          completedSteps.has(index)
                                            ? "line-through text-muted-foreground"
                                            : ""
                                        }`}
                                      >
                                        <span className="font-mono text-xs mr-2">
                                          {index + 1}.
                                        </span>
                                        {step}
                                      </p>
                                    </div>
                                  </div>
                                ),
                              )}
                            </div>
                          </div>

                          <div>
                            <h4 className="font-medium mb-2">
                              Expected Result
                            </h4>
                            <p className="text-sm text-muted-foreground p-3 bg-muted rounded-lg">
                              {currentTest.test_cases.expected_result}
                            </p>
                          </div>

                          <div>
                            <h4 className="font-medium mb-2">
                              Execution Notes
                            </h4>
                            <Textarea
                              value={executionNotes}
                              onChange={(e) =>
                                setExecutionNotes(e.target.value)
                              }
                              placeholder="Add notes about the test execution..."
                              rows={3}
                              disabled={isCurrentExecutionReadOnly}
                            />
                          </div>

                          <div className="space-y-3">
                            <div>
                              <h4 className="font-medium mb-2">Test Result</h4>
                              <div className="flex flex-wrap gap-2">
                                <Button
                                  onClick={() =>
                                    void completeTestExecution("passed")
                                  }
                                  className="bg-green-600 hover:bg-green-700"
                                  disabled={
                                    isResultActionDisabled ||
                                    testsLoading ||
                                    loading
                                  }
                                >
                                  <CheckCircle className="h-4 w-4 mr-2" />
                                  Pass (P)
                                </Button>
                                <Button
                                  onClick={() => {
                                    if (!failureReason.trim()) {
                                      toast.error(
                                        "Please provide a failure reason",
                                      )
                                      return
                                    }
                                    void completeTestExecution("failed")
                                  }}
                                  variant="destructive"
                                  disabled={
                                    isResultActionDisabled ||
                                    testsLoading ||
                                    loading
                                  }
                                >
                                  <XCircle className="h-4 w-4 mr-2" />
                                  Fail (F)
                                </Button>
                                <Button
                                  onClick={() =>
                                    void completeTestExecution("blocked")
                                  }
                                  variant="outline"
                                  className="text-orange-600"
                                  disabled={
                                    isResultActionDisabled ||
                                    testsLoading ||
                                    loading
                                  }
                                >
                                  <AlertTriangle className="h-4 w-4 mr-2" />
                                  Blocked (B)
                                </Button>
                                <Button
                                  onClick={() =>
                                    void completeTestExecution("skipped")
                                  }
                                  variant="outline"
                                  disabled={
                                    isResultActionDisabled ||
                                    testsLoading ||
                                    loading
                                  }
                                >
                                  <SkipForward className="h-4 w-4 mr-2" />
                                  Skip (S)
                                </Button>
                              </div>
                            </div>

                            <div>
                              <Textarea
                                value={failureReason}
                                onChange={(e) =>
                                  setFailureReason(e.target.value)
                                }
                                placeholder="If test failed or blocked, describe the reason..."
                                rows={2}
                                className="text-sm"
                                disabled={isCurrentExecutionReadOnly}
                              />
                            </div>

                            <div className="flex items-center space-x-2">
                              <input
                                id="auto-advance"
                                type="checkbox"
                                checked={autoAdvance}
                                onChange={(e) =>
                                  setAutoAdvance(e.currentTarget.checked)
                                }
                                disabled={isCurrentExecutionReadOnly}
                              />
                              <label
                                htmlFor="auto-advance"
                                className="text-sm text-muted-foreground"
                              >
                                Auto-advance to next test after marking result
                              </label>
                            </div>

                            <div className="text-xs text-muted-foreground pt-2 border-t">
                              Shortcuts:{" "}
                              <kbd className="px-1 py-0.5 bg-muted rounded">
                                P
                              </kbd>{" "}
                              Pass •{" "}
                              <kbd className="px-1 py-0.5 bg-muted rounded">
                                F
                              </kbd>{" "}
                              Fail •{" "}
                              <kbd className="px-1 py-0.5 bg-muted rounded">
                                B
                              </kbd>{" "}
                              Block •{" "}
                              <kbd className="px-1 py-0.5 bg-muted rounded">
                                S
                              </kbd>{" "}
                              Skip •{" "}
                              <kbd className="px-1 py-0.5 bg-muted rounded">
                                Space
                              </kbd>{" "}
                              Toggle step
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
                            All test cases have been executed.
                          </p>
                        </CardContent>
                      </Card>
                    )}
                  </div>

                  {/* Right column: Test Queue + per-test history */}
                  <div className="space-y-4">
                   <Card className="bg-card border-border/60">
    <CardHeader className="pb-3">
      <CardTitle className="text-sm font-medium text-foreground">
        Test Queue
      </CardTitle>
    </CardHeader>
    <CardContent className="flex-1 overflow-hidden">
      <div className="space-y-2 h-full overflow-y-auto pr-2">
        {suiteTestCases.map((testCase, index) => {
          const completedCount = currentSession?.test_cases_completed ?? 0
          const isCurrent = index === currentTestIndex
          const isCompleted = index < completedCount

          const baseClasses =
            "w-full text-left p-3 rounded-lg border text-sm transition-colors flex flex-col gap-1"

          const stateClasses = isCurrent
            ? "bg-primary/10 border-primary/70 hover:bg-primary/20"
            : isCompleted
            ? "bg-emerald-500/10 border-emerald-500/60 hover:bg-emerald-500/15"
            : "bg-muted/40 border-border/60 hover:bg-muted/60"

          return (
            <button
              key={testCase.id}
              type="button"
              className={`${baseClasses} ${stateClasses}`}
              onClick={async () => {
                if (!currentSession) return
                if (index === currentTestIndex) return

                // allow going back to previously executed tests
                if (index < currentTestIndex) {
                  setCurrentTestIndex(index)
                  await startTestExecution(index, currentSession.id)
                }
              }}
            >
              <div className="flex items-center gap-2">
                <span className="font-mono text-[11px] text-muted-foreground">
                  {index + 1}
                </span>

                {isCompleted ? (
                  <CheckCircle className="h-4 w-4 text-emerald-400 shrink-0" />
                ) : isCurrent ? (
                  <Clock className="h-4 w-4 text-amber-400 shrink-0" />
                ) : (
                  <div className="h-4 w-4 rounded-full border border-muted-foreground/40 shrink-0" />
                )}

                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium text-foreground truncate">
                    {testCase.test_cases.title}
                  </p>
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    {testCase.test_cases.test_type}
                  </p>
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </CardContent>
  </Card>
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                          <History className="h-4 w-4" />
                          Test History
                        </CardTitle>
                        <CardDescription className="text-xs">
                          Recent runs for this test case
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        {testHistoryLoading ? (
                          <div className="text-xs text-muted-foreground">
                            Loading history…
                          </div>
                        ) : testExecutionHistory.length === 0 ? (
                          <div className="text-xs text-muted-foreground">
                            No previous executions recorded for this test.
                          </div>
                        ) : (
                          testExecutionHistory.map((exec) => (
                            <div
                              key={exec.id}
                              className="flex items-center justify-between text-xs border rounded px-2 py-1"
                            >
                              <div className="flex items-center gap-1">
                                {getStatusIconSmall(exec.execution_status)}
                                <span className="capitalize">
                                  {exec.execution_status.replace("_", " ")}
                                </span>
                              </div>
                              <div className="text-[0.7rem] text-muted-foreground">
                                {formatRelativeTime(
                                  exec.completed_at ?? exec.started_at,
                                )}
                              </div>
                            </div>
                          ))
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </>
            )}
          </div>

          <DialogFooter className="pt-4 border-t flex justify-between">
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShowPauseDialog(true)}
              >
                <Pause className="h-4 w-4 mr-2" />
                Pause Session
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  void fetchSessionHistory()
                  setShowHistorySheet(true)
                }}
              >
                <History className="h-4 w-4 mr-2" />
                History
              </Button>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                disabled={currentTestIndex === 0 || !currentSession}
                onClick={async () => {
                  if (!currentSession) return
                  if (currentTestIndex === 0) return
                  const prevIndex = currentTestIndex - 1
                  setCurrentTestIndex(prevIndex)
                  await startTestExecution(prevIndex, currentSession.id)
                }}
              >
                <ChevronLeft className="h-4 w-4 mr-2" />
                Previous
              </Button>
              <Button
                variant="outline"
                disabled={
                  !currentSession || currentTestIndex >= totalTests - 1
                }
                onClick={async () => {
                  if (!currentSession) return
                  if (currentTestIndex >= totalTests - 1) return
                  const nextIndex = currentTestIndex + 1
                  setCurrentTestIndex(nextIndex)
                  await startTestExecution(nextIndex, currentSession.id)
                }}
              >
                Next
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  void completeSession()
                }}
              >
                End Session
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Pause dialog */}
      <Dialog open={showPauseDialog} onOpenChange={setShowPauseDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Pause Test Session?</DialogTitle>
            <DialogDescription>
              Your progress will be saved and you can resume anytime.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowPauseDialog(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                void pauseSession()
                setShowPauseDialog(false)
                setShowExecutionDialog(false)
                onOpenChange(false)
              }}
            >
              <Pause className="h-4 w-4 mr-2" />
              Pause Session
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Complete dialog */}
      <Dialog
        open={showCompleteDialog}
        onOpenChange={(openValue) => {
          setShowCompleteDialog(openValue)
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>🎉 Test Session Complete!</DialogTitle>
            <DialogDescription>All tests have been executed.</DialogDescription>
          </DialogHeader>
          {currentSession && (
            <div className="py-4 space-y-4">
              <div className="text-center">
                <div className="text-3xl font-bold mb-2">
                  {totalTests > 0
                    ? Math.round((stats.passed / totalTests) * 100)
                    : 0}
                  %
                </div>
                <div className="text-sm text-muted-foreground">Pass Rate</div>
              </div>
              <div className="bg-muted p-4 rounded-lg space-y-3">
                <div className="font-medium text-sm">Results:</div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="flex justify-between">
                    <span>Passed:</span>
                    <Badge className="bg-green-600">
                      {stats.passed}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Failed:</span>
                    <Badge variant="destructive">
                      {stats.failed}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Blocked:</span>
                    <Badge className="bg-orange-600">
                      {stats.blocked}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Skipped:</span>
                    <Badge variant="secondary">
                      {stats.skipped}
                    </Badge>
                  </div>
                </div>
              </div>
              <div className="text-sm text-muted-foreground text-center">
                Duration:{" "}
                {formatDuration(
                  currentSession.actual_start,
                  currentSession.actual_end ?? new Date().toISOString(),
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setShowCompleteDialog(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* History sheet */}
      <Sheet open={showHistorySheet} onOpenChange={setShowHistorySheet}>
        <SheetContent side="right" className="w-[500px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Test Run History</SheetTitle>
            <SheetDescription>
              All previous test runs for {suite.name}
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-4 mt-6">
            {sessionHistory.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <History className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No test run history yet</p>
              </div>
            ) : (
              sessionHistory.map((session, index) => (
                <Card key={session.id}>
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <CardTitle className="text-base">
                          Run #{sessionHistory.length - index}
                        </CardTitle>
                        <CardDescription className="text-xs">
                          {formatRelativeTime(session.actual_start)}
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={
                            session.status === "completed"
                              ? "default"
                              : "secondary"
                          }
                        >
                          {session.progress_percentage}%
                        </Badge>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => void deleteSessionRun(session.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-4 gap-2 text-center text-sm">
                      <div>
                        <div className="font-bold text-green-600">
                          {session.stats.passed}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Pass
                        </div>
                      </div>
                      <div>
                        <div className="font-bold text-red-600">
                          {session.stats.failed}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Fail
                        </div>
                      </div>
                      <div>
                        <div className="font-bold text-orange-600">
                          {session.stats.blocked}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Block
                        </div>
                      </div>
                      <div>
                        <div className="font-bold text-gray-600">
                          {session.stats.skipped}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Skip
                        </div>
                      </div>
                    </div>
                    {session.status === "completed" && (
                      <div className="text-sm pt-2 border-t">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">
                            Pass Rate:
                          </span>
                          <span className="font-medium">
                            {session.test_cases_total > 0
                              ? Math.round(
                                  (session.stats.passed /
                                    session.test_cases_total) *
                                    100,
                                )
                              : 0}
                            %
                          </span>
                        </div>
                        <div className="flex justify-between mt-1">
                          <span className="text-muted-foreground">
                            Duration:
                          </span>
                          <span className="font-medium">
                            {formatDuration(
                              session.actual_start,
                              session.actual_end,
                            )}
                          </span>
                        </div>
                      </div>
                    )}
                    {session.status === "in_progress" && (
                      <Button
                        size="sm"
                        className="w-full"
                        onClick={() => {
                          void resumeSession(session)
                          setShowHistorySheet(false)
                        }}
                      >
                        <Play className="h-4 w-4 mr-2" />
                        Resume Session
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))
            )}

            {sessionHistory.length > 1 &&
              sessionHistory.filter((s) => s.status === "completed").length >
                1 && (
                <Card className="border border-primary/20 bg-background/80">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2 text-primary">
                      <TrendingUp className="h-4 w-4 text-primary" />
                      Trend Analysis
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-foreground">
                    {(() => {
                      const completedSessions = sessionHistory
                        .filter(
                          (s) =>
                            s.status === "completed" &&
                            s.test_cases_total > 0,
                        )
                        .slice(0, 3)
                        .reverse()

                      if (completedSessions.length < 2) {
                        return (
                          <div className="text-xs text-muted-foreground">
                            Not enough completed runs with test cases to
                            calculate trends yet.
                          </div>
                        )
                      }

                      const passRates = completedSessions.map((s) =>
                        Math.round(
                          (s.stats.passed / s.test_cases_total) * 100,
                        ),
                      )

                      return (
                        <div>
                          Pass rate progression: {passRates.join("% → ")}%
                          <div className="mt-1 text-xs text-muted-foreground">
                            {passRates[passRates.length - 1] >
                            passRates[0]
                              ? "📈 Improving"
                              : passRates[passRates.length - 1] <
                                passRates[0]
                              ? "📉 Declining"
                              : "➡️ Stable"}
                          </div>
                        </div>
                      )
                    })()}
                  </CardContent>
                </Card>
              )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
