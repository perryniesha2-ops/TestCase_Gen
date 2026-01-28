// components/testcase-management/dialogs/test-case-form-dialog.tsx
"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { Loader2, Save, X, Plus, Trash2, FolderOpen } from "lucide-react";

import type {
  TestCase,
  CrossPlatformTestCase,
  Project,
} from "@/types/test-cases";
import { testTypes } from "@/types/test-cases";

type CombinedTestCase = TestCase | CrossPlatformTestCase;

interface RegularFormData {
  title: string;
  description: string;
  test_type: string;
  priority: string;
  preconditions: string;
  test_steps: Array<{
    step_number: number;
    action: string;
    expected: string;
  }>;
  expected_result: string;
  status: string;
  project_id: string | null;
}

interface CrossPlatformFormData {
  title: string;
  description: string;
  platform: string;
  framework: string;
  priority: string;
  preconditions: string[];
  steps: string[];
  expected_results: string[];
  automation_hints: string[];
  status: string;
  project_id: string | null;
}

interface TestCaseFormDialogProps {
  open: boolean;
  mode: "create" | "edit";
  testCase?: CombinedTestCase | null;
  caseType?: "regular" | "cross-platform";
  generationId?: string | null;
  onClose: () => void;
  onSuccess: () => void;
}

function isRegularTestCase(tc: CombinedTestCase): tc is TestCase {
  return "test_steps" in tc && "test_type" in tc;
}

function isCrossPlatformTestCase(
  tc: CombinedTestCase,
): tc is CrossPlatformTestCase {
  return "platform" in tc && "framework" in tc;
}

