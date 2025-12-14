"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu"
import {
  CheckCircle2,
  XCircle,
  Circle,
  Loader2,
  AlertTriangle,
  Search,
  FileDown,
  ChevronLeft,
  ChevronRight,
  Monitor,
  Smartphone,
  Globe,
  Eye,
  Zap,
  FlaskConical,
  Layers,
  Plus,
  Edit3,
  Trash2,
  MoreHorizontal,
  X,
  Clock,
  RotateCcw,
  FolderOpen,
  ChevronDown,
} from "lucide-react"

// ✅ Import types from new file
import type {
  TestCase,
  CrossPlatformTestCase,
  Generation,
  CrossPlatformSuite,
  TestExecution,
  TestSession,
  ExecutionStatus,
  Project,
  ExecutionDetails,
} from "@/types/test-cases"

// ✅ Import dialog components
import { TestCaseFormDialog } from "./test-case-form-dialog"
import { TestExecutionDialog } from "./test-execution-dialog"
import { DeleteTestCaseDialog } from "./delete-test-case-dialog"

const platformIcons = {
  web: Monitor,
  mobile: Smartphone,
  api: Globe,
  accessibility: Eye,
  performance: Zap,
}

export function TabbedTestCaseTable() {
  // State variables
  const [testCases, setTestCases] = useState<TestCase[]>([])
  const [crossPlatformCases, setCrossPlatformCases] = useState<CrossPlatformTestCase[]>([])
  const [generations, setGenerations] = useState<Record<string, Generation>>({})
  const [crossPlatformSuites, setCrossPlatformSuites] = useState<Record<string, CrossPlatformSuite>>({})
  const [loading, setLoading] = useState(true)
  const [execution, setExecution] = useState<TestExecution>({})
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCase, setSelectedCase] = useState<TestCase | CrossPlatformTestCase | null>(null)
  const [selectedCaseType, setSelectedCaseType] = useState<"regular" | "cross-platform">("regular")
  const [showDetailsDialog, setShowDetailsDialog] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [crossPlatformCurrentPage, setCrossPlatformCurrentPage] = useState(1)
  const [updating, setUpdating] = useState<string | null>(null)
  const [selectedProject, setSelectedProject] = useState<string>("")
  const [projects, setProjects] = useState<Project[]>([])

  // Dialog state
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showExecutionDialog, setShowExecutionDialog] = useState(false)
  const [editingTestCase, setEditingTestCase] = useState<TestCase | null>(null)
  const [deletingTestCase, setDeletingTestCase] = useState<TestCase | null>(null)
  const [selectedTestCase, setSelectedTestCase] = useState<TestCase | null>(null)

  // Test session state
  const [currentSession, setCurrentSession] = useState<TestSession | null>(null)
  const selectedProjectName = selectedProject
    ? projects.find((p) => p.id === selectedProject)?.name
    : null

  const itemsPerPage = 10
  const router = useRouter()
  const searchParams = useSearchParams()
  const generationId = searchParams.get("generation")
  const sessionId = searchParams.get("session")

  useEffect(() => {
    fetchData()
    if (sessionId) {
      fetchTestSession()
    }
  }, [generationId, sessionId, selectedProject])

  useEffect(() => {
    fetchProjects()
  }, [])

  async function fetchProjects() {
    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return
      const { data, error } = await supabase
        .from("projects")
        .select("id, name, color, icon")
        .eq("user_id", user.id)
        .order("name")
      if (error) throw error
      setProjects(data || [])
    } catch (error) {
      console.error("Error fetching projects:", error)
    }
  }

  async function fetchTestSession() {
    if (!sessionId) return

    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from("test_run_sessions")
        .select("*")
        .eq("id", sessionId)
        .single()

      if (error) throw error
      setCurrentSession(data)
    } catch (error) {
      console.error("Error fetching test session:", error)
    }
  }

  async function fetchData() {
    try {
      setLoading(true)
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        toast.error("Please log in to view test cases")
        return
      }

      // Fetch regular test cases
      let testCaseQuery = supabase
        .from("test_cases")
        .select(` *, projects:project_id(id, name, color, icon) `)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })

      if (generationId) {
        testCaseQuery = testCaseQuery.eq("generation_id", generationId)
      }

      if (selectedProject) {
        testCaseQuery = testCaseQuery.eq("project_id", selectedProject)
      }

      const { data: testCasesData, error: testCasesError } = await testCaseQuery

      if (testCasesError) throw testCasesError
      setTestCases(testCasesData || [])

      // Fetch cross-platform test cases
      const { data: crossPlatformData, error: crossPlatformError } = await supabase
        .from("platform_test_cases")
        .select(
          `
          *,
          cross_platform_test_suites!inner(
            id,
            requirement,
            user_id,
            platforms,
            generated_at
          )
        `
        )
        .eq("cross_platform_test_suites.user_id", user.id)
        .order("created_at", { ascending: false })

      if (crossPlatformError) throw crossPlatformError
      setCrossPlatformCases(crossPlatformData || [])

      // Fetch generations
      const { data: generationsData, error: generationsError } = await supabase
        .from("test_case_generations")
        .select("id, title")
        .eq("user_id", user.id)

      if (generationsError) throw generationsError

      const generationsMap: Record<string, Generation> = {}
      generationsData?.forEach((gen) => {
        generationsMap[gen.id] = gen
      })
      setGenerations(generationsMap)

      // Fetch cross-platform suites
      const { data: suitesData, error: suitesError } = await supabase
        .from("cross_platform_test_suites")
        .select("*")
        .eq("user_id", user.id)

      if (suitesError) throw suitesError

      const suitesMap: Record<string, CrossPlatformSuite> = {}
      suitesData?.forEach((suite) => {
        suitesMap[suite.id] = suite
      })
      setCrossPlatformSuites(suitesMap)

      // Fetch existing executions
      await fetchExecutions(
        testCasesData?.map((tc) => tc.id) || [],
        crossPlatformData?.map((cp) => cp.id) || []
      )
    } catch (error) {
      console.error("Error fetching data:", error)
      toast.error("Failed to load test cases")
    } finally {
      setLoading(false)
    }
  }

  async function fetchExecutions(testCaseIds: string[], crossPlatformIds: string[]) {
    if (testCaseIds.length === 0 && crossPlatformIds.length === 0) return

    try {
      const supabase = createClient()
      const allIds = [...testCaseIds, ...crossPlatformIds]

      let query = supabase
        .from("test_executions")
        .select("*")
        .in("test_case_id", allIds)
        .order("created_at", { ascending: false })

      if (sessionId) {
        query = query.eq("session_id", sessionId)
      }

      const { data, error } = await query

      if (error) throw error

      const executionMap: TestExecution = {}

      data?.forEach((execution) => {
        if (!executionMap[execution.test_case_id]) {
          executionMap[execution.test_case_id] = {
            id: execution.id,
            status: execution.execution_status,
            completedSteps: execution.completed_steps || [],
            failedSteps: execution.failed_steps || [],
            notes: execution.execution_notes,
            failure_reason: execution.failure_reason,
            started_at: execution.started_at,
            completed_at: execution.completed_at,
            duration_minutes: execution.duration_minutes,
            test_environment: execution.test_environment,
            browser: execution.browser,
            os_version: execution.os_version,
          }
        }
      })

      ;[...testCaseIds, ...crossPlatformIds].forEach((testCaseId) => {
        if (!executionMap[testCaseId]) {
          executionMap[testCaseId] = {
            status: "not_run",
            completedSteps: [],
            failedSteps: [],
          }
        }
      })

      setExecution(executionMap)
    } catch (error) {
      console.error("Error fetching executions:", error)
    }
  }

  async function saveExecutionProgress(
    testCaseId: string,
    updates: Partial<TestExecution[string]>
  ) {
    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) return

      const currentExecution = execution[testCaseId]
      const executionData = {
        test_case_id: testCaseId,
        executed_by: user.id,
        session_id: sessionId || null,
        execution_status: updates.status || currentExecution.status,
        completed_steps: updates.completedSteps || currentExecution.completedSteps,
        failed_steps: updates.failedSteps || currentExecution.failedSteps,
        execution_notes: updates.notes || currentExecution.notes,
        failure_reason: updates.failure_reason || currentExecution.failure_reason,
        test_environment: updates.test_environment || currentExecution.test_environment || "staging",
        browser: updates.browser || currentExecution.browser,
        os_version: updates.os_version || currentExecution.os_version,
        started_at:
          currentExecution.started_at ||
          (updates.status === "in_progress" ? new Date().toISOString() : null),
        completed_at:
          updates.status === "passed" || updates.status === "failed"
            ? new Date().toISOString()
            : null,
        updated_at: new Date().toISOString(),
      }

      if (currentExecution.id) {
        const { error } = await supabase
          .from("test_executions")
          .update(executionData)
          .eq("id", currentExecution.id)

        if (error) throw error
      } else {
        const { data, error } = await supabase
          .from("test_executions")
          .insert(executionData)
          .select()
          .single()

        if (error) throw error

        setExecution((prev) => ({
          ...prev,
          [testCaseId]: {
            ...prev[testCaseId],
            id: data.id,
          },
        }))
      }
    } catch (error) {
      console.error("Error saving execution progress:", error)
      toast.error("Failed to save progress")
    }
  }

  function toggleStep(testCaseId: string, stepNumber: number) {
    const currentExecution = execution[testCaseId]
    const isCompleted = currentExecution.completedSteps.includes(stepNumber)

    const updatedSteps = isCompleted
      ? currentExecution.completedSteps.filter((s) => s !== stepNumber)
      : [...currentExecution.completedSteps, stepNumber]

    setExecution((prev) => ({
      ...prev,
      [testCaseId]: {
        ...prev[testCaseId],
        completedSteps: updatedSteps,
        status: prev[testCaseId].status === "not_run" ? "in_progress" : prev[testCaseId].status,
      },
    }))

    saveExecutionProgress(testCaseId, {
      completedSteps: updatedSteps,
      status: currentExecution.status === "not_run" ? "in_progress" : currentExecution.status,
    })
  }

  async function markTestResult(testCaseId: string, status: ExecutionStatus) {
    setSelectedTestCase(testCases.find((tc) => tc.id === testCaseId) || null)

    if (status === "passed") {
      await saveExecutionResult(testCaseId, status, {})
    } else {
      setShowExecutionDialog(true)
    }
  }

  async function updateTestCaseStatus(
    testCaseId: string,
    newStatus: "draft" | "active" | "archived"
  ) {
    setUpdating(testCaseId)
    try {
      const supabase = createClient()

      const { error } = await supabase
        .from("test_cases")
        .update({
          status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("id", testCaseId)

      if (error) throw error

      setTestCases((prev) => prev.map((tc) => (tc.id === testCaseId ? { ...tc, status: newStatus } : tc)))

      const statusLabels = {
        draft: "Draft",
        active: "Approved",
        archived: "Archived",
      }

      toast.success(`Status updated to ${statusLabels[newStatus]}`)
    } catch (error) {
      console.error("Error updating test case status:", error)
      toast.error("Failed to update status")
    } finally {
      setUpdating(null)
    }
  }

  async function saveExecutionResult(
    testCaseId: string,
    status: ExecutionStatus,
    details: ExecutionDetails
  ) {
    const startTime = execution[testCaseId]?.started_at
    const duration = startTime
      ? Math.round((new Date().getTime() - new Date(startTime).getTime()) / 60000)
      : undefined

    await saveExecutionProgress(testCaseId, {
      status: status,
      duration_minutes: duration,
      notes: details.notes,
      failure_reason: details.failure_reason,
      test_environment: details.environment,
      browser: details.browser,
      os_version: details.os_version,
    })

    setExecution((prev) => ({
      ...prev,
      [testCaseId]: {
        ...prev[testCaseId],
        status: status,
        completed_at: new Date().toISOString(),
        duration_minutes: duration,
      },
    }))

    const statusMessages = {
      passed: "Test marked as passed",
      failed: "Test marked as failed",
      blocked: "Test marked as blocked",
      skipped: "Test marked as skipped",
      not_run: "Test marked as not run",
      in_progress: "Test marked as in progress",
    } as const

    toast.success(statusMessages[status] || "Test status updated")
    setShowExecutionDialog(false)
  }

  async function resetTest(testCaseId: string) {
    await saveExecutionProgress(testCaseId, {
      status: "not_run",
      completedSteps: [],
      failedSteps: [],
      notes: "",
      failure_reason: "",
      started_at: undefined,
      completed_at: undefined,
    })

    setExecution((prev) => ({
      ...prev,
      [testCaseId]: {
        ...prev[testCaseId],
        status: "not_run",
        completedSteps: [],
        failedSteps: [],
        started_at: undefined,
        completed_at: undefined,
      },
    }))

    toast.success("Test reset")
  }

  function openCreateDialog() {
    setEditingTestCase(null)
    setShowCreateDialog(true)
  }

  function openEditDialog(testCase: TestCase) {
    setEditingTestCase(testCase)
    setShowEditDialog(true)
  }

  function openDeleteDialog(testCase: TestCase) {
    setDeletingTestCase(testCase)
    setShowDeleteDialog(true)
  }

  function openTestCaseDialog(
    testCase: TestCase | CrossPlatformTestCase,
    type: "regular" | "cross-platform"
  ) {
    setSelectedCase(testCase)
    setSelectedCaseType(type)
    setShowDetailsDialog(true)
  }

  function getPriorityColor(priority: string) {
    switch (priority) {
      case "critical":
        return "bg-red-500 text-white"
      case "high":
        return "bg-orange-500 text-white"
      case "medium":
        return "bg-yellow-500 text-black"
      case "low":
        return "bg-blue-500 text-white"
      default:
        return "bg-gray-500 text-white"
    }
  }

  function getRelativeTime(dateString: string) {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMins < 60) return `${diffMins} mins ago`
    if (diffHours < 24) return `${diffHours} hours ago`
    if (diffDays === 1) return "Yesterday"
    if (diffDays < 7) return `${diffDays} days ago`
    return date.toLocaleDateString()
  }

  const filteredTestCases = testCases.filter(
    (tc) =>
      tc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tc.description.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const filteredCrossPlatformCases = crossPlatformCases.filter(
    (tc) =>
      tc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tc.description.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const totalPages = Math.ceil(filteredTestCases.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedTestCases = filteredTestCases.slice(startIndex, endIndex)

  const crossPlatformTotalPages = Math.ceil(filteredCrossPlatformCases.length / itemsPerPage)
  const crossPlatformStartIndex = (crossPlatformCurrentPage - 1) * itemsPerPage
  const crossPlatformEndIndex = crossPlatformStartIndex + itemsPerPage
  const paginatedCrossPlatformCases = filteredCrossPlatformCases.slice(
    crossPlatformStartIndex,
    crossPlatformEndIndex
  )

  const regularStats = {
    total: filteredTestCases.length,
    passed: filteredTestCases.filter((tc) => execution[tc.id]?.status === "passed").length,
    failed: filteredTestCases.filter((tc) => execution[tc.id]?.status === "failed").length,
    blocked: filteredTestCases.filter((tc) => execution[tc.id]?.status === "blocked").length,
    skipped: filteredTestCases.filter((tc) => execution[tc.id]?.status === "skipped").length,
    inProgress: filteredTestCases.filter((tc) => execution[tc.id]?.status === "in_progress").length,
    notRun: filteredTestCases.filter((tc) => execution[tc.id]?.status === "not_run").length,
  }

  const crossPlatformStats = {
    total: filteredCrossPlatformCases.length,
    passed: filteredCrossPlatformCases.filter((tc) => execution[tc.id]?.status === "passed").length,
    failed: filteredCrossPlatformCases.filter((tc) => execution[tc.id]?.status === "failed").length,
    blocked: filteredCrossPlatformCases.filter((tc) => execution[tc.id]?.status === "blocked")
      .length,
    skipped: filteredCrossPlatformCases.filter((tc) => execution[tc.id]?.status === "skipped")
      .length,
    inProgress: filteredCrossPlatformCases.filter(
      (tc) => execution[tc.id]?.status === "in_progress"
    ).length,
    notRun: filteredCrossPlatformCases.filter((tc) => execution[tc.id]?.status === "not_run")
      .length,
  }

  function getProjectColor(color: string): string {
    const colors: Record<string, string> = {
      blue: "text-blue-500",
      green: "text-green-500",
      purple: "text-purple-500",
      orange: "text-orange-500",
      red: "text-red-500",
      pink: "text-pink-500",
      indigo: "text-indigo-500",
      yellow: "text-yellow-500",
      gray: "text-gray-500",
    }
    return colors[color] || "text-gray-500"
  }

  function handleProjectFilterChange(projectId: string) {
    setSelectedProject(projectId)
    setCurrentPage(1)
  }

  const renderTestSteps = (
    testCase: TestCase | CrossPlatformTestCase,
    type: "regular" | "cross-platform"
  ) => {
    if (type === "regular") {
      const regularCase = testCase as TestCase
      return regularCase.test_steps.map((step) => {
        const isCompleted = execution[testCase.id]?.completedSteps.includes(step.step_number)
        const failedStep = execution[testCase.id]?.failedSteps.find(
          (fs) => fs.step_number === step.step_number
        )

        return (
          <div
            key={step.step_number}
            className={`flex gap-3 p-3 rounded-lg border ${
              failedStep ? "bg-red-50 border-red-200" : "bg-card"
            }`}
          >
            <Checkbox
              checked={isCompleted}
              onCheckedChange={() => toggleStep(testCase.id, step.step_number)}
              className="mt-1"
            />
            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs bg-muted px-2 py-1 rounded">
                  Step {step.step_number}
                </span>
                <span className={isCompleted ? "line-through text-muted-foreground" : ""}>
                  {step.action}
                </span>
              </div>
              <div className="text-sm text-muted-foreground pl-16">
                <span className="font-semibold">Expected:</span> {step.expected}
              </div>
              {failedStep && (
                <div className="text-sm text-red-600 pl-16 bg-red-100 p-2 rounded mt-2">
                  <span className="font-semibold">Failed:</span> {failedStep.failure_reason}
                </div>
              )}
            </div>
          </div>
        )
      })
    } else {
      const crossPlatformCase = testCase as CrossPlatformTestCase
      return (
        crossPlatformCase.steps?.map((step, index) => {
          const stepNumber = index + 1
          const isCompleted = execution[testCase.id]?.completedSteps.includes(stepNumber)
          return (
            <div key={stepNumber} className="flex gap-3 p-3 rounded-lg border bg-card">
              <Checkbox
                checked={isCompleted}
                onCheckedChange={() => toggleStep(testCase.id, stepNumber)}
                className="mt-1"
              />
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs bg-muted px-2 py-1 rounded">
                    Step {stepNumber}
                  </span>
                  <span className={isCompleted ? "line-through text-muted-foreground" : ""}>
                    {step}
                  </span>
                </div>
                <div className="text-sm text-muted-foreground pl-16">
                  <span className="font-semibold">Expected:</span>{" "}
                  {crossPlatformCase.expected_results?.[index] || "Expected result defined"}
                </div>
              </div>
            </div>
          )
        }) || []
      )
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Session Info */}
      {currentSession && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-blue-900">{currentSession.name}</h3>
              <p className="text-blue-700 text-sm">
                Test Session • Environment: {currentSession.environment}
              </p>
            </div>
            <Badge variant={currentSession.status === "in_progress" ? "default" : "secondary"}>
              {currentSession.status === "in_progress" && <Clock className="h-3 w-3 mr-1" />}
              {currentSession.status}
            </Badge>
          </div>
        </div>
      )}

      {/* Header with Search and Actions */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search test cases..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value)
              setCurrentPage(1)
              setCrossPlatformCurrentPage(1)
            }}
            className="pl-10"
          />
        </div>

        {/* Project Filter */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="min-w-[180px] justify-between">
              {selectedProjectName ? (
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <FolderOpen className="h-4 w-4 shrink-0" />
                  <span className="truncate">{selectedProjectName}</span>
                </div>
              ) : (
                <span className="text-muted-foreground">All Projects</span>
              )}
              <ChevronDown className="h-4 w-4 ml-2 shrink-0 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[220px]">
            <DropdownMenuLabel>Filter by Project</DropdownMenuLabel>
            <DropdownMenuSeparator />

            <DropdownMenuItem onClick={() => handleProjectFilterChange("")}>
              All Projects
            </DropdownMenuItem>

            {projects.length > 0 && <DropdownMenuSeparator />}

            {projects.map((project) => (
              <DropdownMenuItem
                key={project.id}
                onClick={() => handleProjectFilterChange(project.id)}
              >
                <FolderOpen className={`h-4 w-4 mr-2 ${getProjectColor(project.color)}`} />
                <span>{project.name}</span>
              </DropdownMenuItem>
            ))}

            {projects.length === 0 && (
              <div className="px-2 py-6 text-center text-sm text-muted-foreground">
                No projects yet
              </div>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        <Button onClick={openCreateDialog} className="gap-2">
          <Plus className="h-4 w-4" />
          New Test Case
        </Button>
        <Button variant="outline" size="default">
          <FileDown className="h-4 w-4 mr-2" />
          Export
        </Button>
      </div>

      {/* Tabbed Interface */}
      <Tabs defaultValue="regular" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="regular" className="flex items-center gap-2">
            <FlaskConical className="h-4 w-4" />
            Regular Tests ({regularStats.total})
          </TabsTrigger>
          <TabsTrigger value="cross-platform" className="flex items-center gap-2">
            <Layers className="h-4 w-4" />
            Cross-Platform ({crossPlatformStats.total})
          </TabsTrigger>
        </TabsList>

        {/* Regular Test Cases Tab */}
        <TabsContent value="regular" className="space-y-6">
          {/* Test Stats */}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            <div className="bg-card p-4 rounded-lg border">
              <div className="text-2xl font-bold">{regularStats.total}</div>
              <div className="text-sm text-muted-foreground">Total</div>
            </div>
            <div className="bg-card p-4 rounded-lg border">
              <div className="text-2xl font-bold text-green-600">{regularStats.passed}</div>
              <div className="text-sm text-muted-foreground">Passed</div>
            </div>
            <div className="bg-card p-4 rounded-lg border">
              <div className="text-2xl font-bold text-red-600">{regularStats.failed}</div>
              <div className="text-sm text-muted-foreground">Failed</div>
            </div>
            <div className="bg-card p-4 rounded-lg border">
              <div className="text-2xl font-bold text-orange-600">{regularStats.blocked}</div>
              <div className="text-sm text-muted-foreground">Blocked</div>
            </div>
            <div className="bg-card p-4 rounded-lg border">
              <div className="text-2xl font-bold text-blue-600">{regularStats.inProgress}</div>
              <div className="text-sm text-muted-foreground">In Progress</div>
            </div>
            <div className="bg-card p-4 rounded-lg border">
              <div className="text-2xl font-bold text-gray-500">{regularStats.notRun}</div>
              <div className="text-sm text-muted-foreground">Not Run</div>
            </div>
          </div>

          {/* Test Cases Table */}
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead className="w-[140px]">Project</TableHead>
                  <TableHead className="w-[120px]">Status</TableHead>
                  <TableHead className="w-[100px]">Priority</TableHead>
                  <TableHead className="w-[100px]">Type</TableHead>
                  <TableHead className="w-[150px]">Generation</TableHead>
                  <TableHead className="w-[120px]">Created</TableHead>
                  <TableHead className="w-[80px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedTestCases.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-12">
                      <div className="flex flex-col items-center gap-2">
                        <FlaskConical className="h-8 w-8 text-muted-foreground" />
                        <p className="text-muted-foreground">No test cases found</p>
                        <Button onClick={openCreateDialog} variant="outline" className="mt-2">
                          <Plus className="h-4 w-4 mr-2" />
                          Create your first test case
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedTestCases.map((testCase) => {
                    const exec = execution[testCase.id]
                    const generation = generations[testCase.generation_id]

                    return (
                      <TableRow key={testCase.id}>
                        {/* Title */}
                        <TableCell className="font-medium">
                          <div
                            className="flex items-center gap-2 cursor-pointer hover:text-primary"
                            onClick={() => openTestCaseDialog(testCase, "regular")}
                          >
                            {exec?.status === "passed" && (
                              <CheckCircle2 className="h-4 w-4 text-green-600" />
                            )}
                            {exec?.status === "failed" && (
                              <XCircle className="h-4 w-4 text-red-600" />
                            )}
                            {exec?.status === "blocked" && (
                              <AlertTriangle className="h-4 w-4 text-orange-600" />
                            )}
                            {exec?.status === "skipped" && (
                              <Circle className="h-4 w-4 text-gray-400" />
                            )}
                            {exec?.status === "in_progress" && (
                              <Clock className="h-4 w-4 text-blue-600" />
                            )}
                            {exec?.status === "not_run" && (
                              <Circle className="h-4 w-4 text-gray-400" />
                            )}
                            <span>{testCase.title}</span>
                            {exec?.duration_minutes && (
                              <span className="text-xs text-muted-foreground">
                                ({exec.duration_minutes}m)
                              </span>
                            )}
                          </div>
                        </TableCell>

                        {/* Project */}
                        <TableCell>
                          {testCase.projects ? (
                            <div className="flex items-center gap-2">
                              <FolderOpen
                                className={`h-4 w-4 ${getProjectColor(testCase.projects.color)}`}
                              />
                              <span className="text-sm truncate">{testCase.projects.name}</span>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">No project</span>
                          )}
                        </TableCell>

                        {/* Status */}
                        <TableCell>
                          <Select
                            value={testCase.status}
                            onValueChange={(value: "draft" | "active" | "archived") =>
                              updateTestCaseStatus(testCase.id, value)
                            }
                            disabled={updating === testCase.id}
                          >
                            <SelectTrigger className="w-[120px] h-8">
                              {updating === testCase.id && (
                                <Loader2 className="h-3 w-3 animate-spin mr-2" />
                              )}
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="draft">Draft</SelectItem>
                              <SelectItem value="active">Approved</SelectItem>
                              <SelectItem value="archived">Archived</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>

                        {/* Priority */}
                        <TableCell>
                          <Badge className={getPriorityColor(testCase.priority)}>
                            {testCase.priority}
                          </Badge>
                        </TableCell>

                        {/* Type */}
                        <TableCell>
                          <Badge variant="secondary">{testCase.test_type}</Badge>
                        </TableCell>

                        {/* Generation */}
                        <TableCell className="text-muted-foreground text-sm">
                          {generation?.title || "Manual"}
                        </TableCell>

                        {/* Created */}
                        <TableCell className="text-muted-foreground text-sm">
                          {getRelativeTime(testCase.created_at)}
                        </TableCell>

                        {/* Actions */}
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => openTestCaseDialog(testCase, "regular")}
                              >
                                <Eye className="h-4 w-4 mr-2" />
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => openEditDialog(testCase)}>
                                <Edit3 className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => openDeleteDialog(testCase)}
                                className="text-destructive"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Showing {startIndex + 1}-{Math.min(endIndex, filteredTestCases.length)} of{" "}
                {filteredTestCases.length} test cases
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </TabsContent>

        {/* Cross-Platform Tab - Simplified */}
        <TabsContent value="cross-platform" className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            <div className="bg-card p-4 rounded-lg border">
              <div className="text-2xl font-bold">{crossPlatformStats.total}</div>
              <div className="text-sm text-muted-foreground">Total</div>
            </div>
            <div className="bg-card p-4 rounded-lg border">
              <div className="text-2xl font-bold text-green-600">{crossPlatformStats.passed}</div>
              <div className="text-sm text-muted-foreground">Passed</div>
            </div>
            <div className="bg-card p-4 rounded-lg border">
              <div className="text-2xl font-bold text-red-600">{crossPlatformStats.failed}</div>
              <div className="text-sm text-muted-foreground">Failed</div>
            </div>
            <div className="bg-card p-4 rounded-lg border">
              <div className="text-2xl font-bold text-orange-600">{crossPlatformStats.blocked}</div>
              <div className="text-sm text-muted-foreground">Blocked</div>
            </div>
            <div className="bg-card p-4 rounded-lg border">
              <div className="text-2xl font-bold text-blue-600">
                {crossPlatformStats.inProgress}
              </div>
              <div className="text-sm text-muted-foreground">In Progress</div>
            </div>
            <div className="bg-card p-4 rounded-lg border">
              <div className="text-2xl font-bold text-gray-500">{crossPlatformStats.notRun}</div>
              <div className="text-sm text-muted-foreground">Not Run</div>
            </div>
          </div>

          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead className="w-[100px]">Platform</TableHead>
                  <TableHead className="w-[100px]">Framework</TableHead>
                  <TableHead className="w-[100px]">Priority</TableHead>
                  <TableHead className="w-[150px]">Requirement</TableHead>
                  <TableHead className="w-[120px]">Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedCrossPlatformCases.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12">
                      <div className="flex flex-col items-center gap-2">
                        <Layers className="h-8 w-8 text-muted-foreground" />
                        <p className="text-muted-foreground">No cross-platform test cases found</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedCrossPlatformCases.map((testCase) => {
                    const exec = execution[testCase.id]
                    const suite = crossPlatformSuites[testCase.suite_id]
                    const Icon = platformIcons[testCase.platform as keyof typeof platformIcons]

                    return (
                      <TableRow
                        key={testCase.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => openTestCaseDialog(testCase, "cross-platform")}
                      >
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            {exec?.status === "passed" && (
                              <CheckCircle2 className="h-4 w-4 text-green-600" />
                            )}
                            {exec?.status === "failed" && (
                              <XCircle className="h-4 w-4 text-red-600" />
                            )}
                            {exec?.status === "blocked" && (
                              <AlertTriangle className="h-4 w-4 text-orange-600" />
                            )}
                            {exec?.status === "skipped" && (
                              <Circle className="h-4 w-4 text-gray-400" />
                            )}
                            {exec?.status === "in_progress" && (
                              <Clock className="h-4 w-4 text-blue-600" />
                            )}
                            {exec?.status === "not_run" && (
                              <Circle className="h-4 w-4 text-gray-400" />
                            )}
                            <span>{testCase.title}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {Icon && <Icon className="h-4 w-4" />}
                            <Badge variant="default">{testCase.platform}</Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{testCase.framework}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={getPriorityColor(testCase.priority)}>
                            {testCase.priority}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {suite?.requirement ||
                            testCase.cross_platform_test_suites?.requirement ||
                            "N/A"}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {getRelativeTime(testCase.created_at)}
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {crossPlatformTotalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Showing {crossPlatformStartIndex + 1}-
                {Math.min(crossPlatformEndIndex, filteredCrossPlatformCases.length)} of{" "}
                {filteredCrossPlatformCases.length} test cases
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCrossPlatformCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={crossPlatformCurrentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setCrossPlatformCurrentPage((p) => Math.min(crossPlatformTotalPages, p + 1))
                  }
                  disabled={crossPlatformCurrentPage === crossPlatformTotalPages}
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <TestCaseFormDialog
        open={showCreateDialog || showEditDialog}
        mode={showCreateDialog ? "create" : "edit"}
        testCase={editingTestCase}
        generationId={generationId}
        onClose={() => {
          setShowCreateDialog(false)
          setShowEditDialog(false)
          setEditingTestCase(null)
        }}
        onSuccess={fetchData}
      />

      <TestExecutionDialog
        open={showExecutionDialog}
        initialData={
          selectedTestCase
            ? {
                notes: execution[selectedTestCase.id]?.notes,
                failure_reason: execution[selectedTestCase.id]?.failure_reason,
                environment: execution[selectedTestCase.id]?.test_environment || "staging",
                browser: execution[selectedTestCase.id]?.browser,
                os_version: execution[selectedTestCase.id]?.os_version,
              }
            : undefined
        }
        onClose={() => setShowExecutionDialog(false)}
        onSave={(details) => {
          if (selectedTestCase) {
            saveExecutionResult(selectedTestCase.id, "failed", details)
          }
        }}
      />

      <DeleteTestCaseDialog
        testCase={deletingTestCase}
        open={showDeleteDialog}
        onClose={() => {
          setShowDeleteDialog(false)
          setDeletingTestCase(null)
        }}
        onSuccess={() => {
          fetchData()
          if (deletingTestCase) {
            setExecution((prev) => {
              const newExecution = { ...prev }
              delete newExecution[deletingTestCase.id]
              return newExecution
            })
          }
        }}
      />

      {/* Test Case Details Dialog */}
      {selectedCase && (
        <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
          <DialogContent
            className="w-[95vw] sm:max-w-3xl max-h-[90vh] flex flex-col p-0"
            onInteractOutside={(e) => e.preventDefault()}
          >
            <DialogHeader className="sticky top-0 z-10 bg-background p-6 border-b">
              <div className="flex items-start justify-between">
                <div className="space-y-2 flex-1">
                  <DialogTitle className="flex items-center gap-3">
                    {execution[selectedCase.id]?.status === "passed" && (
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                    )}
                    {execution[selectedCase.id]?.status === "failed" && (
                      <XCircle className="h-5 w-5 text-red-600" />
                    )}
                    {execution[selectedCase.id]?.status === "blocked" && (
                      <AlertTriangle className="h-5 w-5 text-orange-600" />
                    )}
                    {execution[selectedCase.id]?.status === "skipped" && (
                      <Circle className="h-5 w-5 text-gray-400" />
                    )}
                    {execution[selectedCase.id]?.status === "in_progress" && (
                      <Clock className="h-5 w-5 text-blue-600" />
                    )}
                    {execution[selectedCase.id]?.status === "not_run" && (
                      <Circle className="h-5 w-5 text-gray-400" />
                    )}
                    {selectedCase.title}
                  </DialogTitle>
                  <div className="flex items-center gap-2 flex-wrap pt-2">
                    <Badge className={getPriorityColor(selectedCase.priority)}>
                      {selectedCase.priority}
                    </Badge>
                    {selectedCaseType === "regular" ? (
                      <Badge variant="secondary">{(selectedCase as TestCase).test_type}</Badge>
                    ) : (
                      <Badge variant="default">
                        {(selectedCase as CrossPlatformTestCase).platform}
                      </Badge>
                    )}
                    <span className="text-xs">
                      {execution[selectedCase.id]?.completedSteps.length || 0}/
                      {selectedCaseType === "regular"
                        ? (selectedCase as TestCase).test_steps.length
                        : (selectedCase as CrossPlatformTestCase).steps?.length || 0}{" "}
                      steps
                    </span>
                    {execution[selectedCase.id]?.duration_minutes && (
                      <span className="text-xs">
                        <Clock className="h-3 w-3 inline mr-1" />
                        {execution[selectedCase.id].duration_minutes}m
                      </span>
                    )}
                    {selectedCaseType === "regular" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditDialog(selectedCase as TestCase)}
                        className="ml-auto"
                      >
                        <Edit3 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-full flex-shrink-0"
                  onClick={() => setShowDetailsDialog(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto px-6 py-4">
              <div className="space-y-6">
                <div>
                  <h4 className="font-semibold mb-2">Description</h4>
                  <p className="text-sm text-muted-foreground">{selectedCase.description}</p>
                </div>

                {execution[selectedCase.id]?.notes && (
                  <div>
                    <h4 className="font-semibold mb-2">Execution Notes</h4>
                    <p className="text-sm text-muted-foreground bg-blue-50 p-3 rounded-lg">
                      {execution[selectedCase.id].notes}
                    </p>
                  </div>
                )}

                {execution[selectedCase.id]?.failure_reason && (
                  <div>
                    <h4 className="font-semibold mb-2 text-red-600">Failure Reason</h4>
                    <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">
                      {execution[selectedCase.id].failure_reason}
                    </p>
                  </div>
                )}

                {selectedCase.preconditions && (
                  <div>
                    <h4 className="font-semibold mb-2">Preconditions</h4>
                    <p className="text-sm text-muted-foreground">
                      {selectedCaseType === "regular"
                        ? (selectedCase.preconditions as string)
                        : (selectedCase as CrossPlatformTestCase).preconditions.join(", ")}
                    </p>
                  </div>
                )}

                <div>
                  <h4 className="font-semibold mb-3">Test Steps</h4>
                  <div className="space-y-3">{renderTestSteps(selectedCase, selectedCaseType)}</div>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Expected Result</h4>
                  <p className="text-sm text-muted-foreground bg-muted p-3 rounded-lg">
                    {selectedCaseType === "regular"
                      ? (selectedCase as TestCase).expected_result
                      : (selectedCase as CrossPlatformTestCase).expected_results?.join("; ") ||
                        "See individual step expectations"}
                  </p>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t grid grid-cols-2 md:grid-cols-5 gap-2 flex-shrink-0">
              <Button
                onClick={() => markTestResult(selectedCase.id, "passed")}
                disabled={
                  execution[selectedCase.id]?.status === "passed" || updating === selectedCase.id
                }
                variant={execution[selectedCase.id]?.status === "passed" ? "default" : "outline"}
                size="sm"
              >
                {updating === selectedCase.id ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 mr-1" />
                )}
                Pass
              </Button>
              <Button
                onClick={() => markTestResult(selectedCase.id, "failed")}
                disabled={
                  execution[selectedCase.id]?.status === "failed" || updating === selectedCase.id
                }
                variant={
                  execution[selectedCase.id]?.status === "failed" ? "destructive" : "outline"
                }
                size="sm"
              >
                {updating === selectedCase.id ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <XCircle className="h-4 w-4 mr-1" />
                )}
                Fail
              </Button>
              <Button
                onClick={() => markTestResult(selectedCase.id, "blocked")}
                disabled={
                  execution[selectedCase.id]?.status === "blocked" || updating === selectedCase.id
                }
                variant={execution[selectedCase.id]?.status === "blocked" ? "secondary" : "outline"}
                size="sm"
              >
                <AlertTriangle className="h-4 w-4 mr-1" />
                Block
              </Button>
              <Button
                onClick={() => markTestResult(selectedCase.id, "skipped")}
                disabled={
                  execution[selectedCase.id]?.status === "skipped" || updating === selectedCase.id
                }
                variant="outline"
                size="sm"
              >
                <Circle className="h-4 w-4 mr-1" />
                Skip
              </Button>
              <Button onClick={() => resetTest(selectedCase.id)} variant="ghost" size="sm">
                <RotateCcw className="h-4 w-4 mr-1" />
                Reset
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}