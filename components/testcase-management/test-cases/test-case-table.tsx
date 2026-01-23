"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import {
  CheckCircle2,
  XCircle,
  Loader2,
  Monitor,
  Smartphone,
  Globe,
  Eye,
  Zap,
  FlaskConical,
  Layers,
  Clock,
} from "lucide-react";

import type { TestCase, CrossPlatformTestCase } from "@/types/test-cases";

import { TestCaseToolbar } from "./toolbars/TestCaseToolbar";
import { RegularTestCaseSection } from "./RegularTestCaseSection";
import { CrossPlatformTestCaseSection } from "./CrossPlatformTestCaseSection";

import { TestCaseFormDialog } from "./dialogs/test-case-form-dialog";
import { DeleteTestCaseDialog } from "./dialogs/delete-test-case-dialog";
import { TestCaseActionSheet } from "./test-case-action-sheet";
import { TestRunnerDialog } from "./dialogs/test-runner-dialog";

import { useBulkActions } from "@/hooks/useBulkActions";
import { useTestCaseData } from "@/hooks/useTestCaseData";
import { useExecutions } from "@/hooks/useExecutions";
import { ExportButton } from "@/components/testcase-management/export-button";

const platformIcons = {
  web: Monitor,
  mobile: Smartphone,
  api: Globe,
  accessibility: Eye,
  performance: Zap,
};

type CaseType = "regular" | "cross-platform";

