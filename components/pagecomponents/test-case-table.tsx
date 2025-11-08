"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
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
  ChevronRight
} from "lucide-react"

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
  created_at: string
}

interface Generation {
  id: string
  title: string
}

interface TestExecution {
  [testCaseId: string]: {
    status: 'not_run' | 'passed' | 'failed'
    completedSteps: number[]
    notes?: string
  }
}

export function TestCaseTable() {
  const [testCases, setTestCases] = useState<TestCase[]>([])
  const [generations, setGenerations] = useState<Record<string, Generation>>({})
  const [loading, setLoading] = useState(true)
  const [execution, setExecution] = useState<TestExecution>({})
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCase, setSelectedCase] = useState<TestCase | null>(null)
  const [showDetailsDialog, setShowDetailsDialog] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10
  
  const router = useRouter()
  const searchParams = useSearchParams()
  const generationId = searchParams.get('generation')

  useEffect(() => {
    fetchData()
  }, [generationId])

  async function fetchData() {
    try {
      const supabase = createClient()
      
      // Fetch test cases
      let query = supabase
        .from('test_cases')
        .select('*')
        .order('created_at', { ascending: false })

      if (generationId) {
        query = query.eq('generation_id', generationId)
      }

      const { data: testCasesData, error: testCasesError } = await query

      if (testCasesError) throw testCasesError

      setTestCases(testCasesData || [])
      
      // Fetch generations
      const { data: generationsData, error: generationsError } = await supabase
        .from('test_case_generations')
        .select('id, title')

      if (generationsError) throw generationsError

      const generationsMap: Record<string, Generation> = {}
      generationsData?.forEach(gen => {
        generationsMap[gen.id] = gen
      })
      setGenerations(generationsMap)
      
      // Initialize execution state
      const initialExecution: TestExecution = {}
      testCasesData?.forEach(tc => {
        initialExecution[tc.id] = {
          status: 'not_run',
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

  function markAsPassed(testCaseId: string) {
    setExecution(prev => ({
      ...prev,
      [testCaseId]: {
        ...prev[testCaseId],
        status: 'passed'
      }
    }))
    toast.success('Test marked as passed')
  }

  function markAsFailed(testCaseId: string) {
    setExecution(prev => ({
      ...prev,
      [testCaseId]: {
        ...prev[testCaseId],
        status: 'failed'
      }
    }))
    toast.error('Test marked as failed')
  }

  function getPriorityVariant(priority: string): "default" | "secondary" | "destructive" | "outline" {
    switch (priority) {
      case 'critical': return 'destructive'
      case 'high': return 'destructive' 
      case 'medium': return 'secondary'
      case 'low': return 'outline'
      default: return 'default'
    }
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

  // Filter test cases
  const filteredTestCases = testCases.filter(tc =>
    tc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tc.description.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Pagination
  const totalPages = Math.ceil(filteredTestCases.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedTestCases = filteredTestCases.slice(startIndex, endIndex)

  // Stats
  const stats = {
    total: filteredTestCases.length,
    passed: Object.values(execution).filter(e => e.status === 'passed').length,
    failed: Object.values(execution).filter(e => e.status === 'failed').length,
    notRun: filteredTestCases.length - Object.values(execution).filter(e => e.status === 'passed' || e.status === 'failed').length
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
      {/* Header with Search and Actions */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search test cases..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value)
              setCurrentPage(1) // Reset to first page on search
            }}
            className="pl-10"
          />
        </div>
        <Button variant="outline" size="default">
          <Filter className="h-4 w-4 mr-2" />
          Filter
        </Button>
        <Button variant="outline" size="default">
          <FileDown className="h-4 w-4 mr-2" />
          Export
        </Button>
      </div>

      {/* Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">Suite</TableHead>
              <TableHead>Title</TableHead>
              <TableHead className="w-[120px]">Status</TableHead>
              <TableHead className="w-[100px]">Priority</TableHead>
              <TableHead className="w-[150px]">Project</TableHead>
              <TableHead className="w-[120px] text-center">AI Generated</TableHead>
              <TableHead className="w-[120px]">Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedTestCases.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12">
                  <div className="flex flex-col items-center gap-2">
                    <AlertTriangle className="h-8 w-8 text-muted-foreground" />
                    <p className="text-muted-foreground">No test cases found</p>
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
                    onClick={() => {
                      setSelectedCase(testCase)
                      setShowDetailsDialog(true)
                    }}
                  >
                    <TableCell className="font-mono text-sm">
                      {generation?.title.split(' ')[0] || 'TC'}
                    </TableCell>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {exec?.status === 'passed' && (
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                        )}
                        {exec?.status === 'failed' && (
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
                    <TableCell className="text-muted-foreground">
                      {generation?.title || 'N/A'}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center">
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                        <span className="ml-2 text-sm">Yes</span>
                      </div>
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

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {startIndex + 1}-{Math.min(endIndex, filteredTestCases.length)} of {filteredTestCases.length} test cases
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
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const pageNum = i + 1
              return (
                <Button
                  key={pageNum}
                  variant={currentPage === pageNum ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCurrentPage(pageNum)}
                >
                  {pageNum}
                </Button>
              )
            })}
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

      {/* Test Case Details Dialog */}
      {selectedCase && (
       <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
    <DialogContent className="w-[95vw] sm:max-w-3xl max-h-[90vh] flex flex-col p-0">
      {/* Sticky header with padding */}
      <DialogHeader className="sticky top-0 z-10 bg-background p-6 border-b">
        <DialogTitle className="flex items-center gap-3">
                {execution[selectedCase.id]?.status === 'passed' && (
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                )}
                {execution[selectedCase.id]?.status === 'failed' && (
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
                <Badge variant="secondary">{selectedCase.test_type}</Badge>
                {selectedCase.is_edge_case && (
                  <Badge variant="outline" className="bg-purple-500">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    Edge Case
                  </Badge>
                )}
                <span className="text-xs">
                  {execution[selectedCase.id]?.completedSteps.length || 0}/{selectedCase.test_steps.length} steps
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
                    <p className="text-sm text-muted-foreground">{selectedCase.preconditions}</p>
                  </div>
                )}

                {/* Test Steps */}
                <div>
                  <h4 className="font-semibold mb-3">Test Steps</h4>
                  <div className="space-y-3">
                    {selectedCase.test_steps.map((step) => {
                      const isCompleted = execution[selectedCase.id]?.completedSteps.includes(step.step_number)
                      
                      return (
                        <div 
                          key={step.step_number}
                          className="flex gap-3 p-3 rounded-lg border bg-card"
                        >
                          <Checkbox
                            checked={isCompleted}
                            onCheckedChange={() => toggleStep(selectedCase.id, step.step_number)}
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
                    })}
                  </div>
                </div>

                {/* Expected Result */}
                <div>
                  <h4 className="font-semibold mb-2">Expected Result</h4>
                  <p className="text-sm text-muted-foreground bg-muted p-3 rounded-lg">
                    {selectedCase.expected_result}
                  </p>
                </div>
              </div>
            </div>

            {/* Actions - Fixed at bottom */}
            <div className="px-6 py-4 border-t flex gap-3 flex-shrink-0">
              <Button
                onClick={() => markAsPassed(selectedCase.id)}
                disabled={execution[selectedCase.id]?.status === 'passed'}
                className="flex-1"
                variant={execution[selectedCase.id]?.status === 'passed' ? 'default' : 'outline'}
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Pass
              </Button>
              <Button
                onClick={() => markAsFailed(selectedCase.id)}
                disabled={execution[selectedCase.id]?.status === 'failed'}
                className="flex-1"
                variant={execution[selectedCase.id]?.status === 'failed' ? 'destructive' : 'outline'}
              >
                <XCircle className="h-4 w-4 mr-2" />
                Fail
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}