"use client";

import { useMemo, useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import type { TestCase, CrossPlatformTestCase } from "@/types/test-cases";

type CombinedTestCase = (TestCase | CrossPlatformTestCase) & {
  _caseType?: "regular" | "cross-platform";
};

type BulkStatus = "draft" | "active" | "archived";

function isCross(tc: CombinedTestCase) {
  return tc._caseType === "cross-platform";
}

async function safeJson(res: Response) {
  const text = await res.text().catch(() => "");
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return null;
  }
}

export function useBulkActions(
  testCases: CombinedTestCase[],
  onRefresh: () => void,
) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isProcessing, setIsProcessing] = useState(false);

  const prevIdsRef = useRef<string>("");
  useEffect(() => {
    const key = testCases.map((tc) => tc.id).join(",");
    if (key !== prevIdsRef.current) {
      prevIdsRef.current = key;
      setSelectedIds(new Set());
    }
  }, [testCases]);

  const selectedList = useMemo(() => Array.from(selectedIds), [selectedIds]);

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

  // ── Bulk update ────────────────────────────────────────────────────────────

  async function bulkUpdate(
    updates: Partial<TestCase> & { status?: BulkStatus },
  ) {
    const { regularIds, crossIds } = splitSelected;
    if (regularIds.length + crossIds.length === 0) return;

    setIsProcessing(true);
    try {
      const res = await fetch("/api/test-cases/bulk-update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ regularIds, crossIds, updates }),
      });
      const payload = await safeJson(res);
      if (!res.ok) throw new Error(payload?.error ?? `Failed (${res.status})`);

      const total = regularIds.length + crossIds.length;
      toast.success(`Updated ${total} test case${total === 1 ? "" : "s"}`);
      deselectAll();
      onRefresh();
    } catch (error: any) {
      console.error("[useBulkActions] bulkUpdate error:", error);
      toast.error(error?.message ?? "Failed to update test cases");
      throw error;
    } finally {
      setIsProcessing(false);
    }
  }

  // ── Bulk delete ────────────────────────────────────────────────────────────

  async function bulkDelete() {
    const { regularIds, crossIds } = splitSelected;
    const total = regularIds.length + crossIds.length;
    if (total === 0) return;

    setIsProcessing(true);
    try {
      const res = await fetch("/api/test-cases/bulk-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ regularIds, crossIds }),
      });
      const payload = await safeJson(res);
      if (!res.ok) throw new Error(payload?.error ?? `Failed (${res.status})`);

      toast.success(`Deleted ${total} test case${total === 1 ? "" : "s"}`);
      deselectAll();
      onRefresh();
    } catch (error: any) {
      console.error("[useBulkActions] bulkDelete error:", error);
      toast.error(
        "Failed to delete test cases. Some may be linked to other records.",
      );
      throw error;
    } finally {
      setIsProcessing(false);
    }
  }

  // ── Bulk add to suite ──────────────────────────────────────────────────────

  async function bulkAddToSuite(suiteId: string) {
    const { regularIds, crossIds } = splitSelected;
    const total = regularIds.length + crossIds.length;
    if (total === 0) return;

    setIsProcessing(true);
    try {
      const res = await fetch(`/api/suites/${suiteId}/items/bulk`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ regularIds, crossIds }),
      });
      const payload = await safeJson(res);

      if (!res.ok) {
        if (res.status === 409) {
          toast.error("Some test cases are already in this suite");
          return;
        }
        throw new Error(payload?.error ?? `Failed (${res.status})`);
      }

      toast.success(
        `Added ${total} test case${total === 1 ? "" : "s"} to suite`,
      );
      deselectAll();
      onRefresh();
    } catch (error: any) {
      console.error("[useBulkActions] bulkAddToSuite error:", error);
      toast.error(error?.message ?? "Failed to add test cases to suite");
      throw error;
    } finally {
      setIsProcessing(false);
    }
  }

  // ── Bulk export (client-side CSV — no DB call) ─────────────────────────────

  function bulkExport() {
    const ids = selectedList;
    const selectedCases = testCases.filter((tc) => selectedIds.has(tc.id));
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
    bulkUpdate,
    bulkDelete,
    bulkAddToSuite,
    bulkExport,
  };
}
