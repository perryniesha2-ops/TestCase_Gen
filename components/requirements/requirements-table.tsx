// components/requirements/requirements-table.tsx
"use client";

import React from "react";
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
  getTypeColor,
  getPriorityColor,
  getStatusBadge,
  getProjectColor,
  getRelativeTime,
} from "@/lib/utils/requirement-helpers";
import type { Requirement } from "@/types/requirements";

// ── Types ─────────────────────────────────────────────────────────────────────

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

// ── Chip helpers ──────────────────────────────────────────────────────────────

function Chip({
  className,
  children,
}: {
  className: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 font-mono text-[10px] font-medium ${className}`}
    >
      {children}
    </span>
  );
}

// Map existing color util strings → our chip pattern
// getTypeColor / getPriorityColor / getStatusBadge return className strings
// we wrap them in our Chip instead of shadcn Badge

// ── Table ─────────────────────────────────────────────────────────────────────

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
      {/* Table shell */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <table className="w-full text-left">
          {/* Header */}
          <thead>
            <tr className="border-b border-slate-100 dark:border-slate-800">
              {[
                "Title",
                "Project",
                "Type",
                "Priority",
                "Status",
                "External ID",
                "Created",
                "",
              ].map((h) => (
                <th
                  key={h}
                  className="px-4 py-3 text-[10px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>

          {/* Body */}
          <tbody>
            {requirements.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-16 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <Search className="h-8 w-8 text-slate-300 dark:text-slate-600" />
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                      No requirements found
                    </p>
                    <p className="text-xs text-slate-400 dark:text-slate-500">
                      Try adjusting your filters
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              requirements.map((req, i) => (
                <RequirementRow
                  key={req.id}
                  requirement={req}
                  selectable={selectable}
                  onRowClick={onRowClick}
                  isLast={i === requirements.length - 1}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-1">
          <p className="text-xs text-slate-400 dark:text-slate-500">
            Showing{" "}
            <span className="font-mono font-medium text-slate-600 dark:text-slate-300">
              {startIndex + 1}–{endIndex}
            </span>{" "}
            of{" "}
            <span className="font-mono font-medium text-slate-600 dark:text-slate-300">
              {totalCount}
            </span>{" "}
            requirements
          </p>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => onPageChange(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:border-slate-300 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-slate-600"
            >
              <ChevronLeft className="h-3.5 w-3.5" /> Previous
            </button>
            <span className="px-2 font-mono text-xs text-slate-400 dark:text-slate-500">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() =>
                onPageChange(Math.min(totalPages, currentPage + 1))
              }
              disabled={currentPage === totalPages}
              className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:border-slate-300 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-slate-600"
            >
              Next <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Row ───────────────────────────────────────────────────────────────────────

function RequirementRow({
  requirement,
  selectable,
  onRowClick,
  isLast,
}: {
  requirement: Requirement;
  selectable: boolean;
  onRowClick: (requirement: Requirement) => void;
  isLast: boolean;
}) {
  return (
    <tr
      onClick={() => onRowClick(requirement)}
      className={`group cursor-pointer transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/40 ${
        selectable ? "hover:bg-cyan-50 dark:hover:bg-cyan-400/5" : ""
      } ${!isLast ? "border-b border-slate-100 dark:border-slate-800" : ""}`}
    >
      {/* Title */}
      <td className="px-4 py-3">
        <span className="block max-w-[280px] truncate text-sm font-medium text-slate-700 dark:text-slate-200">
          {requirement.title}
        </span>
      </td>

      {/* Project */}
      <td className="px-4 py-3">
        {requirement.projects ? (
          <div className="flex items-center gap-1.5">
            <FolderOpen
              className={`h-3.5 w-3.5 shrink-0 ${getProjectColor(requirement.projects.color)}`}
            />
            <span className="truncate text-xs text-slate-500 dark:text-slate-400 max-w-[100px]">
              {requirement.projects.name}
            </span>
          </div>
        ) : (
          <span className="text-xs text-slate-300 dark:text-slate-600">—</span>
        )}
      </td>

      {/* Type */}
      <td className="px-4 py-3">
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-0.5 font-mono text-[10px] font-medium ${getTypeColor(requirement.type)}`}
        >
          {requirement.type.replace("_", " ")}
        </span>
      </td>

      {/* Priority */}
      <td className="px-4 py-3">
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-0.5 font-mono text-[10px] font-medium ${getPriorityColor(requirement.priority)}`}
        >
          {requirement.priority}
        </span>
      </td>

      {/* Status */}
      <td className="px-4 py-3">{getStatusBadge(requirement.status)}</td>

      {/* External ID */}
      <td className="px-4 py-3">
        {requirement.external_id ? (
          <div className="flex items-center gap-1 text-xs text-slate-400 dark:text-slate-500">
            <ExternalLink className="h-3 w-3 shrink-0" />
            <span className="truncate max-w-[80px]">
              {requirement.external_id}
            </span>
          </div>
        ) : (
          <span className="text-xs text-slate-300 dark:text-slate-600">—</span>
        )}
      </td>

      {/* Created */}
      <td className="px-4 py-3 text-xs text-slate-400 dark:text-slate-500">
        {getRelativeTime(requirement.created_at)}
      </td>

      {/* View action */}
      <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
        <Link
          href={`/requirements/${requirement.id}`}
          aria-label="View requirement details"
          className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 opacity-0 transition hover:bg-slate-100 hover:text-slate-600 group-hover:opacity-100 dark:hover:bg-slate-700 dark:hover:text-slate-300"
        >
          <Eye className="h-3.5 w-3.5" />
        </Link>
      </td>
    </tr>
  );
}
