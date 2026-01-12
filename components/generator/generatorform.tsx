"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
import {
  Loader2,
  Sparkles,
  Info,
  FileText,
  Plus,
  FlaskConical,
  Layers,
  Monitor,
  Smartphone,
  Globe,
  Eye,
  Zap,
  Save,
} from "lucide-react";
import { AddRequirementModal } from "@/components/requirements/add-requirement-modal";
import Link from "next/link";
import { checkAndRecordUsage } from "@/lib/usage-tracker";
import { TemplateSelect } from "@/components/templates/template-select";
import { QuickTemplateSave } from "@/components/templates/quick-templates";
import { ProjectSelect } from "@/components/projects/project-select";

type TemplateCategory =
  | "functional"
  | "security"
  | "performance"
  | "integration"
  | "regression"
  | "accessibility"
  | "other";

interface DatabaseRequirement {
  id: string;
  title: string;
  description: string;
  type: string;
  priority: string;
}

interface RequirementOption {
  id: string;
  label: string;
  title: string;
  description: string;
  type: string;
  priority: string;
  value: string;
  project_id?: string | null;
}

interface TemplateContent {
  model: string;
  testCaseCount: number;
  coverage: "standard" | "comprehensive" | "exhaustive";
  includeEdgeCases?: boolean;
  includeNegativeTests?: boolean;
}

interface TemplateFromSelect {
  id: string;
  name: string;
  description?: string | null;
  category: TemplateCategory;
  template_content: TemplateContent;
}

type UserProfile = {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
};

interface GenerationResult {
  platform: string;
  count: number;
  error?: string;
}

interface CrossPlatformResponse {
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
}

interface Template {
  id: string;
  name: string;
  description?: string | null;
  category: string;
  template_content: TemplateContent;
}

export interface ProjectRow {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  status: "active" | "archived" | "completed";
  color?: string;
  created_at: string;
  updated_at: string;
}

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
];

