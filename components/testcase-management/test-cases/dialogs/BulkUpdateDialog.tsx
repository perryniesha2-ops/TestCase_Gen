// components/testcase-management/test-cases/dialogs/BulkUpdateDialog.tsx
"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
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
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, CheckCircle2, XCircle, AlertTriangle } from "lucide-react"
import type { TestCase, Project, TestSuite, CrossPlatformTestCase } from "@/types/test-cases"

interface BulkUpdateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  action: "status" | "priority" | "project" | "suite" | "approve" | "reject"
  selectedCount: number
  type?: "regular" | "cross-platform"
  pendingCount?: number
  onUpdate?: (updates: any) => Promise<void>  // ✅ Changed from strict typing
  onAddToSuite?: (suiteId: string) => Promise<void>
  onApprove?: () => Promise<void>
  onReject?: () => Promise<void>
}

export function BulkUpdateDialog({
  open,
  onOpenChange,
  action,
  selectedCount,
  type = "regular",
  pendingCount,
  onUpdate,
  onAddToSuite,
  onApprove,
  onReject,
}: BulkUpdateDialogProps) {
  const [loading, setLoading] = useState(false)
  const [projects, setProjects] = useState<Project[]>([])
  const [suites, setSuites] = useState<TestSuite[]>([])
  
  const [selectedStatus, setSelectedStatus] = useState("")
  const [selectedPriority, setSelectedPriority] = useState("")
  const [selectedProject, setSelectedProject] = useState("__none__")
  const [selectedSuite, setSelectedSuite] = useState("")

  useEffect(() => {
    if (open && action === "project") {
      fetchProjects()
    }
    if (open && action === "suite") {
      fetchSuites()
    }
  }, [open, action])

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      setSelectedStatus("")
      setSelectedPriority("")
      setSelectedProject("__none__")
      setSelectedSuite("")
    }
  }, [open])

  async function fetchProjects() {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from("projects")
        .select("id, name, color, icon")
        .eq("user_id", user.id)
        .order("name")

      if (error) throw error
      setProjects(data || [])
    } catch (error) {
      console.error("Error fetching projects:", error)
    }
  }

  async function fetchSuites() {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from("test_suites")
        .select("id, name, suite_type, status, created_at, project_id")
        .eq("user_id", user.id)
        .order("name")

      if (error) throw error
      setSuites(data || [])
    } catch (error) {
      console.error("Error fetching suites:", error)
    }
  }

  async function handleSubmit() {
    setLoading(true)
    try {
      // Handle cross-platform actions
      if (action === "approve" && onApprove) {
        await onApprove()
        onOpenChange(false)
        return
      }

      if (action === "reject" && onReject) {
        await onReject()
        onOpenChange(false)
        return
      }

      // Handle suite action
      if (action === "suite") {
        if (!selectedSuite) {
          alert("Please select a suite")
          return
        }
        if (onAddToSuite) {
          await onAddToSuite(selectedSuite)
        }
        onOpenChange(false)
        return
      }

      // Handle regular update actions
      if (onUpdate) {
        const updates: any = {}
        
        if (action === "status" && selectedStatus) {
          updates.status = selectedStatus
        }
        if (action === "priority" && selectedPriority) {
          updates.priority = selectedPriority
        }
        if (action === "project") {
          updates.project_id = selectedProject === "__none__" ? null : selectedProject || null
        }

        if (Object.keys(updates).length === 0) {
          alert("Please select a value")
          return
        }

        await onUpdate(updates)
        onOpenChange(false)
      }
    } finally {
      setLoading(false)
    }
  }

  function getDialogTitle() {
    switch (action) {
      case "status":
        return "Change Status"
      case "priority":
        return type === "cross-platform" ? "Change Priority" : "Change Priority"
      case "project":
        return "Assign to Project"
      case "suite":
        return "Add to Test Suite"
      case "approve":
        return "Approve & Convert Test Cases"
      case "reject":
        return "Reject Test Cases"
      default:
        return "Bulk Update"
    }
  }

  function getDialogDescription() {
    if (action === "approve") {
      return `You are about to approve ${pendingCount || selectedCount} pending test case${(pendingCount || selectedCount) === 1 ? "" : "s"}`
    }
    if (action === "reject") {
      return `You are about to reject ${pendingCount || selectedCount} pending test case${(pendingCount || selectedCount) === 1 ? "" : "s"}`
    }
    return `Update ${selectedCount} test case${selectedCount === 1 ? "" : "s"}`
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{getDialogTitle()}</DialogTitle>
          <DialogDescription>{getDialogDescription()}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Status Selection */}
          {action === "status" && (
            <div className="space-y-2">
              <Label htmlFor="status">New Status</Label>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger id="status">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="deprecated">Deprecated</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Priority Selection */}
          {action === "priority" && (
            <div className="space-y-2">
              <Label htmlFor="priority">New Priority</Label>
              <Select value={selectedPriority} onValueChange={setSelectedPriority}>
                <SelectTrigger id="priority">
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Project Selection */}
          {action === "project" && (
            <div className="space-y-2">
              <Label htmlFor="project">Project</Label>
              <Select value={selectedProject} onValueChange={setSelectedProject}>
                <SelectTrigger id="project">
                  <SelectValue placeholder="Select project" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">No Project</SelectItem>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Suite Selection */}
          {action === "suite" && (
            <div className="space-y-2">
              <Label htmlFor="suite">Test Suite</Label>
              <Select value={selectedSuite} onValueChange={setSelectedSuite}>
                <SelectTrigger id="suite">
                  <SelectValue placeholder="Select suite" />
                </SelectTrigger>
                <SelectContent>
                  {suites.map((suite) => (
                    <SelectItem key={suite.id} value={suite.id}>
                      {suite.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {suites.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No test suites available. Create one first.
                </p>
              )}
            </div>
          )}

          {/* Approve Confirmation */}
          {action === "approve" && (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                <div className="space-y-2">
                  <p className="font-semibold">This action will:</p>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    <li>Convert {pendingCount || selectedCount} pending test case{(pendingCount || selectedCount) === 1 ? "" : "s"} to regular test case{(pendingCount || selectedCount) === 1 ? "" : "s"}</li>
                    <li>Set status to <strong>Active</strong></li>
                    <li>Make {(pendingCount || selectedCount) === 1 ? "it" : "them"} available to add to test suites</li>
                    <li>Keep original as approved for reference</li>
                  </ul>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Reject Confirmation */}
          {action === "reject" && (
            <Alert className="border-orange-200 bg-orange-50">
              <XCircle className="h-4 w-4 text-orange-600" />
              <AlertDescription className="text-orange-800">
                <div className="space-y-2">
                  <p className="font-semibold">This action will:</p>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    <li>Mark {pendingCount || selectedCount} test case{(pendingCount || selectedCount) === 1 ? "" : "s"} as <strong>Rejected</strong></li>
                    <li>{(pendingCount || selectedCount) === 1 ? "It" : "They"} will remain visible but cannot be converted</li>
                    <li>You can always change this later if needed</li>
                  </ul>
                </div>
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={loading}
            variant={action === "reject" ? "destructive" : action === "approve" ? "default" : "default"}
            className={action === "approve" ? "bg-green-600 hover:bg-green-700" : ""}
          >
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {action === "approve" && <CheckCircle2 className="h-4 w-4 mr-2" />}
            {action === "reject" && <XCircle className="h-4 w-4 mr-2" />}
            {action === "approve" && `Approve ${pendingCount || selectedCount}`}
            {action === "reject" && `Reject ${pendingCount || selectedCount}`}
            {!["approve", "reject"].includes(action) && `Update ${selectedCount}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}