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
  Info,
} from "lucide-react";

import {
  TemplateSelect,
  type Template,
} from "@/components/templates/template-select";
import { ProjectSelect } from "@/components/projects/project-select";

import {
  CrossPlatformTestTypeMultiselect,
  type PlatformId as MultiselectPlatformId,
} from "@/components/generator/cross-platform-test-type-multiselect";

/* =========================
   Types
========================= */

type GenerationResult = {
  platform: string;
  count: number;
  error?: string;
};

type CrossPlatformResponse = {
  success?: boolean;
  suite_id?: string;
  total_test_cases?: number;
  platforms?: string[];
  generation_results?: GenerationResult[];
  message?: string;
  error?: string;
  details?: string;
  requestId?: string;
  upgradeRequired?: boolean;
  usage?: {
    remaining: number;
    generated: number;
    requested: number;
  };
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
  value: string; // text we feed to generator
  project_id?: string | null;
};

type BootstrapResponse = {
  requirements: RequirementRow[];
};

/* =========================
   Constants / Helpers
========================= */

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

function uniq(arr: string[]) {
  return Array.from(new Set(arr.filter(Boolean)));
}

/**
 * Default (recommended) test types per platform.
 * These MUST match CrossPlatformTestTypeMultiselect values.
 */
const DEFAULT_TEST_TYPES: Record<PlatformId, string[]> = {
  web: [
    "functional",
    "negative",
    "edge-boundary",
    "validation",
    "regression-smoke",
    "ui-ux-basic",
    "security-basic",
    "accessibility-basic",
  ],
  mobile: [
    "functional",
    "negative",
    "edge-boundary",
    "offline-network",
    "permissions",
    "device-os",
    "regression-smoke",
    "performance-basic-mobile",
  ],
  api: [
    "contract-schema",
    "authn-authz",
    "negative",
    "edge-boundary",
    "idempotency-replay",
    "rate-limits",
    "paging-filter-sort",
    "data-integrity",
  ],
  accessibility: [
    "a11y-keyboard",
    "a11y-focus",
    "a11y-screenreader",
    "a11y-contrast",
    "a11y-forms-errors",
    "a11y-zoom-reflow",
  ],
  performance: [
    "load",
    "stress",
    "spike",
    "soak",
    "latency-sla",
    "resources",
    "reliability",
  ],
};

/* =========================
   Component
========================= */

