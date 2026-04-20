"use client";

// components/requirements/link-test-cases-dialog.tsx

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth/auth-context";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  X,
  Target,
  CheckCircle,
  Link as LinkIcon,
  Monitor,
  Smartphone,
  Globe,
  Eye,
  Zap,
} from "lucide-react";
import { toastSuccess, toastError } from "@/lib/utils/toast-utils";
import { Checkbox } from "@/components/ui/checkbox";
import type { Requirement } from "@/types/requirements";

// ─── Types ────────────────────────────────────────────────────────────────────

type TestCaseType = "regular" | "cross-platform";

const platformIcons = {
  web: Monitor,
  mobile: Smartphone,
  api: Globe,
  accessibility: Eye,
  performance: Zap,
};

type UnifiedTestCase = {
  id: string;
  title: string;
  type: TestCaseType;
  test_type?: string;
  platform?: string;
  framework?: string;
  priority: string;
  status: string;
};

type LinkedTestCase = {
  id: string;
  requirement_id: string;
  test_case_id: string;
  coverage_type: string;
  test_case_type: TestCaseType;
  created_at: string;
  test_case_title?: string;
  test_case_test_type?: string;
  test_case_platform?: string;
  test_case_framework?: string;
  test_case_priority?: string;
};

interface LinkTestCasesDialogProps {
  requirement: Requirement;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLinked: () => void;
}

