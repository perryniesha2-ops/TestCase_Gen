// lib/utils/requirement-helpers.tsx
import { Badge } from "@/components/ui/badge";
import { CheckCircle, AlertTriangle, Target } from "lucide-react";
import type { RequirementStatus } from "@/types/requirements";

// ─── Type color ───────────────────────────────────────────────────────────────

export function getTypeColor(type: string): string {
  const colors: Record<string, string> = {
    functional: "bg-blue-500 text-white",
    user_story: "bg-green-500 text-white",
    use_case: "bg-purple-500 text-white",
    non_functional: "bg-orange-500 text-white",
  };
  return colors[type] ?? "bg-gray-500 text-white";
}

// ─── Priority color ───────────────────────────────────────────────────────────

export function getPriorityColor(priority: string): string {
  const colors: Record<string, string> = {
    critical: "bg-red-500 text-white",
    high: "bg-orange-500 text-white",
    medium: "bg-yellow-500 text-black",
    low: "bg-blue-500 text-white",
  };
  return colors[priority] ?? "bg-gray-500 text-white";
}

// ─── Status badge ─────────────────────────────────────────────────────────────
// Accepts the full set of statuses used in the DB, not just draft/active/archived.

export function getStatusBadge(status: string) {
  const variants: Record<
    RequirementStatus,
    {
      variant: "default" | "secondary" | "outline" | "destructive";
      label: string;
    }
  > = {
    draft: { variant: "outline", label: "Draft" },
    approved: { variant: "default", label: "Approved" },
    implemented: { variant: "default", label: "Implemented" },
    tested: { variant: "default", label: "Tested" },
    rejected: { variant: "destructive", label: "Rejected" },
    archived: { variant: "secondary", label: "Archived" },
  };
  const config = variants[status as RequirementStatus] ?? {
    variant: "outline" as const,
    label: status ?? "Unknown",
  };
  return <Badge variant={config.variant}>{config.label}</Badge>;
}

// ─── Coverage helpers ─────────────────────────────────────────────────────────

export function getCoverageColor(percentage: number): string {
  if (percentage >= 80) return "text-green-600";
  if (percentage >= 60) return "text-yellow-600";
  return "text-red-600";
}

export function getCoverageIcon(percentage: number) {
  if (percentage >= 80)
    return <CheckCircle className="h-4 w-4 text-green-600" />;
  if (percentage >= 60)
    return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
  return <Target className="h-4 w-4 text-red-600" />;
}

// ─── Project color ────────────────────────────────────────────────────────────

export function getProjectColor(color: string): string {
  const colors: Record<string, string> = {
    blue: "text-blue-500",
    green: "text-green-500",
    purple: "text-purple-500",
    orange: "text-orange-500",
    red: "text-red-500",
    pink: "text-pink-500",
    indigo: "text-indigo-500",
    yellow: "text-yellow-500",
    gray: "text-gray-500",
  };
  return colors[color] ?? "text-gray-500";
}

// ─── Relative time ────────────────────────────────────────────────────────────

export function getRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}
