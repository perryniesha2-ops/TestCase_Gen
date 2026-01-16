"use client";

import React, { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth/auth-context";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Play,
  Plus,
  FileText,
  BarChart3,
  Clock,
  AlertTriangle,
  CheckCircle2,
  CalendarIcon,
  FolderOpen,
  Code2,
  Loader2,
} from "lucide-react";

import type { TestSuite, SuiteType, Project } from "@/types/test-cases";

import { TestSessionExecution } from "./testsessionexecution";
import { TestSuiteDetailsDialog } from "./dialogs/testSuiteDetailsDialog";
import { SuiteReports } from "./suitesreport";
import { ExecutionHistory } from "./executionhistory";
import { TestSuiteTable } from "./test-suite-table";
import { TestSuiteSheet } from "./test-suite-sheet";

interface FormData {
  name: string;
  description: string;
  suite_type: SuiteType;
  planned_start_date: string;
  planned_end_date: string;
  project_id: string;
}

type SuiteEditForm = {
  name: string;
  status: string;
  suite_type: SuiteType;
};

export function TestSuitesPage() {
  const { user } = useAuth();
  const [testSuites, setTestSuites] = useState<TestSuite[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterProject, setFilterProject] = useState<string>("all");

  const [projects, setProjects] = useState<Project[]>([]);

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedSuite, setSelectedSuite] = useState<TestSuite | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [activeTab, setActiveTab] = useState("suites");

  const [executingSuite, setExecutingSuite] = useState<TestSuite | null>(null);
  const [showExecutionDialog, setShowExecutionDialog] = useState(false);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerSuite, setDrawerSuite] = useState<TestSuite | null>(null);

  const [editingSuite, setEditingSuite] = useState<TestSuite | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editSaving, setEditSaving] = useState(false);

  const [formData, setFormData] = useState<FormData>({
    name: "",
    description: "",
    suite_type: "manual",
    planned_start_date: "",
    planned_end_date: "",
    project_id: "",
  });

  const [suiteEditForm, setSuiteEditForm] = useState<SuiteEditForm>({
    name: "",
    status: "active",
    suite_type: "manual",
  });

  // ============================
  // New: suites overview fetch via API (reduced DB calls)
  // ============================
  async function refreshSuites() {
    try {
      setLoading(true);

      const res = await fetch("/api/suites/overview", {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
      });

      const raw = await res.text().catch(() => "");
      let payload: any = null;
      try {
        payload = raw ? JSON.parse(raw) : null;
      } catch {}

      if (res.status === 401) {
        // central auth failure handling for this page
        toast.error("Please log in again.");
        setTestSuites([]);
        return;
      }

      if (!res.ok) {
        throw new Error(payload?.error ?? `Failed (${res.status})`);
      }

      setTestSuites((payload?.suites ?? []) as TestSuite[]);
    } catch (error: any) {
      console.error("Error fetching test suites:", error);
      toast.error(error?.message ?? "Failed to load test suites");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refreshSuites();
    void fetchProjects();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep drawer suite updated if list refreshes
  useEffect(() => {
    if (!drawerSuite) return;
    const updated = testSuites.find((s) => s.id === drawerSuite.id);
    if (updated) setDrawerSuite(updated);
  }, [testSuites, drawerSuite?.id]);

  function openSuiteDrawer(suite: TestSuite) {
    setDrawerSuite(suite);
    setDrawerOpen(true);
  }

  // ============================
  // Projects (can remain Supabase, separate optimization later)
  // ============================
  async function fetchProjects() {
    if (!user) return;
    try {
      const supabase = createClient();

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

  // ============================
  // Create suite (kept as-is; you can later convert to an API route)
  // ============================
  async function createTestSuite() {
    if (!user) {
      toast.error("Please log in again.");
      return;
    }
    try {
      const supabase = createClient();

      const { data, error } = await supabase
        .from("test_suites")
        .insert({
          user_id: user.id,
          name: formData.name,
          description: formData.description,
          suite_type: formData.suite_type,
          planned_start_date: formData.planned_start_date || null,
          planned_end_date: formData.planned_end_date || null,
          project_id: formData.project_id || null,
        })
        .select()
        .single();

      if (error) throw error;

      // You can either optimistic-add or just refresh.
      // Refresh is safer since overview adds execution_stats/test_case_count.
      setShowCreateDialog(false);
      resetForm();
      toast.success("Test suite created successfully");
      await refreshSuites();
    } catch (error) {
      console.error("Error creating test suite:", error);
      toast.error("Failed to create test suite");
    }
  }

  async function deleteTestSuite(suiteId: string) {
    const ok = window.confirm(
      "Delete this test suite? Executions will be kept in history."
    );
    if (!ok) return;

    const res = await fetch(`/api/suites/${suiteId}/delete`, {
      method: "DELETE",
    });

    const raw = await res.text().catch(() => "");
    let payload: any = null;
    try {
      payload = raw ? JSON.parse(raw) : null;
    } catch {}

    if (!res.ok) {
      console.error("Delete suite failed:", res.status, payload ?? raw);
      throw new Error(
        payload?.error ? `${payload.error}` : `Delete failed (${res.status})`
      );
    }

    // Local removal is fine; refresh is optional
    setTestSuites((prev) => prev.filter((s) => s.id !== suiteId));
    toast.success("Test suite deleted");
  }

  function resetForm() {
    setFormData({
      name: "",
      description: "",
      suite_type: "manual",
      planned_start_date: "",
      planned_end_date: "",
      project_id: "",
    });
  }

  function handleExecutionComplete() {
    setShowExecutionDialog(false);
    setExecutingSuite(null);
    void refreshSuites();
  }

  function startSuiteExecution(suite: TestSuite) {
    setExecutingSuite(suite);
    setShowExecutionDialog(true);
  }

  // ============================
  // Helpers (keep your existing UI stable)
  // ============================
  function getSuiteTypeColor(type: string) {
    switch (type) {
      case "regression":
        return "bg-blue-500 text-white";
      case "smoke":
        return "bg-green-500 text-white";
      case "integration":
        return "bg-purple-500 text-white";
      case "automated":
        return "bg-green-500 text-white";
      case "partial":
        return "bg-orange-500 text-white";
      default:
        return "bg-gray-500 text-white";
    }
  }

  function getStatusBadge(status: string) {
    switch (status) {
      case "active":
        return (
          <Badge variant="default" className="bg-green-500">
            Active
          </Badge>
        );
      case "completed":
        return <Badge variant="secondary">Completed</Badge>;
      case "archived":
        return <Badge variant="outline">Archived</Badge>;
      default:
        return <Badge variant="outline">Draft</Badge>;
    }
  }

  function getStatusIcon(status: string) {
    if (status === "active")
      return <Clock className="h-4 w-4 text-green-500" />;
    if (status === "completed")
      return <CheckCircle2 className="h-4 w-4 text-blue-500" />;
    return <AlertTriangle className="h-4 w-4 text-gray-400" />;
  }

  function getProjectColor(color: string): string {
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

  function getDisplaySuiteType(suite: TestSuite) {
    if (suite.suite_type !== "manual") return suite.suite_type;
    return "manual";
  }

  // Filter suites
  const filteredSuites = testSuites.filter((suite) => {
    const s = searchTerm.toLowerCase();
    const matchesSearch =
      suite.name.toLowerCase().includes(s) ||
      (suite.description ?? "").toLowerCase().includes(s);

    const matchesType = filterType === "all" || suite.suite_type === filterType;

    const matchesProject =
      filterProject === "all" ||
      suite.project_id === filterProject ||
      (filterProject === "none" && !suite.project_id);

    return matchesSearch && matchesType && matchesProject;
  });

  function openEditSuite(suite: TestSuite) {
    setEditingSuite(suite);
    setSuiteEditForm({
      name: suite.name ?? "",
      status: suite.status ?? "active",
      suite_type: suite.suite_type ?? "manual",
    });
    setEditOpen(true);
  }

  async function updateSuiteDetails() {
    if (!editingSuite) return;

    setEditSaving(true);
    try {
      const supabase = createClient();

      const { error } = await supabase
        .from("test_suites")
        .update({
          name: suiteEditForm.name.trim(),
          status: suiteEditForm.status,
          suite_type: suiteEditForm.suite_type,
          updated_at: new Date().toISOString(),
        })
        .eq("id", editingSuite.id);

      if (error) throw error;

      toast.success("Suite updated");
      setEditOpen(false);
      setEditingSuite(null);

      await refreshSuites();
    } catch (err) {
      console.error("Error updating suite:", err);
      toast.error("Failed to update suite");
    } finally {
      setEditSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div />
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => void refreshSuites()}>
            Refresh
          </Button>
          <Button onClick={() => setShowCreateDialog(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            New Test Suite
          </Button>
        </div>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-6"
      >
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="suites" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Test Suites ({testSuites.length})
          </TabsTrigger>

          <TabsTrigger value="history" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Execution History
          </TabsTrigger>

          <TabsTrigger value="reports" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Reports &amp; Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="suites">
          {loading ? (
            <div className="flex items-center justify-center py-10 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              Loading suites…
            </div>
          ) : (
            <>
              <TestSuiteTable
                suites={filteredSuites}
                searchTerm={searchTerm}
                filterType={filterType}
                onCreateSuite={() => setShowCreateDialog(true)}
                onOpenDetails={(suite) => openSuiteDrawer(suite)}
                getStatusIcon={getStatusIcon}
                getStatusBadge={getStatusBadge}
                getSuiteTypeColor={getSuiteTypeColor}
                getDisplaySuiteType={getDisplaySuiteType}
                getProjectColor={getProjectColor}
              />
              <div className="h-2" />
            </>
          )}
        </TabsContent>

        <TabsContent value="reports">
          <SuiteReports showAllSuites={true} />
        </TabsContent>

        <TabsContent value="history">
          <ExecutionHistory />
        </TabsContent>
      </Tabs>

      {/* Create Test Suite Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Test Suite</DialogTitle>
            <DialogDescription>
              Organize test cases into suites for better test management.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Suite Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="e.g., User Authentication Tests"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                placeholder="Brief description of what this suite tests"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="suite_type">Suite Type</Label>
              <Select
                value={formData.suite_type}
                onValueChange={(value: SuiteType) =>
                  setFormData((prev) => ({ ...prev, suite_type: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">Manual Testing</SelectItem>
                  <SelectItem value="regression">Regression Testing</SelectItem>
                  <SelectItem value="smoke">Smoke Testing</SelectItem>
                  <SelectItem value="integration">
                    Integration Testing
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="project">Project (Optional)</Label>
              <Select
                value={formData.project_id || "none"}
                onValueChange={(value) =>
                  setFormData((prev) => ({
                    ...prev,
                    project_id: value === "none" ? "" : value,
                  }))
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="planned_start_date">Planned Start</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={
                        "w-full justify-start text-left font-normal" +
                        (!formData.planned_start_date
                          ? " text-muted-foreground"
                          : "")
                      }
                      id="planned_start_date"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.planned_start_date ? (
                        new Date(
                          formData.planned_start_date
                        ).toLocaleDateString()
                      ) : (
                        <span>Pick a date</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={
                        formData.planned_start_date
                          ? new Date(formData.planned_start_date)
                          : undefined
                      }
                      onSelect={(date) =>
                        setFormData((prev) => ({
                          ...prev,
                          planned_start_date: date ? date.toISOString() : "",
                        }))
                      }
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label htmlFor="planned_end_date">Planned End</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={
                        "w-full justify-start text-left font-normal" +
                        (!formData.planned_end_date
                          ? " text-muted-foreground"
                          : "")
                      }
                      id="planned_end_date"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.planned_end_date ? (
                        new Date(formData.planned_end_date).toLocaleDateString()
                      ) : (
                        <span>Pick a date</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={
                        formData.planned_end_date
                          ? new Date(formData.planned_end_date)
                          : undefined
                      }
                      onSelect={(date) =>
                        setFormData((prev) => ({
                          ...prev,
                          planned_end_date: date ? date.toISOString() : "",
                        }))
                      }
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCreateDialog(false)}
            >
              Cancel
            </Button>
            <Button onClick={createTestSuite} disabled={!formData.name}>
              Create Suite
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Test Suite Details Dialog */}
      {selectedSuite && (
        <TestSuiteDetailsDialog
          suite={selectedSuite}
          open={showDetailsDialog}
          onOpenChange={setShowDetailsDialog}
          onSuiteUpdated={refreshSuites}
        />
      )}

      {/* Test Session Execution Dialog */}
      {executingSuite && (
        <TestSessionExecution
          suite={executingSuite}
          open={showExecutionDialog}
          onOpenChange={setShowExecutionDialog}
          onSessionComplete={handleExecutionComplete}
        />
      )}

      {/* Edit dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Edit Test Suite</DialogTitle>
            <DialogDescription>
              Update suite name, status, and type.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Suite Name</Label>
              <Input
                id="edit-name"
                value={suiteEditForm.name}
                onChange={(e) =>
                  setSuiteEditForm((p) => ({ ...p, name: e.target.value }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={suiteEditForm.status}
                onValueChange={(v) =>
                  setSuiteEditForm((p) => ({ ...p, status: v }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Suite Type</Label>
              <Select
                value={suiteEditForm.suite_type}
                onValueChange={(v: SuiteType) =>
                  setSuiteEditForm((p) => ({ ...p, suite_type: v }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">Manual</SelectItem>
                  <SelectItem value="regression">Regression</SelectItem>
                  <SelectItem value="smoke">Smoke</SelectItem>
                  <SelectItem value="integration">Integration</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditOpen(false)}
              disabled={editSaving}
            >
              Cancel
            </Button>
            <Button
              onClick={updateSuiteDetails}
              disabled={editSaving || !suiteEditForm.name.trim()}
              className="gap-2"
            >
              {editSaving && <Loader2 className="h-4 w-4 animate-spin" />}
              Save changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Drawer */}
      <TestSuiteSheet
        open={drawerOpen}
        onOpenChange={(open) => {
          setDrawerOpen(open);
          if (!open) setDrawerSuite(null);
        }}
        suite={drawerSuite}
        getStatusBadge={getStatusBadge}
        getSuiteTypeColor={getSuiteTypeColor}
        getDisplaySuiteType={getDisplaySuiteType}
        onRun={(suite) => startSuiteExecution(suite)}
        onManage={(suite) => {
          setSelectedSuite(suite);
          setShowDetailsDialog(true);
        }}
        onEdit={(suite) => openEditSuite(suite)}
        onDelete={async (suite) => {
          await deleteTestSuite(suite.id);
          setDrawerOpen(false);
          setDrawerSuite(null);
        }}
      />
    </div>
  );
}
