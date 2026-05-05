// components/requirements/requirements-table.tsx
"use client";

import React, { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import {
  Eye,
  Search,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  FolderOpen,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import {
  getTypeColor,
  getPriorityColor,
  getStatusBadge,
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

  return (
    <div className="space-y-3">
      {/* ── Table ─────────────────────────────────────────────────────────── */}
      <div className="border rounded-lg overflow-hidden bg-card">
        <Table>
          <TableHeader className="bg-muted/30">
            <TableRow className="hover:bg-transparent border-b">
              <TableHead className="font-semibold text-xs uppercase tracking-wide text-muted-foreground">
                Title
              </TableHead>
              <TableHead className="w-[140px] font-semibold text-xs uppercase tracking-wide text-muted-foreground">
                Project
              </TableHead>
              <TableHead className="w-[120px] font-semibold text-xs uppercase tracking-wide text-muted-foreground">
                Type
              </TableHead>
              <TableHead className="w-[100px] font-semibold text-xs uppercase tracking-wide text-muted-foreground">
                Priority
              </TableHead>
              <TableHead className="w-[100px] font-semibold text-xs uppercase tracking-wide text-muted-foreground">
                Status
              </TableHead>
              <TableHead className="w-[120px] font-semibold text-xs uppercase tracking-wide text-muted-foreground">
                External ID
              </TableHead>
              <TableHead className="w-[120px] font-semibold text-xs uppercase tracking-wide text-muted-foreground">
                Created
              </TableHead>
              <TableHead className="w-[60px]" />
            </TableRow>
          </TableHeader>

          <TableBody>
            {requirements.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-16">
                  <div className="flex flex-col items-center gap-2">
                    <Search className="h-10 w-10 text-muted-foreground/40" />
                    <p className="font-medium">No requirements found</p>
                    <p className="text-sm text-muted-foreground">
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
                />
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* ── Pagination ─────────────────────────────────────────────────────── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-1">
          <p className="text-sm text-muted-foreground">
            Showing{" "}
            <span className="font-medium text-foreground">
              {startIndex + 1}
            </span>
            –<span className="font-medium text-foreground">{endIndex}</span> of{" "}
            <span className="font-medium text-foreground">{totalCount}</span>{" "}
            requirements
          </p>

          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              className="h-8 px-3"
              onClick={() => onPageChange(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>
            <span className="text-sm px-2 text-muted-foreground">
              {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              className="h-8 px-3"
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

// ─── Row ──────────────────────────────────────────────────────────────────────

interface RequirementRowProps {
  requirement: Requirement;
  selectable: boolean;
  onRowClick: (requirement: Requirement) => void;
}

function RequirementRow({
  requirement,
  selectable,
  onRowClick,
}: RequirementRowProps) {
  return (
    <TableRow
      className={`group hover:bg-muted/20 transition-colors border-b last:border-0 cursor-pointer ${
        selectable ? "hover:bg-primary/10" : ""
      }`}
      onClick={() => onRowClick(requirement)}
    >
      {/* Title */}
      <TableCell className="py-3">
        <div className="max-w-[320px] truncate font-medium text-sm">
          {requirement.title}
        </div>
      </TableCell>

      {/* Project */}
      <TableCell className="py-3">
        {requirement.projects ? (
          <div className="flex items-center gap-1.5">
            <FolderOpen
              className={`h-3.5 w-3.5 shrink-0 ${getProjectColor(requirement.projects.color)}`}
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
      <TableCell className="py-3">
        <Badge
          className={`${getTypeColor(requirement.type)} text-xs h-5 px-1.5`}
        >
          {requirement.type.replace("_", " ")}
        </Badge>
      </TableCell>

      {/* Priority */}
      <TableCell className="py-3">
        <Badge
          className={`${getPriorityColor(requirement.priority)} text-xs h-5 px-1.5`}
        >
          {requirement.priority}
        </Badge>
      </TableCell>

      {/* Status */}
      <TableCell className="py-3">
        {getStatusBadge(requirement.status)}
      </TableCell>

      {/* External ID */}
      <TableCell className="py-3">
        {requirement.external_id ? (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <ExternalLink className="h-3 w-3" />
            {requirement.external_id}
          </div>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </TableCell>

      {/* Created */}
      <TableCell className="py-3 text-xs text-muted-foreground">
        {getRelativeTime(requirement.created_at)}
      </TableCell>

      {/* View */}
      <TableCell
        className="py-3 pr-3 text-right"
        onClick={(e) => e.stopPropagation()}
      >
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0"
          aria-label="View requirement details"
        >
          <Link href={`/requirements/${requirement.id}`}>
            <Eye className="h-3.5 w-3.5" />
          </Link>
        </Button>
      </TableCell>
    </TableRow>
  );
}
