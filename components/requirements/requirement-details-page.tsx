// app/(authenticated)/requirements/[requirementId]/page-client.tsx
"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";

import {
  ArrowLeft,
  ExternalLink,
  FolderOpen,
  Pencil,
  Trash2,
  RefreshCw,
  Link as LinkIcon,
} from "lucide-react";

import { toastError, toastSuccess } from "@/lib/utils/toast-utils";
import {
  getProjectColor,
  getPriorityColor,
  getTypeColor,
} from "@/lib/utils/requirement-helpers";

// Import the dialogs
import { LinkTestCasesDialog } from "@/components/requirements/link-test-cases-dialog";
import { EditRequirementModal } from "@/components/requirements/edit-requirement-modal";

type Project = {
  id: string;
  name: string;
  color: string | null;
  icon: string | null;
} | null;

type RequirementDetails = {
  id: string;
  title: string;
  description: string | null;
  type: string | null;
  priority: string | null;
  status: string | null;
  source: string | null;
  external_id: string | null;
  project_id: string | null;
  projects: Project;
  acceptance_criteria: unknown | null;
  created_at: string;
  updated_at: string;

  // from links table aggregation
  test_case_count: number;
  regular_test_case_count: number;
  platform_test_case_count: number;
};

type RequirementDetailsResponse = {
  requirement: RequirementDetails;
};

async function safeJson(res: Response) {
  const raw = await res.text().catch(() => "");
  try {
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function normalizeCriteria(value: unknown | null): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value.map(String).filter(Boolean);

  // Sometimes older data can be a string or object
  if (typeof value === "string") {
    // Try to parse as JSON first
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed.map(String).filter(Boolean);
      }
    } catch {
      // Not JSON, try splitting
      const parts = value
        .split(/\r?\n|;/g)
        .map((s) => s.trim())
        .filter(Boolean);
      return parts.length ? parts : [value];
    }
  }

  return [];
}

