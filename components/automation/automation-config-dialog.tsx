// components/automation/automation-config-dialog.tsx
"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Save } from "lucide-react";

interface AutomationConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  suite: any;
  onUpdate: () => void;
}

export function AutomationConfigDialog({
  open,
  onOpenChange,
  suite,
  onUpdate,
}: AutomationConfigDialogProps) {
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState({
    automation_framework: suite?.automation_framework || "playwright",
    base_url: suite?.base_url || "",
    automation_notes: suite?.automation_notes || "",
  });

  const saveConfig = async () => {
    setSaving(true);
    try {
      const supabase = createClient();

      const { error } = await supabase
        .from("suites")
        .update({
          automation_framework: config.automation_framework,
          base_url: config.base_url || null,
          automation_notes: config.automation_notes || null,
        })
        .eq("id", suite.id);

      if (error) throw error;

      toast.success("Configuration saved");
      onUpdate();
      onOpenChange(false);
    } catch (error) {
      console.error("Save error:", error);
      toast.error("Failed to save configuration");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Automation Configuration</DialogTitle>
          <DialogDescription>
            Configure automation settings for this suite
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Framework</Label>
            <Select
              value={config.automation_framework}
              onValueChange={(value) =>
                setConfig({ ...config, automation_framework: value })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="playwright">Playwright</SelectItem>
                <SelectItem value="cypress">Cypress</SelectItem>
                <SelectItem value="selenium">Selenium</SelectItem>
                <SelectItem value="puppeteer">Puppeteer</SelectItem>
                <SelectItem value="testcafe">TestCafe</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Base URL</Label>
            <Input
              value={config.base_url}
              onChange={(e) =>
                setConfig({ ...config, base_url: e.target.value })
              }
              placeholder="https://app.example.com"
            />
            <p className="text-xs text-muted-foreground">
              Base URL for your application under test
            </p>
          </div>

          <div className="space-y-2">
            <Label>Notes (Optional)</Label>
            <Input
              value={config.automation_notes}
              onChange={(e) =>
                setConfig({ ...config, automation_notes: e.target.value })
              }
              placeholder="Additional notes about automation setup"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={saveConfig} disabled={saving} className="gap-2">
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
