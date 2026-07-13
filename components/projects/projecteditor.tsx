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
import { ProjectStatus, ProjectColor, ProjectFormData } from "@/types/projects";

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

// Solid color swatches for the picker — these are intentionally opaque
// so they look correct in both light and dark mode.
const colorSwatches: Record<ProjectColor, string> = {
  blue: "bg-blue-500",
  green: "bg-emerald-500",
  purple: "bg-purple-500",
  orange: "bg-orange-500",
  red: "bg-rose-500",
  pink: "bg-pink-500",
  indigo: "bg-indigo-500",
  yellow: "bg-amber-500",
  gray: "bg-slate-400",
};

export function ProjectEditorDialog({
  open,
  mode,
  loading,
  formData,
  setFormData,
  onSave,
  onCancel,
  projectIcons,
}: ProjectEditorDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onCancel()}>
      <DialogContent
        className="w-[95vw] sm:max-w-2xl max-h-[90vh] flex flex-col p-0 border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900"
        onInteractOutside={(e) => e.preventDefault()}
      >
        {/* Header */}
        <DialogHeader className="sticky top-0 z-10 border-b border-slate-100 bg-white px-6 py-4 dark:border-slate-800 dark:bg-slate-900">
          <DialogTitle className="text-slate-800 dark:text-slate-100">
            {mode === "edit" ? "Edit Project" : "Create New Project"}
          </DialogTitle>
          <DialogDescription className="text-slate-500 dark:text-slate-400">
            {mode === "edit"
              ? "Update your project details"
              : "Create a new project to organize your work"}
          </DialogDescription>
        </DialogHeader>

        {/* Body */}
        <div className="overflow-y-auto px-6 py-5 space-y-6">
          {/* Name */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-slate-600 dark:text-slate-400">
              Project Name <span className="text-rose-500">*</span>
            </Label>
            <Input
              value={formData.name}
              onChange={(e) =>
                setFormData((p) => ({ ...p, name: e.target.value }))
              }
              placeholder="e.g. Payment Gateway v2"
              className="border-slate-200 bg-white text-slate-800 placeholder:text-slate-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500"
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-slate-600 dark:text-slate-400">
              Description
            </Label>
            <Textarea
              rows={3}
              value={formData.description}
              onChange={(e) =>
                setFormData((p) => ({ ...p, description: e.target.value }))
              }
              placeholder="What is this project about?"
              className="border-slate-200 bg-white text-slate-800 placeholder:text-slate-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500"
            />
          </div>

          {/* Status + Icon */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-600 dark:text-slate-400">
                Status
              </Label>
              <Select
                value={formData.status}
                onValueChange={(v) =>
                  setFormData((p) => ({ ...p, status: v as ProjectStatus }))
                }
              >
                <SelectTrigger className="border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="on_hold">On Hold</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-600 dark:text-slate-400">
                Icon
              </Label>
              <Select
                value={formData.icon}
                onValueChange={(v) => setFormData((p) => ({ ...p, icon: v }))}
              >
                <SelectTrigger className="border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
                  {Object.entries(projectIcons).map(([key, Icon]) => (
                    <SelectItem key={key} value={key}>
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4" />
                        <span className="capitalize">{key}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Color picker */}
          <div className="space-y-2">
            <Label className="text-xs font-medium text-slate-600 dark:text-slate-400">
              Color
            </Label>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(colorSwatches) as ProjectColor[]).map((color) => (
                <button
                  key={color}
                  type="button"
                  title={color}
                  onClick={() => setFormData((p) => ({ ...p, color }))}
                  className={`h-8 w-8 rounded-full transition ${colorSwatches[color]} ${
                    formData.color === color
                      ? "ring-2 ring-offset-2 ring-slate-400 dark:ring-slate-300 dark:ring-offset-slate-900 scale-110"
                      : "opacity-70 hover:opacity-100"
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-600 dark:text-slate-400">
                Start Date
              </Label>
              <Input
                type="date"
                value={formData.start_date}
                onChange={(e) =>
                  setFormData((p) => ({ ...p, start_date: e.target.value }))
                }
                className="border-slate-200 bg-white text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-600 dark:text-slate-400">
                Target End Date
              </Label>
              <Input
                type="date"
                value={formData.target_end_date}
                onChange={(e) =>
                  setFormData((p) => ({
                    ...p,
                    target_end_date: e.target.value,
                  }))
                }
                className="border-slate-200 bg-white text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-100 bg-white px-6 py-4 dark:border-slate-800 dark:bg-slate-900">
          <DialogFooter className="gap-2 sm:gap-3">
            <button
              onClick={onCancel}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-slate-600"
            >
              Cancel
            </button>
            <button
              onClick={onSave}
              disabled={loading || !formData.name.trim()}
              className="flex items-center gap-2 rounded-xl border border-cyan-500/40 bg-cyan-50 px-4 py-2 text-sm font-medium text-cyan-700 transition hover:bg-cyan-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-cyan-400/40 dark:bg-cyan-400/10 dark:text-cyan-300 dark:hover:bg-cyan-400/20"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Saving…
                </>
              ) : mode === "edit" ? (
                "Update Project"
              ) : (
                "Create Project"
              )}
            </button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
