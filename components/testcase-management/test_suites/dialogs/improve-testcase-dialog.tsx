"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Badge } from "@/components/ui/badge";

type ImproveStyle = "concise" | "detailed";

type ImproveResult = {
  success: boolean;
  test_case_id: string;
  updated: {
    preconditions: string | null;
    expected_result: string;
    test_steps: { step_number: number; action: string; expected: string }[];
    notes?: string[];
  };
};

export function ImproveTestCaseDialog({
  open,
  onOpenChange,
  testCaseId,
  defaultApplicationUrl,
  onImproved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  testCaseId: string | null;
  defaultApplicationUrl?: string;
  onImproved?: (testCaseId: string) => void;
}) {
  const [style, setStyle] = useState<ImproveStyle>("detailed");
  const [applicationUrl, setApplicationUrl] = useState(
    defaultApplicationUrl ?? ""
  );
  const [loading, setLoading] = useState(false);
  const [notes, setNotes] = useState<string[]>([]);

  useEffect(() => {
    if (!open) {
      setLoading(false);
      setNotes([]);
    }
  }, [open]);

  const canRun = useMemo(
    () => Boolean(testCaseId) && !loading,
    [testCaseId, loading]
  );

  async function runImprove() {
    if (!testCaseId) return;

    setLoading(true);
    setNotes([]);

    try {
      const res = await fetch(`/api/test-cases/${testCaseId}/improve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({
          application_url: applicationUrl.trim() || undefined,
          style,
        }),
      });

      const raw = await res.text();
      let payload: any = null;
      try {
        payload = raw ? JSON.parse(raw) : null;
      } catch {
        // non-json
      }

      if (!res.ok) {
        const msg =
          payload?.error || `Improve failed (${res.status} ${res.statusText})`;
        toast.error(msg);
        return;
      }

      const data = payload as ImproveResult;
      toast.success("Test case improved");

      setNotes(data.updated?.notes ?? []);

      // Let parent refresh triage / re-fetch test case
      onImproved?.(testCaseId);

      // Close after success (or keep open if you prefer)
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.message ?? "Improve failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>AI Improve</DialogTitle>
          <DialogDescription>
            Refine steps and expected results so the test case is more
            automation-ready.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Application URL (optional)</Label>
            <Input
              value={applicationUrl}
              onChange={(e) => setApplicationUrl(e.target.value)}
              placeholder="https://app.yoursite.com"
            />
          </div>

          <div className="space-y-2">
            <Label>Style</Label>
            <Select
              value={style}
              onValueChange={(v: ImproveStyle) => setStyle(v)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="concise">Concise</SelectItem>
                <SelectItem value="detailed">Detailed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {notes.length > 0 && (
            <div className="rounded-lg border p-3">
              <div className="text-sm font-medium mb-2">Notes</div>
              <div className="space-y-2 text-sm text-muted-foreground">
                {notes.map((n, i) => (
                  <div key={i} className="flex gap-2">
                    <Badge variant="secondary" className="text-xs">
                      AI
                    </Badge>
                    <span>{n}</span>
                  </div>
                ))}
              </div>
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
          <Button onClick={runImprove} disabled={!canRun} className="gap-2">
            {loading ? "Improving..." : "Improve now"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
