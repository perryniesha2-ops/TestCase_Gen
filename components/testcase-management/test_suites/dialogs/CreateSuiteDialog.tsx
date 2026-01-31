// components/test-suites/dialogs/CreateSuiteDialog.tsx
"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

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
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  CalendarIcon,
  FolderOpen,
  FileCode,
  Layers,
  Loader2,
  Save,
  X,
} from "lucide-react";

import type { SuiteType, Project } from "@/types/test-cases";

interface FormData {
  name: string;
  description: string;
  kind: "regular" | "cross-platform";
  suite_type: SuiteType;
  planned_start_date: string;
  planned_end_date: string;
  project_id: string;
}

interface CreateSuiteDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function CreateSuiteDialog({
  open,
  onClose,
  onSuccess,
}: CreateSuiteDialogProps) {
  const [formData, setFormData] = useState<FormData>({
    name: "",
    description: "",
    kind: "regular",
    suite_type: "manual",
    planned_start_date: "",
    planned_end_date: "",
    project_id: "",
  });

  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [savingSuite, setSavingSuite] = useState(false);

  // Fetch projects when dialog opens
  useEffect(() => {
    if (open) {
      void fetchProjects();
    }
  }, [open]);

  async function fetchProjects() {
    try {
      setLoading(true);
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
      toast.error("Failed to load projects");
    } finally {
      setLoading(false);
    }
  }

  async function createTestSuite() {
    try {
      setSavingSuite(true);
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        toast.error("Please log in again.");
        return;
      }

      const { data, error } = await supabase
        .from("suites")
        .insert({
          user_id: user.id,
          name: formData.name,
          description: formData.description,
          kind: formData.kind,
          suite_type: formData.suite_type,
          planned_start_date: formData.planned_start_date || null,
          planned_end_date: formData.planned_end_date || null,
          project_id: formData.project_id || null,
        })
        .select()
        .single();

      if (error) throw error;

      toast.success(
        `${formData.kind === "cross-platform" ? "Cross-platform" : "Regular"} test suite created successfully`,
      );

      resetForm();
      onSuccess();
      onClose();
    } catch (error) {
      console.error("Error creating test suite:", error);
      toast.error("Failed to create test suite");
    } finally {
      setSavingSuite(false);
    }
  }

  function resetForm() {
    setFormData({
      name: "",
      description: "",
      kind: "regular",
      suite_type: "manual",
      planned_start_date: "",
      planned_end_date: "",
      project_id: "",
    });
  }

  function handleClose() {
    resetForm();
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        className="w-[95vw] sm:max-w-4xl lg:max-w-5xl max-h-[90vh] flex flex-col p-0"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader className="sticky top-0 z-10 bg-background p-6 border-b">
          <div className="flex items-start justify-between">
            <div className="space-y-2 min-w-0">
              <DialogTitle>Create Test Suite</DialogTitle>
              <DialogDescription>
                Organize test cases into suites for better test management.
              </DialogDescription>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full shrink-0"
              onClick={handleClose}
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
          <div className="space-y-2">
            <Label htmlFor="name">Suite Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, name: e.target.value }))
              }
              placeholder="e.g., User Authentication Tests"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  description: e.target.value,
                }))
              }
              placeholder="Brief description of what this suite tests"
              rows={3}
            />
          </div>

          {/* Suite Kind Selection */}
          <div className="space-y-2">
            <Label htmlFor="suite_kind">Suite Kind *</Label>
            <Select
              value={formData.kind}
              onValueChange={(value: "regular" | "cross-platform") =>
                setFormData((prev) => ({ ...prev, kind: value }))
              }
            >
              <SelectTrigger id="suite_kind">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="regular">
                  <div className="flex items-center gap-2">
                    <FileCode className="h-4 w-4" />
                    <div>
                      <div className="font-medium">Regular Suite</div>
                      <div className="text-xs text-muted-foreground">
                        Standard test cases for single platform testing
                      </div>
                    </div>
                  </div>
                </SelectItem>
                <SelectItem value="cross-platform">
                  <div className="flex items-center gap-2">
                    <Layers className="h-4 w-4" />
                    <div>
                      <div className="font-medium">Cross-Platform Suite</div>
                      <div className="text-xs text-muted-foreground">
                        Tests across Web, Mobile, API, and more
                      </div>
                    </div>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {formData.kind === "regular"
                ? "Regular suites contain standard test cases that can be executed manually or automated."
                : "Cross-platform suites contain test cases that span multiple platforms (Web, Mobile, API, etc.) for comprehensive testing."}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="suite_type">Suite Type</Label>
            <Select
              value={formData.suite_type}
              onValueChange={(value: SuiteType) =>
                setFormData((prev) => ({ ...prev, suite_type: value }))
              }
            >
              <SelectTrigger id="suite_type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="manual">Manual Testing</SelectItem>
                <SelectItem value="regression">Regression Testing</SelectItem>
                <SelectItem value="smoke">Smoke Testing</SelectItem>
                <SelectItem value="integration">Integration Testing</SelectItem>
                <SelectItem value="automated">Automated Testing</SelectItem>
              </SelectContent>
            </Select>
          </div>

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
              <SelectTrigger id="project">
                <SelectValue placeholder="Select a project" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">
                  <span className="text-muted-foreground">No Project</span>
                </SelectItem>
                {loading ? (
                  <div className="flex items-center justify-center p-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                ) : (
                  projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      <div className="flex items-center gap-2">
                        <FolderOpen className="h-4 w-4" />
                        {project.name}
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="planned_start_date">Planned Start</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={
                      "w-full justify-start text-left font-normal" +
                      (!formData.planned_start_date
                        ? " text-muted-foreground"
                        : "")
                    }
                    id="planned_start_date"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.planned_start_date ? (
                      new Date(formData.planned_start_date).toLocaleDateString()
                    ) : (
                      <span>Pick a date</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={
                      formData.planned_start_date
                        ? new Date(formData.planned_start_date)
                        : undefined
                    }
                    onSelect={(date) =>
                      setFormData((prev) => ({
                        ...prev,
                        planned_start_date: date ? date.toISOString() : "",
                      }))
                    }
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label htmlFor="planned_end_date">Planned End</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={
                      "w-full justify-start text-left font-normal" +
                      (!formData.planned_end_date
                        ? " text-muted-foreground"
                        : "")
                    }
                    id="planned_end_date"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.planned_end_date ? (
                      new Date(formData.planned_end_date).toLocaleDateString()
                    ) : (
                      <span>Pick a date</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={
                      formData.planned_end_date
                        ? new Date(formData.planned_end_date)
                        : undefined
                    }
                    onSelect={(date) =>
                      setFormData((prev) => ({
                        ...prev,
                        planned_end_date: date ? date.toISOString() : "",
                      }))
                    }
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </div>

        <DialogFooter className="flex-shrink-0 px-6 py-4 border-t">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={savingSuite}
          >
            Cancel
          </Button>
          <Button
            onClick={createTestSuite}
            disabled={!formData.name.trim() || savingSuite}
          >
            {savingSuite ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Create{" "}
                {formData.kind === "cross-platform"
                  ? "Cross-Platform"
                  : ""}{" "}
                Suite
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
