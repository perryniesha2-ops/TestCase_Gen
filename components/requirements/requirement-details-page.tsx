"use client";

// app/(authenticated)/requirements/[requirementId]/page-client.tsx

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
  getStatusBadge,
} from "@/lib/utils/requirement-helpers";
import type { Requirement } from "@/types/requirements";
import { LinkTestCasesDialog } from "@/components/requirements/link-test-cases-dialog";
import { EditRequirementModal } from "@/components/requirements/edit-requirement-modal";

// ── Helpers ───────────────────────────────────────────────────────────────────

async function safeJson(res: Response) {
  const raw = await res.text().catch(() => "");
  try {
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function normalizeCriteria(value: unknown): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed.map(String).filter(Boolean);
    } catch {
      const parts = value
        .split(/\r?\n|;/g)
        .map((s) => s.trim())
        .filter(Boolean);
      return parts.length ? parts : [value];
    }
  }
  return [];
}

// ── Action button ─────────────────────────────────────────────────────────────

function ActionBtn({
  onClick,
  disabled,
  loading: isLoading,
  children,
  variant = "outline",
}: {
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
  children: React.ReactNode;
  variant?: "outline" | "danger" | "cyan";
}) {
  const base =
    "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-50";
  const styles = {
    outline:
      "border-slate-200 bg-white text-slate-600 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-slate-600",
    cyan: "border-cyan-500/40 bg-cyan-50 text-cyan-700 hover:bg-cyan-100 dark:border-cyan-400/40 dark:bg-cyan-400/10 dark:text-cyan-300 dark:hover:bg-cyan-400/20",
    danger:
      "border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100 dark:border-rose-400/20 dark:bg-rose-400/5 dark:text-rose-400 dark:hover:bg-rose-400/10",
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled || isLoading}
      className={`${base} ${styles[variant]}`}
    >
      {children}
    </button>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function SkeletonBlock({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800 ${className}`}
    />
  );
}

// ── Detail row ────────────────────────────────────────────────────────────────

function DetailRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <dt className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">
        {label}
      </dt>
      <dd className="mt-1 text-sm font-medium text-slate-700 dark:text-slate-200">
        {children}
      </dd>
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function RequirementDetailsPageClient({
  requirementId,
}: {
  requirementId: string;
}) {
  const router = useRouter();

  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [requirement, setRequirement] = React.useState<Requirement | null>(
    null,
  );
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
        const payload = await safeJson(res);
        if (!res.ok) throw new Error(payload?.error ?? "Requirement not found");
        setRequirement(payload?.requirement ?? payload ?? null);
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
    if (!window.confirm(`Delete requirement "${requirement.title}"?`)) return;
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

  const handleLinkSuccess = React.useCallback(
    () => fetchDetails({ silent: true }),
    [fetchDetails],
  );
  const handleEditSuccess = React.useCallback(
    () => fetchDetails({ silent: true }),
    [fetchDetails],
  );

  // ── Loading ───────────────────────────────────────────────────────────────

  if (loading)
    return (
      <div className="space-y-4">
        <SkeletonBlock className="h-8 w-3/5" />
        <SkeletonBlock className="h-5 w-2/5" />
        <SkeletonBlock className="h-48 w-full" />
        <SkeletonBlock className="h-36 w-full" />
      </div>
    );

  // ── Not found ─────────────────────────────────────────────────────────────

  if (!requirement)
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white px-6 py-16 text-center dark:border-slate-800 dark:bg-slate-900">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Requirement not found or you don't have access.
        </p>
        <Link
          href="/requirements"
          className="flex items-center gap-1.5 rounded-full border border-slate-200 px-4 py-1.5 text-xs font-medium text-slate-600 transition hover:border-slate-300 dark:border-slate-700 dark:text-slate-300"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Requirements
        </Link>
      </div>
    );

  const criteria = normalizeCriteria(requirement.acceptance_criteria);

  // ── Main render ───────────────────────────────────────────────────────────

  return (
    <>
      <div className="space-y-5">
        {/* ── Header ── */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <Link
              href="/requirements"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-slate-600"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back
            </Link>
            <h1 className="mt-4 text-lg font-semibold leading-snug text-slate-800 line-clamp-2 dark:text-slate-100">
              {requirement.title}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {requirement.type ? (
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 font-mono text-[10px] font-medium ${getTypeColor(requirement.type)}`}
                >
                  {requirement.type.replaceAll("_", " ")}
                </span>
              ) : (
                <span className="rounded-full border border-slate-200 px-2.5 py-0.5 font-mono text-[10px] text-slate-400 dark:border-slate-700 dark:text-slate-500">
                  No type
                </span>
              )}
              {requirement.priority ? (
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 font-mono text-[10px] font-medium ${getPriorityColor(requirement.priority)}`}
                >
                  {requirement.priority}
                </span>
              ) : (
                <span className="rounded-full border border-slate-200 px-2.5 py-0.5 font-mono text-[10px] text-slate-400 dark:border-slate-700 dark:text-slate-500">
                  No priority
                </span>
              )}
              {requirement.status ? (
                getStatusBadge(requirement.status)
              ) : (
                <span className="rounded-full border border-slate-200 px-2.5 py-0.5 font-mono text-[10px] text-slate-400 dark:border-slate-700 dark:text-slate-500">
                  No status
                </span>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <ActionBtn
              onClick={() => fetchDetails({ silent: true })}
              disabled={refreshing || loading}
              loading={refreshing}
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`}
              />
              Refresh
            </ActionBtn>
            <ActionBtn
              onClick={() => setShowLinkDialog(true)}
              variant="outline"
            >
              <LinkIcon className="h-3.5 w-3.5" /> Link cases
            </ActionBtn>
            <ActionBtn onClick={() => setShowEditDialog(true)} variant="cyan">
              <Pencil className="h-3.5 w-3.5" /> Edit
            </ActionBtn>
            <ActionBtn onClick={handleDelete} variant="danger">
              <Trash2 className="h-3.5 w-3.5" /> Delete
            </ActionBtn>
          </div>
        </div>

        {/* ── Description + Acceptance criteria ── */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
          {requirement.description?.trim() ? (
            <>
              <h3 className="mb-3 text-base font-semibold text-slate-800 dark:text-slate-100">
                Description
              </h3>
              <p className="text-sm leading-relaxed text-slate-500 dark:text-slate-400">
                {requirement.description}
              </p>
              <div className="my-5 border-t border-slate-100 dark:border-slate-800" />
            </>
          ) : null}

          <h3 className="mb-3 text-base font-semibold text-slate-800 dark:text-slate-100">
            Acceptance criteria
          </h3>
          {criteria.length === 0 ? (
            <p className="text-sm text-slate-400 dark:text-slate-500">
              No acceptance criteria defined.
            </p>
          ) : (
            <ul className="space-y-2">
              {criteria.map((c, i) => (
                <li
                  key={`${i}-${c.slice(0, 16)}`}
                  className="flex items-start gap-3"
                >
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-slate-200 font-mono text-[10px] text-slate-400 dark:border-slate-700 dark:text-slate-500">
                    {i + 1}
                  </span>
                  <span className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                    {c}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* ── Metadata ── */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
          <h3 className="mb-4 text-base font-semibold text-slate-800 dark:text-slate-100">
            Details
          </h3>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3 lg:grid-cols-4">
            <DetailRow label="Project">
              {requirement.projects ? (
                <span className="flex items-center gap-1.5">
                  <FolderOpen
                    className={`h-3.5 w-3.5 shrink-0 ${getProjectColor(requirement.projects.color ?? "gray")}`}
                  />
                  <span className="truncate">{requirement.projects.name}</span>
                </span>
              ) : (
                "—"
              )}
            </DetailRow>

            <DetailRow label="External ID">
              {requirement.external_id ? (
                <span className="flex items-center gap-1 text-cyan-600 dark:text-cyan-400">
                  <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{requirement.external_id}</span>
                </span>
              ) : (
                "—"
              )}
            </DetailRow>

            <DetailRow label="Source">{requirement.source || "—"}</DetailRow>

            <DetailRow label="Linked tests">
              <span className="font-mono">
                {requirement.test_case_count ?? 0}
              </span>
            </DetailRow>

            <DetailRow label="Regular tests">
              <span className="font-mono">
                {requirement.regular_test_case_count ?? 0}
              </span>
            </DetailRow>

            <DetailRow label="Cross-platform">
              <span className="font-mono">
                {requirement.platform_test_case_count ?? 0}
              </span>
            </DetailRow>

            <DetailRow label="Created">
              {new Date(requirement.created_at).toLocaleDateString()}
            </DetailRow>

            <DetailRow label="Updated">
              {new Date(requirement.updated_at).toLocaleDateString()}
            </DetailRow>
          </dl>
        </section>
      </div>

      <LinkTestCasesDialog
        requirement={requirement}
        open={showLinkDialog}
        onOpenChange={setShowLinkDialog}
        onLinked={handleLinkSuccess}
      />

      <EditRequirementModal
        requirement={requirement}
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        onSuccess={handleEditSuccess}
      />
    </>
  );
}
