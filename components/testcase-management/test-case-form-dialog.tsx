// app/pages/test-cases/components/test-case-form-dialog.tsx

"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Loader2, Save, X, Plus, Trash2, FolderOpen } from "lucide-react"
import type { TestCase, TestCaseForm, TestStep, Project } from "@/types/test-cases"
import { testTypes } from "@/types/test-cases"

interface TestCaseFormDialogProps {
  open: boolean
  mode: "create" | "edit"
  testCase?: TestCase | null
  generationId?: string | null
  onClose: () => void
  onSuccess: () => void
}

export function TestCaseFormDialog({
  open,
  mode,
  testCase,
  generationId,
  onClose,
  onSuccess,
}: TestCaseFormDialogProps) {
  const [formData, setFormData] = useState<TestCaseForm>({
    title: "",
    description: "",
    test_type: "functional",
    priority: "medium",
    preconditions: "",
    test_steps: [{ step_number: 1, action: "", expected: "" }],
    expected_result: "",
    status: "draft",
    project_id: null,
  })
  const [saving, setSaving] = useState(false)
  const [projects, setProjects] = useState<Project[]>([])

  // Fetch projects on mount
  useEffect(() => {
    fetchProjects()
  }, [])

  async function fetchProjects() {
    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from("projects")
        .select("id, name, color, icon")
        .eq("user_id", user.id)
        .order("name")

      if (error) throw error
      setProjects(data || [])
    } catch (error) {
      console.error("Error fetching projects:", error)
    }
  }

  // Populate form when editing
  useEffect(() => {
    if (mode === "edit" && testCase && open) {
      console.log("📝 Editing test case:", testCase.title)
      console.log("🔍 Test type from DB:", testCase.test_type)
      console.log("📁 Project ID from DB:", testCase.project_id)
      
      // Normalize test_type to ensure it matches our options
      const testTypesList = testTypes as readonly string[]
      const normalizedTestType = testTypesList.includes(testCase.test_type) 
        ? testCase.test_type 
        : "functional"
      
      if (testCase.test_type !== normalizedTestType) {
        console.warn("⚠️ Test type normalized from", testCase.test_type, "to", normalizedTestType)
      }
      
      setFormData({
        title: testCase.title,
        description: testCase.description,
        test_type: normalizedTestType,
        priority: testCase.priority,
        preconditions: testCase.preconditions || "",
        test_steps: testCase.test_steps,
        expected_result: testCase.expected_result,
        status: testCase.status,
        project_id: testCase.project_id || null,
      })
      
      console.log("✅ Form populated with test_type:", normalizedTestType)
      console.log("✅ Form populated with project_id:", testCase.project_id || null)
    } else if (mode === "create" && open) {
      resetForm()
    }
  }, [mode, testCase, open])

  function resetForm() {
    setFormData({
      title: "",
      description: "",
      test_type: "functional",
      priority: "medium",
      preconditions: "",
      test_steps: [{ step_number: 1, action: "", expected: "" }],
      expected_result: "",
      status: "draft",
      project_id: null,
    })
  }

  function addTestStep() {
    setFormData((prev) => ({
      ...prev,
      test_steps: [
        ...prev.test_steps,
        {
          step_number: prev.test_steps.length + 1,
          action: "",
          expected: "",
        },
      ],
    }))
  }

  function removeTestStep(index: number) {
    setFormData((prev) => ({
      ...prev,
      test_steps: prev.test_steps
        .filter((_, i) => i !== index)
        .map((step, i) => ({ ...step, step_number: i + 1 })),
    }))
  }

  function updateTestStep(index: number, field: "action" | "expected", value: string) {
    setFormData((prev) => ({
      ...prev,
      test_steps: prev.test_steps.map((step, i) =>
        i === index ? { ...step, [field]: value } : step
      ),
    }))
  }

  async function handleSubmit() {
    setSaving(true)
    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        toast.error("Please log in to save test cases")
        return
      }

      if (mode === "create") {
        const { data, error } = await supabase
          .from("test_cases")
          .insert({
            user_id: user.id,
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
          .single()

        if (error) throw error
        toast.success("Test case created successfully")
      } else {
        // Edit mode
        if (!testCase) return

        console.log("💾 Saving test case with project_id:", formData.project_id)

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
          .eq("id", testCase.id)

        if (error) throw error
        
        console.log("✅ Test case updated successfully with project_id:", formData.project_id)
        toast.success("Test case updated successfully")
      }

      onSuccess()
      onClose()
      resetForm()
    } catch (error) {
      console.error("Error saving test case:", error)
      toast.error(`Failed to ${mode === "create" ? "create" : "update"} test case`)
    } finally {
      setSaving(false)
    }
  }

  function handleClose() {
    onClose()
    resetForm()
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        className="w-[95vw] sm:max-w-4xl lg:max-w-5xl max-h-[90vh] flex flex-col p-0"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader className="sticky top-0 z-10 bg-background p-6 border-b">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <DialogTitle className="flex items-center gap-3">
                {mode === "create" ? "Create New Test Case" : "Edit Test Case"}
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
              className="h-8 w-8 rounded-full"
              onClick={handleClose}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
          {/* Basic Information */}
          {/* Title row  */}
          <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                placeholder="Enter test case title"
                required
              />
            </div>

            {/* Dropdowns block  */}
<div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
  <div className="space-y-2">

              <Label htmlFor="test_type">Test Type</Label>
              <Select
                value={formData.test_type}
                onValueChange={(value) => setFormData((prev) => ({ ...prev, test_type: value }))}
              >
                <SelectTrigger>
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
                value={formData.priority}
                onValueChange={(value: "low" | "medium" | "high" | "critical") =>
                  setFormData((prev) => ({ ...prev, priority: value }))
                }
              >
                <SelectTrigger>
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
                value={formData.status}
                onValueChange={(value: "draft" | "active" | "archived") =>
                  setFormData((prev) => ({ ...prev, status: value }))
                }
              >
                <SelectTrigger>
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
                value={formData.project_id || "none"}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, project_id: value === "none" ? null : value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a project" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">
                    <span className="text-muted-foreground">No Project</span>
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
              value={formData.description}
              onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
              placeholder="Describe what this test case covers"
              rows={3}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="preconditions">Preconditions</Label>
            <Textarea
              id="preconditions"
              value={formData.preconditions}
              onChange={(e) => setFormData((prev) => ({ ...prev, preconditions: e.target.value }))}
              placeholder="Any prerequisites or setup required before running this test"
              rows={2}
            />
          </div>

          {/* Test Steps */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Test Steps *</Label>
              <Button type="button" variant="outline" size="sm" onClick={addTestStep}>
                <Plus className="h-4 w-4 mr-2" />
                Add Step
              </Button>
            </div>

            <div className="space-y-3">
              {formData.test_steps.map((step, index) => (
                <div key={step.step_number} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">Step {step.step_number}</span>
                    {formData.test_steps.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeTestStep(index)}
                        className="text-destructive"
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
                      onChange={(e) => updateTestStep(index, "action", e.target.value)}
                      placeholder="What action should be performed?"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`expected-${index}`}>Expected Result</Label>
                    <Input
                      id={`expected-${index}`}
                      value={step.expected}
                      onChange={(e) => updateTestStep(index, "expected", e.target.value)}
                      placeholder="What should happen after performing the action?"
                      required
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="expected_result">Overall Expected Result *</Label>
            <Textarea
              id="expected_result"
              value={formData.expected_result}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, expected_result: e.target.value }))
              }
              placeholder="What should be the final outcome of this test case?"
              rows={3}
              required
            />
          </div>
        </div>

        <DialogFooter className="flex-shrink-0 px-6 py-4 border-t">
          <Button type="button" variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={
              saving || !formData.title || !formData.description || !formData.expected_result
            }
          >
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
  )
}