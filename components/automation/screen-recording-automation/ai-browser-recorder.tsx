"use client"

import { useState, useEffect, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import {
  Circle,
  Square,
  Pause,
  Play,
  Trash2,
  Save,
  Loader2,
  MousePointer2,
  Keyboard,
  Monitor,
  Clock,
  Sparkles,
  Wand2,
  CheckCircle2,
  AlertCircle,
  Zap,
  FileText,
  Target,
} from "lucide-react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { 
  BrowserRecording, 
  RecordingAction, 
  RecorderState,
  ExtensionMessage 
} from "@/types/browser-automation"

interface BrowserRecorderAIProps {
  testCaseId: string
  testCaseTitle: string
  onRecordingComplete: (recordingId: string) => void
  existingRecording?: BrowserRecording
}

interface AIAnalysis {
  description: string
  summary: string
  userJourney: string
  suggestedAssertions: string[]
  criticalSteps: number[]
  estimatedComplexity: 'simple' | 'moderate' | 'complex'
  tags: string[]
}

interface AnnotatedAction extends RecordingAction {
  ai_annotation?: string
  ai_importance?: 'critical' | 'important' | 'standard'
  ai_category?: 'navigation' | 'input' | 'interaction' | 'validation'
}

export function BrowserRecorderAI({
  testCaseId,
  testCaseTitle,
  onRecordingComplete,
  existingRecording,
}: BrowserRecorderAIProps) {
  const [recorderState, setRecorderState] = useState<RecorderState>({
    isRecording: false,
    isPaused: false,
    actions: existingRecording?.actions || [],
    startTime: null,
    currentUrl: "",
  })
  
  const [startUrl, setStartUrl] = useState(existingRecording?.start_url || "")
  const [title, setTitle] = useState(existingRecording?.title || `Recording - ${testCaseTitle}`)
  const [description, setDescription] = useState(existingRecording?.description || "")
  const [saving, setSaving] = useState(false)
  const [extensionConnected, setExtensionConnected] = useState(false)
  
  // AI Enhancement States
  const [aiProcessing, setAiProcessing] = useState(false)
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysis | null>(null)
  const [annotatedActions, setAnnotatedActions] = useState<AnnotatedAction[]>([])
  const [showAIInsights, setShowAIInsights] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)
  
  const recordingWindowRef = useRef<Window | null>(null)
  const messageListenerRef = useRef<((event: MessageEvent) => void) | null>(null)

  // Check extension connection
  useEffect(() => {
    checkExtensionConnection()
    const interval = setInterval(checkExtensionConnection, 2000)
    return () => clearInterval(interval)
  }, [])

  // Listen for extension messages
  useEffect(() => {
    if (!recorderState.isRecording) return

    const handleMessage = (event: MessageEvent) => {
      if (event.data?.source !== 'qa-extension') return

      const message: ExtensionMessage = event.data

      switch (message.type) {
        case 'RECORDER_ACTION':
          handleNewAction(message.payload as RecordingAction)
          break
        case 'RECORDER_STOP':
          stopRecording()
          break
      }
    }

    window.addEventListener('message', handleMessage)
    messageListenerRef.current = handleMessage

    return () => {
      if (messageListenerRef.current) {
        window.removeEventListener('message', messageListenerRef.current)
      }
    }
  }, [recorderState.isRecording])

  function checkExtensionConnection() {
    const connected = !!(window as any).__QA_EXTENSION_INSTALLED
    setExtensionConnected(connected)
  }

  function handleNewAction(action: RecordingAction) {
    setRecorderState(prev => ({
      ...prev,
      actions: [...prev.actions, action],
      currentUrl: action.url || prev.currentUrl,
    }))
  }

  async function startRecording() {
    if (!startUrl) {
      toast.error("Please enter a starting URL")
      return
    }

    if (!extensionConnected) {
      toast.error("Browser extension not detected")
      return
    }

    try {
      new URL(startUrl)
    } catch {
      toast.error("Please enter a valid URL (including http:// or https://)")
      return
    }

    const width = 1280
    const height = 800
    const left = (screen.width - width) / 2
    const top = (screen.height - height) / 2

    const recordingWindow = window.open(
      startUrl,
      'qa-recording-window',
      `width=${width},height=${height},left=${left},top=${top}`
    )

    if (!recordingWindow) {
      toast.error("Please allow popups for recording")
      return
    }

    recordingWindowRef.current = recordingWindow

    recordingWindow.addEventListener('load', () => {
      recordingWindow.postMessage({
        type: 'START_RECORDING',
        source: 'qa-app',
        testCaseId,
      }, '*')
    })

    setRecorderState(prev => ({
      ...prev,
      isRecording: true,
      startTime: Date.now(),
      currentUrl: startUrl,
      actions: [],
    }))

    // Clear previous AI analysis
    setAiAnalysis(null)
    setAnnotatedActions([])
    setShowAIInsights(false)
    setAiError(null)

    toast.success("Recording started", {
      description: "Use the opened window to perform your test"
    })
  }

  function pauseRecording() {
    if (recordingWindowRef.current) {
      recordingWindowRef.current.postMessage({
        type: 'PAUSE_RECORDING',
        source: 'qa-app',
      }, '*')
    }

    setRecorderState(prev => ({
      ...prev,
      isPaused: true,
    }))

    toast.info("Recording paused")
  }

  function resumeRecording() {
    if (recordingWindowRef.current) {
      recordingWindowRef.current.postMessage({
        type: 'RESUME_RECORDING',
        source: 'qa-app',
      }, '*')
    }

    setRecorderState(prev => ({
      ...prev,
      isPaused: false,
    }))

    toast.info("Recording resumed")
  }

  function stopRecording() {
    if (recordingWindowRef.current && !recordingWindowRef.current.closed) {
      recordingWindowRef.current.postMessage({
        type: 'STOP_RECORDING',
        source: 'qa-app',
      }, '*')
      recordingWindowRef.current.close()
    }

    setRecorderState(prev => ({
      ...prev,
      isRecording: false,
      isPaused: false,
    }))

    toast.info("Recording stopped")

    // Automatically trigger AI analysis
    if (recorderState.actions.length > 0) {
      triggerAIAnalysis()
    }
  }

  function clearRecording() {
    setRecorderState(prev => ({
      ...prev,
      actions: [],
    }))
    setAiAnalysis(null)
    setAnnotatedActions([])
    setShowAIInsights(false)
    toast.info("Recording cleared")
  }

  // 🤖 AI ENHANCEMENT: Trigger comprehensive AI analysis
  async function triggerAIAnalysis() {
    if (recorderState.actions.length === 0) {
      toast.error("No actions to analyze")
      return
    }

    setAiProcessing(true)
    setAiError(null)
    
    toast.info("🤖 AI is analyzing your recording...", {
      description: "This may take a few moments",
      icon: <Sparkles className="h-4 w-4" />
    })

    try {
      // Run AI analysis in parallel
      const [analysis, annotated] = await Promise.all([
        generateAIAnalysis(recorderState.actions, startUrl, testCaseTitle),
        annotateActionsWithAI(recorderState.actions)
      ])

      setAiAnalysis(analysis)
      setAnnotatedActions(annotated)
      setShowAIInsights(true)

      toast.success("✨ AI analysis complete!", {
        description: analysis.summary,
        duration: 5000,
      })

      // Auto-fill description if empty
      if (!description) {
        setDescription(analysis.description)
      }

    } catch (error) {
      console.error("AI analysis error:", error)
      setAiError(error instanceof Error ? error.message : "AI analysis failed")
      toast.error("AI analysis failed", {
        description: "You can still save the recording manually"
      })
    } finally {
      setAiProcessing(false)
    }
  }

  // 🤖 AI Function: Comprehensive recording analysis
  async function generateAIAnalysis(
    actions: RecordingAction[],
    url: string,
    testTitle: string
  ): Promise<AIAnalysis> {
    try {
      const response = await fetch('/api/ai/analyze-recording', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actions,
          startUrl: url,
          testCaseTitle: testTitle,
        })
      })

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`)
      }

      const data = await response.json()
      return data.analysis
    } catch (error) {
      console.error("AI analysis API error:", error)
      
      // Fallback to basic analysis
      return generateBasicAnalysis(actions, url)
    }
  }

  // 🤖 AI Function: Annotate actions with intelligent descriptions
  async function annotateActionsWithAI(
    actions: RecordingAction[]
  ): Promise<AnnotatedAction[]> {
    try {
      const response = await fetch('/api/ai/annotate-actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actions })
      })

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`)
      }

      const data = await response.json()
      return data.annotatedActions
    } catch (error) {
      console.error("AI annotation API error:", error)
      
      // Fallback to basic annotations
      return actions.map(action => ({
        ...action,
        ai_annotation: generateBasicAnnotation(action),
        ai_importance: 'standard' as const,
        ai_category: categorizeAction(action),
      }))
    }
  }

  // Fallback: Basic analysis when AI is unavailable
  function generateBasicAnalysis(actions: RecordingAction[], url: string): AIAnalysis {
    const clickCount = actions.filter(a => a.type === 'click').length
    const typeCount = actions.filter(a => a.type === 'type').length
    const navCount = actions.filter(a => a.type === 'navigate').length

    const complexity = actions.length < 5 ? 'simple' : 
                      actions.length < 15 ? 'moderate' : 'complex'

    return {
      description: `Test recording with ${actions.length} actions on ${new URL(url).hostname}`,
      summary: `${clickCount} clicks, ${typeCount} inputs, ${navCount} navigations`,
      userJourney: `User performed ${actions.length} actions including form interactions and navigation`,
      suggestedAssertions: [
        "Verify page loads successfully",
        "Check all form inputs are accepted",
        "Confirm navigation works correctly",
      ],
      criticalSteps: actions
        .map((a, i) => ({ action: a, index: i }))
        .filter(({ action }) => 
          action.type === 'submit' || 
          action.type === 'navigate' ||
          (action.type === 'click' && action.metadata?.tagName === 'button')
        )
        .map(({ index }) => index),
      estimatedComplexity: complexity,
      tags: [
        clickCount > 0 ? 'clicks' : null,
        typeCount > 0 ? 'form-input' : null,
        navCount > 0 ? 'navigation' : null,
      ].filter(Boolean) as string[],
    }
  }

  function generateBasicAnnotation(action: RecordingAction): string {
    switch (action.type) {
      case 'click':
        return `Click on ${action.metadata.elementText || action.selector}`
      case 'type':
        return `Type "${action.value}" into ${action.selector}`
      case 'navigate':
        return `Navigate to ${action.url}`
      case 'select':
        return `Select option in ${action.selector}`
      case 'scroll':
        return `Scroll to position ${action.metadata.scrollPosition?.y}`
      case 'submit':
        return `Submit form ${action.selector}`
      default:
        return `Perform ${action.type} action`
    }
  }

  function categorizeAction(action: RecordingAction): AnnotatedAction['ai_category'] {
    switch (action.type) {
      case 'navigate':
        return 'navigation'
      case 'type':
      case 'select':
        return 'input'
      case 'click':
        return 'interaction'
      default:
        return 'validation'
    }
  }

  async function saveRecording() {
    if (recorderState.actions.length === 0) {
      toast.error("No actions recorded")
      return
    }

    setSaving(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) throw new Error("Not authenticated")

      const duration = recorderState.startTime 
        ? Date.now() - recorderState.startTime 
        : 0

      const recordingData = {
        test_case_id: testCaseId,
        user_id: user.id,
        title,
        description,
        status: 'ready' as const,
        actions: annotatedActions.length > 0 ? annotatedActions : recorderState.actions,
        start_url: startUrl,
        viewport: { width: 1280, height: 800 },
        duration_ms: duration,
        // 🤖 AI METADATA
        ai_metadata: aiAnalysis ? {
          analysis: aiAnalysis,
          generated_at: new Date().toISOString(),
          version: '1.0',
        } : null,
      }

      if (existingRecording) {
        const { error } = await supabase
          .from('browser_recordings')
          .update(recordingData)
          .eq('id', existingRecording.id)

        if (error) throw error

        toast.success("✨ Recording updated with AI insights!")
        onRecordingComplete(existingRecording.id)
      } else {
        const { data, error } = await supabase
          .from('browser_recordings')
          .insert(recordingData)
          .select()
          .single()

        if (error) throw error

        toast.success("✨ Recording saved with AI insights!", {
          description: aiAnalysis?.summary || `${recorderState.actions.length} actions recorded`,
          duration: 5000,
        })
        
        onRecordingComplete(data.id)
      }

      // Reset state
      setRecorderState({
        isRecording: false,
        isPaused: false,
        actions: [],
        startTime: null,
        currentUrl: "",
      })
      setAiAnalysis(null)
      setAnnotatedActions([])
      setShowAIInsights(false)
    } catch (error) {
      console.error("Error saving recording:", error)
      toast.error("Failed to save recording")
    } finally {
      setSaving(false)
    }
  }

  function getActionIcon(type: RecordingAction['type']) {
    switch (type) {
      case 'click': return <MousePointer2 className="h-3 w-3" />
      case 'type': return <Keyboard className="h-3 w-3" />
      case 'navigate': return <Monitor className="h-3 w-3" />
      case 'submit': return <CheckCircle2 className="h-3 w-3" />
      default: return <Circle className="h-3 w-3" />
    }
  }

  function getImportanceBadge(importance?: AnnotatedAction['ai_importance']) {
    if (!importance) return null
    
    const config = {
      critical: { color: 'bg-red-100 text-red-700 border-red-200', label: 'Critical' },
      important: { color: 'bg-orange-100 text-orange-700 border-orange-200', label: 'Important' },
      standard: { color: 'bg-blue-100 text-blue-700 border-blue-200', label: 'Standard' },
    }

    const { color, label } = config[importance]

    return (
      <Badge variant="outline" className={`text-xs ${color}`}>
        {label}
      </Badge>
    )
  }

  function formatDuration(ms: number) {
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  const duration = recorderState.startTime ? Date.now() - recorderState.startTime : 0
  const displayActions = annotatedActions.length > 0 ? annotatedActions : recorderState.actions

  return (
    <div className="space-y-6">
      {/* Extension Status */}
      {!extensionConnected && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold text-amber-900">Extension Required</p>
              <p className="text-sm text-amber-700 mt-1">
                Install the browser extension to start recording.
              </p>
              <Button
                variant="link"
                className="h-auto p-0 text-amber-700 hover:text-amber-900 mt-2"
                onClick={() => window.open('/pages/browserextensions', '_blank')}
              >
                Get Extension →
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* AI Processing Indicator */}
      {aiProcessing && (
        <Card className="border-purple-200 bg-purple-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <Loader2 className="h-5 w-5 text-purple-600 animate-spin mt-1" />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Sparkles className="h-4 w-4 text-purple-600" />
                  <p className="font-semibold text-purple-900">AI is analyzing your recording...</p>
                </div>
                <p className="text-sm text-purple-700">
                  Generating intelligent descriptions, annotations, and test assertions
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recording Setup */}
      {!recorderState.isRecording && (
        <Tabs defaultValue="setup" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="setup">Recording Setup</TabsTrigger>
            <TabsTrigger value="ai-insights" disabled={!aiAnalysis}>
              <Sparkles className="h-3 w-3 mr-1" />
              AI Insights
            </TabsTrigger>
          </TabsList>

          <TabsContent value="setup" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="start-url">Starting URL</Label>
              <Input
                id="start-url"
                type="url"
                placeholder="https://example.com"
                value={startUrl}
                onChange={(e) => setStartUrl(e.target.value)}
                disabled={recorderState.isRecording}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">Recording Title</Label>
              <Input
                id="title"
                placeholder="Enter a title for this recording"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Add notes about this recording (AI can auto-generate this)"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
              {aiAnalysis && !description && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() => setDescription(aiAnalysis.description)}
                >
                  <Wand2 className="h-3 w-3" />
                  Use AI Description
                </Button>
              )}
            </div>

            <Button
              onClick={startRecording}
              disabled={!extensionConnected || !startUrl}
              className="w-full gap-2"
            >
              <Circle className="h-4 w-4" />
              Start Recording
            </Button>
          </TabsContent>

          <TabsContent value="ai-insights" className="space-y-4 mt-4">
            {aiAnalysis && (
              <>
                {/* AI Summary Card */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Sparkles className="h-5 w-5 text-purple-600" />
                      AI Analysis Summary
                    </CardTitle>
                    <CardDescription>{aiAnalysis.summary}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <h4 className="font-semibold text-sm mb-2">User Journey</h4>
                      <p className="text-sm text-muted-foreground">{aiAnalysis.userJourney}</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{aiAnalysis.estimatedComplexity} complexity</Badge>
                      {aiAnalysis.tags.map(tag => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Suggested Assertions */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Target className="h-5 w-5 text-blue-600" />
                      Suggested Assertions
                    </CardTitle>
                    <CardDescription>
                      AI-recommended validation points for this test
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {aiAnalysis.suggestedAssertions.map((assertion, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                          <span>{assertion}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>

                {/* Critical Steps */}
                {aiAnalysis.criticalSteps.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <Zap className="h-5 w-5 text-orange-600" />
                        Critical Steps
                      </CardTitle>
                      <CardDescription>
                        Steps identified as critical to test success
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {aiAnalysis.criticalSteps.map(stepIndex => {
                          const action = displayActions[stepIndex] as AnnotatedAction
                          return (
                            <div key={stepIndex} className="flex items-center gap-2 text-sm p-2 bg-orange-50 rounded">
                              <span className="font-mono text-xs bg-orange-200 px-2 py-1 rounded">
                                Step {stepIndex + 1}
                              </span>
                              <span className="text-orange-900">
                                {action?.ai_annotation || 
                                 generateBasicAnnotation(action)}
                              </span>
                            </div>
                          )
                        })}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </TabsContent>
        </Tabs>
      )}

      {/* Recording Controls */}
      {recorderState.isRecording && (
        <div className="rounded-lg border bg-card p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div className={`h-3 w-3 rounded-full ${recorderState.isPaused ? 'bg-amber-500' : 'bg-red-500 animate-pulse'}`} />
                <span className="font-semibold">
                  {recorderState.isPaused ? 'Paused' : 'Recording'}
                </span>
              </div>
              <Badge variant="outline" className="gap-1">
                <Clock className="h-3 w-3" />
                {formatDuration(duration)}
              </Badge>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {recorderState.isPaused ? (
              <Button
                onClick={resumeRecording}
                size="sm"
                variant="default"
                className="gap-2"
              >
                <Play className="h-4 w-4" />
                Resume
              </Button>
            ) : (
              <Button
                onClick={pauseRecording}
                size="sm"
                variant="secondary"
                className="gap-2"
              >
                <Pause className="h-4 w-4" />
                Pause
              </Button>
            )}

            <Button
              onClick={stopRecording}
              size="sm"
              variant="destructive"
              className="gap-2"
            >
              <Square className="h-4 w-4" />
              Stop & Analyze with AI
            </Button>
          </div>

          <div className="pt-2 border-t">
            <p className="text-sm text-muted-foreground">
              <strong>{recorderState.actions.length}</strong> actions recorded
            </p>
          </div>
        </div>
      )}

      {/* Actions List with AI Annotations */}
      {displayActions.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-sm flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Recorded Actions
              {annotatedActions.length > 0 && (
                <Badge variant="outline" className="gap-1">
                  <Sparkles className="h-3 w-3" />
                  AI Enhanced
                </Badge>
              )}
            </h4>
            <div className="flex items-center gap-2">
              {recorderState.actions.length > 0 && !recorderState.isRecording && (
                <Button
                  onClick={triggerAIAnalysis}
                  disabled={aiProcessing}
                  size="sm"
                  variant="outline"
                  className="gap-2 h-8"
                >
                  {aiProcessing ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Sparkles className="h-3 w-3" />
                  )}
                  Analyze with AI
                </Button>
              )}
              {!recorderState.isRecording && (
                <Button
                  onClick={clearRecording}
                  size="sm"
                  variant="ghost"
                  className="gap-2 h-8"
                >
                  <Trash2 className="h-3 w-3" />
                  Clear
                </Button>
              )}
            </div>
          </div>

          <div className="max-h-[400px] overflow-y-auto space-y-2 rounded-lg border p-3">
            {displayActions.map((action, index) => {
              const annotatedAction = action as AnnotatedAction
              return (
                <div
                  key={index}
                  className={`flex items-start gap-3 text-sm p-3 rounded-lg border ${
                    aiAnalysis?.criticalSteps.includes(index) 
                      ? 'bg-orange-50 border-orange-200' 
                      : 'bg-muted/50'
                  }`}
                >
                  <span className="font-mono text-xs text-muted-foreground min-w-[30px] mt-1">
                    {index + 1}
                  </span>
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        {getActionIcon(action.type)}
                        <Badge variant="outline" className="text-xs">
                          {action.type}
                        </Badge>
                      </div>
                      {getImportanceBadge(annotatedAction.ai_importance)}
                      {aiAnalysis?.criticalSteps.includes(index) && (
                        <Badge variant="outline" className="text-xs bg-orange-100 text-orange-700 border-orange-200">
                          <Zap className="h-2 w-2 mr-1" />
                          Critical
                        </Badge>
                      )}
                    </div>
                    
                    {/* AI Annotation */}
                    {annotatedAction.ai_annotation && (
                      <p className="text-sm font-medium text-purple-900 flex items-start gap-1">
                        <Sparkles className="h-3 w-3 mt-0.5 shrink-0" />
                        {annotatedAction.ai_annotation}
                      </p>
                    )}
                    
                    {/* Original action details */}
                    <p className="text-xs text-muted-foreground truncate">
                      {action.type === 'type' && `Type: "${action.value}"`}
                      {action.type === 'click' && `Click: ${action.metadata.elementText || action.selector}`}
                      {action.type === 'navigate' && `Go to: ${action.url}`}
                      {action.type === 'scroll' && `Scroll to: ${action.metadata.scrollPosition?.y}`}
                      {action.type === 'submit' && `Submit form: ${action.selector}`}
                    </p>
                    
                    {action.selector && (
                      <p className="text-xs text-muted-foreground truncate font-mono">
                        {action.selector}
                      </p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {!recorderState.isRecording && (
            <div className="flex items-center gap-2">
              <Button
                onClick={saveRecording}
                disabled={saving}
                className="flex-1 gap-2"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    {aiAnalysis ? 'Save with AI Insights' : 'Save Recording'}
                  </>
                )}
              </Button>
              {aiAnalysis && (
                <Badge variant="outline" className="gap-1 shrink-0">
                  <Sparkles className="h-3 w-3" />
                  AI Enhanced
                </Badge>
              )}
            </div>
          )}
        </div>
      )}

      {/* AI Error Display */}
      {aiError && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
              <div>
                <p className="font-semibold text-red-900">AI Analysis Error</p>
                <p className="text-sm text-red-700 mt-1">{aiError}</p>
                <p className="text-xs text-red-600 mt-2">
                  You can still save the recording without AI enhancements
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* AI Features Info */}
      {extensionConnected && !recorderState.isRecording && (
        <div className="rounded-lg border bg-gradient-to-r from-purple-50 to-blue-50 p-4">
          <div className="flex items-start gap-3">
            <Sparkles className="h-5 w-5 text-purple-600 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-semibold text-sm text-purple-900 mb-2">
                AI-Powered Recording Analysis
              </h4>
              <ul className="space-y-1 text-xs text-purple-800">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3 w-3" />
                  Auto-generated test descriptions
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3 w-3" />
                  Intelligent action annotations
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3 w-3" />
                  Suggested test assertions
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3 w-3" />
                  Critical step identification
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3 w-3" />
                  User journey mapping
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}