export default function RequirementDetailsPageClient({
  requirementId,
}: {
  requirementId: string;
}) {
  const router = useRouter();

  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [requirement, setRequirement] =
    React.useState<RequirementDetails | null>(null);

  // Dialog states
  const [showLinkDialog, setShowLinkDialog] = React.useState(false);
  const [showEditDialog, setShowEditDialog] = React.useState(false);

  const fetchDetails = React.useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!opts?.silent) setLoading(true);
      else setRefreshing(true);

      try {
        const res = await fetch(`/api/requirements/${requirementId}`, {
          cache: "no-store",
        });
        const payload = (await safeJson(res)) as
          | RequirementDetailsResponse
          | any;

        if (!res.ok) {
          throw new Error(payload?.error ?? "Requirement not found");
        }

        setRequirement(payload?.requirement ?? null);
      } catch (e: any) {
        toastError(e?.message ?? "Failed to load requirement");
        setRequirement(null);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [requirementId],
  );

  React.useEffect(() => {
    fetchDetails();
  }, [fetchDetails]);

  const handleDelete = React.useCallback(async () => {
    if (!requirement) return;
    const ok = window.confirm(`Delete requirement "${requirement.title}"?`);
    if (!ok) return;

    try {
      const res = await fetch(`/api/requirements/${requirement.id}`, {
        method: "DELETE",
      });
      const payload = await safeJson(res);

      if (!res.ok) throw new Error(payload?.error ?? "Delete failed");

      toastSuccess("Requirement deleted");
      router.push("/requirements");
      router.refresh();
    } catch (e: any) {
      toastError(e?.message ?? "Failed to delete");
    }
  }, [requirement, router]);

  const handleLinkSuccess = React.useCallback(() => {
    // Refresh to get updated test case counts
    fetchDetails({ silent: true });
  }, [fetchDetails]);

  const handleEditSuccess = React.useCallback(() => {
    // Refresh to get updated requirement data
    fetchDetails({ silent: true });
  }, [fetchDetails]);

  const header = (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-xl font-semibold leading-snug break-words line-clamp-2">
          {requirement?.title ?? "Requirement"}
        </h1>

        <div className="mt-2 flex flex-wrap items-center gap-2">
          {requirement?.type ? (
            <Badge className={getTypeColor(requirement.type)}>
              {requirement.type.replaceAll("_", " ")}
            </Badge>
          ) : (
            <Badge variant="outline">No type</Badge>
          )}

          {requirement?.priority ? (
            <Badge className={getPriorityColor(requirement.priority)}>
              {requirement.priority}
            </Badge>
          ) : (
            <Badge variant="outline">No priority</Badge>
          )}

          {requirement?.status ? (
            <Badge variant="outline">{requirement.status}</Badge>
          ) : (
            <Badge variant="outline">No status</Badge>
          )}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2 flex-wrap">
        <Button variant="outline" size="sm" asChild>
          <Link href="/requirements">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Link>
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={() => fetchDetails({ silent: true })}
          disabled={refreshing || loading}
        >
          <RefreshCw
            className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`}
          />
          Refresh
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowLinkDialog(true)}
          disabled={!requirement}
        >
          <LinkIcon className="h-4 w-4 mr-2" />
          Link Cases
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowEditDialog(true)}
          disabled={!requirement}
        >
          <Pencil className="h-4 w-4 mr-2" />
          Edit
        </Button>

        <Button
          variant="destructive"
          size="sm"
          onClick={handleDelete}
          disabled={!requirement}
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Delete
        </Button>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-[60%]" />
        <Skeleton className="h-5 w-[40%]" />
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-[30%]" />
          </CardHeader>
          <CardContent className="space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-[90%]" />
            <Skeleton className="h-4 w-[70%]" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!requirement) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Requirement not found</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            The requirement may have been deleted or you don't have access.
          </p>
          <Button asChild variant="outline">
            <Link href="/requirements">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Requirements
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const criteria = normalizeCriteria(requirement.acceptance_criteria);

  return (
    <>
      <div className="space-y-6">
        {header}

        {/* Stacked layout - Details first, then Meta */}
        <div className="space-y-4">
          {/* Details Card */}
          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="text-sm font-medium mb-1">Description</div>
                <div className="text-sm text-muted-foreground whitespace-pre-wrap break-words">
                  {requirement.description?.trim()
                    ? requirement.description
                    : "—"}
                </div>
              </div>

              <Separator />

              <div>
                <div className="text-sm font-medium mb-2">
                  Acceptance Criteria
                </div>

                {criteria.length === 0 ? (
                  <p className="text-sm text-muted-foreground">—</p>
                ) : (
                  <ul className="list-disc pl-5 space-y-1">
                    {criteria.map((c, i) => (
                      <li
                        key={`${i}-${c.slice(0, 16)}`}
                        className="text-sm break-words"
                      >
                        {c}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Meta Card */}
          <Card>
            <CardHeader>
              <CardTitle>Metadata</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <span className="text-sm text-muted-foreground">
                    Project:
                  </span>{" "}
                  {requirement.projects ? (
                    <div className="flex items-center gap-2">
                      <FolderOpen
                        className={`h-4 w-4 ${getProjectColor(requirement.projects.color ?? "gray")}`}
                      />
                      <span className="text-sm font-medium truncate">
                        {requirement.projects.name}
                      </span>
                    </div>
                  ) : (
                    <span className="text-sm text-muted-foreground">—</span>
                  )}
                </div>

                <div className="space-y-1">
                  <span className="text-sm text-muted-foreground">
                    External ID:
                  </span>{" "}
                  {requirement.external_id ? (
                    <div className="flex items-center gap-1">
                      <ExternalLink className="h-3 w-3" />
                      <span className="text-sm font-medium truncate">
                        {requirement.external_id}
                      </span>
                    </div>
                  ) : (
                    <span className="text-sm text-muted-foreground">—</span>
                  )}
                </div>

                <div className="space-y-1">
                  <span className="text-sm text-muted-foreground">Source:</span>
                  <span className="text-sm font-medium">
                    {" "}
                    {requirement.source || "—"}
                  </span>
                </div>

                <div className="space-y-1">
                  <span className="text-sm text-muted-foreground">
                    Linked Tests:
                  </span>
                  <span className="text-sm font-medium">
                    {" "}
                    {requirement.test_case_count ?? 0}
                  </span>
                </div>

                <div className="space-y-1">
                  <span className="text-sm text-muted-foreground">
                    Regular Tests:
                  </span>
                  <span className="text-sm font-medium">
                    {" "}
                    {requirement.regular_test_case_count ?? 0}
                  </span>
                </div>

                <div className="space-y-1">
                  <span className="text-sm text-muted-foreground">
                    Cross-Platform: {requirement.platform_test_case_count ?? 0}
                  </span>
                </div>

                <div className="space-y-1">
                  <span className="text-sm text-muted-foreground">
                    Created:
                  </span>
                  <span className="text-sm font-medium truncate">
                    {" "}
                    {new Date(requirement.created_at).toLocaleDateString()}
                  </span>
                </div>

                <div className="space-y-1">
                  <span className="text-sm text-muted-foreground">
                    Updated:
                  </span>
                  <span className="text-sm font-medium truncate">
                    {" "}
                    {new Date(requirement.updated_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
          <div className="h-4" />
        </div>
      </div>

      {/* Link Test Cases Dialog */}
      {requirement && (
        <LinkTestCasesDialog
          requirement={requirement as any}
          open={showLinkDialog}
          onOpenChange={setShowLinkDialog}
          onLinked={handleLinkSuccess}
        />
      )}

      {/* Edit Requirement Dialog */}
      {requirement && (
        <EditRequirementModal
          requirement={requirement as any}
          open={showEditDialog}
          onOpenChange={setShowEditDialog}
          onSuccess={handleEditSuccess}
        />
      )}
    </>
  );
}
