"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
  Play,
  Square,
  CheckCircle2,
  XCircle,
  Clock,
  Zap,
  Image as ImageIcon,
  Terminal,
  Activity,
  Download,
  Code2,
  Loader2,
} from "lucide-react"
import type { BrowserRecording, BrowserExecutionResult, ExecutionRequest } from "@/types/browser-automation"

interface BrowserTestExecutorProps {
  testCaseId: string
  recordingId?: string
  onExecutionComplete?: (result: BrowserExecutionResult) => void
}

export function BrowserTestExecutor({ 
  testCaseId, 
  recordingId,
  onExecutionComplete 
}: BrowserTestExecutorProps) {
  const [recording, setRecording] = useState<BrowserRecording | null>(null)
  const [executing, setExecuting] = useState(false)
  const [executionResult, setExecutionResult] = useState<BrowserExecutionResult | null>(null)
  const [currentStep, setCurrentStep] = useState(0)
  const [showResults, setShowResults] = useState(false)

  useEffect(() => {
    if (recordingId) {
      fetchRecording()
    }
  }, [recordingId])

  useEffect(() => {
    setupMessageListener()
  }, [])

  async function fetchRecording() {
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('browser_recordings')
        .select('*')
        .eq('id', recordingId!)
        .single()

      if (error) throw error
      setRecording(data)
    } catch (error) {
      console.error('Error fetching recording:', error)
      toast.error("Failed to load recording")
    }
  }

  function setupMessageListener() {
    window.addEventListener('message', handleExtensionMessage)
    return () => window.removeEventListener('message', handleExtensionMessage)
  }

  function handleExtensionMessage(event: MessageEvent) {
    if (event.source !== window) return
    
    const { type, payload } = event.data
    
    switch (type) {
      case 'EXECUTION_PROGRESS':
        setCurrentStep(payload.step)
        break
        
      case 'EXECUTION_COMPLETE':
        handleExecutionComplete(payload.result)
        break
        
      case 'EXECUTION_ERROR':
        handleExecutionError(payload.error)
        break
    }
  }

  async function startExecution() {
    if (!recording) {
      toast.error("No recording found")
      return
    }

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        toast.error("Please log in to run tests")
        return
      }

      // Create execution record
      const { data: execution, error } = await supabase
        .from('test_executions')
        .insert({
          test_case_id: testCaseId,
          executed_by: user.id,
          execution_status: 'in_progress',
          started_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (error) throw error

      // Send execution request to extension
      const request: ExecutionRequest = {
        test_case_id: testCaseId,
        recording_id: recording.id,
        options: {
          speed: 'normal',
          screenshots: true,
          video: false,
          network_logs: true,
        }
      }

      window.postMessage({
        type: 'EXECUTE_TEST',
        payload: {
          executionId: execution.id,
          recording,
          options: request.options,
        }
      }, '*')

      setExecuting(true)
      setCurrentStep(0)
      toast.success("Test execution started")
    } catch (error) {
      console.error('Error starting execution:', error)
      toast.error("Failed to start execution")
    }
  }

  async function handleExecutionComplete(result: BrowserExecutionResult) {
    try {
      const supabase = createClient()

      // Update execution status
      const executionStatus = result.error_steps.length > 0 ? 'failed' : 'passed'
      
      await supabase
        .from('test_executions')
        .update({
          execution_status: executionStatus,
          completed_at: new Date().toISOString(),
        })
        .eq('id', result.execution_id)

      // Save browser execution details
      await supabase
        .from('test_executions_browser')
        .insert(result)

      setExecutionResult(result)
      setExecuting(false)
      setShowResults(true)

      toast.success(
        executionStatus === 'passed' ? "Test passed!" : "Test failed",
        {
          description: executionStatus === 'passed' 
            ? `All ${recording?.actions.length} steps completed successfully`
            : `Failed at step ${result.error_steps[0]?.step_number}`
        }
      )

      if (onExecutionComplete) {
        onExecutionComplete(result)
      }
    } catch (error) {
      console.error('Error saving execution result:', error)
      toast.error("Failed to save execution result")
    }
  }

  function handleExecutionError(error: string) {
    setExecuting(false)
    toast.error("Execution error", {
      description: error
    })
  }

  async function exportToPlaywright() {
    if (!recording) return

    try {
      // Call API to convert recording to Playwright code
      const response = await fetch('/api/export-playwright', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recording_id: recording.id,
          test_case_id: testCaseId,
        })
      })

      if (!response.ok) throw new Error('Export failed')

      const { code } = await response.json()

      // Download as file
      const blob = new Blob([code], { type: 'text/javascript' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `test-${testCaseId}.spec.js`
      a.click()
      URL.revokeObjectURL(url)

      toast.success("Playwright code exported")
    } catch (error) {
      console.error('Error exporting to Playwright:', error)
      toast.error("Failed to export code")
    }
  }

  if (!recording && !recordingId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Browser Test Execution</CardTitle>
          <CardDescription>
            Create a recording first to run this test
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Execution Controls */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Test Execution
              </CardTitle>
              <CardDescription>
                {executing 
                  ? `Running step ${currentStep} of ${recording?.actions.length || 0}`
                  : "Run test in your browser"
                }
              </CardDescription>
            </div>
            <Badge variant={executing ? "default" : "secondary"}>
              {executing ? "Running" : "Ready"}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {executing && recording && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Progress</span>
                <span className="font-semibold">
                  {Math.round((currentStep / recording.actions.length) * 100)}%
                </span>
              </div>
              <Progress value={(currentStep / recording.actions.length) * 100} />
            </div>
          )}

          <div className="flex gap-2">
            {!executing ? (
              <>
                <Button onClick={startExecution} className="gap-2 flex-1">
                  <Play className="h-4 w-4" />
                  Run Test
                </Button>
                <Button onClick={exportToPlaywright} variant="outline" className="gap-2">
                  <Code2 className="h-4 w-4" />
                  Export Code
                </Button>
              </>
            ) : (
              <Button 
                onClick={() => window.postMessage({ type: 'STOP_EXECUTION' }, '*')} 
                variant="destructive" 
                className="gap-2 flex-1"
              >
                <Square className="h-4 w-4" />
                Stop Execution
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Execution Results Dialog */}
      {executionResult && (
        <Dialog open={showResults} onOpenChange={setShowResults}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {executionResult.error_steps.length === 0 ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-600" />
                )}
                Execution Results
              </DialogTitle>
              <DialogDescription>
                Test {executionResult.error_steps.length === 0 ? "passed" : "failed"} • 
                Duration: {(executionResult.performance_metrics.total_duration_ms / 1000).toFixed(1)}s
              </DialogDescription>
            </DialogHeader>

            <Tabs defaultValue="summary" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="summary">Summary</TabsTrigger>
                <TabsTrigger value="screenshots">
                  Screenshots ({executionResult.screenshots.length})
                </TabsTrigger>
                <TabsTrigger value="console">
                  Console ({executionResult.console_logs.length})
                </TabsTrigger>
                <TabsTrigger value="network">
                  Network ({executionResult.network_logs?.length || 0})
                </TabsTrigger>
              </TabsList>

              {/* Summary Tab */}
              <TabsContent value="summary" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">Performance</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Total Duration</span>
                        <span className="font-semibold">
                          {(executionResult.performance_metrics.total_duration_ms / 1000).toFixed(1)}s
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Page Load</span>
                        <span className="font-semibold">
                          {executionResult.performance_metrics.page_load_ms 
                            ? `${executionResult.performance_metrics.page_load_ms}ms`
                            : 'N/A'
                          }
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Memory</span>
                        <span className="font-semibold">
                          {executionResult.performance_metrics.memory_usage_mb 
                            ? `${executionResult.performance_metrics.memory_usage_mb.toFixed(1)} MB`
                            : 'N/A'
                          }
                        </span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">Environment</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Browser</span>
                        <span className="font-semibold capitalize">
                          {executionResult.browser_type}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Version</span>
                        <span className="font-semibold">
                          {executionResult.browser_version}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Extension</span>
                        <span className="font-semibold">
                          v{executionResult.extension_version}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Errors */}
                {executionResult.error_steps.length > 0 && (
                  <Card className="border-destructive">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm text-destructive">
                        Errors ({executionResult.error_steps.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {executionResult.error_steps.map((error, idx) => (
                        <div key={idx} className="rounded-lg border border-destructive/50 bg-destructive/5 p-3">
                          <div className="flex items-start gap-2">
                            <XCircle className="h-4 w-4 text-destructive mt-0.5" />
                            <div className="flex-1">
                              <div className="font-semibold text-sm">Step {error.step_number}</div>
                              <div className="text-sm text-muted-foreground mt-1">
                                {error.error_message}
                              </div>
                              {error.screenshot && (
                                <img 
                                  src={error.screenshot} 
                                  alt="Error screenshot" 
                                  className="mt-2 rounded border max-w-full h-auto"
                                />
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* Screenshots Tab */}
              <TabsContent value="screenshots" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  {executionResult.screenshots.map((screenshot, idx) => (
                    <Card key={idx}>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm">Step {screenshot.step}</CardTitle>
                        <CardDescription className="text-xs">
                          {new Date(screenshot.timestamp).toLocaleTimeString()}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <img 
                          src={screenshot.url} 
                          alt={`Step ${screenshot.step}`}
                          className="rounded border w-full h-auto"
                        />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              {/* Console Tab */}
              <TabsContent value="console" className="space-y-2">
                <div className="rounded-lg border bg-muted/50 p-4 font-mono text-xs space-y-1 max-h-96 overflow-y-auto">
                  {executionResult.console_logs.map((log, idx) => (
                    <div 
                      key={idx} 
                      className={`${
                        log.level === 'error' ? 'text-red-600' :
                        log.level === 'warn' ? 'text-yellow-600' :
                        'text-muted-foreground'
                      }`}
                    >
                      [{new Date(log.timestamp).toLocaleTimeString()}] {log.level.toUpperCase()}: {log.message}
                    </div>
                  ))}
                </div>
              </TabsContent>

              {/* Network Tab */}
              <TabsContent value="network" className="space-y-2">
                <div className="rounded-lg border overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-muted">
                        <tr>
                          <th className="text-left p-2">URL</th>
                          <th className="text-left p-2">Method</th>
                          <th className="text-left p-2">Status</th>
                          <th className="text-left p-2">Duration</th>
                        </tr>
                      </thead>
                      <tbody>
                        {executionResult.network_logs?.map((log, idx) => (
                          <tr key={idx} className="border-t">
                            <td className="p-2 font-mono text-xs truncate max-w-xs">{log.url}</td>
                            <td className="p-2">{log.method}</td>
                            <td className="p-2">
                              <Badge variant={log.status < 400 ? "default" : "destructive"}>
                                {log.status}
                              </Badge>
                            </td>
                            <td className="p-2">{log.duration_ms}ms</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}