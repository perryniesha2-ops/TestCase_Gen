"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Save,
  Plus,
  Trash2,
  Loader2,
  Eye,
  EyeOff,
  BarChart3,
  PieChart,
  TrendingUp,
  Table2,
  Hash,
  CheckCircle2,
  ArrowLeft,
  ChevronUp,
  ChevronDown,
  SlidersHorizontal,
  LayoutTemplate,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { ReportViewer } from "./reportviewer";

// ─── Types ────────────────────────────────────────────────────────────────────

export type MetricType =
  | "pass_rate_card"
  | "execution_trend_line"
  | "status_distribution_pie"
  | "coverage_card"
  | "flakiness_table"
  | "suite_performance_table"
  | "automation_runs_card"
  | "test_type_breakdown_bar"
  | "top_failures_table"
  | "total_tests_card";

export type ChartSection = {
  id: string;
  metric: MetricType;
  title?: string;
};

export type ReportFilters = {
  date_range: "7d" | "14d" | "30d" | "90d";
  suite_id: string | null;
  project_id: string | null;
  status: string[];
};

export type ReportConfig = {
  filters: ReportFilters;
  sections: ChartSection[];
};

export type SavedReport = {
  id: string;
  name: string;
  config: ReportConfig;
  created_at: string;
  updated_at: string;
};

// ─── Metric catalogue ─────────────────────────────────────────────────────────

const METRIC_OPTIONS: Array<{
  metric: MetricType;
  label: string;
  description: string;
  icon: React.ReactNode;
  category: "execution" | "coverage" | "automation" | "quality";
  type: "card" | "chart" | "table";
}> = [
  {
    metric: "total_tests_card",
    label: "Total Tests",
    description: "Count of all test cases",
    icon: <Hash className="h-3.5 w-3.5" />,
    category: "execution",
    type: "card",
  },
  {
    metric: "pass_rate_card",
    label: "Pass Rate",
    description: "Percentage of tests passing",
    icon: <CheckCircle2 className="h-3.5 w-3.5" />,
    category: "execution",
    type: "card",
  },
  {
    metric: "execution_trend_line",
    label: "Execution Trend",
    description: "Daily pass/fail line chart",
    icon: <TrendingUp className="h-3.5 w-3.5" />,
    category: "execution",
    type: "chart",
  },
  {
    metric: "status_distribution_pie",
    label: "Status Distribution",
    description: "Pie chart of test states",
    icon: <PieChart className="h-3.5 w-3.5" />,
    category: "execution",
    type: "chart",
  },
  {
    metric: "top_failures_table",
    label: "Top Failures",
    description: "Tests that fail most often",
    icon: <Table2 className="h-3.5 w-3.5" />,
    category: "quality",
    type: "table",
  },
  {
    metric: "flakiness_table",
    label: "Flaky Tests",
    description: "Tests with inconsistent results",
    icon: <Table2 className="h-3.5 w-3.5" />,
    category: "quality",
    type: "table",
  },
  {
    metric: "suite_performance_table",
    label: "Suite Performance",
    description: "Pass rate and run count per suite",
    icon: <Table2 className="h-3.5 w-3.5" />,
    category: "execution",
    type: "table",
  },
  {
    metric: "coverage_card",
    label: "Req. Coverage",
    description: "% of requirements with test cases",
    icon: <BarChart3 className="h-3.5 w-3.5" />,
    category: "coverage",
    type: "card",
  },
  {
    metric: "test_type_breakdown_bar",
    label: "Test Types",
    description: "Bar chart of test type breakdown",
    icon: <BarChart3 className="h-3.5 w-3.5" />,
    category: "quality",
    type: "chart",
  },
  {
    metric: "automation_runs_card",
    label: "Automation Runs",
    description: "Total automation runs and pass rate",
    icon: <CheckCircle2 className="h-3.5 w-3.5" />,
    category: "automation",
    type: "card",
  },
];

const CATEGORIES = [
  { key: "execution" as const, label: "Execution" },
  { key: "coverage" as const, label: "Coverage" },
  { key: "automation" as const, label: "Automation" },
  { key: "quality" as const, label: "Quality" },
];

