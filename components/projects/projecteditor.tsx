"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { Loader2 } from "lucide-react";

type ProjectStatus = "active" | "archived" | "completed" | "on_hold";
type ProjectColor =
  | "blue"
  | "green"
  | "purple"
  | "orange"
  | "red"
  | "pink"
  | "indigo"
  | "yellow"
  | "gray";

export interface ProjectFormData {
  name: string;
  description: string;
  status: ProjectStatus;
  color: ProjectColor;
  icon: string;
  start_date: string;
  target_end_date: string;
}

interface ProjectEditorDialogProps {
  open: boolean;
  mode: "create" | "edit";
  loading?: boolean;
  formData: ProjectFormData;
  setFormData: React.Dispatch<React.SetStateAction<ProjectFormData>>;
  onSave: () => void;
  onCancel: () => void;
  projectIcons: Record<string, React.ComponentType<{ className?: string }>>;
  colorClasses: Record<ProjectColor, { bg: string }>;
}

export function ProjectEditorDialog({
  open,
  mode,
  loading,
  formData,
  setFormData,
  onSave,
  onCancel,
  projectIcons,
  colorClasses,
}: ProjectEditorDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onCancel()}>
      <DialogContent
        className="
          w-[95vw] sm:max-w-3xl lg:max-w-4xl
          max-h-[90vh] p-0 overflow-hidden
        "
      >
        <DialogHeader className="px-6 py-4 border-b sticky top-0 bg-background z-10">
          <DialogTitle>
            {mode === "edit" ? "Edit Project" : "Create New Project"}
          </DialogTitle>
          <DialogDescription>
            {mode === "edit"
              ? "Update your project details"
              : "Create a new project to organize your work"}
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 py-5 overflow-y-auto max-h-[calc(90vh-152px)] space-y-8">
          <div className="space-y-2">
            <Label>Project Name *</Label>
            <Input
              value={formData.name}
              onChange={(e) =>
                setFormData((p) => ({ ...p, name: e.target.value }))
              }
            />
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              rows={3}
              value={formData.description}
              onChange={(e) =>
                setFormData((p) => ({ ...p, description: e.target.value }))
              }
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={formData.status}
                onValueChange={(v) =>
                  setFormData((p) => ({
                    ...p,
                    status: v as ProjectStatus,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="on_hold">On Hold</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Icon</Label>
              <Select
                value={formData.icon}
                onValueChange={(v) => setFormData((p) => ({ ...p, icon: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(projectIcons).map(([key, Icon]) => (
                    <SelectItem key={key} value={key}>
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4" />
                        {key}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Color</Label>
            <div className="flex gap-2 flex-wrap">
              {(Object.keys(colorClasses) as ProjectColor[]).map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setFormData((p) => ({ ...p, color }))}
                  className={`w-9 h-9 rounded-full ${colorClasses[color].bg} ${
                    formData.color === color
                      ? "ring-2 ring-offset-2 ring-primary"
                      : ""
                  }`}
                />
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Input
                type="date"
                value={formData.start_date}
                onChange={(e) =>
                  setFormData((p) => ({
                    ...p,
                    start_date: e.target.value,
                  }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label>Target End Date</Label>
              <Input
                type="date"
                value={formData.target_end_date}
                onChange={(e) =>
                  setFormData((p) => ({
                    ...p,
                    target_end_date: e.target.value,
                  }))
                }
              />
            </div>
          </div>
        </div>

        <DialogFooter className="px-6 py-4 border-t bg-background sticky bottom-0 z-10">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={onSave} disabled={loading || !formData.name.trim()}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving…
              </>
            ) : mode === "edit" ? (
              "Update Project"
            ) : (
              "Create Project"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
