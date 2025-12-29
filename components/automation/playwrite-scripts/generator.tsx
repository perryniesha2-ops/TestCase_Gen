"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Card, CardContent } from "@/components/ui/card"
import { 
  Loader2, 
  Code2, 
  Copy, 
  Check, 
  Download,
  Sparkles,
  Plus,
  Trash2,
  AlertCircle
} from "lucide-react"
import { toast } from "sonner"

interface TestStep {
  step_number: number
  action: string
  expected: string
}

interface TestData {
  key: string
  value: string
  description?: string
}

interface ScriptGeneratorProps {
  testCase: {
    id: string
    title: string
    description: string
    test_steps: TestStep[]
  }
  open: boolean
  onOpenChange: (open: boolean) => void
  onScriptGenerated?: (scriptId: string) => void
}

export function ScriptGenerator({
  testCase,
  open,
  onOpenChange,
  onScriptGenerated
}: ScriptGeneratorProps) {
  const [appUrl, setAppUrl] = useState("https://www.synthqa.app/")
  const [testData, setTestData] = useState<TestData[]>([
    { key: "email", value: "", description: "Test user email" },
    { key: "password", value: "", description: "Test user password" }
  ])
  const [generating, setGenerating] = useState(false)
  const [generatedScript, setGeneratedScript] = useState("")
  const [copied, setCopied] = useState(false)

  // Auto-detect potential test data fields from test steps
  function detectTestDataFields(): string[] {
    const fields: string[] = []
    const text = testCase.test_steps.map(s => `${s.action} ${s.expected}`).join(' ').toLowerCase()
    
    if (text.includes('email')) fields.push('email')
    if (text.includes('password')) fields.push('password')
    if (text.includes('username') || text.includes('user name')) fields.push('username')
    if (text.includes('name')) fields.push('name')
    if (text.includes('phone')) fields.push('phone')
    if (text.includes('address')) fields.push('address')
    
    return [...new Set(fields)] // Remove duplicates
  }

  function addTestDataField() {
    setTestData([...testData, { key: "", value: "", description: "" }])
  }

  function removeTestDataField(index: number) {
    setTestData(testData.filter((_, i) => i !== index))
  }

  function updateTestDataField(index: number, field: keyof TestData, value: string) {
    setTestData(testData.map((item, i) => 
      i === index ? { ...item, [field]: value } : item
    ))
  }

  async function generateScript() {
    setGenerating(true)
    try {
      // Prepare test data object
      const testDataObj: Record<string, string> = {}
      testData.forEach(item => {
        if (item.key && item.value) {
          testDataObj[item.key] = item.value
        }
      })

      const response = await fetch('/api/generate-script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          testCaseId: testCase.id,
          appUrl: appUrl,
          testData: testDataObj,
          testSteps: testCase.test_steps
        })
      })

      const data = await response.json()
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to generate script')
      }

      setGeneratedScript(data.script)
      toast.success('Script generated successfully!')
      
      if (onScriptGenerated && data.scriptId) {
        onScriptGenerated(data.scriptId)
      }
    } catch (error) {
      console.error('Error generating script:', error)
      toast.error('Failed to generate script')
    } finally {
      setGenerating(false)
    }
  }

  async function copyToClipboard() {
    await navigator.clipboard.writeText(generatedScript)
    setCopied(true)
    toast.success('Copied to clipboard!')
    setTimeout(() => setCopied(false), 2000)
  }

  function downloadScript() {
    const blob = new Blob([generatedScript], { type: 'text/typescript' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${testCase.title.toLowerCase().replace(/\s+/g, '-')}.spec.ts`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    toast.success('Script downloaded!')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0 flex flex-col">
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-600" />
            Generate Automation Script
          </DialogTitle>
          <DialogDescription>
            AI-powered Playwright test for: <strong>{testCase.title}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6">
          {!generatedScript ? (
            // Configuration Phase
            <div className="space-y-6 pb-6">
              {/* Application URL */}
              <div className="space-y-2">
                <Label htmlFor="app-url">Application URL</Label>
                <Input
                  id="app-url"
                  value={appUrl}
                  onChange={(e) => setAppUrl(e.target.value)}
                  placeholder="https://your-app.com"
                />
                <p className="text-xs text-muted-foreground">
                  Provide your app URL to avoid placeholder URLs in the script
                </p>
              </div>

              <Separator />

              {/* Test Data Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base">Test Data</Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      Define variables to use in your test (e.g., login credentials, test inputs)
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addTestDataField}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Field
                  </Button>
                </div>

                {testData.length === 0 && (
                  <Card className="border-dashed">
                    <CardContent className="flex flex-col items-center justify-center py-8 text-center">
                      <AlertCircle className="h-8 w-8 text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground">
                        No test data fields defined. Add fields to inject real values into your test.
                      </p>
                    </CardContent>
                  </Card>
                )}

                <div className="space-y-3">
                  {testData.map((item, index) => (
                    <Card key={index}>
                      <CardContent className="pt-4">
                        <div className="grid grid-cols-12 gap-3 items-start">
                          <div className="col-span-3">
                            <Label className="text-xs">Variable Name</Label>
                            <Input
                              value={item.key}
                              onChange={(e) => updateTestDataField(index, 'key', e.target.value)}
                              placeholder="e.g., email"
                              className="mt-1"
                            />
                          </div>
                          <div className="col-span-4">
                            <Label className="text-xs">Value</Label>
                            <Input
                              value={item.value}
                              onChange={(e) => updateTestDataField(index, 'value', e.target.value)}
                              placeholder="e.g., test@example.com"
                              type={item.key === 'password' ? 'password' : 'text'}
                              className="mt-1"
                            />
                          </div>
                          <div className="col-span-4">
                            <Label className="text-xs">Description (Optional)</Label>
                            <Input
                              value={item.description || ''}
                              onChange={(e) => updateTestDataField(index, 'description', e.target.value)}
                              placeholder="e.g., Test user email"
                              className="mt-1"
                            />
                          </div>
                          <div className="col-span-1 flex items-end">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => removeTestDataField(index)}
                              className="h-9"
                            >
                              <Trash2 className="h-4 w-4 text-muted-foreground" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Helper Text */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-xs text-blue-900">
                    <strong>💡 Tip:</strong> Test data will be injected into your test steps where appropriate. 
                    For example, if you have "Login with email" step and define an "email" variable, 
                    it will automatically use that value.
                  </p>
                </div>
              </div>

              <Separator />

              {/* Test Steps Preview */}
              <div className="space-y-2">
                <Label className="text-base">Test Steps ({testCase.test_steps.length})</Label>
                <ScrollArea className="h-[200px] border rounded-lg p-4">
                  <div className="space-y-2">
                    {testCase.test_steps.map((step) => (
                      <div key={step.step_number} className="flex gap-3 text-sm">
                        <Badge variant="outline" className="shrink-0">
                          {step.step_number}
                        </Badge>
                        <div className="space-y-1">
                          <p className="font-medium">{step.action}</p>
                          <p className="text-xs text-muted-foreground">
                            Expected: {step.expected}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            </div>
          ) : (
            // Generated Script Phase
            <div className="space-y-4 pb-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="gap-1">
                    <Code2 className="h-3 w-3" />
                    Playwright TypeScript
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    {generatedScript.split('\n').length} lines
                  </span>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={copyToClipboard}
                    className="gap-2"
                  >
                    {copied ? (
                      <>
                        <Check className="h-4 w-4" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4" />
                        Copy
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={downloadScript}
                    className="gap-2"
                  >
                    <Download className="h-4 w-4" />
                    Download
                  </Button>
                </div>
              </div>

              <ScrollArea className="h-[500px] border rounded-lg">
                <pre className="p-4 text-xs font-mono">
                  <code>{generatedScript}</code>
                </pre>
              </ScrollArea>

              <Button
                variant="outline"
                onClick={() => setGeneratedScript("")}
                className="w-full"
              >
                Generate New Script
              </Button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t px-6 py-4 flex justify-between">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            {generatedScript ? 'Close' : 'Cancel'}
          </Button>
          
          {!generatedScript && (
            <Button
              onClick={generateScript}
              disabled={generating || !appUrl}
              className="gap-2"
            >
              {generating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Generate Script
                </>
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}