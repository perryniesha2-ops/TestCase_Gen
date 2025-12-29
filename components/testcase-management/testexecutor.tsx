"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Play,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  Image as ImageIcon,
  FileText,
  Zap,
  AlertTriangle,
} from "lucide-react"
import type { 
  BrowserRecording, 
  BrowserExecutionResult,
  PlaybackOptions 
} from "@/types/browser-automation"

interface TestExecutorProps {
  recording: BrowserRecording
  onClose?: () => void
}

export function TestExecutor({ recording, onClose }: TestExecutorProps) {
  const [executing, setExecuting] = useState(false)
  const [executionResult, setExecutionResult] = useState<BrowserExecutionResult | null>(null)
  const [currentStep, setCurrentStep] = useState(0)
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1)
  
  const executionWindowRef = useState<Window | null>(null)

  async function executeTest() {
    setExecuting(true)
    setExecutionResult(null)
    setCurrentStep(0)

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) throw new Error("Not authenticated")

      // Open execution window
      const width = recording.viewport?.width || 1280
      const height = recording.viewport?.height || 800
      const left = (screen.width - width) / 2
      const top = (screen.height - height) / 2

      const execWindow = window.open(
        recording.start_url,
        'qa-execution-window',
        `width=${width},height=${height},left=${left},top=${top}`
      )

      if (!execWindow) {
        toast.error("Please allow popups for test execution")
        return
      }

      executionWindowRef[0] = execWindow

      // Create execution record
      const { data: execution, error: execError } = await supabase
        .from('recording_executions')
        .insert({
          recording_id: recording.id,
          user_id: user.id,
          status: 'running',
          steps_total: recording.actions.length,
          browser_info: {
            name: getBrowserName(),
            version: navigator.userAgent,
            userAgent: navigator.userAgent,
          },
        })
        .select()
        .single()

      if (execError) throw execError

      const executionId = execution.id

      // Wait for window to load
      await new Promise<void>((resolve) => {
        const checkLoad = setInterval(() => {
          if (execWindow.document.readyState === 'complete') {
            clearInterval(checkLoad)
            resolve()
          }
        }, 100)
      })

      // Execute actions one by one
      const startTime = Date.now()
      const screenshots: Array<{ stepIndex: number; url: string }> = []
      const consoleLogs: Array<{ level: string; message: string; timestamp: number }> = []

      for (let i = 0; i < recording.actions.length; i++) {
        const action = recording.actions[i]
        setCurrentStep(i + 1)

        try {
          // Send action to extension in execution window
          execWindow.postMessage({
            type: 'EXECUTE_ACTION',
            source: 'qa-app',
            payload: {
              action,
              stepIndex: i,
              speed: playbackSpeed,
            },
          }, '*')

          // Wait for action completion
          await waitForActionCompletion(execWindow, action, playbackSpeed)

          // Capture screenshot if needed
          if (action.type === 'click' || action.type === 'navigate') {
            // Screenshot would be captured by extension
            screenshots.push({
              stepIndex: i,
              url: `screenshot-${i}.png`, // Placeholder
            })
          }

          // Update execution progress
          await supabase
            .from('recording_executions')
            .update({
              steps_completed: i + 1,
            })
            .eq('id', executionId)

        } catch (error) {
          // Action failed
          const errorMessage = error instanceof Error ? error.message : 'Unknown error'

          const result: BrowserExecutionResult = {
            status: 'failed',
            steps_completed: i,
            steps_total: recording.actions.length,
            failed_step_index: i,
            error_message: errorMessage,
            duration_ms: Date.now() - startTime,
            screenshots,
            console_logs: consoleLogs,
          }

          setExecutionResult(result)

          // Update execution record
          await supabase
            .from('recording_executions')
            .update({
              status: 'failed',
              completed_at: new Date().toISOString(),
              duration_ms: Date.now() - startTime,
              steps_completed: i,
              failed_step_index: i,
              error_message: errorMessage,
              screenshots,
              console_logs: consoleLogs,
            })
            .eq('id', executionId)

          // Update recording
          await supabase
            .from('browser_recordings')
            .update({
              last_execution_at: new Date().toISOString(),
              last_execution_status: 'failed',
              last_execution_result: result,
              execution_count: recording.execution_count + 1,
            })
            .eq('id', recording.id)

          toast.error("Test execution failed", {
            description: `Failed at step ${i + 1}: ${errorMessage}`
          })

          if (execWindow && !execWindow.closed) {
            execWindow.close()
          }

          return
        }
      }

      // All actions passed
      const result: BrowserExecutionResult = {
        status: 'passed',
        steps_completed: recording.actions.length,
        steps_total: recording.actions.length,
        duration_ms: Date.now() - startTime,
        screenshots,
        console_logs: consoleLogs,
      }

      setExecutionResult(result)

      // Update execution record
      await supabase
        .from('recording_executions')
        .update({
          status: 'passed',
          completed_at: new Date().toISOString(),
          duration_ms: Date.now() - startTime,
          steps_completed: recording.actions.length,
          screenshots,
          console_logs: consoleLogs,
        })
        .eq('id', executionId)

      // Update recording
      await supabase
        .from('browser_recordings')
        .update({
          last_execution_at: new Date().toISOString(),
          last_execution_status: 'passed',
          last_execution_result: result,
          execution_count: recording.execution_count + 1,
        })
        .eq('id', recording.id)

      toast.success("Test passed!", {
        description: `${recording.actions.length} steps completed successfully`
      })

      if (execWindow && !execWindow.closed) {
        execWindow.close()
      }

    } catch (error) {
      console.error("Execution error:", error)
      toast.error("Test execution failed")
    } finally {
      setExecuting(false)
    }
  }

  async function waitForActionCompletion(
    win: Window,
    action: any,
    speed: number
  ): Promise<void> {
    // Base delay based on action type
    let baseDelay = 500 // ms

    switch (action.type) {
      case 'click':
        baseDelay = 300
        break
      case 'type':
        baseDelay = 100 * (action.value?.length || 1)
        break
      case 'navigate':
        baseDelay = 2000
        break
      case 'scroll':
        baseDelay = 300
        break
    }

    const delay = baseDelay / speed

    return new Promise((resolve) => {
      setTimeout(resolve, delay)
    })
  }

  function getBrowserName(): string {
    const ua = navigator.userAgent
    if (ua.includes('Chrome')) return 'Chrome'
    if (ua.includes('Firefox')) return 'Firefox'
    if (ua.includes('Safari')) return 'Safari'
    if (ua.includes('Edge')) return 'Edge'
    return 'Unknown'
  }

  function formatDuration(ms: number): string {
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  const progress = executing 
    ? (currentStep / recording.actions.length) * 100 
    : executionResult 
    ? 100 
    : 0

  return (
    <div className="space-y-6">
      {/* Execution Controls */}
      <div className="rounded-lg border bg-card p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-semibold">Execute Test</h4>
            <p className="text-sm text-muted-foreground">
              {recording.actions.length} actions • Run #{recording.execution_count + 1}
            </p>
          </div>

          <Select
            value={playbackSpeed.toString()}
            onValueChange={(value) => setPlaybackSpeed(parseFloat(value))}
            disabled={executing}
          >
            <SelectTrigger className="w-[130px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0.5">
                <div className="flex items-center gap-2">
                  <Zap className="h-3 w-3" />
                  0.5x Slow
                </div>
              </SelectItem>
              <SelectItem value="1">
                <div className="flex items-center gap-2">
                  <Zap className="h-3 w-3" />
                  1x Normal
                </div>
              </SelectItem>
              <SelectItem value="2">
                <div className="flex items-center gap-2">
                  <Zap className="h-3 w-3" />
                  2x Fast
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button
          onClick={executeTest}
          disabled={executing}
          className="w-full gap-2"
        >
          {executing ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Running... ({currentStep}/{recording.actions.length})
            </>
          ) : (
            <>
              <Play className="h-4 w-4" />
              Run Test
            </>
          )}
        </Button>

        {executing && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-medium">{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        )}
      </div>

      {/* Execution Result */}
      {executionResult && (
        <div className="rounded-lg border bg-card p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {executionResult.status === 'passed' ? (
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              ) : (
                <XCircle className="h-5 w-5 text-red-600" />
              )}
              <div>
                <h4 className="font-semibold">
                  {executionResult.status === 'passed' ? 'Test Passed' : 'Test Failed'}
                </h4>
                <p className="text-sm text-muted-foreground">
                  {executionResult.steps_completed}/{executionResult.steps_total} steps completed
                </p>
              </div>
            </div>
            <Badge variant={executionResult.status === 'passed' ? 'default' : 'destructive'}>
              <Clock className="h-3 w-3 mr-1" />
              {formatDuration(executionResult.duration_ms)}
            </Badge>
          </div>

          {executionResult.error_message && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold text-red-900 text-sm">
                    Failed at step {(executionResult.failed_step_index || 0) + 1}
                  </p>
                  <p className="text-sm text-red-700 mt-1">
                    {executionResult.error_message}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Console Logs */}
          {executionResult.console_logs.length > 0 && (
            <div>
              <h5 className="font-semibold text-sm mb-2 flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Console Logs ({executionResult.console_logs.length})
              </h5>
              <ScrollArea className="h-[150px] rounded-lg border p-3 bg-muted/50">
                <div className="space-y-1 font-mono text-xs">
                  {executionResult.console_logs.map((log, i) => (
                    <div key={i} className="flex gap-2">
                      <span className="text-muted-foreground">[{log.level}]</span>
                      <span>{log.message}</span>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}

          {/* Screenshots */}
          {executionResult.screenshots.length > 0 && (
            <div>
              <h5 className="font-semibold text-sm mb-2 flex items-center gap-2">
                <ImageIcon className="h-4 w-4" />
                Screenshots ({executionResult.screenshots.length})
              </h5>
              <div className="grid grid-cols-2 gap-2">
                {executionResult.screenshots.map((screenshot, i) => (
                  <div key={i} className="rounded-lg border p-2 text-center text-sm">
                    <p className="text-muted-foreground">Step {screenshot.stepIndex + 1}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Last Execution Info */}
      {recording.last_execution_at && !executing && !executionResult && (
        <div className="rounded-lg border bg-muted/50 p-4">
          <div className="flex items-center justify-between">
            <div>
              <h5 className="font-semibold text-sm">Last Execution</h5>
              <p className="text-sm text-muted-foreground">
                {new Date(recording.last_execution_at).toLocaleString()}
              </p>
            </div>
            <Badge variant={recording.last_execution_status === 'passed' ? 'default' : 'destructive'}>
              {recording.last_execution_status}
            </Badge>
          </div>
        </div>
      )}
    </div>
  )
}