// hooks/useBulkActions.ts
"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import type { TestCase, CrossPlatformTestCase } from "@/types/test-cases";

type CombinedTestCase = (TestCase | CrossPlatformTestCase) & {
  _caseType?: "regular" | "cross-platform";
};

type BulkStatus = "draft" | "active" | "archived";

function isCross(tc: CombinedTestCase) {
  return tc._caseType === "cross-platform";
}

export function useBulkActions(
  testCases: CombinedTestCase[],
  onRefresh: () => void,
) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isProcessing, setIsProcessing] = useState(false);

  const selectedList = useMemo(() => Array.from(selectedIds), [selectedIds]);

  // Map id -> testcase so we can split by type
  const byId = useMemo(() => {
    const m = new Map<string, CombinedTestCase>();
    for (const tc of testCases) m.set(tc.id, tc);
    return m;
  }, [testCases]);

  const splitSelected = useMemo(() => {
    const regularIds: string[] = [];
    const crossIds: string[] = [];

    for (const id of selectedList) {
      const tc = byId.get(id);
      if (!tc) continue;
      if (isCross(tc)) crossIds.push(id);
      else regularIds.push(id);
    }
    return { regularIds, crossIds };
  }, [selectedList, byId]);

  function toggleSelection(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function selectAll() {
    setSelectedIds(new Set(testCases.map((tc) => tc.id)));
  }

  function deselectAll() {
    setSelectedIds(new Set());
  }

  // ✅ Unified bulk update (updates both tables)
  async function bulkUpdate(
    updates: Partial<TestCase> & { status?: BulkStatus },
  ) {
    const { regularIds, crossIds } = splitSelected;
    if (regularIds.length + crossIds.length === 0) return;

    setIsProcessing(true);
    try {
      const supabase = createClient();
      const patch = { ...updates, updated_at: new Date().toISOString() };

      // Run both updates (if needed)
      const [regRes, crossRes] = await Promise.all([
        regularIds.length
          ? supabase.from("test_cases").update(patch).in("id", regularIds)
          : Promise.resolve({ error: null as any }),
        crossIds.length
          ? supabase
              .from("platform_test_cases")
              .update(patch)
              .in("id", crossIds)
          : Promise.resolve({ error: null as any }),
      ]);

      if (regRes.error) throw regRes.error;
      if (crossRes.error) throw crossRes.error;

      const total = regularIds.length + crossIds.length;
      toast.success(`Updated ${total} test case${total === 1 ? "" : "s"}`);
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

  // ✅ Unified bulk delete (deletes from both tables)
  async function bulkDelete() {
    const { regularIds, crossIds } = splitSelected;
    const total = regularIds.length + crossIds.length;
    if (total === 0) return;

    setIsProcessing(true);
    try {
      const supabase = createClient();

      const [regRes, crossRes] = await Promise.all([
        regularIds.length
          ? supabase.from("test_cases").delete().in("id", regularIds)
          : Promise.resolve({ error: null as any }),
        crossIds.length
          ? supabase.from("platform_test_cases").delete().in("id", crossIds)
          : Promise.resolve({ error: null as any }),
      ]);

      if (regRes.error) throw regRes.error;
      if (crossRes.error) throw crossRes.error;

      toast.success(`Deleted ${total} test case${total === 1 ? "" : "s"}`);
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

  // ✅ Unified add-to-suite (inserts the correct FK column depending on type)
  async function bulkAddToSuite(suiteId: string) {
    const { regularIds, crossIds } = splitSelected;
    const total = regularIds.length + crossIds.length;
    if (total === 0) return;

    setIsProcessing(true);
    try {
      const supabase = createClient();

      const { data: existingCases } = await supabase
        .from("test_suite_cases")
        .select("sequence_order")
        .eq("suite_id", suiteId)
        .order("sequence_order", { ascending: false })
        .limit(1);

      const maxOrder = existingCases?.[0]?.sequence_order ?? 0;

      const rows = [
        ...regularIds.map((testCaseId, index) => ({
          suite_id: suiteId,
          test_case_id: testCaseId,
          platform_test_case_id: null,
          sequence_order: maxOrder + index + 1,
          priority: "medium",
          estimated_duration_minutes: 5,
        })),
        ...crossIds.map((platformTestCaseId, index) => ({
          suite_id: suiteId,
          test_case_id: null,
          platform_test_case_id: platformTestCaseId,
          sequence_order: maxOrder + regularIds.length + index + 1,
          priority: "medium",
          estimated_duration_minutes: 5,
        })),
      ];

      const { error } = await supabase.from("test_suite_cases").insert(rows);

      if (error) {
        if ((error as any).code === "23505") {
          toast.error("Some test cases are already in this suite");
        } else {
          throw error;
        }
      } else {
        toast.success(
          `Added ${total} test case${total === 1 ? "" : "s"} to suite`,
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

  // ✅ Unified export (already basically works)
  function bulkExport() {
    const ids = selectedList;
    const selectedCases = testCases.filter((tc) => ids.includes(tc.id));
    if (selectedCases.length === 0) return;

    const headers = [
      "ID",
      "Title",
      "Description",
      "Type",
      "Priority",
      "Status",
      "Created",
    ];
    const rows = selectedCases.map((tc: any) => [
      tc.id,
      tc.title,
      tc.description || "",
      tc.test_type || tc.platform || "",
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

  return {
    selectedIds,
    isProcessing,
    toggleSelection,
    selectAll,
    deselectAll,

    // One unified set of actions:
    bulkUpdate,
    bulkDelete,
    bulkAddToSuite,
    bulkExport,
  };
}
