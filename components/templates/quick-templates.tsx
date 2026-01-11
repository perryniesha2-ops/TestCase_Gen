"use client";

import { useState } from "react";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Save, Loader2 } from "lucide-react";

type TemplateCategory =
  | "functional"
  | "security"
  | "performance"
  | "integration"
  | "regression"
  | "accessibility"
  | "other";

interface QuickTemplateSaveProps {
  currentSettings: {
    model: string;
    testCaseCount: number;
    coverage: string;
  };
  onTemplateSaved?: () => void;
  children?: React.ReactNode;
}

export function QuickTemplateSave({
  currentSettings,
  onTemplateSaved,
  children,
}: QuickTemplateSaveProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    category: "functional" as TemplateCategory,
  });

  async function handleSave() {
    if (!formData.name.trim()) {
      toast.error("Please enter a template name");
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        toast.error("Please sign in to save templates");
        return;
      }

      const templateContent = {
        model: currentSettings.model,
        testCaseCount: currentSettings.testCaseCount,
        coverage: currentSettings.coverage,
        includeEdgeCases: true,
        includeNegativeTests: true,
      };

      const { error } = await supabase.from("test_case_templates").insert({
        user_id: user.id,
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        category: formData.category,
        template_content: templateContent,
        is_public: false,
        is_favorite: false,
      });

      if (error) throw error;

      toast.success("Template saved successfully!");
      setOpen(false);
      setFormData({ name: "", description: "", category: "functional" });
      onTemplateSaved?.();
    } catch (error) {
      console.error("Error saving template:", error);
      toast.error("Failed to save template");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button type="button" variant="outline" size="sm">
            <Save className="h-4 w-4 mr-2" />
            Save as Template
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Save Current Settings as Template</DialogTitle>
          <DialogDescription>
            Create a reusable template with your current configuration
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Preview current settings */}
          <div className="rounded-lg bg-muted p-3 space-y-2 text-sm">
            <div className="font-medium text-xs text-muted-foreground mb-2">
              Current Settings:
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Model:</span>
              <span className="font-medium">
                {currentSettings.model.includes("claude") ? "Claude" : "GPT"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Test Cases:</span>
              <span className="font-medium">
                {currentSettings.testCaseCount}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Coverage:</span>
              <span className="font-medium capitalize">
                {currentSettings.coverage}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="template-name">Template Name *</Label>
            <Input
              id="template-name"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              placeholder="e.g., My API Tests"
              maxLength={100}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="template-description">Description</Label>
            <Textarea
              id="template-description"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              placeholder="Describe when to use this template..."
              rows={2}
              maxLength={500}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="template-category">Category</Label>
            <Select
              value={formData.category}
              onValueChange={(value) =>
                setFormData({
                  ...formData,
                  category: value as TemplateCategory,
                })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="functional">Functional Testing</SelectItem>
                <SelectItem value="security">Security Testing</SelectItem>
                <SelectItem value="performance">Performance Testing</SelectItem>
                <SelectItem value="integration">Integration Testing</SelectItem>
                <SelectItem value="regression">Regression Testing</SelectItem>
                <SelectItem value="accessibility">
                  Accessibility Testing
                </SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setOpen(false);
              setFormData({
                name: "",
                description: "",
                category: "functional",
              });
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={loading || !formData.name.trim()}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Template
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
