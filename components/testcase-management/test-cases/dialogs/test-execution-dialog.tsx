// app/pages/test-cases/components/test-execution-dialog.tsx

"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { ExecutionDetails, ExecutionStatus } from "@/types/test-cases"

interface TestExecutionDialogProps {
  open: boolean
  initialData?: ExecutionDetails
  status: ExecutionStatus
  onClose: () => void
  onSave: (details: ExecutionDetails) => void
}

export function TestExecutionDialog({
  open,
  initialData,
  onClose,
  onSave,
}: TestExecutionDialogProps) {
  // Simple initial state - will be reset by key prop
  const [formData, setFormData] = useState<ExecutionDetails>({
    notes: "",
    failure_reason: "",
    environment: "staging",
    browser: "",
    os_version: "",
  })

  function handleSave() {
    onSave(formData)
    onClose()
  }

  function handleOpenChange(isOpen: boolean) {
    if (!isOpen) {
      onClose()
    }
  }

  // Get default values from initialData
  const defaultFormData = initialData || {
    notes: "",
    failure_reason: "",
    environment: "staging",
    browser: "",
    os_version: "",
  }


const reasonLabel =
  status === "failed"
    ? "Failure Reason"
    : status === "blocked"
    ? "Blocked Reason"
    : status === "skipped"
    ? "Skipped Reason"
    : "Reason"

const reasonPlaceholder =
  status === "failed"
    ? "Describe what went wrong..."
    : status === "blocked"
    ? "Why is this blocked? (dependency, env issue, missing access, etc.)"
    : status === "skipped"
    ? "Why was this skipped? (out of scope, not applicable, etc.)"
    : "Add a reason..."
  
  return (
    <Dialog 
      open={open} 
      onOpenChange={handleOpenChange}
      key={open ? 'open' : 'closed'} // ← Reset component when dialog opens
    >
      <DialogContent className="max-w-md" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
         <DialogTitle>
  {status === "failed" ? "Mark as Failed" : status === "blocked" ? "Mark as Blocked" : "Mark as Skipped"}
</DialogTitle>
<DialogDescription>
  Add context for this result. This will be saved to the execution record.
</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="environment">Test Environment</Label>
            <Select
              defaultValue={defaultFormData.environment}
              onValueChange={(value) => setFormData((prev) => ({ ...prev, environment: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="staging">Staging</SelectItem>
                <SelectItem value="production">Production</SelectItem>
                <SelectItem value="development">Development</SelectItem>
                <SelectItem value="qa">QA</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="browser">Browser</Label>
              <Input
                id="browser"
                defaultValue={defaultFormData.browser}
                onChange={(e) => setFormData((prev) => ({ ...prev, browser: e.target.value }))}
                placeholder="e.g., Chrome 119"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="os">OS Version</Label>
              <Input
                id="os"
                defaultValue={defaultFormData.os_version}
                onChange={(e) => setFormData((prev) => ({ ...prev, os_version: e.target.value }))}
                placeholder="e.g., Windows 11"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Execution Notes</Label>
            <Textarea
              id="notes"
              defaultValue={defaultFormData.notes}
              onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
              placeholder="Additional notes about the test execution..."
              rows={3}
            />
          </div>

         <div className="space-y-2">
  <Label htmlFor="failure_reason">{reasonLabel}</Label>
  <Textarea
    id="failure_reason"
    defaultValue={defaultFormData.failure_reason}
    onChange={(e) =>
      setFormData((prev) => ({ ...prev, failure_reason: e.target.value }))
    }
    placeholder={reasonPlaceholder}
    rows={3}
  />
</div>
        </div>

        <DialogFooter>
          <Button
  onClick={handleSave}
  className={
    status === "failed"
      ? "bg-red-600 hover:bg-red-700"
      : status === "blocked"
      ? "bg-orange-600 hover:bg-orange-700"
      : status === "skipped"
      ? "bg-slate-600 hover:bg-slate-700"
      : ""
  }
>
  Save Result
</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}