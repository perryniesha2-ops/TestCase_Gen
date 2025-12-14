// components/requirements/edit-requirement-modal.tsx
"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
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
import { X, Plus, Loader2, FolderOpen } from "lucide-react"
import type { Requirement, Project } from "@/types/requirements"

interface EditRequirementModalProps {
  requirement: Requirement
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function EditRequirementModal({
  requirement,
  open,
  onOpenChange,
  onSuccess,
}: EditRequirementModalProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    title: requirement.title,
    description: requirement.description,
    type: requirement.type,
    priority: requirement.priority,
    status: requirement.status,
    external_id: requirement.external_id || "",
    project_id: requirement.projectid || "",
    source: requirement.source,
  })
  const [acceptanceCriteria, setAcceptanceCriteria] = useState<string[]>(
    Array.isArray(requirement.acceptance_criteria)
      ? requirement.acceptance_criteria
      : [],
  )
  const [newCriterion, setNewCriterion] = useState("")
  const [projects, setProjects] = useState<Project[]>([])

  useEffect(() => {
    fetchProjects()
  }, [])

  async function fetchProjects() {
    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
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

  useEffect(() => {
    setFormData({
      title: requirement.title,
      description: requirement.description,
      type: requirement.type,
      priority: requirement.priority,
      status: requirement.status,
      external_id: requirement.external_id || "",
      project_id: requirement.projectid || "",
      source: requirement.source,
    })
    setAcceptanceCriteria(
      Array.isArray(requirement.acceptance_criteria)
        ? requirement.acceptance_criteria
        : [],
    )
    setNewCriterion("")
  }, [requirement])

  function handleAddCriterion() {
    const trimmed = newCriterion.trim()
    if (!trimmed) return
    setAcceptanceCriteria((prev) => [...prev, trimmed])
    setNewCriterion("")
  }

  function handleRemoveCriterion(index: number) {
    setAcceptanceCriteria((prev) => prev.filter((_, i) => i !== index))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!formData.title.trim()) {
      toast.error("Title is required")
      return
    }
    if (!formData.description.trim()) {
      toast.error("Description is required")
      return
    }

    try {
      setLoading(true)
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        toast.error("Please log in to update requirements")
        return
      }

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
          acceptance_criteria:
            acceptanceCriteria.length > 0 ? acceptanceCriteria : null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", requirement.id)

      if (error) throw error

      toast.success("Requirement updated successfully")
      onSuccess()
      onOpenChange(false)
    } catch (error) {
      console.error("Error updating requirement:", error)
      toast.error("Failed to update requirement")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="
          w-[96vw]
          sm:max-w-3xl
          lg:max-w-4xl
          max-h-[92vh]
          overflow-hidden
          p-0
        "
        onInteractOutside={(e) => e.preventDefault()}
      >
        {/* Sticky header with top-right close */}
        <DialogHeader className="relative border-b bg-background px-6 py-5">
          <div className="space-y-1">
            <DialogTitle className="text-xl">Edit Requirement</DialogTitle>
            <DialogDescription>
              Update the requirement details below.
            </DialogDescription>
          </div>
        </DialogHeader>

        {/* Scrollable body */}
        <div className="max-h-[calc(92vh-76px-80px)] overflow-y-auto px-6 py-6">
          <form onSubmit={handleSubmit} id="edit_requirement_form" className="space-y-7">
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                placeholder="Enter requirement title"
                required
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Enter detailed description"
                rows={6}
                required
              />
            </div>

            {/* Type and Priority */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-2">
                <Label htmlFor="type">Type</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) =>
                    setFormData({
                      ...formData,
                      type: value as Requirement["type"],
                    })
                  }
                >
                  <SelectTrigger className="h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="functional">Functional</SelectItem>
                    <SelectItem value="user_story">User Story</SelectItem>
                    <SelectItem value="use_case">Use Case</SelectItem>
                    <SelectItem value="non_functional">Non-Functional</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="priority">Priority</Label>
                <Select
                  value={formData.priority}
                  onValueChange={(value) =>
                    setFormData({
                      ...formData,
                      priority: value as Requirement["priority"],
                    })
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

            {/* Status and Project */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) =>
                    setFormData({
                      ...formData,
                      status: value as Requirement["status"],
                    })
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

              {/* Project Dropdown */}
              <div className="space-y-2">
                <Label htmlFor="project">Project (Optional)</Label>
                <Select
                  value={formData.project_id || "none"}
                  onValueChange={(value) =>
                    setFormData((prev) => ({
                      ...prev,
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

            {/* External ID and Source */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-2">
                <Label htmlFor="external_id">External ID (Optional)</Label>
                <Input
                  id="external_id"
                  value={formData.external_id}
                  onChange={(e) =>
                    setFormData({ ...formData, external_id: e.target.value })
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
                    setFormData({ ...formData, source: e.target.value })
                  }
                  placeholder="e.g., stakeholder, user research"
                />
              </div>
            </div>

            {/* Acceptance Criteria */}
            <div className="space-y-3">
              <Label>Acceptance Criteria</Label>

              {acceptanceCriteria.length > 0 ? (
                <div className="space-y-2">
                  {acceptanceCriteria.map((criterion, index) => (
                    <div
                      key={index}
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
                      e.preventDefault()
                      handleAddCriterion()
                    }
                  }}
                />
                <Button type="button" variant="outline" onClick={handleAddCriterion}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add
                </Button>
              </div>
            </div>
          </form>
        </div>

        {/* Sticky footer (outside the scroll area) */}
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
  )
}