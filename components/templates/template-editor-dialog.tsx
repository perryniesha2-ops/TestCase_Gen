"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";

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

import {
  TestTypeMultiselect,
  type CanonicalTestType,
} from "@/components/generator/testtype-multiselect";
import { ProjectSelect } from "@/components/projects/project-select";

type TemplateCategory =
  | "functional"
  | "security"
  | "performance"
  | "integration"
  | "regression"
  | "accessibility"
  | "other";

type TemplateContent = {
  model: string;
  testCaseCount: number;
  includeEdgeCases?: boolean;
  includeNegativeTests?: boolean;
};

export type TemplateFormData = {
  name: string;
  description: string;
  category: TemplateCategory;
  model: string;
  testCaseCount: number;
  includeEdgeCases: boolean;
  includeNegativeTests: boolean;
  test_types: CanonicalTestType[];
  project_id: string | null;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;

  mode: "create" | "edit";
  saving: boolean;

  formData: TemplateFormData;
  setFormData: React.Dispatch<React.SetStateAction<TemplateFormData>>;

  onSave: () => void;
  onCancel: () => void;
};

export function TemplateEditorDialog({
  open,
  onOpenChange,
  mode,
  saving,
  formData,
  setFormData,
  onSave,
  onCancel,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:max-w-3xl lg:max-w-4xl max-h-[90vh] p-0 overflow-hidden">
        <DialogHeader className="px-6 py-4 border-b sticky top-0 bg-background z-10">
          <DialogTitle>
            {mode === "edit" ? "Edit Template" : "Create New Template"}
          </DialogTitle>
          <DialogDescription>
            {mode === "edit"
              ? "Update your template settings"
              : "Save your test generation preferences as a reusable template"}
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 py-5 overflow-y-auto max-h-[calc(90vh-152px)] space-y-8">
          <section className="space-y-4">
            <h4 className="text-sm font-semibold text-muted-foreground">
              Basic Information
            </h4>

            <div className="space-y-2">
              <Label htmlFor="name">Template Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData((p) => ({ ...p, name: e.target.value }))
                }
                placeholder="e.g., API Security Tests"
                maxLength={100}
                disabled={saving}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData((p) => ({ ...p, description: e.target.value }))
                }
                placeholder="Describe when to use this template..."
                rows={3}
                maxLength={500}
                disabled={saving}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 items-start">
              <div className="space-y-2">
                <Label>Category *</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) =>
                    setFormData((p) => ({
                      ...p,
                      category: value as TemplateCategory,
                    }))
                  }
                  disabled={saving}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="min-w-[var(--radix-select-trigger-width)]">
                    <SelectItem value="functional">Functional</SelectItem>
                    <SelectItem value="security">Security</SelectItem>
                    <SelectItem value="performance">Performance</SelectItem>
                    <SelectItem value="integration">Integration</SelectItem>
                    <SelectItem value="regression">Regression</SelectItem>
                    <SelectItem value="accessibility">Accessibility</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <div className="w-full">
                  <ProjectSelect
                    value={formData.project_id ?? undefined}
                    disabled={saving}
                    onSelect={(p) =>
                      setFormData((prev) => ({
                        ...prev,
                        project_id: p?.id ?? null,
                      }))
                    }
                  />
                </div>
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <h4 className="text-sm font-semibold text-muted-foreground">
              Generation Settings
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
              <div className="space-y-2">
                <Label>AI Model</Label>
                <Select
                  value={formData.model}
                  onValueChange={(value) =>
                    setFormData((p) => ({ ...p, model: value }))
                  }
                  disabled={saving}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="min-w-[var(--radix-select-trigger-width)]">
                    <SelectItem value="claude-sonnet-4-5">
                      Claude Sonnet 4.5 (Recommended)
                    </SelectItem>
                    <SelectItem value="claude-haiku-4-5">
                      Claude Haiku 4.5 (Fast)
                    </SelectItem>
                    <SelectItem value="claude-opus-4-5">
                      Claude Opus 4.5 (Max Quality)
                    </SelectItem>
                    <SelectItem value="gpt-5-mini">GPT-5 Mini</SelectItem>
                    <SelectItem value="gpt-5.2">GPT-5.2</SelectItem>
                    <SelectItem value="gpt-4o">GPT-4o</SelectItem>
                    <SelectItem value="gpt-4o-mini">GPT-4o Mini</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Number of Test Cases</Label>
                <Select
                  value={String(formData.testCaseCount)}
                  onValueChange={(value) =>
                    setFormData((p) => ({
                      ...p,
                      testCaseCount: Number(value),
                    }))
                  }
                  disabled={saving}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="min-w-[var(--radix-select-trigger-width)]">
                    <SelectItem value="5">5 test cases</SelectItem>
                    <SelectItem value="10">10 test cases</SelectItem>
                    <SelectItem value="15">15 test cases</SelectItem>
                    <SelectItem value="20">20 test cases</SelectItem>
                    <SelectItem value="30">30 test cases</SelectItem>
                    <SelectItem value="50">50 test cases</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Test Types</Label>

              <TestTypeMultiselect
                value={formData.test_types}
                onChange={(next) =>
                  setFormData((p) => ({ ...p, test_types: next }))
                }
                disabled={saving}
                placeholder="Select test types..."
              />

              <p className="text-xs text-muted-foreground">
                Choose which kinds of tests to generate when this template is
                used.
              </p>
            </div>
          </section>
        </div>

        <DialogFooter className="px-6 py-4 border-t bg-background sticky bottom-0 z-10">
          <Button variant="outline" onClick={onCancel} disabled={saving}>
            Cancel
          </Button>

          <Button onClick={onSave} disabled={saving || !formData.name.trim()}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : mode === "edit" ? (
              "Update Template"
            ) : (
              "Create Template"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
