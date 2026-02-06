// components/requirements/link-test-cases-dialog.tsx
"use client";

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

import type { Requirement } from "@/types/requirements";
import { Checkbox } from "@/components/ui/checkbox";

// Platform icons mapping
const platformIcons = {
  web: Monitor,
  mobile: Smartphone,
  api: Globe,
  accessibility: Eye,
  performance: Zap,
};

type TestCaseType = "regular" | "cross-platform";

type UnifiedTestCase = {
  id: string;
  title: string;
  type: TestCaseType;
  test_type?: string; // for regular
  platform?: string; // for cross-platform
  framework?: string; // for cross-platform
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
  // Joined data
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
  const [linkedTestCases, setLinkedTestCases] = useState<LinkedTestCase[]>([]);
  const [allTestCases, setAllTestCases] = useState<UnifiedTestCase[]>([]);
  const [selectedCoverageTypes, setSelectedCoverageTypes] = useState<
    Record<string, string>
  >({});
  const [loading, setLoading] = useState(false);
  const [selectedTestCaseIds, setSelectedTestCaseIds] = useState<Set<string>>(
    new Set(),
  );

  const { user } = useAuth();

  useEffect(() => {
    if (user && open) {
      fetchLinkedTestCases();
      fetchAllTestCases();
    }
  }, [open, requirement.id, user]);

  async function fetchLinkedTestCases() {
    try {
      const supabase = createClient();

      // Fetch links for regular test cases
      const { data: regularLinks, error: regularError } = await supabase
        .from("requirement_test_cases")
        .select(
          `
          id,
          requirement_id,
          test_case_id,
          coverage_type,
          created_at,
          test_cases (
            id,
            title,
            test_type,
            priority,
            status
          )
        `,
        )
        .eq("requirement_id", requirement.id)
        .not("test_cases", "is", null);

      if (regularError) throw regularError;

      // Fetch links for platform test cases
      const { data: platformLinks, error: platformError } = await supabase
        .from("requirement_platform_test_cases")
        .select(
          `
          id,
          requirement_id,
          test_case_id,
          coverage_type,
          created_at,
          platform_test_cases (
            id,
            title,
            platform,
            framework,
            priority,
            status
          )
        `,
        )
        .eq("requirement_id", requirement.id)
        .not("platform_test_cases", "is", null);

      if (platformError) throw platformError;

      // Transform regular links
      const transformedRegular: LinkedTestCase[] = (regularLinks || []).map(
        (link: any) => ({
          id: link.id,
          requirement_id: link.requirement_id,
          test_case_id: link.test_case_id,
          coverage_type: link.coverage_type,
          test_case_type: "regular" as const,
          created_at: link.created_at,
          test_case_title: link.test_cases?.title,
          test_case_test_type: link.test_cases?.test_type,
          test_case_priority: link.test_cases?.priority,
        }),
      );

      // Transform platform links
      const transformedPlatform: LinkedTestCase[] = (platformLinks || []).map(
        (link: any) => ({
          id: link.id,
          requirement_id: link.requirement_id,
          test_case_id: link.test_case_id,
          coverage_type: link.coverage_type,
          test_case_type: "cross-platform" as const,
          created_at: link.created_at,
          test_case_title: link.platform_test_cases?.title,
          test_case_platform: link.platform_test_cases?.platform,
          test_case_framework: link.platform_test_cases?.framework,
          test_case_priority: link.platform_test_cases?.priority,
        }),
      );

      setLinkedTestCases([...transformedRegular, ...transformedPlatform]);
    } catch (error) {
      console.error("Error fetching linked test cases:", error);
    }
  }

  async function fetchAllTestCases() {
    if (!user) return;

    try {
      const supabase = createClient();

      // Fetch regular test cases
      const { data: regularCases, error: regularError } = await supabase
        .from("test_cases")
        .select("id, title, test_type, priority, status")
        .eq("user_id", user.id)
        .neq("status", "archived")
        .order("title");

      if (regularError) throw regularError;

      // Fetch cross-platform test cases
      const { data: platformCases, error: platformError } = await supabase
        .from("platform_test_cases")
        .select("id, title, platform, framework, priority, status")
        .eq("user_id", user.id)
        .neq("status", "archived")
        .order("title");

      if (platformError) throw platformError;

      // Transform to unified format
      const regularUnified: UnifiedTestCase[] = (regularCases || []).map(
        (tc) => ({
          id: tc.id,
          title: tc.title,
          type: "regular" as const,
          test_type: tc.test_type,
          priority: tc.priority,
          status: tc.status,
        }),
      );

      const platformUnified: UnifiedTestCase[] = (platformCases || []).map(
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

      setAllTestCases([...regularUnified, ...platformUnified]);
    } catch (error) {
      console.error("Error fetching test cases:", error);
    }
  }

  async function unlinkTestCase(linkId: string, testCaseType: TestCaseType) {
    try {
      setLoading(true);
      const supabase = createClient();

      const table =
        testCaseType === "regular"
          ? "requirement_test_cases"
          : "requirement_platform_test_cases";

      const { error } = await supabase.from(table).delete().eq("id", linkId);

      if (error) throw error;

      toastSuccess("Test case unlinked");
      await fetchLinkedTestCases();
      onLinked();
    } catch (error) {
      toastError("Failed to unlink test case");
    } finally {
      setLoading(false);
    }
  }

  const availableTestCases = allTestCases.filter(
    (tc) => !linkedTestCases.some((link) => link.test_case_id === tc.id),
  );

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

    const next = new Set(availableTestCases.map((tc) => tc.id));
    setSelectedTestCaseIds(next);

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

  async function linkSelectedTestCases() {
    const ids = Array.from(selectedTestCaseIds);
    if (ids.length === 0) return;

    try {
      setLoading(true);
      const supabase = createClient();

      // Group by type
      const regularIds: string[] = [];
      const platformIds: string[] = [];

      for (const id of ids) {
        const testCase = allTestCases.find((tc) => tc.id === id);
        if (testCase?.type === "regular") {
          regularIds.push(id);
        } else if (testCase?.type === "cross-platform") {
          platformIds.push(id);
        }
      }

      // Insert regular test case links
      if (regularIds.length > 0) {
        const regularPayload = regularIds.map((testCaseId) => ({
          requirement_id: requirement.id,
          test_case_id: testCaseId,
          coverage_type: selectedCoverageTypes[testCaseId] || "direct",
        }));

        const { error: regularError } = await supabase
          .from("requirement_test_cases")
          .insert(regularPayload);

        if (regularError) throw regularError;
      }

      // Insert platform test case links
      if (platformIds.length > 0) {
        const platformPayload = platformIds.map((testCaseId) => ({
          requirement_id: requirement.id,
          test_case_id: testCaseId,
          coverage_type: selectedCoverageTypes[testCaseId] || "direct",
        }));

        const { error: platformError } = await supabase
          .from("requirement_platform_test_cases")
          .insert(platformPayload);

        if (platformError) throw platformError;
      }

      toastSuccess(
        `Linked ${ids.length} test case${ids.length > 1 ? "s" : ""}`,
      );
      await fetchLinkedTestCases();
      onLinked();

      setSelectedTestCaseIds(new Set());
      setSelectedCoverageTypes((prev) => {
        const updated = { ...prev };
        for (const id of ids) delete updated[id];
        return updated;
      });
    } catch (error) {
      console.error("Error linking selected test cases:", error);
      toastError("Failed to link selected test cases");
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
        {/* Header */}
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

        {/* Content */}
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

            {/* Linked Tests Tab */}
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
                          {/* Type Badge */}
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

                          {/* Framework for cross-platform */}
                          {link.test_case_type === "cross-platform" &&
                            link.test_case_framework && (
                              <Badge variant="outline">
                                {link.test_case_framework}
                              </Badge>
                            )}

                          {/* Coverage type */}
                          <Badge variant="outline">
                            {link.coverage_type} coverage
                          </Badge>

                          {/* Type indicator */}
                          <Badge variant="outline" className="capitalize">
                            {link.test_case_type}
                          </Badge>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() =>
                          unlinkTestCase(link.id, link.test_case_type)
                        }
                        disabled={loading}
                      >
                        Unlink
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Available Tests Tab */}
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
                  {/* Bulk actions row */}
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

                  {/* List */}
                  {availableTestCases.map((testCase) => {
                    const selectedType =
                      selectedCoverageTypes[testCase.id] || "direct";
                    const isSelected = selectedTestCaseIds.has(testCase.id);

                    return (
                      <div
                        key={testCase.id}
                        className="flex items-center justify-between gap-4 p-4 border rounded-lg"
                      >
                        {/* Left: checkbox + details */}
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
                              {/* Type Badge */}
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

                              {/* Framework for cross-platform */}
                              {testCase.type === "cross-platform" &&
                                testCase.framework && (
                                  <Badge variant="outline">
                                    {testCase.framework}
                                  </Badge>
                                )}

                              {/* Priority */}
                              <Badge variant="outline">
                                {testCase.priority}
                              </Badge>

                              {/* Type indicator */}
                              <Badge variant="outline" className="capitalize">
                                {testCase.type}
                              </Badge>
                            </div>
                          </div>
                        </div>

                        {/* Right: coverage type select */}
                        <div className="flex items-center gap-2">
                          <Select
                            value={selectedType}
                            onValueChange={(value) => {
                              setSelectedCoverageTypes((prev) => ({
                                ...prev,
                                [testCase.id]: value,
                              }));
                            }}
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
                      </div>
                    );
                  })}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
        <div className="border-t bg-background px-6 py-4">
          <DialogFooter className="gap-2 sm:gap-3">
            <DialogClose asChild>
              <Button variant="outline">Close</Button>
            </DialogClose>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
