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
import { Checkbox } from "@/components/ui/checkbox";
import { TestTypeMultiselect } from "@/components/generator/testtype-multiselect";

import {
  Loader2,
  Sparkles,
  Info,
  FileText,
  FlaskConical,
  Layers,
  Monitor,
  Smartphone,
  Globe,
  Eye,
  Zap,
  Save,
  Download,
} from "lucide-react";

import { TemplateSelect } from "@/components/templates/template-select";
import { ProjectSelect } from "@/components/projects/project-select";

type TemplateCategory =
  | "functional"
  | "security"
  | "performance"
  | "integration"
  | "regression"
  | "accessibility"
  | "other";

type GenerationType = "regular" | "cross-platform";

type Coverage = "standard" | "comprehensive" | "exhaustive";

type UserProfile = {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
};

type TemplateContent = {
  model: string;
  testCaseCount: number;
  coverage: Coverage;
  includeEdgeCases?: boolean;
  includeNegativeTests?: boolean;
};

type TemplateFromSelect = {
  id: string;
  name: string;
  description?: string | null;
  category: TemplateCategory;
  template_content: TemplateContent;
};

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

type ProjectRowLite = {
  id: string;
  name: string;
  color?: string | null;
  icon?: string | null;
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
  quota_reached?: boolean;
  usage?: {
    generated: number;
    limit: number;
    remaining: number;
  };
};

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

const platformOptions = [
  {
    id: "web",
    name: "Web Application",
    icon: Monitor,
    description: "Browser-based testing",
  },
  {
    id: "mobile",
    name: "Mobile App",
    icon: Smartphone,
    description: "iOS/Android testing",
  },
  {
    id: "api",
    name: "API/Backend",
    icon: Globe,
    description: "REST/GraphQL API testing",
  },
  {
    id: "accessibility",
    name: "Accessibility",
    icon: Eye,
    description: "WCAG compliance testing",
  },
  {
    id: "performance",
    name: "Performance",
    icon: Zap,
    description: "Load & speed testing",
  },
] as const;

const frameworkOptions: Record<string, string[]> = {
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

function clampTestCount(n: number, min = 1, max = 100) {
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, Math.floor(n)));
}

function coerceTestTypes(v: unknown, fallback: string[] = []) {
  if (!Array.isArray(v)) return fallback;

  return v.filter((x): x is string => {
    return typeof x === "string" && x.trim().length > 0;
  });
}

/**
 * Single bootstrap loader: user + projects + requirements + defaults
 */
function useGeneratorBootstrap(userId: string | undefined) {
  const router = useRouter();
  const [bootstrapping, setBootstrapping] = useState(true);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [projects, setProjects] = useState<ProjectRowLite[]>([]);
  const [requirements, setRequirements] = useState<RequirementOption[]>([]);
  const [defaults, setDefaults] = useState<BootstrapDefaults>(null);

  const abortRef = useRef<AbortController | null>(null);
  const load = useCallback(async () => {
    if (!userId) {
      setBootstrapping(false);
      return;
    }

    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    setBootstrapping(true);

    try {
      const res = await fetch(
        "/api/generate-test-cases/bootstrap?requirementsLimit=200&templatesLimit=200",
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
            `Bootstrap failed (HTTP ${res.status})`,
        );
      }

      setProjects(data.projects ?? []);
      setRequirements(mapRequirementsToOptions(data.requirements ?? []));
      setDefaults(data.defaults ?? null);
    } catch (e) {
      if ((e as any)?.name === "AbortError") return;

      console.error("❌ Bootstrap load error:", e);
      toast.error("Unable to load generator data", {
        description: e instanceof Error ? e.message : "Please try again.",
        duration: 7000,
      });

      setRequirements([]); // fallback to placeholders via useMemo
    } finally {
      setBootstrapping(false);
    }
  }, [userId, router]);

  useEffect(() => {
    void load();
    return () => abortRef.current?.abort();
  }, [load, userId]);

  return {
    bootstrapping,
    projects,
    requirements,
    defaults,
    reload: load,
  };
}

