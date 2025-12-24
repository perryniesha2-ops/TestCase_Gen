"use client"

import { useEffect, useMemo, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Loader2, Save, RefreshCcw, Code2 } from "lucide-react"
import { ScriptEditor } from "./scriptEditor"

type ScriptEditorDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  scriptId: string | null
  testCaseTitle?: string
  onSaved?: () => void
}

type AutomationScriptRow = {
  id: string
  test_case_id: string
  framework: string | null
  status: string | null
  script_content: string | null
  updated_at: string | null
}

export function ScriptEditorDialog({
  open,
  onOpenChange,
  scriptId,
  testCaseTitle,
  onSaved,
}: ScriptEditorDialogProps) {
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [script, setScript] = useState<AutomationScriptRow | null>(null)
  const [draft, setDraft] = useState("")
    const [isFullscreen, setIsFullscreen] = useState(false)


  const canSave = useMemo(() => {
    if (!script) return false
    return (draft ?? "") !== (script.script_content ?? "")
  }, [draft, script])

  useEffect(() => {
    if (!open) return

    // Reset state each time dialog opens
    setScript(null)
    setDraft("")

    if (!scriptId) return

    ;(async () => {
      setLoading(true)
      try {
        const supabase = createClient()
        const { data, error } = await supabase
          .from("automation_scripts")
          .select("id, test_case_id, framework, status, script_content, updated_at")
          .eq("id", scriptId)
          .single()

        if (error) throw error

        const row = data as AutomationScriptRow
        setScript(row)
        setDraft(row.script_content ?? "")
      } catch (err) {
        console.error("Failed to load script:", err)
        toast.error("Failed to load automation script")
      } finally {
        setLoading(false)
      }
    })()
  }, [open, scriptId])

  // change handleSave to accept the script string coming from ScriptEditor
async function handleSave(nextScript: string) {
  if (!script) return
  setSaving(true)
  try {
    const supabase = createClient()
    const { error } = await supabase
      .from("automation_scripts")
      .update({
        script_content: nextScript,
        updated_at: new Date().toISOString(),
      })
      .eq("id", script.id)

    if (error) throw error

    // keep local state in sync so header timestamps / canSave indicators are accurate
    setScript((prev) =>
      prev
        ? { ...prev, script_content: nextScript, updated_at: new Date().toISOString() }
        : prev
    )
    setDraft(nextScript) // optional, if you still want draft state for footer messaging

    toast.success("Script updated")
    onSaved?.()
    onOpenChange(false)
  } catch (err) {
    console.error("Failed to save script:", err)
    toast.error("Failed to update script")
  } finally {
    setSaving(false)
  }
}

  const language =
    (script?.framework ?? "").toLowerCase().includes("playwright") ? "typescript" : "typescript"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
    >          {/* Header */}
            <DialogHeader className="space-y-1">
                 <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30 flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <Code2 className="h-5 w-5 text-muted-foreground flex-shrink-0" />
          <DialogTitle className="flex items-center gap-2">
                Automation Script</DialogTitle>
              <DialogDescription>
                {testCaseTitle ? `Test case: ${testCaseTitle}` : "View and edit your generated script."}
              </DialogDescription>
                   </div>
          </div>
            </DialogHeader>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              {script?.framework && <Badge variant="outline">{script.framework}</Badge>}
              {script?.status && <Badge variant="secondary">{script.status}</Badge>}
              {script?.updated_at && (
                <span className="text-xs text-muted-foreground">
                  Updated {new Date(script.updated_at).toLocaleString()}
                </span>
              )}
            </div>

          {/* Body */}
          <div className="overflow-y-auto px-6 py-4">
            {loading ? (
              <div className="py-16 flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : !script ? (
              <div className="py-10 text-sm text-muted-foreground">No script found.</div>
            ) : (
              <div className="space-y-2">
                <Label>Script (editable)</Label>

                <ScriptEditor
  key={script?.id ?? "no-script"}
  initialScript={script?.script_content ?? ""}
  testName={testCaseTitle ?? "Automation Script"}
  onSave={handleSave}
  height="520px"
/>

              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t bg-background px-8 py-6">
            <div className="flex items-center justify-between">
              <div className="text-xs text-muted-foreground">
                {script ? (canSave ? "Unsaved changes" : "All changes saved") : ""}
              </div>

              <div className="flex items-center gap-3">
               
              </div>
            </div>
          </div>
      </DialogContent>
    </Dialog>
  )
}
