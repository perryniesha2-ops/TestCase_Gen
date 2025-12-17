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

          return {
            ...suite,
            test_case_count: testCases?.length || 0,
            execution_stats: stats,
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
                  <TableHead className="w-[180px]">Actions</TableHead>
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
                        <Badge className={getSuiteTypeColor(suite.suite_type)}>
                          {suite.suite_type}
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
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            onClick={() => startSuiteExecution(suite)}
                            className="gap-1"
                          >
                            <Play className="h-3 w-3" />
                            Run
                          </Button>

                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedSuite(suite)
                                  setShowDetailsDialog(true)
                                }}
                              >
                                <Settings className="h-4 w-4 mr-2" />
                                Manage Suite
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => startSuiteExecution(suite)}
                              >
                                <Play className="h-4 w-4 mr-2" />
                                Run Tests
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => deleteTestSuite(suite.id)}
                                className="text-destructive"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
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
    </div>
  )
}