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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { 
  CheckCircle2, 
  XCircle, 
  Circle, 
  Loader2,
  AlertTriangle,
  Search,
  Filter,
  FileDown,
  ChevronLeft,
  ChevronRight,
  Monitor,
  Smartphone,
  Globe,
  Eye,
  Zap,
  FlaskConical,
  Layers
} from "lucide-react"
import { updateTestExecution } from "@/lib/test-execution"

interface TestCase {
  id: string
  generation_id: string
  title: string
  description: string
  test_type: string
  priority: 'low' | 'medium' | 'high' | 'critical'
  preconditions: string | null
  test_steps: Array<{
    step_number: number
    action: string
    expected: string
  }>
  expected_result: string
  is_edge_case: boolean
  status: 'draft' | 'active' | 'archived'
  execution_status: 'not_run' | 'pass' | 'fail' | 'skip' | 'blocked'
  created_at: string
}

interface CrossPlatformTestCase {
  id: string
  suite_id: string
  platform: string
  framework: string
  title: string
  description: string
  preconditions: string[]
  steps: string[]
  expected_results: string[]
  automation_hints?: string[]
  priority: 'low' | 'medium' | 'high' | 'critical'
  execution_status: 'not_run' | 'pass' | 'fail' | 'skip' | 'blocked'
  created_at: string
  cross_platform_test_suites?: {
    requirement: string
    user_id: string
  }
}

interface Generation {
  id: string
  title: string
}

interface CrossPlatformSuite {
  id: string
  requirement: string
  platforms: string[]
  generated_at: string
}

interface TestExecution {
  [testCaseId: string]: {
    status: 'not_run' | 'pass' | 'fail'
    completedSteps: number[]
    notes?: string
  }
}

const platformIcons = {
  web: Monitor,
  mobile: Smartphone,
  api: Globe,
  accessibility: Eye,
  performance: Zap
}

