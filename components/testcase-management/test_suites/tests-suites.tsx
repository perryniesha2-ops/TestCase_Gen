"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetClose } from "@/components/ui/sheet"
import { TestSessionExecution } from "./testsessionexecution"
import {
  Play,
  Plus,
  FileText,
  BarChart3,
  Settings,
  Trash2,
  Target,
  CalendarIcon,
  Edit3,
  MoreHorizontal,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Search,
  Filter,
  FolderOpen,
  Code2, Zap,Loader2,
} from "lucide-react"
import { TestSuite, TestSession, SuiteType, SessionStats, Project } from "@/types/test-cases"
import { TestSuiteDetailsDialog } from "./testSuiteDetailsDialog"
import { SuiteReports } from "./suitesreport"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Progress } from "@/components/ui/progress"
import { ExecutionHistory } from "./executionhistory"

interface FormData {
  name: string
  description: string
  suite_type: SuiteType
  planned_start_date: string
  planned_end_date: string
  project_id: string
}

type SuiteEditForm = {
  name: string
  status: string
  suite_type: SuiteType
}

export function TestSuitesPage() {
  const [testSuites, setTestSuites] = useState<TestSuite[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterType, setFilterType] = useState<string>("all")
  const [filterProject, setFilterProject] = useState<string>("all")
  const [projects, setProjects] = useState<Project[]>([])

  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [selectedSuite, setSelectedSuite] = useState<TestSuite | null>(null)
  const [showDetailsDialog, setShowDetailsDialog] = useState(false)
  const [activeTab, setActiveTab] = useState("suites")

  const [executingSuite, setExecutingSuite] = useState<TestSuite | null>(null)
  const [showExecutionDialog, setShowExecutionDialog] = useState(false)

  //script generation
  const [generatingScripts, setGeneratingScripts] = useState<string | null>(null)
  const [runningAutomation, setRunningAutomation] = useState<string | null>(null)

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [drawerSuite, setDrawerSuite] = useState<TestSuite | null>(null)
  const [editingSuite, setEditingSuite] = useState<TestSuite | null>(null)
  const [editOpen, setEditOpen] = useState(false)
  const [editSaving, setEditSaving] = useState(false)


function openSuiteDrawer(suite: TestSuite) {
  setDrawerSuite(suite)
  setDrawerOpen(true)
}


  const [formData, setFormData] = useState<FormData>({
    name: "",
    description: "",
    suite_type: "manual",
    planned_start_date: "",
    planned_end_date: "",
    project_id: "",
  })

  

  useEffect(() => {
    fetchTestSuites()
    fetchProjects()
  }, [])

  async function fetchTestSuites() {
    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) return

      const { data, error } = await supabase
        .from("test_suites")
        .select(`
          *,
          projects:project_id(id, name, color, icon)
        `)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })

      if (error) throw error

      // Get execution stats and test case count for each suite
      const suitesWithStats = await Promise.all(
        (data || []).map(async (suite) => {
          // Get test case count
          const { data: testCases } = await supabase
            .from("test_suite_cases")
            .select("id")
            .eq("suite_id", suite.id)

          // Get execution stats
          const { data: executions } = await supabase
            .from("test_executions")
            .select("execution_status")
            .eq("suite_id", suite.id)

          const stats =
            executions?.reduce(
              (acc, exec) => {
                acc.total++
                if (exec.execution_status === "passed") acc.passed++
                else if (exec.execution_status === "failed") acc.failed++
                else if (exec.execution_status === "skipped") acc.skipped++
                else if (exec.execution_status === "blocked") acc.blocked++
                return acc
              },
              { total: 0, passed: 0, failed: 0, skipped: 0, blocked: 0 }
            ) ?? { total: 0, passed: 0, failed: 0, skipped: 0, blocked: 0 }

            const { data: suiteCases, error: suiteCasesError } = await supabase
  .from("test_suite_cases")
  .select(`
    test_case_id,
    test_cases (
      id,
      test_steps
    )
  `)
  .eq("suite_id", suite.id)

if (suiteCasesError) throw suiteCasesError

const eligibleCaseIds = (suiteCases ?? [])
  .map((row: any) => {
    const tc = Array.isArray(row.test_cases) ? row.test_cases[0] : row.test_cases
    const hasSteps = Array.isArray(tc?.test_steps) && tc.test_steps.length > 0
    return hasSteps ? row.test_case_id : null
  })
  .filter(Boolean) as string[]

const eligible_count = eligibleCaseIds.length

let scripted_count = 0
if (eligibleCaseIds.length > 0) {
  const { data: scripts, error: scriptsError } = await supabase
    .from("automation_scripts")
    .select("test_case_id")
    .in("test_case_id", eligibleCaseIds)

  if (scriptsError) throw scriptsError
  scripted_count = scripts?.length ?? 0
}

const mode: "manual" | "partial" | "automated" =
  eligible_count > 0 && scripted_count === eligible_count
    ? "automated"
    : scripted_count > 0
      ? "partial"
      : "manual"


          return {
            ...suite,
            test_case_count: testCases?.length || 0,
            execution_stats: stats,
              automation: { eligible_count, scripted_count, mode },

          }
        })
      )

      

      setTestSuites(suitesWithStats)
    } catch (error) {
      console.error("Error fetching test suites:", error)
      toast.error("Failed to load test suites")
    } finally {
      setLoading(false)
    }
  }


  useEffect(() => {
  if (!drawerSuite) return
  const updated = testSuites.find((s) => s.id === drawerSuite.id)
  if (updated) setDrawerSuite(updated)
}, [testSuites, drawerSuite?.id])



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

  async function createTestSuite() {
    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) return

      const { data, error } = await supabase
        .from("test_suites")
        .insert({
          user_id: user.id,
          name: formData.name,
          description: formData.description,
          suite_type: formData.suite_type,
          planned_start_date: formData.planned_start_date || null,
          planned_end_date: formData.planned_end_date || null,
          project_id: formData.project_id || null,
        })
        .select()
        .single()

      if (error) throw error

      setTestSuites((prev) => [
        {
          ...data,
          test_case_count: 0,
          execution_stats: {
            total: 0,
            passed: 0,
            failed: 0,
            skipped: 0,
            blocked: 0,
          },
        },
        ...prev,
      ])
      setShowCreateDialog(false)
      resetForm()
      toast.success("Test suite created successfully")
    } catch (error) {
      console.error("Error creating test suite:", error)
      toast.error("Failed to create test suite")
    }
  }


  type ScriptableTestStep = {
  step_number: number
  action: string
  expected: string
  data?: string
}

