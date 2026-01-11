// components/requirements/requirement-details-dialog.tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Link as LinkIcon,
  ExternalLink,
  BarChart3,
  FolderOpen,
  Loader2,
} from "lucide-react";
import {
  getTypeColor,
  getPriorityColor,
  getStatusBadge,
  getCoverageColor,
  getProjectColor,
} from "@/lib/utils/requirement-helpers";
import type { Requirement } from "@/types/requirements";

interface RequirementDetailsDialogProps {
  requirement: Requirement;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenLinkDialog: () => void;
}

export function RequirementDetailsDialog({
  requirement,
  open,
  onOpenChange,
  onOpenLinkDialog,
}: RequirementDetailsDialogProps) {
  const hasCriteria =
    Array.isArray(requirement.acceptance_criteria) &&
    requirement.acceptance_criteria.length > 0;

  const [loading, setLoading] = useState(false);
  const [openView, setOpenView] = useState(false);

  function handleClose() {
    setOpenView(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="w-[95vw] sm:max-w-4xl lg:max-w-5xl max-h-[90vh] flex flex-col p-0"
        onInteractOutside={(e) => e.preventDefault()}
      >
        {/* Sticky header */}
        <DialogHeader className="sticky top-0 z-10 bg-background border-b px-6 py-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <DialogTitle className="text-lg sm:text-xl leading-tight break-words">
                {requirement.title}
              </DialogTitle>
              {requirement.description ? (
                <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                  {requirement.description}
                </p>
              ) : null}
            </div>

            <Button
              type="button"
              onClick={onOpenLinkDialog}
              size="sm"
              variant="outline"
              className="shrink-0"
            >
              <LinkIcon className="h-4 w-4 mr-2" />
              Link Tests ({requirement.test_case_count})
            </Button>
          </div>

          {/* Badges row */}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {requirement.projects && (
              <Badge variant="outline" className="gap-1">
                <FolderOpen
                  className={`h-3.5 w-3.5 ${getProjectColor(
                    requirement.projects.color
                  )}`}
                />
                <span className="truncate max-w-[220px]">
                  {requirement.projects.name}
                </span>
              </Badge>
            )}

            <Badge className={getTypeColor(requirement.type)}>
              {requirement.type.replace("_", " ")}
            </Badge>

            <Badge className={getPriorityColor(requirement.priority)}>
              {requirement.priority}
            </Badge>

            {getStatusBadge(requirement.status)}

            {requirement.external_id && (
              <Badge variant="outline" className="gap-1">
                <ExternalLink className="h-3.5 w-3.5" />
                <span className="truncate max-w-[220px]">
                  {requirement.external_id}
                </span>
              </Badge>
            )}

            {/* Coverage pill (keeps consistent baseline with badges) */}
            <Badge variant="secondary" className="gap-2">
              <BarChart3 className="h-3.5 w-3.5" />
              <span
                className={`font-medium ${getCoverageColor(
                  requirement.coverage_percentage
                )}`}
              >
                {requirement.coverage_percentage}% coverage
              </span>
            </Badge>
          </div>
        </DialogHeader>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          <div className="space-y-6">
            {/* Full Description */}
            <section>
              <h4 className="text-sm font-semibold">Description</h4>
              <p className="mt-2 text-sm text-muted-foreground whitespace-pre-wrap">
                {requirement.description || "—"}
              </p>
            </section>

            {/* Acceptance Criteria */}
            {hasCriteria && (
              <section>
                <h4 className="text-sm font-semibold">Acceptance Criteria</h4>
                <ul className="mt-2 space-y-2">
                  {requirement.acceptance_criteria!.map((criteria, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <span className="mt-0.5 inline-flex h-6 min-w-6 items-center justify-center rounded bg-muted px-2 text-xs font-mono">
                        {index + 1}
                      </span>
                      <p className="text-sm leading-relaxed">{criteria}</p>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* Coverage Summary */}
            {requirement.test_case_count > 0 && (
              <section className="rounded-lg border bg-muted/30 p-4">
                <h4 className="text-sm font-semibold">Test Coverage Summary</h4>
                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="rounded-md bg-background/60 p-3 border">
                    <p className="text-xs text-muted-foreground">
                      Linked Test Cases
                    </p>
                    <p className="mt-1 text-2xl font-bold">
                      {requirement.test_case_count}
                    </p>
                  </div>

                  <div className="rounded-md bg-background/60 p-3 border">
                    <p className="text-xs text-muted-foreground">Coverage</p>
                    <p
                      className={`mt-1 text-2xl font-bold ${getCoverageColor(
                        requirement.coverage_percentage
                      )}`}
                    >
                      {requirement.coverage_percentage}%
                    </p>
                  </div>
                </div>
              </section>
            )}

            {/* Metadata */}
            <section className="pt-4 border-t">
              <h4 className="text-sm font-semibold">Details</h4>
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-4">
                {requirement.projects && (
                  <div className="rounded-md border p-3">
                    <p className="text-xs text-muted-foreground">Project</p>
                    <div className="mt-2 flex items-center gap-2 min-w-0">
                      <FolderOpen
                        className={`h-4 w-4 shrink-0 ${getProjectColor(
                          requirement.projects.color
                        )}`}
                      />
                      <span className="text-sm truncate">
                        {requirement.projects.name}
                      </span>
                    </div>
                  </div>
                )}

                <div className="rounded-md border p-3">
                  <p className="text-xs text-muted-foreground">Source</p>
                  <p className="mt-2 text-sm capitalize">
                    {requirement.source || "—"}
                  </p>
                </div>

                <div className="rounded-md border p-3">
                  <p className="text-xs text-muted-foreground">Created</p>
                  <p className="mt-2 text-sm">
                    {new Date(requirement.created_at).toLocaleDateString()}
                  </p>
                </div>

                {requirement.external_id && (
                  <div className="rounded-md border p-3">
                    <p className="text-xs text-muted-foreground">External ID</p>
                    <p className="mt-2 text-sm break-words">
                      {requirement.external_id}
                    </p>
                  </div>
                )}
              </div>
            </section>
          </div>
        </div>
        <div className="border-t bg-background px-6 py-4">
          <DialogFooter className="gap-2 sm:gap-3">
            <DialogClose asChild>
              <Button variant="outline" onClick={handleClose}>
                Close
              </Button>
            </DialogClose>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
