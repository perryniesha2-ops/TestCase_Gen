// components/automation/ScriptViewerDialog.tsx
"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  X, 
  Copy, 
  Download, 
  Save, 
  AlertTriangle, 
  Loader2,
  Code2,
  CheckCircle2,
  Play,
} from "lucide-react"
import { toast } from "sonner"
import dynamic from 'next/dynamic'

const Editor = dynamic(
  () => import('@monaco-editor/react').then((mod) => mod.default),
  { 
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-full bg-[#1e1e1e]">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }
)

interface ScriptViewerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  script: {
    id: string
    script_name: string
    script_content: string
    framework: string
    status: string
    updated_at: string
  }
  onSave?: (content: string) => Promise<void>
  readonly?: boolean
}

export function ScriptViewerDialog({
  open,
  onOpenChange,
  script,
  onSave,
  readonly = false
}: ScriptViewerDialogProps) {
  const [content, setContent] = useState(script.script_content)
  const [saving, setSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)

  // Count TODO items and errors
  const todoCount = (content.match(/\/\/ TODO:/g) || []).length
  const hasImports = content.includes("import { test, expect } from '@playwright/test'")
  const hasTest = content.includes('test(')
  const errorCount = (!hasImports || !hasTest) ? 1 : 0

  const [isFullscreen, setIsFullscreen] = useState(false)

  const [executing, setExecuting] = useState(false)

  async function handleSave() {
    if (!onSave || readonly) return
    
    setSaving(true)
    try {
      await onSave(content)
      setHasChanges(false)
      toast.success("Script saved successfully")
    } catch (error) {
      toast.error("Failed to save script")
      console.error(error)
    } finally {
      setSaving(false)
    }
  }

  function handleCopy() {
    navigator.clipboard.writeText(content)
    toast.success("Copied to clipboard")
  }

  function handleDownload() {
    const blob = new Blob([content], { type: 'text/typescript' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${script.script_name.toLowerCase().replace(/\s+/g, '-')}.spec.ts`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    toast.success("Script downloaded")
  }

  function handleEditorChange(value: string | undefined) {
    if (value !== undefined && value !== script.script_content) {
      setContent(value)
      setHasChanges(true)
    }
  }

  function handleClose() {
    if (hasChanges && !readonly) {
      if (confirm('You have unsaved changes. Close anyway?')) {
        onOpenChange(false)
      }
    } else {
      onOpenChange(false)
    }
  }


  async function handleRun() {
  setExecuting(true)
  try {
    const response = await fetch('/api/execute-script', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        scriptId: script.id,
        browser: 'chromium',
        headless: true
      })
    })
    
    const data = await response.json()
    
    if (data.success) {
      toast.success('Test started! Execution ID: ' + data.executionId)
    } else {
      toast.error('Failed: ' + data.error)
    }
  } catch (error) {
    toast.error('Execution failed')
  } finally {
    setExecuting(false)
  }
}

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
      className={`
        p-0 overflow-hidden
        w-[calc(100vw-2rem)]
        sm:w-[calc(100vw-3rem)]
        md:w-[calc(100vw-4rem)]
        max-w-[1200px]
        lg:max-w-[1400px]
        h-[92vh]
        ${isFullscreen ? "w-screen h-screen max-w-none max-h-none m-0 rounded-none" : ""}
      `}
    >
        <DialogHeader className="sr-only">
    <DialogTitle>{script.script_name}</DialogTitle>
  </DialogHeader>
        <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30 flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <Code2 className="h-5 w-5 text-muted-foreground flex-shrink-0" />
            <h2 className="text-lg font-semibold truncate">{script.script_name}</h2>
            
            <div className="flex items-center gap-2 flex-shrink-0">
              <Badge variant="outline" className="text-xs">
                {script.framework}
              </Badge>
              
              <Badge 
                variant="secondary" 
                className={
                  script.status === 'ready' 
                    ? 'bg-green-100 text-green-800 text-xs' 
                    : 'bg-gray-100 text-gray-800 text-xs'
                }
              >
                {script.status}
              </Badge>

              {hasChanges && (
                <Badge variant="secondary" className="bg-blue-100 text-blue-800 text-xs">
                  Unsaved
                </Badge>
              )}

              {/* Validation Badge */}
              {errorCount > 0 ? (
                <Badge variant="destructive" className="gap-1 text-xs">
                  <AlertTriangle className="h-3 w-3" />
                  {errorCount}
                </Badge>
              ) : todoCount > 0 ? (
                <Badge variant="secondary" className="bg-amber-100 text-amber-800 gap-1 text-xs">
                  <AlertTriangle className="h-3 w-3" />
                  {todoCount} TODO
                </Badge>
              ) : (
                <Badge variant="secondary" className="bg-green-100 text-green-800 gap-1 text-xs">
                  <CheckCircle2 className="h-3 w-3" />
                  Valid
                </Badge>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleCopy}
              className="h-8"
            >
              <Copy className="h-4 w-4 mr-2" />
              Copy
            </Button>
            
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleDownload}
              className="h-8"
            >
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
            
            <Button 
  variant="default" 
  size="sm" 
  onClick={handleRun}
  disabled={executing}
>
  {executing ? (
    <>
      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
      Running...
    </>
  ) : (
    <>
      <Play className="h-4 w-4 mr-2" />
      Run Test
    </>
  )}
</Button>
            {!readonly && onSave && (
              <Button 
                variant="default" 
                size="sm" 
                onClick={handleSave}
                disabled={saving || !hasChanges}
                className="h-8"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Save
              </Button>
            )}
            
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={handleClose}
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Full-Height Editor */}
        <div className="flex-1 min-h-0">
          <Editor
            height="100%"
            defaultLanguage="typescript"
            value={content}
            onChange={handleEditorChange}
            theme="vs-dark"
            options={{
              readOnly: readonly,
              minimap: { enabled: true },
              fontSize: 14,
              lineNumbers: 'on',
              scrollBeyondLastLine: false,
              automaticLayout: true,
              tabSize: 2,
              wordWrap: 'on',
              folding: true,
              renderLineHighlight: 'all',
              scrollbar: {
                vertical: 'visible',
                horizontal: 'visible',
                verticalScrollbarSize: 12,
                horizontalScrollbarSize: 12
              },
              suggestOnTriggerCharacters: true,
              quickSuggestions: true,
              formatOnPaste: true,
              formatOnType: true
            }}
          />
        </div>

        {/* Compact Footer */}
        <div className="flex items-center justify-between px-4 py-2 border-t bg-muted/30 text-xs text-muted-foreground flex-shrink-0">
          <div className="flex items-center gap-4">
            <span>{content.split('\n').length} lines</span>
            <span>{content.length} characters</span>
            {!readonly && (
              <span className="text-blue-600 dark:text-blue-400">
                <kbd className="px-1 py-0.5 bg-muted rounded border text-xs">Ctrl+S</kbd> to save
              </span>
            )}
          </div>
          <div>
            Updated {new Date(script.updated_at).toLocaleDateString()} at {new Date(script.updated_at).toLocaleTimeString()}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}