type ScriptableTestCase = {
  id: string
  title: string
  description: string
  test_steps: ScriptableTestStep[]
}

type SuiteCaseRow = {
  test_case_id: string
  test_cases: ScriptableTestCase | ScriptableTestCase[] | null
}

async function generateSuiteScripts(suite: TestSuite) {
  setGeneratingScripts(suite.id)

  try {
    const supabase = createClient()

    // Get all test cases in suite
    const { data, error: fetchError } = await supabase
      .from("test_suite_cases")
      .select(
        `
        test_case_id,
        test_cases (
          id,
          title,
          description,
          test_steps
        )
      `
      )
      .eq("suite_id", suite.id)

    if (fetchError) throw fetchError

    const rows = (data ?? []) as SuiteCaseRow[]

    // Normalize join shape: test_cases can be object OR array OR null
    const testCases: ScriptableTestCase[] = rows
      .map((r) => (Array.isArray(r.test_cases) ? r.test_cases[0] : r.test_cases))
      .filter((tc): tc is ScriptableTestCase => {
        if (!tc) return false
        return Array.isArray(tc.test_steps) && tc.test_steps.length > 0
      })

    if (testCases.length === 0) {
      toast.error("No test cases with steps found in this suite")
      return
    }

    let generated = 0
    let skipped = 0
    let failed = 0

    for (const testCase of testCases) {
      try {
        // Check if script already exists (use maybeSingle to avoid errors when none exists)
        const { data: existing, error: existingError } = await supabase
          .from("automation_scripts")
          .select("id")
          .eq("test_case_id", testCase.id)
          .maybeSingle()

        // If there was a real error (not "no rows"), treat as failure
        if (existingError) {
          console.error("Error checking existing script:", existingError)
          failed++
          continue
        }

        if (existing?.id) {
          skipped++
          continue
        }

        const response = await fetch("/api/generate-script", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            testCaseId: testCase.id,
            testName: testCase.title,
            testSteps: testCase.test_steps,
            framework: "playwright",
            timeout: 30000,
          }),
        })

        if (!response.ok) {
          failed++
          // Optional: read text for debugging without crashing
          const msg = await response.text().catch(() => "")
          console.error(`Generate script failed for ${testCase.id}:`, response.status, msg)
          continue
        }

        generated++
      } catch (err) {
        failed++
        console.error(`Failed to generate script for ${testCase.title}:`, err)
      }
    }

    toast.success(`Generated ${generated} scripts`, {
      description: [
        skipped > 0 ? `Skipped ${skipped} (already have scripts)` : null,
        failed > 0 ? `Failed ${failed}` : null,
      ]
        .filter(Boolean)
        .join(" • "),
    })

    await fetchTestSuites() // Refresh
  } catch (error) {
    console.error("Error generating suite scripts:", error)
    toast.error("Failed to generate automation scripts")
  } finally {
    setGeneratingScripts(null)
  }
}

