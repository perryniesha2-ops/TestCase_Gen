"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Sparkles, Info, FileText } from "lucide-react";
import { TemplateSelect } from "@/components/templates/template-select";
import { ProjectSelect } from "@/components/projects/project-select";
import type { Project } from "@/types/projects";
import { RequirementRow, RequirementOption } from "@/types/requirements";

import {
  AI_MODELS,
  MODEL_GROUPS,
  type ModelKey,
  getDefaultModel,
  isModelAllowed,
  migrateModelKey,
} from "@/lib/ai-models/config";
import { Separator } from "@radix-ui/react-separator";
import { TemplateContent, TemplateCategory } from "@/types/templates";

// ─── Types ────────────────────────────────────────────────────────────────────

type ProjectColor =
  | "blue"
  | "green"
  | "purple"
  | "orange"
  | "red"
  | "pink"
  | "indigo"
  | "yellow"
  | "gray";

type TemplateFromSelect = {
  id: string;
  name: string;
  description?: string | null;
  category: TemplateCategory;
  template_content: TemplateContent;
};

type ProjectRowLite = {
  id: string;
  name: string;
  color?: string | null;
  icon?: string | null;
  status?: string | null;
};

type BootstrapDefaults = {
  model?: string;
  count?: number;
  test_types?: string[];
} | null;

type BootstrapResponse = {
  projects: ProjectRowLite[];
  requirements: RequirementRow[];
  defaults: BootstrapDefaults;
};

const ALLOWED_TEST_COUNTS = new Set(["5", "10", "15", "20"]);

function sanitizeTestCaseCount(value: string): string {
  return ALLOWED_TEST_COUNTS.has(value) ? value : "10";
}

const MIN_REQUIREMENTS_LENGTH = 10;
const MAX_REQUIREMENTS_LENGTH = 5000;

const PLACEHOLDER_REQUIREMENTS: RequirementOption[] = [
  {
    id: "login",
    label: "User Login Functionality",
    title: "User Authentication System",
    description: "System to authenticate users with email and password",
    type: "functional",
    priority: "high",
    value: `User Login Functionality:
- Email and password authentication
- Password must be at least 8 characters with 1 number and 1 special character
- Show specific error messages for invalid credentials
- "Remember me" checkbox for persistent sessions
- Account lockout after 5 failed login attempts
- Password reset via email link
- Session timeout after 30 minutes of inactivity`,
  },
  {
    id: "shopping-cart",
    label: "Shopping Cart",
    title: "E-commerce Shopping Cart",
    description: "Shopping cart functionality for e-commerce platform",
    type: "functional",
    priority: "medium",
    value: `Shopping Cart Functionality:
- Add items to cart with quantity selection
- Update item quantities (min 1, max 10 per item)
- Remove items from cart
- Calculate subtotal, tax (10%), and total
- Apply discount codes (validate format and expiration)
- Maximum 20 unique items in cart
- Save cart state for logged-in users
- Empty cart after checkout`,
  },
  {
    id: "file-upload",
    label: "File Upload System",
    title: "Document Upload Functionality",
    description: "File upload system with validation and security",
    type: "functional",
    priority: "medium",
    value: `File Upload Functionality:
- Support PDF, DOCX, JPG, PNG file types
- Maximum file size: 10MB per file
- Validate file type and size before upload
- Show upload progress indicator
- Display error messages for unsupported formats
- Virus scan all uploaded files
- Store files with unique identifiers
- Generate downloadable links with expiration`,
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Converts acceptance_criteria jsonb to plain text for the LLM prompt.
// Handles: string[], {criteria: string[]}, [{text:string}], or plain string.
function formatAcceptanceCriteria(raw: unknown): string {
  if (!raw) return "";

  // Plain string
  if (typeof raw === "string") return raw.trim();

  // Array of strings or objects
  if (Array.isArray(raw)) {
    return raw
      .map((item) => {
        if (typeof item === "string") return `- ${item.trim()}`;
        if (typeof item === "object" && item !== null) {
          // {text: "..."} or {description: "..."} or {criteria: "..."}
          const obj = item as Record<string, unknown>;
          const text =
            obj.text ??
            obj.description ??
            obj.criteria ??
            obj.content ??
            Object.values(obj)[0];
          return `- ${String(text ?? "").trim()}`;
        }
        return `- ${String(item).trim()}`;
      })
      .filter((line) => line !== "- ")
      .join("\n");
  }

  // Object with a criteria/items/list key containing an array
  if (typeof raw === "object" && raw !== null) {
    const obj = raw as Record<string, unknown>;
    const arrayVal =
      obj.criteria ?? obj.items ?? obj.list ?? obj.acceptance_criteria;
    if (Array.isArray(arrayVal)) return formatAcceptanceCriteria(arrayVal);
    // Fallback: stringify all values
    return Object.entries(obj)
      .map(([k, v]) => `- ${k}: ${String(v).trim()}`)
      .join("\n");
  }

  return String(raw).trim();
}

function mapRequirementsToOptions(rows: RequirementRow[]): RequirementOption[] {
  return (rows ?? []).map((req) => {
    const criteriaText = formatAcceptanceCriteria(req.acceptance_criteria);
    const value = [
      req.title,
      req.description,
      criteriaText ? `Acceptance Criteria:\n${criteriaText}` : "",
    ]
      .filter(Boolean)
      .join("\n\n");

    return {
      id: req.id,
      label: `${req.title} (${req.type})`,
      title: req.title,
      description: req.description,
      type: req.type,
      priority: req.priority,
      value,
      project_id: req.project_id ?? null,
    };
  });
}

function clampTestCount(n: number, min = 1, max = 100) {
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, Math.floor(n)));
}

