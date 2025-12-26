"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Circle, 
  Square, 
  AlertCircle, 
  ExternalLink,
  Loader2,
  CheckCircle2,
  Play 
} from "lucide-react"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"
import { RecordingsList } from "./recordings-list"

interface BrowserRecorderProps {
  testCaseId: string
  testCaseTitle: string
  onRecordingComplete: (recordingId: string) => void
}

type RecordingStep = 'setup' | 'recording' | 'processing' | 'complete'

export function BrowserRecorder({ 
  testCaseId, 
  testCaseTitle,
  onRecordingComplete 
}: BrowserRecorderProps) {
  const [step, setStep] = useState<RecordingStep>('setup')
  const [startUrl, setStartUrl] = useState('')
  const [recordingId, setRecordingId] = useState('')
  const [actionCount, setActionCount] = useState(0)
  const [recordingTab, setRecordingTab] = useState<Window | null>(null)

  // Poll chrome.storage for action count updates (cross-tab communication)
  useEffect(() => {
    if (step !== 'recording' || !recordingId) return

    const pollInterval = setInterval(() => {
      // Request storage check
      window.postMessage({
        type: 'QA_CHECK_STORAGE',
        key: 'activeRecording'
      }, '*')
    }, 1000) // Check every second

    // Listen for storage response
    const handleStorage = (event: MessageEvent) => {
      if (event.data.type === 'QA_STORAGE_RESPONSE' && event.data.key === 'activeRecording') {
        const recording = event.data.value
        if (recording && recording.actionCount) {
          console.log('📊 Action count update:', recording.actionCount)
          setActionCount(recording.actionCount)
        }
      }
    }

    window.addEventListener('message', handleStorage)

    return () => {
      clearInterval(pollInterval)
      window.removeEventListener('message', handleStorage)
    }
  }, [step, recordingId])

  // Listen for actions from extension
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'QA_ACTION_RECORDED') {
        console.log('📥 Action recorded:', event.data)
        setActionCount(prev => prev + 1)
      }
      
      if (event.data.type === 'QA_RECORDING_STOPPED') {
        // Received final recording data (same tab)
        console.log('📥 Recording stopped, data received:', event.data.recording)
        handleRecordingData(event.data.recording)
      }
      
      if (event.data.type === 'QA_STORAGE_RESPONSE' && event.data.key === 'completedRecording') {
        // Received completed recording from chrome.storage (cross-tab)
        const recording = event.data.value
        if (recording && recording.recordingId === recordingId) {
          console.log('📥 Completed recording from storage:', recording)
          handleRecordingData(recording)
          
          // Clear completed recording from storage
          window.postMessage({
            type: 'QA_STORAGE_DELETE',
            key: 'completedRecording'
          }, '*')
        }
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [recordingId])

  // Check if tab was closed
  useEffect(() => {
    if (!recordingTab || step !== 'recording') return

    const checkInterval = setInterval(() => {
      if (recordingTab.closed) {
        toast.error('Recording tab was closed')
        handleStopRecording()
      }
    }, 1000)

    return () => clearInterval(checkInterval)
  }, [recordingTab, step])

  function generateRecordingId() {
    return `rec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  async function handleStartRecording() {
    if (!startUrl) {
      toast.error('Please enter a URL')
      return
    }

    // Validate URL
    try {
      new URL(startUrl)
    } catch (e) {
      toast.error('Please enter a valid URL (include https://)')
      return
    }

    const newRecordingId = generateRecordingId()
    setRecordingId(newRecordingId)
    setActionCount(0)

    // Store recording state in chrome.storage via extension
    window.postMessage({
      type: 'QA_STORAGE_SET',
      key: 'activeRecording',
      value: {
        id: newRecordingId,
        testCaseId: testCaseId,
        startUrl: startUrl,
        startTime: Date.now(),
        actions: []
      }
    }, '*')

    // Open URL in new tab
    const newTab = window.open(startUrl, '_blank', 'noopener,noreferrer')
    setRecordingTab(newTab)

    // Move to recording step
    setStep('recording')
    toast.success('Recording started! Perform actions in the new tab.')
  }

  function handleStopRecording() {
    setStep('processing')

    // Request recording data from extension
    window.postMessage({
      type: 'QA_COMMAND_STOP_RECORDING',
      recordingId: recordingId
    }, '*')

    // Check chrome.storage for completed recording (cross-tab)
    setTimeout(() => {
      window.postMessage({
        type: 'QA_CHECK_STORAGE',
        key: 'completedRecording'
      }, '*')
    }, 1000)

    // Close recording tab if still open
    if (recordingTab && !recordingTab.closed) {
      recordingTab.close()
    }
  }

  async function handleRecordingData(recording: any) {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        toast.error('Please log in to save recording')
        setStep('setup')
        return
      }

      // Calculate duration
      const durationMs = recording.duration || (Date.now() - recording.startTime)

      console.log('💾 Saving recording:', {
        actionCount: recording.actions?.length,
        duration: durationMs,
        url: startUrl
      })

      // Save to Supabase - let database generate UUID
      const { data, error } = await supabase
        .from('browser_recordings')
        .insert({
          user_id: user.id,
          test_case_id: testCaseId, // Should already be UUID from props
          url: startUrl,
          actions: recording.actions,
          duration_ms: durationMs,
          viewport: recording.viewport,
          browser_info: {
            user_agent: navigator.userAgent,
            viewport: recording.viewport,
            url: recording.url
          }
        })
        .select()
        .single()

      if (error) {
        console.error('❌ Supabase error:', error)
        throw error
      }

      console.log('✅ Recording saved to database:', data)

      // TODO: Call AI API to generate description
      // const description = await generateAIDescription(recording)

      toast.success(`✨ Recording saved! ${recording.actions.length} actions captured`)
      setStep('complete')
      
      // Clear chrome.storage
      window.postMessage({
        type: 'QA_STORAGE_DELETE',
        key: 'activeRecording'
      }, '*')
      
      window.postMessage({
        type: 'QA_STORAGE_DELETE',
        key: 'completedRecording'
      }, '*')

      // Call parent callback with the database-generated ID
      onRecordingComplete(data.id)

    } catch (error) {
      console.error('Error saving recording:', error)
      toast.error('Failed to save recording')
      setStep('setup')
    }
  }

  function handleReset() {
    setStep('setup')
    setStartUrl('')
    setRecordingId('')
    setActionCount(0)
    setRecordingTab(null)
  }

  return (
    <Tabs defaultValue="record" className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="record">Record New Test</TabsTrigger>
        <TabsTrigger value="recordings">View Recordings</TabsTrigger>
      </TabsList>

      {/* Record Tab */}
      <TabsContent value="record" className="space-y-4 mt-4">
        {/* Step 1: URL Setup */}
        {step === 'setup' && (
          <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Circle className="h-5 w-5 text-red-500" />
              Start New Recording
            </CardTitle>
            <CardDescription>
              Enter the URL where you want to start testing
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="start-url">Starting URL</Label>
              <Input
                id="start-url"
                type="url"
                placeholder="https://app.example.com/login"
                value={startUrl}
                onChange={(e) => setStartUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleStartRecording()
                  }
                }}
              />
              <p className="text-xs text-muted-foreground">
                The extension will open this URL in a new tab and start recording your actions
              </p>
            </div>

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>How it works:</AlertTitle>
              <AlertDescription className="text-xs space-y-1 mt-2">
                <p>1. Enter the URL you want to test</p>
                <p>2. Click "Open & Start Recording"</p>
                <p>3. New tab opens with the URL</p>
                <p>4. Perform your test actions in that tab</p>
                <p>5. Return here and click "Stop Recording"</p>
              </AlertDescription>
            </Alert>

            <Button 
              onClick={handleStartRecording}
              disabled={!startUrl}
              className="w-full gap-2"
            >
              <ExternalLink className="h-4 w-4" />
              Open URL & Start Recording
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Recording in Progress */}
      {step === 'recording' && (
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="h-3 w-3 bg-red-500 rounded-full animate-pulse" />
              Recording in Progress
            </CardTitle>
            <CardDescription>
              Perform your test actions in the opened tab
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-sm">
                <p className="font-medium mb-1">Go to the tab that opened:</p>
                <p className="text-xs text-muted-foreground break-all">{startUrl}</p>
                <p className="text-xs text-muted-foreground mt-2">
                  Every click, input, and navigation will be recorded. Come back here when you're done.
                </p>
              </AlertDescription>
            </Alert>

            <div className="p-6 border rounded-lg bg-muted/50 text-center">
              <div className="text-4xl font-bold">{actionCount}</div>
              <div className="text-sm text-muted-foreground mt-1">
                actions captured
              </div>
            </div>

            <Button 
              onClick={handleStopRecording}
              variant="destructive"
              className="w-full gap-2"
            >
              <Square className="h-4 w-4" />
              Stop Recording
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Processing */}
      {step === 'processing' && (
        <Card>
          <CardContent className="py-8">
            <div className="flex flex-col items-center gap-4 text-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <div>
                <p className="font-semibold">Processing Recording...</p>
                <p className="text-sm text-muted-foreground">
                  Saving {actionCount} actions
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Complete */}
      {step === 'complete' && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="py-8">
            <div className="flex flex-col items-center gap-4 text-center">
              <CheckCircle2 className="h-12 w-12 text-green-600" />
              <div>
                <p className="font-semibold text-green-900">Recording Saved!</p>
                <p className="text-sm text-green-700">
                  {actionCount} actions captured successfully
                </p>
              </div>
              <Button onClick={handleReset} variant="outline" size="sm">
                Record Another Test
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
      </TabsContent>

      {/* Recordings Tab */}
      <TabsContent value="recordings" className="mt-4">
        <RecordingsList
          testCaseId={testCaseId}
          onRunTest={(recording) => {
            // TODO: Implement test execution
            console.log('Run recording:', recording)
            toast.info('Test execution coming soon!')
          }}
        />
      </TabsContent>
    </Tabs>
  )
}