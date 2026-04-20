"use client";

import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useAuth } from "@/lib/auth/auth-context";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  FileText,
  Plus,
  Trash2,
  Edit,
  Copy,
  Star,
  MoreVertical,
  TrendingUp,
  Clock,
  Filter,
  Search,
  Sparkles,
  Shield,
  Zap,
  Globe,
  GitBranch,
  Eye,
  Loader2,
  Play,
} from "lucide-react";
import { getDefaultModel } from "@/lib/ai-models/config";

import { TemplateEditorDialog } from "@/components/templates/template-editor-dialog";
import {
  TemplateContent,
  TemplateCategory,
  TemplateFormData,
} from "@/types/templates";
import type { CanonicalTestType } from "@/components/generator/testtype-multiselect";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Template {
  id: string;
  user_id: string;
  project_id?: string | null;
  name: string;
  description?: string | null;
  category: TemplateCategory;
  template_content: TemplateContent;
  is_public: boolean;
  is_favorite: boolean;
  usage_count: number;
  last_used_at?: string | null;
  created_at: string;
  updated_at: string;
  test_types: string[];
}

type Tab = "my-templates";

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORY_ICONS: Record<
  TemplateCategory,
  React.ComponentType<{ className?: string }>
> = {
  functional: Sparkles,
  security: Shield,
  performance: Zap,
  integration: Globe,
  regression: GitBranch,
  accessibility: Eye,
  other: FileText,
};

const CATEGORY_ACCENT: Record<TemplateCategory, string> = {
  functional: "bg-blue-500",
  security: "bg-red-500",
  performance: "bg-amber-500",
  integration: "bg-purple-500",
  regression: "bg-green-500",
  accessibility: "bg-indigo-500",
  other: "bg-slate-400",
};

const CATEGORY_BADGE: Record<TemplateCategory, string> = {
  functional:
    "bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800",
  security:
    "bg-red-50 text-red-800 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800",
  performance:
    "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800",
  integration:
    "bg-purple-50 text-purple-800 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800",
  regression:
    "bg-green-50 text-green-800 border-green-200 dark:bg-green-950/40 dark:text-green-300 dark:border-green-800",
  accessibility:
    "bg-indigo-50 text-indigo-800 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800",
  other:
    "bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800/40 dark:text-slate-300 dark:border-slate-700",
};

const DEFAULT_FORM: TemplateFormData = {
  name: "",
  description: "",
  category: "functional",
  model: getDefaultModel(),
  testCaseCount: 10,
  test_types: ["happy-path", "negative", "boundary"],
  includeEdgeCases: true,
  includeNegativeTests: true,
  project_id: null,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toCanonicalTestTypes(types: string[]): CanonicalTestType[] {
  const valid: CanonicalTestType[] = [
    "happy-path",
    "negative",
    "security",
    "boundary",
    "edge-case",
    "performance",
    "integration",
    "regression",
    "smoke",
  ];
  return types.filter((t): t is CanonicalTestType =>
    valid.includes(t as CanonicalTestType),
  );
}

function relativeTime(dateStr: string | null | undefined): string | null {
  if (!dateStr) return null;
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days = Math.floor(diff / 86_400_000);
  const weeks = Math.floor(days / 7);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  if (weeks < 5) return `${weeks}w ago`;
  return new Date(dateStr).toLocaleDateString();
}

// ─── Template card ────────────────────────────────────────────────────────────
// Extracted from TemplateManager to avoid recreation on every render

interface TemplateCardProps {
  template: Template;
  onUse: (t: Template) => void;
  onEdit: (t: Template) => void;
  onDuplicate: (t: Template) => void;
  onDelete: (id: string) => void;
  onToggleFavorite: (t: Template) => void;
}

function TemplateCard({
  template,
  onUse,
  onEdit,
  onDuplicate,
  onDelete,
  onToggleFavorite,
}: TemplateCardProps) {
  const CategoryIcon = CATEGORY_ICONS[template.category];
  const accentClass = CATEGORY_ACCENT[template.category];
  const badgeClass = CATEGORY_BADGE[template.category];
  const lastUsedLabel = relativeTime(template.last_used_at);
  const modelLabel = template.template_content.model ?? getDefaultModel();

  return (
    <Card className="relative flex flex-col overflow-hidden hover:shadow-md transition-shadow">
      <div className={`h-1 w-full ${accentClass} flex-shrink-0`} />

      <CardHeader className="pt-4 pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <CategoryIcon className="h-4 w-4 text-muted-foreground shrink-0" />
            <CardTitle
              className="text-base leading-snug line-clamp-2 break-words"
              title={template.name}
            >
              {template.name}
            </CardTitle>
          </div>

          <div className="flex items-center gap-0.5 shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => onToggleFavorite(template)}
              title={
                template.is_favorite
                  ? "Remove from favorites"
                  : "Add to favorites"
              }
            >
              <Star
                className={`h-4 w-4 ${template.is_favorite ? "fill-amber-400 text-amber-400" : "text-muted-foreground"}`}
              />
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onEdit(template)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onDuplicate(template)}>
                  <Copy className="h-4 w-4 mr-2" />
                  Duplicate
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => onDelete(template.id)}
                  className="text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {template.description && (
          <CardDescription className="line-clamp-2 mt-1">
            {template.description}
          </CardDescription>
        )}
      </CardHeader>

      <CardContent className="py-2 space-y-3 flex-1">
        <div className="flex flex-wrap gap-1.5">
          <Badge className={`text-xs border ${badgeClass}`}>
            {template.category}
          </Badge>
          {(template.test_types ?? []).slice(0, 2).map((tt) => (
            <Badge key={tt} variant="secondary" className="text-xs">
              {tt}
            </Badge>
          ))}
          {(template.test_types ?? []).length > 2 && (
            <Badge variant="outline" className="text-xs">
              +{template.test_types.length - 2}
            </Badge>
          )}
        </div>

        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span>{template.template_content.testCaseCount} cases</span>
          <span className="truncate max-w-[120px]" title={modelLabel}>
            {modelLabel}
          </span>
          <span className="flex items-center gap-1">
            <TrendingUp className="h-3 w-3" />
            {template.usage_count}×
          </span>
        </div>

        {lastUsedLabel && (
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Last used {lastUsedLabel}
          </p>
        )}
      </CardContent>

      <CardFooter className="pt-3 pb-3 border-t flex gap-2">
        <Button
          className="flex-1 gap-1.5"
          size="sm"
          onClick={() => onUse(template)}
        >
          <Play className="h-3.5 w-3.5" />
          Use template
        </Button>
        <Button variant="outline" size="sm" onClick={() => onEdit(template)}>
          <Edit className="h-3.5 w-3.5" />
        </Button>
      </CardFooter>
    </Card>
  );
}

