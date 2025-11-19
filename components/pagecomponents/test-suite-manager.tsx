// components/test-management/EnhancedTestSuiteManager.tsx
"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import { 
  Plus, 
  Play,
  FileText,
  BarChart3,
  Settings,
  Trash2,
  Target,
  Activity,
  CalendarIcon,
} from "lucide-react"
import { TestSuiteDetailsDialog } from "./testSuiteDetailsDialog"
import { TestSessionExecution } from "./testsessionexecution"
import { SuiteReports } from "./suitesreport"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface TestSuite {
  id: string
  name: string
  description?: string
  suite_type: 'manual' | 'automated' | 'regression' | 'smoke' | 'integration'
  status: 'draft' | 'active' | 'completed' | 'archived'
  planned_start_date?: string
  planned_end_date?: string
  actual_start_date?: string
  actual_end_date?: string
  created_at: string
  test_case_count?: number
  execution_stats?: {
    total: number
    passed: number
    failed: number
    skipped: number
    blocked: number
  }
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


type SuiteType = 'manual' | 'automated' | 'regression' | 'smoke' | 'integration'

interface FormData {
  name: string
  description: string
  suite_type: SuiteType
  planned_start_date: string
  planned_end_date: string
}

export function TestSuiteManager() {
  const [testSuites, setTestSuites] = useState<TestSuite[]>([])
  const [loading, setLoading] = useState(true)

  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [selectedSuite, setSelectedSuite] = useState<TestSuite | null>(null)
  const [showDetailsDialog, setShowDetailsDialog] = useState(false)
  const [showExecutionDialog, setShowExecutionDialog] = useState(false)
  const [activeTab, setActiveTab] = useState("suites")

  // NEW: execution pre-flight loading state
  const [executionLoading, setExecutionLoading] = useState(false)
  const [executionSuiteId, setExecutionSuiteId] = useState<string | null>(null)
  const [incompleteSessions, setIncompleteSessions] = useState<Record<string, TestSession[]>>({})

  
  const [formData, setFormData] = useState<FormData>({
    name: "",
    description: "",
    suite_type: "manual",
    planned_start_date: "",
    planned_end_date: "",
  })

  
  useEffect(() => {
    fetchTestSuites(),
        fetchIncompleteSessions() // ← ADD THIS LINE

  }, [])

  async function fetchTestSuites() {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      
      if (!user) return

      const { data, error } = await supabase
        .from("test_suites")
        .select("*")
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
              { total: 0, passed: 0, failed: 0, skipped: 0, blocked: 0 },
            ) ?? { total: 0, passed: 0, failed: 0, skipped: 0, blocked: 0 }

          return {
            ...suite,
            test_case_count: testCases?.length || 0,
            execution_stats: stats,
          }
        }),
      )

      setTestSuites(suitesWithStats)
          await fetchIncompleteSessions()

    } catch (error) {
      console.error("Error fetching test suites:", error)
      toast.error("Failed to load test suites")
    } finally {
      setLoading(false)
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

    const stats: SessionStats = {
      passed: 0,
      failed: 0,
      blocked: 0,
      skipped: 0,
    }

    ;(data || []).forEach((exec) => {
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

async function fetchIncompleteSessions() {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) return

    const { data, error } = await supabase
      .from("test_run_sessions")
      .select("*")
      .eq("user_id", user.id)
      .in("status", ["in_progress", "paused"])
      .order("actual_start", { ascending: false })

    if (error) throw error

    // Group sessions by suite_id
    const sessionsBySuite: Record<string, TestSession[]> = {}
    
    for (const row of data || []) {
      if (!row.suite_id) continue
      
      const stats = await getSessionStats(row.id)
      const session: TestSession = { ...row, stats }
      
      if (!sessionsBySuite[row.suite_id]) {
        sessionsBySuite[row.suite_id] = []
      }
      sessionsBySuite[row.suite_id].push(session)
    }

    setIncompleteSessions(sessionsBySuite)
  } catch (error) {
    console.error("Error fetching incomplete sessions:", error)
  }
}
  
  async function createTestSuite() {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) return

      const { data, error } = await supabase
        .from("test_suites")
        .insert({
          user_id: user.id,
          ...formData,
          planned_start_date: formData.planned_start_date || null,
          planned_end_date: formData.planned_end_date || null,
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

    // 1) Find all sessions for this suite
    const { data: sessions, error: sessionsError } = await supabase
      .from("test_run_sessions")
      .select("id")
      .eq("suite_id", suiteId)

    if (sessionsError) throw sessionsError

    const sessionIds = (sessions ?? []).map((s) => s.id)

    // 2) Delete executions for those sessions (do NOT touch test_cases)
    if (sessionIds.length > 0) {
      const { error: execError } = await supabase
        .from("test_executions")
        .delete()
        .in("session_id", sessionIds)

      if (execError) throw execError
    }

    // (Optional safety: also clean up any executions that store suite_id directly)
    const { error: execSuiteError } = await supabase
      .from("test_executions")
      .delete()
      .eq("suite_id", suiteId)

    if (execSuiteError) {
      // don't throw if the column doesn't exist; just log
      console.warn("Suite-scoped executions delete warning:", execSuiteError)
    }

    // 3) Delete the sessions themselves
    if (sessionIds.length > 0) {
      const { error: deleteSessionsError } = await supabase
        .from("test_run_sessions")
        .delete()
        .in("id", sessionIds)

      if (deleteSessionsError) throw deleteSessionsError
    }

    // 4) Delete junction rows linking suite -> test_cases
    const { error: suiteCasesError } = await supabase
      .from("test_suite_cases")
      .delete()
      .eq("suite_id", suiteId)

    if (suiteCasesError) throw suiteCasesError

    // 5) Finally delete the suite itself
    const { error: suiteError } = await supabase
      .from("test_suites")
      .delete()
      .eq("id", suiteId)

    if (suiteError) throw suiteError

    // Update local state
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

  // NEW: pre-flight check before opening execution dialog
  async function openExecutionForSuite(suite: TestSuite) {
    try {
      setExecutionLoading(true)
      setExecutionSuiteId(suite.id)

      const supabase = createClient()
      const { data, error } = await supabase
        .from("test_suite_cases")
        .select("id")
        .eq("suite_id", suite.id)
        .limit(1)

      if (error) throw error

      if (!data || data.length === 0) {
        toast.error("This suite has no test cases assigned yet.")
        return
      }

      setSelectedSuite(suite)
      setShowExecutionDialog(true)
    } catch (error) {
      console.error("Error preparing execution:", error)
      toast.error("Unable to start execution for this suite")
    } finally {
      setExecutionLoading(false)
      setExecutionSuiteId(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        Loading test suites...
      </div>
    )
  }

  const executionReadySuites = testSuites.filter(
    (suite) => suite.test_case_count && suite.test_case_count > 0,
  )

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
          <TabsTrigger value="execution" className="flex items-center gap-2">
            <Play className="h-4 w-4" />
            Execution
          </TabsTrigger>
          <TabsTrigger value="reports" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Reports &amp; Analytics
          </TabsTrigger>
        </TabsList>

        {/* Test Suites Tab */}
        <TabsContent value="suites" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {testSuites.map((suite) => (
              <div
                key={suite.id}
                className="border rounded-lg p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold mb-1">{suite.name}</h3>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-red-500 hover:text-red-600 hover:bg-red-50 h-6 w-6"
                        onClick={() => deleteTestSuite(suite.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {suite.description || "No description"}
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Badge className={getSuiteTypeColor(suite.suite_type)}>
                      {suite.suite_type}
                    </Badge>
                    {getStatusBadge(suite.status)}
                  </div>

                  <div className="flex items-center gap-2">
                    <Target className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      {suite.test_case_count} test cases
                    </span>
                  </div>

                  {suite.execution_stats && suite.execution_stats.total > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span>Progress</span>
                        <span>
                          {Math.round(
                            (suite.execution_stats.passed /
                              suite.execution_stats.total) *
                              100,
                          )}
                          %
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-green-500 h-2 rounded-full transition-all"
                          style={{
                            width: `${
                              (suite.execution_stats.passed /
                                suite.execution_stats.total) *
                              100
                            }%`,
                          }}
                        />
                      </div>
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>✓ {suite.execution_stats.passed}</span>
                        <span>✗ {suite.execution_stats.failed}</span>
                        <span>⏸ {suite.execution_stats.skipped}</span>
                      </div>
                    </div>
                  )}

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedSuite(suite)
                      setShowDetailsDialog(true)
                    }}
                    className="w-full"
                  >
                    <Settings className="h-4 w-4 mr-1" />
                    Manage Suite
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {/* Empty State */}
          {testSuites.length === 0 && (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No test suites yet</h3>
              <p className="text-muted-foreground mb-4">
                Create your first test suite to organize test cases
              </p>
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Test Suite
              </Button>
            </div>
          )}
        </TabsContent>

        {/* Execution Tab */}
        <TabsContent value="execution" className="space-y-6">
          <div className="space-y-4">
            <div className="text-center py-8 border-2 border-dashed border-muted rounded-lg">
              <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                Test Execution Center
              </h3>
              <p className="text-muted-foreground mb-4">
                Select a test suite below to start executing tests
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {executionReadySuites.map((suite) => {
                const isPreparing =
                  executionLoading && executionSuiteId === suite.id

                return (
                  <div
                    key={suite.id}
                    className="border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => openExecutionForSuite(suite)}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="font-semibold mb-1">{suite.name}</h3>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {suite.description || "No description"}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Badge className={getSuiteTypeColor(suite.suite_type)}>
                          {suite.suite_type}
                        </Badge>
                        {getStatusBadge(suite.status)}
                      </div>

                      <div className="flex items-center gap-2">
                        <Target className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">
                          {suite.test_case_count} test cases
                        </span>
                      </div>

                      {suite.execution_stats &&
                        suite.execution_stats.total > 0 && (
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-sm">
                              <span>Progress</span>
                              <span>
                                {Math.round(
                                  (suite.execution_stats.passed /
                                    suite.execution_stats.total) *
                                    100,
                                )}
                                %
                              </span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-green-500 h-2 rounded-full transition-all"
                                style={{
                                  width: `${
                                    (suite.execution_stats.passed /
                                      suite.execution_stats.total) *
                                    100
                                  }%`,
                                }}
                              />
                            </div>
                          </div>
                        )}

                      <Button
                        size="sm"
                        className="w-full mt-2"
                        onClick={(e) => {
                          e.stopPropagation()
                          openExecutionForSuite(suite)
                        }}
                        disabled={isPreparing}
                      >
                        <Play className="h-4 w-4 mr-1" />
                        {isPreparing ? "Preparing..." : "Start Execution"}
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>

            {executionReadySuites.length === 0 && (
              <div className="text-center py-12">
                <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  No test suites ready for execution
                </h3>
                <p className="text-muted-foreground mb-4">
                  Add test cases to your suites in the &quot;Test Suites&quot; tab
                  to enable execution
                </p>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Reports Tab */}
        <TabsContent value="reports">
          <SuiteReports showAllSuites={true} />
        </TabsContent>
      </Tabs>

      {/* Create Test Suite Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-md">
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
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, name: e.target.value }))
                }
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

  {/* Planned End Date */}
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
      {selectedSuite && (
        <TestSessionExecution
          suite={selectedSuite}
          open={showExecutionDialog}
          onOpenChange={setShowExecutionDialog}
          onSessionComplete={() => {
            fetchTestSuites()
            setShowExecutionDialog(false)
          }}
        />
      )}
    </div>
  )
}
