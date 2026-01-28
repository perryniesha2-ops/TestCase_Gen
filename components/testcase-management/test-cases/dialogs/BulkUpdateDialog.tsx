// components/testcase-management/dialogs/BulkUpdateDialog.tsx
"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import type { Project, TestSuite } from "@/types/test-cases";

interface BulkUpdateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  action: "status" | "priority" | "project" | "suite" | "approve" | "reject";
  selectedCount: number;
  type?: "regular" | "cross-platform";
  pendingCount?: number;
  onUpdate?: (updates: any) => Promise<void>;
  onAddToSuite?: (suiteId: string) => Promise<void>;
  onApprove?: () => Promise<void>;
  onReject?: () => Promise<void>;
}

export function BulkUpdateDialog({
  open,
  onOpenChange,
  action,
  selectedCount,
  type = "regular",
  pendingCount = 0,
  onUpdate,
  onAddToSuite,
  onApprove,
  onReject,
}: BulkUpdateDialogProps) {
  const [loading, setLoading] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [suites, setSuites] = useState<TestSuite[]>([]);

  const [selectedStatus, setSelectedStatus] = useState("");
  const [selectedPriority, setSelectedPriority] = useState("");
  const [selectedProject, setSelectedProject] = useState("__none__");
  const [selectedSuite, setSelectedSuite] = useState("");

  useEffect(() => {
    if (open && action === "project") {
      fetchProjects();
    }
    if (open && action === "suite") {
      fetchSuites();
    }
  }, [open, action]);

  useEffect(() => {
    if (!open) {
      setSelectedStatus("");
      setSelectedPriority("");
      setSelectedProject("__none__");
      setSelectedSuite("");
    }
  }, [open]);

  async function fetchProjects() {
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("projects")
        .select("id, name, color, icon")
        .eq("user_id", user.id)
        .order("name");

      if (error) throw error;
      setProjects(data || []);
    } catch (error) {
      console.error("Error fetching projects:", error);
    }
  }

  async function fetchSuites() {
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("test_suites")
        .select("id, name, suite_type, status, created_at, project_id")
        .eq("user_id", user.id)
        .order("name");

      if (error) throw error;
      setSuites(data || []);
    } catch (error) {
      console.error("Error fetching suites:", error);
    }
  }

  async function handleSubmit() {
    setLoading(true);
    try {
      if (action === "approve" && onApprove) {
        await onApprove();
        onOpenChange(false);
        return;
      }

      if (action === "reject" && onReject) {
        await onReject();
        onOpenChange(false);
        return;
      }

      if (action === "suite") {
        if (!selectedSuite) {
          alert("Please select a suite");
          return;
        }
        if (onAddToSuite) {
          await onAddToSuite(selectedSuite);
        }
        onOpenChange(false);
        return;
      }

      if (onUpdate) {
        const updates: any = {};

        if (action === "status" && selectedStatus) {
          updates.status = selectedStatus;
        }
        if (action === "priority" && selectedPriority) {
          updates.priority = selectedPriority;
        }
        if (action === "project") {
          updates.project_id =
            selectedProject === "__none__" ? null : selectedProject || null;
        }

        if (Object.keys(updates).length === 0) {
          alert("Please select a value");
          return;
        }

        await onUpdate(updates);
        onOpenChange(false);
      }
    } finally {
      setLoading(false);
    }
  }

  function getDialogTitle() {
    switch (action) {
      case "status":
        return "Change Status";
      case "priority":
        return "Change Priority";
      case "project":
        return "Assign to Project";
      case "suite":
        return "Add to Test Suite";
      case "approve":
        return "Approve Test Cases";
      case "reject":
        return "Reject Test Cases";
      default:
        return "Bulk Update";
    }
  }

  function getDialogDescription() {
    if (action === "approve") {
      return `Approve ${pendingCount || selectedCount} pending test case${
        (pendingCount || selectedCount) === 1 ? "" : "s"
      }`;
    }
    if (action === "reject") {
      return `Reject ${pendingCount || selectedCount} pending test case${
        (pendingCount || selectedCount) === 1 ? "" : "s"
      }`;
    }
    return `Update ${selectedCount} test case${selectedCount === 1 ? "" : "s"}`;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{getDialogTitle()}</DialogTitle>
          <DialogDescription>{getDialogDescription()}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Status Selection - Regular only */}
          {action === "status" && type === "regular" && (
            <div className="space-y-2">
              <Label htmlFor="status">New Status</Label>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger id="status">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Priority Selection - Both types */}
          {action === "priority" && (
            <div className="space-y-2">
              <Label htmlFor="priority">New Priority</Label>
              <Select
                value={selectedPriority}
                onValueChange={setSelectedPriority}
              >
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

          {action === "project" && (
            <div className="space-y-2">
              <Label htmlFor="project">Project</Label>
              <Select
                value={selectedProject}
                onValueChange={setSelectedProject}
              >
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

          {/* Suite Selection - Both types */}
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
            <Alert className="border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-800">
              <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
              <AlertDescription className="text-green-800 dark:text-green-300">
                <div className="space-y-2">
                  <p className="font-semibold">
                    This will approve {pendingCount || selectedCount} test case
                    {(pendingCount || selectedCount) === 1 ? "" : "s"}
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    <li>
                      Status will be set to <strong>Approved</strong>
                    </li>
                    <li>Cases can be added to test suites</li>
                    <li>Cases will remain in the cross-platform table</li>
                  </ul>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Reject Confirmation */}
          {action === "reject" && (
            <Alert className="border-orange-200 bg-orange-50 dark:bg-orange-950/20 dark:border-orange-800">
              <XCircle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
              <AlertDescription className="text-orange-800 dark:text-orange-300">
                <div className="space-y-2">
                  <p className="font-semibold">
                    This will reject {pendingCount || selectedCount} test case
                    {(pendingCount || selectedCount) === 1 ? "" : "s"}
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    <li>
                      Status will be set to <strong>Rejected</strong>
                    </li>
                    <li>Cases will remain visible but not usable</li>
                    <li>You can change this later if needed</li>
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
            variant={
              action === "reject"
                ? "destructive"
                : action === "approve"
                  ? "default"
                  : "default"
            }
            className={
              action === "approve" ? "bg-green-600 hover:bg-green-700" : ""
            }
          >
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {action === "approve" && <CheckCircle2 className="h-4 w-4 mr-2" />}
            {action === "reject" && <XCircle className="h-4 w-4 mr-2" />}
            {action === "approve" && `Approve`}
            {action === "reject" && `Reject`}
            {!["approve", "reject"].includes(action) && `Update`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
