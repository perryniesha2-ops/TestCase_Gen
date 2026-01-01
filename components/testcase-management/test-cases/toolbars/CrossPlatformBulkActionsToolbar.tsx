// components/testcase-management/test-cases/CrossPlatformBulkActionsToolbar.tsx
"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  CheckSquare,
  Square,
  ChevronDown,
  X,
  CheckCircle2,
  XCircle,
  Trash2,
  FileText,
} from "lucide-react"
import { BulkUpdateDialog } from "../dialogs/BulkUpdateDialog"
import type { CrossPlatformTestCase } from "@/types/test-cases"

interface CrossPlatformBulkActionsToolbarProps {
  selectedIds: Set<string>
  allTestCases: CrossPlatformTestCase[]
  onSelectAll: () => void
  onDeselectAll: () => void
  onBulkApprove: (ids: string[]) => Promise<void>
  onBulkReject: (ids: string[]) => Promise<void>
onBulkUpdate: (ids: string[], updates: Partial<CrossPlatformTestCase>) => Promise<void>
  onBulkDelete: (ids: string[]) => Promise<void>
}

type BulkAction = "approve" | "reject" | "priority" | "delete"
type DialogAction = "approve" | "reject" | "priority"

export function CrossPlatformBulkActionsToolbar({
  selectedIds,
  allTestCases,
  onSelectAll,
  onDeselectAll,
  onBulkApprove,
  onBulkReject,
  onBulkUpdate,
  onBulkDelete,
}: CrossPlatformBulkActionsToolbarProps) {
  const [showDialog, setShowDialog] = useState(false)
  const [currentAction, setCurrentAction] = useState<DialogAction | null>(null)

  const selectedCount = selectedIds.size
  const totalCount = allTestCases.length
  const allSelected = selectedCount === totalCount && totalCount > 0


  const pendingCount = allTestCases.filter(
    (tc) => selectedIds.has(tc.id) && (!tc.status || tc.status === "pending")
  ).length

  function handleActionClick(action: BulkAction) {
    if (action === "delete") {
      handleBulkDelete()
      return
    }

    // ✅ FIXED: Always allow clicking approve/reject
    // The dialog and hook will handle validation
    setCurrentAction(action as DialogAction)
    setShowDialog(true)
  }

  async function handleBulkDelete() {
    const confirmed = window.confirm(
      `Delete ${selectedCount} test case${selectedCount === 1 ? "" : "s"}? This cannot be undone.`
    )
    if (!confirmed) return

    try {
      await onBulkDelete(Array.from(selectedIds))
    } catch (error) {
      console.error("Bulk delete error:", error)
    }
  }

  async function handleBulkUpdate(updates: Partial<CrossPlatformTestCase>) {
    try {
      await onBulkUpdate(Array.from(selectedIds), updates)
      setShowDialog(false)
      setCurrentAction(null)
    } catch (error) {
      console.error("Bulk update error:", error)
    }
  }

  async function handleBulkApprove() {
    try {
      await onBulkApprove(Array.from(selectedIds))
      setShowDialog(false)
      setCurrentAction(null)
    } catch (error) {
      console.error("Bulk approve error:", error)
    }
  }

  async function handleBulkReject() {
    try {
      await onBulkReject(Array.from(selectedIds))
      setShowDialog(false)
      setCurrentAction(null)
    } catch (error) {
      console.error("Bulk reject error:", error)
    }
  }

  if (selectedCount === 0) return null

  return (
    <>
      <div className="flex items-center gap-3 p-4 bg-primary/5 border-b border-primary/20">
        {/* Selection Toggle */}
        <Button
          variant="ghost"
          size="sm"
          onClick={allSelected ? onDeselectAll : onSelectAll}
          className="gap-2"
        >
          {allSelected ? (
            <CheckSquare className="h-4 w-4" />
          ) : (
            <Square className="h-4 w-4" />
          )}
          {allSelected ? "Deselect All" : "Select All"}
        </Button>

        {/* Selection Info */}
        <div className="flex items-center gap-2">
          <span className="font-medium">{selectedCount} selected</span>
          {selectedCount < totalCount && (
            <span className="text-sm text-muted-foreground">of {totalCount}</span>
          )}
          {/* ✅ FIXED: Show pending count if any */}
          {pendingCount > 0 && (
            <span className="text-sm text-amber-600">({pendingCount} pending)</span>
          )}
        </div>

        <div className="h-4 w-px bg-border" />

        {/* Bulk Actions Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="default" size="sm" className="gap-2">
              Actions
              <ChevronDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuLabel>
              Update {selectedCount} test case{selectedCount === 1 ? "" : "s"}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />

            {/* ✅ FIXED: Always show Approve, disable if no pending */}
            <DropdownMenuItem
              onClick={() => handleActionClick("approve")}
              disabled={pendingCount === 0}
              className="text-green-600 focus:text-green-700 disabled:text-muted-foreground disabled:opacity-50"
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Approve & Convert {pendingCount > 0 ? `(${pendingCount})` : ""}
            </DropdownMenuItem>

            {/* ✅ FIXED: Always show Reject, disable if no pending */}
            <DropdownMenuItem
              onClick={() => handleActionClick("reject")}
              disabled={pendingCount === 0}
              className="text-orange-600 focus:text-orange-700 disabled:text-muted-foreground disabled:opacity-50"
            >
              <XCircle className="h-4 w-4 mr-2" />
              Reject {pendingCount > 0 ? `(${pendingCount})` : ""}
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            {/* Change Priority */}
            <DropdownMenuItem onClick={() => handleActionClick("priority")}>
              <FileText className="h-4 w-4 mr-2" />
              Change Priority
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            {/* Delete */}
            <DropdownMenuItem
              onClick={() => handleActionClick("delete")}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Selected
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Clear Selection */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onDeselectAll}
          className="ml-auto gap-2"
        >
          <X className="h-4 w-4" />
          Clear Selection
        </Button>
      </div>

      {/* Bulk Update Dialog */}
      {currentAction && (
        <BulkUpdateDialog
          open={showDialog}
          onOpenChange={setShowDialog}
          action={currentAction}
          selectedCount={selectedCount}
          type="cross-platform"
          pendingCount={pendingCount}
          onUpdate={handleBulkUpdate}
          onApprove={handleBulkApprove}
          onReject={handleBulkReject}
        />
      )}
    </>
  )
}