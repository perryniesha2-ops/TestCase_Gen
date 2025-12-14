"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
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
  CheckCircle2, 
  XCircle, 
  Circle, 
  ChevronRight,
  Loader2,
  AlertTriangle,
  Target,
  Clock,
  MessageSquare,
  Camera,
  FileImage,
  Play,
  Pause,
  RotateCcw
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

type ExecutionStatus = 'not_run' | 'in_progress' | 'passed' | 'failed' | 'blocked' | 'skipped'

interface TestExecution {
  id?: string
  test_case_id: string
  status: ExecutionStatus
  started_at?: string
  completed_at?: string
  duration_minutes?: number
  completed_steps: number[]
  failed_steps: Array<{
    step_number: number
    failure_reason: string
  }>
  execution_notes?: string
  failure_reason?: string
  test_environment?: string
  browser?: string
  os_version?: string
}

interface ExecutionDetails {
  notes?: string
  failure_reason?: string
  environment?: string
  browser?: string
  os_version?: string
}

interface TestSession {
  id: string
  name: string
  status: 'planned' | 'in_progress' | 'completed' | 'aborted'
  environment: string
  actual_start?: string
  actual_end?: string
}

export function TestCaseList() {
  const [testCases, setTestCases] = useState<TestCase[]>([])
  const [loading, setLoading] = useState(true)
  const [executions, setExecutions] = useState<Record<string, TestExecution>>({})
  const [expandedCase, setExpandedCase] = useState<string | null>(null)
  const [currentSession, setCurrentSession] = useState<TestSession | null>(null)
  const [showExecutionDialog, setShowExecutionDialog] = useState(false)
  const [selectedTestCase, setSelectedTestCase] = useState<TestCase | null>(null)
  const [executionForm, setExecutionForm] = useState({
    notes: '',
    failure_reason: '',
    environment: 'staging',
    browser: '',
    os_version: ''
  })
  
  const router = useRouter()
  const searchParams = useSearchParams()
  const generationId = searchParams.get('generation')
  const sessionId = searchParams.get('session')

  useEffect(() => {
    fetchTestCases()
    if (sessionId) {
      fetchTestSession()
    }
  }, [generationId, sessionId])

  async function fetchTestSession() {
    if (!sessionId) return
    
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('test_run_sessions')
        .select('*')
        .eq('id', sessionId)
        .single()

      if (error) throw error
      setCurrentSession(data)
    } catch (error) {
      console.error('Error fetching test session:', error)
    }
  }

  async function fetchTestCases() {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) return

      let query = supabase
        .from('test_cases')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (generationId) {
        query = query.eq('generation_id', generationId)
      }

      const { data, error } = await query

      if (error) throw error

      setTestCases(data || [])
      
      // Fetch existing executions for these test cases
      await fetchExecutions(data?.map(tc => tc.id) || [])
      
    } catch (error) {
      console.error('Error fetching test cases:', error)
      toast.error('Failed to load test cases')
    } finally {
      setLoading(false)
    }
  }

  async function fetchExecutions(testCaseIds: string[]) {
    if (testCaseIds.length === 0) return

    try {
      const supabase = createClient()
      let query = supabase
        .from('test_executions')
        .select('*')
        .in('test_case_id', testCaseIds)
        .order('created_at', { ascending: false })

      // If we're in a session, get executions for that session
      if (sessionId) {
        query = query.eq('session_id', sessionId)
      }

      const { data, error } = await query

      if (error) throw error

      // Group executions by test case (get latest execution per test case)
      const executionMap: Record<string, TestExecution> = {}
      
      data?.forEach(execution => {
        if (!executionMap[execution.test_case_id]) {
          executionMap[execution.test_case_id] = {
            id: execution.id,
            test_case_id: execution.test_case_id,
            status: execution.execution_status,
            started_at: execution.started_at,
            completed_at: execution.completed_at,
            duration_minutes: execution.duration_minutes,
            completed_steps: execution.completed_steps || [],
            failed_steps: execution.failed_steps || [],
            execution_notes: execution.execution_notes,
            failure_reason: execution.failure_reason,
            test_environment: execution.test_environment,
            browser: execution.browser,
            os_version: execution.os_version
          }
        }
      })

      // Initialize executions for test cases without executions
      testCaseIds.forEach(testCaseId => {
        if (!executionMap[testCaseId]) {
          executionMap[testCaseId] = {
            test_case_id: testCaseId,
            status: 'not_run',
            completed_steps: [],
            failed_steps: []
          }
        }
      })

      setExecutions(executionMap)
    } catch (error) {
      console.error('Error fetching executions:', error)
    }
  }

  async function toggleStep(testCaseId: string, stepNumber: number) {
    const execution = executions[testCaseId]
    const isCompleted = execution.completed_steps.includes(stepNumber)
    
    const updatedSteps = isCompleted
      ? execution.completed_steps.filter(s => s !== stepNumber)
      : [...execution.completed_steps, stepNumber]
    
    // Update local state immediately
    setExecutions(prev => ({
      ...prev,
      [testCaseId]: {
        ...prev[testCaseId],
        completed_steps: updatedSteps,
        status: prev[testCaseId].status === 'not_run' ? 'in_progress' : prev[testCaseId].status
      }
    }))

    // Save to database
    await saveExecutionProgress(testCaseId, { completed_steps: updatedSteps })
  }

  async function saveExecutionProgress(testCaseId: string, updates: Partial<TestExecution>) {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) return

      const execution = executions[testCaseId]
      const executionData = {
        test_case_id: testCaseId,
        executed_by: user.id,
        session_id: sessionId || null,
        execution_status: updates.status || execution.status,
        completed_steps: updates.completed_steps || execution.completed_steps,
        failed_steps: updates.failed_steps || execution.failed_steps,
        execution_notes: updates.execution_notes || execution.execution_notes,
        failure_reason: updates.failure_reason || execution.failure_reason,
        test_environment: updates.test_environment || execution.test_environment || 'staging',
        browser: updates.browser || execution.browser,
        os_version: updates.os_version || execution.os_version,
        started_at: execution.started_at || (updates.status === 'in_progress' ? new Date().toISOString() : null),
        completed_at: (updates.status === 'passed' || updates.status === 'failed') ? new Date().toISOString() : null,
        updated_at: new Date().toISOString()
      }

      if (execution.id) {
        // Update existing execution
        const { error } = await supabase
          .from('test_executions')
          .update(executionData)
          .eq('id', execution.id)

        if (error) throw error
      } else {
        // Create new execution
        const { data, error } = await supabase
          .from('test_executions')
          .insert(executionData)
          .select()
          .single()

        if (error) throw error

        // Update local state with new execution ID
        setExecutions(prev => ({
          ...prev,
          [testCaseId]: {
            ...prev[testCaseId],
            id: data.id
          }
        }))
      }
    } catch (error) {
      console.error('Error saving execution progress:', error)
      toast.error('Failed to save progress')
    }
  }

  async function markTestResult(testCaseId: string, status: ExecutionStatus) {
    setSelectedTestCase(testCases.find(tc => tc.id === testCaseId) || null)
    setExecutionForm({
      notes: executions[testCaseId]?.execution_notes || '',
      failure_reason: executions[testCaseId]?.failure_reason || '',
      environment: executions[testCaseId]?.test_environment || 'staging',
      browser: executions[testCaseId]?.browser || '',
      os_version: executions[testCaseId]?.os_version || ''
    })
    
    // If just marking as passed with no issues, save directly
    if (status === 'passed') {
      await saveExecutionResult(testCaseId, status, {})
    } else {
      setShowExecutionDialog(true)
    }
  }

  async function saveExecutionResult(testCaseId: string, status: ExecutionStatus, details: ExecutionDetails) {
    const startTime = executions[testCaseId]?.started_at
    const duration = startTime 
      ? Math.round((new Date().getTime() - new Date(startTime).getTime()) / 60000)
      : undefined

    await saveExecutionProgress(testCaseId, {
      status: status,
      duration_minutes: duration,
      execution_notes: details.notes,
      failure_reason: details.failure_reason,
      test_environment: details.environment,
      browser: details.browser,
      os_version: details.os_version
    })

    setExecutions(prev => ({
      ...prev,
      [testCaseId]: {
        ...prev[testCaseId],
        status: status,
        completed_at: new Date().toISOString(),
        duration_minutes: duration
      }
    }))

    const statusMessages = {
      passed: 'Test marked as passed',
      failed: 'Test marked as failed', 
      blocked: 'Test marked as blocked',
      skipped: 'Test marked as skipped'
    } as const

    toast.success('Test status updated')
    setShowExecutionDialog(false)
  }

  async function resetTest(testCaseId: string) {
    await saveExecutionProgress(testCaseId, {
      status: 'not_run',
      completed_steps: [],
      failed_steps: [],
      execution_notes: '',
      failure_reason: '',
      started_at: undefined,
      completed_at: undefined
    })

    setExecutions(prev => ({
      ...prev,
      [testCaseId]: {
        ...prev[testCaseId],
        status: 'not_run',
        completed_steps: [],
        failed_steps: [],
        started_at: undefined,
        completed_at: undefined
      }
    }))

    toast.success('Test reset')
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
    const executions_array = Object.values(executions)
    const passed = executions_array.filter(e => e.status === 'passed').length
    const failed = executions_array.filter(e => e.status === 'failed').length
    const blocked = executions_array.filter(e => e.status === 'blocked').length
    const skipped = executions_array.filter(e => e.status === 'skipped').length
    const inProgress = executions_array.filter(e => e.status === 'in_progress').length
    const notRun = total - passed - failed - blocked - skipped - inProgress
    
    return { total, passed, failed, blocked, skipped, inProgress, notRun }
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
            <Button onClick={() => router.push('/pages/generate')}>
              Generate Test Cases
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Session Info */}
      {currentSession && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">{currentSession.name}</CardTitle>
                <CardDescription>Test Session • Environment: {currentSession.environment}</CardDescription>
              </div>
              <Badge variant={currentSession.status === 'in_progress' ? 'default' : 'secondary'}>
                {currentSession.status === 'in_progress' && <Play className="h-3 w-3 mr-1" />}
                {currentSession.status}
              </Badge>
            </div>
          </CardHeader>
        </Card>
      )}

      {/* Enhanced Execution Stats */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total</CardDescription>
            <CardTitle className="text-2xl">{stats.total}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Passed</CardDescription>
            <CardTitle className="text-2xl text-green-600">{stats.passed}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Failed</CardDescription>
            <CardTitle className="text-2xl text-red-600">{stats.failed}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Blocked</CardDescription>
            <CardTitle className="text-2xl text-orange-600">{stats.blocked}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>In Progress</CardDescription>
            <CardTitle className="text-2xl text-blue-600">{stats.inProgress}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Not Run</CardDescription>
            <CardTitle className="text-2xl text-gray-600">{stats.notRun}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Test Cases List */}
      <div className="space-y-4">
        {testCases.map((testCase) => {
          const execution = executions[testCase.id]
          const isExpanded = expandedCase === testCase.id
          const allStepsCompleted = execution?.completed_steps.length === testCase.test_steps.length

          return (
            <Card key={testCase.id} className="overflow-hidden">
              <CardHeader 
                className="cursor-pointer hover:bg-accent/50 transition-colors"
                onClick={() => setExpandedCase(isExpanded ? null : testCase.id)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      {/* Enhanced Execution Status Icons */}
                      {execution?.status === 'passed' && (
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                      )}
                      {execution?.status === 'failed' && (
                        <XCircle className="h-5 w-5 text-red-600" />
                      )}
                      {execution?.status === 'blocked' && (
                        <AlertTriangle className="h-5 w-5 text-orange-600" />
                      )}
                      {execution?.status === 'skipped' && (
                        <Circle className="h-5 w-5 text-gray-400" />
                      )}
                      {execution?.status === 'in_progress' && (
                        <Clock className="h-5 w-5 text-blue-600" />
                      )}
                      {execution?.status === 'not_run' && (
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
                        {execution?.completed_steps.length || 0}/{testCase.test_steps.length} steps
                      </span>
                      {execution?.duration_minutes && (
                        <span className="text-xs">
                          <Clock className="h-3 w-3 inline mr-1" />
                          {execution.duration_minutes}m
                        </span>
                      )}
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

                  {/* Execution Details */}
                  {execution?.execution_notes && (
                    <div>
                      <h4 className="font-semibold mb-2">Execution Notes</h4>
                      <p className="text-sm text-muted-foreground bg-blue-50 p-3 rounded-lg">
                        {execution.execution_notes}
                      </p>
                    </div>
                  )}

                  {execution?.failure_reason && (
                    <div>
                      <h4 className="font-semibold mb-2 text-red-600">Failure Reason</h4>
                      <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">
                        {execution.failure_reason}
                      </p>
                    </div>
                  )}

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
                        const isCompleted = execution?.completed_steps.includes(step.step_number)
                        const failedStep = execution?.failed_steps.find(fs => fs.step_number === step.step_number)
                        
                        return (
                          <div 
                            key={step.step_number}
                            className={`flex gap-3 p-3 rounded-lg border ${
                              failedStep ? 'bg-red-50 border-red-200' : 'bg-card'
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
                                <span className={isCompleted ? 'line-through text-muted-foreground' : ''}>
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

                  {/* Enhanced Actions */}
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-2 pt-4">
                    <Button
                      onClick={() => markTestResult(testCase.id, 'passed')}
                      disabled={execution?.status === 'passed'}
                      variant={execution?.status === 'passed' ? 'default' : 'outline'}
                      size="sm"
                    >
                      <CheckCircle2 className="h-4 w-4 mr-1" />
                      Pass
                    </Button>
                    <Button
                      onClick={() => markTestResult(testCase.id, 'failed')}
                      disabled={execution?.status === 'failed'}
                      variant={execution?.status === 'failed' ? 'destructive' : 'outline'}
                      size="sm"
                    >
                      <XCircle className="h-4 w-4 mr-1" />
                      Fail
                    </Button>
                    <Button
                      onClick={() => markTestResult(testCase.id, 'blocked')}
                      disabled={execution?.status === 'blocked'}
                      variant={execution?.status === 'blocked' ? 'secondary' : 'outline'}
                      size="sm"
                    >
                      <AlertTriangle className="h-4 w-4 mr-1" />
                      Block
                    </Button>
                    <Button
                      onClick={() => markTestResult(testCase.id, 'skipped')}
                      disabled={execution?.status === 'skipped'}
                      variant="outline"
                      size="sm"
                    >
                      <Circle className="h-4 w-4 mr-1" />
                      Skip
                    </Button>
                    <Button
                      onClick={() => resetTest(testCase.id)}
                      variant="ghost"
                      size="sm"
                    >
                      <RotateCcw className="h-4 w-4 mr-1" />
                      Reset
                    </Button>
                  </div>
                </CardContent>
              )}
            </Card>
          )
        })}
      </div>

      {/* Enhanced Execution Details Dialog */}
      <Dialog open={showExecutionDialog} onOpenChange={setShowExecutionDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Test Execution Details</DialogTitle>
            <DialogDescription>
              Provide additional details about the test execution result.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="environment">Test Environment</Label>
              <Select
                value={executionForm.environment}
                onValueChange={(value) => setExecutionForm(prev => ({ ...prev, environment: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="staging">Staging</SelectItem>
                  <SelectItem value="production">Production</SelectItem>
                  <SelectItem value="development">Development</SelectItem>
                  <SelectItem value="qa">QA</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="browser">Browser</Label>
                <Input
                  id="browser"
                  value={executionForm.browser}
                  onChange={(e) => setExecutionForm(prev => ({ ...prev, browser: e.target.value }))}
                  placeholder="e.g., Chrome 119"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="os">OS Version</Label>
                <Input
                  id="os"
                  value={executionForm.os_version}
                  onChange={(e) => setExecutionForm(prev => ({ ...prev, os_version: e.target.value }))}
                  placeholder="e.g., Windows 11"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="notes">Execution Notes</Label>
              <Textarea
                id="notes"
                value={executionForm.notes}
                onChange={(e) => setExecutionForm(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Additional notes about the test execution..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="failure_reason">Failure Reason</Label>
              <Textarea
                id="failure_reason"
                value={executionForm.failure_reason}
                onChange={(e) => setExecutionForm(prev => ({ ...prev, failure_reason: e.target.value }))}
                placeholder="Describe what went wrong..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowExecutionDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => {
                if (selectedTestCase) {
                  saveExecutionResult(selectedTestCase.id, 'failed', executionForm)
                }
              }}
              className="bg-red-600 hover:bg-red-700"
            >
              Save Result
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}