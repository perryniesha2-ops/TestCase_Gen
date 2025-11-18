"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { 
  Play, 
  Pause, 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertTriangle,
  SkipForward,
  Timer,
  Users,
  Calendar
} from "lucide-react"

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

interface TestExecution {
  id: string
  test_case_id: string
  execution_status: 'not_run' | 'in_progress' | 'passed' | 'failed' | 'skipped' | 'blocked'
  started_at?: string
  completed_at?: string
  execution_notes?: string
  failure_reason?: string
  completed_steps: number[]
  failed_steps: number[]
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
  onSessionComplete 
}: TestSessionExecutionProps) {
  const [suiteTestCases, setSuiteTestCases] = useState<SuiteTestCase[]>([])
  const [currentTestIndex, setCurrentTestIndex] = useState(0)
  const [currentTest, setCurrentTest] = useState<SuiteTestCase | null>(null)
  const [currentExecution, setCurrentExecution] = useState<TestExecution | null>(null)
  const [sessionStarted, setSessionStarted] = useState(false)
  const [sessionStats, setSessionStats] = useState({
    total: 0,
    completed: 0,
    passed: 0,
    failed: 0,
    skipped: 0,
    blocked: 0
  })
  const [executionNotes, setExecutionNotes] = useState("")
  const [failureReason, setFailureReason] = useState("")
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set())
  const [sessionId, setSessionId] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      fetchSuiteTestCases()
    }
  }, [open, suite.id])

  useEffect(() => {
    if (suiteTestCases.length > 0) {
      setCurrentTest(suiteTestCases[currentTestIndex])
      setSessionStats(prev => ({ ...prev, total: suiteTestCases.length }))
    }
  }, [suiteTestCases, currentTestIndex])

  async function fetchSuiteTestCases() {
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('test_suite_cases')
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
        .eq('suite_id', suite.id)
        .order('sequence_order')

      if (error) throw error
      
      const transformedData = data?.map(item => ({
        ...item,
        test_cases: Array.isArray(item.test_cases) ? item.test_cases[0] : item.test_cases
      })) || []

      setSuiteTestCases(transformedData)
    } catch (error) {
      console.error('Error fetching suite test cases:', error)
      toast.error('Failed to load test cases for execution')
    }
  }

  async function startSession() {
  try {
    const supabase = createClient()
    
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError || !session?.user) {
      console.error('No active session:', sessionError)
      toast.error('Please log in to start a test session')
      return
    }

    const user = session.user
    setSessionStats({
  total: suiteTestCases.length,
  completed: 0,
  passed: 0,
  failed: 0,
  skipped: 0,
  blocked: 0
})

    const { data: testSession, error: insertError } = await supabase
      .from('test_run_sessions')
      .insert({
        name: `${suite.name} - ${new Date().toLocaleString()}`,
        suite_id: suite.id,
        user_id: user.id,
        status: 'in_progress',
        actual_start: new Date().toISOString(),
        environment: 'staging'
      })
      .select()
      .single()

    if (insertError) {
     
      throw insertError
    }

    

    setSessionId(testSession.id)
    setSessionStarted(true)
    
    if (suiteTestCases.length > 0) {
      await startTestExecution(suiteTestCases[0], testSession.id)
    }
    
    toast.success('Test session started')
  } catch (error) {
    toast.error('Failed to start test session')
  }
}

  async function startTestExecution(testCase: SuiteTestCase, currentSessionId?: string) {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) return

      const { data, error } = await supabase
        .from('test_executions')
        .insert({
          test_case_id: testCase.test_case_id,
          suite_id: suite.id,
          session_id: currentSessionId || sessionId, // Use provided ID or state ID
          executed_by: user.id,
          execution_status: 'in_progress',
          started_at: new Date().toISOString(),
          completed_steps: [],
          failed_steps: []
        })
        .select()
        .single()

      if (error) throw error

      setCurrentExecution(data)
      setExecutionNotes("")
      setFailureReason("")
      setCompletedSteps(new Set())
    } catch (error) {
      toast.error('Failed to start test execution')
    }
  }

  async function completeTestExecution(status: 'passed' | 'failed' | 'skipped' | 'blocked') {
    if (!currentExecution || !currentTest) return

    try {
      const supabase = createClient()
      
      const { error } = await supabase
        .from('test_executions')
        .update({
          execution_status: status,
          completed_at: new Date().toISOString(),
          execution_notes: executionNotes || null,
          failure_reason: status === 'failed' ? failureReason : null,
          completed_steps: Array.from(completedSteps),
          failed_steps: status === 'failed' ? Array.from(completedSteps) : []
        })
        .eq('id', currentExecution.id)

      if (error) throw error

      setSessionStats(prev => ({
        ...prev,
        completed: prev.completed + 1,
        [status]: prev[status] + 1
      }))

      toast.success(`Test ${status}`)
      
      // Move to next test or complete session
      if (currentTestIndex < suiteTestCases.length - 1) {
        const nextIndex = currentTestIndex + 1
        setCurrentTestIndex(nextIndex)
        await startTestExecution(suiteTestCases[nextIndex])
      } else {
        await completeSession()
      }
    } catch (error) {
      toast.error('Failed to complete test execution')
    }
  }

  async function skipToTest(index: number) {
    if (currentExecution) {
      await completeTestExecution('skipped')
    }
    
    setCurrentTestIndex(index)
    if (suiteTestCases[index]) {
      await startTestExecution(suiteTestCases[index])
    }
  }

  // FIX: Updated to update the test_run_sessions record
  async function completeSession() {
    try {
      const supabase = createClient()
      
      // Update the test run session status
      if (sessionId) {
        await supabase
          .from('test_run_sessions')
          .update({ 
            status: 'completed',
            actual_end: new Date().toISOString()
          })
          .eq('id', sessionId)
      }
      
      // Update suite status
      await supabase
        .from('test_suites')
        .update({ 
          status: 'completed',
          actual_end_date: new Date().toISOString()
        })
        .eq('id', suite.id)

      toast.success('Test session completed!')
      onSessionComplete()
      onOpenChange(false)
    } catch (error) {
      toast.error('Failed to complete session')
    }
  }

  function toggleStep(stepIndex: number) {
    setCompletedSteps(prev => {
      const newSet = new Set(prev)
      if (newSet.has(stepIndex)) {
        newSet.delete(stepIndex)
      } else {
        newSet.add(stepIndex)
      }
      return newSet
    })
  }

  const progressPercentage = suiteTestCases.length > 0 
    ? Math.round((sessionStats.completed / sessionStats.total) * 100) 
    : 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="
        w-full
        max-w-5xl
        md:max-w-6xl
        h-[90vh]
        max-h-[90vh]
        flex
        flex-col
        p-6
      ">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Play className="h-5 w-5" />
            Test Session: {suite.name}
          </DialogTitle>
          <DialogDescription>
            Execute test cases in sequence and track results in real-time
          </DialogDescription>
        </DialogHeader>

      <div className="flex-1 overflow-y-auto space-y-6 pr-2">
          {/* Session Progress */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Session Progress</CardTitle>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span>{sessionStats.completed} of {sessionStats.total} completed</span>
                  <span>{progressPercentage}%</span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Progress value={progressPercentage} className="mb-4" />
              <div className="grid grid-cols-5 gap-4 text-center">
                <div className="space-y-1">
                  <div className="text-2xl font-bold text-green-500">{sessionStats.passed}</div>
                  <div className="text-xs text-muted-foreground">Passed</div>
                </div>
                <div className="space-y-1">
                  <div className="text-2xl font-bold text-red-500">{sessionStats.failed}</div>
                  <div className="text-xs text-muted-foreground">Failed</div>
                </div>
                <div className="space-y-1">
                  <div className="text-2xl font-bold text-orange-600">{sessionStats.blocked}</div>
                  <div className="text-xs text-muted-foreground">Blocked</div>
                </div>
                <div className="space-y-1">
                  <div className="text-2xl font-bold text-gray-600">{sessionStats.skipped}</div>
                  <div className="text-xs text-muted-foreground">Skipped</div>
                </div>
                <div className="space-y-1">
                  <div className="text-2xl font-bold">{sessionStats.total - sessionStats.completed}</div>
                  <div className="text-xs text-muted-foreground">Remaining</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Current Test Execution */}
            <div className="lg:col-span-2">
              {!sessionStarted ? (
                <Card>
                  <CardHeader>
                    <CardTitle>Ready to Start Test Session</CardTitle>
                    <CardDescription>
                      {suiteTestCases.length} test cases are queued for execution
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button onClick={startSession} className="w-full" size="lg">
                      <Play className="h-4 w-4 mr-2" />
                      Start Test Session
                    </Button>
                  </CardContent>
                </Card>
              ) : currentTest ? (
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>{currentTest.test_cases.title}</CardTitle>
                        <CardDescription>
                          Test {currentTestIndex + 1} of {suiteTestCases.length} • {currentTest.test_cases.test_type}
                        </CardDescription>
                      </div>
                      <Badge variant="outline">
                        {currentTest.priority}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div>
                      <h4 className="font-medium mb-2">Description</h4>
                      <p className="text-sm text-muted-foreground">{currentTest.test_cases.description}</p>
                    </div>

                    <div>
                      <h4 className="font-medium mb-2">Test Steps</h4>
                      <div className="space-y-2">
                        {currentTest.test_cases.steps?.map((step, index) => (
                          <div key={index} className="flex items-start gap-3">
                            <button
                              onClick={() => toggleStep(index)}
                              className={`mt-0.5 h-4 w-4 rounded border-2 flex items-center justify-center ${
                                completedSteps.has(index)
                                  ? 'bg-green-500 border-green-500'
                                  : 'border-gray-300'
                              }`}
                            >
                              {completedSteps.has(index) && (
                                <CheckCircle className="h-3 w-3 text-white" />
                              )}
                            </button>
                            <div className="flex-1">
                              <p className={`text-sm ${completedSteps.has(index) ? 'line-through text-muted-foreground' : ''}`}>
                                <span className="font-mono text-xs mr-2">{index + 1}.</span>
                                {step}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h4 className="font-medium mb-2">Expected Result</h4>
                      <p className="text-sm text-muted-foreground p-3 bg-muted rounded-lg">
                        {currentTest.test_cases.expected_result}
                      </p>
                    </div>

                    <div>
                      <h4 className="font-medium mb-2">Execution Notes</h4>
                      <Textarea
                        value={executionNotes}
                        onChange={(e) => setExecutionNotes(e.target.value)}
                        placeholder="Add notes about the test execution..."
                        rows={3}
                      />
                    </div>

                    <div>
                      <h4 className="font-medium mb-2">Test Result</h4>
                      <div className="flex gap-2">
                        <Button 
                          onClick={() => completeTestExecution('passed')}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Pass
                        </Button>
                        <Button 
                          onClick={() => {
                            if (!failureReason.trim()) {
                              toast.error('Please provide a failure reason')
                              return
                            }
                            completeTestExecution('failed')
                          }}
                          variant="destructive"
                        >
                          <XCircle className="h-4 w-4 mr-2" />
                          Fail
                        </Button>
                        <Button 
                          onClick={() => completeTestExecution('blocked')}
                          variant="outline"
                          className="text-orange-600"
                        >
                          <AlertTriangle className="h-4 w-4 mr-2" />
                          Blocked
                        </Button>
                        <Button 
                          onClick={() => completeTestExecution('skipped')}
                          variant="outline"
                        >
                          <SkipForward className="h-4 w-4 mr-2" />
                          Skip
                        </Button>
                      </div>
                      
                      <div className="mt-3">
                        <Textarea
                          value={failureReason}
                          onChange={(e) => setFailureReason(e.target.value)}
                          placeholder="If test failed or blocked, describe the reason..."
                          rows={2}
                          className="text-sm"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="text-center py-12">
                    <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold">Session Complete!</h3>
                    <p className="text-muted-foreground">All test cases have been executed.</p>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Test Queue */}
            <div>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Test Queue</CardTitle>
                </CardHeader>
                <CardContent className="flex-1 overflow-hidden">
  <div className="space-y-2 h-full overflow-y-auto pr-2">
                    {suiteTestCases.map((testCase, index) => (
                      <div
                        key={testCase.id}
                       className={`p-3 rounded-lg border cursor-pointer transition-colors ${
  index === currentTestIndex
    ? 'bg-blue-100 border-blue-400' 
    : index < currentTestIndex
    ? 'bg-green-50 border-green-200'
    : 'bg-gray-100 border-gray-300'
}`}
                        onClick={() => sessionStarted && index > currentTestIndex && skipToTest(index)}
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs">{index + 1}</span>
                          {index === currentTestIndex ? (
                            <Clock className="h-4 w-4 text-orange-500" />
                          ) : index < currentTestIndex ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          ) : (
                            <div className="h-4 w-4 rounded-full border-2 border-gray-300" />
                          )}
                          <div className="flex-1 min-w-0">
 <p className="text-sm font-medium truncate text-gray-900">
  {testCase.test_cases.title}
</p>                            <p className="text-xs text-muted-foreground">{testCase.test_cases.test_type}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {sessionStarted && currentTest && (
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Pause Session
            </Button>
            <Button onClick={completeSession} variant="destructive">
              End Session
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}