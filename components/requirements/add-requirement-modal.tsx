"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth/auth-context";
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
  Target,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Lightbulb,
  Info,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

// ── Shared types — no local redeclaration needed ──────────────────────────────
import type { Requirement } from "@/types/requirements";
import { ProjectSelect } from "@/components/projects/project-select";
import {
  toastSuccess,
  toastError,
  toastInfo,
  toastWarning,
} from "@/lib/utils/toast-utils";

// ─── Local-only types (not shared) ───────────────────────────────────────────

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

  useEffect(() => {
    if (defaultProjectId) {
      setFormData((prev) => ({ ...prev, project_id: defaultProjectId }));
    }
  }, [defaultProjectId]);

  function addAcceptanceCriteria() {
    setAcceptanceCriteria((prev) => [...prev, ""]);
  }

  function removeAcceptanceCriteria(index: number) {
    if (acceptanceCriteria.length > 1) {
      setAcceptanceCriteria((prev) => prev.filter((_, i) => i !== index));
    }
  }

  function updateAcceptanceCriteria(index: number, value: string) {
    setAcceptanceCriteria((prev) =>
      prev.map((c, i) => (i === index ? value : c)),
    );
  }

  function buildMetadata(): Record<string, string | number | boolean> {
    const meta: Record<string, string | number | boolean> = {};
    metadataFields.forEach((field) => {
      if (field.key && field.value) {
        let value: string | number | boolean = field.value;
        if (field.type === "number") value = Number(field.value);
        else if (field.type === "boolean")
          value = field.value.toLowerCase() === "true";
        meta[field.key] = value;
      }
    });
    meta.created_via = "manual_entry";
    meta.auto_generate_tests = autoGenerateTests;
    if (formData.externalId) meta.external_reference = formData.externalId;
    return meta;
  }

  async function generateTestCases(requirementId: string) {
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
      if (!response.ok) throw new Error("Failed to generate tests");
      const { generation_id, test_cases_count } = await response.json();
      toastSuccess(`Generated ${test_cases_count} test cases!`, {
        action: {
          label: "View Tests",
          onClick: () => router.push(`/test-cases?generation=${generation_id}`),
        },
      });
    } catch (error) {
      console.error("Error generating tests:", error);
      toastError("Failed to generate test cases");
    } finally {
      setGeneratingTests(false);
    }
  }

  async function analyzeQuality() {
    if (!formData.title.trim() || !formData.description.trim()) {
      toastError("Please fill in title and description first");
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
      if (!data || typeof data !== "object")
        throw new Error("Invalid analysis response");
      const safeAnalysis: AnalysisResult = {
        quality_score: data.quality_score || 0,
        testability_score: data.testability_score || 0,
        completeness_score: data.completeness_score || 0,
        clarity_score: data.clarity_score || 0,
        issues: Array.isArray(data.issues) ? data.issues : [],
        strengths: Array.isArray(data.strengths) ? data.strengths : [],
        improvements: Array.isArray(data.improvements) ? data.improvements : [],
        suggested_criteria: Array.isArray(data.suggested_criteria)
          ? data.suggested_criteria
          : [],
        missing_aspects: Array.isArray(data.missing_aspects)
          ? data.missing_aspects
          : [],
        summary: data.summary || "Analysis completed.",
      };
      setAnalysis(safeAnalysis);
      setShowAnalysis(true);
      if (safeAnalysis.quality_score >= 80) {
        toastSuccess("Excellent requirement quality!", {
          description: `Quality score: ${safeAnalysis.quality_score}/100`,
        });
      } else if (safeAnalysis.quality_score >= 60) {
        toastInfo("Good requirement with room for improvement", {
          description: `Quality score: ${safeAnalysis.quality_score}/100`,
        });
      } else {
        toastWarning("Requirement needs improvement", {
          description: `Quality score: ${safeAnalysis.quality_score}/100`,
        });
      }
    } catch (error) {
      console.error("Analysis error:", error);
      toastError("Analysis failed", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
      setAnalysis(null);
      setShowAnalysis(false);
    } finally {
      setAnalyzing(false);
    }
  }

  function applySuggestedCriteria() {
    if (!analysis?.suggested_criteria?.length) {
      toastError("No suggested criteria available");
      return;
    }
    setAcceptanceCriteria((prev) => {
      const existing = prev.filter((c) => c.trim() !== "");
      const combined = [...existing, ...analysis.suggested_criteria];
      return combined.filter(
        (item, index, self) =>
          index ===
          self.findIndex((t) => t.toLowerCase() === item.toLowerCase()),
      );
    });
    toastSuccess(
      `Added ${analysis.suggested_criteria.length} suggested criteria`,
    );
  }

  // ── Submit — inserts via API route, not direct Supabase ──────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) {
      toastError("Please log in to add requirements");
      return;
    }
    setLoading(true);
    try {
      const validCriteria = acceptanceCriteria.filter((c) => c.trim() !== "");
      const builtMetadata = buildMetadata();

      const res = await fetch("/api/requirements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description,
          type: formData.requirement_type,
          external_id: formData.externalId || null,
          acceptance_criteria: validCriteria.length > 0 ? validCriteria : null,
          priority: formData.priority,
          source: formData.source,
          status: formData.status,
          project_id: formData.project_id || null,
          metadata:
            Object.keys(builtMetadata).length > 0 ? builtMetadata : null,
        }),
      });

      const payload = await res.json();
      if (!res.ok)
        throw new Error(payload?.error ?? "Failed to create requirement");

      toastSuccess("Requirement created successfully");

      if (autoGenerateTests && payload.requirement?.id) {
        await generateTestCases(payload.requirement.id);
      }

      setOpen(false);
      resetForm();
      await onRequirementAdded?.(payload.requirement as Requirement);
    } catch (error) {
      console.error("Error creating requirement:", error);
      toastError("Failed to create requirement");
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
    setRawRequirement("");
  }

  async function parseRequirementWithAI() {
    if (!rawRequirement.trim()) {
      toastError("Paste a requirement first.");
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
        setAcceptanceCriteria((prev) => {
          const existing = prev.filter((c) => c.trim() !== "");
          const combined = [...existing, ...parsed.acceptance_criteria];
          return combined.filter(
            (item, index, self) =>
              index ===
              self.findIndex((t) => t.toLowerCase() === item.toLowerCase()),
          );
        });
        toastSuccess(
          `Added ${parsed.acceptance_criteria.length} new criteria.`,
        );
      } else {
        toastInfo(
          "Parsed requirement, but no acceptance criteria were detected.",
        );
      }
      if (parsed.metadata && typeof parsed.metadata === "object") {
        const next: MetadataField[] = Object.entries(parsed.metadata).map(
          ([key, value]) => {
            if (typeof value === "number")
              return { key, value: String(value), type: "number" as const };
            if (typeof value === "boolean")
              return { key, value: String(value), type: "boolean" as const };
            return { key, value: String(value), type: "text" as const };
          },
        );
        setMetadataFields(next);
      }
      toastSuccess("Requirement parsed. Review the fields before saving.");
    } catch (e: any) {
      toastError(e?.message ? `Parse failed: ${e.message}` : "Parse failed");
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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>
                      Requirement Type{" "}
                      <span className="text-destructive">*</span>
                    </Label>
                    <Select
                      value={formData.requirement_type}
                      onValueChange={(value) =>
                        setFormData({ ...formData, requirement_type: value })
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

                  <div className="space-y-2">
                    <ProjectSelect
                      key={open ? "open" : "closed"}
                      value={formData.project_id || undefined}
                      disabled={loading}
                      onSelect={(p) =>
                        setFormData((prev) => ({
                          ...prev,
                          project_id: p?.id ?? "",
                        }))
                      }
                    />
                  </div>
                </div>

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
                    placeholder="Detailed description of the requirement..."
                    rows={5}
                    required
                    disabled={loading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="externalId">External ID (Optional)</Label>
                  <Input
                    id="externalId"
                    value={formData.externalId}
                    onChange={(e) =>
                      setFormData({ ...formData, externalId: e.target.value })
                    }
                    placeholder="e.g., JIRA-123, REQ-456"
                    disabled={loading}
                  />
                  <p className="text-xs text-muted-foreground">
                    Reference ID from external tools like JIRA, Azure DevOps,
                    etc.
                  </p>
                </div>

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
                </div>
              </TabsContent>

              <TabsContent value="advanced" className="space-y-6 pt-2">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-purple-600" />
                        Paste a full requirement (AI will extract criteria)
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Paste a paragraph or spec. We'll break it into
                        acceptance criteria.
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
                    placeholder="Paste full requirement text here..."
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
                        if (!formData.description.trim())
                          setFormData((p) => ({
                            ...p,
                            description: rawRequirement.trim(),
                          }));
                        toastInfo("Copied raw text into Description.");
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
                          <div className="grid grid-cols-3 gap-3">
                            {[
                              ["Testability", analysis.testability_score],
                              ["Completeness", analysis.completeness_score],
                              ["Clarity", analysis.clarity_score],
                            ].map(([label, score]) => (
                              <div key={label} className="text-center">
                                <div
                                  className={cn(
                                    "text-lg font-bold",
                                    getScoreColor(score as number),
                                  )}
                                >
                                  {score}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {label}
                                </div>
                              </div>
                            ))}
                          </div>
                          <div className="text-sm bg-muted p-3 rounded">
                            {analysis.summary}
                          </div>
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