const frameworkOptions = {
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

type GenerationType = "regular" | "cross-platform";

export function GeneratorForm() {
  const [generationType, setGenerationType] =
    useState<GenerationType>("regular");
  const [loading, setLoading] = useState(false);
  const [savedRequirements, setSavedRequirements] = useState<
    RequirementOption[]
  >([]);
  const [mode, setMode] = useState<"quick" | "saved">("quick");
  const [selectedRequirement, setSelectedRequirement] = useState("");
  const [customRequirements, setCustomRequirements] = useState("");
  const [fetchingRequirements, setFetchingRequirements] = useState(true);
  const [selectedTemplate, setSelectedTemplate] =
    useState<TemplateFromSelect | null>(null);

  // Updated to use latest Claude 4.5 Sonnet as default
  const [model, setModel] = useState("claude-sonnet-4-5");
  const [testCaseCount, setTestCaseCount] = useState("10");
  const [selectedProject, setSelectedProject] = useState<string>("");
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [coverage, setCoverage] = useState<
    "standard" | "comprehensive" | "exhaustive"
  >("comprehensive");

  // Cross-platform specific state
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [selectedFrameworks, setSelectedFrameworks] = useState<
    Record<string, string>
  >({});
  const [user, setUser] = useState<UserProfile | null>(null);
  const supabase = createClient();
  const [generationTitle, setGenerationTitle] = useState("");
  const [generationDescription, setGenerationDescription] = useState("");
  // Cross-platform enhanced state
  const [crossPlatformTestCount, setCrossPlatformTestCount] = useState("10");
  const [crossPlatformCoverage, setCrossPlatformCoverage] = useState<
    "standard" | "comprehensive" | "exhaustive"
  >("comprehensive");
  const [crossPlatformModel, setCrossPlatformModel] =
    useState("claude-sonnet-4-5");
  const [crossPlatformTemplate, setCrossPlatformTemplate] =
    useState<TemplateFromSelect | null>(null);

  const router = useRouter();

  const [projectSource, setProjectSource] = useState<
    "none" | "requirement" | "user"
  >("none");

  async function fetchRequirements() {
    setFetchingRequirements(true);
    try {
      const supabase = createClient();

      const { data, error } = await supabase
        .from("requirements")
        .select("id, title, description, type, priority, status, project_id")
        .order("title", { ascending: true });

      if (error) throw error;

      const dbRequirements: RequirementOption[] = (data || []).map((req) => ({
        id: req.id,
        label: `${req.title} (${req.type})`,
        title: req.title,
        description: req.description,
        type: req.type,
        priority: req.priority,
        value: req.description,
        project_id: req.project_id ?? null,
      }));

      setSavedRequirements(dbRequirements);

      if (
        dbRequirements.length > 0 &&
        mode === "saved" &&
        !selectedRequirement
      ) {
        setSelectedRequirement(dbRequirements[0].id);
      }
    } catch (error) {
      console.error("❌ Error fetching requirements:", error);
      setSavedRequirements([]);
    } finally {
      setFetchingRequirements(false);
    }
  }

  useEffect(() => {
    (async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          setUser({
            id: user.id,
            email: user.email || "",
            full_name: user.user_metadata?.full_name || "",
            avatar_url: user.user_metadata?.avatar_url || "",
          });
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [supabase]);

  useEffect(() => {
    fetchRequirements();
  }, []);

  const availableRequirements =
    savedRequirements.length > 0 ? savedRequirements : PLACEHOLDER_REQUIREMENTS;

  function switchMode(nextMode: "quick" | "saved") {
    setMode(nextMode);
    if (nextMode === "saved") {
      if (!selectedRequirement && availableRequirements.length > 0) {
        setSelectedRequirement(availableRequirements[0].id);
      }
    }
  }

  const selectedReqData = availableRequirements.find(
    (r) => r.id === selectedRequirement
  );
  const savedRequirementsText = selectedReqData?.value || "";
  const finalRequirementsText =
    mode === "quick" ? customRequirements : savedRequirementsText;
  const templateApplied = !!selectedTemplate;

  useEffect(() => {
    if (mode !== "saved") return;
    if (!selectedReqData) return;

    setGenerationTitle(`${selectedReqData.title} Test Cases`);
    setGenerationDescription(selectedReqData.description || "");
  }, [mode, selectedRequirement]);

  const togglePlatform = (platformId: string) => {
    setSelectedPlatforms((prev) => {
      if (prev.includes(platformId)) {
        const newFrameworks = { ...selectedFrameworks };
        delete newFrameworks[platformId];
        setSelectedFrameworks(newFrameworks);
        return prev.filter((id) => id !== platformId);
      } else {
        return [...prev, platformId];
      }
    });
  };

  const setFrameworkForPlatform = (platformId: string, framework: string) => {
    setSelectedFrameworks((prev) => ({
      ...prev,
      [platformId]: framework,
    }));
  };

  useEffect(() => {
    if (mode !== "saved") return;
    if (!selectedReqData) return;

    const reqProjectId = selectedReqData.project_id ?? null;

    // If requirement has a project -> always apply it
    if (reqProjectId) {
      setSelectedProject(reqProjectId);
      setProjectSource("requirement");
      return;
    }

    if (projectSource === "requirement") {
      setSelectedProject("");
      setProjectSource("none");
    }
  }, [mode, selectedRequirement, selectedReqData?.project_id]);

  async function handleRegularSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    if (!user) {
      toast.error("Please sign in to generate test cases");
      router.push("/login");
      return;
    }

    try {
      const title = generationTitle;
      const description = generationDescription;

      const modelToUse = model;
      const testCaseCountNum = parseInt(testCaseCount, 10);
      const coverageToUse = coverage;

      if (
        isNaN(testCaseCountNum) ||
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

      if (!title?.trim()) {
        toast.error("Please enter a generation title.");
        return;
      }

      const requestPayload = {
        requirements: finalRequirementsText.trim(),
        requirement_id:
          mode === "saved" &&
          savedRequirements.find((r) => r.id === selectedRequirement)
            ? selectedRequirement
            : null,
        model: model.trim(),
        testCaseCount: testCaseCount,
        coverage: coverage.trim(),
        template: selectedTemplate?.id || null,
        title: title.trim(),
        description: description?.trim() || null,
        project_id: selectedProject || null,
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
            `HTTP ${response.status}: Failed to generate test cases`
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
      setLoading(false);
    }
  }

  function handleCrossPlatformTemplateSelect(
    template: TemplateFromSelect | null
  ) {
    setCrossPlatformTemplate(template);

    if (!template) return;

    const settings = template.template_content;
    setCrossPlatformModel(settings.model);
    setCrossPlatformTestCount(String(settings.testCaseCount));
    setCrossPlatformCoverage(settings.coverage);

    toast.success(`Template "${template.name}" applied to all platforms`);
  }

  async function handleCrossPlatformSubmit(
    e: React.FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();
    setLoading(true);

    if (!user) {
      toast.error("Please sign in to generate test cases");
      router.push("/login");
      return;
    }

    try {
      const formData = new FormData(e.currentTarget);
      const requirement = formData.get("requirement") as string;
      const model = formData.get("model") as string;

      if (!requirement?.trim()) {
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
        testCaseCount: parseInt(crossPlatformTestCount, 10),
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
            onClick: () => router.push("/platform/billing"),
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
          } else {
            toast.error("Failed to generate test cases", {
              description:
                data.error || "All platforms failed. Please try again.",
              duration: 7000,
            });
          }
        } else {
          throw new Error(
            data.error ||
              data.details ||
              `Failed to generate cross-platform tests`
          );
        }
        return;
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
          description: `⚠️ Only ${data.usage.remaining} test case${
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
      setLoading(false);
    }
  }

  const estimatedTotal =
    selectedPlatforms.length * parseInt(crossPlatformTestCount || "5", 10);

  function handleTemplateSelect(template: TemplateFromSelect | null) {
    setSelectedTemplate(template);

    if (!template) return;

    const settings = template.template_content;
    setModel(settings.model);
    setTestCaseCount(String(settings.testCaseCount));
    setCoverage(settings.coverage);
  }

  function getModelDisplayName(modelKey: string): string {
    if (modelKey === "claude-sonnet-4-5") return "Claude Sonnet 4.5";
    if (modelKey === "claude-haiku-4-5") return "Claude Haiku 4.5";
    if (modelKey === "claude-opus-4-5") return "Claude Opus 4.5";
    if (modelKey === "gpt-5-mini") return "GPT-5 Mini";
    if (modelKey === "gpt-5.2") return "GPT-5.2";
    if (modelKey === "gpt-4o") return "GPT-4o";
    if (modelKey === "gpt-4o-mini") return "GPT-4o Mini";
    if (modelKey.includes("claude-3-5-sonnet")) return "Claude 3.5 Sonnet";
    if (modelKey.includes("claude-3-5-haiku")) return "Claude 3.5 Haiku";
    return modelKey;
  }

  async function loadUserPreferences() {
    try {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();
      if (!authUser) return;

      const { data: profile } = await supabase
        .from("user_profiles")
        .select("preferences")
        .eq("id", authUser.id)
        .maybeSingle();

      if (profile?.preferences?.test_case_defaults) {
        const defaults = profile.preferences.test_case_defaults;

        setModel(defaults.model || "Claude Sonnet 4.5");
        setTestCaseCount(String(defaults.count || 10));
        setCoverage(defaults.coverage || "comprehensive");
      }
    } catch (error) {
      console.error("Error loading preferences:", error);
    }
  }

  useEffect(() => {
    fetchRequirements();
    loadUserPreferences();
  }, []);

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
          {/* Generation Type Toggle */}
          <div className="mb-6">
            <Label className="text-base font-medium mb-3 block">
              Generation Type
            </Label>
            <div className="flex items-center gap-2 p-1 bg-muted rounded-lg">
              <Button
                type="button"
                variant={generationType === "regular" ? "default" : "ghost"}
                size="sm"
                className="flex-1 h-10"
                onClick={() => setGenerationType("regular")}
                disabled={loading}
              >
                <FlaskConical className="h-4 w-4 mr-2" />
                Regular Test Cases
              </Button>
              <Button
                type="button"
                variant={
                  generationType === "cross-platform" ? "default" : "ghost"
                }
                size="sm"
                className="flex-1 h-10"
                onClick={() => setGenerationType("cross-platform")}
                disabled={loading}
              >
                <Layers className="h-4 w-4 mr-2" />
                Cross-Platform Testing
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {generationType === "regular"
                ? "Generate traditional test cases for specific requirements"
                : "Generate test cases optimized for multiple platforms and frameworks"}
            </p>
          </div>

          {/* Regular Test Case Generation Form */}
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
                    disabled={loading}
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
                    disabled={loading}
                    className="h-10"
                  />
                </div>
              </div>

              {/* Requirements Section */}
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
                    disabled={loading}
                  >
                    Quick Entry
                  </Button>
                  <Button
                    type="button"
                    variant={mode === "saved" ? "default" : "ghost"}
                    size="sm"
                    className="flex-1 h-8"
                    onClick={() => switchMode("saved")}
                    disabled={loading}
                  >
                    {savedRequirements.length > 0
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
                      placeholder="Describe what you want to test. Be as detailed as possible.

Example:
- User login functionality
- Must support email and password
- Password must be at least 8 characters
- Should show error messages for invalid credentials
- Remember me functionality
- Password reset via email"
                      value={customRequirements}
                      onChange={(e) => setCustomRequirements(e.target.value)}
                      disabled={loading}
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
                              💡 Want to save this for later?
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
                    {fetchingRequirements ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        <span className="ml-2 text-sm text-muted-foreground">
                          Loading requirements...
                        </span>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-2">
                          <Label className="text-sm flex-1">
                            {savedRequirements.length > 0
                              ? "Select a saved requirement"
                              : "Example requirements (create your own to save them)"}
                            <span className="text-destructive">*</span>
                          </Label>
                        </div>

                        <Select
                          value={selectedRequirement}
                          onValueChange={setSelectedRequirement}
                          disabled={loading}
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
                                      savedRequirements.length > 0
                                        ? "bg-blue-500"
                                        : "bg-gray-400"
                                    }`}
                                  ></div>
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
                                  {selectedReqData.title ||
                                    selectedReqData.label}
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
                                disabled={loading}
                              >
                                ✏️ Customize
                              </Button>
                            </div>
                            <div className="p-3">
                              <pre className="text-sm whitespace-pre-wrap font-mono text-muted-foreground">
                                {savedRequirementsText}
                              </pre>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Project Selection */}
              <div className="mt-4 space-y-3 border rounded-lg p-4 bg-muted/30">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-medium">Project</Label>
                    <p className="text-xs text-muted-foreground">
                      Optional, but recommended for organizing generations and
                      linking assets.
                    </p>
                  </div>
                </div>

                <ProjectSelect
                  value={selectedProject || undefined}
                  disabled={loading}
                  onSelect={(project) => {
                    setSelectedProject(project?.id ?? "");
                    setSelectedProject(project?.id ?? "");
                  }}
                />
              </div>

              {/* Template Selection */}
              <div className="mt-4 space-y-3 border rounded-lg p-4 bg-muted/30">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex-1">
                    <TemplateSelect
                      value={selectedTemplate?.id}
                      onSelect={handleTemplateSelect}
                      disabled={loading}
                    />
                  </div>

                  <QuickTemplateSave
                    currentSettings={{
                      model,
                      testCaseCount: parseInt(testCaseCount, 10) || 10,
                      coverage,
                    }}
                    onTemplateSaved={() => {
                      toast.success("Template saved from current settings");
                    }}
                  ></QuickTemplateSave>
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
                <>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* AI Model */}
                    <div className="space-y-2">
                      <Label htmlFor="model">AI Model</Label>
                      <Select
                        name="model"
                        value={model}
                        onValueChange={setModel}
                        disabled={loading}
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
                      <Label htmlFor="testCaseCount">
                        Number of Test Cases
                      </Label>
                      <Select
                        name="testCaseCount"
                        value={testCaseCount}
                        onValueChange={setTestCaseCount}
                        disabled={loading}
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
                    <div className="space-y-2">
                      <Label htmlFor="coverage">Coverage Level</Label>
                      <Select
                        name="coverage"
                        value={coverage}
                        onValueChange={(value) =>
                          setCoverage(
                            value as "standard" | "comprehensive" | "exhaustive"
                          )
                        }
                        disabled={loading}
                      >
                        <SelectTrigger className="h-10">
                          <SelectValue placeholder="Select coverage" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="standard">Standard</SelectItem>
                          <SelectItem value="comprehensive">
                            Comprehensive
                          </SelectItem>
                          <SelectItem value="exhaustive">Exhaustive</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </>
              )}

              <Button type="submit" className="w-full h-11" disabled={loading}>
                {loading ? (
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

          {/* Cross-Platform Test Generation Form */}
          {generationType === "cross-platform" && (
            <form onSubmit={handleCrossPlatformSubmit} className="space-y-6">
              <div className="space-y-3">
                <Label htmlFor="requirement" className="text-base font-medium">
                  Requirement Description *
                </Label>
                <textarea
                  id="requirement"
                  name="requirement"
                  className="w-full min-h-[120px] p-3 text-sm border rounded-md resize-y focus-visible:ring-2 focus-visible:ring-primary"
                  placeholder="Describe the requirement you want to test across platforms.

Example:
User authentication functionality that works consistently across web and mobile platforms, including login, logout, password reset, and session management."
                  disabled={loading}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Describe what functionality you want to test across multiple
                  platforms.
                </p>
              </div>

              {/* Template Selection for Cross-Platform */}
              <div className="border rounded-lg p-4 bg-muted/30 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex-1">
                    <Label className="text-sm font-medium mb-2 block">
                      Template (Optional)
                    </Label>
                    <TemplateSelect
                      value={crossPlatformTemplate?.id}
                      onSelect={handleCrossPlatformTemplateSelect}
                      disabled={loading}
                    />
                  </div>
                  <QuickTemplateSave
                    currentSettings={{
                      model: crossPlatformModel,
                      testCaseCount: parseInt(crossPlatformTestCount, 10) || 10,
                      coverage: crossPlatformCoverage,
                    }}
                    onTemplateSaved={() => {
                      toast.success("Cross-platform template saved");
                    }}
                  >
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="whitespace-nowrap mt-6"
                      disabled={loading}
                    >
                      <Save className="h-4 w-4 mr-2" />
                      Save settings
                    </Button>
                  </QuickTemplateSave>
                </div>

                {crossPlatformTemplate && (
                  <p className="text-xs text-muted-foreground">
                    Template{" "}
                    <span className="font-medium">
                      &quot;{crossPlatformTemplate.name}&quot;
                    </span>{" "}
                    applied to all platforms.
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="crossPlatformModel">AI Model</Label>
                  <Select
                    name="model"
                    value={model}
                    onValueChange={setModel}
                    disabled={loading}
                  >
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder="Claude Sonnet 4.5" />
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
                  <Label htmlFor="crossPlatformTestCount">
                    Test Cases per Platform
                  </Label>
                  <Select
                    name="testCaseCount"
                    value={testCaseCount}
                    onValueChange={setTestCaseCount}
                    disabled={loading}
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
                  <p className="text-xs text-muted-foreground">
                    Generate this many tests for each platform
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="crossPlatformCoverage">Coverage Level</Label>
                  <Select
                    name="coverage"
                    value={coverage}
                    onValueChange={(value) =>
                      setCoverage(
                        value as "standard" | "comprehensive" | "exhaustive"
                      )
                    }
                    disabled={loading}
                  >
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder="Select coverage" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="standard">Standard</SelectItem>
                      <SelectItem value="comprehensive">
                        Comprehensive
                      </SelectItem>
                      <SelectItem value="exhaustive">Exhaustive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Platform Selection */}
              <div className="space-y-4">
                <Label className="text-base font-medium">
                  Target Platforms *
                </Label>
                <p className="text-sm text-muted-foreground">
                  Select the platforms you want to test and choose the specific
                  framework for each.
                </p>

                <div className="grid gap-4">
                  {platformOptions.map((platform) => {
                    const Icon = platform.icon;
                    const isSelected = selectedPlatforms.includes(platform.id);

                    return (
                      <div
                        key={platform.id}
                        className={`border rounded-lg p-4 transition-all ${
                          isSelected
                            ? "border-primary bg-primary/5"
                            : "border-border"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <Checkbox
                            id={platform.id}
                            checked={isSelected}
                            onCheckedChange={() => togglePlatform(platform.id)}
                            disabled={loading}
                            className="mt-1"
                          />
                          <div className="flex-1 space-y-3">
                            <div className="flex items-center gap-3">
                              <Icon className="h-5 w-5 text-muted-foreground" />
                              <div>
                                <Label
                                  htmlFor={platform.id}
                                  className="text-sm font-medium cursor-pointer"
                                >
                                  {platform.name}
                                </Label>
                                <p className="text-xs text-muted-foreground">
                                  {platform.description}
                                </p>
                              </div>
                            </div>

                            {isSelected && (
                              <div className="space-y-2">
                                <Label className="text-sm">
                                  Framework/Technology
                                </Label>
                                <Select
                                  value={selectedFrameworks[platform.id] || ""}
                                  onValueChange={(value) =>
                                    setFrameworkForPlatform(platform.id, value)
                                  }
                                  disabled={loading}
                                >
                                  <SelectTrigger className="h-9">
                                    <SelectValue
                                      placeholder={`Select ${platform.name.toLowerCase()} framework`}
                                    />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {frameworkOptions[
                                      platform.id as keyof typeof frameworkOptions
                                    ]?.map((framework) => (
                                      <SelectItem
                                        key={framework}
                                        value={framework}
                                      >
                                        {framework}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
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

              <Button
                type="submit"
                className="w-full h-11"
                disabled={loading || selectedPlatforms.length === 0}
              >
                {loading ? (
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
          )}
        </CardContent>
      </Card>
      <div className="h-2" />
    </div>
  );
}