export function TabbedTestCaseTable() {
  const searchParams = useSearchParams();
  const generationId = searchParams.get("generation");
  const sessionId = searchParams.get("session");

  // UI filters/pagination
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProject, setSelectedProject] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [crossPlatformCurrentPage, setCrossPlatformCurrentPage] = useState(1);

  // CRUD dialogs
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [editingTestCase, setEditingTestCase] = useState<TestCase | null>(null);
  const [deletingTestCase, setDeletingTestCase] = useState<TestCase | null>(
    null
  );

  // Action sheet
  const [showActionSheet, setShowActionSheet] = useState(false);
  const [actionSheetCase, setActionSheetCase] = useState<TestCase | null>(null);

  // Runner
  const [showRunnerDialog, setShowRunnerDialog] = useState(false);
  const [runnerCase, setRunnerCase] = useState<
    TestCase | CrossPlatformTestCase | null
  >(null);
  const [runnerCaseType, setRunnerCaseType] = useState<CaseType>("regular");
  const [updating, setUpdating] = useState<string | null>(null);

  // Data (NOW from overview route)
  const {
    loading,
    testCases,
    crossPlatformCases,
    projects,
    currentSession,
    executionByCaseId,
    refresh,
  } = useTestCaseData({
    generationId,
    sessionId,
    selectedProject,
  });

  // Executions write API (single source of writes)
  const {
    execution,
    setExecution,
    hydrateOne,
    toggleStep,
    saveProgress,
    saveResult,
    reset,
  } = useExecutions({ sessionId });

  // Seed execution statuses from overview route results
  useEffect(() => {
    if (loading) return;

    setExecution((prev) => {
      const next = { ...prev };

      for (const tc of [...testCases, ...crossPlatformCases]) {
        const status = executionByCaseId?.[tc.id]?.status ?? "not_run";

        next[tc.id] = {
          ...(next[tc.id] ?? { completedSteps: [], failedSteps: [] }),
          status,
          completedSteps: next[tc.id]?.completedSteps ?? [],
          failedSteps: next[tc.id]?.failedSteps ?? [],
        };
      }

      return next;
    });
  }, [loading, testCases, crossPlatformCases, executionByCaseId, setExecution]);

  // Bulk actions
  const crossPlatformBulkActions = useBulkActions(
    crossPlatformCases,
    refresh,
    "cross-platform"
  );
  const regularBulkActions = useBulkActions(testCases, refresh);

  const {
    selectedIds,
    toggleSelection,
    selectAll,
    deselectAll,
    bulkUpdate,
    bulkDelete,
    bulkAddToSuite,
    bulkExport,
  } = regularBulkActions;

  const getRelativeTime = useCallback((dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 60) return `${diffMins} mins ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  }, []);

  const itemsPerPage = 10;

  const filteredTestCases = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return testCases.filter(
      (tc) =>
        tc.title.toLowerCase().includes(term) ||
        tc.description.toLowerCase().includes(term)
    );
  }, [testCases, searchTerm]);

  const filteredCrossPlatformCases = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return crossPlatformCases.filter(
      (tc) =>
        tc.title.toLowerCase().includes(term) ||
        tc.description.toLowerCase().includes(term)
    );
  }, [crossPlatformCases, searchTerm]);

  const totalPages = Math.ceil(filteredTestCases.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedTestCases = filteredTestCases.slice(startIndex, endIndex);

  const crossPlatformTotalPages = Math.ceil(
    filteredCrossPlatformCases.length / itemsPerPage
  );
  const crossPlatformStartIndex = (crossPlatformCurrentPage - 1) * itemsPerPage;
  const crossPlatformEndIndex = crossPlatformStartIndex + itemsPerPage;
  const paginatedCrossPlatformCases = filteredCrossPlatformCases.slice(
    crossPlatformStartIndex,
    crossPlatformEndIndex
  );

  const selectedProjectName = selectedProject
    ? projects.find((p) => p.id === selectedProject)?.name ?? null
    : null;

  const getPriorityColor = useCallback((priority: string) => {
    switch (priority) {
      case "critical":
        return "bg-red-500 text-white";
      case "high":
        return "bg-orange-500 text-white";
      case "medium":
        return "bg-yellow-500 text-black";
      case "low":
        return "bg-blue-500 text-white";
      default:
        return "bg-gray-500 text-white";
    }
  }, []);

  const getProjectColor = useCallback((color: string): string => {
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
  }, []);

  const getApprovalStatusBadge = useCallback((approvalStatus?: string) => {
    const status = approvalStatus || "pending";
    switch (status) {
      case "pending":
        return (
          <Badge className="bg-amber-100 text-amber-800">
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        );
      case "approved":
        return (
          <Badge className="bg-green-100 text-green-800">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Approved
          </Badge>
        );
      case "rejected":
        return (
          <Badge className="bg-red-100 text-red-800">
            <XCircle className="h-3 w-3 mr-1" />
            Rejected
          </Badge>
        );
      default:
        return (
          <Badge className="bg-amber-100 text-amber-800">
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        );
    }
  }, []);

  // CRUD handlers
  const openCreate = useCallback(() => {
    setEditingTestCase(null);
    setShowCreateDialog(true);
  }, []);

  const openEdit = useCallback((tc: TestCase) => {
    setEditingTestCase(tc);
    setShowEditDialog(true);
  }, []);

  const openDelete = useCallback((tc: TestCase) => {
    setDeletingTestCase(tc);
    setShowDeleteDialog(true);
  }, []);

  const openActionSheet = useCallback((tc: TestCase) => {
    setActionSheetCase(tc);
    setShowActionSheet(true);
  }, []);

  const handleProjectChange = useCallback((projectId: string) => {
    setSelectedProject(projectId);
    setCurrentPage(1);
    setCrossPlatformCurrentPage(1);
  }, []);

  const updateTestCaseStatus = useCallback(
    async (testCaseId: string, newStatus: "draft" | "active" | "archived") => {
      setUpdating(testCaseId);
      try {
        // keep as-is (client update) OR move to API later
        const { createClient } = await import("@/lib/supabase/client");
        const supabase = createClient();
        const { error } = await supabase
          .from("test_cases")
          .update({ status: newStatus, updated_at: new Date().toISOString() })
          .eq("id", testCaseId);

        if (error) throw error;
        toast.success("Status updated");
        await refresh();
      } catch (e) {
        console.error("updateTestCaseStatus error:", e);
        toast.error("Failed to update status");
      } finally {
        setUpdating(null);
      }
    },
    [refresh]
  );

  const openRunner = useCallback(
    async (tc: TestCase | CrossPlatformTestCase, type: CaseType) => {
      setRunnerCase(tc);
      setRunnerCaseType(type);

      // Optional: hydrate detailed execution row right before showing runner
      // This gives notes, completed steps, etc. for this one test.
      try {
        await hydrateOne(tc.id);
      } catch (e) {
        console.warn("hydrateOne failed (non-fatal):", e);
      }

      setShowRunnerDialog(true);
    },
    [hydrateOne]
  );

  const runTestFromSheet = useCallback(
    (tc: TestCase) => {
      void openRunner(tc, "regular");
    },
    [openRunner]
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Session Info */}
      {currentSession && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-blue-900">
                {currentSession.name}
              </h3>
              <p className="text-blue-700 text-sm">
                Test Session • Environment: {currentSession.environment}
              </p>
            </div>
            <Badge
              variant={
                currentSession.status === "in_progress"
                  ? "default"
                  : "secondary"
              }
            >
              {currentSession.status === "in_progress" && (
                <Clock className="h-3 w-3 mr-1" />
              )}
              {currentSession.status}
            </Badge>
          </div>
        </div>
      )}

      <TestCaseToolbar
        searchTerm={searchTerm}
        onSearchTermChange={(v) => {
          setSearchTerm(v);
          setCurrentPage(1);
          setCrossPlatformCurrentPage(1);
        }}
        projects={projects}
        selectedProject={selectedProject}
        selectedProjectName={selectedProjectName}
        onProjectChange={handleProjectChange}
        onCreate={openCreate}
        exportButton={
          <ExportButton
            testCases={filteredTestCases}
            generationTitle="Test Cases"
          />
        }
        getProjectColor={getProjectColor}
      />

      <Tabs defaultValue="regular" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="regular" className="flex items-center gap-2">
            <FlaskConical className="h-4 w-4" />
            Regular Tests ({filteredTestCases.length})
          </TabsTrigger>
          <TabsTrigger
            value="cross-platform"
            className="flex items-center gap-2"
          >
            <Layers className="h-4 w-4" />
            Cross-Platform ({filteredCrossPlatformCases.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="regular" className="space-y-6">
          <RegularTestCaseSection
            testCases={testCases}
            paginated={paginatedTestCases}
            filteredCount={filteredTestCases.length}
            execution={execution}
            updating={updating}
            onOpenDetails={(tc) => void openRunner(tc, "regular")}
            onUpdateStatus={updateTestCaseStatus}
            selectedIds={selectedIds}
            selectAll={selectAll}
            deselectAll={deselectAll}
            toggleSelection={toggleSelection}
            onBulkUpdate={bulkUpdate}
            onBulkDelete={bulkDelete}
            onBulkAddToSuite={bulkAddToSuite}
            onBulkExport={bulkExport}
            currentPage={currentPage}
            totalPages={totalPages}
            startIndex={startIndex}
            endIndex={endIndex}
            onPrevPage={() => setCurrentPage((p) => Math.max(1, p - 1))}
            onNextPage={() =>
              setCurrentPage((p) => Math.min(totalPages, p + 1))
            }
            getPriorityColor={getPriorityColor}
            getProjectColor={getProjectColor}
            onOpenCreate={openCreate}
            onOpenActionSheet={openActionSheet}
            onRun={(tc) => void openRunner(tc, "regular")}
          />
        </TabsContent>

        <div className="h-2" />

        <TabsContent value="cross-platform" className="space-y-6">
          <CrossPlatformTestCaseSection
            cases={crossPlatformCases}
            paginated={paginatedCrossPlatformCases}
            filteredCount={filteredCrossPlatformCases.length}
            execution={execution}
            platformIcons={platformIcons}
            selectedIds={crossPlatformBulkActions.selectedIds}
            selectAll={crossPlatformBulkActions.selectAll}
            deselectAll={crossPlatformBulkActions.deselectAll}
            toggleSelection={crossPlatformBulkActions.toggleSelection}
            onBulkApprove={crossPlatformBulkActions.bulkApproveCrossPlatform}
            onBulkReject={crossPlatformBulkActions.bulkRejectCrossPlatform}
            onBulkUpdate={crossPlatformBulkActions.bulkUpdateCrossPlatform}
            onBulkDelete={crossPlatformBulkActions.bulkDeleteCrossPlatform}
            currentPage={crossPlatformCurrentPage}
            totalPages={crossPlatformTotalPages}
            startIndex={crossPlatformStartIndex}
            endIndex={crossPlatformEndIndex}
            onPrevPage={() =>
              setCrossPlatformCurrentPage((p) => Math.max(1, p - 1))
            }
            onNextPage={() =>
              setCrossPlatformCurrentPage((p) =>
                Math.min(crossPlatformTotalPages, p + 1)
              )
            }
            getPriorityColor={getPriorityColor}
            getApprovalStatusBadge={getApprovalStatusBadge}
            getRelativeTime={getRelativeTime}
            onOpenDetails={(tc) => void openRunner(tc, "cross-platform")}
            onRun={(tc) => void openRunner(tc, "cross-platform")}
          />
        </TabsContent>

        <div className="h-2" />
      </Tabs>

      {/* Create/Edit */}
      <TestCaseFormDialog
        open={showCreateDialog || showEditDialog}
        mode={showCreateDialog ? "create" : "edit"}
        testCase={editingTestCase}
        generationId={generationId}
        onClose={() => {
          setShowCreateDialog(false);
          setShowEditDialog(false);
          setEditingTestCase(null);
        }}
        onSuccess={refresh}
      />

      {/* Runner */}
      {runnerCase && (
        <TestRunnerDialog
          open={showRunnerDialog}
          onOpenChange={(open) => {
            setShowRunnerDialog(open);
            if (!open) setRunnerCase(null);
          }}
          testCase={runnerCase}
          caseType={runnerCaseType}
          executionRow={execution[runnerCase.id]}
          onSaveProgress={saveProgress}
          onFinalize={saveResult}
          onReset={reset}
          onToggleStep={toggleStep}
        />
      )}

      {/* Delete */}
      <DeleteTestCaseDialog
        testCase={deletingTestCase}
        open={showDeleteDialog}
        onClose={() => {
          setShowDeleteDialog(false);
          setDeletingTestCase(null);
        }}
        onSuccess={() => {
          void refresh();
          if (deletingTestCase) {
            setExecution((prev) => {
              const next = { ...prev };
              delete next[deletingTestCase.id];
              return next;
            });
          }
        }}
      />

      {/* Action Sheet */}
      <TestCaseActionSheet
        testCase={actionSheetCase}
        open={showActionSheet}
        onOpenChange={setShowActionSheet}
        onEdit={openEdit}
        onDelete={openDelete}
        onViewDetails={() => {
          /* optional */
        }}
        onRunTest={runTestFromSheet}
        isAutomated={false}
      />
    </div>
  );
}
