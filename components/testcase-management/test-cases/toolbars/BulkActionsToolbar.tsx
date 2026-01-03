// components/test-cases/BulkActionsToolbar.tsx
"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
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
  FileText,
  FolderOpen,
  Trash2,
  Download,
  PlayCircle,
} from "lucide-react"
import { BulkUpdateDialog } from "../dialogs/BulkUpdateDialog"
import type { TestCase } from "@/types/test-cases"

interface BulkActionsToolbarProps {
  selectedIds: Set<string>
  allTestCases: TestCase[]
  onSelectAll: () => void
  onDeselectAll: () => void
  onBulkUpdate: (ids: string[], updates: Partial<TestCase>) => Promise<void>
  onBulkDelete: (ids: string[]) => Promise<void>
  onBulkAddToSuite: (ids: string[], suiteId: string) => Promise<void>
  onBulkExport: (ids: string[]) => void
}

type BulkAction = 
  | "status"
  | "priority"
  | "project"
  | "suite"
  | "export"
  | "delete"

type DialogAction = "status" | "priority" | "project" | "suite"

export function BulkActionsToolbar({
  selectedIds,
  allTestCases,
  onSelectAll,
  onDeselectAll,
  onBulkUpdate,
  onBulkDelete,
  onBulkAddToSuite,
  onBulkExport,
}: BulkActionsToolbarProps) {
  const [showDialog, setShowDialog] = useState(false)
  const [currentAction, setCurrentAction] = useState<DialogAction | null>(null)

  const selectedCount = selectedIds.size
  const totalCount = allTestCases.length
  const allSelected = selectedCount === totalCount && totalCount > 0

  function handleActionClick(action: BulkAction) {
    if (action === "export") {
      onBulkExport(Array.from(selectedIds))
      return
    }
    
    if (action === "delete") {
      handleBulkDelete()
      return
    }
    
    // Only open dialog for actions that need it
    setCurrentAction(action)
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

  async function handleBulkUpdate(updates: Partial<TestCase>) {
    try {
      await onBulkUpdate(Array.from(selectedIds), updates)
      setShowDialog(false)
      setCurrentAction(null)
    } catch (error) {
      console.error("Bulk update error:", error)
    }
  }

  async function handleAddToSuite(suiteId: string) {
    try {
      await onBulkAddToSuite(Array.from(selectedIds), suiteId)
      setShowDialog(false)
      setCurrentAction(null)
    } catch (error) {
      console.error("Bulk add to suite error:", error)
    }
  }

  if (selectedCount === 0) return null

  return (
    <>
      <div className="flex items-center gap-3 p-4 bg-primary/5 border-b border-primary/20">
        {/* Selection Info */}
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

        <div className="flex items-center gap-2">
         
            {selectedCount} selected
          
          {selectedCount < totalCount && (
            <span className="text-sm text-muted-foreground">
              of {totalCount}
            </span>
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
            <DropdownMenuLabel>Update {selectedCount} test cases</DropdownMenuLabel>
            <DropdownMenuSeparator />
            
            <DropdownMenuItem onClick={() => handleActionClick("status")}>
              <FileText className="h-4 w-4 mr-2" />
              Change Status
            </DropdownMenuItem>
            
            <DropdownMenuItem onClick={() => handleActionClick("priority")}>
              <FileText className="h-4 w-4 mr-2" />
              Change Priority
            </DropdownMenuItem>
            
            <DropdownMenuItem onClick={() => handleActionClick("project")}>
              <FolderOpen className="h-4 w-4 mr-2" />
              Assign to Project
            </DropdownMenuItem>
            
            <DropdownMenuItem onClick={() => handleActionClick("suite")}>
              <PlayCircle className="h-4 w-4 mr-2" />
              Add to Suite
            </DropdownMenuItem>
            
            <DropdownMenuSeparator />
            
            <DropdownMenuItem onClick={() => handleActionClick("export")}>
              <Download className="h-4 w-4 mr-2" />
              Export as CSV
            </DropdownMenuItem>
            
            <DropdownMenuSeparator />
            
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
          onUpdate={handleBulkUpdate}
          onAddToSuite={handleAddToSuite}
        />
      )}
    </>
  )
}