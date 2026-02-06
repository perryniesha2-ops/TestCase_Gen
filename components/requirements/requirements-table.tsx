// components/requirements/requirements-table.tsx
"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Eye } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  MoreHorizontal,
  FolderOpen,
} from "lucide-react";

import {
  getTypeColor,
  getPriorityColor,
  getStatusBadge,
  getCoverageIcon,
  getCoverageColor,
  getProjectColor,
  getRelativeTime,
} from "@/lib/utils/requirement-helpers";

import type { Requirement } from "@/types/requirements";

interface RequirementsTableProps {
  requirements: Requirement[];
  selectable?: boolean;

  currentPage: number;
  totalPages: number;
  totalCount: number;
  itemsPerPage: number;

  onRowClick: (requirement: Requirement) => void;
  onPageChange: (page: number) => void;
}

export function RequirementsTable({
  requirements,
  selectable = false,
  currentPage,
  totalPages,
  totalCount,
  itemsPerPage,
  onRowClick,

  onPageChange,
}: RequirementsTableProps) {
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalCount);

  const [actionsOpen, setActionsOpen] = React.useState(false);
  const [activeRequirement, setActiveRequirement] =
    React.useState<Requirement | null>(null);

  const openActions = React.useCallback((r: Requirement) => {
    setActiveRequirement(r);
    setActionsOpen(true);
  }, []);

  return (
    <div className="space-y-4">
      {/* Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead className="w-[140px]">Project</TableHead>
              <TableHead className="w-[120px]">Type</TableHead>
              <TableHead className="w-[100px]">Priority</TableHead>
              <TableHead className="w-[100px]">Status</TableHead>
              <TableHead className="w-[120px]">External ID</TableHead>
              <TableHead className="w-[120px]">Created</TableHead>
              <TableHead className="w-[80px] text-right">View</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {requirements.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-12">
                  <div className="flex flex-col items-center gap-2">
                    <Search className="h-8 w-8 text-muted-foreground" />
                    <p className="text-muted-foreground">
                      No requirements match your filters
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              requirements.map((requirement) => (
                <RequirementRow
                  key={requirement.id}
                  requirement={requirement}
                  selectable={selectable}
                  onRowClick={onRowClick}
                  onOpenActions={openActions}
                />
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {startIndex + 1}-{endIndex} of {totalCount} requirements
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>

            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const pageNum = i + 1;
              return (
                <Button
                  key={pageNum}
                  variant={currentPage === pageNum ? "default" : "outline"}
                  size="sm"
                  onClick={() => onPageChange(pageNum)}
                >
                  {pageNum}
                </Button>
              );
            })}

            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                onPageChange(Math.min(totalPages, currentPage + 1))
              }
              disabled={currentPage === totalPages}
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

interface RequirementRowProps {
  requirement: Requirement;
  selectable: boolean;
  onRowClick: (requirement: Requirement) => void;
  onOpenActions: (requirement: Requirement) => void;
}

function RequirementRow({
  requirement,
  selectable,
  onRowClick,
  onOpenActions,
}: RequirementRowProps) {
  return (
    <TableRow
      className={`cursor-pointer hover:bg-muted/50 ${
        selectable ? "hover:bg-primary/10" : ""
      }`}
      onClick={() => onRowClick(requirement)}
    >
      {/* Title & Description */}
      <TableCell>
        <div className="max-w-[320px] truncate font-medium">
          {requirement.title}
        </div>
      </TableCell>

      {/* Project */}
      <TableCell>
        {requirement.projects ? (
          <div className="flex items-center gap-2">
            <FolderOpen
              className={`h-4 w-4 ${getProjectColor(requirement.projects.color)}`}
            />
            <span className="text-sm truncate">
              {requirement.projects.name}
            </span>
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">No project</span>
        )}
      </TableCell>

      {/* Type */}
      <TableCell>
        <Badge className={getTypeColor(requirement.type)}>
          {requirement.type.replace("_", " ")}
        </Badge>
      </TableCell>

      {/* Priority */}
      <TableCell>
        <Badge className={getPriorityColor(requirement.priority)}>
          {requirement.priority}
        </Badge>
      </TableCell>

      {/* Status */}
      <TableCell>{getStatusBadge(requirement.status)}</TableCell>

      {/* External ID */}
      <TableCell>
        {requirement.external_id ? (
          <div className="flex items-center gap-1 text-sm">
            <ExternalLink className="h-3 w-3" />
            {requirement.external_id}
          </div>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </TableCell>

      {/* Created */}
      <TableCell className="text-muted-foreground text-sm">
        {getRelativeTime(requirement.created_at)}
      </TableCell>

      {/* Actions (Sheet trigger) */}
      <TableCell className="text-right">
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={(e) => e.stopPropagation()}
          aria-label="View requirement details"
        >
          <Link href={`/requirements/${requirement.id}`}>
            <Eye className="h-4 w-4" />
          </Link>
        </Button>
      </TableCell>
    </TableRow>
  );
}