export function TestCaseFormDialog({
  open,
  mode,
  testCase,
  caseType = "regular",
  generationId,
  onClose,
  onSuccess,
}: TestCaseFormDialogProps) {
  const [activeType, setActiveType] = useState<"regular" | "cross-platform">(
    caseType,
  );

  const [regularFormData, setRegularFormData] = useState<RegularFormData>({
    title: "",
    description: "",
    test_type: "functional",
    priority: "medium",
    preconditions: "",
    test_steps: [{ step_number: 1, action: "", expected: "" }],
    expected_result: "",
    status: "draft",
    project_id: null,
  });

  const [crossPlatformFormData, setCrossPlatformFormData] =
    useState<CrossPlatformFormData>({
      title: "",
      description: "",
      platform: "web",
      framework: "selenium",
      priority: "medium",
      preconditions: [],
      steps: [""],
      expected_results: [""],
      automation_hints: [],
      status: "pending",
      project_id: null,
    });

  const [saving, setSaving] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);

  // Fetch projects on mount
  useEffect(() => {
    void fetchProjects();
  }, []);

  // Populate form when editing / reset when creating
  useEffect(() => {
    if (!open) return;

    if (mode === "edit" && testCase) {
      if (isRegularTestCase(testCase)) {
        setActiveType("regular");
        const testTypesList = testTypes as readonly string[];
        const normalizedTestType = testTypesList.includes(testCase.test_type)
          ? testCase.test_type
          : "functional";

        setRegularFormData({
          title: testCase.title,
          description: testCase.description,
          test_type: normalizedTestType,
          priority: testCase.priority,
          preconditions: testCase.preconditions || "",
          test_steps: testCase.test_steps,
          expected_result: testCase.expected_result,
          status: testCase.status,
          project_id: testCase.project_id || null,
        });
      } else if (isCrossPlatformTestCase(testCase)) {
        setActiveType("cross-platform");
        setCrossPlatformFormData({
          title: testCase.title,
          description: testCase.description || "",
          platform: testCase.platform,
          framework: testCase.framework,
          priority: testCase.priority,
          preconditions: Array.isArray(testCase.preconditions)
            ? testCase.preconditions
            : testCase.preconditions
              ? [testCase.preconditions]
              : [],
          steps: testCase.steps || [""],
          expected_results: testCase.expected_results || [""],
          automation_hints: testCase.automation_hints || [],
          status: testCase.status,
          project_id: testCase.project_id || null,
        });
      }
      return;
    }

    if (mode === "create") {
      resetForm();
    }
  }, [mode, testCase, open]);

  async function fetchProjects() {
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("projects")
        .select("id, name, color, icon")
        .eq("user_id", user.id)
        .order("name");

      if (error) throw error;
      setProjects(data || []);
    } catch (error) {
      console.error("Error fetching projects:", error);
    }
  }

  function resetForm() {
    setRegularFormData({
      title: "",
      description: "",
      test_type: "functional",
      priority: "medium",
      preconditions: "",
      test_steps: [{ step_number: 1, action: "", expected: "" }],
      expected_result: "",
      status: "draft",
      project_id: null,
    });
    setCrossPlatformFormData({
      title: "",
      description: "",
      platform: "web",
      framework: "selenium",
      priority: "medium",
      preconditions: [],
      steps: [""],
      expected_results: [""],
      automation_hints: [],
      status: "pending",
      project_id: "",
    });
  }

  // Regular test case handlers
  function addTestStep() {
    setRegularFormData((prev) => ({
      ...prev,
      test_steps: [
        ...prev.test_steps,
        { step_number: prev.test_steps.length + 1, action: "", expected: "" },
      ],
    }));
  }

  function removeTestStep(index: number) {
    setRegularFormData((prev) => ({
      ...prev,
      test_steps: prev.test_steps
        .filter((_, i) => i !== index)
        .map((step, i) => ({ ...step, step_number: i + 1 })),
    }));
  }

  function updateTestStep(
    index: number,
    field: "action" | "expected",
    value: string,
  ) {
    setRegularFormData((prev) => ({
      ...prev,
      test_steps: prev.test_steps.map((step, i) =>
        i === index ? { ...step, [field]: value } : step,
      ),
    }));
  }

  // Cross-platform test case handlers
  function addCrossPlatformStep() {
    setCrossPlatformFormData((prev) => ({
      ...prev,
      steps: [...prev.steps, ""],
      expected_results: [...prev.expected_results, ""],
    }));
  }

  function removeCrossPlatformStep(index: number) {
    setCrossPlatformFormData((prev) => ({
      ...prev,
      steps: prev.steps.filter((_, i) => i !== index),
      expected_results: prev.expected_results.filter((_, i) => i !== index),
    }));
  }

  function updateCrossPlatformStep(index: number, value: string) {
    setCrossPlatformFormData((prev) => ({
      ...prev,
      steps: prev.steps.map((step, i) => (i === index ? value : step)),
    }));
  }

  function updateCrossPlatformExpectedResult(index: number, value: string) {
    setCrossPlatformFormData((prev) => ({
      ...prev,
      expected_results: prev.expected_results.map((result, i) =>
        i === index ? value : result,
      ),
    }));
  }

  function addPrecondition() {
    setCrossPlatformFormData((prev) => ({
      ...prev,
      preconditions: [...prev.preconditions, ""],
    }));
  }

  function removePrecondition(index: number) {
    setCrossPlatformFormData((prev) => ({
      ...prev,
      preconditions: prev.preconditions.filter((_, i) => i !== index),
    }));
  }

  function updatePrecondition(index: number, value: string) {
    setCrossPlatformFormData((prev) => ({
      ...prev,
      preconditions: prev.preconditions.map((p, i) =>
        i === index ? value : p,
      ),
    }));
  }

  function addAutomationHint() {
    setCrossPlatformFormData((prev) => ({
      ...prev,
      automation_hints: [...prev.automation_hints, ""],
    }));
  }

  function removeAutomationHint(index: number) {
    setCrossPlatformFormData((prev) => ({
      ...prev,
      automation_hints: prev.automation_hints.filter((_, i) => i !== index),
    }));
  }

  function updateAutomationHint(index: number, value: string) {
    setCrossPlatformFormData((prev) => ({
      ...prev,
      automation_hints: prev.automation_hints.map((h, i) =>
        i === index ? value : h,
      ),
    }));
  }

  async function handleSubmit() {
    setSaving(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        toast.error("Please log in to save test cases");
        return;
      }

      if (activeType === "regular") {
        await handleRegularSubmit(user.id, supabase);
      } else {
        await handleCrossPlatformSubmit(user.id, supabase);
      }
    } catch (error) {
      console.error("Error saving test case:", error);
      toast.error(
        `Failed to ${mode === "create" ? "create" : "update"} test case`,
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleRegularSubmit(userId: string, supabase: any) {
    const formData = regularFormData;

    if (
      !formData.title.trim() ||
      !formData.description.trim() ||
      !formData.expected_result.trim()
    ) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (!formData.test_steps?.length) {
      toast.error("Add at least one test step");
      return;
    }

    const hasIncompleteSteps = formData.test_steps.some(
      (s) => !s.action.trim() || !s.expected.trim(),
    );
    if (hasIncompleteSteps) {
      toast.error("Please complete all test steps");
      return;
    }

    if (mode === "create") {
      const { error } = await supabase
        .from("test_cases")
        .insert({
          user_id: userId,
          generation_id: generationId || null,
          title: formData.title,
          description: formData.description,
          test_type: formData.test_type,
          priority: formData.priority,
          preconditions: formData.preconditions || null,
          test_steps: formData.test_steps,
          expected_result: formData.expected_result,
          is_edge_case: false,
          status: formData.status,
          execution_status: "not_run",
          is_manual: true,
          project_id: formData.project_id,
        })
        .select()
        .single();

      if (error) throw error;
      toast.success("Test case created successfully");
    } else {
      if (!testCase || !isRegularTestCase(testCase)) return;

      const { error } = await supabase
        .from("test_cases")
        .update({
          title: formData.title,
          description: formData.description,
          test_type: formData.test_type,
          priority: formData.priority,
          preconditions: formData.preconditions || null,
          test_steps: formData.test_steps,
          expected_result: formData.expected_result,
          status: formData.status,
          project_id: formData.project_id,
          updated_at: new Date().toISOString(),
        })
        .eq("id", testCase.id);

      if (error) throw error;
      toast.success("Test case updated successfully");
    }

    onSuccess();
    onClose();
    resetForm();
  }

  async function handleCrossPlatformSubmit(userId: string, supabase: any) {
    const formData = crossPlatformFormData;

    if (!formData.title.trim() || !formData.description.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (!formData.steps?.length || formData.steps.some((s) => !s.trim())) {
      toast.error("Please complete all test steps");
      return;
    }

    if (mode === "edit" && testCase && isCrossPlatformTestCase(testCase)) {
      const { error } = await supabase
        .from("platform_test_cases")
        .update({
          title: formData.title,
          description: formData.description,
          platform: formData.platform,
          framework: formData.framework,
          priority: formData.priority,
          preconditions: formData.preconditions.filter((p) => p.trim()),
          steps: formData.steps,
          expected_results: formData.expected_results,
          automation_hints: formData.automation_hints.filter((h) => h.trim()),
          status: formData.status,
          updated_at: new Date().toISOString(),
        })
        .eq("id", testCase.id);

      if (error) throw error;
      toast.success("Cross-platform test case updated successfully");

      onSuccess();
      onClose();
      resetForm();
    } else {
      toast.error("Cannot create cross-platform test cases from this dialog");
    }
  }

  function handleClose() {
    onClose();
    resetForm();
  }

  const isRegularMode = activeType === "regular";

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        className="w-[95vw] sm:max-w-4xl lg:max-w-5xl max-h-[90vh] flex flex-col p-0"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader className="sticky top-0 z-10 bg-background p-6 border-b">
          <div className="flex items-start justify-between">
            <div className="space-y-2 min-w-0">
              <DialogTitle className="truncate">
                {mode === "create" ? "Create New Test Case" : "Edit Test Case"}
                {!isRegularMode && " (Cross-Platform)"}
              </DialogTitle>
              <DialogDescription>
                {mode === "create"
                  ? "Fill in the details below to create a new test case."
                  : "Update the test case details below."}
              </DialogDescription>
            </div>

            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full shrink-0"
              onClick={handleClose}
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
          {/* Regular Test Case Form */}
          {isRegularMode && (
            <>
              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={regularFormData.title}
                  onChange={(e) =>
                    setRegularFormData((prev) => ({
                      ...prev,
                      title: e.target.value,
                    }))
                  }
                  placeholder="Enter test case title"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                <div className="space-y-2">
                  <Label htmlFor="test_type">Test Type</Label>
                  <Select
                    value={regularFormData.test_type}
                    onValueChange={(value) =>
                      setRegularFormData((prev) => ({
                        ...prev,
                        test_type: value,
                      }))
                    }
                  >
                    <SelectTrigger id="test_type">
                      <SelectValue placeholder="Select test type" />
                    </SelectTrigger>
                    <SelectContent>
                      {testTypes.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type.charAt(0).toUpperCase() + type.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="priority">Priority</Label>
                  <Select
                    value={regularFormData.priority}
                    onValueChange={(value) =>
                      setRegularFormData((prev) => ({
                        ...prev,
                        priority: value,
                      }))
                    }
                  >
                    <SelectTrigger id="priority">
                      <SelectValue placeholder="Select priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={regularFormData.status}
                    onValueChange={(value) =>
                      setRegularFormData((prev) => ({ ...prev, status: value }))
                    }
                  >
                    <SelectTrigger id="status">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="archived">Archived</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="project">Project (Optional)</Label>
                  <Select
                    value={regularFormData.project_id || "none"}
                    onValueChange={(value) =>
                      setRegularFormData((prev) => ({
                        ...prev,
                        project_id: value === "none" ? null : value,
                      }))
                    }
                  >
                    <SelectTrigger id="project">
                      <SelectValue placeholder="Select a project" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">
                        <span className="text-muted-foreground">
                          No Project
                        </span>
                      </SelectItem>
                      {projects.map((project) => (
                        <SelectItem key={project.id} value={project.id}>
                          <div className="flex items-center gap-2">
                            <FolderOpen className="h-4 w-4" />
                            {project.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  value={regularFormData.description}
                  onChange={(e) =>
                    setRegularFormData((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  placeholder="Describe what this test case covers"
                  rows={3}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="preconditions">Preconditions</Label>
                <Textarea
                  id="preconditions"
                  value={regularFormData.preconditions}
                  onChange={(e) =>
                    setRegularFormData((prev) => ({
                      ...prev,
                      preconditions: e.target.value,
                    }))
                  }
                  placeholder="Any prerequisites or setup required before running this test"
                  rows={2}
                />
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <Label>Test Steps *</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addTestStep}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Step
                  </Button>
                </div>

                <div className="space-y-3">
                  {regularFormData.test_steps.map((step, index) => (
                    <div
                      key={step.step_number}
                      className="border rounded-lg p-4 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm">
                          Step {step.step_number}
                        </span>
                        {regularFormData.test_steps.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeTestStep(index)}
                            className="text-destructive"
                            aria-label="Remove step"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor={`action-${index}`}>Action</Label>
                        <Input
                          id={`action-${index}`}
                          value={step.action}
                          onChange={(e) =>
                            updateTestStep(index, "action", e.target.value)
                          }
                          placeholder="What action should be performed?"
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor={`expected-${index}`}>
                          Expected Result
                        </Label>
                        <Input
                          id={`expected-${index}`}
                          value={step.expected}
                          onChange={(e) =>
                            updateTestStep(index, "expected", e.target.value)
                          }
                          placeholder="What should happen after performing the action?"
                          required
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="expected_result">
                  Overall Expected Result *
                </Label>
                <Textarea
                  id="expected_result"
                  value={regularFormData.expected_result}
                  onChange={(e) =>
                    setRegularFormData((prev) => ({
                      ...prev,
                      expected_result: e.target.value,
                    }))
                  }
                  placeholder="What should be the final outcome of this test case?"
                  rows={3}
                  required
                />
              </div>
            </>
          )}

          {/* Cross-Platform Test Case Form */}
          {!isRegularMode && (
            <>
              <div className="space-y-2">
                <Label htmlFor="cp-title">Title *</Label>
                <Input
                  id="cp-title"
                  value={crossPlatformFormData.title}
                  onChange={(e) =>
                    setCrossPlatformFormData((prev) => ({
                      ...prev,
                      title: e.target.value,
                    }))
                  }
                  placeholder="Enter test case title"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                <div className="space-y-2">
                  <Label htmlFor="platform">Platform</Label>
                  <Select
                    value={crossPlatformFormData.platform}
                    onValueChange={(value) =>
                      setCrossPlatformFormData((prev) => ({
                        ...prev,
                        platform: value,
                      }))
                    }
                    disabled={mode === "edit"}
                  >
                    <SelectTrigger id="platform">
                      <SelectValue placeholder="Select platform" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="web">Web</SelectItem>
                      <SelectItem value="mobile">Mobile</SelectItem>
                      <SelectItem value="api">API</SelectItem>
                      <SelectItem value="accessibility">
                        Accessibility
                      </SelectItem>
                      <SelectItem value="performance">Performance</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="framework">Framework</Label>
                  <Input
                    id="framework"
                    value={crossPlatformFormData.framework}
                    onChange={(e) =>
                      setCrossPlatformFormData((prev) => ({
                        ...prev,
                        framework: e.target.value,
                      }))
                    }
                    placeholder="e.g., Selenium, Playwright"
                    disabled={mode === "edit"}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cp-priority">Priority</Label>
                  <Select
                    value={crossPlatformFormData.priority}
                    onValueChange={(value) =>
                      setCrossPlatformFormData((prev) => ({
                        ...prev,
                        priority: value,
                      }))
                    }
                  >
                    <SelectTrigger id="cp-priority">
                      <SelectValue placeholder="Select priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cp-project">Project (Optional)</Label>
                  <Select
                    value={crossPlatformFormData.project_id || "none"}
                    onValueChange={(value) =>
                      setCrossPlatformFormData((prev) => ({
                        ...prev,
                        project_id: value === "none" ? null : value,
                      }))
                    }
                  >
                    <SelectTrigger id="cp-project">
                      <SelectValue placeholder="Select a project" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">
                        <span className="text-muted-foreground">
                          No Project
                        </span>
                      </SelectItem>
                      {projects.map((project) => (
                        <SelectItem key={project.id} value={project.id}>
                          <div className="flex items-center gap-2">
                            <FolderOpen className="h-4 w-4" />
                            {project.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cp-status">Status</Label>
                  <Select
                    value={crossPlatformFormData.status}
                    onValueChange={(value) =>
                      setCrossPlatformFormData((prev) => ({
                        ...prev,
                        status: value,
                      }))
                    }
                  >
                    <SelectTrigger id="cp-status">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="cp-description">Description *</Label>
                <Textarea
                  id="cp-description"
                  value={crossPlatformFormData.description}
                  onChange={(e) =>
                    setCrossPlatformFormData((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  placeholder="Describe what this test case covers"
                  rows={3}
                  required
                />
              </div>

              {/* Preconditions */}
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <Label>Preconditions</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addPrecondition}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Precondition
                  </Button>
                </div>

                <div className="space-y-2">
                  {crossPlatformFormData.preconditions.map((precond, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        value={precond}
                        onChange={(e) =>
                          updatePrecondition(index, e.target.value)
                        }
                        placeholder="Enter precondition"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removePrecondition(index)}
                        className="text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Test Steps */}
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <Label>Test Steps *</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addCrossPlatformStep}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Step
                  </Button>
                </div>

                <div className="space-y-3">
                  {crossPlatformFormData.steps.map((step, index) => (
                    <div
                      key={index}
                      className="border rounded-lg p-4 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm">
                          Step {index + 1}
                        </span>
                        {crossPlatformFormData.steps.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeCrossPlatformStep(index)}
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor={`cp-step-${index}`}>Step Action</Label>
                        <Input
                          id={`cp-step-${index}`}
                          value={step}
                          onChange={(e) =>
                            updateCrossPlatformStep(index, e.target.value)
                          }
                          placeholder="What action should be performed?"
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor={`cp-expected-${index}`}>
                          Expected Result
                        </Label>
                        <Input
                          id={`cp-expected-${index}`}
                          value={
                            crossPlatformFormData.expected_results[index] || ""
                          }
                          onChange={(e) =>
                            updateCrossPlatformExpectedResult(
                              index,
                              e.target.value,
                            )
                          }
                          placeholder="What should happen?"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Automation Hints */}
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <Label>Automation Hints (Optional)</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addAutomationHint}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Hint
                  </Button>
                </div>

                <div className="space-y-2">
                  {crossPlatformFormData.automation_hints.map((hint, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        value={hint}
                        onChange={(e) =>
                          updateAutomationHint(index, e.target.value)
                        }
                        placeholder="Enter automation hint"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeAutomationHint(index)}
                        className="text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        <DialogFooter className="flex-shrink-0 px-6 py-4 border-t">
          <Button type="button" variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={saving}>
            {saving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            {mode === "create" ? "Create Test Case" : "Update Test Case"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