// ─── Bootstrap hook ───────────────────────────────────────────────────────────

function useGeneratorBootstrap(userId: string | undefined) {
  const [bootstrapping, setBootstrapping] = useState(false);
  const [projects, setProjects] = useState<ProjectRowLite[]>([]);
  const [requirements, setRequirements] = useState<RequirementOption[]>([]);
  const [defaults, setDefaults] = useState<BootstrapDefaults>(null);

  useEffect(() => {
    if (!userId) return;

    let stale = false;
    setBootstrapping(true);

    fetch(
      "/api/generate-test-cases/bootstrap?requirementsLimit=200&templatesLimit=200",
      { method: "GET", cache: "no-store" },
    )
      .then((res) => {
        if (!res.ok) throw new Error(`Bootstrap failed (${res.status})`);
        return res.json() as Promise<
          Partial<BootstrapResponse> & { error?: string }
        >;
      })
      .then((data) => {
        if (stale) return;
        setProjects(data.projects ?? []);
        setRequirements(mapRequirementsToOptions(data.requirements ?? []));
        setDefaults(data.defaults ?? null);
      })
      .catch((e) => {
        if (stale) return;
        console.error("❌ Bootstrap load error:", e);
        toast.error("Unable to load generator data", {
          description: e instanceof Error ? e.message : "Please try again.",
          duration: 7000,
        });
        setRequirements([]);
      })
      .finally(() => {
        setBootstrapping(false); // always clear — stale or not
      });

    return () => {
      stale = true;
    };
  }, [userId]);

  return { bootstrapping, projects, requirements, defaults };
}

// ─── Component ────────────────────────────────────────────────────────────────

