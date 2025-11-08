"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { 
  CheckCircle2, 
  XCircle, 
  Circle, 
  ChevronRight,
  Loader2,
  AlertTriangle,
  Target
} from "lucide-react"

interface TestCase {
  id: string
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
}

interface TestExecution {
  [testCaseId: string]: {
    status: 'not_run' | 'passed' | 'failed'
    completedSteps: number[]
  }
}

export function TestCaseList() {
  const [testCases, setTestCases] = useState<TestCase[]>([])
  const [loading, setLoading] = useState(true)
  const [execution, setExecution] = useState<TestExecution>({})
  const [expandedCase, setExpandedCase] = useState<string | null>(null)
  const router = useRouter()
  const searchParams = useSearchParams()
  const generationId = searchParams.get('generation')

  useEffect(() => {
    fetchTestCases()
  }, [generationId])

  async function fetchTestCases() {
    try {
      const supabase = createClient()
      
      let query = supabase
        .from('test_cases')
        .select('*')
        .order('created_at', { ascending: false })

      if (generationId) {
        query = query.eq('generation_id', generationId)
      }

      const { data, error } = await query

      if (error) throw error

      setTestCases(data || [])
      
      // Initialize execution state
      const initialExecution: TestExecution = {}
      data?.forEach(tc => {
        initialExecution[tc.id] = {
          status: 'not_run',
          completedSteps: []
        }
      })
      setExecution(initialExecution)
    } catch (error) {
      console.error('Error fetching test cases:', error)
      toast.error('Failed to load test cases')
    } finally {
      setLoading(false)
    }
  }

  function toggleStep(testCaseId: string, stepNumber: number) {
    setExecution(prev => {
      const current = prev[testCaseId] || { status: 'not_run', completedSteps: [] }
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

  function getPriorityColor(priority: string) {
    switch (priority) {
      case 'critical': return 'bg-red-500'
      case 'high': return 'bg-orange-500'
      case 'medium': return 'bg-yellow-500'
      case 'low': return 'bg-blue-500'
      default: return 'bg-gray-500'
    }
  }

  function getExecutionStats() {
    const total = testCases.length
    const passed = Object.values(execution).filter(e => e.status === 'passed').length
    const failed = Object.values(execution).filter(e => e.status === 'failed').length
    const notRun = total - passed - failed
    
    return { total, passed, failed, notRun }
  }

  const stats = getExecutionStats()

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (testCases.length === 0) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center">
            <Target className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No test cases yet</h3>
            <p className="text-muted-foreground mb-4">
              Generate your first test cases using AI
            </p>
            <Button onClick={() => router.push('/dashboard/pages/generate')}>
              Generate Test Cases
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Execution Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total Tests</CardDescription>
            <CardTitle className="text-3xl">{stats.total}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Passed</CardDescription>
            <CardTitle className="text-3xl text-green-600">{stats.passed}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Failed</CardDescription>
            <CardTitle className="text-3xl text-red-600">{stats.failed}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Not Run</CardDescription>
            <CardTitle className="text-3xl text-gray-600">{stats.notRun}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Test Cases List */}
      <div className="space-y-4">
        {testCases.map((testCase) => {
          const exec = execution[testCase.id]
          const isExpanded = expandedCase === testCase.id
          const allStepsCompleted = exec?.completedSteps.length === testCase.test_steps.length

          return (
            <Card key={testCase.id} className="overflow-hidden">
              <CardHeader 
                className="cursor-pointer hover:bg-accent/50 transition-colors"
                onClick={() => setExpandedCase(isExpanded ? null : testCase.id)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      {/* Execution Status Icon */}
                      {exec?.status === 'passed' && (
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                      )}
                      {exec?.status === 'failed' && (
                        <XCircle className="h-5 w-5 text-red-600" />
                      )}
                      {exec?.status === 'not_run' && (
                        <Circle className="h-5 w-5 text-gray-400" />
                      )}
                      
                      <CardTitle className="text-lg">{testCase.title}</CardTitle>
                    </div>
                    
                    <CardDescription className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className={getPriorityColor(testCase.priority)}>
                        {testCase.priority}
                      </Badge>
                      <Badge variant="secondary">{testCase.test_type}</Badge>
                      {testCase.is_edge_case && (
                        <Badge variant="outline" className="bg-purple-500">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          Edge Case
                        </Badge>
                      )}
                      <span className="text-xs">
                        {exec?.completedSteps.length || 0}/{testCase.test_steps.length} steps
                      </span>
                    </CardDescription>
                  </div>
                  
                  <ChevronRight 
                    className={`h-5 w-5 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                  />
                </div>
              </CardHeader>

              {isExpanded && (
                <CardContent className="space-y-4 pt-4 border-t">
                  {/* Description */}
                  <div>
                    <h4 className="font-semibold mb-2">Description</h4>
                    <p className="text-sm text-muted-foreground">{testCase.description}</p>
                  </div>

                  {/* Preconditions */}
                  {testCase.preconditions && (
                    <div>
                      <h4 className="font-semibold mb-2">Preconditions</h4>
                      <p className="text-sm text-muted-foreground">{testCase.preconditions}</p>
                    </div>
                  )}

                  {/* Test Steps */}
                  <div>
                    <h4 className="font-semibold mb-3">Test Steps</h4>
                    <div className="space-y-3">
                      {testCase.test_steps.map((step) => {
                        const isCompleted = exec?.completedSteps.includes(step.step_number)
                        
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
                      })}
                    </div>
                  </div>

                  {/* Expected Result */}
                  <div>
                    <h4 className="font-semibold mb-2">Expected Result</h4>
                    <p className="text-sm text-muted-foreground bg-muted p-3 rounded-lg">
                      {testCase.expected_result}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3 pt-4">
                    <Button
                      onClick={() => markAsPassed(testCase.id)}
                      disabled={exec?.status === 'passed'}
                      className="flex-1"
                      variant={exec?.status === 'passed' ? 'default' : 'outline'}
                    >
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Pass
                    </Button>
                    <Button
                      onClick={() => markAsFailed(testCase.id)}
                      disabled={exec?.status === 'failed'}
                      className="flex-1"
                      variant={exec?.status === 'failed' ? 'destructive' : 'outline'}
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Fail
                    </Button>
                  </div>
                </CardContent>
              )}
            </Card>
          )
        })}
      </div>
    </div>
  )
}