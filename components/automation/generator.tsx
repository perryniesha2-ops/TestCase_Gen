"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Code2,
  Loader2,
  Sparkles,
  CheckCircle2,
  Copy,
  Download,
  AlertTriangle,
  RotateCcw,
  Info,
} from "lucide-react"

interface TestCase {
  id: string
  title: string
  description: string
  test_steps: Array<{
    step_number: number
    action: string
    expected: string
  }>
}

interface ScriptGeneratorProps {
  testCase: TestCase
  open: boolean
  onOpenChange: (open: boolean) => void
  onScriptGenerated: (scriptId: string) => void
}

interface MissingInfo {
  field: string
  label: string
  description: string
  placeholder?: string
  type?: string
  required?: boolean
}

interface GeneratedScript {
  id: string
  script_content: string
  status: string
  framework: string
  created_at: string
}

interface GenerationMetadata {
  todoCount: number
  hasCriticalTodos: boolean
  missingInfo: MissingInfo[]
  needsReview?: boolean
  isExisting?: boolean
}

export function ScriptGenerator({
  testCase,
  open,
  onOpenChange,
  onScriptGenerated,
}: ScriptGeneratorProps) {
  const [generating, setGenerating] = useState(false)
  const [generatedScript, setGeneratedScript] = useState<GeneratedScript | null>(null)
  const [metadata, setMetadata] = useState<GenerationMetadata | null>(null)
  const [applicationUrl, setApplicationUrl] = useState("")
  const [testData, setTestData] = useState<Record<string, string>>({})
  const [showMissingInfo, setShowMissingInfo] = useState(false)

  useEffect(() => {
    if (open) {
      checkExistingScript()
    } else {
      // Reset state when closed
      setGeneratedScript(null)
      setMetadata(null)
      setApplicationUrl("")
      setTestData({})
      setShowMissingInfo(false)
    }
  }, [open, testCase.id])

  async function checkExistingScript() {
    try {
      const response = await fetch(`/api/automation-scripts?testCaseId=${testCase.id}`)
      
      if (response.ok) {
        const data = await response.json()
        if (data.script) {
          setGeneratedScript(data.script)
          // Analyze existing script
          const todoCount = (data.script.script_content.match(/\/\/ TODO:/g) || []).length
          setMetadata({
            todoCount,
            hasCriticalTodos: data.script.script_content.includes('TODO: Update selector'),
            missingInfo: [],
            isExisting: true,
          })
          toast.info("Loaded existing automation script")
        }
      }
    } catch (error) {
      console.error("Error checking existing script:", error)
    }
  }

  async function generateScript(forceRegenerate = false) {
    setGenerating(true)
    try {
      const response = await fetch("/api/generate-script", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          testCaseId: testCase.id,
          applicationUrl: applicationUrl || undefined,
          testData: Object.keys(testData).length > 0 ? testData : undefined,
          forceRegenerate,
        }),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to generate script")
      }

      setGeneratedScript(data.script)
      setMetadata(data.metadata)

      if (data.metadata.isExisting && !forceRegenerate) {
        toast.info("Using existing script", {
          description: "Click 'Regenerate' to create a new version"
        })
      } else if (data.metadata.hasCriticalTodos) {
        toast.warning("Script needs review", {
          description: `${data.metadata.todoCount} TODO items found`
        })
      } else {
        toast.success("Script generated successfully!")
      }

      if (data.metadata.missingInfo?.length > 0) {
        setShowMissingInfo(true)
      }
    } catch (error) {
      console.error("Error generating script:", error)
      toast.error(error instanceof Error ? error.message : "Failed to generate script")
    } finally {
      setGenerating(false)
    }
  }

  function handleMissingInfoUpdate(field: string, value: string) {
    setTestData(prev => ({ ...prev, [field]: value }))
  }

  function copyToClipboard() {
    if (!generatedScript) return
    navigator.clipboard.writeText(generatedScript.script_content)
    toast.success("Copied to clipboard!")
  }

  function downloadScript() {
    if (!generatedScript) return
    const blob = new Blob([generatedScript.script_content], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${testCase.title.replace(/\s+/g, "-").toLowerCase()}.spec.ts`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    toast.success("Script downloaded!")
  }

  function handleComplete() {
    if (!generatedScript) return
    onScriptGenerated(generatedScript.id)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-500" />
            Generate Automation Script
          </DialogTitle>
          <DialogDescription>
            AI-powered Playwright test for: <strong>{testCase.title}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {/* Configuration Section */}
          {!generatedScript && (
            <div className="space-y-4">
              <div>
                <Label>Application URL (Optional)</Label>
                <Input
                  placeholder="https://app.yourcompany.com"
                  value={applicationUrl}
                  onChange={(e) => setApplicationUrl(e.target.value)}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Provide your app URL to avoid placeholder URLs in the script
                </p>
              </div>

              <div>
                <Label>Test Data (Optional)</Label>
                <div className="space-y-2">
                  <Input
                    placeholder="Test Email"
                    value={testData.testEmail || ""}
                    onChange={(e) => handleMissingInfoUpdate("testEmail", e.target.value)}
                  />
                  <Input
                    type="password"
                    placeholder="Test Password"
                    value={testData.testPassword || ""}
                    onChange={(e) => handleMissingInfoUpdate("testPassword", e.target.value)}
                  />
                </div>
              </div>

              <Button
                onClick={() => generateScript(false)}
                disabled={generating}
                className="w-full gap-2"
                size="lg"
              >
                {generating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Generating with Claude...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Generate Script
                  </>
                )}
              </Button>
            </div>
          )}

          {/* Generated Script Section */}
          {generatedScript && (
            <div className="space-y-4">
              {/* Status Banner */}
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="secondary">
                  {generatedScript.framework}
                </Badge>
                {metadata?.isExisting && (
                  <Badge variant="outline" className="gap-1">
                    <Info className="h-3 w-3" />
                    Existing Script
                  </Badge>
                )}
                {metadata && metadata.todoCount > 0 && (
                  <Badge variant="secondary" className="gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    {metadata.todoCount} TODO{metadata.todoCount !== 1 ? 's' : ''}
                  </Badge>
                )}
                {metadata?.hasCriticalTodos && (
                  <Badge variant="destructive">Needs Review</Badge>
                )}
              </div>

              {/* Missing Info Alert */}
              {showMissingInfo && metadata && metadata.missingInfo.length > 0 && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-2">
                      <p className="font-semibold">Missing Information Detected</p>
                      {metadata.missingInfo.map((info) => (
                        <div key={info.field}>
                          <Label>{info.label}</Label>
                          <Input
                            type={info.type || "text"}
                            placeholder={info.placeholder}
                            value={testData[info.field] || ""}
                            onChange={(e) => handleMissingInfoUpdate(info.field, e.target.value)}
                          />
                          <p className="text-xs text-muted-foreground">{info.description}</p>
                        </div>
                      ))}
                      <Button
                        size="sm"
                        onClick={() => {
                          setShowMissingInfo(false)
                          generateScript(true)
                        }}
                      >
                        Regenerate with Info
                      </Button>
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={copyToClipboard}>
                  <Copy className="h-4 w-4 mr-2" />
                  Copy
                </Button>
                <Button variant="outline" size="sm" onClick={downloadScript}>
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => generateScript(true)}
                  disabled={generating}
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Regenerate
                </Button>
              </div>

              {/* Script Preview */}
              <div className="space-y-2">
                <Label>Generated Script</Label>
                <ScrollArea className="h-[400px] border rounded-lg bg-slate-950 text-slate-50">
                  <pre className="p-4 text-sm font-mono">
                    <code>{generatedScript.script_content}</code>
                  </pre>
                </ScrollArea>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="px-6 py-4 border-t bg-slate-50">
          <div className="flex items-center justify-between w-full">
            <div className="text-sm text-muted-foreground">
              {generatedScript && (
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  Script ready
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              {generatedScript && (
                <Button onClick={handleComplete}>
                  <Code2 className="h-4 w-4 mr-2" />
                  Done
                </Button>
              )}
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}