export function GeneratorForm() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const {
    bootstrapping,
    projects: bootProjects,
    requirements: bootReqs,
    defaults,
  } = useGeneratorBootstrap(user?.id);

  // Map bootstrap projects to the Project type for ProjectSelect
  const mappedProjects = useMemo<Project[]>(
    () =>
      bootProjects.map((p) => ({
        id: p.id,
        name: p.name,
        status: "active" as const,
        color: (p.color ?? "blue") as ProjectColor,
        icon: p.icon ?? "folder",
      })),
    [bootProjects],
  );

  const [submitting, setSubmitting] = useState(false);
  const [mode, setMode] = useState<"quick" | "saved">("quick");
  const [selectedRequirement, setSelectedRequirement] = useState("");
  const [customRequirements, setCustomRequirements] = useState("");
  const [selectedTemplate, setSelectedTemplate] =
    useState<TemplateFromSelect | null>(null);
  const [model, setModel] = useState(getDefaultModel);
  const [testCaseCount, setTestCaseCount] = useState("10");
  const [generationTitle, setGenerationTitle] = useState("");
  const [generationDescription, setGenerationDescription] = useState("");
  const [selectedProject, setSelectedProject] = useState<string>("");
  const [projectSource, setProjectSource] = useState<"none" | "requirement">(
    "none",
  );

  // Apply bootstrap defaults once
  const defaultsAppliedRef = useRef(false);
  useEffect(() => {
    if (defaultsAppliedRef.current) return;
    if (!defaults) return;
    setModel(
      isModelAllowed(defaults.model ?? "")
        ? migrateModelKey(defaults.model!)
        : getDefaultModel(),
    );
    // Snap count to nearest valid option: 5, 10, 15, 20
    const raw = clampTestCount(defaults.count ?? 10, 5, 20);
    const snapped = [5, 10, 15, 20].reduce((prev, curr) =>
      Math.abs(curr - raw) < Math.abs(prev - raw) ? curr : prev,
    );
    setTestCaseCount(String(snapped));
    defaultsAppliedRef.current = true;
  }, [defaults]);

  const availableRequirements = useMemo(
    () => (bootReqs.length > 0 ? bootReqs : PLACEHOLDER_REQUIREMENTS),
    [bootReqs],
  );

  useEffect(() => {
    if (mode !== "saved") return;
    if (selectedRequirement) return;
    if (availableRequirements.length === 0) return;
    setSelectedRequirement(availableRequirements[0].id);
  }, [mode, selectedRequirement, availableRequirements]);

  const selectedReqData = useMemo(
    () => availableRequirements.find((r) => r.id === selectedRequirement),
    [availableRequirements, selectedRequirement],
  );

  const savedRequirementsText = selectedReqData?.value || "";
  const finalRequirementsText =
    mode === "quick" ? customRequirements : savedRequirementsText;

  // Auto-fill title/description from selected requirement
  useEffect(() => {
    if (mode !== "saved" || !selectedReqData) return;
    setGenerationTitle(`${selectedReqData.title} Test Cases`);
    setGenerationDescription(selectedReqData.description || "");
  }, [mode, selectedReqData?.id]);

  // Auto-assign project from requirement
  useEffect(() => {
    if (mode !== "saved" || !selectedReqData) return;
    const reqProjectId = selectedReqData.project_id ?? null;
    if (reqProjectId) {
      setSelectedProject(reqProjectId);
      setProjectSource("requirement");
      return;
    }
    if (projectSource === "requirement") {
      setSelectedProject("");
      setProjectSource("none");
    }
  }, [mode, selectedReqData?.project_id, projectSource, selectedReqData]);

  const templateApplied = !!selectedTemplate;

  const switchMode = useCallback(
    (nextMode: "quick" | "saved") => {
      setMode(nextMode);
      if (
        nextMode === "saved" &&
        !selectedRequirement &&
        availableRequirements.length > 0
      ) {
        setSelectedRequirement(availableRequirements[0].id);
      }
    },
    [availableRequirements, selectedRequirement],
  );

  const handleTemplateSelect = useCallback(
    (template: TemplateFromSelect | null) => {
      setSelectedTemplate(template);
      if (!template) return;
      setModel(migrateModelKey(template.template_content.model));
      setTestCaseCount(
        sanitizeTestCaseCount(String(template.template_content.testCaseCount)),
      );
    },
    [],
  );

  function sanitizeInput(input: string): string {
    return input
      .replace(/<[^>]*>/g, "")
      .replace(/javascript:/gi, "")
      .replace(/on\w+\s*=/gi, "")
      .trim();
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!user) {
      toast.error("Please sign in to generate test cases");
      router.push("/login");
      return;
    }

    setSubmitting(true);

    try {
      const testCaseCountNum = parseInt(testCaseCount, 10);
      if (
        Number.isNaN(testCaseCountNum) ||
        testCaseCountNum < 1 ||
        testCaseCountNum > 20
      ) {
        toast.error("Please select a valid number of test cases (1–20).");
        setSubmitting(false);
        return;
      }
      if (!generationTitle.trim()) {
        toast.error("Please enter a generation title.");
        setSubmitting(false);
        return;
      }
      if (mode === "quick") {
        const trimmed = customRequirements.trim();
        if (!trimmed) {
          toast.error("Please enter your requirements.");
          setSubmitting(false);
          return;
        }
        if (trimmed.length < MIN_REQUIREMENTS_LENGTH) {
          toast.error("Requirements too short", {
            description: `Please enter at least ${MIN_REQUIREMENTS_LENGTH} characters. Currently ${trimmed.length} characters.`,
          });
          setSubmitting(false);
          return;
        }
        if (trimmed.length > MAX_REQUIREMENTS_LENGTH) {
          toast.error("Requirements too long", {
            description: `Please keep requirements under ${MAX_REQUIREMENTS_LENGTH} characters.`,
          });
          setSubmitting(false);
          return;
        }
      }
      if (mode === "saved" && !savedRequirementsText.trim()) {
        toast.error("Please select a requirement.");
        setSubmitting(false);
        return;
      }

      const sanitizedTitle = sanitizeInput(generationTitle);
      const sanitizedDescription = generationDescription
        ? sanitizeInput(generationDescription)
        : null;
      const sanitizedRequirements = sanitizeInput(finalRequirementsText);

      if (!sanitizedTitle) {
        toast.error("Title contains invalid characters.");
        setSubmitting(false);
        return;
      }
      if (
        !sanitizedRequirements ||
        sanitizedRequirements.length < MIN_REQUIREMENTS_LENGTH
      ) {
        toast.error("Requirements contain invalid content or are too short.");
        setSubmitting(false);
        return;
      }

      const response = await fetch("/api/generate-test-cases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requirements: sanitizedRequirements,
          requirement_id:
            mode === "saved" && selectedReqData ? selectedRequirement : null,
          model: model.trim(),
          testCaseCount: testCaseCountNum,
          template: selectedTemplate?.id || null,
          title: sanitizedTitle,
          description: sanitizedDescription,
          project_id: selectedProject || null,
        }),
      });

      const data = await response.json();

      if (response.status === 429) {
        toast.error("Monthly usage limit reached", {
          description: `You have ${data.remaining || 0} test cases remaining. Upgrade to Pro for more.`,
          duration: 8000,
          action: { label: "Upgrade", onClick: () => router.push("/billing") },
        });
        setSubmitting(false);
        return;
      }

      if (!response.ok) {
        if (response.status === 400 && data?.field === "requirements") {
          toast.error("Invalid requirements", {
            description: data.error,
            duration: 8000,
          });
          setSubmitting(false);
          return;
        }
        throw new Error(data?.error || "Generation failed");
      }

      toast.success(`${data.count} test cases generated!`);
      router.push(`/test-cases?generation=${data.generation_id}`);
    } catch (err) {
      console.error("❌ Generation error:", err);
      toast.error("Unable to generate test cases", {
        description:
          err instanceof Error ? err.message : "Please try again later",
        duration: 7000,
      });
    } finally {
      setSubmitting(false);
    }
  }

  if (authLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex items-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span className="text-muted-foreground">Loading...</span>
        </div>
      </div>
    );
  }

  const pageBusy = bootstrapping || submitting;

  return (
    <div className="space-y-8 px-1 md:px-2">
      <Card className="mx-auto w-full max-w-7xl">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            AI Test Case Generator
          </CardTitle>
          <CardDescription>
            Generate comprehensive test cases with AI models across different
            coverage levels and test types
          </CardDescription>
        </CardHeader>

        <CardContent>
          {bootstrapping && (
            <div className="mb-6 flex items-center gap-2 rounded-lg border bg-muted/30 p-3">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Loading your projects, requirements, and defaults…
              </p>
            </div>
          )}

          <form
            onSubmit={handleSubmit}
            className="space-y-6"
            data-testid="generator-form"
          >
            {/* Title / Description */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="title">Generation Title *</Label>
                <Input
                  id="title"
                  name="title"
                  data-testid="input-generation-title"
                  value={generationTitle}
                  onChange={(e) => setGenerationTitle(e.target.value)}
                  placeholder="e.g., User Login Test Cases"
                  required
                  disabled={pageBusy}
                  className="h-10"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  name="description"
                  data-testid="input-generation-description"
                  value={generationDescription}
                  onChange={(e) => setGenerationDescription(e.target.value)}
                  placeholder="Brief description..."
                  disabled={pageBusy}
                  className="h-10"
                />
              </div>
            </div>
            {/* Requirements */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-base font-medium">Requirements</Label>
                <Button asChild variant="ghost" size="sm" className="h-8">
                  <Link href="/requirements">
                    <FileText className="h-4 w-4 mr-1" />
                    Manage Requirements
                  </Link>
                </Button>
              </div>

              <div
                className="flex items-center gap-2 p-1 bg-muted rounded-lg"
                data-testid="requirements-mode-toggle"
              >
                <Button
                  type="button"
                  variant={mode === "quick" ? "default" : "ghost"}
                  size="sm"
                  className="flex-1 h-8"
                  data-testid="btn-mode-quick"
                  onClick={() => switchMode("quick")}
                  disabled={pageBusy}
                >
                  Quick Entry
                </Button>
                <Button
                  type="button"
                  variant={mode === "saved" ? "default" : "ghost"}
                  size="sm"
                  className="flex-1 h-8"
                  data-testid="btn-mode-saved"
                  onClick={() => switchMode("saved")}
                  disabled={pageBusy}
                >
                  {bootReqs.length > 0
                    ? "Saved Requirements"
                    : "Example Requirements"}
                </Button>
              </div>

              {mode === "quick" && (
                <div className="space-y-3">
                  <Label htmlFor="custom-requirements" className="text-sm">
                    Describe your requirements{" "}
                    <span className="text-destructive">*</span>
                  </Label>
                  <textarea
                    name="requirements"
                    data-testid="textarea-requirements"
                    className="w-full min-h-[200px] p-3 text-sm border rounded-md font-mono resize-y focus-visible:ring-2 focus-visible:ring-primary"
                    value={customRequirements}
                    onChange={(e) => setCustomRequirements(e.target.value)}
                    placeholder="Describe what you want to test..."
                    maxLength={MAX_REQUIREMENTS_LENGTH}
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span data-testid="requirements-char-hint">
                      {customRequirements.trim().length <
                        MIN_REQUIREMENTS_LENGTH && customRequirements.length > 0
                        ? `${MIN_REQUIREMENTS_LENGTH - customRequirements.trim().length} more characters needed`
                        : customRequirements.length > 10
                          ? (() => {
                              const words = customRequirements
                                .trim()
                                .split(/\s+/)
                                .filter((w) => w.length > 1);
                              return words.length < 5
                                ? `${5 - words.length} more word${5 - words.length !== 1 ? "s" : ""} needed`
                                : "";
                            })()
                          : ""}
                    </span>
                    <span
                      data-testid="requirements-char-count"
                      className={
                        customRequirements.length >
                        MAX_REQUIREMENTS_LENGTH * 0.9
                          ? "text-orange-500"
                          : ""
                      }
                    >
                      {customRequirements.length} / {MAX_REQUIREMENTS_LENGTH}
                    </span>
                  </div>
                  {customRequirements.length > 10 && (
                    <div
                      className="p-3 bg-blue-50 border border-blue-200 rounded-md"
                      data-testid="save-requirement-prompt"
                    >
                      <div className="flex items-start gap-3">
                        <div className="bg-blue-500 rounded-full p-1 mt-0.5">
                          <Info className="h-3 w-3 text-white" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-blue-900 mb-2">
                            Want to save this for later?
                          </p>
                          <p className="text-xs text-blue-700 mb-3">
                            Save as a requirement to reuse it and build your
                            requirement library.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {mode === "saved" && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Label className="text-sm flex-1">
                      {bootReqs.length > 0
                        ? "Select a saved requirement"
                        : "Example requirements (create your own to save them)"}
                      <span className="text-destructive">*</span>
                    </Label>
                  </div>
                  <Select
                    value={selectedRequirement}
                    onValueChange={setSelectedRequirement}
                    disabled={pageBusy}
                  >
                    <SelectTrigger
                      className="h-10"
                      data-testid="select-saved-requirement"
                    >
                      <SelectValue placeholder="Select a requirement" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableRequirements.map((req) => (
                        <SelectItem key={req.id} value={req.id}>
                          <div className="flex items-center gap-2">
                            <div
                              className={`w-2 h-2 rounded-full ${bootReqs.length > 0 ? "bg-blue-500" : "bg-gray-400"}`}
                            />
                            {req.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedReqData && (
                    <div
                      className="border rounded-md bg-muted/20"
                      data-testid="saved-requirement-preview"
                    >
                      <div className="flex items-center justify-between p-3 border-b bg-muted/40">
                        <h4 className="font-medium text-sm">
                          {selectedReqData.title || selectedReqData.label}
                        </h4>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          data-testid="btn-customize-requirement"
                          onClick={() => {
                            setCustomRequirements(savedRequirementsText);
                            switchMode("quick");
                          }}
                          disabled={pageBusy}
                        >
                          Customize
                        </Button>
                      </div>
                      <div className="p-3">
                        <pre className="text-sm whitespace-pre-wrap font-mono text-muted-foreground">
                          {savedRequirementsText}
                        </pre>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
            {/* Project Selection — uses bootstrap projects, no internal fetch */}
            <div
              className="mt-4 space-y-3 border rounded-lg p-4 bg-muted/30"
              data-testid="project-selection"
            >
              <div>
                <Label className="text-sm font-medium">Project</Label>
                <p className="text-xs text-muted-foreground">
                  Optional, but recommended for organizing generations and
                  linking assets.
                </p>
              </div>
              <ProjectSelect
                value={selectedProject || undefined}
                disabled={pageBusy}
                projects={mappedProjects}
                disableFetch
                onSelect={(p) => setSelectedProject(p?.id ?? "")}
              />
            </div>
            {/* Template Selection */}
            <div
              className="mt-4 space-y-3 border rounded-lg p-4 bg-muted/30"
              data-testid="template-selection"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex-1">
                  <TemplateSelect
                    value={selectedTemplate?.id}
                    onSelect={handleTemplateSelect}
                    disabled={pageBusy}
                  />
                </div>
              </div>
              {selectedTemplate && (
                <p
                  className="text-xs text-muted-foreground"
                  data-testid="template-applied-notice"
                >
                  Template{" "}
                  <span className="font-medium">
                    &quot;{selectedTemplate.name}&quot;
                  </span>{" "}
                  is applied. You can still adjust settings before generating.
                </p>
              )}
            </div>
            {/* Settings */}
            {!templateApplied && (
              <div
                className="grid grid-cols-1 md:grid-cols-2 gap-6"
                data-testid="generation-settings"
              >
                <div className="space-y-2">
                  <Label htmlFor="model">AI Model</Label>
                  <Select
                    name="model"
                    value={model}
                    onValueChange={(v) => setModel(migrateModelKey(v))}
                    disabled={pageBusy}
                  >
                    <SelectTrigger
                      className="h-10"
                      data-testid="select-ai-model"
                    >
                      <SelectValue placeholder="Select model" />
                    </SelectTrigger>
                    <SelectContent>
                      {MODEL_GROUPS.anthropic.models.map((key) => (
                        <SelectItem key={key} value={key}>
                          {AI_MODELS[key].name}
                        </SelectItem>
                      ))}
                      <Separator />
                      {MODEL_GROUPS.openai.models.map((key) => (
                        <SelectItem key={key} value={key}>
                          {AI_MODELS[key].name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="testCaseCount">Number of Test Cases</Label>
                  <Select
                    name="testCaseCount"
                    value={testCaseCount}
                    onValueChange={(v) =>
                      setTestCaseCount(sanitizeTestCaseCount(v))
                    }
                    disabled={pageBusy}
                  >
                    <SelectTrigger
                      className="h-10"
                      data-testid="select-test-case-count"
                    >
                      <SelectValue placeholder="Select count" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">5 test cases</SelectItem>
                      <SelectItem value="10">10 test cases</SelectItem>
                      <SelectItem value="15">15 test cases</SelectItem>
                      <SelectItem value="20">20 test cases</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
            {/* Generation progress */}
            {submitting && (
              <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <Loader2 className="h-4 w-4 animate-spin text-primary shrink-0" />
                  <span className="text-sm font-medium">
                    Generating test cases…
                  </span>
                </div>
                <div className="space-y-1.5">
                  <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                    <div className="h-1.5 rounded-full bg-primary animate-pulse w-full" />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Generating test cases typically takes 20–45 seconds.
                  </p>
                </div>
              </div>
            )}
            <Button
              type="submit"
              className="w-full h-11"
              disabled={pageBusy}
              data-testid="btn-generate"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating test cases…
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Generate Test Cases
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
