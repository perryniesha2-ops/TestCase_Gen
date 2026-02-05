// components/requirements/edit-requirement-modal.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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
import { X, Plus, Loader2, FolderOpen } from "lucide-react";
import {
  toastSuccess,
  toastError,
  toastInfo,
  toastWarning,
} from "@/lib/utils/toast-utils";

import type { Requirement, Project } from "@/types/requirements";

interface EditRequirementModalProps {
  requirement: Requirement;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

function resolveProjectId(requirement: Requirement): string {
  // Preferred + correct
  const direct = (requirement as any).project_id;
  if (typeof direct === "string") return direct;

  // If you sometimes join projects -> keep in mind joins might populate requirement.projects
  const joined = (requirement as any).projects?.id;
  if (typeof joined === "string") return joined;

  // Legacy typo support (what you currently have)
  const legacy = (requirement as any).projectid;
  if (typeof legacy === "string") return legacy;

  return "";
}

export function EditRequirementModal({
  requirement,
  open,
  onOpenChange,
  onSuccess,
}: EditRequirementModalProps) {
  const { user, loading: authLoading } = useAuth();
  const supabase = useMemo(() => createClient(), []);
  const [loading, setLoading] = useState(false);

  const [projects, setProjects] = useState<Project[]>([]);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    type: requirement.type,
    priority: requirement.priority,
    status: requirement.status,
    external_id: "",
    project_id: "",
    source: "",
  });

  const [acceptanceCriteria, setAcceptanceCriteria] = useState<string[]>([]);
  const [newCriterion, setNewCriterion] = useState("");

  // Fetch projects once
  useEffect(() => {
    void fetchProjects();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchProjects() {
    if (!user) return;

    try {
      const supabase = createClient();

      const { data, error } = await supabase
        .from("projects")
        .select("id, name, color, icon")
        .eq("user_id", user.id)
        .order("name");

      if (error) throw error;
      setProjects((data ?? []) as Project[]);
    } catch (error) {
      console.error("Error fetching projects:", error);
    }
  }

  useEffect(() => {
    if (!open) return;

    const projectId = resolveProjectId(requirement);

    setFormData({
      title: requirement.title ?? "",
      description: requirement.description ?? "",
      type: requirement.type,
      priority: requirement.priority,
      status: requirement.status,
      external_id: requirement.external_id ?? "",
      project_id: projectId,
      source: requirement.source ?? "",
    });

    // 🔧 FIX: This should now properly update when acceptance_criteria loads
    setAcceptanceCriteria(
      Array.isArray(requirement.acceptance_criteria)
        ? requirement.acceptance_criteria
        : [],
    );

    setNewCriterion("");

    const criteria = parseAcceptanceCriteria(requirement.acceptance_criteria);

    setAcceptanceCriteria(criteria);
    setNewCriterion("");
  }, [open, requirement]);

  function handleAddCriterion() {
    const trimmed = newCriterion.trim();
    if (!trimmed) return;
    setAcceptanceCriteria((prev) => [...prev, trimmed]);
    setNewCriterion("");
  }

  function handleRemoveCriterion(index: number) {
    setAcceptanceCriteria((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) {
      toastError("Please log in to update requirements");
      return;
    }

    if (!formData.title.trim()) {
      toastError("Title is required");
      return;
    }
    if (!formData.description.trim()) {
      toastError("Description is required");
      return;
    }

    try {
      setLoading(true);

      // 🔧 Convert array to JSON string for TEXT column
      const criteriaToSave =
        acceptanceCriteria.length > 0
          ? JSON.stringify(acceptanceCriteria) // Store as JSON string
          : null;

      const { error } = await supabase
        .from("requirements")
        .update({
          title: formData.title.trim(),
          description: formData.description.trim(),
          type: formData.type,
          priority: formData.priority,
          status: formData.status,
          external_id: formData.external_id.trim() || null,
          project_id: formData.project_id || null,
          source: formData.source,
          acceptance_criteria: criteriaToSave, // JSON string, not array
          updated_at: new Date().toISOString(),
        })
        .eq("id", requirement.id);

      if (error) throw error;

      toastSuccess("Requirement updated successfully");
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error("Error updating requirement:", error);
      toastError("Failed to update requirement");
    } finally {
      setLoading(false);
    }
  }

  function parseAcceptanceCriteria(data: any): string[] {
    if (!data) return [];

    if (Array.isArray(data)) {
      return data;
    }

    if (typeof data === "string") {
      if (data.trim() === "") return [];

      try {
        const parsed = JSON.parse(data);
        return Array.isArray(parsed) ? parsed : [];
      } catch (e) {
        console.error("Failed to parse acceptance_criteria:", e);
        return [];
      }
    }

    return [];
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        key={requirement.id}
        className="w-[95vw] sm:max-w-4xl lg:max-w-5xl max-h-[90vh] flex flex-col p-0"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader className="relative border-b bg-background px-6 py-5">
          <div className="space-y-1">
            <DialogTitle className="text-xl">Edit Requirement</DialogTitle>
            <DialogDescription>
              Update the requirement details below.
            </DialogDescription>
          </div>
        </DialogHeader>

        <div className="max-h-[calc(92vh-76px-80px)] overflow-y-auto px-6 py-6">
          <form
            onSubmit={handleSubmit}
            id="edit_requirement_form"
            className="space-y-7"
          >
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) =>
                  setFormData((p) => ({ ...p, title: e.target.value }))
                }
                placeholder="Enter requirement title"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData((p) => ({ ...p, description: e.target.value }))
                }
                placeholder="Enter detailed description"
                rows={6}
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-2">
                <Label htmlFor="type">Type</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) =>
                    setFormData((p) => ({
                      ...p,
                      type: value as Requirement["type"],
                    }))
                  }
                >
                  <SelectTrigger className="h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="functional">Functional</SelectItem>
                    <SelectItem value="user_story">User Story</SelectItem>
                    <SelectItem value="use_case">Use Case</SelectItem>
                    <SelectItem value="non_functional">
                      Non-Functional
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="priority">Priority</Label>
                <Select
                  value={formData.priority}
                  onValueChange={(value) =>
                    setFormData((p) => ({
                      ...p,
                      priority: value as Requirement["priority"],
                    }))
                  }
                >
                  <SelectTrigger className="h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) =>
                    setFormData((p) => ({
                      ...p,
                      status: value as Requirement["status"],
                    }))
                  }
                >
                  <SelectTrigger className="h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="project">Project (Optional)</Label>
                <Select
                  value={formData.project_id || "none"}
                  onValueChange={(value) =>
                    setFormData((p) => ({
                      ...p,
                      project_id: value === "none" ? "" : value,
                    }))
                  }
                >
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="Select a project" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">
                      <span className="text-muted-foreground">No Project</span>
                    </SelectItem>
                    {projects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        <div className="flex items-center gap-2">
                          <FolderOpen className="h-4 w-4" />
                          {project.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-2">
                <Label htmlFor="external_id">External ID (Optional)</Label>
                <Input
                  id="external_id"
                  value={formData.external_id}
                  onChange={(e) =>
                    setFormData((p) => ({ ...p, external_id: e.target.value }))
                  }
                  placeholder="e.g., JIRA-123"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="source">Source</Label>
                <Input
                  id="source"
                  value={formData.source}
                  onChange={(e) =>
                    setFormData((p) => ({ ...p, source: e.target.value }))
                  }
                  placeholder="e.g., stakeholder, user research"
                />
              </div>
            </div>

            <div className="space-y-3">
              <Label>Acceptance Criteria</Label>

              {acceptanceCriteria.length > 0 ? (
                <div className="space-y-2">
                  {acceptanceCriteria.map((criterion, index) => (
                    <div
                      key={`${requirement.id}-${index}`}
                      className="flex items-start gap-3 rounded-md border p-3"
                    >
                      <span className="font-mono text-xs bg-muted px-2 py-1 rounded">
                        {index + 1}
                      </span>
                      <div className="flex-1 text-sm leading-relaxed">
                        {criterion}
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveCriterion(index)}
                        aria-label={`Remove criterion ${index + 1}`}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground border border-dashed rounded-md p-4">
                  No acceptance criteria added yet.
                </div>
              )}

              <div className="flex flex-col md:flex-row gap-2">
                <Input
                  value={newCriterion}
                  onChange={(e) => setNewCriterion(e.target.value)}
                  placeholder="Add acceptance criterion"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddCriterion();
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleAddCriterion}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add
                </Button>
              </div>
            </div>
          </form>
        </div>

        <div className="border-t bg-background px-6 py-4">
          <DialogFooter className="gap-2 sm:gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              form="edit_requirement_form"
              disabled={loading}
            >
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
