"use client";

import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useAuth } from "@/lib/auth/auth-context";
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
} from "lucide-react";

import { TemplateEditorDialog } from "@/components/templates/template-editor-dialog";
import type { TemplateFormData } from "@/components/templates/template-editor-dialog";
import type { CanonicalTestType } from "@/components/generator/testtype-multiselect";

// ============================================================================
// TYPES
// ============================================================================

type TemplateCategory =
  | "functional"
  | "security"
  | "performance"
  | "integration"
  | "regression"
  | "accessibility"
  | "other";

interface TemplateContent {
  model: string;
  testCaseCount: number;
  includeEdgeCases?: boolean;
  includeNegativeTests?: boolean;
  defaultSections?: string[];
}

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
  test_types: string[]; // Keep as string[] from database
}

type Scope = "my" | "public";
type Tab = "my-templates" | "public";

// ============================================================================
// CONSTANTS
// ============================================================================

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

const CATEGORY_COLORS: Record<TemplateCategory, string> = {
  functional: "bg-blue-500",
  security: "bg-red-500",
  performance: "bg-orange-500",
  integration: "bg-purple-500",
  regression: "bg-green-500",
  accessibility: "bg-indigo-500",
  other: "bg-gray-500",
};

const MODEL_DISPLAY_NAMES: Record<string, string> = {
  "claude-sonnet-4-5": "Claude Sonnet 4.5",
  "claude-haiku-4-5": "Claude Haiku 4.5",
  "claude-opus-4-5": "Claude Opus 4.5",
  "gpt-5-mini": "GPT-5 Mini",
  "gpt-5.2": "GPT-5.2",
  "gpt-4o": "GPT-4o",
  "gpt-4o-mini": "GPT-4o Mini",
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getModelDisplayName(modelKey: string): string {
  if (MODEL_DISPLAY_NAMES[modelKey]) return MODEL_DISPLAY_NAMES[modelKey];

  // Fallback to legacy models
  if (modelKey.includes("claude-3-5-sonnet")) return "Claude 3.5 Sonnet";
  if (modelKey.includes("claude-3-5-haiku")) return "Claude 3.5 Haiku";
  if (modelKey.includes("claude-sonnet-4")) return "Claude Sonnet 4";
  if (modelKey.includes("claude-opus-4")) return "Claude Opus 4";
  if (modelKey.includes("gpt-4-turbo")) return "GPT-4 Turbo";
  if (modelKey.includes("gpt-3.5")) return "GPT-3.5 Turbo";
  if (modelKey.includes("claude")) return "Claude";
  if (modelKey.includes("gpt")) return "GPT";

  return modelKey;
}

function tabToScope(tab: Tab): Scope {
  return tab === "public" ? "public" : "my";
}

function toCanonicalTestTypes(types: string[]): CanonicalTestType[] {
  const validTypes: CanonicalTestType[] = [
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
    validTypes.includes(t as CanonicalTestType),
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function TemplateManager() {
  const { user, loading: authLoading } = useAuth();

  // State
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<
    TemplateCategory | "all"
  >("all");
  const [activeTab, setActiveTab] = useState<Tab>("my-templates");

  const [formData, setFormData] = useState<TemplateFormData>({
    name: "",
    description: "",
    category: "functional",
    model: "claude-sonnet-4-5",
    testCaseCount: 10,
    test_types: ["happy-path", "negative", "boundary"],
    includeEdgeCases: true,
    includeNegativeTests: true,
    project_id: null,
  });

  // Computed values
  const canQuery = !authLoading && (activeTab === "public" || !!user);

  const filteredTemplates = useMemo(() => {
    let filtered = templates;

    if (categoryFilter !== "all") {
      filtered = filtered.filter((t) => t.category === categoryFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          (t.description ?? "").toLowerCase().includes(q),
      );
    }

    return filtered;
  }, [templates, searchQuery, categoryFilter]);

  const favoriteTemplates = useMemo(
    () => filteredTemplates.filter((t) => t.is_favorite),
    [filteredTemplates],
  );

  const mostUsedTemplate = useMemo(() => {
    if (templates.length === 0) return null;
    return [...templates].sort((a, b) => b.usage_count - a.usage_count)[0];
  }, [templates]);

  const createdThisWeekCount = useMemo(() => {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return templates.filter((t) => new Date(t.created_at) > weekAgo).length;
  }, [templates]);

  // ============================================================================
  // API FUNCTIONS
  // ============================================================================

  const fetchTemplates = useCallback(async (tab: Tab) => {
    const scope = tabToScope(tab);
    setLoading(true);

    try {
      const res = await fetch(`/api/templates?scope=${scope}`, {
        cache: "no-store",
      });

      if (res.status === 401) {
        setTemplates([]);
        toast.error("Please sign in again.");
        window.location.href = "/login";
        return;
      }

      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload?.error ?? `Failed (${res.status})`);
      }

      const payload = await res.json();
      setTemplates(payload?.templates ?? []);
    } catch (e: any) {
      console.error("[TemplateManager] fetchTemplates error:", e);
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
    fetchTemplates(activeTab);
  }, [canQuery, activeTab, fetchTemplates]);

  // ============================================================================
  // FORM HANDLERS
  // ============================================================================

  const resetForm = useCallback(() => {
    setFormData({
      name: "",
      description: "",
      category: "functional",
      model: "claude-sonnet-4-5",
      testCaseCount: 10,
      test_types: ["happy-path", "negative", "boundary"],
      includeEdgeCases: true,
      includeNegativeTests: true,
      project_id: null,
    });
  }, []);

  const openNewDialog = useCallback(() => {
    setEditingTemplate(null);
    resetForm();
    setShowDialog(true);
  }, [resetForm]);

  const openEditDialog = useCallback((template: Template) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      description: template.description || "",
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
        test_types: formData.test_types, // Already CanonicalTestType[]
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
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload?.error ?? `Failed (${res.status})`);
      }

      toast.success(editingTemplate ? "Template updated" : "Template created");
      setShowDialog(false);
      setEditingTemplate(null);
      resetForm();
      await fetchTemplates(activeTab);
    } catch (e) {
      console.error("[TemplateManager] saveTemplate error:", e);
      toast.error("Failed to save template");
    } finally {
      setLoading(false);
    }
  }, [user, formData, editingTemplate, resetForm, fetchTemplates, activeTab]);

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

        if (res.status === 401) {
          toast.error("Session expired. Please sign in again.");
          window.location.href = "/login";
          return;
        }

        if (!res.ok) {
          const payload = await res.json().catch(() => ({}));
          throw new Error(payload?.error ?? `Failed (${res.status})`);
        }

        toast.success("Template deleted");
        await fetchTemplates(activeTab);
      } catch (e) {
        console.error("[TemplateManager] deleteTemplate error:", e);
        toast.error("Failed to delete template");
      } finally {
        setLoading(false);
      }
    },
    [user, fetchTemplates, activeTab],
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
            test_types: template.test_types ?? [], // Keep as string[]
            is_public: false,
            is_favorite: false,
            project_id: template.project_id ?? null,
          }),
        });

        if (res.status === 401) {
          toast.error("Session expired. Please sign in again.");
          window.location.href = "/login";
          return;
        }

        if (!res.ok) {
          const payload = await res.json().catch(() => ({}));
          throw new Error(payload?.error ?? `Failed (${res.status})`);
        }

        toast.success("Template duplicated");
        await fetchTemplates(activeTab);
      } catch (e) {
        console.error("[TemplateManager] duplicateTemplate error:", e);
        toast.error("Failed to duplicate template");
      } finally {
        setLoading(false);
      }
    },
    [user, fetchTemplates, activeTab],
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

        if (res.status === 401) {
          toast.error("Session expired. Please sign in again.");
          window.location.href = "/login";
          return;
        }

        if (!res.ok) {
          const payload = await res.json().catch(() => ({}));
          throw new Error(payload?.error ?? `Failed (${res.status})`);
        }
      } catch (e) {
        // Revert on error
        setTemplates((prev) =>
          prev.map((t) =>
            t.id === template.id
              ? { ...t, is_favorite: template.is_favorite }
              : t,
          ),
        );
        console.error("[TemplateManager] toggleFavorite error:", e);
        toast.error("Failed to update favorite status");
      }
    },
    [user],
  );

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div />
        <Button onClick={openNewDialog} size="lg" disabled={!user}>
          <Plus className="h-5 w-5 mr-2" />
          New Template
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Total Templates - Neutral/Primary */}
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
            <div className="text-3xl font-bold text-slate-900 dark:text-slate-100">
              {templates.length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {favoriteTemplates.length} marked as favorite
            </p>
          </CardContent>
        </Card>

        {/* Most Used Template - Purple/Popular */}
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

        {/* Favorite Templates - Amber/Gold */}
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

        {/* Recent Activity - Blue/Activity */}
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
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search templates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <Select
          value={categoryFilter}
          onValueChange={(value) =>
            setCategoryFilter(value as TemplateCategory | "all")
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
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as Tab)}>
        <TabsList>
          <TabsTrigger value="my-templates" disabled={!user}>
            My Templates
          </TabsTrigger>
          <TabsTrigger value="public">Public Templates</TabsTrigger>
        </TabsList>

        <TabsContent value="my-templates" className="mt-6">
          {!user ? (
            <Card>
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                Sign in to view and manage your templates.
              </CardContent>
            </Card>
          ) : loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredTemplates.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  No templates found
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {searchQuery || categoryFilter !== "all"
                    ? "Try adjusting your filters"
                    : "Create your first template to get started"}
                </p>
                {!searchQuery && categoryFilter === "all" && (
                  <Button onClick={openNewDialog}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Template
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredTemplates.map((template) => {
                const CategoryIcon = CATEGORY_ICONS[template.category];
                const categoryColor = CATEGORY_COLORS[template.category];

                return (
                  <Card
                    key={template.id}
                    className="relative group hover:shadow-lg transition-shadow overflow-hidden"
                  >
                    <div
                      className={`absolute top-0 left-0 w-full h-1 ${categoryColor} rounded-t-lg`}
                    />

                    <CardHeader className="pt-6">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <CategoryIcon className="h-5 w-5 text-muted-foreground" />
                          <div className="flex-1 min-w-0">
                            <CardTitle
                              className="text-lg leading-snug line-clamp-2 break-words"
                              title={template.name}
                            >
                              {template.name}
                            </CardTitle>
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => toggleFavorite(template)}
                          >
                            <Star
                              className={`h-4 w-4 ${
                                template.is_favorite
                                  ? "fill-yellow-400 text-yellow-400"
                                  : "text-muted-foreground"
                              }`}
                            />
                          </Button>

                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                              >
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => openEditDialog(template)}
                              >
                                <Edit className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => duplicateTemplate(template)}
                              >
                                <Copy className="h-4 w-4 mr-2" />
                                Duplicate
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => deleteTemplate(template.id)}
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
                        <CardDescription className="line-clamp-2">
                          {template.description}
                        </CardDescription>
                      )}
                    </CardHeader>

                    <CardContent className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {template.category}
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          {template.template_content.testCaseCount} tests
                        </Badge>
                      </div>

                      <div className="text-xs text-muted-foreground space-y-1">
                        <div className="flex justify-between">
                          <span>Model:</span>
                          <span className="font-medium">
                            {getModelDisplayName(
                              template.template_content.model,
                            )}
                          </span>
                        </div>

                        {template.test_types?.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {template.test_types.slice(0, 3).map((tt) => (
                              <Badge
                                key={tt}
                                variant="secondary"
                                className="text-[10px]"
                              >
                                {tt}
                              </Badge>
                            ))}
                            {template.test_types.length > 3 && (
                              <Badge variant="outline" className="text-[10px]">
                                +{template.test_types.length - 3}
                              </Badge>
                            )}
                          </div>
                        )}

                        <div className="flex justify-between">
                          <span>Used:</span>
                          <span>{template.usage_count} times</span>
                        </div>
                      </div>
                    </CardContent>

                    <CardFooter className="pt-0">
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() =>
                          toast.success(
                            "Template selected (integrate with generator)",
                          )
                        }
                      >
                        Use Template
                      </Button>
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="public" className="mt-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredTemplates.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Globe className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  No public templates available
                </h3>
                <p className="text-sm text-muted-foreground">
                  Check back later for community templates
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredTemplates.map((template) => {
                const CategoryIcon = CATEGORY_ICONS[template.category];
                const categoryColor = CATEGORY_COLORS[template.category];

                return (
                  <Card
                    key={template.id}
                    className="relative hover:shadow-lg transition-shadow"
                  >
                    <div
                      className={`absolute top-0 left-0 w-full h-1 ${categoryColor} rounded-t-lg`}
                    />

                    <CardHeader className="pt-6">
                      <div className="flex items-start gap-2">
                        <CategoryIcon className="h-5 w-5 text-muted-foreground mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <CardTitle
                            className="text-lg leading-snug line-clamp-2 break-words"
                            title={template.name}
                          >
                            {template.name}
                          </CardTitle>
                          {template.description && (
                            <CardDescription className="line-clamp-2 mt-1">
                              {template.description}
                            </CardDescription>
                          )}
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {template.category}
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          {template.template_content.testCaseCount} tests
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Used {template.usage_count} times by the community
                      </div>
                    </CardContent>

                    <CardFooter className="pt-0 gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => duplicateTemplate(template)}
                        disabled={!user}
                        title={!user ? "Sign in to copy templates" : undefined}
                      >
                        <Copy className="h-4 w-4 mr-1" />
                        Copy
                      </Button>
                      <Button
                        size="sm"
                        className="flex-1"
                        onClick={() =>
                          toast.success(
                            "Template selected (integrate with generator)",
                          )
                        }
                      >
                        Use Template
                      </Button>
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Editor Dialog */}
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