const DATE_RANGE_OPTIONS = [
  { value: "7d", label: "Last 7 days" },
  { value: "14d", label: "Last 14 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
];

const TYPE_COLORS: Record<string, string> = {
  card: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  chart: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
  table: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
};

// ─── Default config ───────────────────────────────────────────────────────────

function defaultConfig(): ReportConfig {
  return {
    filters: {
      date_range: "30d",
      suite_id: null,
      project_id: null,
      status: [],
    },
    sections: [
      { id: crypto.randomUUID(), metric: "pass_rate_card" },
      { id: crypto.randomUUID(), metric: "execution_trend_line" },
      { id: crypto.randomUUID(), metric: "status_distribution_pie" },
    ],
  };
}

// ─── Component ────────────────────────────────────────────────────────────────

interface ReportBuilderProps {
  reportId?: string;
}

export function ReportBuilder({ reportId }: ReportBuilderProps) {
  const router = useRouter();
  const { user } = useAuth();
  const [name, setName] = useState("My Report");
  const [config, setConfig] = useState<ReportConfig>(defaultConfig());
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(!!reportId);
  const [preview, setPreview] = useState(false);
  const [suites, setSuites] = useState<Array<{ id: string; name: string }>>([]);
  const [projects, setProjects] = useState<Array<{ id: string; name: string }>>(
    [],
  );
  const [activeCategory, setActiveCategory] = useState<string>("execution");

  useEffect(() => {
    if (!reportId || !user) return;
    const supabase = createClient();
    supabase
      .from("reports")
      .select("*")
      .eq("id", reportId)
      .eq("user_id", user.id)
      .single()
      .then(({ data, error }) => {
        if (error || !data) {
          toast.error("Report not found");
          router.push("/reports");
          return;
        }
        setName(data.name);
        setConfig(data.config as ReportConfig);
        setLoading(false);
      });
  }, [reportId, user, router]);

  useEffect(() => {
    if (!user) return;
    const supabase = createClient();
    Promise.all([
      supabase
        .from("suites")
        .select("id, name")
        .eq("user_id", user.id)
        .order("name"),
      supabase
        .from("projects")
        .select("id, name")
        .eq("user_id", user.id)
        .order("name"),
    ]).then(([suitesRes, projectsRes]) => {
      setSuites(suitesRes.data ?? []);
      setProjects(projectsRes.data ?? []);
    });
  }, [user]);

  const updateFilters = useCallback((patch: Partial<ReportFilters>) => {
    setConfig((prev) => ({ ...prev, filters: { ...prev.filters, ...patch } }));
  }, []);

  const addSection = useCallback((metric: MetricType) => {
    setConfig((prev) => ({
      ...prev,
      sections: [...prev.sections, { id: crypto.randomUUID(), metric }],
    }));
  }, []);

  const removeSection = useCallback((id: string) => {
    setConfig((prev) => ({
      ...prev,
      sections: prev.sections.filter((s) => s.id !== id),
    }));
  }, []);

  const moveSectionUp = useCallback((id: string) => {
    setConfig((prev) => {
      const idx = prev.sections.findIndex((s) => s.id === id);
      if (idx <= 0) return prev;
      const next = [...prev.sections];
      [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
      return { ...prev, sections: next };
    });
  }, []);

  const moveSectionDown = useCallback((id: string) => {
    setConfig((prev) => {
      const idx = prev.sections.findIndex((s) => s.id === id);
      if (idx >= prev.sections.length - 1) return prev;
      const next = [...prev.sections];
      [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
      return { ...prev, sections: next };
    });
  }, []);

  const handleSave = async () => {
    if (!user) return;
    if (!name.trim()) {
      toast.error("Please enter a report name");
      return;
    }
    if (config.sections.length === 0) {
      toast.error("Add at least one section");
      return;
    }

    setSaving(true);
    try {
      const supabase = createClient();
      const payload = {
        user_id: user.id,
        name: name.trim(),
        config,
        updated_at: new Date().toISOString(),
      };

      if (reportId) {
        const { error } = await supabase
          .from("reports")
          .update(payload)
          .eq("id", reportId)
          .eq("user_id", user.id);
        if (error) throw error;
        toast.success("Report updated");
      } else {
        const { data, error } = await supabase
          .from("reports")
          .insert({ ...payload, created_at: new Date().toISOString() })
          .select("id")
          .single();
        if (error) throw error;
        toast.success("Report saved");
        router.push(`/reports/${data.id}`);
      }
    } catch (e: any) {
      toast.error(e?.message || "Failed to save report");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const visibleMetrics = METRIC_OPTIONS.filter(
    (m) => m.category === activeCategory,
  );

  return (
    <div className="space-y-0">
      {/* ── Top bar ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4 pb-5 border-b">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => router.push("/reports")}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors shrink-0"
          >
            <ArrowLeft className="h-4 w-4" />
            Reports
          </button>
          <span className="text-muted-foreground/40 shrink-0">/</span>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-8 text-sm font-medium border-0 shadow-none bg-transparent focus-visible:ring-0 focus-visible:bg-muted/50 rounded-md px-2 min-w-0 w-48"
            placeholder="Report name..."
          />
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setPreview(!preview)}
            className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-md border transition-colors ${
              preview
                ? "bg-muted border-border text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50"
            }`}
          >
            {preview ? (
              <EyeOff className="h-3.5 w-3.5" />
            ) : (
              <Eye className="h-3.5 w-3.5" />
            )}
            {preview ? "Edit" : "Preview"}
          </button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={saving}
            className="gap-1.5"
          >
            {saving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="h-3.5 w-3.5" />
            )}
            {saving ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>

      {preview ? (
        <div className="pt-6">
          <ReportViewer config={config} reportName={name} showExport={false} />
        </div>
      ) : (
        <div className="pt-5 grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
          {/* ── Left column ────────────────────────────────────────────── */}
          <div className="space-y-5">
            {/* Filters */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <SlidersHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Filters
                </span>
              </div>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">
                    Date range
                  </Label>
                  <Select
                    value={config.filters.date_range}
                    onValueChange={(v) =>
                      updateFilters({
                        date_range: v as ReportFilters["date_range"],
                      })
                    }
                  >
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DATE_RANGE_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">
                    Project
                  </Label>
                  <Select
                    value={config.filters.project_id ?? "all"}
                    onValueChange={(v) =>
                      updateFilters({ project_id: v === "all" ? null : v })
                    }
                  >
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue placeholder="All projects" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All projects</SelectItem>
                      {projects.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Suite</Label>
                  <Select
                    value={config.filters.suite_id ?? "all"}
                    onValueChange={(v) =>
                      updateFilters({ suite_id: v === "all" ? null : v })
                    }
                  >
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue placeholder="All suites" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All suites</SelectItem>
                      {suites.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="border-t" />

            {/* Metric picker */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <LayoutTemplate className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Add Sections
                </span>
              </div>

              {/* Category tabs */}
              <div className="flex gap-1 mb-3 p-1 bg-muted/50 rounded-lg">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat.key}
                    onClick={() => setActiveCategory(cat.key)}
                    className={`flex-1 text-xs py-1 px-1.5 rounded-md font-medium transition-colors ${
                      activeCategory === cat.key
                        ? "bg-background shadow-sm text-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              {/* Metric buttons */}
              <div className="space-y-1">
                {visibleMetrics.map((m) => {
                  const alreadyAdded = config.sections.some(
                    (s) => s.metric === m.metric,
                  );
                  return (
                    <button
                      key={m.metric}
                      onClick={() => addSection(m.metric)}
                      className="w-full flex items-center gap-2.5 p-2.5 rounded-lg text-left hover:bg-accent transition-colors group"
                    >
                      <span
                        className={`p-1.5 rounded-md shrink-0 ${TYPE_COLORS[m.type]}`}
                      >
                        {m.icon}
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className="font-medium text-xs block">
                          {m.label}
                        </span>
                        <span className="text-xs text-muted-foreground truncate block">
                          {m.description}
                        </span>
                      </span>
                      <span
                        className={`shrink-0 transition-opacity ${
                          alreadyAdded
                            ? "opacity-20"
                            : "opacity-0 group-hover:opacity-50"
                        }`}
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ── Right column — canvas ───────────────────────────────────── */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Report Layout
              </span>
              {config.sections.length > 0 && (
                <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
                  {config.sections.length}
                </span>
              )}
            </div>

            {config.sections.length === 0 ? (
              <div className="border-2 border-dashed rounded-xl p-16 text-center flex flex-col items-center gap-3 text-muted-foreground">
                <div className="p-3 rounded-xl bg-muted/50">
                  <BarChart3 className="h-6 w-6 opacity-40" />
                </div>
                <div>
                  <p className="text-sm font-medium">No sections yet</p>
                  <p className="text-xs mt-0.5 text-muted-foreground/70">
                    Pick metrics from the left to build your report
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {config.sections.map((section, idx) => {
                  const meta = METRIC_OPTIONS.find(
                    (m) => m.metric === section.metric,
                  );
                  return (
                    <div
                      key={section.id}
                      className="flex items-center gap-3 p-3 rounded-xl border bg-card hover:shadow-sm transition-all group"
                    >
                      {/* Order controls */}
                      <div className="flex flex-col gap-0.5 shrink-0">
                        <button
                          onClick={() => moveSectionUp(section.id)}
                          disabled={idx === 0}
                          className="p-0.5 rounded text-muted-foreground hover:text-foreground disabled:opacity-20 transition-colors"
                        >
                          <ChevronUp className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => moveSectionDown(section.id)}
                          disabled={idx === config.sections.length - 1}
                          className="p-0.5 rounded text-muted-foreground hover:text-foreground disabled:opacity-20 transition-colors"
                        >
                          <ChevronDown className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      {/* Position number */}
                      <span className="text-xs text-muted-foreground/40 w-4 shrink-0 font-mono tabular-nums">
                        {idx + 1}
                      </span>

                      {/* Icon */}
                      <span
                        className={`p-1.5 rounded-md shrink-0 ${TYPE_COLORS[meta?.type ?? "card"]}`}
                      >
                        {meta?.icon}
                      </span>

                      {/* Label */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium leading-tight">
                          {meta?.label}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {meta?.description}
                        </p>
                      </div>

                      {/* Type label */}
                      <span className="text-xs text-muted-foreground capitalize hidden sm:block shrink-0">
                        {meta?.type}
                      </span>

                      {/* Remove */}
                      <button
                        onClick={() => removeSection(section.id)}
                        className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-all shrink-0"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  );
                })}

                <p className="text-xs text-muted-foreground/60 text-center pt-2 pb-1">
                  Use ↑↓ to reorder · hover a section to remove · Preview to
                  check layout
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
