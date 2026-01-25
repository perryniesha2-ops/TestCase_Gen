"use client";

import * as React from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

import {
  Eye,
  Edit,
  Trash2,
  Sparkles,
  ExternalLink,
  Link as LinkIcon,
  FolderOpen,
} from "lucide-react";

import type { Requirement } from "@/types/requirements";
import {
  getPriorityColor,
  getProjectColor,
  getRelativeTime,
  getStatusBadge,
  getTypeColor,
} from "@/lib/utils/requirement-helpers";
import { Badge } from "@/components/ui/badge";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  requirement: Requirement | null;

  onView: (requirement: Requirement) => void;
  onLinkTests: (requirement: Requirement) => void;
  onEdit: (requirement: Requirement) => void;
  onDelete: (requirement: Requirement) => void;
};

export function RequirementActionsSheet({
                                          open,
                                          onOpenChange,
                                          requirement,
                                          onView,
                                          onLinkTests,
                                          onEdit,
                                          onDelete,
                                        }: Props) {
  const r = requirement;

  return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
            side="right"
            className="w-full sm:max-w-lg p-0 flex flex-col"
            onInteractOutside={(e) => e.preventDefault()}
        >
          <SheetHeader className="px-6 pt-6 pb-4 border-b">
            <SheetTitle className="flex items-start justify-between gap-3">
            <span className="min-w-0">
              <span className="block text-base font-semibold truncate">
                {r?.title ?? "Requirement"}
              </span>
              {r?.external_id ? (
                  <span className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground">
                  <ExternalLink className="h-3 w-3" />
                    {r.external_id}
                </span>
              ) : (
                  <span className="mt-1 block text-xs text-muted-foreground">
                  No external ID
                </span>
              )}
            </span>
            </SheetTitle>
            <SheetDescription>
              Quick actions for this requirement.
            </SheetDescription>

            {r && (
                <div className="pt-3 flex flex-wrap items-center gap-2">
                  <Badge className={getTypeColor(r.type)}>
                    {r.type.replace("_", " ")}
                  </Badge>
                  <Badge className={getPriorityColor(r.priority)}>
                    {r.priority}
                  </Badge>
                  {getStatusBadge(r.status)}
                  <span className="text-xs text-muted-foreground ml-auto">
                Created {getRelativeTime(r.created_at)}
              </span>
                </div>
            )}

            {r?.projects ? (
                <div className="pt-3 flex items-center gap-2 text-sm">
                  <FolderOpen
                      className={`h-4 w-4 ${getProjectColor(r.projects.color)}`}
                  />
                  <span className="truncate">{r.projects.name}</span>
                </div>
            ) : (
                <div className="pt-3 text-xs text-muted-foreground">No project</div>
            )}
          </SheetHeader>

          <div className="flex-1 overflow-auto px-6 py-5 space-y-5">
            {r?.description ? (
                <div className="space-y-2">
                  <div className="text-sm font-medium">Description</div>
                  <div className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {r.description}
                  </div>
                </div>
            ) : (
                <div className="text-sm text-muted-foreground">No description.</div>
            )}

            <Separator />

            <div className="space-y-2">
              <div className="text-sm font-medium">Actions</div>

              <div className="flex gap-2 pt-4 border-t">
                <Button
                    size="sm"
                    className="flex-1 h-9 gap-2"
                    onClick={() => {
                      if (!r) return;
                      onView(r);
                      onOpenChange(false);
                    }}
                    disabled={!r}
                >
                  <Eye className="h-4 w-4" />
                  View Details
                </Button>

                <Button
                    variant="outline"
                    className="flex-1 h-9 gap-2"
                    onClick={() => {
                      if (!r) return;
                      onLinkTests(r);
                      onOpenChange(false);
                    }}
                    disabled={!r}
                >
                  <LinkIcon className="h-4 w-4" />
                  Link Tests
                </Button>

                <Button
                    className="flex-1 h-9 gap-2"
                    onClick={() => {
                      if (!r) return;
                      onEdit(r);
                      onOpenChange(false);
                    }}
                    disabled={!r}
                >
                  <Edit className="h-4 w-4" />
                  Edit
                </Button>
              </div>
            </div>
          </div>
          <div className="border-t px-6 py-4 bg-background">
            <div className="flex items-center justify-between gap-2">
              <Button
                  variant="destructive"
                  className="justify-start gap-2"
                  onClick={() => {
                    if (!r) return;
                    onDelete(r);
                    onOpenChange(false);
                  }}
                  disabled={!r}
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </Button>
              <SheetClose asChild>
                <Button size="sm" variant="outline" className="h-8 px-3">
                  Close
                </Button>
              </SheetClose>
            </div>
          </div>
        </SheetContent>
      </Sheet>
  );
}
