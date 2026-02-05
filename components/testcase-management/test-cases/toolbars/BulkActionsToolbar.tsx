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
  // Unified actions for both regular and cross-platform
  onBulkUpdate?: (updates: any) => Promise<void>;
  onBulkDelete?: () => Promise<void>;
  onBulkAddToSuite?: (suiteId: string) => Promise<void>;
  onBulkExport?: () => void;
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
}: BulkActionsToolbarProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogAction, setDialogAction] = useState<
    "status" | "priority" | "project" | "suite"
  >("status");
  const selectedCount = selectedIds.size;

  const openDialog = (action: typeof dialogAction) => {
    setDialogAction(action);
    setDialogOpen(true);
  };

  const handleUpdate = async (updates: any) => {
    if (onBulkUpdate) {
      await onBulkUpdate(updates);
    }
  };

  const handleAddToSuite = async (suiteId: string) => {
    if (onBulkAddToSuite) {
      await onBulkAddToSuite(suiteId);
    }
  };

  const handleDelete = async () => {
    const confirmed = window.confirm(
      `Delete ${selectedCount} test case${selectedCount === 1 ? "" : "s"}?\n\nThis cannot be undone.`,
    );
    if (!confirmed) return;

    if (onBulkDelete) {
      await onBulkDelete();
    }
  };

  const handleExport = () => {
    if (onBulkExport) {
      onBulkExport();
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
          {/* Add to Suite */}
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
              {/* Change Status */}
              <DropdownMenuItem onClick={() => openDialog("status")}>
                <FileText className="h-4 w-4 mr-2" />
                Change Status
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              {/* Change Priority */}
              <DropdownMenuItem onClick={() => openDialog("priority")}>
                <FileText className="h-4 w-4 mr-2" />
                Change Priority
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              {/* Assign to Project */}
              <DropdownMenuItem onClick={() => openDialog("project")}>
                <FolderOpen className="h-4 w-4 mr-2" />
                Assign to Project
              </DropdownMenuItem>

              {/* Export */}
              {onBulkExport && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleExport}>
                    <Download className="h-4 w-4 mr-2" />
                    Export Selected
                  </DropdownMenuItem>
                </>
              )}

              {/* Delete */}
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
