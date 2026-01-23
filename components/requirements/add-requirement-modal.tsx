"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth/auth-context";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Plus,
  Loader2,
  X,
  FileText,
  Settings,
  Sparkles,
  FolderOpen,
  Target,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Lightbulb,
  Info,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import type { Requirement } from "@/types/requirements";

interface Project {
  id: string;
  name: string;
  color: string;
  icon: string;
  status: string;
}

interface AddRequirementModalProps {
  onRequirementAdded?: (req: Requirement) => void | Promise<void>;
  children?: React.ReactNode;
  defaultProjectId?: string;
}

type MetadataField = {
  key: string;
  value: string;
  type: "text" | "number" | "boolean";
};

type IssueLevel = "critical" | "high" | "medium" | "low" | "info";

type AnalysisIssue = {
  type:
    | "ambiguity"
    | "missing_criteria"
    | "gap"
    | "testability"
    | "completeness"
    | "clarity";
  level: IssueLevel;
  title: string;
  description: string;
  location: "title" | "description" | "criteria" | "overall";
  suggestion: string;
  examples?: string[];
};

type AnalysisResult = {
  quality_score: number;
  testability_score: number;
  completeness_score: number;
  clarity_score: number;
  issues: AnalysisIssue[];
  strengths: string[];
  improvements: string[];
  suggested_criteria: string[];
  missing_aspects: string[];
  summary: string;
};

