"use client";

import React, { useCallback, useMemo, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth/auth-context";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  Layers,
  Monitor,
  Smartphone,
  Globe,
  Eye,
  Zap,
  FileText,
} from "lucide-react";
import {
  TemplateSelect,
  type Template,
} from "@/components/templates/template-select";
import { ProjectSelect } from "@/components/projects/project-select";
import {
  type ModelKey,
  AI_MODELS,
  isModelAllowed,
  migrateModelKey,
  getDefaultModel,
  MODEL_GROUPS,
} from "@/lib/ai-models/config";
import { Separator } from "@radix-ui/react-separator";
import { toastWarning } from "@/lib/utils/toast-utils";

// ─── Types ────────────────────────────────────────────────────────────────────

// Response from POST /api/cross-platform-testing (job creation)
type JobCreatedResponse = {
  job_id?: string;
  status?: string;
  cases_requested?: number;
  error?: string;
  details?: string;
  upgradeRequired?: boolean;
  remaining?: number;
  requested?: number;
  limit?: number;
};

type PlatformId = "web" | "mobile" | "api" | "accessibility" | "performance";
type ApiProtocol = "REST" | "SOAP" | "GraphQL" | "gRPC" | "WebSocket";
type ApiAuth = "None" | "Basic" | "Bearer" | "OAuth2" | "API Key" | "mTLS";
type ApiFormat = "JSON" | "XML";

type RequirementRow = {
  id: string;
  title: string;
  description: string;
  type: string;
  priority: string;
  status?: string;
  project_id?: string | null;
};

type RequirementOption = {
  id: string;
  label: string;
  title: string;
  description: string;
  type: string;
  priority: string;
  value: string;
  project_id?: string | null;
};

type BootstrapResponse = { requirements: RequirementRow[] };

// ─── Constants ────────────────────────────────────────────────────────────────

const MIN_REQUIREMENT_LENGTH = 10;
const MAX_REQUIREMENT_LENGTH = 5000;

const platformOptions: Array<{
  id: PlatformId;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  {
    id: "web",
    name: "Web Application",
    description: "Browser-based testing",
    icon: Monitor,
  },
  {
    id: "mobile",
    name: "Mobile App",
    description: "iOS/Android testing",
    icon: Smartphone,
  },
  {
    id: "api",
    name: "API/Backend",
    description: "REST/SOAP/GraphQL/gRPC testing",
    icon: Globe,
  },
  {
    id: "accessibility",
    name: "Accessibility",
    description: "WCAG/Section 508 compliance",
    icon: Eye,
  },
  {
    id: "performance",
    name: "Performance",
    description: "Load, stress, and reliability",
    icon: Zap,
  },
];

const frameworkOptions: Record<PlatformId, string[]> = {
  web: ["React", "Vue", "Angular", "Vanilla JS", "Next.js", "Nuxt.js"],
  mobile: [
    "React Native",
    "Flutter",
    "Native iOS",
    "Native Android",
    "Xamarin",
    "Ionic",
  ],
  api: ["REST API", "GraphQL", "SOAP", "gRPC", "WebSocket", "Microservices"],
  accessibility: [
    "WCAG 2.1 AA",
    "WCAG 2.1 AAA",
    "Section 508",
    "ADA Compliance",
  ],
  performance: [
    "Load Testing",
    "Stress Testing",
    "Volume Testing",
    "Spike Testing",
  ],
};

const apiProtocolOptions: ApiProtocol[] = [
  "REST",
  "SOAP",
  "GraphQL",
  "gRPC",
  "WebSocket",
];
const apiAuthOptions: ApiAuth[] = [
  "None",
  "Basic",
  "Bearer",
  "OAuth2",
  "API Key",
  "mTLS",
];
const apiFormatOptions: ApiFormat[] = ["JSON", "XML"];

