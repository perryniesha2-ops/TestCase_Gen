// hooks/useBulkActions.ts
"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import type { TestCase } from "@/types/test-cases"

export function useBulkActions(testCases: TestCase[], onRefresh: () => void) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [isProcessing, setIsProcessing] = useState(false)

  function toggleSelection(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  function selectAll() {
    setSelectedIds(new Set(testCases.map((tc) => tc.id)))
  }

  function deselectAll() {
    setSelectedIds(new Set())
  }

  async function bulkUpdate(ids: string[], updates: Partial<TestCase>) {
    setIsProcessing(true)
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from("test_cases")
        .update(updates)
        .in("id", ids)

      if (error) throw error

      toast.success(`Updated ${ids.length} test case${ids.length === 1 ? "" : "s"}`)
      deselectAll()
      onRefresh()
    } catch (error) {
      console.error("Bulk update error:", error)
      toast.error("Failed to update test cases")
      throw error
    } finally {
      setIsProcessing(false)
    }
  }

  async function bulkDelete(ids: string[]) {
    setIsProcessing(true)
    try {
      const supabase = createClient()
      
      // Delete test cases (cascades will handle related records)
      const { error } = await supabase
        .from("test_cases")
        .delete()
        .in("id", ids)

      if (error) throw error

      toast.success(`Deleted ${ids.length} test case${ids.length === 1 ? "" : "s"}`)
      deselectAll()
      onRefresh()
    } catch (error) {
      console.error("Bulk delete error:", error)
      toast.error("Failed to delete test cases")
      throw error
    } finally {
      setIsProcessing(false)
    }
  }

  async function bulkAddToSuite(ids: string[], suiteId: string) {
    setIsProcessing(true)
    try {
      const supabase = createClient()
      
      // Get current max sequence order for the suite
      const { data: existingCases } = await supabase
        .from("test_suite_cases")
        .select("sequence_order")
        .eq("suite_id", suiteId)
        .order("sequence_order", { ascending: false })
        .limit(1)

      const maxOrder = existingCases?.[0]?.sequence_order ?? 0

      // Create suite case links
      const rows = ids.map((testCaseId, index) => ({
        suite_id: suiteId,
        test_case_id: testCaseId,
        sequence_order: maxOrder + index + 1,
        priority: "medium",
        estimated_duration_minutes: 5,
      }))

      const { error } = await supabase
        .from("test_suite_cases")
        .insert(rows)

      if (error) {
        // Check if it's a duplicate error
        if (error.code === "23505") {
          toast.error("Some test cases are already in this suite")
        } else {
          throw error
        }
      } else {
        toast.success(`Added ${ids.length} test case${ids.length === 1 ? "" : "s"} to suite`)
      }

      deselectAll()
      onRefresh()
    } catch (error) {
      console.error("Bulk add to suite error:", error)
      toast.error("Failed to add test cases to suite")
      throw error
    } finally {
      setIsProcessing(false)
    }
  }

  function bulkExport(ids: string[]) {
    const selectedCases = testCases.filter((tc) => ids.includes(tc.id))
    
    // Create CSV
    const headers = [
      "ID",
      "Title",
      "Description",
      "Type",
      "Priority",
      "Status",
      "Created",
    ]
    
    const rows = selectedCases.map((tc) => [
      tc.id,
      tc.title,
      tc.description || "",
      tc.test_type,
      tc.priority,
      tc.status,
      new Date(tc.created_at).toLocaleDateString(),
    ])

    const csv = [
      headers.join(","),
      ...rows.map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
      ),
    ].join("\n")

    // Download
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `test-cases-${new Date().toISOString().split("T")[0]}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    toast.success(`Exported ${ids.length} test case${ids.length === 1 ? "" : "s"}`)
    deselectAll()
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
  }
}