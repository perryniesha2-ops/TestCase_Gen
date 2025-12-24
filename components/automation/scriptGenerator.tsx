// components/automation/ScriptGenerator.tsx
"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Loader2, Sparkles, Code2, AlertTriangle, CheckCircle2, Wand2, Eye, Maximize2, Copy, Download } from "lucide-react"
import { toast } from "sonner"
import { ScriptViewerDialog } from './ScriptViewerDialog'
import type { TestStep } from "@/lib/automation/script-templates"

interface TestCase {
  id: string
  title: string
  description?: string
  test_type?: string
  test_steps: Array<{
    step_number: number
    action: string
    expected: string
    data?: string
  }>
}

interface ScriptGeneratorProps {
  testCase: TestCase
  open: boolean
  onOpenChange: (open: boolean) => void
  onScriptGenerated?: (scriptId: string, script: string) => void
}

interface GenerationProgress {
  stage: 'idle' | 'parsing' | 'generating' | 'validating' | 'complete' | 'error'
  message: string
}

export function ScriptGenerator({
  testCase,
  open,
  onOpenChange,
  onScriptGenerated
}: ScriptGeneratorProps) {
  const [loading, setLoading] = useState(false)
  const [generatedScript, setGeneratedScript] = useState<string>('')
  const [scriptId, setScriptId] = useState<string>('')
  const [baseUrl, setBaseUrl] = useState('')
  const [timeout, setTimeout] = useState('30000')
  const [framework, setFramework] = useState<'playwright' | 'cypress' | 'selenium'>('playwright')
  const [progress, setProgress] = useState<GenerationProgress>({
    stage: 'idle',
    message: 'Ready to generate'
  })
  const [showFullScreen, setShowFullScreen] = useState(false)
  const [validation, setValidation] = useState<{
    valid: boolean
    errors: string[]
  }>({ valid: false, errors: [] })
  const [currentTab, setCurrentTab] = useState<'config' | 'preview'>('config')

  // Auto-detect base URL from test steps
  useEffect(() => {
    if (testCase.test_steps && testCase.test_steps.length > 0) {
      const firstStep = testCase.test_steps[0]
      const urlMatch = firstStep.action.match(/(?:navigate|go to|visit|open)\s+(?:to\s+)?['"]?([^'"]+)['"]?/i)
      if (urlMatch && urlMatch[1].startsWith('http')) {
        setBaseUrl(urlMatch[1])
      }
    }
  }, [testCase])

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setCurrentTab('config')
      setProgress({ stage: 'idle', message: 'Ready to generate' })
      setGeneratedScript('')
      setScriptId('')
    }
  }, [open])

  async function handleGenerate() {
    setLoading(true)
    setProgress({ stage: 'parsing', message: 'Parsing test steps...' })

    try {
      // Validate test steps
      if (!testCase.test_steps || testCase.test_steps.length === 0) {
        throw new Error('No test steps found. Add test steps to generate automation script.')
      }

      setProgress({ stage: 'generating', message: 'Generating Playwright script with AI...' })

      const response = await fetch('/api/generate-script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          testCaseId: testCase.id,
          testName: testCase.title,
          testSteps: testCase.test_steps.map(step => ({
            step_number: step.step_number,
            action: step.action,
            expected: step.expected,
            data: step.data
          })),
          baseUrl: baseUrl || undefined,
          framework,
          timeout: parseInt(timeout, 10)
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || 'Failed to generate script')
      }

      setProgress({ stage: 'validating', message: 'Validating generated script...' })

      // Handle response data safely
      const script = data.script || ''
      const responseScriptId = data.scriptId || ''
      const responseValidation = data.validation || { valid: false, errors: [] }
      const metadata = data.metadata || {}

      setGeneratedScript(script)
      setScriptId(responseScriptId)
      setValidation(responseValidation)

      const stepCount = metadata.stepCount || testCase.test_steps.length

      setProgress({ 
        stage: 'complete', 
        message: `Script generated successfully (${stepCount} steps)` 
      })

      // Switch to preview tab
      setCurrentTab('preview')

      toast.success('Automation script generated!', {
        description: `${stepCount} test steps converted to Playwright code`
      })

    } catch (error) {
      console.error('Script generation error:', error)
      setProgress({ 
        stage: 'error', 
        message: error instanceof Error ? error.message : 'Generation failed' 
      })
      toast.error('Failed to generate script', {
        description: error instanceof Error ? error.message : 'Unknown error'
      })
    } finally {
      setLoading(false)
    }
  }

  async function handleSaveScript(script: string) {
    try {
      const response = await fetch('/api/generate-script', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scriptId,
          scriptContent: script,
          status: 'ready'
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to save script')
      }

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || 'Failed to save script')
      }

      setGeneratedScript(data.script?.script_content || script)
      setValidation(data.validation || { valid: true, errors: [] })

      toast.success('Script saved successfully')
    } catch (error) {
      console.error('Save error:', error)
      throw error
    }
  }

  function handleComplete() {
    if (onScriptGenerated && scriptId) {
      onScriptGenerated(scriptId, generatedScript)
    }
    onOpenChange(false)
  }

  function handleClose() {
    if (generatedScript && !confirm('Close without saving? Generated script will be lost.')) {
      return
    }
    onOpenChange(false)
  }

  const hasErrors = validation.errors.filter(e => !e.includes('TODO')).length > 0
  const hasWarnings = validation.errors.filter(e => e.includes('TODO')).length > 0

  function handleCopy() {
    navigator.clipboard.writeText(generatedScript)
    toast.success('Script copied to clipboard')
  }

  function handleDownload() {
    const blob = new Blob([generatedScript], { type: 'text/typescript' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${testCase.title.toLowerCase().replace(/\s+/g, '-')}.spec.ts`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    toast.success('Script downloaded')
  }

  return (
    <>
      {/* Main Generator Dialog */}
      <Dialog open={open} onOpenChange={handleClose}>
  <DialogContent
    className="
      w-[calc(100vw-2rem)]
      sm:w-[calc(100vw-3rem)]
      md:w-[calc(100vw-4rem)]
      max-w-5xl
      lg:max-w-6xl
      h-[85vh]
      max-h-[90vh]
      p-0
      overflow-hidden
    "
    onInteractOutside={(e) => e.preventDefault()}
  >
    {/* 3-row layout: header / scrollable body / footer */}
      {/* Header padding + alignment */}
      <div className="border-b bg-background px-6 py-5">
        <DialogHeader className="space-y-1">
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="h-5 w-5" />
            Generate Automation Script
          </DialogTitle>
          <DialogDescription>
            Convert test steps into executable Playwright automation code
          </DialogDescription>
        </DialogHeader>
      </div>

      {/* Body: this is the ONLY scrolling region */}
      <div className="min-h-0 overflow-y-auto px-6 py-5">
        <Tabs
          value={currentTab}
          onValueChange={(v) => setCurrentTab(v as any)}
          className="space-y-4"
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="config" className="gap-2">
              <Code2 className="h-4 w-4" />
              Configuration
            </TabsTrigger>

            <TabsTrigger value="preview" disabled={!generatedScript} className="gap-2">
              <Eye className="h-4 w-4" />
              Script Preview
              {generatedScript && (
                <Badge variant="secondary" className="ml-2">
                  {testCase.test_steps?.length || 0} steps
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

            {/* Configuration Tab */}
            <TabsContent value="config" className="space-y-4 mt-4">
              {/* Test Case Info */}
              <Alert>
                <AlertTitle className="font-medium">Test Case: {testCase.title}</AlertTitle>
                <AlertDescription className="text-sm mt-2">
                  {testCase.description || 'No description provided'}
                  <div className="mt-2 flex items-center gap-2">
                    <Badge variant="outline">{testCase.test_steps?.length || 0} steps</Badge>
                    {testCase.test_type && (
                      <Badge variant="secondary">{testCase.test_type}</Badge>
                    )}
                  </div>
                </AlertDescription>
              </Alert>

              {/* Configuration Form */}
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="framework">Testing Framework</Label>
                  <Select value={framework} onValueChange={(v: any) => setFramework(v)}>
                    <SelectTrigger id="framework">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="playwright">
                        Playwright (Recommended)
                      </SelectItem>
                      <SelectItem value="cypress" disabled>
                        Cypress (Coming Soon)
                      </SelectItem>
                      <SelectItem value="selenium" disabled>
                        Selenium (Coming Soon)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="baseUrl">Base URL (Optional)</Label>
                  <Input
                    id="baseUrl"
                    placeholder="https://example.com"
                    value={baseUrl}
                    onChange={(e) => setBaseUrl(e.target.value)}
                    disabled={loading}
                  />
                  <p className="text-xs text-muted-foreground">
                    The URL will be automatically extracted from test steps if available
                  </p>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="timeout">Test Timeout (ms)</Label>
                  <Select value={timeout} onValueChange={setTimeout}>
                    <SelectTrigger id="timeout">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10000">10 seconds</SelectItem>
                      <SelectItem value="30000">30 seconds (Default)</SelectItem>
                      <SelectItem value="60000">60 seconds</SelectItem>
                      <SelectItem value="120000">2 minutes</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Progress */}
              {loading && (
                <Alert>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <AlertTitle>Generating Script</AlertTitle>
                  <AlertDescription>
                    {progress.message}
                    <div className="mt-2 flex items-center gap-2">
                      {['parsing', 'generating', 'validating', 'complete'].map((stage, idx) => (
                        <div
                          key={stage}
                          className={`h-2 flex-1 rounded ${
                            progress.stage === stage
                              ? 'bg-primary animate-pulse'
                              : ['parsing', 'generating', 'validating'].indexOf(progress.stage) > idx
                              ? 'bg-primary'
                              : 'bg-muted'
                          }`}
                        />
                      ))}
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              {/* Error State */}
              {progress.stage === 'error' && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Generation Failed</AlertTitle>
                  <AlertDescription>{progress.message}</AlertDescription>
                </Alert>
              )}

              {/* Generate Button */}
             <div className="flex justify-end gap-3 pt-2">
  <Button
    variant="outline"
    onClick={handleClose}
    disabled={loading}
  >
    Cancel
  </Button>

  <Button
    onClick={handleGenerate}
    disabled={loading || testCase.test_steps?.length === 0}
    size="default"
    className="gap-2"
  >
    {loading ? (
      <>
        <Loader2 className="h-4 w-4 animate-spin" />
        Generating…
      </>
    ) : (
      <>
        <Sparkles className="h-4 w-4" />
        Generate Script
      </>
    )}
  </Button>
</div>

            </TabsContent>

            {/* Preview Tab */}
            <TabsContent value="preview" className="space-y-4 mt-4">
              {generatedScript && (
                <div className="space-y-4">
                  {/* Compact Validation Status */}
                  <div className="flex items-center justify-between">
                    {hasErrors ? (
                      <Badge variant="destructive" className="gap-1">
                        <AlertTriangle className="h-4 w-4" />
                        Script has {validation.errors.length} errors
                      </Badge>
                    ) : hasWarnings ? (
                      <Badge variant="secondary" className="gap-1 bg-amber-100 text-amber-800">
                        <AlertTriangle className="h-4 w-4" />
                        {validation.errors.length} warnings - Review needed
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="gap-1 bg-green-100 text-green-800">
                        <CheckCircle2 className="h-4 w-4" />
                        Script is ready ({testCase.test_steps?.length || 0} steps)
                      </Badge>
                    )}

                    {/* Open Full Screen Button */}
                    <Button
                      variant="outline"
                      onClick={() => setShowFullScreen(true)}
                      className="gap-2"
                    >
                      <Maximize2 className="h-4 w-4" />
                      Open Full Screen
                    </Button>
                  </div>

                  {/* Compact Preview */}
                  <div className="border rounded-lg overflow-hidden">
                    <div className="bg-muted px-4 py-2 border-b">
                      <p className="text-sm text-muted-foreground">
                        Script Preview - Click "Open Full Screen" to view/edit entire script
                      </p>
                    </div>
                    <div className="p-4 bg-slate-950 text-green-400 font-mono text-xs max-h-[200px] overflow-auto">
                      <pre>{generatedScript.substring(0, 500)}...</pre>
                    </div>
                  </div>

                  {/* Quick Actions */}
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={handleCopy} className="gap-2">
                      <Copy className="h-4 w-4" />
                      Copy Script
                    </Button>
                    <Button variant="outline" onClick={handleDownload} className="gap-2">
                      <Download className="h-4 w-4" />
                      Download
                    </Button>
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>

            <div className="border-t bg-background px-6 py-4">
        <div className="flex items-center justify-end gap-2">
        
          {generatedScript && (
            <Button onClick={handleComplete} disabled={hasErrors}>
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Complete
            </Button>
          )}
        </div>
      </div>
    </div>
  </DialogContent>
</Dialog>

      {/* Full-Screen Script Viewer - Separate Dialog */}
      {showFullScreen && generatedScript && (
        <ScriptViewerDialog
          open={showFullScreen}
          onOpenChange={setShowFullScreen}
          script={{
            id: scriptId || 'preview',
            script_name: testCase.title,
            script_content: generatedScript,
            framework: framework,
            status: validation.valid ? 'ready' : 'draft',
            updated_at: new Date().toISOString()
          }}
          onSave={async (content) => {
            await handleSaveScript(content)
            setGeneratedScript(content)
          }}
        />
      )}
    </>
  )
}