export function TabbedTestCaseTable() {
  const [testCases, setTestCases] = useState<TestCase[]>([])
  const [crossPlatformCases, setCrossPlatformCases] = useState<CrossPlatformTestCase[]>([])
  const [generations, setGenerations] = useState<Record<string, Generation>>({})
  const [crossPlatformSuites, setCrossPlatformSuites] = useState<Record<string, CrossPlatformSuite>>({})
  const [loading, setLoading] = useState(true)
  const [execution, setExecution] = useState<TestExecution>({})
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCase, setSelectedCase] = useState<TestCase | CrossPlatformTestCase | null>(null)
  const [selectedCaseType, setSelectedCaseType] = useState<'regular' | 'cross-platform'>('regular')
  const [showDetailsDialog, setShowDetailsDialog] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [crossPlatformCurrentPage, setCrossPlatformCurrentPage] = useState(1)
  const [updating, setUpdating] = useState<string | null>(null)
  const itemsPerPage = 10
  
  const router = useRouter()
  const searchParams = useSearchParams()
  const generationId = searchParams.get('generation')

  useEffect(() => {
    fetchData()
  }, [generationId])

  async function fetchData() {
    try {
      setLoading(true)
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        toast.error('Please log in to view test cases')
        return
      }
      
      // Fetch regular test cases
      let testCaseQuery = supabase
        .from('test_cases')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (generationId) {
        testCaseQuery = testCaseQuery.eq('generation_id', generationId)
      }

      const { data: testCasesData, error: testCasesError } = await testCaseQuery

      if (testCasesError) throw testCasesError
      setTestCases(testCasesData || [])
      
      // Fetch cross-platform test cases
      const { data: crossPlatformData, error: crossPlatformError } = await supabase
        .from('platform_test_cases')
        .select(`
          *,
          cross_platform_test_suites!inner(
            id,
            requirement,
            user_id,
            platforms,
            generated_at
          )
        `)
        .eq('cross_platform_test_suites.user_id', user.id)
        .order('created_at', { ascending: false })

      if (crossPlatformError) throw crossPlatformError
      setCrossPlatformCases(crossPlatformData || [])
      
      // Fetch generations
      const { data: generationsData, error: generationsError } = await supabase
        .from('test_case_generations')
        .select('id, title')
        .eq('user_id', user.id)

      if (generationsError) throw generationsError

      const generationsMap: Record<string, Generation> = {}
      generationsData?.forEach(gen => {
        generationsMap[gen.id] = gen
      })
      setGenerations(generationsMap)
      
      // Fetch cross-platform suites
      const { data: suitesData, error: suitesError } = await supabase
        .from('cross_platform_test_suites')
        .select('*')
        .eq('user_id', user.id)

      if (suitesError) throw suitesError

      const suitesMap: Record<string, CrossPlatformSuite> = {}
      suitesData?.forEach(suite => {
        suitesMap[suite.id] = suite
      })
      setCrossPlatformSuites(suitesMap)
      
      // Initialize execution state with current database status
      const initialExecution: TestExecution = {}
      
      testCasesData?.forEach(tc => {
        initialExecution[tc.id] = {
          status: tc.execution_status === 'pass' ? 'pass' : tc.execution_status === 'fail' ? 'fail' : 'not_run',
          completedSteps: [],
          notes: ''
        }
      })
      
      crossPlatformData?.forEach(tc => {
        initialExecution[tc.id] = {
          status: tc.execution_status === 'pass' ? 'pass' : tc.execution_status === 'fail' ? 'fail' : 'not_run',
          completedSteps: [],
          notes: ''
        }
      })
      
      setExecution(initialExecution)
    } catch (error) {
      console.error('Error fetching data:', error)
      toast.error('Failed to load test cases')
    } finally {
      setLoading(false)
    }
  }

  function toggleStep(testCaseId: string, stepNumber: number) {
    setExecution(prev => {
      const current = prev[testCaseId] || { status: 'not_run', completedSteps: [], notes: '' }
      const completedSteps = current.completedSteps.includes(stepNumber)
        ? current.completedSteps.filter(s => s !== stepNumber)
        : [...current.completedSteps, stepNumber]
      
      return {
        ...prev,
        [testCaseId]: {
          ...current,
          completedSteps
        }
      }
    })
  }

  async function markAsPassed(testCaseId: string, isRegular: boolean) {
    setUpdating(testCaseId)
    try {
      const result = await updateTestExecution({
        testCaseId,
        testTable: isRegular ? 'test_cases' : 'platform_test_cases',
        status: 'pass',
        notes: 'Marked as passed via UI'
      })

      if (result.success) {
        setExecution(prev => ({
          ...prev,
          [testCaseId]: {
            ...prev[testCaseId],
            status: 'pass'
          }
        }))
        toast.success('Test marked as passed')
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      console.error('Error updating test status:', error)
      toast.error('Failed to update test status')
    } finally {
      setUpdating(null)
    }
  }

  async function markAsFailed(testCaseId: string, isRegular: boolean) {
    setUpdating(testCaseId)
    try {
      const result = await updateTestExecution({
        testCaseId,
        testTable: isRegular ? 'test_cases' : 'platform_test_cases',
        status: 'fail',
        notes: 'Marked as failed via UI'
      })

      if (result.success) {
        setExecution(prev => ({
          ...prev,
          [testCaseId]: {
            ...prev[testCaseId],
            status: 'fail'
          }
        }))
        toast.error('Test marked as failed')
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      console.error('Error updating test status:', error)
      toast.error('Failed to update test status')
    } finally {
      setUpdating(null)
    }
  }

  function openTestCaseDialog(testCase: TestCase | CrossPlatformTestCase, type: 'regular' | 'cross-platform') {
    setSelectedCase(testCase)
    setSelectedCaseType(type)
    setShowDetailsDialog(true)
  }

  function getPriorityColor(priority: string) {
    switch (priority) {
      case 'critical': return 'bg-red-500 text-white'
      case 'high': return 'bg-orange-500 text-white'
      case 'medium': return 'bg-yellow-500 text-black'
      case 'low': return 'bg-blue-500 text-white'
      default: return 'bg-gray-500 text-white'
    }
  }

  function getStatusBadge(status: 'draft' | 'active' | 'archived') {
    const variants: Record<string, { variant: "default" | "secondary" | "outline", label: string }> = {
      draft: { variant: 'outline', label: 'Draft' },
      active: { variant: 'default', label: 'Approved' },
      archived: { variant: 'secondary', label: 'Archived' }
    }
    const config = variants[status] || variants.draft
    return <Badge variant={config.variant}>{config.label}</Badge>
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
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays} days ago`
    return date.toLocaleDateString()
  }

  // Filter regular test cases
  const filteredTestCases = testCases.filter(tc =>
    tc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tc.description.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Filter cross-platform test cases
  const filteredCrossPlatformCases = crossPlatformCases.filter(tc =>
    tc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tc.description.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Pagination for regular test cases
  const totalPages = Math.ceil(filteredTestCases.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedTestCases = filteredTestCases.slice(startIndex, endIndex)

  // Pagination for cross-platform test cases
  const crossPlatformTotalPages = Math.ceil(filteredCrossPlatformCases.length / itemsPerPage)
  const crossPlatformStartIndex = (crossPlatformCurrentPage - 1) * itemsPerPage
  const crossPlatformEndIndex = crossPlatformStartIndex + itemsPerPage
  const paginatedCrossPlatformCases = filteredCrossPlatformCases.slice(crossPlatformStartIndex, crossPlatformEndIndex)

  // Stats
  const regularStats = {
    total: filteredTestCases.length,
    passed: filteredTestCases.filter(tc => execution[tc.id]?.status === 'pass').length,
    failed: filteredTestCases.filter(tc => execution[tc.id]?.status === 'fail').length,
    notRun: filteredTestCases.filter(tc => execution[tc.id]?.status === 'not_run').length
  }

  const crossPlatformStats = {
    total: filteredCrossPlatformCases.length,
    passed: filteredCrossPlatformCases.filter(tc => execution[tc.id]?.status === 'pass').length,
    failed: filteredCrossPlatformCases.filter(tc => execution[tc.id]?.status === 'fail').length,
    notRun: filteredCrossPlatformCases.filter(tc => execution[tc.id]?.status === 'not_run').length
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  // Helper function to render test steps for both types
  const renderTestSteps = (testCase: TestCase | CrossPlatformTestCase, type: 'regular' | 'cross-platform') => {
    if (type === 'regular') {
      const regularCase = testCase as TestCase
      return regularCase.test_steps.map((step) => {
        const isCompleted = execution[testCase.id]?.completedSteps.includes(step.step_number)
        return (
          <div 
            key={step.step_number}
            className="flex gap-3 p-3 rounded-lg border bg-card"
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
                <span className={isCompleted ? 'line-through text-muted-foreground' : ''}>
                  {step.action}
                </span>
              </div>
              <div className="text-sm text-muted-foreground pl-16">
                <span className="font-semibold">Expected:</span> {step.expected}
              </div>
            </div>
          </div>
        )
      })
    } else {
      const crossPlatformCase = testCase as CrossPlatformTestCase
      return crossPlatformCase.steps?.map((step, index) => {
        const stepNumber = index + 1
        const isCompleted = execution[testCase.id]?.completedSteps.includes(stepNumber)
        return (
          <div 
            key={stepNumber}
            className="flex gap-3 p-3 rounded-lg border bg-card"
          >
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
                <span className={isCompleted ? 'line-through text-muted-foreground' : ''}>
                  {step}
                </span>
              </div>
              <div className="text-sm text-muted-foreground pl-16">
                <span className="font-semibold">Expected:</span> {crossPlatformCase.expected_results?.[index] || 'Expected result defined'}
              </div>
            </div>
          </div>
        )
      }) || []
    }
  }

  return (
    <div className="space-y-6">
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
          {/* Regular Test Stats */}
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-card p-4 rounded-lg border">
              <div className="text-2xl font-bold">{regularStats.total}</div>
              <div className="text-sm text-muted-foreground">Total Tests</div>
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
              <div className="text-2xl font-bold text-gray-500">{regularStats.notRun}</div>
              <div className="text-sm text-muted-foreground">Not Run</div>
            </div>
          </div>

          {/* Regular Test Cases Table */}
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead className="w-[120px]">Status</TableHead>
                  <TableHead className="w-[100px]">Priority</TableHead>
                  <TableHead className="w-[100px]">Type</TableHead>
                  <TableHead className="w-[150px]">Generation</TableHead>
                  <TableHead className="w-[120px]">Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedTestCases.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12">
                      <div className="flex flex-col items-center gap-2">
                        <FlaskConical className="h-8 w-8 text-muted-foreground" />
                        <p className="text-muted-foreground">No regular test cases found</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedTestCases.map((testCase) => {
                    const exec = execution[testCase.id]
                    const generation = generations[testCase.generation_id]
                    
                    return (
                      <TableRow 
                        key={testCase.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => openTestCaseDialog(testCase, 'regular')}
                      >
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            {exec?.status === 'pass' && (
                              <CheckCircle2 className="h-4 w-4 text-green-600" />
                            )}
                            {exec?.status === 'fail' && (
                              <XCircle className="h-4 w-4 text-red-600" />
                            )}
                            {exec?.status === 'not_run' && (
                              <Circle className="h-4 w-4 text-gray-400" />
                            )}
                            <span>{testCase.title}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(testCase.status)}
                        </TableCell>
                        <TableCell>
                          <Badge className={getPriorityColor(testCase.priority)}>
                            {testCase.priority}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{testCase.test_type}</Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {generation?.title || 'N/A'}
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

          {/* Regular Test Cases Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Showing {startIndex + 1}-{Math.min(endIndex, filteredTestCases.length)} of {filteredTestCases.length} regular test cases
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </TabsContent>

        {/* Cross-Platform Test Cases Tab */}
        <TabsContent value="cross-platform" className="space-y-6">
          {/* Cross-Platform Stats */}
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-card p-4 rounded-lg border">
              <div className="text-2xl font-bold">{crossPlatformStats.total}</div>
              <div className="text-sm text-muted-foreground">Total Tests</div>
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
              <div className="text-2xl font-bold text-gray-500">{crossPlatformStats.notRun}</div>
              <div className="text-sm text-muted-foreground">Not Run</div>
            </div>
          </div>

          {/* Cross-Platform Test Cases Table */}
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
                        onClick={() => openTestCaseDialog(testCase, 'cross-platform')}
                      >
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            {exec?.status === 'pass' && (
                              <CheckCircle2 className="h-4 w-4 text-green-600" />
                            )}
                            {exec?.status === 'fail' && (
                              <XCircle className="h-4 w-4 text-red-600" />
                            )}
                            {exec?.status === 'not_run' && (
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
                          {suite?.requirement || testCase.cross_platform_test_suites?.requirement || 'N/A'}
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

          {/* Cross-Platform Pagination */}
          {crossPlatformTotalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Showing {crossPlatformStartIndex + 1}-{Math.min(crossPlatformEndIndex, filteredCrossPlatformCases.length)} of {filteredCrossPlatformCases.length} cross-platform test cases
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCrossPlatformCurrentPage(p => Math.max(1, p - 1))}
                  disabled={crossPlatformCurrentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCrossPlatformCurrentPage(p => Math.min(crossPlatformTotalPages, p + 1))}
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

      {/* Test Case Details Dialog */}
      {selectedCase && (
        <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
          <DialogContent className="w-[95vw] sm:max-w-3xl max-h-[90vh] flex flex-col p-0">
            <DialogHeader className="sticky top-0 z-10 bg-background p-6 border-b">
              <DialogTitle className="flex items-center gap-3">
                {execution[selectedCase.id]?.status === 'pass' && (
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                )}
                {execution[selectedCase.id]?.status === 'fail' && (
                  <XCircle className="h-5 w-5 text-red-600" />
                )}
                {execution[selectedCase.id]?.status === 'not_run' && (
                  <Circle className="h-5 w-5 text-gray-400" />
                )}
                {selectedCase.title}
              </DialogTitle>
              <DialogDescription className="flex items-center gap-2 flex-wrap pt-2">
                <Badge className={getPriorityColor(selectedCase.priority)}>
                  {selectedCase.priority}
                </Badge>
                {selectedCaseType === 'regular' ? (
                  <Badge variant="secondary">{(selectedCase as TestCase).test_type}</Badge>
                ) : (
                  <Badge variant="default">{(selectedCase as CrossPlatformTestCase).platform}</Badge>
                )}
                <span className="text-xs">
                  {execution[selectedCase.id]?.completedSteps.length || 0}/{
                    selectedCaseType === 'regular' 
                      ? (selectedCase as TestCase).test_steps.length 
                      : (selectedCase as CrossPlatformTestCase).steps?.length || 0
                  } steps
                </span>
              </DialogDescription>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto px-6 py-4">
              <div className="space-y-6">
                {/* Description */}
                <div>
                  <h4 className="font-semibold mb-2">Description</h4>
                  <p className="text-sm text-muted-foreground">{selectedCase.description}</p>
                </div>

                {/* Preconditions */}
                {selectedCase.preconditions && (
                  <div>
                    <h4 className="font-semibold mb-2">Preconditions</h4>
                    <p className="text-sm text-muted-foreground">
                      {selectedCaseType === 'regular' 
                        ? selectedCase.preconditions as string
                        : (selectedCase as CrossPlatformTestCase).preconditions.join(', ')
                      }
                    </p>
                  </div>
                )}

                {/* Automation Hints for Cross-Platform Tests */}
                {selectedCaseType === 'cross-platform' && (selectedCase as CrossPlatformTestCase).automation_hints && (
                  <div>
                    <h4 className="font-semibold mb-2">Automation Hints</h4>
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
                      <ul className="text-sm space-y-1">
                        {(selectedCase as CrossPlatformTestCase).automation_hints?.map((hint, index) => (
                          <li key={index} className="text-blue-700 dark:text-blue-300">• {hint}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}

                {/* Test Steps */}
                <div>
                  <h4 className="font-semibold mb-3">Test Steps</h4>
                  <div className="space-y-3">
                    {renderTestSteps(selectedCase, selectedCaseType)}
                  </div>
                </div>

                {/* Expected Result */}
                <div>
                  <h4 className="font-semibold mb-2">Expected Result</h4>
                  <p className="text-sm text-muted-foreground bg-muted p-3 rounded-lg">
                    {selectedCaseType === 'regular'
                      ? (selectedCase as TestCase).expected_result
                      : (selectedCase as CrossPlatformTestCase).expected_results?.join('; ') || 'See individual step expectations'
                    }
                  </p>
                </div>
              </div>
            </div>

            {/* Actions - Fixed at bottom */}
            <div className="px-6 py-4 border-t flex gap-3 flex-shrink-0">
              <Button
                onClick={() => markAsPassed(selectedCase.id, selectedCaseType === 'regular')}
                disabled={execution[selectedCase.id]?.status === 'pass' || updating === selectedCase.id}
                className="flex-1"
                variant={execution[selectedCase.id]?.status === 'pass' ? 'default' : 'outline'}
              >
                {updating === selectedCase.id ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                )}
                Pass
              </Button>
              <Button
                onClick={() => markAsFailed(selectedCase.id, selectedCaseType === 'regular')}
                disabled={execution[selectedCase.id]?.status === 'fail' || updating === selectedCase.id}
                className="flex-1"
                variant={execution[selectedCase.id]?.status === 'fail' ? 'destructive' : 'outline'}
              >
                {updating === selectedCase.id ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <XCircle className="h-4 w-4 mr-2" />
                )}
                Fail
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}