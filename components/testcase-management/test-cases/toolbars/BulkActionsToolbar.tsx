// components/testcase-management/toolbars/BulkActionsToolbar.tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  FolderPlus,
  Trash2,
  ChevronDown,
  ListChecks,
  MoreHorizontal,
  FileText,
  Download,
  FolderOpen,
} from "lucide-react";
import { BulkUpdateDialog } from "../dialogs/BulkUpdateDialog";
import type { TestCase, CrossPlatformTestCase } from "@/types/test-cases";

type CombinedTestCase = (TestCase | CrossPlatformTestCase) & {
  _caseType?: "regular" | "cross-platform";
};

interface BulkActionsToolbarProps {
  selectedIds: Set<string>;
  allTestCases: CombinedTestCase[];
  type: "regular" | "cross-platform";

  // Selection handlers
  onSelectAll: () => void;
  onDeselectAll: () => void;

  // Regular test case actions
  onBulkUpdate?: (updates: any) => Promise<void>;
  onBulkDelete?: (ids: string[]) => Promise<void>;
  onBulkAddToSuite?: (ids: string[], suiteId: string) => Promise<void>;
  onBulkExport?: (ids: string[]) => void;

  // Cross-platform test case actions
  onBulkUpdateCrossPlatform?: (ids: string[], updates: any) => Promise<void>;
  onBulkDeleteCrossPlatform?: (ids: string[]) => Promise<void>;
  onBulkAddCrossPlatformToSuite?: (
    ids: string[],
    suiteId: string,
  ) => Promise<void>;
}

export function BulkActionsToolbar({
  selectedIds,
  allTestCases,
  type,
  onSelectAll,
  onDeselectAll,
  onBulkUpdate,
  onBulkDelete,
  onBulkAddToSuite,
  onBulkExport,
  onBulkUpdateCrossPlatform,
  onBulkDeleteCrossPlatform,
  onBulkAddCrossPlatformToSuite,
}: BulkActionsToolbarProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogAction, setDialogAction] = useState<
    "status" | "priority" | "project" | "suite" | "approve" | "reject"
  >("status");
  const selectedCount = selectedIds.size;

  const openDialog = (action: typeof dialogAction) => {
    setDialogAction(action);
    setDialogOpen(true);
  };

  const handleUpdate = async (updates: any) => {
    const ids = Array.from(selectedIds);
    if (type === "cross-platform" && onBulkUpdateCrossPlatform) {
      await onBulkUpdateCrossPlatform(ids, updates);
    } else if (onBulkUpdate) {
      await onBulkUpdate(updates);
    }
  };

  const handleAddToSuite = async (suiteId: string) => {
    const ids = Array.from(selectedIds);
    if (type === "cross-platform" && onBulkAddCrossPlatformToSuite) {
      await onBulkAddCrossPlatformToSuite(ids, suiteId);
    } else if (onBulkAddToSuite) {
      await onBulkAddToSuite(ids, suiteId);
    }
  };

  const handleDelete = async () => {
    const ids = Array.from(selectedIds);
    const confirmed = window.confirm(
      `Delete ${selectedCount} test case${selectedCount === 1 ? "" : "s"}?\n\nThis cannot be undone.`,
    );
    if (!confirmed) return;

    if (type === "cross-platform" && onBulkDeleteCrossPlatform) {
      await onBulkDeleteCrossPlatform(ids);
    } else if (onBulkDelete) {
      await onBulkDelete(ids);
    }
  };

  const handleExport = () => {
    if (onBulkExport) {
      const ids = Array.from(selectedIds);
      onBulkExport(ids);
    }
  };

  if (selectedCount === 0) {
    return null;
  }

  return (
    <>
      <div className="flex items-center justify-between gap-2 p-3 bg-muted/50 border rounded-lg">
        <div className="flex items-center gap-3">
          <Badge variant="secondary" className="font-semibold">
            {selectedCount} selected
          </Badge>

          <Button
            variant="ghost"
            size="sm"
            onClick={
              selectedCount === allTestCases.length
                ? onDeselectAll
                : onSelectAll
            }
          >
            <ListChecks className="h-4 w-4 mr-2" />
            {selectedCount === allTestCases.length
              ? "Deselect All"
              : "Select All"}
          </Button>
        </div>

        <div className="flex items-center gap-2">
          {/* Common: Add to Suite - Available for BOTH types */}
          <Button
            size="sm"
            variant="outline"
            className="gap-2"
            onClick={() => openDialog("suite")}
          >
            <FolderPlus className="h-4 w-4" />
            Add to Suite
          </Button>

          {/* More actions dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="outline" className="gap-2">
                <MoreHorizontal className="h-4 w-4" />
                More
                <ChevronDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {/* ✅ Status - Available for BOTH types */}
              <DropdownMenuItem onClick={() => openDialog("status")}>
                <FileText className="h-4 w-4 mr-2" />
                Change Status
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              {/* ✅ Priority - Available for BOTH types */}
              <DropdownMenuItem onClick={() => openDialog("priority")}>
                <FileText className="h-4 w-4 mr-2" />
                Change Priority
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              {/* ✅ Project - Now available for BOTH types */}
              <DropdownMenuItem onClick={() => openDialog("project")}>
                <FolderOpen className="h-4 w-4 mr-2" />
                Assign to Project
              </DropdownMenuItem>

              {/* ✅ Export - Available for BOTH types */}
              {onBulkExport && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleExport}>
                    <Download className="h-4 w-4 mr-2" />
                    Export Selected
                  </DropdownMenuItem>
                </>
              )}

              {/* ✅ Delete - Available for BOTH types */}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleDelete}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Selected
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <BulkUpdateDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        action={dialogAction}
        selectedCount={selectedCount}
        type={type}
        onUpdate={handleUpdate}
        onAddToSuite={handleAddToSuite}
      />
    </>
  );
}