export function CrossPlatformGeneratorForm() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [submitting, setSubmitting] = useState(false);

  // Inputs
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [requirement, setRequirement] = useState(""); // quick entry text
  const [projectId, setProjectId] = useState<string>("");

  // Model/settings
  const [model, setModel] = useState("claude-sonnet-4-5");
  const [perPlatformCount, setPerPlatformCount] = useState<string>("10");

  // Template
  const [template, setTemplate] = useState<Template | null>(null);

  // Platform selection
  const [selectedPlatforms, setSelectedPlatforms] = useState<PlatformId[]>([]);
  const [frameworkByPlatform, setFrameworkByPlatform] = useState<
    Record<PlatformId, string>
  >({} as Record<PlatformId, string>);

  // Per-platform test types
  const [testTypesByPlatform, setTestTypesByPlatform] = useState<
    Partial<Record<PlatformId, string[]>>
  >({});

  // API-specific advanced config (applies to API platform only)
  const [apiProtocol, setApiProtocol] = useState<ApiProtocol>("REST");
  const [apiAuth, setApiAuth] = useState<ApiAuth>("Bearer");
  const [apiFormat, setApiFormat] = useState<ApiFormat>("JSON");
  const [apiContract, setApiContract] = useState<string>("");

  // Requirements bootstrap (saved requirements)
  const [bootstrappingReqs, setBootstrappingReqs] = useState(false);
  const [savedReqs, setSavedReqs] = useState<RequirementOption[]>([]);

  // Requirement mode
  const [mode, setMode] = useState<"quick" | "saved">("quick");
  const [selectedRequirementId, setSelectedRequirementId] =
    useState<string>("");

  // Track if project came from requirement (optional)
  const [projectSource, setProjectSource] = useState<"none" | "requirement">(
    "none",
  );

  // Derived requirement text
  const availableRequirements = useMemo(() => {
    return savedReqs.length > 0 ? savedReqs : PLACEHOLDER_REQUIREMENTS;
  }, [savedReqs]);

  const selectedReqData = useMemo(() => {
    return availableRequirements.find((r) => r.id === selectedRequirementId);
  }, [availableRequirements, selectedRequirementId]);

  const savedRequirementsText = selectedReqData?.value ?? "";
  const finalRequirementText =
    mode === "quick" ? requirement : savedRequirementsText;

  const pageBusy = authLoading || submitting || bootstrappingReqs;

  // Bootstrap saved requirements
  useEffect(() => {
    if (!user?.id) return;

    let cancelled = false;
    const ac = new AbortController();

    (async () => {
      setBootstrappingReqs(true);
      try {
        const res = await fetch(
          "/api/generate-test-cases/bootstrap?requirementsLimit=200",
          {
            method: "GET",
            headers: { "Content-Type": "application/json" },
            signal: ac.signal,
            cache: "no-store",
          },
        );

        const data = (await res.json()) as Partial<BootstrapResponse> & {
          error?: string;
          details?: string;
        };

        if (res.status === 401) {
          toast.error("Please sign in to continue");
          router.push("/login");
          return;
        }

        if (!res.ok) {
          throw new Error(
            data?.error ||
              data?.details ||
              `Requirements bootstrap failed (HTTP ${res.status})`,
          );
        }

        const mapped = mapRequirementsToOptions(data.requirements ?? []);
        if (!cancelled) setSavedReqs(mapped);
      } catch (e) {
        if ((e as any)?.name === "AbortError") return;
        console.error("❌ Requirements bootstrap error:", e);
        if (!cancelled) setSavedReqs([]); // fallback to placeholders
      } finally {
        if (!cancelled) setBootstrappingReqs(false);
      }
    })();

    return () => {
      cancelled = true;
      ac.abort();
    };
  }, [user?.id, router]);

  // Ensure selectedRequirementId has a value when in saved mode
  useEffect(() => {
    if (mode !== "saved") return;
    if (selectedRequirementId) return;
    if (availableRequirements.length === 0) return;
    setSelectedRequirementId(availableRequirements[0].id);
  }, [mode, selectedRequirementId, availableRequirements]);

  // Auto-fill title/description when a saved requirement is selected
  useEffect(() => {
    if (mode !== "saved") return;
    if (!selectedReqData) return;

    setTitle(`${selectedReqData.title} Cross-Platform Suite`);
    setDescription(selectedReqData.description || "");
  }, [mode, selectedReqData?.id]);

  // Auto-apply project from requirement if present
  useEffect(() => {
    if (mode !== "saved") return;
    if (!selectedReqData) return;

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

  // Suggested title (only if user hasn't set one)
  useEffect(() => {
    if (title.trim()) return;
    if (finalRequirementText.trim().length < 12) return;
    setTitle("Cross-Platform Test Suite");
  }, [finalRequirementText, title]);

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

  const seedDefaultTestTypes = useCallback((platform: PlatformId) => {
    setTestTypesByPlatform((prev) => {
      const existing = prev[platform] ?? [];
      if (existing.length > 0) return prev;
      return { ...prev, [platform]: DEFAULT_TEST_TYPES[platform] ?? [] };
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
          setTestTypesByPlatform((ttPrev) => {
            const next = { ...ttPrev };
            delete (next as any)[platformId];
            return next;
          });
          return prev.filter((x) => x !== platformId);
        }

        ensureDefaultFramework(platformId);
        seedDefaultTestTypes(platformId);
        return [...prev, platformId];
      });
    },
    [ensureDefaultFramework, seedDefaultTestTypes],
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

  const requestedTotal = useMemo(() => {
    const per = clampInt(perPlatformCount, 1, 100, 10);
    return per * selectedPlatforms.length;
  }, [perPlatformCount, selectedPlatforms.length]);

  const platformsPayload = useMemo(() => {
    return selectedPlatforms.map((p) => {
      const test_types = testTypesByPlatform[p] ?? [];

      if (p !== "api") {
        return {
          platform: p,
          framework: frameworkByPlatform[p] || "",
          test_types,
        };
      }

      return {
        platform: "api" as const,
        framework: frameworkByPlatform[p] || "REST API",
        test_types,
        protocol: apiProtocol,
        auth: apiAuth,
        format: apiFormat,
        contract: apiContract.trim() || undefined,
        required_checks: [
          "schema validation",
          "SOAP faults",
          "headers",
          "replay/idempotency",
          "rate limits",
          "auth failures",
        ],
      };
    });
  }, [
    selectedPlatforms,
    testTypesByPlatform,
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
      const types = testTypesByPlatform[p] ?? [];
      if (types.length === 0) {
        const name = platformOptions.find((x) => x.id === p)?.name ?? p;
        return `Please select at least one test type for ${name}.`;
      }
    }

    const per = clampInt(perPlatformCount, 1, 100, 10);
    if (per < 1) return "Test cases per platform must be at least 1.";

    if (selectedPlatforms.includes("api")) {
      if (apiProtocol === "SOAP" && apiFormat !== "XML") {
        return "For SOAP, please set payload format to XML.";
      }
    }

    return null;
  }, [
    user,
    finalRequirementText,
    title,
    selectedPlatforms,
    frameworkByPlatform,
    testTypesByPlatform,
    perPlatformCount,
    apiProtocol,
    apiFormat,
  ]);

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

      setSubmitting(true);
      try {
        const payload = {
          requirement: finalRequirementText.trim(),
          requirement_id:
            mode === "saved" && selectedReqData ? selectedRequirementId : null,
          platforms: platformsPayload,
          model: model.trim(),
          testCaseCount: clampInt(perPlatformCount, 1, 100, 10),
          template: template?.id ?? null,
          title: title.trim(),
          description: description.trim() || null,
          project_id: projectId || null,
        };

        const res = await fetch("/api/cross-platform-testing", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const data = (await res.json()) as CrossPlatformResponse;

        if (res.status === 401) {
          toast.error("Please sign in to continue");
          router.push("/login");
          return;
        }

        if (res.status === 429) {
          toast.error("Monthly usage limit reached", {
            description: `You have ${
              data.usage?.remaining ?? 0
            } test cases remaining.`,
            duration: 8000,
            action: {
              label: "Upgrade",
              onClick: () => router.push("/billing"),
            },
          });
          return;
        }

        if (!res.ok) {
          console.error("[cross-platform] error payload:", data);
          const msg =
            data.details ||
            data.error ||
            `Failed to generate cross-platform tests (HTTP ${res.status})`;
          toast.error("Unable to generate cross-platform tests", {
            description: msg,
            duration: 8000,
          });
          return;
        }

        toast.success("Cross-platform tests generated!", {
          description:
            data.message || `Created ${data.total_test_cases ?? 0} test cases.`,
          duration: 6000,
        });

        if (data.suite_id) router.push(`/test-library`);
        else router.push(`/test-cases`);
      } catch (err2) {
        console.error("❌ Cross-platform generation error:", err2);
        toast.error("Unable to generate cross-platform tests", {
          description:
            err2 instanceof Error ? err2.message : "Please try again later",
          duration: 8000,
        });
      } finally {
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
            (web/mobile/API/accessibility/performance). Test Types are selected
            per platform and drive what scenarios get generated.
          </CardDescription>

          <div className="pt-3 flex flex-wrap items-center gap-2">
            <Badge variant="secondary">
              {selectedPlatforms.length} platform(s)
            </Badge>
            <Badge variant="secondary">{requestedTotal} total requested</Badge>
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

            {/* Requirement (Quick vs Saved) */}
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

              {/* Mode Toggle */}
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
                  disabled={pageBusy}
                >
                  {savedReqs.length > 0
                    ? "Saved Requirements"
                    : "Example Requirements"}
                </Button>
              </div>

              {/* Quick Entry Mode */}
              {mode === "quick" && (
                <>
                  <textarea
                    id="requirement"
                    name="requirement"
                    className="w-full min-h-[140px] p-3 text-sm border rounded-md resize-y focus-visible:ring-2 focus-visible:ring-primary"
                    placeholder="Describe the requirement you want to test across multiple platforms."
                    value={requirement}
                    onChange={(e) => setRequirement(e.target.value)}
                    disabled={pageBusy}
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Tip: Include roles, data rules, constraints, and environment
                    assumptions.
                  </p>
                </>
              )}

              {/* Saved Requirements Mode */}
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
                              className={`w-2 h-2 rounded-full ${
                                savedReqs.length > 0
                                  ? "bg-blue-500"
                                  : "bg-gray-400"
                              }`}
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
                  Optional, but recommended for organizing generated suites and
                  linking assets.
                </p>
              </div>
              <ProjectSelect
                value={projectId || undefined}
                disabled={pageBusy}
                onSelect={(p) => {
                  setProjectId(p?.id ?? "");
                  setProjectSource("none"); // user manually chose project
                }}
              />
            </div>

            {/* Template */}
            <div className="border rounded-lg p-4 bg-muted/30 space-y-3">
              <TemplateSelect
                value={template?.id}
                onSelect={setTemplate}
                disabled={pageBusy}
                projectId={projectId || null}
              />
              {template && (
                <div className="flex items-start gap-2 text-xs text-muted-foreground">
                  <Info className="h-4 w-4 mt-0.5" />
                  <p>
                    Template is used for structure/format guidance.
                    Cross-platform API should resolve template id to{" "}
                    <code>test_case_templates.template_content</code>.
                  </p>
                </div>
              )}
            </div>

            {/* Model / Count */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>AI Model</Label>
                <Select
                  value={model}
                  onValueChange={setModel}
                  disabled={pageBusy}
                >
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="Select model" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="claude-sonnet-4-5">
                      Claude Sonnet 4.5
                    </SelectItem>
                    <SelectItem value="claude-haiku-4-5">
                      Claude Haiku 4.5 (Fast)
                    </SelectItem>
                    <SelectItem value="claude-opus-4-5">
                      Claude Opus 4.5 (Max Quality)
                    </SelectItem>
                    <SelectItem value="gpt-5-mini">
                      GPT-5 Mini (Balanced)
                    </SelectItem>
                    <SelectItem value="gpt-5.2">GPT-5.2 (Premium)</SelectItem>
                    <SelectItem value="gpt-4o">GPT-4o</SelectItem>
                    <SelectItem value="gpt-4o-mini">
                      GPT-4o Mini (Economical)
                    </SelectItem>
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
                    <SelectItem value="30">30 test cases</SelectItem>
                    <SelectItem value="50">50 test cases</SelectItem>
                    <SelectItem value="75">75 test cases</SelectItem>
                    <SelectItem value="100">100 test cases</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Total requested = per-platform count × number of selected
                  platforms.
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
                  Select platforms, choose the framework/technology, and select
                  test types per platform.
                </p>
              </div>

              <div className="grid gap-4">
                {platformOptions.map((p) => {
                  const Icon = p.icon;
                  const isSelected = selectedPlatforms.includes(p.id);

                  return (
                    <div
                      key={p.id}
                      className={`border rounded-lg p-4 transition-all ${
                        isSelected
                          ? "border-primary bg-primary/5"
                          : "border-border"
                      }`}
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
                            <div className="space-y-4">
                              {/* Framework */}
                              <div className="space-y-2">
                                <Label className="text-sm">
                                  Framework/Technology
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

                              {/* Test Types (per platform) */}
                              <div className="space-y-2">
                                <Label className="text-sm">Test Types *</Label>
                                <CrossPlatformTestTypeMultiselect
                                  platform={p.id as MultiselectPlatformId}
                                  value={testTypesByPlatform[p.id] ?? []}
                                  onChange={(v) =>
                                    setTestTypesByPlatform((prev) => ({
                                      ...prev,
                                      [p.id]: uniq(v),
                                    }))
                                  }
                                  disabled={pageBusy}
                                  placeholder={`Select ${p.name} test types...`}
                                />
                              </div>

                              {/* API Advanced */}
                              {p.id === "api" && (
                                <div className="border rounded-md p-3 bg-muted/20 space-y-3">
                                  <div className="flex items-center gap-2">
                                    <Globe className="h-4 w-4 text-muted-foreground" />
                                    <p className="text-sm font-medium">
                                      API Configuration (Recommended)
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
                                          <SelectValue placeholder="Protocol" />
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
                                          <SelectValue placeholder="Auth" />
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
                                          <SelectValue placeholder="Format" />
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
                                      Contract (Optional: OpenAPI/WSDL/schema
                                      snippet or URL)
                                    </Label>
                                    <textarea
                                      className="w-full min-h-[90px] p-2 text-xs border rounded-md resize-y focus-visible:ring-2 focus-visible:ring-primary"
                                      placeholder="Paste OpenAPI/WSDL fragment or a URL. This produces much better API test cases."
                                      value={apiContract}
                                      onChange={(e) =>
                                        setApiContract(e.target.value)
                                      }
                                      disabled={pageBusy}
                                    />
                                    <p className="text-xs text-muted-foreground">
                                      If you provide a contract, tests will
                                      include schema validation and strict
                                      fault/error coverage.
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

            {/* Submit */}
            <Button
              type="submit"
              className="w-full h-11"
              disabled={pageBusy || selectedPlatforms.length === 0}
            >
              {pageBusy ? (
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

            {/* Debug (safe) */}
            <div className="text-xs text-muted-foreground space-y-1">
              <p>
                Request summary: {selectedPlatforms.length} platform(s),{" "}
                {clampInt(perPlatformCount, 1, 100, 10)} per platform, total{" "}
                {requestedTotal}.
              </p>
              <p>
                Requirement mode: <code>{mode}</code>
                {mode === "saved" && selectedRequirementId ? (
                  <>
                    {" "}
                    (requirement_id: <code>{selectedRequirementId}</code>)
                  </>
                ) : null}
              </p>
              {selectedPlatforms.map((p) => (
                <p key={p}>
                  {p}: {(testTypesByPlatform[p] ?? []).join(", ") || "—"}
                </p>
              ))}
              {template?.id ? (
                <p>
                  Template ID sent: <code>{template.id}</code> (API resolves to{" "}
                  <code>test_case_templates.template_content</code>)
                </p>
              ) : null}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
