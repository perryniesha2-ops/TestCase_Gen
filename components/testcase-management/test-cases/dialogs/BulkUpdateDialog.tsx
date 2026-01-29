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
import { Loader2 } from "lucide-react";
import type { Project, TestSuite } from "@/types/test-cases";

interface BulkUpdateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  action: "status" | "priority" | "project" | "suite";
  selectedCount: number;
  type?: "regular" | "cross-platform";
  onUpdate?: (updates: any) => Promise<void>;
  onAddToSuite?: (suiteId: string) => Promise<void>;
}

export function BulkUpdateDialog({
  open,
  onOpenChange,
  action,
  selectedCount,
  type = "regular",
  onUpdate,
  onAddToSuite,
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
      default:
        return "Bulk Update";
    }
  }

  function getDialogDescription() {
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
          {/* Status Selection - Both types */}
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

          {/* Project Selection - Both types */}
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
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Update
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