// ─── Template grid ────────────────────────────────────────────────────────────

interface TemplateGridProps {
  user: any;
  loading: boolean;
  filteredTemplates: Template[];
  searchQuery: string;
  categoryFilter: string;
  onNew: () => void;
  onUse: (t: Template) => void;
  onEdit: (t: Template) => void;
  onDuplicate: (t: Template) => void;
  onDelete: (id: string) => void;
  onToggleFavorite: (t: Template) => void;
}

function TemplateGrid({
  user,
  loading,
  filteredTemplates,
  searchQuery,
  categoryFilter,
  onNew,
  onUse,
  onEdit,
  onDuplicate,
  onDelete,
  onToggleFavorite,
}: TemplateGridProps) {
  if (!user) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          Sign in to view and manage your templates.
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (filteredTemplates.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <FileText className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No templates found</h3>
          <p className="text-sm text-muted-foreground mb-4">
            {searchQuery || categoryFilter !== "all"
              ? "Try adjusting your filters"
              : "Create your first template to get started"}
          </p>
          {!searchQuery && categoryFilter === "all" && (
            <Button onClick={onNew}>
              <Plus className="h-4 w-4 mr-2" />
              Create Template
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {filteredTemplates.map((template) => (
        <TemplateCard
          key={template.id}
          template={template}
          onUse={onUse}
          onEdit={onEdit}
          onDuplicate={onDuplicate}
          onDelete={onDelete}
          onToggleFavorite={onToggleFavorite}
        />
      ))}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function TemplateManager() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<
    TemplateCategory | "all"
  >("all");
  const [formData, setFormData] = useState<TemplateFormData>(DEFAULT_FORM);

  const canQuery = !authLoading && !!user;

  // ─── Derived values ───────────────────────────────────────────────────────

  const filteredTemplates = useMemo(() => {
    let f = templates;
    if (categoryFilter !== "all")
      f = f.filter((t) => t.category === categoryFilter);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      f = f.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          (t.description ?? "").toLowerCase().includes(q),
      );
    }
    return f;
  }, [templates, searchQuery, categoryFilter]);

  const favoriteTemplates = useMemo(
    () => filteredTemplates.filter((t) => t.is_favorite),
    [filteredTemplates],
  );

  const mostUsedTemplate = useMemo(() => {
    if (!templates.length) return null;
    return [...templates].sort((a, b) => b.usage_count - a.usage_count)[0];
  }, [templates]);

  const createdThisWeekCount = useMemo(() => {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return templates.filter((t) => new Date(t.created_at) > weekAgo).length;
  }, [templates]);

  // ─── Data fetching ────────────────────────────────────────────────────────

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/templates?scope=my", { cache: "no-store" });
      if (res.status === 401) {
        setTemplates([]);
        toast.error("Please sign in again.");
        window.location.href = "/login";
        return;
      }
      if (!res.ok) {
        const p = await res.json().catch(() => ({}));
        throw new Error(p?.error ?? `Failed (${res.status})`);
      }
      const p = await res.json();
      setTemplates(p?.templates ?? []);
    } catch (e) {
      console.error("[TemplateManager] fetchTemplates:", e);
      toast.error("Failed to load templates");
      setTemplates([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!canQuery) {
      setLoading(false);
      setTemplates([]);
      return;
    }
    void fetchTemplates();
  }, [canQuery, fetchTemplates]);

  // ─── Form handlers ────────────────────────────────────────────────────────

  const resetForm = useCallback(() => setFormData(DEFAULT_FORM), []);

  const openNewDialog = useCallback(() => {
    setEditingTemplate(null);
    resetForm();
    setShowDialog(true);
  }, [resetForm]);

  const openEditDialog = useCallback((template: Template) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      description: template.description ?? "",
      category: template.category,
      model: template.template_content.model,
      testCaseCount: template.template_content.testCaseCount,
      test_types: toCanonicalTestTypes(template.test_types ?? []),
      includeEdgeCases: template.template_content.includeEdgeCases ?? true,
      includeNegativeTests:
        template.template_content.includeNegativeTests ?? true,
      project_id: template.project_id ?? null,
    });
    setShowDialog(true);
  }, []);

  const saveTemplate = useCallback(async () => {
    if (!user) {
      toast.error("Please sign in to save templates.");
      return;
    }
    if (!formData.name.trim()) {
      toast.error("Please enter a template name");
      return;
    }

    setLoading(true);
    try {
      const body = {
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        category: formData.category,
        template_content: {
          model: formData.model,
          testCaseCount: formData.testCaseCount,
          includeEdgeCases: formData.includeEdgeCases,
          includeNegativeTests: formData.includeNegativeTests,
        } satisfies TemplateContent,
        test_types: formData.test_types,
        is_public: false,
        is_favorite: editingTemplate?.is_favorite ?? false,
        project_id: formData.project_id || null,
      };

      const res = await fetch(
        editingTemplate
          ? `/api/templates/${editingTemplate.id}`
          : "/api/templates",
        {
          method: editingTemplate ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
      );

      if (res.status === 401) {
        toast.error("Session expired. Please sign in again.");
        window.location.href = "/login";
        return;
      }
      if (!res.ok) {
        const p = await res.json().catch(() => ({}));
        throw new Error(p?.error ?? `Failed (${res.status})`);
      }

      toast.success(editingTemplate ? "Template updated" : "Template created");
      setShowDialog(false);
      setEditingTemplate(null);
      resetForm();
      await fetchTemplates();
    } catch (e) {
      console.error("[TemplateManager] saveTemplate:", e);
      toast.error("Failed to save template");
    } finally {
      setLoading(false);
    }
  }, [user, formData, editingTemplate, resetForm, fetchTemplates]);

  const deleteTemplate = useCallback(
    async (id: string) => {
      if (!user) {
        toast.error("Please sign in to delete templates.");
        return;
      }
      if (!confirm("Delete this template? This action cannot be undone."))
        return;

      setLoading(true);
      try {
        const res = await fetch(`/api/templates/${id}`, { method: "DELETE" });
        if (!res.ok) {
          const p = await res.json().catch(() => ({}));
          throw new Error(p?.error ?? `Failed (${res.status})`);
        }
        toast.success("Template deleted");
        await fetchTemplates();
      } catch (e) {
        console.error("[TemplateManager] deleteTemplate:", e);
        toast.error("Failed to delete template");
      } finally {
        setLoading(false);
      }
    },
    [user, fetchTemplates],
  );

  const duplicateTemplate = useCallback(
    async (template: Template) => {
      if (!user) {
        toast.error("Please sign in to copy templates.");
        return;
      }

      setLoading(true);
      try {
        const res = await fetch("/api/templates", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: `${template.name} (Copy)`,
            description: template.description ?? null,
            category: template.category,
            template_content: template.template_content,
            test_types: template.test_types ?? [],
            is_public: false,
            is_favorite: false,
            project_id: template.project_id ?? null,
          }),
        });
        if (!res.ok) {
          const p = await res.json().catch(() => ({}));
          throw new Error(p?.error ?? `Failed (${res.status})`);
        }
        toast.success("Template duplicated");
        await fetchTemplates();
      } catch (e) {
        console.error("[TemplateManager] duplicateTemplate:", e);
        toast.error("Failed to duplicate template");
      } finally {
        setLoading(false);
      }
    },
    [user, fetchTemplates],
  );

  const toggleFavorite = useCallback(
    async (template: Template) => {
      if (!user) {
        toast.error("Please sign in to favorite templates.");
        return;
      }

      // Optimistic update
      setTemplates((prev) =>
        prev.map((t) =>
          t.id === template.id ? { ...t, is_favorite: !t.is_favorite } : t,
        ),
      );

      try {
        const res = await fetch(`/api/templates/${template.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ is_favorite: !template.is_favorite }),
        });
        if (!res.ok) {
          const p = await res.json().catch(() => ({}));
          throw new Error(p?.error ?? `Failed (${res.status})`);
        }
      } catch (e) {
        // Revert on failure
        setTemplates((prev) =>
          prev.map((t) =>
            t.id === template.id
              ? { ...t, is_favorite: template.is_favorite }
              : t,
          ),
        );
        console.error("[TemplateManager] toggleFavorite:", e);
        toast.error("Failed to update favorite status");
      }
    },
    [user],
  );

  const useTemplate = useCallback(
    (template: Template) => {
      router.push(`/generate?template=${template.id}`);
    },
    [router],
  );

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div />
        <Button onClick={openNewDialog} size="lg" disabled={!user}>
          <Plus className="h-5 w-5 mr-2" />
          New Template
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-slate-200 dark:border-slate-800 hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Templates
            </CardTitle>
            <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800">
              <FileText className="h-4 w-4 text-slate-600 dark:text-slate-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{templates.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {favoriteTemplates.length} marked as favorite
            </p>
          </CardContent>
        </Card>

        <Card className="border-purple-200 dark:border-purple-800 hover:shadow-md transition-shadow bg-purple-50/50 dark:bg-purple-950/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-purple-700 dark:text-purple-300">
              Most Popular
            </CardTitle>
            <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900">
              <TrendingUp className="h-4 w-4 text-purple-600 dark:text-purple-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-900 dark:text-purple-100">
              {mostUsedTemplate?.usage_count ?? 0}
            </div>
            <p
              className="text-xs text-purple-600 dark:text-purple-400 mt-1 truncate"
              title={mostUsedTemplate?.name}
            >
              {mostUsedTemplate?.name ?? "No usage yet"}
            </p>
          </CardContent>
        </Card>

        <Card className="border-amber-200 dark:border-amber-800 hover:shadow-md transition-shadow bg-amber-50/50 dark:bg-amber-950/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-amber-700 dark:text-amber-300">
              Favorites
            </CardTitle>
            <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900">
              <Star className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-amber-900 dark:text-amber-100">
              {favoriteTemplates.length}
            </div>
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
              {templates.length > 0
                ? `${Math.round((favoriteTemplates.length / templates.length) * 100)}% of all templates`
                : "Mark templates as favorites"}
            </p>
          </CardContent>
        </Card>

        <Card className="border-blue-200 dark:border-blue-800 hover:shadow-md transition-shadow bg-blue-50/50 dark:bg-blue-950/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-blue-700 dark:text-blue-300">
              Created This Week
            </CardTitle>
            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900">
              <Clock className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-900 dark:text-blue-100">
              {createdThisWeekCount}
            </div>
            <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
              Last 7 days activity
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select
          value={categoryFilter}
          onValueChange={(v) =>
            setCategoryFilter(v as TemplateCategory | "all")
          }
        >
          <SelectTrigger className="w-full sm:w-[200px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Filter by category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="functional">Functional</SelectItem>
            <SelectItem value="security">Security</SelectItem>
            <SelectItem value="performance">Performance</SelectItem>
            <SelectItem value="integration">Integration</SelectItem>
            <SelectItem value="regression">Regression</SelectItem>
            <SelectItem value="accessibility">Accessibility</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="my-templates">
        <TabsList>
          <TabsTrigger value="my-templates" className="gap-2">
            <FileText className="h-4 w-4" />
            My Templates
            {templates.length > 0 && (
              <Badge variant="secondary" className="text-xs ml-1">
                {templates.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="my-templates" className="mt-6">
          <TemplateGrid
            user={user}
            loading={loading}
            filteredTemplates={filteredTemplates}
            searchQuery={searchQuery}
            categoryFilter={categoryFilter}
            onNew={openNewDialog}
            onUse={useTemplate}
            onEdit={openEditDialog}
            onDuplicate={duplicateTemplate}
            onDelete={deleteTemplate}
            onToggleFavorite={toggleFavorite}
          />
        </TabsContent>
      </Tabs>

      <TemplateEditorDialog
        open={showDialog}
        onOpenChange={setShowDialog}
        mode={editingTemplate ? "edit" : "create"}
        saving={loading}
        formData={formData}
        setFormData={setFormData}
        onCancel={() => {
          setShowDialog(false);
          setEditingTemplate(null);
          resetForm();
        }}
        onSave={saveTemplate}
      />

      <div className="h-2" />
    </div>
  );
}
