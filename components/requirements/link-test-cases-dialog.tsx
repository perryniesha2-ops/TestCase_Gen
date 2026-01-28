// components/requirements/link-test-cases-dialog.tsx
"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth/auth-context";
import { toast } from "sonner";
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
import { X, Target, CheckCircle, Link as LinkIcon } from "lucide-react";
import type {
  Requirement,
  TestCase,
  RequirementTestCase,
} from "@/types/requirements";
import { Checkbox } from "@/components/ui/checkbox";

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
  const [linkedTestCases, setLinkedTestCases] = useState<RequirementTestCase[]>(
    [],
  );
  const [allTestCases, setAllTestCases] = useState<TestCase[]>([]);
  const [selectedCoverageTypes, setSelectedCoverageTypes] = useState<
    Record<string, string>
  >({});
  const [loading, setLoading] = useState(false);
  const [selectedTestCaseIds, setSelectedTestCaseIds] = useState<Set<string>>(
    new Set(),
  );

  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      if (open) {
        fetchLinkedTestCases();
        fetchAllTestCases();
      }
    }
  }, [open, requirement.id, user]);

  async function fetchLinkedTestCases() {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("requirement_test_cases")
        .select(
          `
          *,
          test_cases(id, title, test_type, priority, status)
        `,
        )
        .eq("requirement_id", requirement.id);

      if (error) throw error;
      setLinkedTestCases(data || []);
    } catch (error) {
      console.error("Error fetching linked test cases:", error);
    }
  }

  async function fetchAllTestCases() {
    if (!user) return;

    try {
      const supabase = createClient();

      const { data, error } = await supabase
        .from("test_cases")
        .select(
          "id, title, test_type, priority, status, created_at, updated_at",
        )
        .eq("user_id", user.id)
        .order("title");

      if (error) throw error;
      setAllTestCases(data || []);
    } catch (error) {
      console.error("Error fetching test cases:", error);
    }
  }

  async function linkTestCase(testCaseId: string, coverageType: string) {
    try {
      setLoading(true);
      const supabase = createClient();

      const { error } = await supabase.from("requirement_test_cases").insert({
        requirement_id: requirement.id,
        test_case_id: testCaseId,
        coverage_type: coverageType,
      });

      if (error) throw error;

      toast.success("Test case linked successfully");
      await fetchLinkedTestCases();
      onLinked();

      // Clear selection
      setSelectedCoverageTypes((prev) => {
        const updated = { ...prev };
        delete updated[testCaseId];
        return updated;
      });
    } catch (error) {
      console.error("Error linking test case:", error);
      toast.error("Failed to link test case");
    } finally {
      setLoading(false);
    }
  }

  async function unlinkTestCase(linkId: string) {
    try {
      setLoading(true);
      const supabase = createClient();

      const { error } = await supabase
        .from("requirement_test_cases")
        .delete()
        .eq("id", linkId);

      if (error) throw error;

      toast.success("Test case unlinked");
      await fetchLinkedTestCases();
      onLinked();
    } catch (error) {
      console.error("Error unlinking test case:", error);
      toast.error("Failed to unlink test case");
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

    // ensure there is always a coverage value when selected
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

    // backfill default coverage for any newly-selected rows
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

      const payload = ids.map((testCaseId) => ({
        requirement_id: requirement.id,
        test_case_id: testCaseId,
        coverage_type: selectedCoverageTypes[testCaseId] || "direct",
      }));

      const { error } = await supabase
        .from("requirement_test_cases")
        .insert(payload);

      if (error) throw error;

      toast.success(
        `Linked ${ids.length} test case${ids.length > 1 ? "s" : ""}`,
      );
      await fetchLinkedTestCases();
      onLinked();

      // Clear selections & cleanup coverage map for those ids
      setSelectedTestCaseIds(new Set());
      setSelectedCoverageTypes((prev) => {
        const updated = { ...prev };
        for (const id of ids) delete updated[id];
        return updated;
      });
    } catch (error) {
      console.error("Error linking selected test cases:", error);
      toast.error("Failed to link selected test cases");
    } finally {
      setLoading(false);
    }
  }

  const [openView, setOpenView] = useState(false);

  function handleClose() {
    setOpenView(false);
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
                          {link.test_cases?.title}
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="outline">
                            {link.test_cases?.test_type}
                          </Badge>
                          <Badge variant="outline">
                            {link.coverage_type} coverage
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
                              <Badge variant="outline">
                                {testCase.test_type}
                              </Badge>
                              <Badge variant="outline">
                                {testCase.priority}
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
                            disabled={loading || !isSelected} // optional: only editable when selected
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
              <Button variant="outline" onClick={handleClose}>
                Close
              </Button>
            </DialogClose>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