export function LinkTestCasesDialog({
  requirement,
  open,
  onOpenChange,
  onLinked,
}: LinkTestCasesDialogProps) {
  const { user } = useAuth();
  const [linkedTestCases, setLinkedTestCases] = useState<LinkedTestCase[]>([]);
  const [allTestCases, setAllTestCases] = useState<UnifiedTestCase[]>([]);
  const [selectedCoverageTypes, setSelectedCoverageTypes] = useState<
    Record<string, string>
  >({});
  const [loading, setLoading] = useState(false);
  const [selectedTestCaseIds, setSelectedTestCaseIds] = useState<Set<string>>(
    new Set(),
  );

  useEffect(() => {
    if (open && user) {
      void fetchLinkedTestCases();
      void fetchAllTestCases();
    }
  }, [open, requirement.id, user]);

  // ── Linked test cases via API route ──────────────────────────────────────

  async function fetchLinkedTestCases() {
    try {
      const res = await fetch(`/api/requirements/${requirement.id}/links`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error("Failed to load links");
      const payload = await res.json();
      setLinkedTestCases(payload?.links ?? []);
    } catch (error) {
      console.error("[LinkTestCasesDialog] fetchLinkedTestCases error:", error);
    }
  }

  // ── All test cases via Supabase directly ─────────────────────────────────
  // Kept as direct Supabase — no unified API route exists for both
  // regular and platform test cases. RLS scopes to current user.

  async function fetchAllTestCases() {
    if (!user) return;
    try {
      const supabase = createClient();
      const [regularRes, platformRes] = await Promise.all([
        supabase
          .from("test_cases")
          .select("id, title, test_type, priority, status")
          .eq("user_id", user.id)
          .neq("status", "archived")
          .order("title"),
        supabase
          .from("platform_test_cases")
          .select("id, title, platform, framework, priority, status")
          .eq("user_id", user.id)
          .neq("status", "archived")
          .order("title"),
      ]);

      const regular: UnifiedTestCase[] = (regularRes.data ?? []).map((tc) => ({
        id: tc.id,
        title: tc.title,
        type: "regular" as const,
        test_type: tc.test_type,
        priority: tc.priority,
        status: tc.status,
      }));

      const platform: UnifiedTestCase[] = (platformRes.data ?? []).map(
        (tc) => ({
          id: tc.id,
          title: tc.title,
          type: "cross-platform" as const,
          platform: tc.platform,
          framework: tc.framework,
          priority: tc.priority,
          status: tc.status,
        }),
      );

      setAllTestCases([...regular, ...platform]);
    } catch (error) {
      console.error("[LinkTestCasesDialog] fetchAllTestCases error:", error);
    }
  }

  // ── Unlink — delete then refresh both lists so case reappears ────────────

  async function unlinkTestCase(linkId: string) {
    try {
      setLoading(true);
      const res = await fetch(
        `/api/requirements/${requirement.id}/links/${linkId}`,
        { method: "DELETE" },
      );
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload?.error ?? "Failed to unlink");
      }
      toastSuccess("Test case unlinked");
      // Refresh both so the case reappears in the available list
      await Promise.all([fetchLinkedTestCases(), fetchAllTestCases()]);
      onLinked();
    } catch (error: any) {
      toastError(error?.message ?? "Failed to unlink test case");
    } finally {
      setLoading(false);
    }
  }

  // ── Available = all minus linked ──────────────────────────────────────────

  const availableTestCases = allTestCases.filter(
    (tc) => !linkedTestCases.some((link) => link.test_case_id === tc.id),
  );

  // ── Selection ─────────────────────────────────────────────────────────────

  function toggleSelected(id: string, checked: boolean) {
    setSelectedTestCaseIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
    if (checked) {
      setSelectedCoverageTypes((prev) => ({
        ...prev,
        [id]: prev[id] ?? "direct",
      }));
    }
  }

  function setAllSelected(checked: boolean) {
    if (!checked) {
      setSelectedTestCaseIds(new Set());
      return;
    }
    setSelectedTestCaseIds(new Set(availableTestCases.map((tc) => tc.id)));
    setSelectedCoverageTypes((prev) => {
      const updated = { ...prev };
      for (const tc of availableTestCases) {
        if (!updated[tc.id]) updated[tc.id] = "direct";
      }
      return updated;
    });
  }

  const allSelected =
    availableTestCases.length > 0 &&
    selectedTestCaseIds.size === availableTestCases.length;
  const someSelected =
    selectedTestCaseIds.size > 0 &&
    selectedTestCaseIds.size < availableTestCases.length;

  // ── Link selected via POST route ──────────────────────────────────────────

  async function linkSelectedTestCases() {
    const ids = Array.from(selectedTestCaseIds);
    if (ids.length === 0) return;
    try {
      setLoading(true);
      const payload = ids.map((testCaseId) => {
        const tc = allTestCases.find((t) => t.id === testCaseId);
        return {
          test_case_id: testCaseId,
          test_case_type: tc?.type ?? "regular",
          coverage_type: selectedCoverageTypes[testCaseId] ?? "direct",
        };
      });

      const res = await fetch(`/api/requirements/${requirement.id}/links`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ links: payload }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error ?? "Failed to link");
      }

      toastSuccess(
        `Linked ${ids.length} test case${ids.length > 1 ? "s" : ""}`,
      );
      await Promise.all([fetchLinkedTestCases(), fetchAllTestCases()]);
      onLinked();
      setSelectedTestCaseIds(new Set());
      setSelectedCoverageTypes((prev) => {
        const updated = { ...prev };
        for (const id of ids) delete updated[id];
        return updated;
      });
    } catch (error: any) {
      console.error(
        "[LinkTestCasesDialog] linkSelectedTestCases error:",
        error,
      );
      toastError(error?.message ?? "Failed to link selected test cases");
    } finally {
      setLoading(false);
    }
  }

  function getTestCaseIcon(testCase: UnifiedTestCase) {
    if (testCase.type === "cross-platform" && testCase.platform) {
      const Icon =
        platformIcons[testCase.platform as keyof typeof platformIcons];
      return Icon ? <Icon className="h-3 w-3" /> : null;
    }
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="w-[95vw] sm:max-w-4xl lg:max-w-5xl max-h-[90vh] flex flex-col p-0"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader className="sticky top-0 z-10 bg-background px-6 py-4 border-b">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <DialogTitle>Link Test Cases</DialogTitle>
              <DialogDescription>
                Manage test case links for:{" "}
                <span className="font-medium">{requirement.title}</span>
              </DialogDescription>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full shrink-0"
              onClick={() => onOpenChange(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          <Tabs defaultValue="linked" className="w-full">
            <div className="px-6 pt-4">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="linked">
                  Linked Tests ({linkedTestCases.length})
                </TabsTrigger>
                <TabsTrigger value="available">
                  Available Tests ({availableTestCases.length})
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="linked" className="px-6 py-4 space-y-4">
              {linkedTestCases.length === 0 ? (
                <div className="text-center py-8">
                  <Target className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-muted-foreground">
                    No test cases linked yet
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {linkedTestCases.map((link) => (
                    <div
                      key={link.id}
                      className="flex items-center justify-between gap-4 p-4 border rounded-lg"
                    >
                      <div className="flex-1 space-y-1">
                        <div className="font-medium">
                          {link.test_case_title || "Unknown Test"}
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge
                            variant={
                              link.test_case_type === "regular"
                                ? "secondary"
                                : "default"
                            }
                          >
                            {link.test_case_type === "regular"
                              ? link.test_case_test_type
                              : link.test_case_platform}
                          </Badge>
                          {link.test_case_type === "cross-platform" &&
                            link.test_case_framework && (
                              <Badge variant="outline">
                                {link.test_case_framework}
                              </Badge>
                            )}
                          <Badge variant="outline">
                            {link.coverage_type} coverage
                          </Badge>
                          <Badge variant="outline" className="capitalize">
                            {link.test_case_type}
                          </Badge>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => unlinkTestCase(link.id)}
                        disabled={loading}
                      >
                        Unlink
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="available" className="px-6 py-4 space-y-4">
              {availableTestCases.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-muted-foreground">
                    {allTestCases.length === 0
                      ? "No test cases created yet. Create test cases first."
                      : "All test cases are already linked"}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3 p-3 border rounded-lg bg-muted/30">
                    <div className="flex items-center gap-3">
                      <Checkbox
                        checked={
                          allSelected
                            ? true
                            : someSelected
                              ? "indeterminate"
                              : false
                        }
                        onCheckedChange={(v) => setAllSelected(Boolean(v))}
                        disabled={loading}
                      />
                      <span className="text-sm text-muted-foreground">
                        {selectedTestCaseIds.size > 0
                          ? `${selectedTestCaseIds.size} selected`
                          : "Select test cases to link"}
                      </span>
                    </div>
                    <Button
                      size="sm"
                      onClick={linkSelectedTestCases}
                      disabled={loading || selectedTestCaseIds.size === 0}
                    >
                      <LinkIcon className="h-4 w-4 mr-2" />
                      Link Selected
                    </Button>
                  </div>

                  {availableTestCases.map((testCase) => {
                    const isSelected = selectedTestCaseIds.has(testCase.id);
                    return (
                      <div
                        key={testCase.id}
                        className="flex items-center justify-between gap-4 p-4 border rounded-lg"
                      >
                        <div className="flex items-start gap-3 flex-1">
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={(v) =>
                              toggleSelected(testCase.id, Boolean(v))
                            }
                            disabled={loading}
                            className="mt-1"
                          />
                          <div className="space-y-1">
                            <div className="font-medium">{testCase.title}</div>
                            <div className="flex flex-wrap items-center gap-2">
                              {testCase.type === "regular" ? (
                                <Badge variant="secondary">
                                  {testCase.test_type}
                                </Badge>
                              ) : (
                                <Badge variant="default" className="gap-1">
                                  {getTestCaseIcon(testCase)}
                                  {testCase.platform}
                                </Badge>
                              )}
                              {testCase.type === "cross-platform" &&
                                testCase.framework && (
                                  <Badge variant="outline">
                                    {testCase.framework}
                                  </Badge>
                                )}
                              <Badge variant="outline">
                                {testCase.priority}
                              </Badge>
                              <Badge variant="outline" className="capitalize">
                                {testCase.type}
                              </Badge>
                            </div>
                          </div>
                        </div>
                        <Select
                          value={selectedCoverageTypes[testCase.id] ?? "direct"}
                          onValueChange={(value) =>
                            setSelectedCoverageTypes((prev) => ({
                              ...prev,
                              [testCase.id]: value,
                            }))
                          }
                          disabled={loading || !isSelected}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="direct">Direct</SelectItem>
                            <SelectItem value="indirect">Indirect</SelectItem>
                            <SelectItem value="negative">Negative</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    );
                  })}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>

        <div className="border-t bg-background px-6 py-4">
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Close</Button>
            </DialogClose>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