async function runSuiteAutomation(suite: TestSuite) {
  setRunningAutomation(suite.id)
  
  try {
    // This will be Week 2 implementation
    // For now, just show a message
    toast.info('Automation execution coming in Week 2!', {
      description: 'Script generation is complete. Execution engine coming soon.'
    })
  } finally {
    setRunningAutomation(null)
  }
}


  async function deleteTestSuite(suiteId: string) {
    const confirmed = window.confirm(
      "Delete this test suite and all its assigned sessions, executions and links? This cannot be undone."
    )
    if (!confirmed) return

    try {
      const supabase = createClient()

      // Delete sessions for this suite
      const { data: sessions } = await supabase
        .from("test_run_sessions")
        .select("id")
        .eq("suite_id", suiteId)

      const sessionIds = (sessions ?? []).map((s) => s.id)

      // Delete executions for those sessions
      if (sessionIds.length > 0) {
        await supabase.from("test_executions").delete().in("session_id", sessionIds)
      }

      // Delete executions with suite_id
      await supabase.from("test_executions").delete().eq("suite_id", suiteId)

      // Delete sessions
      if (sessionIds.length > 0) {
        await supabase.from("test_run_sessions").delete().in("id", sessionIds)
      }

      // Delete junction rows
      await supabase.from("test_suite_cases").delete().eq("suite_id", suiteId)

      // Delete the suite
      const { error } = await supabase.from("test_suites").delete().eq("id", suiteId)

      if (error) throw error

      setTestSuites((prev) => prev.filter((s) => s.id !== suiteId))
      toast.success("Test suite deleted")
    } catch (error) {
      console.error("Error deleting test suite:", error)
      toast.error("Failed to delete test suite")
    }
  }

  function resetForm() {
    setFormData({
      name: "",
      description: "",
      suite_type: "manual",
      planned_start_date: "",
      planned_end_date: "",
      project_id: "",
    })
  }

  function getSuiteTypeColor(type: string) {
    switch (type) {
      case "regression":
        return "bg-blue-500 text-white"
      case "smoke":
        return "bg-green-500 text-white"
      case "integration":
        return "bg-purple-500 text-white"
      case "automated":
        return "bg-green-500 text-white"
      case "partial":
        return "bg-orange-500 text-white"
      default:
        return "bg-gray-500 text-white"
    }
  }

  function getStatusBadge(status: string) {
    switch (status) {
      case "active":
        return (
          <Badge variant="default" className="bg-green-500">
            Active
          </Badge>
        )
      case "completed":
        return <Badge variant="secondary">Completed</Badge>
      case "archived":
        return <Badge variant="outline">Archived</Badge>
      default:
        return <Badge variant="outline">Draft</Badge>
    }
  }

  function handleExecutionComplete() {
    setShowExecutionDialog(false)
    setExecutingSuite(null)
    fetchTestSuites()
  }

  function startSuiteExecution(suite: TestSuite) {
    setExecutingSuite(suite)
    setShowExecutionDialog(true)
  }

  function getStatusIcon(status: string) {
    if (status === "active") return <Clock className="h-4 w-4 text-green-500" />
    if (status === "completed")
      return <CheckCircle2 className="h-4 w-4 text-blue-500" />
    return <AlertTriangle className="h-4 w-4 text-gray-400" />
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

  // Filter suites
  const filteredSuites = testSuites.filter((suite) => {
    const matchesSearch =
      suite.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      suite.description?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesType = filterType === "all" || suite.suite_type === filterType
    const matchesProject =
      filterProject === "all" || 
      suite.project_id === filterProject ||
      (filterProject === "none" && !suite.project_id)
    return matchesSearch && matchesType && matchesProject
  })

  // Calculate summary stats
  const summaryStats = {
    total: testSuites.length,
    active: testSuites.filter((s) => s.status === "active").length,
    completed: testSuites.filter((s) => s.status === "completed").length,
    totalTests: testSuites.reduce((sum, s) => sum + (s.test_case_count || 0), 0),
  }

  
  function getDisplaySuiteType(suite: TestSuite) {
  if (suite.suite_type !== "manual") return suite.suite_type
  const mode = suite.automation?.mode
  if (mode === "automated") return "automated"
  if (mode === "partial") return "partial"
  return "manual"
}

const [suiteEditForm, setSuiteEditForm] = useState<SuiteEditForm>({
  name: "",
  status: "active",
  suite_type: "manual",
})

function openEditSuite(suite: TestSuite) {
  setEditingSuite(suite)
  setSuiteEditForm({
    name: suite.name ?? "",
    status: suite.status ?? "active",
    suite_type: suite.suite_type ?? "manual",
  })
  setEditOpen(true)
}


async function updateSuiteDetails() {
  if (!editingSuite) return

  setEditSaving(true)
  try {
    const supabase = createClient()

    const { error } = await supabase
      .from("test_suites")
      .update({
        name: suiteEditForm.name.trim(),
        status: suiteEditForm.status,
        suite_type: suiteEditForm.suite_type,
        updated_at: new Date().toISOString(),
      })
      .eq("id", editingSuite.id)

    if (error) throw error

    toast.success("Suite updated")
    setEditOpen(false)
    setEditingSuite(null)

    // Refresh list + drawer suite
    await fetchTestSuites()
  } catch (err) {
    console.error("Error updating suite:", err)
    toast.error("Failed to update suite")
  } finally {
    setEditSaving(false)
  }
}



  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          
        </div>
        <Button onClick={() => setShowCreateDialog(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          New Test Suite
        </Button>
      </div>
        {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="suites" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Test Suites ({testSuites.length})
          </TabsTrigger>
        
        <TabsTrigger value="history" className="flex items-center gap-2">
       <Clock className="h-4 w-4" />
        Execution History
        </TabsTrigger>

          <TabsTrigger value="reports" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Reports &amp; Analytics
          </TabsTrigger>
        </TabsList>


      {/* Summary Cards */}
      

    
        {/* Test Suites Tab */}
        <TabsContent value="suites" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-card border rounded-lg p-4">
          <div className="text-2xl font-bold">{summaryStats.total}</div>
          <div className="text-sm text-muted-foreground">Total Suites</div>
        </div>
        <div className="bg-card border rounded-lg p-4">
          <div className="text-2xl font-bold text-green-600">{summaryStats.active}</div>
          <div className="text-sm text-muted-foreground">Active</div>
        </div>
        <div className="bg-card border rounded-lg p-4">
          <div className="text-2xl font-bold text-blue-600">{summaryStats.completed}</div>
          <div className="text-sm text-muted-foreground">Completed</div>
        </div>
        <div className="bg-card border rounded-lg p-4">
          <div className="text-2xl font-bold">{summaryStats.totalTests}</div>
          <div className="text-sm text-muted-foreground">Total Test Cases</div>
        </div>
      </div>
          {/* Search and Filter */}
          <div className="flex items-center gap-4">
            
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search test suites..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-[200px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="manual">Manual</SelectItem>
                <SelectItem value="automated">Automated</SelectItem>
                <SelectItem value="regression">Regression</SelectItem>
                <SelectItem value="smoke">Smoke</SelectItem>
                <SelectItem value="integration">Integration</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterProject} onValueChange={setFilterProject}>
              <SelectTrigger className="w-[200px]">
                <FolderOpen className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by project" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Projects</SelectItem>
                <SelectItem value="none">
                  <span className="text-muted-foreground">No Project</span>
                </SelectItem>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Suite Name</TableHead>
                  <TableHead className="w-[120px]">Type</TableHead>
                  <TableHead className="w-[140px]">Project</TableHead>
                  <TableHead className="w-[100px]">Status</TableHead>
                  <TableHead className="w-[100px]">Test Cases</TableHead>
                  <TableHead className="w-[200px]">Progress</TableHead>
                  <TableHead className="w-[180px]">Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSuites.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12">
                      <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">No test suites found</h3>
                      <p className="text-muted-foreground mb-4">
                        {searchTerm || filterType !== "all"
                          ? "Try adjusting your search or filters"
                          : "Create your first test suite to get started"}
                      </p>
                      {!searchTerm && filterType === "all" && (
                        <Button onClick={() => setShowCreateDialog(true)}>
                          <Plus className="h-4 w-4 mr-2" />
                          Create Test Suite
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredSuites.map((suite) => (
                    <TableRow key={suite.id} className="group">
                      {/* Suite Name & Description */}
                      <TableCell>
                        <div className="space-y-1">
                          <div className="font-medium flex items-center gap-2">
                            {getStatusIcon(suite.status)}
                            {suite.name}
                          </div>
                          <div className="text-sm text-muted-foreground line-clamp-1">
                            {suite.description || "No description"}
                          </div>
                        </div>
                      </TableCell>

                      {/* Type */}
                      <TableCell>
                      <Badge className={getSuiteTypeColor(getDisplaySuiteType(suite))}>
                        {getDisplaySuiteType(suite)}
                      </Badge>
                      </TableCell>

                      {/* Project */}
                      <TableCell>
                        {suite.projects ? (
                          <div className="flex items-center gap-2">
                            <FolderOpen
                              className={`h-4 w-4 ${getProjectColor(suite.projects.color)}`}
                            />
                            <span className="text-sm truncate">{suite.projects.name}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">No project</span>
                        )}
                      </TableCell>

                      {/* Status */}
                      <TableCell>{getStatusBadge(suite.status)}</TableCell>

                      {/* Test Cases Count */}
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Target className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{suite.test_case_count}</span>
                        </div>
                      </TableCell>

                      {/* Progress */}
                      <TableCell>
                        {suite.execution_stats && suite.execution_stats.total > 0 ? (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-muted-foreground">Pass Rate</span>
                              <span className="font-medium">
                                {Math.round(
                                  (suite.execution_stats.passed /
                                    suite.execution_stats.total) *
                                    100
                                )}
                                %
                              </span>
                            </div>
                            <Progress
                              value={
                                (suite.execution_stats.passed /
                                  suite.execution_stats.total) *
                                100
                              }
                              className="h-2"
                            />
                            <div className="flex gap-3 text-xs">
                              <span className="text-green-600">
                                ✓ {suite.execution_stats.passed}
                              </span>
                              <span className="text-red-600">
                                ✗ {suite.execution_stats.failed}
                              </span>
                              <span className="text-orange-600">
                                ⚠ {suite.execution_stats.blocked}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">No runs yet</span>
                        )}
                      </TableCell>

                      {/* Actions */}
                    <TableCell className="text-right">
                        <div className="flex items-center gap-2">
  <Button
    variant="ghost"
    size="sm"
    onClick={() => openSuiteDrawer(suite)}
  >
    Details
  </Button>
   </div>
</TableCell>

                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* Reports Tab */}
        <TabsContent value="reports">
          <SuiteReports showAllSuites={true} />
        </TabsContent>
          
      {/* Execution Dialog */}
      <TabsContent value="history">
  <ExecutionHistory />
</TabsContent>
          </Tabs>


      {/* Create Test Suite Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Test Suite</DialogTitle>
            <DialogDescription>
              Organize test cases into suites for better test management.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Suite Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., User Authentication Tests"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                placeholder="Brief description of what this suite tests"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="suite_type">Suite Type</Label>
              <Select
                value={formData.suite_type}
                onValueChange={(value: SuiteType) =>
                  setFormData((prev) => ({ ...prev, suite_type: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">Manual Testing</SelectItem>
                  <SelectItem value="automated">Automated Testing</SelectItem>
                  <SelectItem value="regression">Regression Testing</SelectItem>
                  <SelectItem value="smoke">Smoke Testing</SelectItem>
                  <SelectItem value="integration">Integration Testing</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="project">Project (Optional)</Label>
              <Select
                value={formData.project_id || "none"}
                onValueChange={(value) =>
                  setFormData((prev) => ({
                    ...prev,
                    project_id: value === "none" ? "" : value,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a project" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">
                    <span className="text-muted-foreground">No Project</span>
                  </SelectItem>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      <div className="flex items-center gap-2">
                        <FolderOpen className="h-4 w-4" />
                        {project.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="planned_start_date">Planned Start</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={
                        "w-full justify-start text-left font-normal" +
                        (!formData.planned_start_date ? " text-muted-foreground" : "")
                      }
                      id="planned_start_date"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.planned_start_date ? (
                        new Date(formData.planned_start_date).toLocaleDateString()
                      ) : (
                        <span>Pick a date</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={
                        formData.planned_start_date
                          ? new Date(formData.planned_start_date)
                          : undefined
                      }
                      onSelect={(date) =>
                        setFormData((prev) => ({
                          ...prev,
                          planned_start_date: date ? date.toISOString() : "",
                        }))
                      }
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label htmlFor="planned_end_date">Planned End</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={
                        "w-full justify-start text-left font-normal" +
                        (!formData.planned_end_date ? " text-muted-foreground" : "")
                      }
                      id="planned_end_date"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.planned_end_date ? (
                        new Date(formData.planned_end_date).toLocaleDateString()
                      ) : (
                        <span>Pick a date</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={
                        formData.planned_end_date
                          ? new Date(formData.planned_end_date)
                          : undefined
                      }
                      onSelect={(date) =>
                        setFormData((prev) => ({
                          ...prev,
                          planned_end_date: date ? date.toISOString() : "",
                        }))
                      }
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={createTestSuite} disabled={!formData.name}>
              Create Suite
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Test Suite Details Dialog */}
      {selectedSuite && (
        <TestSuiteDetailsDialog
          suite={selectedSuite}
          open={showDetailsDialog}
          onOpenChange={setShowDetailsDialog}
          onSuiteUpdated={fetchTestSuites}
        />
      )}

      {/* Test Session Execution Dialog */}
      {executingSuite && (
        <TestSessionExecution
          suite={executingSuite}
          open={showExecutionDialog}
          onOpenChange={setShowExecutionDialog}
          onSessionComplete={handleExecutionComplete}
        />
      )}
<Dialog open={editOpen} onOpenChange={setEditOpen}>
  <DialogContent className="max-w-xl">
    <DialogHeader>
      <DialogTitle>Edit Test Suite</DialogTitle>
      <DialogDescription>
        Update suite name, status, and type.
      </DialogDescription>
    </DialogHeader>

    <div className="space-y-4 py-4">
      <div className="space-y-2">
        <Label htmlFor="edit-name">Suite Name</Label>
        <Input
          id="edit-name"
          value={suiteEditForm.name}
          onChange={(e) => setSuiteEditForm((p) => ({ ...p, name: e.target.value }))}
        />
      </div>

      <div className="space-y-2">
        <Label>Status</Label>
        <Select
          value={suiteEditForm.status}
          onValueChange={(v) => setSuiteEditForm((p) => ({ ...p, status: v }))}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Suite Type</Label>
        <Select
          value={suiteEditForm.suite_type}
          onValueChange={(v: SuiteType) =>
            setSuiteEditForm((p) => ({ ...p, suite_type: v }))
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="manual">Manual</SelectItem>
            <SelectItem value="automated">Automated</SelectItem>
            <SelectItem value="regression">Regression</SelectItem>
            <SelectItem value="smoke">Smoke</SelectItem>
            <SelectItem value="integration">Integration</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>

    <DialogFooter>
      <Button variant="outline" onClick={() => setEditOpen(false)} disabled={editSaving}>
        Cancel
      </Button>
      <Button
        onClick={updateSuiteDetails}
        disabled={editSaving || !suiteEditForm.name.trim()}
        className="gap-2"
      >
        {editSaving && <Loader2 className="h-4 w-4 animate-spin" />}
        Save changes
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>



      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
  <SheetContent
    side="right"
    className="
      w-[720px] sm:w-[820px] lg:w-[960px]
      max-w-[95vw]
      h-dvh
      p-0
      overflow-hidden
    "
  >
    {/* 3-row layout */}
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b px-6 py-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <SheetTitle className="truncate">
              {drawerSuite?.name ?? "Suite"}
            </SheetTitle>
            <SheetDescription className="mt-1">
            </SheetDescription>

            {drawerSuite && (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {getStatusBadge(drawerSuite.status)}
                <Badge className={getSuiteTypeColor(getDisplaySuiteType(drawerSuite))}>
                  {getDisplaySuiteType(drawerSuite)}
                </Badge>

                <Badge variant="outline" className="text-muted-foreground">
                  {drawerSuite.test_case_count ?? 0} cases
                </Badge>

                <Badge
                  variant="outline"
                  className={
                    drawerSuite.automation?.mode === "automated"
                      ? "border-green-500 text-green-600"
                      : drawerSuite.automation?.mode === "partial"
                        ? "border-orange-500 text-orange-600"
                        : "border-muted-foreground text-muted-foreground"
                  }
                >
                  {drawerSuite.automation?.mode === "automated"
                    ? "Automation: Automated"
                    : drawerSuite.automation?.mode === "partial"
                      ? "Automation: Partial"
                      : "Automation: Manual"}
                  <span className="ml-2 text-xs text-muted-foreground">
                    {(drawerSuite.automation?.scripted_count ?? 0)}/
                    {(drawerSuite.automation?.eligible_count ?? 0)}
                  </span>
                </Badge>
              </div>
            )}
          </div>

          
        </div>
      </div>

      {/* Body (scroll) */}
      <div className="flex-1 overflow-y-auto px-6 py-5">
        {drawerSuite && (
          <div className="space-y-6">
            {/* Primary actions */}
            <div className="grid grid-cols-2 gap-3">
              <Button
                size="sm"
                className="h-9 gap-2"
                onClick={() => startSuiteExecution(drawerSuite)}
              >
                <Play className="h-4 w-4" />
                Run tests
              </Button>

              <Button
                size="sm"
                variant="outline"
                className="h-9 gap-2"
                onClick={() => runSuiteAutomation(drawerSuite)}
                disabled={
                  runningAutomation === drawerSuite.id ||
                  drawerSuite.automation?.mode !== "automated"
                }
                title={
                  drawerSuite.automation?.mode !== "automated"
                    ? "Generate scripts for all eligible test cases to enable automation."
                    : "Run automation"
                }
              >
                {runningAutomation === drawerSuite.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Zap className="h-4 w-4" />
                )}
                Run automation
              </Button>
            </div>

            {/* Automation scripts */}
            <div className="rounded-lg border bg-background">
              <div className="border-b px-4 py-3">
                <p className="text-sm font-medium">Automation scripts</p>
              </div>

              <div className="px-4 py-4 space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Coverage</span>
                  <span className="font-medium">
                    {(drawerSuite.automation?.scripted_count ?? 0)}/
                    {(drawerSuite.automation?.eligible_count ?? 0)} scripted
                  </span>
                </div>

                <Progress
                  value={
                    (drawerSuite.automation?.eligible_count ?? 0) > 0
                      ? ((drawerSuite.automation?.scripted_count ?? 0) /
                          (drawerSuite.automation?.eligible_count ?? 1)) *
                        100
                      : 0
                  }
                  className="h-2"
                />

                <Button
                  size="sm"
                  variant="secondary"
                  className="w-full h-9 gap-2"
                  onClick={() => generateSuiteScripts(drawerSuite)}
                  disabled={
                    generatingScripts === drawerSuite.id ||
                    (drawerSuite.automation?.eligible_count ?? 0) === 0
                  }
                >
                  {generatingScripts === drawerSuite.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Code2 className="h-4 w-4" />
                  )}
                  Generate missing scripts
                </Button>

                {(drawerSuite.automation?.eligible_count ?? 0) === 0 && (
                  <div className="text-xs text-muted-foreground">
                    No eligible test cases found (test cases must have steps).
                  </div>
                )}
              </div>
            </div>

            {/* Configuration */}
            <div className="rounded-lg border bg-background">
              <div className="border-b px-4 py-3">
                <p className="text-sm font-medium">Configuration</p>
              </div>

              <div className="px-4 py-4 space-y-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full h-9 justify-start gap-2"
                  onClick={() => {
                    setSelectedSuite(drawerSuite)
                    setShowDetailsDialog(true)
                  }}
                >
                  <Settings className="h-4 w-4" />
                  Manage Suite
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  className="w-full h-9 justify-start gap-2"
                  onClick={() => openEditSuite(drawerSuite)}
                >
                  <Edit3 className="h-4 w-4" />
                  Edit suite details
                </Button>
              </div>
            </div>

            {/* Danger zone */}
            <div className="rounded-lg border border-destructive/40 bg-background">
              <div className="border-b px-4 py-3">
                <p className="text-sm font-medium text-destructive">Danger zone</p>
              </div>

              <div className="px-4 py-4 space-y-3">
                <Button
                  size="sm"
                  variant="destructive"
                  className="w-full h-9 gap-2"
                  onClick={async () => {
                    await deleteTestSuite(drawerSuite.id)
                    setDrawerOpen(false)
                    setDrawerSuite(null)
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                  Delete suite
                </Button>

                <div className="text-xs text-muted-foreground">
                  This deletes the suite and related sessions/executions. This cannot be undone.
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer (sticky) */}
      <div className="border-t px-6 py-4 bg-background">
        <div className="flex items-center justify-end gap-2">
          <SheetClose asChild>
            <Button size="sm" variant="outline" className="h-8 px-3">
              Close
            </Button>
          </SheetClose>
        </div>
      </div>
    </div>
  </SheetContent>
</Sheet>

    </div>
  )
}