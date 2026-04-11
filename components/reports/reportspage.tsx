"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth/auth-context";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  Eye,
  Loader2,
  BarChart3,
  TrendingUp,
  Clock,
  Download,
  FileText,
  Target,
  Zap,
  Table,
  PieChart,
} from "lucide-react";
import { toast } from "sonner";
import type { SavedReport } from "./reportbuilder";

// ─── Palettes ─────────────────────────────────────────────────────────────────

const CARD_PALETTES = [
  {
    accent: "from-blue-500 via-blue-400 to-transparent",
    iconBg: "bg-blue-500/20",
    iconColor: "text-blue-400",
    statColor: "text-blue-400",
    hoverBorder: "hover:border-blue-500/40",
  },
  {
    accent: "from-violet-500 via-violet-400 to-transparent",
    iconBg: "bg-violet-500/20",
    iconColor: "text-violet-400",
    statColor: "text-violet-400",
    hoverBorder: "hover:border-violet-500/40",
  },
  {
    accent: "from-emerald-500 via-emerald-400 to-transparent",
    iconBg: "bg-emerald-500/20",
    iconColor: "text-emerald-400",
    statColor: "text-emerald-400",
    hoverBorder: "hover:border-emerald-500/40",
  },
  {
    accent: "from-orange-500 via-orange-400 to-transparent",
    iconBg: "bg-orange-500/20",
    iconColor: "text-orange-400",
    statColor: "text-orange-400",
    hoverBorder: "hover:border-orange-500/40",
  },
  {
    accent: "from-rose-500 via-rose-400 to-transparent",
    iconBg: "bg-rose-500/20",
    iconColor: "text-rose-400",
    statColor: "text-rose-400",
    hoverBorder: "hover:border-rose-500/40",
  },
  {
    accent: "from-cyan-500 via-cyan-400 to-transparent",
    iconBg: "bg-cyan-500/20",
    iconColor: "text-cyan-400",
    statColor: "text-cyan-400",
    hoverBorder: "hover:border-cyan-500/40",
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const DATE_RANGE_LABELS: Record<string, string> = {
  "7d": "7 days",
  "14d": "14 days",
  "30d": "30 days",
  "90d": "90 days",
};

const METRIC_ICONS: Record<string, React.ReactNode> = {
  pass_rate_card: <Target className="h-3 w-3" />,
  total_tests_card: <FileText className="h-3 w-3" />,
  coverage_card: <BarChart3 className="h-3 w-3" />,
  automation_runs_card: <Zap className="h-3 w-3" />,
  execution_trend_line: <TrendingUp className="h-3 w-3" />,
  status_distribution_pie: <PieChart className="h-3 w-3" />,
  test_type_breakdown_bar: <BarChart3 className="h-3 w-3" />,
  suite_performance_table: <Table className="h-3 w-3" />,
  top_failures_table: <Table className="h-3 w-3" />,
  flakiness_table: <Table className="h-3 w-3" />,
};

const METRIC_LABELS: Record<string, string> = {
  pass_rate_card: "Pass Rate",
  total_tests_card: "Total Tests",
  coverage_card: "Coverage",
  automation_runs_card: "Automation",
  execution_trend_line: "Trend",
  status_distribution_pie: "Distribution",
  test_type_breakdown_bar: "Test Types",
  suite_performance_table: "Suites",
  top_failures_table: "Failures",
  flakiness_table: "Flakiness",
};

function getCardIcon(sections: SavedReport["config"]["sections"]) {
  const metrics = sections.map((s) => s.metric);
  if (metrics.includes("execution_trend_line"))
    return <TrendingUp className="h-5 w-5" />;
  if (metrics.includes("pass_rate_card")) return <Target className="h-5 w-5" />;
  if (metrics.includes("status_distribution_pie"))
    return <PieChart className="h-5 w-5" />;
  if (metrics.includes("coverage_card"))
    return <BarChart3 className="h-5 w-5" />;
  if (metrics.includes("automation_runs_card"))
    return <Zap className="h-5 w-5" />;
  return <BarChart3 className="h-5 w-5" />;
}

function getRelativeTime(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ onNew }: { onNew: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
      <div className="rounded-2xl bg-muted/50 border border-border p-6 mb-6">
        <BarChart3 className="h-10 w-10 text-muted-foreground mx-auto" />
      </div>
      <h3 className="text-lg font-semibold mb-2">No reports yet</h3>
      <p className="text-muted-foreground text-sm max-w-sm mb-6">
        Build custom reports with the metrics that matter to your team.
      </p>
      <Button onClick={onNew}>
        <Plus className="h-4 w-4 mr-2" />
        Create your first report
      </Button>
      <div className="mt-10 grid grid-cols-2 sm:grid-cols-3 gap-3 max-w-lg w-full">
        {[
          {
            icon: <TrendingUp className="h-4 w-4" />,
            label: "Execution trends",
          },
          { icon: <Target className="h-4 w-4" />, label: "Pass rate cards" },
          {
            icon: <PieChart className="h-4 w-4" />,
            label: "Status distribution",
          },
          { icon: <Table className="h-4 w-4" />, label: "Top failures" },
          {
            icon: <BarChart3 className="h-4 w-4" />,
            label: "Coverage metrics",
          },
          { icon: <Zap className="h-4 w-4" />, label: "Automation stats" },
        ].map((item) => (
          <div
            key={item.label}
            className="flex items-center gap-2 p-3 rounded-lg border bg-muted/30 text-xs text-muted-foreground"
          >
            {item.icon}
            {item.label}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Report card ──────────────────────────────────────────────────────────────

function ReportCard({
  report,
  palette,
  onDelete,
}: {
  report: SavedReport;
  palette: (typeof CARD_PALETTES)[number];
  onDelete: (id: string, name: string) => void;
}) {
  const sections = report.config?.sections ?? [];
  const dateRange = report.config?.filters?.date_range ?? "30d";
  const hasProjectFilter = !!report.config?.filters?.project_id;
  const hasSuiteFilter = !!report.config?.filters?.suite_id;

  return (
    <div
      className={`group relative flex flex-col rounded-xl border bg-card hover:shadow-md transition-all duration-200 overflow-hidden ${palette.hoverBorder}`}
    >
      {/* Accent bar */}
      <div className={`h-1 w-full bg-gradient-to-r ${palette.accent}`} />

      <div className="p-5 flex-1 flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className={`p-2 rounded-lg shrink-0 ${palette.iconBg}`}>
              <span className={palette.iconColor}>{getCardIcon(sections)}</span>
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-sm leading-tight truncate">
                {report.name}
              </h3>
              <div className="flex items-center gap-1.5 mt-0.5">
                <Clock className="h-3 w-3 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">
                  {getRelativeTime(report.updated_at)}
                </span>
              </div>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem asChild>
                <Link href={`/reports/${report.id}`}>
                  <Eye className="h-4 w-4 mr-2" />
                  View Report
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={`/reports/${report.id}/edit`}>
                  <Pencil className="h-4 w-4 mr-2" />
                  Edit
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => onDelete(report.id, report.name)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span
            className={`text-2xl font-bold tabular-nums ${palette.statColor}`}
          >
            {sections.length}
          </span>
          <span>section{sections.length !== 1 ? "s" : ""}</span>
          <span className="text-muted-foreground/30">·</span>
          <span>{DATE_RANGE_LABELS[dateRange] ?? dateRange}</span>
          {(hasProjectFilter || hasSuiteFilter) && (
            <>
              <span className="text-muted-foreground/30">·</span>
              <span>
                {hasProjectFilter && hasSuiteFilter
                  ? "Filtered"
                  : hasProjectFilter
                    ? "By project"
                    : "By suite"}
              </span>
            </>
          )}
        </div>

        {/* Section chips */}
        {sections.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {sections.slice(0, 4).map((s) => (
              <div
                key={s.id}
                className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-muted text-muted-foreground text-xs"
              >
                {METRIC_ICONS[s.metric]}
                {METRIC_LABELS[s.metric] ?? s.metric}
              </div>
            ))}
            {sections.length > 4 && (
              <div className="px-2 py-0.5 rounded-md bg-muted text-muted-foreground text-xs">
                +{sections.length - 4} more
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-5 py-3 border-t bg-muted/20 flex items-center gap-2">
        <Button size="sm" className="flex-1 h-7 text-xs" asChild>
          <Link href={`/reports/${report.id}`}>
            <Eye className="h-3 w-3 mr-1.5" />
            View
          </Link>
        </Button>
        <Button size="sm" variant="outline" className="h-7 w-7 p-0" asChild>
          <Link href={`/reports/${report.id}/edit`}>
            <Pencil className="h-3 w-3" />
          </Link>
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="h-7 w-7 p-0"
          onClick={() => {
            window.location.href = `/reports/${report.id}`;
          }}
        >
          <Download className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function ReportsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [reports, setReports] = useState<SavedReport[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchReports = async () => {
    if (!user) return;
    const supabase = createClient();
    const { data, error } = await supabase
      .from("reports")
      .select("*")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false });

    if (error) {
      toast.error("Failed to load reports");
    } else {
      setReports((data ?? []) as SavedReport[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    void fetchReports();
  }, [user]);

  const handleDelete = async (id: string, name: string) => {
    const confirmed = window.confirm(
      `Delete "${name}"? This cannot be undone.`,
    );
    if (!confirmed) return;
    const supabase = createClient();
    const { error } = await supabase.from("reports").delete().eq("id", id);
    if (error) {
      toast.error("Failed to delete report");
    } else {
      toast.success("Report deleted");
      setReports((prev) => prev.filter((r) => r.id !== id));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div />
        <Button
          onClick={() => router.push("/reports/new")}
          className="shrink-0"
        >
          <Plus className="h-4 w-4 mr-2" />
          New Report
        </Button>
      </div>

      {reports.length === 0 ? (
        <EmptyState onNew={() => router.push("/reports/new")} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {reports.map((report, idx) => (
            <ReportCard
              key={report.id}
              report={report}
              palette={CARD_PALETTES[idx % CARD_PALETTES.length]}
              onDelete={handleDelete}
            />
          ))}

          {/* New report card */}
          <button
            onClick={() => router.push("/reports/new")}
            className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/20 hover:bg-muted/40 hover:border-primary/40 transition-all duration-200 min-h-[200px] gap-3 text-muted-foreground hover:text-foreground group"
          >
            <div className="rounded-full border border-dashed border-current p-3 group-hover:border-primary/60 transition-colors">
              <Plus className="h-5 w-5" />
            </div>
            <span className="text-sm font-medium">New Report</span>
          </button>
        </div>
      )}
    </div>
  );
}
