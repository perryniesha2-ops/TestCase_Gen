// hooks/useBulkActions.ts
"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import type { TestCase } from "@/types/test-cases";

export function useBulkActions(
  testCases: TestCase[] | any[],
  onRefresh: () => void,
  type: "regular" | "cross-platform" = "regular",
) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isProcessing, setIsProcessing] = useState(false);

  function toggleSelection(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function selectAll() {
    setSelectedIds(new Set(testCases.map((tc) => tc.id)));
  }

  function deselectAll() {
    setSelectedIds(new Set());
  }

  // ✅ Regular test case: bulk update
  async function bulkUpdate(updates: Partial<TestCase>) {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;

    setIsProcessing(true);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("test_cases")
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .in("id", ids);

      if (error) throw error;

      toast.success(
        `Updated ${ids.length} test case${ids.length === 1 ? "" : "s"}`,
      );
      deselectAll();
      onRefresh();
    } catch (error) {
      console.error("Bulk update error:", error);
      toast.error("Failed to update test cases");
      throw error;
    } finally {
      setIsProcessing(false);
    }
  }

  // ✅ Regular test case: bulk delete
  async function bulkDelete(ids: string[]) {
    if (ids.length === 0) return;

    setIsProcessing(true);
    try {
      const supabase = createClient();

      const { error } = await supabase
        .from("test_cases")
        .delete()
        .in("id", ids);

      if (error) throw error;

      toast.success(
        `Deleted ${ids.length} test case${ids.length === 1 ? "" : "s"}`,
      );
      deselectAll();
      onRefresh();
    } catch (error) {
      console.error("Bulk delete error:", error);
      toast.error("Failed to delete test cases");
      throw error;
    } finally {
      setIsProcessing(false);
    }
  }

  // ✅ Regular test case: add to suite
  async function bulkAddToSuite(ids: string[], suiteId: string) {
    if (ids.length === 0) return;

    setIsProcessing(true);
    try {
      const supabase = createClient();

      // Get current max sequence order for the suite
      const { data: existingCases } = await supabase
        .from("test_suite_cases")
        .select("sequence_order")
        .eq("suite_id", suiteId)
        .order("sequence_order", { ascending: false })
        .limit(1);

      const maxOrder = existingCases?.[0]?.sequence_order ?? 0;

      // Create suite case links with NULL platform_test_case_id
      const rows = ids.map((testCaseId, index) => ({
        suite_id: suiteId,
        test_case_id: testCaseId,
        platform_test_case_id: null, // ✅ Explicitly set to null for regular cases
        sequence_order: maxOrder + index + 1,
        priority: "medium",
        estimated_duration_minutes: 5,
      }));

      const { error } = await supabase.from("test_suite_cases").insert(rows);

      if (error) {
        if (error.code === "23505") {
          toast.error("Some test cases are already in this suite");
        } else {
          throw error;
        }
      } else {
        toast.success(
          `Added ${ids.length} test case${ids.length === 1 ? "" : "s"} to suite`,
        );
      }

      deselectAll();
      onRefresh();
    } catch (error) {
      console.error("Bulk add to suite error:", error);
      toast.error("Failed to add test cases to suite");
      throw error;
    } finally {
      setIsProcessing(false);
    }
  }

  // ✅ Regular test case: export
  function bulkExport(ids: string[]) {
    const selectedCases = testCases.filter((tc) => ids.includes(tc.id));

    // Create CSV
    const headers = [
      "ID",
      "Title",
      "Description",
      "Type",
      "Priority",
      "Status",
      "Created",
    ];

    const rows = selectedCases.map((tc) => [
      tc.id,
      tc.title,
      tc.description || "",
      tc.test_type || tc.platform, // Handle both types
      tc.priority,
      tc.status,
      new Date(tc.created_at).toLocaleDateString(),
    ]);

    const csv = [
      headers.join(","),
      ...rows.map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","),
      ),
    ].join("\n");

    // Download
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `test-cases-${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success(
      `Exported ${ids.length} test case${ids.length === 1 ? "" : "s"}`,
    );
    deselectAll();
  }

  // ✅ Cross-platform: approve
  async function bulkApproveCrossPlatform(ids: string[]) {
    if (type !== "cross-platform" || ids.length === 0) return;

    setIsProcessing(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Filter to only pending cases
      const pendingCases = testCases.filter(
        (tc: any) => ids.includes(tc.id) && tc.status === "pending",
      );

      if (pendingCases.length === 0) {
        toast.error("No pending test cases selected");
        return;
      }

      // ✅ Updated: Just approve, don't convert
      const { error } = await supabase
        .from("platform_test_cases")
        .update({
          status: "approved",
          approved_by: user.id,
          approved_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .in(
          "id",
          ids.filter((id) => pendingCases.some((tc: any) => tc.id === id)),
        );

      if (error) throw error;

      toast.success(
        `Approved ${pendingCases.length} test case${
          pendingCases.length === 1 ? "" : "s"
        }`,
      );
      deselectAll();
      onRefresh();
    } catch (error) {
      console.error("Bulk approve error:", error);
      toast.error("Failed to bulk approve");
    } finally {
      setIsProcessing(false);
    }
  }

  // ✅ Cross-platform: reject
  async function bulkRejectCrossPlatform(ids: string[]) {
    if (type !== "cross-platform" || ids.length === 0) return;

    setIsProcessing(true);
    try {
      const supabase = createClient();

      // Filter to only pending cases
      const pendingCases = testCases.filter(
        (tc: any) => ids.includes(tc.id) && tc.status === "pending",
      );

      if (pendingCases.length === 0) {
        toast.error("No pending test cases selected");
        return;
      }

      const { error } = await supabase
        .from("platform_test_cases")
        .update({
          status: "rejected",
          updated_at: new Date().toISOString(),
        })
        .in(
          "id",
          ids.filter((id) => pendingCases.some((tc: any) => tc.id === id)),
        );

      if (error) throw error;

      toast.success(
        `Rejected ${pendingCases.length} test case${
          pendingCases.length === 1 ? "" : "s"
        }`,
      );
      deselectAll();
      onRefresh();
    } catch (error) {
      console.error("Bulk reject error:", error);
      toast.error("Failed to bulk reject");
    } finally {
      setIsProcessing(false);
    }
  }

  // ✅ Cross-platform: delete
  async function bulkDeleteCrossPlatform(ids: string[]) {
    if (type !== "cross-platform" || ids.length === 0) return;

    setIsProcessing(true);
    try {
      const supabase = createClient();

      const { error } = await supabase
        .from("platform_test_cases")
        .delete()
        .in("id", ids);

      if (error) throw error;

      toast.success(
        `Deleted ${ids.length} test case${ids.length === 1 ? "" : "s"}`,
      );
      deselectAll();
      onRefresh();
    } catch (error) {
      console.error("Bulk delete error:", error);
      toast.error("Failed to delete test cases");
    } finally {
      setIsProcessing(false);
    }
  }

  // ✅ Cross-platform: update
  async function bulkUpdateCrossPlatform(ids: string[], updates: any) {
    if (type !== "cross-platform" || ids.length === 0) return;

    setIsProcessing(true);
    try {
      const supabase = createClient();

      const { error } = await supabase
        .from("platform_test_cases")
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .in("id", ids);

      if (error) throw error;

      toast.success(
        `Updated ${ids.length} test case${ids.length === 1 ? "" : "s"}`,
      );
      deselectAll();
      onRefresh();
    } catch (error) {
      console.error("Bulk update error:", error);
      toast.error("Failed to update test cases");
    } finally {
      setIsProcessing(false);
    }
  }

  // ✅ NEW: Cross-platform: add to suite
  async function bulkAddCrossPlatformToSuite(ids: string[], suiteId: string) {
    if (type !== "cross-platform" || ids.length === 0) return;

    setIsProcessing(true);
    try {
      const supabase = createClient();

      // Get current max sequence order for the suite
      const { data: existingCases } = await supabase
        .from("test_suite_cases")
        .select("sequence_order")
        .eq("suite_id", suiteId)
        .order("sequence_order", { ascending: false })
        .limit(1);

      const maxOrder = existingCases?.[0]?.sequence_order ?? 0;

      // Create suite case links with NULL test_case_id
      const rows = ids.map((platformTestCaseId, index) => ({
        suite_id: suiteId,
        test_case_id: null, // ✅ NULL for cross-platform
        platform_test_case_id: platformTestCaseId, // ✅ Set platform ID
        sequence_order: maxOrder + index + 1,
        priority: "medium",
        estimated_duration_minutes: 5,
      }));

      const { error } = await supabase.from("test_suite_cases").insert(rows);

      if (error) {
        if (error.code === "23505") {
          toast.error("Some test cases are already in this suite");
        } else {
          throw error;
        }
      } else {
        toast.success(
          `Added ${ids.length} test case${ids.length === 1 ? "" : "s"} to suite`,
        );
      }

      deselectAll();
      onRefresh();
    } catch (error) {
      console.error("Bulk add to suite error:", error);
      toast.error("Failed to add test cases to suite");
      throw error;
    } finally {
      setIsProcessing(false);
    }
  }

  return {
    selectedIds,
    isProcessing,
    toggleSelection,
    selectAll,
    deselectAll,
    // Regular test case actions
    bulkUpdate,
    bulkDelete,
    bulkAddToSuite,
    bulkExport,
    // Cross-platform test case actions
    bulkApproveCrossPlatform,
    bulkRejectCrossPlatform,
    bulkDeleteCrossPlatform,
    bulkUpdateCrossPlatform,
    bulkAddCrossPlatformToSuite, // ✅ NEW
  };
}