export function AddRequirementModal({
  onRequirementAdded,
  children,
  defaultProjectId,
}: AddRequirementModalProps) {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [generatingTests, setGeneratingTests] = useState(false);
  const [acceptanceCriteria, setAcceptanceCriteria] = useState<string[]>([""]);
  const [autoGenerateTests, setAutoGenerateTests] = useState(false);
  const NONE = "__none__";

  // Projects
  const [projects, setProjects] = useState<Project[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);

  // Analysis state
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [showAnalysis, setShowAnalysis] = useState(false);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    requirement_type: "functional",
    priority: "medium",
    externalId: "",
    source: "manual",
    status: "draft",
    project_id: defaultProjectId || "",
  });

  const [metadataFields, setMetadataFields] = useState<MetadataField[]>([]);
  const [rawRequirement, setRawRequirement] = useState("");
  const [parsing, setParsing] = useState(false);

  // Load projects when modal opens
  useEffect(() => {
    if (open) {
      fetchProjects();
    }
  }, [open]);

  // Set default project if provided
  useEffect(() => {
    if (defaultProjectId) {
      setFormData((prev) => ({ ...prev, project_id: defaultProjectId }));
    }
  }, [defaultProjectId]);

  async function fetchProjects() {
    if (!user) {
      setLoadingProjects(false);
      return;
    }

    setLoadingProjects(true);
    try {
      const supabase = createClient();

      const { data, error } = await supabase
        .from("projects")
        .select("id, name, color, icon, status")
        .eq("user_id", user.id)
        .in("status", ["active", "on_hold"])
        .order("name");

      if (error) throw error;
      setProjects(data || []);
    } catch (error) {
      console.error("Error fetching projects:", error);
    } finally {
      setLoadingProjects(false);
    }
  }

  function addAcceptanceCriteria() {
    setAcceptanceCriteria([...acceptanceCriteria, ""]);
  }

  function removeAcceptanceCriteria(index: number) {
    if (acceptanceCriteria.length > 1) {
      setAcceptanceCriteria(acceptanceCriteria.filter((_, i) => i !== index));
    }
  }

  function updateAcceptanceCriteria(index: number, value: string) {
    const newCriteria = acceptanceCriteria.map((criteria, i) =>
      i === index ? value : criteria,
    );
    setAcceptanceCriteria(newCriteria);
  }

  function buildMetadata(): Record<string, string | number | boolean> {
    const meta: Record<string, string | number | boolean> = {};

    metadataFields.forEach((field) => {
      if (field.key && field.value) {
        let value: string | number | boolean = field.value;
        if (field.type === "number") {
          value = Number(field.value);
        } else if (field.type === "boolean") {
          value = field.value.toLowerCase() === "true";
        }
        meta[field.key] = value;
      }
    });

    meta.created_via = "manual_entry";
    meta.auto_generate_tests = autoGenerateTests;
    if (formData.externalId) {
      meta.external_reference = formData.externalId;
    }

    return meta;
  }

  async function generateTestCases(
    requirementId: string,
    requirementTitle: string,
  ) {
    if (!user) {
      setLoading(false);
    }

    setGeneratingTests(true);
    try {
      const response = await fetch("/api/generate-tests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requirement_id: requirementId,
          title: formData.title,
          description: formData.description,
          acceptance_criteria: acceptanceCriteria.filter((c) => c.trim()),
          requirement_type: formData.requirement_type,
          project_id: formData.project_id || null,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate tests");
      }

      const { generation_id, test_cases_count } = await response.json();

      toast.success(`Generated ${test_cases_count} test cases!`, {
        action: {
          label: "View Tests",
          onClick: () => router.push(`/test-cases?generation=${generation_id}`),
        },
      });
    } catch (error) {
      console.error("Error generating tests:", error);
      toast.error("Failed to generate test cases");
    } finally {
      setGeneratingTests(false);
    }
  }

  // NEW: Quality Analysis Function
  async function analyzeQuality() {
    if (!formData.title.trim() || !formData.description.trim()) {
      toast.error("Please fill in title and description first");
      return;
    }

    setAnalyzing(true);
    try {
      const response = await fetch("/api/requirements/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description,
          type: formData.requirement_type,
          acceptance_criteria: acceptanceCriteria.filter((c) => c.trim()),
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Analysis failed");
      }

      const data = await response.json();
      setAnalysis(data);
      setShowAnalysis(true);

      if (data.quality_score >= 80) {
        toast.success("Excellent requirement quality!", {
          description: `Quality score: ${data.quality_score}/100`,
        });
      } else if (data.quality_score >= 60) {
        toast.message("Good requirement with room for improvement", {
          description: `Quality score: ${data.quality_score}/100`,
        });
      } else {
        toast.warning("Requirement needs improvement", {
          description: `Quality score: ${data.quality_score}/100`,
        });
      }
    } catch (error) {
      console.error("Analysis error:", error);
      toast.error("Analysis failed", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setAnalyzing(false);
    }
  }

  // NEW: Apply suggested criteria
  function applySuggestedCriteria() {
    if (
      analysis?.suggested_criteria &&
      analysis.suggested_criteria.length > 0
    ) {
      setAcceptanceCriteria(analysis.suggested_criteria);
      toast.success("Applied suggested acceptance criteria");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) {
      toast.error("Please log in to add requirements");
      return;
    }
    setLoading(true);

    try {
      const supabase = createClient();

      const validCriteria = acceptanceCriteria.filter(
        (criteria) => criteria.trim() !== "",
      );
      const builtMetadata = buildMetadata();

      const requirementData = {
        user_id: user.id,
        title: formData.title,
        description: formData.description,
        type: formData.requirement_type,
        external_id: formData.externalId || null,
        acceptance_criteria: validCriteria.length > 0 ? validCriteria : null,
        priority: formData.priority,
        source: formData.source,
        status: formData.status,
        project_id: formData.project_id || null,
        metadata: Object.keys(builtMetadata).length > 0 ? builtMetadata : null,
      };

      const { data: requirement, error } = await supabase
        .from("requirements")
        .insert(requirementData)
        .select()
        .single();

      if (error) throw error;

      toast.success("Requirement created successfully");

      // Auto-generate tests if enabled
      if (autoGenerateTests && requirement.id) {
        await generateTestCases(requirement.id, requirement.title);
      }

      setOpen(false);
      resetForm();
      await onRequirementAdded?.(requirement as Requirement);
    } catch (error) {
      console.error("Error creating requirement:", error);
      toast.error("Failed to create requirement");
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setFormData({
      title: "",
      description: "",
      requirement_type: "functional",
      priority: "medium",
      externalId: "",
      source: "manual",
      status: "draft",
      project_id: defaultProjectId || "",
    });
    setAcceptanceCriteria([""]);
    setMetadataFields([]);
    setAutoGenerateTests(false);
    setAnalysis(null);
    setShowAnalysis(false);
  }

  function getProjectColor(color: string) {
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
    return colors[color] || "text-gray-500";
  }

  async function parseRequirementWithAI() {
    if (!rawRequirement.trim()) {
      toast.error("Paste a requirement first.");
      return;
    }

    setParsing(true);
    try {
      const response = await fetch("/api/requirements/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          raw_text: rawRequirement,
          requirement_type: formData.requirement_type,
          priority: formData.priority,
          source: formData.source,
          project_id: formData.project_id || null,
        }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => null);
        throw new Error(err?.error || "Failed to parse requirement");
      }

      const parsed = await response.json();

      setFormData((prev) => ({
        ...prev,
        title: prev.title?.trim() ? prev.title : parsed.title || prev.title,
        description: prev.description?.trim()
          ? prev.description
          : parsed.description || prev.description,
      }));

      if (
        Array.isArray(parsed.acceptance_criteria) &&
        parsed.acceptance_criteria.length > 0
      ) {
        setAcceptanceCriteria(parsed.acceptance_criteria);
      } else {
        toast.message(
          "Parsed requirement, but no acceptance criteria were detected.",
        );
      }

      if (parsed.metadata && typeof parsed.metadata === "object") {
        const next: MetadataField[] = Object.entries(parsed.metadata).map(
          ([key, value]) => {
            if (typeof value === "number")
              return { key, value: String(value), type: "number" };
            if (typeof value === "boolean")
              return { key, value: String(value), type: "boolean" };
            return { key, value: String(value), type: "text" };
          },
        );
        setMetadataFields(next);
      }

      toast.success("Requirement parsed. Review the fields before saving.");
    } catch (e: any) {
      toast.error(e?.message ? `Parse failed: ${e.message}` : "Parse failed");
    } finally {
      setParsing(false);
    }
  }

  const getLevelIcon = (level: IssueLevel) => {
    switch (level) {
      case "critical":
        return <AlertTriangle className="h-3 w-3 text-red-500" />;
      case "high":
        return <AlertTriangle className="h-3 w-3 text-orange-500" />;
      case "medium":
        return <Info className="h-3 w-3 text-yellow-500" />;
      case "low":
        return <Info className="h-3 w-3 text-blue-500" />;
      case "info":
        return <Info className="h-3 w-3 text-gray-500" />;
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Requirement
          </Button>
        )}
      </DialogTrigger>
      <DialogContent
        className="w-[95vw] sm:max-w-4xl lg:max-w-5xl max-h-[90vh] flex flex-col p-0"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader className="sticky top-0 z-10 bg-background px-6 py-4 border-b">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <DialogTitle>Create New Requirement</DialogTitle>
              <DialogDescription>
                Define a new requirement that can be used to generate test cases
                and track coverage.
              </DialogDescription>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full"
              onClick={() => {
                setOpen(false);
                resetForm();
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          <Tabs defaultValue="basic" className="w-full space-y-6">
            <TabsList className="grid w-full grid-cols-2 rounded-lg bg-muted/40 p-1">
              <TabsTrigger
                value="basic"
                className="flex items-center gap-2 py-2"
              >
                <FileText className="h-4 w-4" />
                Basic Info
              </TabsTrigger>
              <TabsTrigger
                value="advanced"
                className="flex items-center gap-2 py-2"
              >
                <Settings className="h-4 w-4" />
                Advanced
              </TabsTrigger>
            </TabsList>

            <form onSubmit={handleSubmit} className="space-y-8">
              <TabsContent value="basic" className="space-y-6 pt-2">
                {/* Title */}
                <div className="space-y-2">
                  <Label htmlFor="title">
                    Title <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) =>
                      setFormData({ ...formData, title: e.target.value })
                    }
                    placeholder="e.g., User Authentication System"
                    required
                    disabled={loading}
                  />
                </div>

                {/* Type and Priority */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>
                      Requirement Type{" "}
                      <span className="text-destructive">*</span>
                    </Label>
                    <Select
                      value={formData.requirement_type}
                      onValueChange={(value) =>
                        setFormData({
                          ...formData,
                          requirement_type: value,
                        })
                      }
                      disabled={loading}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="functional">Functional</SelectItem>
                        <SelectItem value="non_functional">
                          Non-Functional
                        </SelectItem>
                        <SelectItem value="business">Business</SelectItem>
                        <SelectItem value="technical">Technical</SelectItem>
                        <SelectItem value="security">Security</SelectItem>
                        <SelectItem value="user_story">User Story</SelectItem>
                        <SelectItem value="use_case">Use Case</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Priority</Label>
                    <Select
                      value={formData.priority}
                      onValueChange={(value) =>
                        setFormData({ ...formData, priority: value })
                      }
                      disabled={loading}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="critical">Critical</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="low">Low</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Status */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select
                      value={formData.status}
                      onValueChange={(value) =>
                        setFormData({ ...formData, status: value })
                      }
                      disabled={loading}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="approved">Approved</SelectItem>
                        <SelectItem value="implemented">Implemented</SelectItem>
                        <SelectItem value="tested">Tested</SelectItem>
                        <SelectItem value="rejected">Rejected</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Project Selection */}
                  <div className="space-y-2">
                    <Label htmlFor="project">
                      Project{" "}
                      <span className="text-muted-foreground text-xs">
                        (Optional)
                      </span>
                    </Label>
                    <Select
                      value={formData.project_id ? formData.project_id : NONE}
                      onValueChange={(value) =>
                        setFormData((prev) => ({
                          ...prev,
                          project_id: value === NONE ? "" : value,
                        }))
                      }
                      disabled={loading || loadingProjects}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="No project selected" />
                      </SelectTrigger>

                      <SelectContent>
                        <SelectItem value={NONE}>No project</SelectItem>

                        {projects.map((project) => (
                          <SelectItem key={project.id} value={project.id}>
                            <div className="flex items-center gap-2">
                              <FolderOpen
                                className={`h-4 w-4 ${getProjectColor(
                                  project.color,
                                )}`}
                              />
                              <span>{project.name}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Link this requirement to a project for better organization
                    </p>
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label htmlFor="description">
                    Description <span className="text-destructive">*</span>
                  </Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    placeholder="Detailed description of the requirement. Be specific about what needs to be implemented or achieved..."
                    rows={5}
                    required
                    disabled={loading}
                  />
                </div>

                {/* External ID */}
                <div className="space-y-2">
                  <Label htmlFor="externalId">External ID (Optional)</Label>
                  <Input
                    id="externalId"
                    value={formData.externalId}
                    onChange={(e) =>
                      setFormData({ ...formData, externalId: e.target.value })
                    }
                    placeholder="e.g., JIRA-123, REQ-456, STORY-789"
                    disabled={loading}
                  />
                  <p className="text-xs text-muted-foreground">
                    Reference ID from external tools like JIRA, Azure DevOps,
                    etc.
                  </p>
                </div>

                {/* Acceptance Criteria */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Acceptance Criteria (Optional)</Label>
                    <Button
                      type="button"
                      onClick={addAcceptanceCriteria}
                      size="sm"
                      variant="outline"
                      disabled={loading}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add Criteria
                    </Button>
                  </div>
                  <div className="space-y-3">
                    {acceptanceCriteria.map((criteria, index) => (
                      <div key={index} className="flex gap-2">
                        <div className="flex-none w-8 h-9 bg-muted rounded flex items-center justify-center text-sm font-mono">
                          {index + 1}
                        </div>
                        <Input
                          value={criteria}
                          onChange={(e) =>
                            updateAcceptanceCriteria(index, e.target.value)
                          }
                          placeholder={`Acceptance criteria ${index + 1}...`}
                          disabled={loading}
                          className="flex-1"
                        />
                        {acceptanceCriteria.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeAcceptanceCriteria(index)}
                            disabled={loading}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Define specific criteria that must be met for this
                    requirement to be considered complete.
                  </p>
                </div>
              </TabsContent>

              <TabsContent value="advanced" className="space-y-6 pt-2">
                {/* AI Parse Section */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-purple-600" />
                        Paste a full requirement (AI will extract criteria)
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Paste a paragraph or spec. We'll break it into
                        acceptance criteria and structured points.
                      </p>
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => void parseRequirementWithAI()}
                      disabled={loading || parsing}
                    >
                      {parsing ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Parsing…
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-4 w-4 mr-2" />
                          Extract Criteria
                        </>
                      )}
                    </Button>
                  </div>

                  <Textarea
                    value={rawRequirement}
                    onChange={(e) => setRawRequirement(e.target.value)}
                    placeholder={`Example:\nUsers must be able to log in using email/password or passkeys. After 5 failed attempts, lock for 15 minutes. Sessions expire after 30 minutes of inactivity...`}
                    rows={7}
                    className="text-sm"
                    disabled={loading || parsing}
                  />

                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (!formData.title.trim())
                          setFormData((p) => ({
                            ...p,
                            title: "New Requirement",
                          }));
                        if (!formData.description.trim())
                          setFormData((p) => ({
                            ...p,
                            description: rawRequirement.trim(),
                          }));
                        toast.message(
                          "Copied raw text into Description. You can still Extract Criteria.",
                        );
                      }}
                      disabled={loading || parsing || !rawRequirement.trim()}
                    >
                      Use as Description
                    </Button>

                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setRawRequirement("")}
                      disabled={loading || parsing || !rawRequirement.trim()}
                    >
                      Clear
                    </Button>
                  </div>
                </div>

                {/* NEW: Quality Analysis Section */}
                <div className="border-t pt-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="flex items-center gap-2">
                        <Target className="h-4 w-4 text-blue-600" />
                        Quality Check (Before Saving)
                      </Label>
                      <p className="text-xs text-muted-foreground mt-1">
                        Analyze for ambiguities, missing criteria, and quality
                        issues
                      </p>
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={analyzeQuality}
                      disabled={
                        loading ||
                        analyzing ||
                        !formData.title.trim() ||
                        !formData.description.trim()
                      }
                    >
                      {analyzing ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Analyzing…
                        </>
                      ) : (
                        <>
                          <Target className="h-4 w-4 mr-2" />
                          Check Quality
                        </>
                      )}
                    </Button>
                  </div>

                  {/* Analysis Results */}
                  {analysis && (
                    <Collapsible
                      open={showAnalysis}
                      onOpenChange={setShowAnalysis}
                    >
                      <div className="rounded-lg border p-4 space-y-3">
                        <CollapsibleTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full justify-between p-0 h-auto"
                          >
                            <div className="flex items-center gap-2">
                              <span className="font-medium">
                                Analysis Results
                              </span>
                              <Badge
                                className={cn(
                                  analysis.quality_score >= 80
                                    ? "bg-green-100 text-green-800"
                                    : analysis.quality_score >= 60
                                      ? "bg-yellow-100 text-yellow-800"
                                      : "bg-red-100 text-red-800",
                                )}
                              >
                                {analysis.quality_score}/100
                              </Badge>
                            </div>
                            {showAnalysis ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </Button>
                        </CollapsibleTrigger>

                        <CollapsibleContent className="space-y-3">
                          {/* Quality Scores */}
                          <div className="grid grid-cols-3 gap-3">
                            <div className="text-center">
                              <div
                                className={cn(
                                  "text-lg font-bold",
                                  getScoreColor(analysis.testability_score),
                                )}
                              >
                                {analysis.testability_score}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                Testability
                              </div>
                            </div>
                            <div className="text-center">
                              <div
                                className={cn(
                                  "text-lg font-bold",
                                  getScoreColor(analysis.completeness_score),
                                )}
                              >
                                {analysis.completeness_score}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                Completeness
                              </div>
                            </div>
                            <div className="text-center">
                              <div
                                className={cn(
                                  "text-lg font-bold",
                                  getScoreColor(analysis.clarity_score),
                                )}
                              >
                                {analysis.clarity_score}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                Clarity
                              </div>
                            </div>
                          </div>

                          {/* Summary */}
                          <div className="text-sm bg-muted p-3 rounded">
                            {analysis.summary}
                          </div>

                          {/* Critical Issues Only */}
                          {analysis.issues.filter(
                            (i) => i.level === "critical" || i.level === "high",
                          ).length > 0 && (
                            <div className="space-y-2">
                              <div className="text-sm font-medium">
                                Critical Issues:
                              </div>
                              {analysis.issues
                                .filter(
                                  (i) =>
                                    i.level === "critical" ||
                                    i.level === "high",
                                )
                                .slice(0, 3)
                                .map((issue, i) => (
                                  <div key={i} className="flex gap-2 text-xs">
                                    {getLevelIcon(issue.level)}
                                    <div className="flex-1">
                                      <div className="font-medium">
                                        {issue.title}
                                      </div>
                                      <div className="text-muted-foreground">
                                        💡 {issue.suggestion}
                                      </div>
                                    </div>
                                  </div>
                                ))}
                            </div>
                          )}

                          {/* Suggested Criteria */}
                          {analysis.suggested_criteria.length > 0 && (
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <div className="text-sm font-medium">
                                  Suggested Criteria (
                                  {analysis.suggested_criteria.length}):
                                </div>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={applySuggestedCriteria}
                                >
                                  <Lightbulb className="h-3 w-3 mr-1" />
                                  Apply All
                                </Button>
                              </div>
                              <div className="max-h-32 overflow-y-auto space-y-1">
                                {analysis.suggested_criteria
                                  .slice(0, 5)
                                  .map((c, i) => (
                                    <div
                                      key={i}
                                      className="text-xs text-muted-foreground"
                                    >
                                      {i + 1}. {c}
                                    </div>
                                  ))}
                              </div>
                            </div>
                          )}
                        </CollapsibleContent>
                      </div>
                    </Collapsible>
                  )}
                </div>
              </TabsContent>

              {/* Actions - Always visible */}
              <div className="flex gap-3 pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setOpen(false);
                    resetForm();
                  }}
                  disabled={loading || generatingTests}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={
                    loading ||
                    generatingTests ||
                    !formData.title ||
                    !formData.description
                  }
                >
                  {loading || generatingTests ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {generatingTests ? "Generating Tests..." : "Creating..."}
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Requirement
                      {autoGenerateTests && (
                        <Sparkles className="h-4 w-4 ml-2" />
                      )}
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
