// components/automation/ScriptEditor.tsx
"use client"

import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { 
  Play, 
  Save, 
  Copy, 
  Download, 
  RotateCcw, 
  CheckCircle2, 
  AlertTriangle,
  Code2,
  Loader2
} from "lucide-react"
import { toast } from "sonner"

// Monaco Editor (loaded dynamically)
import dynamic from 'next/dynamic'

const Editor = dynamic(
  () => import('@monaco-editor/react').then((mod) => mod.default),
  { 
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-[600px] border rounded-lg bg-muted">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }
)

interface ValidationError {
  message: string
  line?: number
  severity: 'error' | 'warning' | 'info'
}

interface ScriptEditorProps {
  initialScript: string
  testName: string
  onSave?: (script: string) => Promise<void>
  onRun?: (script: string) => Promise<void>
  readonly?: boolean
  height?: string
}

export function ScriptEditor({
  initialScript,
  testName,
  onSave,
  onRun,
  readonly = false,
  height = "600px"
}: ScriptEditorProps) {
  const [script, setScript] = useState(initialScript)
  const [saving, setSaving] = useState(false)
  const [running, setRunning] = useState(false)
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([])
  const [hasChanges, setHasChanges] = useState(false)
  const editorRef = useRef<any>(null)

  useEffect(() => {
    setScript(initialScript)
    setHasChanges(false)
  }, [initialScript])

  useEffect(() => {
    // Validate script whenever it changes
    validateScript(script)
  }, [script])

  function handleEditorDidMount(editor: any, monaco: any) {
    editorRef.current = editor

    // Configure TypeScript compiler options
    monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
      target: monaco.languages.typescript.ScriptTarget.ESNext,
      allowNonTsExtensions: true,
      moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
      module: monaco.languages.typescript.ModuleKind.CommonJS,
      noEmit: true,
      esModuleInterop: true,
      jsx: monaco.languages.typescript.JsxEmit.React,
      reactNamespace: "React",
      allowJs: true,
      typeRoots: ["node_modules/@types"]
    })

    // Add Playwright type definitions
    monaco.languages.typescript.typescriptDefaults.addExtraLib(
      `
      declare module '@playwright/test' {
        export const test: any;
        export const expect: any;
      }
      `,
      'playwright.d.ts'
    )

    // Keyboard shortcuts
    editor.addAction({
      id: 'save-script',
      label: 'Save Script',
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS],
      run: () => handleSave()
    })

    editor.addAction({
      id: 'run-script',
      label: 'Run Script',
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter],
      run: () => handleRun()
    })
  }

  function handleEditorChange(value: string | undefined) {
    if (value !== undefined && value !== initialScript) {
      setScript(value)
      setHasChanges(true)
    }
  }

  function validateScript(scriptContent: string) {
    const errors: ValidationError[] = []

    // Basic validations
    if (!scriptContent.includes("import { test, expect } from '@playwright/test'")) {
      errors.push({
        message: "Missing Playwright imports",
        severity: 'error'
      })
    }

    if (!scriptContent.includes('test(')) {
      errors.push({
        message: "No test defined",
        severity: 'error'
      })
    }

    if (!scriptContent.includes('async ({ page })')) {
      errors.push({
        message: "Missing page fixture",
        severity: 'error'
      })
    }

    // Check for TODO comments
    const todoMatches = scriptContent.match(/\/\/ TODO:/g)
    if (todoMatches && todoMatches.length > 0) {
      errors.push({
        message: `${todoMatches.length} TODO item(s) need attention`,
        severity: 'warning'
      })
    }

    // Check for common issues
    if (scriptContent.includes('page.goto') && !scriptContent.includes('await page.goto')) {
      errors.push({
        message: "Missing 'await' before page.goto()",
        severity: 'error'
      })
    }

    setValidationErrors(errors)
  }

  async function handleSave() {
    if (!onSave || readonly) return

    setSaving(true)
    try {
      await onSave(script)
      setHasChanges(false)
      toast.success('Script saved successfully')
    } catch (error) {
      toast.error('Failed to save script')
      console.error(error)
    } finally {
      setSaving(false)
    }
  }

  async function handleRun() {
    if (!onRun) {
      toast.error('Run functionality not configured')
      return
    }

    if (validationErrors.some(e => e.severity === 'error')) {
      toast.error('Fix validation errors before running')
      return
    }

    setRunning(true)
    try {
      await onRun(script)
      toast.success('Test execution started')
    } catch (error) {
      toast.error('Failed to run script')
      console.error(error)
    } finally {
      setRunning(false)
    }
  }

  function handleCopy() {
    navigator.clipboard.writeText(script)
    toast.success('Script copied to clipboard')
  }

  function handleDownload() {
    const blob = new Blob([script], { type: 'text/typescript' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${testName.toLowerCase().replace(/\s+/g, '-')}.spec.ts`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    toast.success('Script downloaded')
  }

  function handleReset() {
    if (confirm('Reset to original script? All changes will be lost.')) {
      setScript(initialScript)
      setHasChanges(false)
      toast.info('Script reset to original')
    }
  }

  const errorCount = validationErrors.filter(e => e.severity === 'error').length
  const warningCount = validationErrors.filter(e => e.severity === 'warning').length

  return (
    <div className="space-y-4">
      {/* Toolbar - Split into 2 rows for better layout */}
      <div className="flex flex-col gap-2 p-3 bg-muted/50 rounded-lg border">
        {/* Row 1: Title and Validation Status */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <Code2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <span className="text-sm font-medium truncate">{testName}</span>
            {hasChanges && (
              <Badge variant="secondary" className="text-xs flex-shrink-0">
                Unsaved
              </Badge>
            )}
          </div>

          {/* Validation Status Badge */}
          <div className="flex-shrink-0">
            {errorCount > 0 ? (
              <Badge variant="destructive" className="gap-1 text-xs">
                <AlertTriangle className="h-3 w-3" />
                {errorCount}
              </Badge>
            ) : warningCount > 0 ? (
              <Badge variant="secondary" className="gap-1 bg-amber-100 text-amber-800 text-xs">
                <AlertTriangle className="h-3 w-3" />
                {warningCount}
              </Badge>
            ) : (
              <Badge variant="secondary" className="gap-1 bg-green-100 text-green-800 text-xs">
                <CheckCircle2 className="h-3 w-3" />
                Valid
              </Badge>
            )}
          </div>
        </div>

        {/* Row 2: Action Buttons */}
        <div className="flex items-center justify-end gap-1 flex-wrap">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopy}
            title="Copy to clipboard"
            className="h-8 px-2"
          >
            <Copy className="h-4 w-4" />
            <span className="ml-1 hidden sm:inline">Copy</span>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleDownload}
            title="Download script"
            className="h-8 px-2"
          >
            <Download className="h-4 w-4" />
            <span className="ml-1 hidden sm:inline">Download</span>
          </Button>

          {!readonly && hasChanges && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleReset}
              title="Reset changes"
              className="h-8 px-2"
            >
              <RotateCcw className="h-4 w-4" />
              <span className="ml-1 hidden sm:inline">Reset</span>
            </Button>
          )}

          {!readonly && onSave && (
            <Button
              variant="default"
              size="sm"
              onClick={handleSave}
              disabled={saving || !hasChanges}
              title="Save script (Ctrl+S)"
              className="h-8"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              <span className="ml-2">Save</span>
            </Button>
          )}

          {onRun && (
            <Button
              variant="secondary"
              size="sm"
              onClick={handleRun}
              disabled={running || errorCount > 0}
              title="Run test (Ctrl+Enter)"
              className="h-8"
            >
              {running ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              <span className="ml-2">Run</span>
            </Button>
          )}
        </div>
      </div>

      {/* Validation Errors */}
      {validationErrors.length > 0 && (
        <div className="space-y-2">
          {validationErrors.map((error, index) => (
            <Alert
              key={index}
              variant={error.severity === 'error' ? 'destructive' : 'default'}
              className={
                error.severity === 'warning'
                  ? 'border-amber-200 bg-amber-50'
                  : error.severity === 'info'
                  ? 'border-blue-200 bg-blue-50'
                  : ''
              }
            >
              {error.severity === 'error' ? (
                <AlertTriangle className="h-4 w-4" />
              ) : error.severity === 'warning' ? (
                <AlertTriangle className="h-4 w-4 text-amber-600" />
              ) : (
                <CheckCircle2 className="h-4 w-4 text-blue-600" />
              )}
              <AlertDescription>
                {error.line && <span className="font-medium">Line {error.line}: </span>}
                {error.message}
              </AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      {/* Monaco Editor */}
      <div className="border rounded-lg overflow-hidden">
        <Editor
          height={height}
          defaultLanguage="typescript"
          value={script}
          onChange={handleEditorChange}
          onMount={handleEditorDidMount}
          theme="vs-dark"
          options={{
            readOnly: readonly,
            minimap: { enabled: false },
            fontSize: 14,
            lineNumbers: 'on',
            roundedSelection: false,
            scrollBeyondLastLine: false,
            automaticLayout: true,
            tabSize: 2,
            formatOnPaste: true,
            formatOnType: true,
            folding: true,
            renderLineHighlight: 'all',
            scrollbar: {
              vertical: 'visible',
              horizontal: 'visible',
              verticalScrollbarSize: 10,
              horizontalScrollbarSize: 10
            },
            suggestOnTriggerCharacters: true,
            acceptSuggestionOnEnter: 'on',
            quickSuggestions: true,
            wordWrap: 'off',
            wrappingIndent: 'indent'
          }}
        />
      </div>

      {/* Footer Info */}
      <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
        <div>
          {script.split('\n').length} lines • {script.length} characters
        </div>
        <div className="hidden sm:block">
          <kbd className="px-1 py-0.5 bg-muted rounded border text-xs">Ctrl+S</kbd> Save •{' '}
          <kbd className="px-1 py-0.5 bg-muted rounded border text-xs">Ctrl+Enter</kbd> Run
        </div>
      </div>
    </div>
  )
}