export function GeneratorForm() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  // Bootstrap
  const {
    bootstrapping,
    projects,
    requirements: bootReqs,
    defaults,
  } = useGeneratorBootstrap(user?.id);

  // UI state
  const [generationType, setGenerationType] =
    useState<GenerationType>("regular");
  const [submitting, setSubmitting] = useState(false);

  const [mode, setMode] = useState<"quick" | "saved">("quick");
  const [selectedRequirement, setSelectedRequirement] = useState("");
  const [customRequirements, setCustomRequirements] = useState("");
  const [loading, setLoading] = useState(false);

  const [selectedTemplate, setSelectedTemplate] =
    useState<TemplateFromSelect | null>(null);

  // Regular defaults
  const [model, setModel] = useState("claude-sonnet-4-5");
  const [testCaseCount, setTestCaseCount] = useState("10");
  const [coverage, setCoverage] = useState<Coverage>("comprehensive");
  const [includeNegativeTests, setIncludeNegativeTests] = useState(true);
  const [includeSecurityTests, setIncludeSecurityTests] = useState(false);
  const [includeBoundaryTests, setIncludeBoundaryTests] = useState(true);
  const [exportFormat, setExportFormat] = useState<string>("standard");
  const [selectedTestTypes, setSelectedTestTypes] = useState<string[]>([
    "happy-path",
    "negative",
    "boundary",
  ]);

  // Cross-platform state
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [selectedFrameworks, setSelectedFrameworks] = useState<
    Record<string, string>
  >({});
  const [crossPlatformTestCount, setCrossPlatformTestCount] = useState("10");
  const [crossPlatformCoverage, setCrossPlatformCoverage] =
    useState<Coverage>("comprehensive");
  const [crossPlatformModel, setCrossPlatformModel] =
    useState("claude-sonnet-4-5");
  const [crossPlatformTemplate, setCrossPlatformTemplate] =
    useState<TemplateFromSelect | null>(null);

  // Title/description + project
  const [generationTitle, setGenerationTitle] = useState("");
  const [generationDescription, setGenerationDescription] = useState("");
  const [selectedProject, setSelectedProject] = useState<string>("");
  const [projectSource, setProjectSource] = useState<"none" | "requirement">(
    "none",
  );
  const [crossPlatformTestTypes, setCrossPlatformTestTypes] = useState<
    string[]
  >(["happy-path", "negative", "boundary"]);

  // Apply defaults from bootstrap once
  const defaultsAppliedRef = useRef(false);
  useEffect(() => {
    if (defaultsAppliedRef.current) return;
    if (!defaults) return;

    // Only apply if user hasn't started editing (conservative)
    setModel(defaults.model || "claude-sonnet-4-5");
    setTestCaseCount(String(clampTestCount(defaults.count ?? 10, 1, 100)));
    setSelectedTestTypes(
      coerceTestTypes(defaults.test_types, [
        "happy-path",
        "negative",
        "boundary",
      ]),
    );
    // Cross-platform defaults can mirror regular defaults (optional)
    setCrossPlatformModel(defaults.model || "claude-sonnet-4-5");
    setCrossPlatformTestCount(
      String(clampTestCount(defaults.count ?? 10, 1, 100)),
    );
    setCrossPlatformTestTypes(
      coerceTestTypes(defaults.test_types, [
        "happy-path",
        "negative",
        "boundary",
      ]),
    );

    defaultsAppliedRef.current = true;
  }, [defaults]);

  const availableRequirements = useMemo(() => {
    return bootReqs.length > 0 ? bootReqs : PLACEHOLDER_REQUIREMENTS;
  }, [bootReqs]);

  // Ensure selectedRequirement has a value when in saved mode
  useEffect(() => {
    if (mode !== "saved") return;
    if (selectedRequirement) return;
    if (availableRequirements.length === 0) return;
    setSelectedRequirement(availableRequirements[0].id);
  }, [mode, selectedRequirement, availableRequirements]);

  const selectedReqData = useMemo(() => {
    return availableRequirements.find((r) => r.id === selectedRequirement);
  }, [availableRequirements, selectedRequirement]);

  const savedRequirementsText = selectedReqData?.value || "";
  const finalRequirementsText =
    mode === "quick" ? customRequirements : savedRequirementsText;

  // Auto-fill title/description when a saved requirement is selected
  useEffect(() => {
    if (mode !== "saved") return;
    if (!selectedReqData) return;

    setGenerationTitle(`${selectedReqData.title} Test Cases`);
    setGenerationDescription(selectedReqData.description || "");
  }, [mode, selectedReqData?.id]);

  // Auto-apply project from requirement if present
  useEffect(() => {
    if (mode !== "saved") return;
    if (!selectedReqData) return;

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
      if (nextMode === "saved") {
        if (!selectedRequirement && availableRequirements.length > 0) {
          setSelectedRequirement(availableRequirements[0].id);
        }
      }
    },
    [availableRequirements, selectedRequirement],
  );

  const handleTemplateSelect = useCallback(
    (template: TemplateFromSelect | null) => {
      setSelectedTemplate(template);
      if (!template) return;

      const settings = template.template_content;
      setModel(settings.model);
      setTestCaseCount(String(settings.testCaseCount));
      setCoverage(settings.coverage);
    },
    [],
  );

  const handleCrossPlatformTemplateSelect = useCallback(
    (template: TemplateFromSelect | null) => {
      setCrossPlatformTemplate(template);
      if (!template) return;

      const settings = template.template_content;
      setCrossPlatformModel(settings.model);
      setCrossPlatformTestCount(String(settings.testCaseCount));
      setCrossPlatformCoverage(settings.coverage);

      toast.success(`Template "${template.name}" applied to all platforms`);
    },
    [],
  );

  const togglePlatform = useCallback((platformId: string) => {
    setSelectedPlatforms((prev) => {
      if (prev.includes(platformId)) {
        setSelectedFrameworks((fwPrev) => {
          const next = { ...fwPrev };
          delete next[platformId];
          return next;
        });
        return prev.filter((id) => id !== platformId);
      }
      return [...prev, platformId];
    });
  }, []);

  const setFrameworkForPlatform = useCallback(
    (platformId: string, framework: string) => {
      setSelectedFrameworks((prev) => ({ ...prev, [platformId]: framework }));
    },
    [],
  );

  async function handleRegularSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);

    if (!user) {
      toast.error("Please sign in to generate test cases");
      router.push("/login");
      setSubmitting(false);
      return;
    }

    try {
      const testCaseCountNum = parseInt(testCaseCount, 10);

      if (
        Number.isNaN(testCaseCountNum) ||
        testCaseCountNum < 1 ||
        testCaseCountNum > 100
      ) {
        toast.error("Please select a valid number of test cases.");
        return;
      }

      if (mode === "quick" && !customRequirements.trim()) {
        toast.error("Please enter your requirements.");
        return;
      }

      if (mode === "saved" && !savedRequirementsText.trim()) {
        toast.error("Please select a requirement.");
        return;
      }

      if (!generationTitle.trim()) {
        toast.error("Please enter a generation title.");
        return;
      }

      const requestPayload = {
        requirements: finalRequirementsText.trim(),
        requirement_id:
          mode === "saved" && selectedReqData ? selectedRequirement : null,
        model: model.trim(),
        testCaseCount: testCaseCountNum,
        coverage: coverage,
        template: selectedTemplate?.id || null,
        title: generationTitle.trim(),
        description: generationDescription?.trim() || null,
        project_id: selectedProject || null,
        includeNegativeTests,
        includeSecurityTests,
        includeBoundaryTests,
        exportFormat,
      };

      const response = await fetch("/api/generate-test-cases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestPayload),
      });

      const data = await response.json();

      if (response.status === 429) {
        toast.error("Monthly usage limit reached", {
          description: `You have ${
            data.remaining || 0
          } test cases remaining. Upgrade to Pro for 500 test cases/month.`,
          duration: 8000,
          action: {
            label: "Upgrade",
            onClick: () => router.push("/billing"),
          },
        });
        return;
      }

      if (!response.ok) {
        throw new Error(
          data.error ||
            data.details ||
            `HTTP ${response.status}: Failed to generate test cases`,
        );
      }

      toast.success("Test cases generated!", {
        description: `Created ${data.count} test cases using ${data.provider_used}`,
      });

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

  async function handleCrossPlatformSubmit(
    e: React.FormEvent<HTMLFormElement>,
  ) {
    e.preventDefault();
    setSubmitting(true);

    if (!user) {
      toast.error("Please sign in to generate test cases");
      router.push("/login");
      setSubmitting(false);
      return;
    }

    try {
      const formData = new FormData(e.currentTarget);
      const requirement = (formData.get("requirement") as string) || "";

      if (!requirement.trim()) {
        toast.error("Please enter the requirement description.");
        return;
      }

      if (selectedPlatforms.length === 0) {
        toast.error("Please select at least one platform.");
        return;
      }

      for (const platform of selectedPlatforms) {
        if (!selectedFrameworks[platform]) {
          const platformName =
            platformOptions.find((p) => p.id === platform)?.name || platform;
          toast.error(`Please select a framework for ${platformName}.`);
          return;
        }
      }

      const platformsData = selectedPlatforms.map((platformId) => ({
        platform: platformId,
        framework: selectedFrameworks[platformId],
      }));

      const requestPayload = {
        requirement: requirement.trim(),
        platforms: platformsData,
        model: crossPlatformModel,
        testCaseCount: clampTestCount(
          parseInt(crossPlatformTestCount, 10),
          1,
          100,
        ),
        coverage: crossPlatformCoverage,
        template: crossPlatformTemplate?.id || null,
        project_id: selectedProject || null,
      };

      const response = await fetch("/api/cross-platform-testing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestPayload),
      });

      const data = (await response.json()) as CrossPlatformResponse;

      if (response.status === 429) {
        toast.error("Monthly usage limit reached", {
          description: `You have ${
            data.usage?.remaining || 0
          } test cases remaining. Upgrade to generate more.`,
          duration: 8000,
          action: {
            label: "Upgrade",
            onClick: () => router.push("/billing"),
          },
        });
        return;
      }

      if (!response.ok) {
        if (response.status === 500 && data.generation_results) {
          const failed = data.generation_results.filter((r) => r.error);
          const succeeded = data.generation_results.filter((r) => r.count > 0);

          if (succeeded.length > 0) {
            toast.warning(`Partial success`, {
              duration: 8000,
              description: `Generated ${
                data.total_test_cases || 0
              } test cases for ${
                succeeded.length
              } platform(s). Failed for: ${failed
                .map((r) => r.platform)
                .join(", ")}`,
            });
            router.push(`/test-cases`);
            return;
          }

          toast.error("Failed to generate test cases", {
            description:
              data.error || "All platforms failed. Please try again.",
            duration: 7000,
          });
          return;
        }

        throw new Error(
          data.error ||
            data.details ||
            `Failed to generate cross-platform tests`,
        );
      }

      if (data.quota_reached) {
        toast.warning("Monthly limit reached!", {
          duration: 8000,
          description: `Generated ${data.total_test_cases} test cases. Some platforms were skipped. Upgrade for unlimited generations.`,
          action: {
            label: "Upgrade",
            onClick: () => router.push("/billing"),
          },
        });
      } else if (
        data.usage &&
        data.usage.remaining >= 0 &&
        data.usage.remaining <= 5
      ) {
        toast.success(`Generated ${data.total_test_cases} test cases!`, {
          duration: 6000,
          description: `Only ${data.usage.remaining} test case${
            data.usage.remaining === 1 ? "" : "s"
          } remaining this month`,
        });
      } else {
        toast.success("Cross-platform tests generated!", {
          description: `Created ${data.total_test_cases} test cases across ${selectedPlatforms.length} platform(s)`,
        });
      }

      router.push(`/test-cases`);
    } catch (err) {
      console.error("❌ Cross-platform generation error:", err);
      toast.error("Unable to generate cross-platform tests", {
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
    <div className="space-y-10 px-1 md:px-2">
      <Card className="mx-auto w-full max-w-7xl">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            AI Test Case Generator
          </CardTitle>
          <CardDescription>
            Generate comprehensive test cases with AI models across different
            platforms and coverage levels
          </CardDescription>
        </CardHeader>

        <CardContent>
          {/* Bootstrap loading banner */}
          {bootstrapping && (
            <div className="mb-6 flex items-center gap-2 rounded-lg border bg-muted/30 p-3">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Loading your projects, requirements, and defaults…
              </p>
            </div>
          )}

          {/* Regular */}
          {generationType === "regular" && (
            <form onSubmit={handleRegularSubmit} className="space-y-6">
              {/* Title / Description */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Generation Title *</Label>
                  <Input
                    id="title"
                    name="title"
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

                {/* Mode Toggle */}
                <div className="flex items-center gap-2 p-1 bg-muted rounded-lg">
                  <Button
                    type="button"
                    variant={mode === "quick" ? "default" : "ghost"}
                    size="sm"
                    className="flex-1 h-8"
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
                    onClick={() => switchMode("saved")}
                    disabled={pageBusy}
                  >
                    {bootReqs.length > 0
                      ? "Saved Requirements"
                      : "Example Requirements"}
                  </Button>
                </div>

                {/* Quick Entry Mode */}
                {mode === "quick" && (
                  <div className="space-y-3">
                    <Label htmlFor="custom-requirements" className="text-sm">
                      Describe your requirements{" "}
                      <span className="text-destructive">*</span>
                    </Label>
                    <textarea
                      id="custom-requirements"
                      className="w-full min-h-[200px] p-3 text-sm border rounded-md font-mono resize-y focus-visible:ring-2 focus-visible:ring-primary"
                      placeholder="Describe what you want to test. Be as detailed as possible."
                      value={customRequirements}
                      onChange={(e) => setCustomRequirements(e.target.value)}
                      disabled={pageBusy}
                      required
                    />

                    {customRequirements.length > 50 && (
                      <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
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

                {/* Saved Requirements Mode */}
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
                      <SelectTrigger className="h-10">
                        <SelectValue placeholder="Select a requirement" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableRequirements.map((req) => (
                          <SelectItem key={req.id} value={req.id}>
                            <div className="flex items-center gap-2">
                              <div
                                className={`w-2 h-2 rounded-full ${
                                  bootReqs.length > 0
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
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium text-sm">
                              {selectedReqData.title || selectedReqData.label}
                            </h4>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
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

              {/* Project Selection */}
              <div className="mt-4 space-y-3 border rounded-lg p-4 bg-muted/30">
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
                  onSelect={(p) => setSelectedProject(p?.id ?? "")}
                />
              </div>

              {/* Template Selection */}
              <div className="mt-4 space-y-3 border rounded-lg p-4 bg-muted/30">
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
                  <p className="text-xs text-muted-foreground">
                    Template{" "}
                    <span className="font-medium">
                      &quot;{selectedTemplate.name}&quot;
                    </span>{" "}
                    is applied. You can still adjust settings before generating.
                  </p>
                )}
              </div>

              {/* Settings row */}
              {!templateApplied && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* AI Model */}
                  <div className="space-y-2">
                    <Label htmlFor="model">AI Model</Label>
                    <Select
                      name="model"
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
                        <SelectItem value="gpt-5.2">
                          GPT-5.2 (Premium)
                        </SelectItem>
                        <SelectItem value="gpt-4o">GPT-4o</SelectItem>
                        <SelectItem value="gpt-4o-mini">
                          GPT-4o Mini (Economical)
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Test Case Count */}
                  <div className="space-y-2">
                    <Label htmlFor="testCaseCount">Number of Test Cases</Label>
                    <Select
                      name="testCaseCount"
                      value={testCaseCount}
                      onValueChange={setTestCaseCount}
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
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Coverage */}
                  <div className="space-y-2 md:col-span-3">
                    <Label
                      htmlFor="test-types"
                      className="text-base font-medium"
                    >
                      Test Types
                      <span className="text-destructive ml-1">*</span>
                    </Label>

                    <TestTypeMultiselect
                      value={selectedTestTypes}
                      onChange={setSelectedTestTypes}
                      disabled={pageBusy}
                      placeholder="Select test types to generate..."
                    />

                    <p className="text-xs text-muted-foreground">
                      Select which types of test cases to generate. More types =
                      more comprehensive coverage.
                    </p>
                  </div>
                </div>
              )}

              <Button type="submit" className="w-full h-11" disabled={pageBusy}>
                {pageBusy ? (
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
          )}
        </CardContent>
      </Card>

      <div className="h-2" />
    </div>
  );
}
