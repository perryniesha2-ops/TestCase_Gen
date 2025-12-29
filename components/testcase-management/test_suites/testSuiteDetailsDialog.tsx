// components/test-management/TestSuiteDetailsDialog.tsx
"use client"

import { useEffect, useMemo, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

import {
  Plus,
  Trash2,
  Search,
  GripVertical,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  FolderOpen,
  Loader2,
} from "lucide-react"

import type { Project } from "@/types/test-cases"

interface TestSuite {
  id: string
  name: string
  description?: string
  suite_type: string
  status: string
  created_at: string
  project_id?: string | null
  projects?: Project
}

interface TestCase {
  id: string
  title: string
  description: string
  test_type: string
  priority: string
  status: string
  execution_status: string
  test_steps?: Array<{
    step_number: number
    action: string
    expected: string
    data?: string
  }>
}

interface SuiteTestCase {
  id: string
  test_case_id: string
  sequence_order: number
  priority: string
  estimated_duration_minutes: number
  test_cases: TestCase | null
}

interface TestSuiteDetailsDialogProps {
  suite: TestSuite
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuiteUpdated: () => void
}

type SuiteTestCaseRow = Omit<SuiteTestCase, "test_cases"> & {
  test_cases: SuiteTestCase["test_cases"] | SuiteTestCase["test_cases"][] | null
}

export function TestSuiteDetailsDialog({
  suite,
  open,
  onOpenChange,
  onSuiteUpdated,
}: TestSuiteDetailsDialogProps) {
  const [suiteTestCases, setSuiteTestCases] = useState<SuiteTestCase[]>([])
  const [availableTestCases, setAvailableTestCases] = useState<TestCase[]>([])
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(false)

  const [searchTerm, setSearchTerm] = useState("")
  const [selectedProject, setSelectedProject] = useState<string>(suite.project_id || "")
  const [projects, setProjects] = useState<Project[]>([])
  const [updatingProject, setUpdatingProject] = useState(false)

  // Fetch projects on mount
  useEffect(() => {
    void fetchProjects()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Fetch assigned + available when dialog opens
  useEffect(() => {
    if (!open) return

    setInitialLoading(true)
    setSelectedProject(suite.project_id || "")

    Promise.all([fetchSuiteTestCases(), fetchAvailableTestCases()])
      .catch((err) => {
        console.error("[TestSuiteDetailsDialog] initial load error", err)
        toast.error("Failed to load test suite details")
      })
      .finally(() => setInitialLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, suite.id, suite.project_id])

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

  async function fetchSuiteTestCases() {
    try {
      const supabase = createClient()

      const { data, error } = await supabase
        .from("test_suite_cases")
        .select(
          `
          id,
          test_case_id,
          sequence_order,
          priority,
          estimated_duration_minutes,
          test_cases (
            id,
            title,
            description,
            test_type,
            priority,
            status,
            execution_status
          )
        `
        )
        .eq("suite_id", suite.id)
        .order("sequence_order", { ascending: true })

      if (error) throw error

      const rows = (data ?? []) as SuiteTestCaseRow[]
      const transformed: SuiteTestCase[] = rows.map((item) => ({
        id: item.id,
        test_case_id: item.test_case_id,
        sequence_order: item.sequence_order,
        priority: item.priority,
        estimated_duration_minutes: item.estimated_duration_minutes,
        test_cases: Array.isArray(item.test_cases) ? item.test_cases[0] ?? null : item.test_cases ?? null,
      }))

      setSuiteTestCases(transformed)
    } catch (error) {
      console.error("Error fetching suite test cases:", error)
      toast.error("Failed to load assigned test cases")
      setSuiteTestCases([])
    }
  }

  async function fetchAvailableTestCases() {
    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        console.warn("No user found – cannot fetch test cases")
        return
      }

      const { data, error } = await supabase
        .from("test_cases")
        .select("id, title, description, test_type, priority, status, execution_status")
        .eq("status", "active")
        .eq("user_id", user.id)
        .order("title", { ascending: true })

      if (error) throw error
      setAvailableTestCases(data || [])
    } catch (error) {
      console.error("Error fetching available test cases:", error)
      toast.error("Failed to load available test cases")
      setAvailableTestCases([])
    }
  }

  async function updateSuiteProject(projectId: string) {
    setUpdatingProject(true)
    try {
      const supabase = createClient()

      const { error } = await supabase
        .from("test_suites")
        .update({
          project_id: projectId || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", suite.id)

      if (error) throw error

      setSelectedProject(projectId)
      toast.success("Suite project updated")
      onSuiteUpdated()
    } catch (error) {
      console.error("Error updating suite project:", error)
      toast.error("Failed to update project")
    } finally {
      setUpdatingProject(false)
    }
  }

  async function addTestCaseToSuite(testCaseId: string) {
    setLoading(true)
    try {
      const supabase = createClient()

      const maxOrder =
        suiteTestCases.length > 0 ? Math.max(...suiteTestCases.map((stc) => stc.sequence_order)) : 0

      const { error } = await supabase.from("test_suite_cases").insert({
        suite_id: suite.id,
        test_case_id: testCaseId,
        sequence_order: maxOrder + 1,
        priority: "medium",
        estimated_duration_minutes: 30,
      })

      if (error) throw error

      toast.success("Test case added to suite")
      await Promise.all([fetchSuiteTestCases(), fetchAvailableTestCases()])
      onSuiteUpdated()
    } catch (error) {
      console.error("Error adding test case to suite:", error)
      toast.error("Failed to add test case to suite")
    } finally {
      setLoading(false)
    }
  }

  async function removeTestCaseFromSuite(suiteTestCaseId: string) {
    setLoading(true)
    try {
      const supabase = createClient()

      const { error } = await supabase.from("test_suite_cases").delete().eq("id", suiteTestCaseId)
      if (error) throw error

      toast.success("Test case removed from suite")
      await Promise.all([fetchSuiteTestCases(), fetchAvailableTestCases()])
      onSuiteUpdated()
    } catch (error) {
      console.error("Error removing test case from suite:", error)
      toast.error("Failed to remove test case from suite")
    } finally {
      setLoading(false)
    }
  }

  async function updateTestCasePriority(suiteTestCaseId: string, priority: string) {
    try {
      const supabase = createClient()

      const { error } = await supabase
        .from("test_suite_cases")
        .update({ priority })
        .eq("id", suiteTestCaseId)

      if (error) throw error
      await fetchSuiteTestCases()
    } catch (error) {
      console.error("Error updating test case priority:", error)
      toast.error("Failed to update priority")
    }
  }

  function getStatusIcon(status: string) {
    switch (status) {
      case "passed":
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case "failed":
        return <XCircle className="h-4 w-4 text-red-600" />
      case "blocked":
        return <AlertTriangle className="h-4 w-4 text-orange-600" />
      case "skipped":
      case "not_run":
      default:
        return <Clock className="h-4 w-4 text-gray-400" />
    }
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

  const assignedTestCaseIds = useMemo(
    () => new Set(suiteTestCases.map((stc) => stc.test_case_id)),
    [suiteTestCases]
  )

  const filteredAvailableTestCases = useMemo(() => {
    const q = searchTerm.trim().toLowerCase()
    return availableTestCases.filter((tc) => {
      if (assignedTestCaseIds.has(tc.id)) return false
      if (!q) return true
      return tc.title.toLowerCase().includes(q)
    })
  }, [availableTestCases, assignedTestCaseIds, searchTerm])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="w-full max-w-5xl md:max-w-6xl h-[80vh] max-h-[90vh] overflow-hidden flex flex-col p-0"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle>Manage Test Suite: {suite.name}</DialogTitle>
          <DialogDescription>
            Add, remove, and organize test cases within this suite
          </DialogDescription>

          {/* Project Selector */}
          <div className="pt-4">
            <Label htmlFor="suite-project" className="text-sm font-medium">
              Suite Project (Optional)
            </Label>
            <Select
              value={selectedProject || "none"}
              onValueChange={(value) => void updateSuiteProject(value === "none" ? "" : value)}
              disabled={updatingProject}
            >
              <SelectTrigger id="suite-project" className="mt-2">
                {updatingProject && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                <SelectValue placeholder="Select a project" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">
                  <span className="text-muted-foreground">No Project</span>
                </SelectItem>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    <div className="flex items-center gap-2">
                      <FolderOpen className={`h-4 w-4 ${getProjectColor(project.color)}`} />
                      {project.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-hidden px-6 pb-6">
          <Tabs defaultValue="assigned" className="h-full flex flex-col">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="assigned">Assigned Tests ({suiteTestCases.length})</TabsTrigger>
              <TabsTrigger value="available">
                Available Tests ({filteredAvailableTestCases.length})
              </TabsTrigger>
            </TabsList>

            {/* ASSIGNED */}
            <TabsContent value="assigned" className="flex-1 overflow-hidden flex flex-col mt-4">
              <div className="text-sm text-muted-foreground mb-4">
                Test cases currently assigned to this suite.
              </div>

              <div className="flex-1 overflow-auto">
                {initialLoading ? (
                  <div className="text-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                    <p>Loading assigned tests...</p>
                  </div>
                ) : suiteTestCases.length === 0 ? (
                  <div className="text-center py-12 border-2 border-dashed border-muted rounded-lg">
                    <Plus className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-muted-foreground">No test cases assigned yet</p>
                    <p className="text-sm text-muted-foreground">
                      Switch to &quot;Available Tests&quot; to add test cases
                    </p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[70px]">Order</TableHead>
                        <TableHead>Test Case</TableHead>
                        <TableHead className="w-[110px]">Type</TableHead>
                        <TableHead className="w-[130px]">Priority</TableHead>
                        <TableHead className="w-[140px]">Exec Status</TableHead>
                        <TableHead className="w-[120px]">Est. Duration</TableHead>
                        <TableHead className="w-[90px] text-right">Remove</TableHead>
                      </TableRow>
                    </TableHeader>

                    <TableBody>
                      {suiteTestCases.map((suiteTestCase) => (
                        <TableRow key={suiteTestCase.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <GripVertical className="h-4 w-4 text-muted-foreground cursor-move" />
                              <span className="font-mono text-sm">{suiteTestCase.sequence_order}</span>
                            </div>
                          </TableCell>

                          <TableCell>
                            {suiteTestCase.test_cases ? (
                              <div className="min-w-0">
                                <div className="font-medium truncate">{suiteTestCase.test_cases.title}</div>
                                <div className="text-sm text-muted-foreground line-clamp-1">
                                  {suiteTestCase.test_cases.description}
                                </div>
                              </div>
                            ) : (
                              <span className="text-sm text-red-500">Linked test case not found</span>
                            )}
                          </TableCell>

                          <TableCell>
                            {suiteTestCase.test_cases && (
                              <Badge variant="outline">{suiteTestCase.test_cases.test_type}</Badge>
                            )}
                          </TableCell>

                          <TableCell>
                            <Select
                              value={suiteTestCase.priority}
                              onValueChange={(value) => void updateTestCasePriority(suiteTestCase.id, value)}
                            >
                              <SelectTrigger className="w-[120px] h-8">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="low">Low</SelectItem>
                                <SelectItem value="medium">Medium</SelectItem>
                                <SelectItem value="high">High</SelectItem>
                                <SelectItem value="critical">Critical</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>

                          <TableCell>
                            {suiteTestCase.test_cases && (
                              <div className="flex items-center gap-2">
                                {getStatusIcon(suiteTestCase.test_cases.execution_status)}
                                <span className="text-sm capitalize">
                                  {suiteTestCase.test_cases.execution_status.replace("_", " ")}
                                </span>
                              </div>
                            )}
                          </TableCell>

                          <TableCell>
                            <span className="text-sm">{suiteTestCase.estimated_duration_minutes}m</span>
                          </TableCell>

                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                              onClick={() => void removeTestCaseFromSuite(suiteTestCase.id)}
                              disabled={loading}
                              aria-label="Remove test case from suite"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            </TabsContent>

            {/* AVAILABLE */}
            <TabsContent value="available" className="flex-1 overflow-hidden flex flex-col mt-4">
              <div className="space-y-4 mb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search available test cases..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="flex-1 overflow-auto">
                {filteredAvailableTestCases.length === 0 ? (
                  <div className="text-center py-12 border-2 border-dashed border-muted rounded-lg">
                    <Search className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-muted-foreground">No available test cases found</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Test Case</TableHead>
                        <TableHead className="w-[110px]">Type</TableHead>
                        <TableHead className="w-[110px]">Priority</TableHead>
                        <TableHead className="w-[140px]">Exec Status</TableHead>
                        <TableHead className="w-[90px] text-right">Add</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredAvailableTestCases.map((testCase) => (
                        <TableRow key={testCase.id}>
                          <TableCell>
                            <div className="min-w-0">
                              <div className="font-medium truncate">{testCase.title}</div>
                              <div className="text-sm text-muted-foreground line-clamp-1">
                                {testCase.description}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{testCase.test_type}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge className={getPriorityColor(testCase.priority)}>{testCase.priority}</Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {getStatusIcon(testCase.execution_status)}
                              <span className="text-sm capitalize">
                                {testCase.execution_status.replace("_", " ")}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              onClick={() => void addTestCaseToSuite(testCase.id)}
                              disabled={loading}
                              className="h-8"
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  )
}
