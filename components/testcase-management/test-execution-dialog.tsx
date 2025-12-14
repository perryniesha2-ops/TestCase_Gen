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
import type { ExecutionDetails } from "@/types/test-cases"

interface TestExecutionDialogProps {
  open: boolean
  initialData?: ExecutionDetails
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

  return (
    <Dialog 
      open={open} 
      onOpenChange={handleOpenChange}
      key={open ? 'open' : 'closed'} // ← Reset component when dialog opens
    >
      <DialogContent className="max-w-md" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Test Execution Details</DialogTitle>
          <DialogDescription>
            Provide additional details about the test execution result.
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
            <Label htmlFor="failure_reason">Failure Reason</Label>
            <Textarea
              id="failure_reason"
              defaultValue={defaultFormData.failure_reason}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, failure_reason: e.target.value }))
              }
              placeholder="Describe what went wrong..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} className="bg-red-600 hover:bg-red-700">
            Save Result
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}