"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Circle, Square, Loader2, Sparkles } from "lucide-react"

interface BrowserRecorderProps {
  testCaseId: string
  testCaseTitle: string
  onRecordingComplete?: (recordingId: string) => void
}

export function BrowserRecorderAIEnhanced({
  testCaseId,
  testCaseTitle,
  onRecordingComplete
}: BrowserRecorderProps) {
  const [isRecording, setIsRecording] = useState(false)
  const [actionCount, setActionCount] = useState(0)
  const [extensionInstalled, setExtensionInstalled] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    checkExtension()
    
    // Listen for recorded actions
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'QA_ACTION_RECORDED') {
        setActionCount(prev => prev + 1)
      }
      
      if (event.data.type === 'QA_RECORDING_STOPPED') {
        handleRecordingStopped(event.data.recording)
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [])

  function checkExtension() {
    const installed = !!(window as any).__QA_EXTENSION_INSTALLED
    setExtensionInstalled(installed)
  }

  async function startRecording() {
    if (!extensionInstalled) {
      toast.error("Extension not installed", {
        description: "Please install the browser extension first"
      })
      return
    }

    // Generate recording ID
    const recordingId = `rec_${Date.now()}`

    // Start recording via extension
    window.postMessage({
      type: 'QA_COMMAND_START_RECORDING',
      recordingId: recordingId
    }, '*')

    setIsRecording(true)
    setActionCount(0)
    
    toast.success("Recording started", {
      description: "Perform actions in your app"
    })
  }

  function stopRecording() {
    window.postMessage({
      type: 'QA_COMMAND_STOP_RECORDING'
    }, '*')
    
    setIsRecording(false)
  }

  async function handleRecordingStopped(recording: any) {
    setIsProcessing(true)
    
    try {
      // 🤖 AI STEP 1: Generate test description
      toast.info("🤖 Analyzing recording with AI...")
      
      const aiDescription = await generateAIDescription(recording)
      
      // 🤖 AI STEP 2: Annotate actions
      const annotatedActions = await annotateActions(recording.actions)
      
      // 🤖 AI STEP 3: Generate assertions
      const aiAssertions = await generateAssertions(recording)

      // Save to database with AI enhancements
      const { data, error } = await supabase
        .from('browser_recordings')
        .insert({
          test_case_id: testCaseId,
          actions: annotatedActions, // 🤖 AI-annotated actions
          url: recording.url,
          viewport: recording.viewport,
          duration_ms: recording.duration,
          browser_info: {
            userAgent: navigator.userAgent
          },
          ai_metadata: { // 🤖 AI-generated metadata
            description: aiDescription,
            assertions: aiAssertions,
            generated_at: new Date().toISOString()
          }
        })
        .select()
        .single()

      if (error) throw error

      toast.success("✨ Recording saved with AI insights!", {
        description: aiDescription,
        duration: 5000
      })

      onRecordingComplete?.(data.id)
      
    } catch (error) {
      console.error('Error saving recording:', error)
      toast.error("Failed to save recording")
    } finally {
      setIsProcessing(false)
      setActionCount(0)
    }
  }

  // 🤖 AI Function: Generate test description
  async function generateAIDescription(recording: any): Promise<string> {
    try {
      const response = await fetch('/api/ai/describe-recording', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actions: recording.actions,
          url: recording.url,
          testCaseTitle: testCaseTitle
        })
      })

      if (!response.ok) throw new Error('AI description failed')

      const { description } = await response.json()
      return description
    } catch (error) {
      console.error('AI description error:', error)
      return `Recorded ${recording.actions.length} actions on ${new URL(recording.url).hostname}`
    }
  }

  // 🤖 AI Function: Annotate actions with human-readable descriptions
  async function annotateActions(actions: any[]): Promise<any[]> {
    try {
      const response = await fetch('/api/ai/annotate-actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actions })
      })

      if (!response.ok) throw new Error('Annotation failed')

      const { annotatedActions } = await response.json()
      return annotatedActions
    } catch (error) {
      console.error('AI annotation error:', error)
      return actions // Return original if AI fails
    }
  }

  // 🤖 AI Function: Generate suggested assertions
  async function generateAssertions(recording: any): Promise<any[]> {
    try {
      const response = await fetch('/api/ai/generate-assertions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actions: recording.actions,
          url: recording.url
        })
      })

      if (!response.ok) throw new Error('Assertion generation failed')

      const { assertions } = await response.json()
      return assertions
    } catch (error) {
      console.error('AI assertion error:', error)
      return []
    }
  }

  if (!extensionInstalled) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-muted-foreground mb-4">
          Browser extension not detected
        </p>
        <Button variant="outline" onClick={checkExtension}>
          Refresh Detection
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Recording Status */}
      {isRecording && (
        <div className="border border-red-200 bg-red-50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Circle className="h-3 w-3 fill-red-600 text-red-600 animate-pulse" />
              <span className="font-semibold text-red-900">Recording in progress</span>
            </div>
            <Badge variant="destructive">{actionCount} actions</Badge>
          </div>
          <p className="text-sm text-red-700 mb-4">
            Perform actions in your app. They will be captured automatically.
          </p>
          <Button
            variant="destructive"
            size="sm"
            className="w-full gap-2"
            onClick={stopRecording}
          >
            <Square className="h-4 w-4" />
            Stop Recording
          </Button>
        </div>
      )}

      {/* Processing with AI */}
      {isProcessing && (
        <div className="border border-purple-200 bg-purple-50 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <Loader2 className="h-5 w-5 text-purple-600 animate-spin" />
            <div>
              <p className="font-semibold text-purple-900 flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                AI is analyzing your recording...
              </p>
              <p className="text-sm text-purple-700 mt-1">
                Generating description, annotations, and assertions
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Start Recording Button */}
      {!isRecording && !isProcessing && (
        <Button
          onClick={startRecording}
          className="w-full h-10 gap-2"
        >
          <Circle className="h-4 w-4 fill-current" />
          Start Recording
        </Button>
      )}

      {/* AI Features Badge */}
      <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
        <Sparkles className="h-3 w-3" />
        <span>Powered by AI: Auto-description, Smart annotations, Suggested assertions</span>
      </div>
    </div>
  )
}