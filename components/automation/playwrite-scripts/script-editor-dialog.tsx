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
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Code2,
  Loader2,
  Save,
  Copy,
  Download,
  RotateCcw,
  Sparkles,
  AlertTriangle,
  Trash2,
  Maximize2,
  Minimize2,
} from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface ScriptEditorDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  scriptId: string | null
  testCaseTitle: string
  onSaved?: () => void
}

interface AutomationScript {
  id: string
  test_case_id: string
  script_name: string
  framework: string
  script_content: string
  status: "draft" | "ready" | "needs_review" | "active" | "archived"
  created_at: string
  updated_at: string
}

export function ScriptEditorDialog({
  open,
  onOpenChange,
  scriptId,
  testCaseTitle,
  onSaved,
}: ScriptEditorDialogProps) {
  const [script, setScript] = useState<AutomationScript | null>(null)
  const [editedContent, setEditedContent] = useState("")
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [regenerating, setRegenerating] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const [activeTab, setActiveTab] = useState<"editor" | "info">("editor")
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)

  useEffect(() => {
    if (open && scriptId) {
      fetchScript()
    } else {
      setScript(null)
      setEditedContent("")
      setHasChanges(false)
      setActiveTab("editor")
      setIsFullscreen(false)
    }
  }, [open, scriptId])

  useEffect(() => {
    if (script) {
      setHasChanges(editedContent !== script.script_content)
    }
  }, [editedContent, script])

  async function fetchScript() {
    if (!scriptId) return

    setLoading(true)
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from("automation_scripts")
        .select("*")
        .eq("id", scriptId)
        .single()

      if (error) throw error

      setScript(data)
      setEditedContent(data.script_content)
    } catch (error) {
      console.error("Error fetching script:", error)
      toast.error("Failed to load script")
    } finally {
      setLoading(false)
    }
  }

  async function saveScript() {
    if (!script || !hasChanges) return

    setSaving(true)
    try {
      const supabase = createClient()

      const { error } = await supabase
        .from("automation_scripts")
        .update({
          script_content: editedContent,
          updated_at: new Date().toISOString(),
        })
        .eq("id", script.id)

      if (error) throw error

      setScript({
        ...script,
        script_content: editedContent,
      })
      setHasChanges(false)
      toast.success("Script saved successfully!")
      onSaved?.()
    } catch (error) {
      console.error("Error saving script:", error)
      toast.error("Failed to save script")
    } finally {
      setSaving(false)
    }
  }

  async function regenerateScript() {
    if (!script) return

    const confirmed = confirm(
      "This will regenerate the script using AI. Your current changes will be replaced. Continue?"
    )
    if (!confirmed) return

    setRegenerating(true)
    try {
      const response = await fetch("/api/generate-script", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          testCaseId: script.test_case_id,
          forceRegenerate: true,
        }),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to regenerate script")
      }

      setEditedContent(data.script.script_content)
      setScript(data.script)
      setHasChanges(false)
      toast.success("Script regenerated!")
    } catch (error) {
      console.error("Error regenerating script:", error)
      toast.error(error instanceof Error ? error.message : "Failed to regenerate script")
    } finally {
      setRegenerating(false)
    }
  }

  async function deleteScript() {
    if (!script) return

    setDeleting(true)
    try {
      const response = await fetch(`/api/automation-scripts?id=${script.id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to delete script")
      }

      toast.success("Script deleted")
      onOpenChange(false)
      onSaved?.()
    } catch (error) {
      console.error("Error deleting script:", error)
      toast.error("Failed to delete script")
    } finally {
      setDeleting(false)
      setShowDeleteDialog(false)
    }
  }

  function copyToClipboard() {
    navigator.clipboard.writeText(editedContent)
    toast.success("Copied to clipboard!")
  }

  function downloadScript() {
    const blob = new Blob([editedContent], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${testCaseTitle.replace(/\s+/g, "-").toLowerCase()}.spec.ts`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    toast.success("Script downloaded!")
  }

  function resetChanges() {
    if (!script) return
    const confirmed = confirm("Discard all changes and reset to saved version?")
    if (confirmed) {
      setEditedContent(script.script_content)
      setHasChanges(false)
      toast.success("Changes discarded")
    }
  }

  const todoCount = (editedContent.match(/\/\/ TODO:/g) || []).length
  const hasCriticalTodos = editedContent.includes('TODO: Update selector')
  const lineCount = editedContent.split('\n').length

  if (loading && !script) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-6xl">
          <DialogHeader>
            <DialogTitle>Loading Script</DialogTitle>
            <DialogDescription>Please wait while we load your automation script...</DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent 
          className={`${
            isFullscreen 
              ? 'w-screen h-screen max-w-none max-h-none m-0 rounded-none' 
              : 'max-w-[95vw] w-[1400px] max-h-[95vh]'
          } flex flex-col p-0 overflow-hidden`}
        >
          <DialogHeader className="px-6 pt-6 pb-4 border-b flex-shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <Code2 className="h-5 w-5 text-purple-500" />
              {testCaseTitle}
            </DialogTitle>
            <DialogDescription className="flex items-center gap-3 flex-wrap">
              <Badge variant="secondary">{script?.framework}</Badge>
              {script?.status && (
                <Badge
                  variant={
                    script.status === "ready"
                      ? "default"
                      : script.status === "needs_review"
                      ? "destructive"
                      : "secondary"
                  }
                >
                  {script.status}
                </Badge>
              )}
              {todoCount > 0 && (
                <Badge variant="outline" className="gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  {todoCount} TODO{todoCount !== 1 ? 's' : ''}
                </Badge>
              )}
              <Badge variant="outline" className="gap-1">
                {lineCount} lines
              </Badge>
            </DialogDescription>
          </DialogHeader>

<div className="grid grid-cols-[auto_1fr_auto] items-center gap-3 px-4 py-2
  bg-muted/40 text-foreground border-b border-border flex-shrink-0">
            {/* Left: Primary actions */}
            <div className="flex items-center gap-2">
              <Button
                variant="default"
                size="sm"
                onClick={saveScript}
                disabled={!hasChanges || saving}
                className="gap-2"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Save
                  </>
                )}
              </Button>

              {hasChanges && (
                <Badge variant="secondary" className="text-xs">
                  Unsaved
                </Badge>
              )}
            </div>

            {/* Center: Quick actions */}
            <div className="flex items-center gap-1 justify-center">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={copyToClipboard}
                title="Copy to clipboard"
                className="text-foreground hover:bg-muted"
              >
                <Copy className="h-4 w-4" />
              </Button>

              <Button 
                variant="ghost" 
                size="sm"
                onClick={downloadScript}
                title="Download script"
                className="text-foreground hover:bg-muted"
              >
                <Download className="h-4 w-4" />
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={resetChanges}
                disabled={!hasChanges}
                title="Reset changes"
                className="text-foreground hover:bg-muted"
              >
                <RotateCcw className="h-4 w-4" />
              </Button>

              <div className="h-4 w-px bg-border mx-1" />

              <Button
                variant="ghost"
                size="sm"
                onClick={regenerateScript}
                disabled={regenerating}
                title="Regenerate with AI"
                className="text-foreground hover:bg-muted"
              >
                {regenerating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsFullscreen(!isFullscreen)}
                title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
              >
                {isFullscreen ? (
                  <Minimize2 className="h-4 w-4" />
                ) : (
                  <Maximize2 className="h-4 w-4" />
                )}
              </Button>
            </div>

            {/* Right: Delete */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowDeleteDialog(true)}
              title="Delete script"
            >
<Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>

          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="flex-1 flex flex-col overflow-hidden min-h-0">
            <div className="px-6 pt-4 flex-shrink-0">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="editor">
                  <Code2 className="h-4 w-4 mr-2" />
                  Editor
                </TabsTrigger>
                <TabsTrigger value="info">
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  Info {todoCount > 0 && `(${todoCount})`}
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="editor" className="flex-1 px-6 pb-6 flex flex-col overflow-hidden min-h-0">
              <div className="mb-2 flex-shrink-0">
                <Label>Script Content ({lineCount} lines, {editedContent.length} characters)</Label>
              </div>
              <div className="flex-1 overflow-auto border rounded-lg" style={{ backgroundColor: 'oklch(0.13 0.028 261.692)' }}>
                <Textarea
                  value={editedContent}
                  onChange={(e) => setEditedContent(e.target.value)}
                  className="w-full h-full min-h-full font-mono text-[13px] resize-none bg-transparent border-0 focus-visible:ring-0 focus-visible:ring-offset-0 leading-relaxed p-4"
                  style={{
                    tabSize: 2,
                    color: 'oklch(0.985 0.002 247.839)', // foreground color from dark theme
                  }}
                  placeholder="// Your automation script here..."
                  spellCheck={false}
                />
              </div>
            </TabsContent>

            <TabsContent value="info" className="flex-1 px-6 pb-6 overflow-auto min-h-0">
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-2">Script Analysis</h3>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-3 bg-card rounded-lg border">
                      <span className="text-sm">TODO Items</span>
                      <Badge variant={todoCount > 0 ? "secondary" : "outline"}>
                        {todoCount}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-card rounded-lg border">
                      <span className="text-sm">Critical TODOs</span>
                      <Badge variant={hasCriticalTodos ? "destructive" : "outline"}>
                        {hasCriticalTodos ? "Yes" : "No"}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-card rounded-lg border">
                      <span className="text-sm">Lines of Code</span>
                      <Badge variant="outline">
                        {lineCount}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-card rounded-lg border">
                      <span className="text-sm">Characters</span>
                      <Badge variant="outline">
                        {editedContent.length}
                      </Badge>
                    </div>
                  </div>
                </div>

                {hasCriticalTodos && (
<div className="grid grid-cols-[auto_1fr_auto] items-center gap-3 px-4 py-2
  bg-muted/40 text-foreground border-b border-border flex-shrink-0">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <h4 className="font-semibold text-amber-900">Needs Review</h4>
                        <p className="text-sm text-amber-700 mt-1">
                          This script contains placeholder selectors that need to be updated
                          with actual values from your application.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div>
                  <h3 className="font-semibold mb-2">Metadata</h3>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Created</span>
                      <span>{script?.created_at ? new Date(script.created_at).toLocaleString() : 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Updated</span>
                      <span>{script?.updated_at ? new Date(script.updated_at).toLocaleString() : 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Framework</span>
                      <span>{script?.framework}</span>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Automation Script?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the automation script. This action cannot be undone.
              You can always regenerate the script later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={deleteScript}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete Script"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}