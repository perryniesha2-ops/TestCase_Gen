// components/automation/automation-config-dialog.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
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

type ConfigState = {
  automation_framework: string;
  base_url: string;
  automation_notes: string;
};

function normalizeConfig(suite: any): ConfigState {
  return {
    automation_framework: suite?.automation_framework || "playwright",
    base_url: suite?.base_url || "",
    automation_notes: suite?.automation_notes || "",
  };
}

function isSameConfig(a: ConfigState, b: ConfigState): boolean {
  return (
    a.automation_framework === b.automation_framework &&
    (a.base_url || "") === (b.base_url || "") &&
    (a.automation_notes || "") === (b.automation_notes || "")
  );
}

export function AutomationConfigDialog({
  open,
  onOpenChange,
  suite,
  onUpdate,
}: AutomationConfigDialogProps) {
  const [saving, setSaving] = useState(false);

  // Snapshot of suite config when dialog opens (used to detect changes)
  const baseline = useMemo(() => normalizeConfig(suite), [suite]);

  const [config, setConfig] = useState<ConfigState>(baseline);

  // Keep form in sync when the dialog opens or suite changes
  useEffect(() => {
    if (!open) return;
    setConfig(normalizeConfig(suite));
  }, [open, suite]);

  const saveConfig = async () => {
    if (!suite?.id) return;

    setSaving(true);
    try {
      const supabase = createClient();

      const didChange = !isSameConfig(config, baseline);

      const patch: Record<string, any> = {
        automation_framework: config.automation_framework,
        base_url: config.base_url?.trim() ? config.base_url.trim() : null,
        automation_notes: config.automation_notes?.trim()
          ? config.automation_notes.trim()
          : null,
      };

      // Option A: dedicated timestamp for automation-relevant config drift
      if (didChange) {
        patch.automation_config_updated_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from("suites")
        .update(patch)
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
                setConfig((prev) => ({ ...prev, automation_framework: value }))
              }
              disabled={saving}
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
                <SelectItem value="webdriverio">WebdriverIO</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Base URL</Label>
            <Input
              value={config.base_url}
              onChange={(e) =>
                setConfig((prev) => ({ ...prev, base_url: e.target.value }))
              }
              placeholder="https://app.example.com"
              disabled={saving}
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
                setConfig((prev) => ({
                  ...prev,
                  automation_notes: e.target.value,
                }))
              }
              placeholder="Additional notes about automation setup"
              disabled={saving}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
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