const PLACEHOLDER_REQUIREMENTS: RequirementOption[] = [
  {
    id: "login",
    label: "User Login Functionality (functional)",
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
    project_id: null,
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function mapRequirementsToOptions(rows: RequirementRow[]): RequirementOption[] {
  return (rows ?? []).map((req) => ({
    id: req.id,
    label: `${req.title} (${req.type})`,
    title: req.title,
    description: req.description,
    type: req.type,
    priority: req.priority,
    value: req.description,
    project_id: req.project_id ?? null,
  }));
}

function clampInt(n: unknown, min: number, max: number, fallback: number) {
  const x =
    typeof n === "string" ? parseInt(n, 10) : typeof n === "number" ? n : NaN;
  if (!Number.isFinite(x)) return fallback;
  return Math.max(min, Math.min(max, Math.floor(x)));
}

function sanitizeInput(input: string): string {
  return input
    .replace(/<[^>]*>/g, "")
    .replace(/javascript:/gi, "")
    .replace(/on\w+\s*=/gi, "")
    .trim();
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CrossPlatformGeneratorForm() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [submitting, setSubmitting] = useState(false);
  const [jobStatus, setJobStatus] = useState<{
    jobId: string | null;
    casesSaved: number;
    casesRequested: number;
    phase: "idle" | "queued" | "processing" | "done";
  }>({ jobId: null, casesSaved: 0, casesRequested: 0, phase: "idle" });
  const pollRef = React.useRef<ReturnType<typeof setInterval> | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [requirement, setRequirement] = useState("");
  const [projectId, setProjectId] = useState<string>("");
  const [projectSource, setProjectSource] = useState<"none" | "requirement">(
    "none",
  );

  // Model / count
  const [model, setModel] = useState(getDefaultModel());
  const [perPlatformCount, setPerPlatformCount] = useState<string>("10");

  // Template
  const [template, setTemplate] = useState<Template | null>(null);

  // Platform selection
  const [selectedPlatforms, setSelectedPlatforms] = useState<PlatformId[]>([]);
  const [frameworkByPlatform, setFrameworkByPlatform] = useState<
    Record<PlatformId, string>
  >({} as Record<PlatformId, string>);

  // API-specific config
  const [apiProtocol, setApiProtocol] = useState<ApiProtocol>("REST");
  const [apiAuth, setApiAuth] = useState<ApiAuth>("Bearer");
  const [apiFormat, setApiFormat] = useState<ApiFormat>("JSON");
  const [apiContract, setApiContract] = useState<string>("");

  // Requirements bootstrap
  const [bootstrappingReqs, setBootstrappingReqs] = useState(false);
  const [savedReqs, setSavedReqs] = useState<RequirementOption[]>([]);
  const [mode, setMode] = useState<"quick" | "saved">("quick");
  const [selectedRequirementId, setSelectedRequirementId] =
    useState<string>("");

  const availableRequirements = useMemo(
    () => (savedReqs.length > 0 ? savedReqs : PLACEHOLDER_REQUIREMENTS),
    [savedReqs],
  );

  const selectedReqData = useMemo(
    () => availableRequirements.find((r) => r.id === selectedRequirementId),
    [availableRequirements, selectedRequirementId],
  );

  const savedRequirementsText = selectedReqData?.value ?? "";
  const finalRequirementText =
    mode === "quick" ? requirement : savedRequirementsText;

  const requestedTotal = useMemo(() => {
    const per = clampInt(perPlatformCount, 1, 20, 10);
    return per * selectedPlatforms.length;
  }, [perPlatformCount, selectedPlatforms.length]);

  const pageBusy = authLoading || submitting;

  // Bootstrap saved requirements
  useEffect(() => {
    if (!user?.id) return;

    let stale = false;
    setBootstrappingReqs(true);

    fetch(
      "/api/generate-test-cases/bootstrap?requirementsLimit=200&requirementsOnly=true",
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
        setSavedReqs(mapRequirementsToOptions(data.requirements ?? []));
      })
      .catch(() => {
        if (!stale) setSavedReqs([]);
      })
      .finally(() => {
        setBootstrappingReqs(false); // always clear — stale or not
      });

    return () => {
      stale = true;
    };
  }, [user?.id]);

  // Auto-select first requirement in saved mode
  useEffect(() => {
    if (mode !== "saved") return;
    if (selectedRequirementId) return;
    if (availableRequirements.length === 0) return;
    setSelectedRequirementId(availableRequirements[0].id);
  }, [mode, selectedRequirementId, availableRequirements]);

  // Auto-fill title/description from selected requirement
  useEffect(() => {
    if (mode !== "saved" || !selectedReqData) return;
    setTitle(`${selectedReqData.title} Cross-Platform Suite`);
    setDescription(selectedReqData.description || "");
  }, [mode, selectedReqData, selectedRequirementId]);

  // Auto-apply project from requirement
  useEffect(() => {
    if (mode !== "saved" || !selectedReqData) return;
    const reqProjectId = selectedReqData.project_id ?? null;
    if (reqProjectId) {
      setProjectId(reqProjectId);
      setProjectSource("requirement");
      return;
    }
    if (projectSource === "requirement") {
      setProjectId("");
      setProjectSource("none");
    }
  }, [mode, selectedReqData?.project_id, projectSource, selectedReqData]);

  const ensureDefaultFramework = useCallback((platform: PlatformId) => {
    setFrameworkByPlatform((prev) => {
      if (prev[platform]) return prev;
      const defaults = frameworkOptions[platform];
      return { ...prev, [platform]: defaults?.[0] ?? "" } as Record<
        PlatformId,
        string
      >;
    });
  }, []);

  const togglePlatform = useCallback(
    (platformId: PlatformId) => {
      setSelectedPlatforms((prev) => {
        const isSelected = prev.includes(platformId);
        if (isSelected) {
          setFrameworkByPlatform((fwPrev) => {
            const next = { ...fwPrev };
            delete (next as any)[platformId];
            return next as Record<PlatformId, string>;
          });
          return prev.filter((x) => x !== platformId);
        }
        ensureDefaultFramework(platformId);
        return [...prev, platformId];
      });
    },
    [ensureDefaultFramework],
  );

  const setFrameworkForPlatform = useCallback(
    (platformId: PlatformId, framework: string) => {
      setFrameworkByPlatform(
        (prev) =>
          ({ ...prev, [platformId]: framework }) as Record<PlatformId, string>,
      );
    },
    [],
  );

  const platformsPayload = useMemo(() => {
    return selectedPlatforms.map((p) => {
      if (p !== "api") {
        return { platform: p, framework: frameworkByPlatform[p] || "" };
      }
      return {
        platform: "api" as const,
        framework: frameworkByPlatform[p] || "REST API",
        protocol: apiProtocol,
        auth: apiAuth,
        format: apiFormat,
        contract: apiContract.trim() || undefined,
        required_checks: [
          "schema validation",
          "headers",
          "replay/idempotency",
          "rate limits",
          "auth failures",
        ],
      };
    });
  }, [
    selectedPlatforms,
    frameworkByPlatform,
    apiProtocol,
    apiAuth,
    apiFormat,
    apiContract,
  ]);

  const validate = useCallback((): string | null => {
    if (!user) return "Please sign in to generate test cases.";
    if (!finalRequirementText.trim())
      return "Please enter the requirement description.";
    if (!title.trim()) return "Please enter a suite title.";
    if (selectedPlatforms.length === 0)
      return "Please select at least one platform.";
    for (const p of selectedPlatforms) {
      if (!frameworkByPlatform[p]?.trim()) {
        const name = platformOptions.find((x) => x.id === p)?.name ?? p;
        return `Please select a framework for ${name}.`;
      }
    }
    if (
      selectedPlatforms.includes("api") &&
      apiProtocol === "SOAP" &&
      apiFormat !== "XML"
    ) {
      return "For SOAP, please set payload format to XML.";
    }
    return null;
  }, [
    user,
    finalRequirementText,
    title,
    selectedPlatforms,
    frameworkByPlatform,
    apiProtocol,
    apiFormat,
  ]);

  function stopPolling() {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }

  function startPolling(jobId: string, casesRequested: number) {
    stopPolling();
    setJobStatus({ jobId, casesSaved: 0, casesRequested, phase: "queued" });

    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/jobs/${jobId}`, { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as {
          status: string;
          cases_saved?: number;
          cases_requested?: number;
          generation_id?: string;
          partial?: boolean;
          error?: string;
        };

        setJobStatus((prev) => ({
          ...prev,
          casesSaved: data.cases_saved ?? 0,
          phase:
            data.status === "pending"
              ? "queued"
              : data.status === "processing"
                ? "processing"
                : "done",
        }));

        if (data.status === "complete" || data.status === "failed") {
          stopPolling();
          setSubmitting(false);
          setJobStatus({
            jobId: null,
            casesSaved: 0,
            casesRequested: 0,
            phase: "idle",
          });

          if (data.status === "failed") {
            toast.error("Generation failed", {
              description: data.error ?? "Please try again.",
              duration: 8000,
            });
          } else {
            toast.success("Cross-platform tests generated!", {
              description: `Created ${data.cases_saved} test cases.`,
              duration: 6000,
            });
            if (data.partial) {
              toast.warning(
                `${data.cases_saved} of ${casesRequested} cases generated — some batches failed. Try again for more.`,
                { duration: 8000 },
              );
            }
            router.push("/test-cases");
          }
        }
      } catch {
        // Network hiccup — keep polling
      }
    }, 3000);
  }

  // Clean up on unmount
  React.useEffect(() => () => stopPolling(), []);

  const onSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (pageBusy) return;

      if (!user) {
        toast.error("Please sign in to continue");
        router.push("/login");
        return;
      }

      const err = validate();
      if (err) {
        toast.error(err);
        return;
      }

      const sanitizedRequirement = sanitizeInput(finalRequirementText);
      const sanitizedTitle = sanitizeInput(title);
      const sanitizedDescription = description
        ? sanitizeInput(description)
        : null;

      if (!sanitizedTitle) {
        toast.error("Title contains invalid characters.");
        return;
      }
      if (
        !sanitizedRequirement ||
        sanitizedRequirement.length < MIN_REQUIREMENT_LENGTH
      ) {
        toast.error(
          "Requirement contains invalid content or is too short after sanitization.",
        );
        return;
      }

      setSubmitting(true);
      try {
        const payload = {
          requirement: sanitizedRequirement,
          requirement_id:
            mode === "saved" && selectedReqData ? selectedRequirementId : null,
          platforms: platformsPayload,
          model: model.trim(),
          testCaseCount: clampInt(perPlatformCount, 1, 20, 10),
          template: template?.id ?? null,
          title: sanitizedTitle,
          description: sanitizedDescription,
          project_id: projectId || null,
        };

        const res = await fetch("/api/cross-platform-testing", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const data = (await res.json()) as JobCreatedResponse;

        if (res.status === 401) {
          toast.error("Please sign in to continue");
          router.push("/login");
          setSubmitting(false);
          return;
        }

        if (res.status === 429) {
          const remaining = data.remaining ?? 0;
          if (remaining === 0) {
            toast.error("Monthly usage limit reached", {
              description: `You have used all ${data.limit ?? 50} test cases. Upgrade to Pro for more.`,
              duration: 8000,
              action: {
                label: "Upgrade",
                onClick: () => router.push("/billing"),
              },
            });
          } else {
            toast.error("Not enough test cases remaining", {
              description: `Requested ${data.requested ?? requestedTotal} but only ${remaining} remaining.`,
              duration: 8000,
              action: {
                label: "Upgrade",
                onClick: () => router.push("/billing"),
              },
            });
          }
          setSubmitting(false);
          return;
        }

        if (!res.ok) {
          throw new Error(
            data?.details || data?.error || `Failed (HTTP ${res.status})`,
          );
        }

        if (!data.job_id) {
          throw new Error("Server did not return a job ID. Please try again.");
        }

        // Job created — start polling
        startPolling(data.job_id, requestedTotal);
      } catch (err) {
        console.error("❌ Cross-platform generation error:", err);
        toast.error("Unable to generate cross-platform tests", {
          description:
            err instanceof Error ? err.message : "Please try again later",
          duration: 8000,
        });
        setSubmitting(false);
      }
    },
    [
      pageBusy,
      user,
      validate,
      finalRequirementText,
      mode,
      selectedReqData,
      selectedRequirementId,
      platformsPayload,
      model,
      perPlatformCount,
      template?.id,
      title,
      description,
      projectId,
      router,
      requestedTotal,
    ],
  );

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

  if (!user) {
    router.push("/login");
    return null;
  }

  return (
    <div className="space-y-8 px-1 md:px-2">
      <Card className="mx-auto w-full max-w-7xl">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5" />
            Cross-Platform Test Generator
          </CardTitle>
          <CardDescription>
            Generate platform-specific test suites
            (web/mobile/API/accessibility/performance). AI automatically covers
            happy path, error handling, boundary values, edge cases, and
            security.
          </CardDescription>
          <div className="pt-3 flex flex-wrap items-center gap-2">
            <Badge variant="secondary">
              {selectedPlatforms.length} platform(s)
            </Badge>
            <Badge variant="secondary">{requestedTotal} total cases</Badge>
            {template?.name ? (
              <Badge variant="outline">Template: {template.name}</Badge>
            ) : null}
          </div>
        </CardHeader>

        <CardContent>
          <form onSubmit={onSubmit} className="space-y-6">
            {/* Title / Description */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="title">Suite Title *</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Payments Cross-Platform Suite"
                  disabled={pageBusy}
                  className="h-10"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Optional notes about scope, environment, etc."
                  disabled={pageBusy}
                  className="h-10"
                />
              </div>
            </div>

            {/* Requirement */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-base font-medium">
                  Requirement Description *
                </Label>
                <Button asChild variant="ghost" size="sm" className="h-8">
                  <Link href="/requirements">
                    <FileText className="h-4 w-4 mr-1" />
                    Manage Requirements
                  </Link>
                </Button>
              </div>

              {bootstrappingReqs && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Loading saved requirements…
                </div>
              )}

              <div className="flex items-center gap-2 p-1 bg-muted rounded-lg">
                <Button
                  type="button"
                  variant={mode === "quick" ? "default" : "ghost"}
                  size="sm"
                  className="flex-1 h-8"
                  onClick={() => setMode("quick")}
                  disabled={pageBusy}
                >
                  Quick Entry
                </Button>
                <Button
                  type="button"
                  variant={mode === "saved" ? "default" : "ghost"}
                  size="sm"
                  className="flex-1 h-8"
                  onClick={() => setMode("saved")}
                  disabled={pageBusy || bootstrappingReqs}
                >
                  {bootstrappingReqs
                    ? "Loading…"
                    : savedReqs.length > 0
                      ? "Saved Requirements"
                      : "Example Requirements"}
                </Button>
              </div>

              {mode === "quick" && (
                <>
                  <textarea
                    className="w-full min-h-[140px] p-3 text-sm border rounded-md resize-y focus-visible:ring-2 focus-visible:ring-primary"
                    placeholder="Describe the requirement you want to test across multiple platforms."
                    value={requirement}
                    onChange={(e) => setRequirement(e.target.value)}
                    disabled={pageBusy}
                    maxLength={MAX_REQUIREMENT_LENGTH}
                    required
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>
                      {requirement.trim().length > 0 &&
                      requirement.trim().length < MIN_REQUIREMENT_LENGTH
                        ? `${MIN_REQUIREMENT_LENGTH - requirement.trim().length} more characters needed`
                        : ""}
                    </span>
                    <span
                      className={
                        requirement.length > MAX_REQUIREMENT_LENGTH * 0.9
                          ? "text-orange-500"
                          : ""
                      }
                    >
                      {requirement.length} / {MAX_REQUIREMENT_LENGTH}
                    </span>
                  </div>
                </>
              )}

              {mode === "saved" && (
                <div className="space-y-3">
                  <Select
                    value={selectedRequirementId}
                    onValueChange={setSelectedRequirementId}
                    disabled={pageBusy}
                  >
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder="Select a requirement" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableRequirements.map((req) => (
                        <SelectItem key={req.id} value={req.id}>
                          <div className="flex items-center gap-2">
                            <div
                              className={`w-2 h-2 rounded-full ${savedReqs.length > 0 ? "bg-blue-500" : "bg-gray-400"}`}
                            />
                            {req.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedReqData && (
                    <div className="border rounded-md bg-muted/20">
                      <div className="flex items-center justify-between p-3 border-b bg-muted/40">
                        <h4 className="font-medium text-sm">
                          {selectedReqData.title || selectedReqData.label}
                        </h4>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setRequirement(savedRequirementsText);
                            setMode("quick");
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

            {/* Project */}
            <div className="border rounded-lg p-4 bg-muted/30 space-y-2">
              <div>
                <Label className="text-sm font-medium">Project</Label>
                <p className="text-xs text-muted-foreground">
                  Optional — recommended for organizing generated suites.
                </p>
              </div>
              <ProjectSelect
                value={projectId || undefined}
                disabled={pageBusy}
                onSelect={(p) => {
                  setProjectId(p?.id ?? "");
                  if (!p?.id) setProjectSource("none");
                }}
              />
            </div>

            {/* Model / Count */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>AI Model</Label>
                <Select
                  value={model}
                  onValueChange={(v) => setModel(migrateModelKey(v))}
                  disabled={pageBusy}
                >
                  <SelectTrigger className="h-10">
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
                <Label>Test Cases per Platform</Label>
                <Select
                  value={perPlatformCount}
                  onValueChange={setPerPlatformCount}
                  disabled={pageBusy}
                >
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="Select count" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5 test cases</SelectItem>
                    <SelectItem value="10">10 test cases</SelectItem>
                    <SelectItem value="15">15 test cases</SelectItem>
                    <SelectItem value="20">20 test cases</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  AI generates a balanced mix of happy path, error handling,
                  boundary, edge case, and security tests. Total ={" "}
                  {clampInt(perPlatformCount, 1, 20, 10)} ×{" "}
                  {selectedPlatforms.length} platform(s) = {requestedTotal}{" "}
                  cases.
                </p>
              </div>
            </div>

            {/* Platform selection */}
            <div className="space-y-4">
              <div>
                <Label className="text-base font-medium">
                  Target Platforms *
                </Label>
                <p className="text-sm text-muted-foreground">
                  Select platforms and choose the framework/technology. AI
                  handles coverage automatically.
                </p>
              </div>

              <div className="grid gap-4">
                {platformOptions.map((p) => {
                  const Icon = p.icon;
                  const isSelected = selectedPlatforms.includes(p.id);

                  return (
                    <div
                      key={p.id}
                      className={`border rounded-lg p-4 transition-all ${isSelected ? "border-primary bg-primary/5" : "border-border"}`}
                    >
                      <div className="flex items-start gap-3">
                        <Checkbox
                          id={p.id}
                          checked={isSelected}
                          onCheckedChange={() => togglePlatform(p.id)}
                          disabled={pageBusy}
                          className="mt-1"
                        />
                        <div className="flex-1 space-y-3">
                          <div className="flex items-center gap-3">
                            <Icon className="h-5 w-5 text-muted-foreground" />
                            <div className="flex-1">
                              <Label
                                htmlFor={p.id}
                                className="text-sm font-medium cursor-pointer"
                              >
                                {p.name}
                              </Label>
                              <p className="text-xs text-muted-foreground">
                                {p.description}
                              </p>
                            </div>
                            {isSelected && (
                              <Badge variant="secondary">Selected</Badge>
                            )}
                          </div>

                          {isSelected && (
                            <div className="space-y-3">
                              {/* Framework */}
                              <div className="space-y-2">
                                <Label className="text-sm">
                                  Framework / Technology
                                </Label>
                                <Select
                                  value={frameworkByPlatform[p.id] || ""}
                                  onValueChange={(v) =>
                                    setFrameworkForPlatform(p.id, v)
                                  }
                                  disabled={pageBusy}
                                >
                                  <SelectTrigger className="h-9">
                                    <SelectValue
                                      placeholder={`Select ${p.name.toLowerCase()} framework`}
                                    />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {(frameworkOptions[p.id] || []).map(
                                      (fw) => (
                                        <SelectItem key={fw} value={fw}>
                                          {fw}
                                        </SelectItem>
                                      ),
                                    )}
                                  </SelectContent>
                                </Select>
                              </div>

                              {/* API advanced config */}
                              {p.id === "api" && (
                                <div className="border rounded-md p-3 bg-muted/20 space-y-3">
                                  <div className="flex items-center gap-2">
                                    <Globe className="h-4 w-4 text-muted-foreground" />
                                    <p className="text-sm font-medium">
                                      API Configuration (Optional)
                                    </p>
                                  </div>
                                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                    <div className="space-y-1.5">
                                      <Label className="text-xs">
                                        Protocol
                                      </Label>
                                      <Select
                                        value={apiProtocol}
                                        onValueChange={(v) =>
                                          setApiProtocol(v as ApiProtocol)
                                        }
                                        disabled={pageBusy}
                                      >
                                        <SelectTrigger className="h-9">
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {apiProtocolOptions.map((x) => (
                                            <SelectItem key={x} value={x}>
                                              {x}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    </div>
                                    <div className="space-y-1.5">
                                      <Label className="text-xs">Auth</Label>
                                      <Select
                                        value={apiAuth}
                                        onValueChange={(v) =>
                                          setApiAuth(v as ApiAuth)
                                        }
                                        disabled={pageBusy}
                                      >
                                        <SelectTrigger className="h-9">
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {apiAuthOptions.map((x) => (
                                            <SelectItem key={x} value={x}>
                                              {x}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    </div>
                                    <div className="space-y-1.5">
                                      <Label className="text-xs">
                                        Payload Format
                                      </Label>
                                      <Select
                                        value={apiFormat}
                                        onValueChange={(v) =>
                                          setApiFormat(v as ApiFormat)
                                        }
                                        disabled={pageBusy}
                                      >
                                        <SelectTrigger className="h-9">
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {apiFormatOptions.map((x) => (
                                            <SelectItem key={x} value={x}>
                                              {x}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    </div>
                                  </div>
                                  <div className="space-y-2">
                                    <Label className="text-xs">
                                      Contract (Optional — OpenAPI/WSDL/schema
                                      snippet or URL)
                                    </Label>
                                    <textarea
                                      className="w-full min-h-[90px] p-2 text-xs border rounded-md resize-y focus-visible:ring-2 focus-visible:ring-primary"
                                      placeholder="Paste OpenAPI/WSDL fragment or a URL. Produces much better API test cases."
                                      value={apiContract}
                                      onChange={(e) =>
                                        setApiContract(e.target.value)
                                      }
                                      disabled={pageBusy}
                                    />
                                    <p className="text-xs text-muted-foreground">
                                      If provided, tests will include schema
                                      validation and strict fault/error
                                      coverage.
                                    </p>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {selectedPlatforms.length === 0 && (
                <p className="text-sm text-muted-foreground border border-dashed rounded-lg p-4 text-center">
                  Select at least one platform to generate cross-platform test
                  cases.
                </p>
              )}
            </div>

            {/* Generation progress */}
            {submitting && (
              <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Loader2 className="h-4 w-4 animate-spin text-primary shrink-0" />
                    <span className="text-sm font-medium">
                      {jobStatus.phase === "queued"
                        ? "Job queued — starting shortly…"
                        : "Generating cross-platform test cases…"}
                    </span>
                  </div>
                  {jobStatus.phase === "processing" &&
                    jobStatus.casesRequested > 0 && (
                      <span className="text-xs text-muted-foreground tabular-nums">
                        {jobStatus.casesSaved} / {jobStatus.casesRequested}
                      </span>
                    )}
                </div>
                <div className="space-y-1.5">
                  <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                    <div className="h-1.5 rounded-full bg-primary animate-pulse w-full" />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {jobStatus.phase === "queued"
                      ? "Your generation job has been queued."
                      : `Running parallel AI batches across ${selectedPlatforms.length} platform(s) — typically 20–60 seconds.`}
                  </p>
                </div>
              </div>
            )}

            {/* Submit */}
            <Button
              type="submit"
              className="w-full h-11"
              disabled={pageBusy || selectedPlatforms.length === 0}
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating cross-platform tests…
                </>
              ) : (
                <>
                  <Layers className="h-4 w-4 mr-2" />
                  Generate Cross-Platform Tests
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
      <div className="h-2" />
    </div>
  );
}
