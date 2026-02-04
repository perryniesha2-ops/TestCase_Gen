// components/testcase-management/TabbedTestCaseTable.tsx
"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { toast } from "sonner";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FlaskConical, Layers, Loader2 } from "lucide-react";

import type { TestCase, CrossPlatformTestCase } from "@/types/test-cases";

import { TestCaseToolbar } from "./toolbars/TestCaseToolbar";
import type { RunStatusFilter } from "./toolbars/TestCaseToolbar";
import { UnifiedTestCaseTable } from "./UnifiedTestCaseTable";
import { BulkActionsToolbar } from "./toolbars/BulkActionsToolbar";

import { TestCaseFormDialog } from "./dialogs/test-case-form-dialog";
import { DeleteTestCaseDialog } from "./dialogs/delete-test-case-dialog";
import { TestRunnerDialog } from "./dialogs/test-runner-dialog";

import { useBulkActions } from "@/hooks/useBulkActions";
import { useTestCaseData } from "@/hooks/useTestCaseData";
import { useExecutions } from "@/hooks/useExecutions";
import { ExportButton } from "@/components/testcase-management/export-button";
import { Badge } from "@/components/ui/badge";
import { Clock } from "lucide-react";

type CaseType = "regular" | "cross-platform";
type CombinedTestCase = (TestCase | CrossPlatformTestCase) & {
  _caseType?: "regular" | "cross-platform";
};

export function TabbedTestCaseTable() {
  const searchParams = useSearchParams();
  const generationId = searchParams.get("generation");
  const sessionId = searchParams.get("session");
  const router = useRouter();

  // UI filters/pagination
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProject, setSelectedProject] = useState("");

  const [runStatusFilter, setRunStatusFilter] = useState<RunStatusFilter[]>([]);

  const [currentPage, setCurrentPage] = useState(1);
  const [crossPlatformCurrentPage, setCrossPlatformCurrentPage] = useState(1);

  // CRUD dialogs
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [editingTestCase, setEditingTestCase] =
    useState<CombinedTestCase | null>(null);
  const [deletingTestCase, setDeletingTestCase] =
    useState<CombinedTestCase | null>(null);

  // Runner
  const [showRunnerDialog, setShowRunnerDialog] = useState(false);
  const [runnerCase, setRunnerCase] = useState<
    TestCase | CrossPlatformTestCase | null
  >(null);
  const [runnerCaseType, setRunnerCaseType] = useState<CaseType>("regular");
  const [updating, setUpdating] = useState<string | null>(null);

  // Data
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

  // Executions
  const {
    execution,
    setExecution,
    hydrateOne,
    toggleStep,
    saveProgress,
    saveResult,
    reset,
  } = useExecutions({ sessionId });

  // Seed execution statuses
  useEffect(() => {
    // Example URL: /test-cases?runStatus=failed,blocked
    const raw = searchParams.get("runStatus") ?? "";
    if (!raw) return;

    const allowed = new Set<RunStatusFilter>([
      "passed",
      "failed",
      "skipped",
      "blocked",
    ]);
    const parsed = raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .filter((s): s is RunStatusFilter => allowed.has(s as RunStatusFilter));

    if (parsed.length > 0) {
      setRunStatusFilter(parsed);
      setCurrentPage(1);
      setCrossPlatformCurrentPage(1);
    }
  }, [searchParams]);

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

  // Add _caseType to test cases
  const regularCasesWithType = useMemo(
    () => testCases.map((tc) => ({ ...tc, _caseType: "regular" as const })),
    [testCases],
  );

  const crossPlatformCasesWithType = useMemo(
    () =>
      crossPlatformCases.map((tc) => ({
        ...tc,
        _caseType: "cross-platform" as const,
      })),
    [crossPlatformCases],
  );

  // Unified bulk actions for both types
  const regularBulkActions = useBulkActions(regularCasesWithType, refresh);
  const crossPlatformBulkActions = useBulkActions(
    crossPlatformCasesWithType,
    refresh,
  );

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

  const getRunStatus = useCallback(
    (id: string) => {
      return (execution[id]?.status ?? "not_run") as string;
    },
    [execution],
  );

  const matchesRunStatusFilter = useCallback(
    (testCaseId: string) => {
      if (runStatusFilter.length === 0) return true;
      const status = getRunStatus(testCaseId);
      return runStatusFilter.includes(status as RunStatusFilter);
    },
    [getRunStatus, runStatusFilter],
  );

  const filteredTestCases = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return regularCasesWithType.filter((tc) => {
      const matchesText =
        tc.title.toLowerCase().includes(term) ||
        tc.description.toLowerCase().includes(term);

      if (!matchesText) return false;

      return matchesRunStatusFilter(tc.id);
    });
  }, [regularCasesWithType, searchTerm, matchesRunStatusFilter]);

  const filteredCrossPlatformCases = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return crossPlatformCasesWithType.filter((tc) => {
      const matchesText =
        tc.title.toLowerCase().includes(term) ||
        tc.description.toLowerCase().includes(term);

      if (!matchesText) return false;

      return matchesRunStatusFilter(tc.id);
    });
  }, [crossPlatformCasesWithType, searchTerm, matchesRunStatusFilter]);

  const totalPages = Math.ceil(filteredTestCases.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedTestCases = filteredTestCases.slice(startIndex, endIndex);

  const crossPlatformTotalPages = Math.ceil(
    filteredCrossPlatformCases.length / itemsPerPage,
  );
  const crossPlatformStartIndex = (crossPlatformCurrentPage - 1) * itemsPerPage;
  const crossPlatformEndIndex = crossPlatformStartIndex + itemsPerPage;
  const paginatedCrossPlatformCases = filteredCrossPlatformCases.slice(
    crossPlatformStartIndex,
    crossPlatformEndIndex,
  );

  const selectedProjectName = selectedProject
    ? (projects.find((p) => p.id === selectedProject)?.name ?? null)
    : null;

  const getPriorityColor = useCallback((priority: string) => {
    switch (priority) {
      case "critical":
        return "bg-red-500 text-white hover:bg-red-600";
      case "high":
        return "bg-orange-500 text-white hover:bg-orange-600";
      case "medium":
        return "bg-yellow-500 text-black hover:bg-yellow-600";
      case "low":
        return "bg-blue-500 text-white hover:bg-blue-600";
      default:
        return "bg-gray-500 text-white hover:bg-gray-600";
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

  // Metrics (unchanged — note these include statuses beyond the filter options)
  const regularMetrics = useMemo(() => {
    return {
      total: filteredTestCases.length,
      passed: filteredTestCases.filter(
        (tc) => execution[tc.id]?.status === "passed",
      ).length,
      failed: filteredTestCases.filter(
        (tc) => execution[tc.id]?.status === "failed",
      ).length,
      blocked: filteredTestCases.filter(
        (tc) => execution[tc.id]?.status === "blocked",
      ).length,
      in_progress: filteredTestCases.filter(
        (tc) => execution[tc.id]?.status === "in_progress",
      ).length,
      not_run: filteredTestCases.filter(
        (tc) => !execution[tc.id] || execution[tc.id]?.status === "not_run",
      ).length,
    };
  }, [filteredTestCases, execution]);

  const crossPlatformMetrics = useMemo(() => {
    return {
      total: filteredCrossPlatformCases.length,
      passed: filteredCrossPlatformCases.filter(
        (tc) => execution[tc.id]?.status === "passed",
      ).length,
      failed: filteredCrossPlatformCases.filter(
        (tc) => execution[tc.id]?.status === "failed",
      ).length,
      blocked: filteredCrossPlatformCases.filter(
        (tc) => execution[tc.id]?.status === "blocked",
      ).length,
      in_progress: filteredCrossPlatformCases.filter(
        (tc) => execution[tc.id]?.status === "in_progress",
      ).length,
      not_run: filteredCrossPlatformCases.filter(
        (tc) => !execution[tc.id] || execution[tc.id]?.status === "not_run",
      ).length,
    };
  }, [filteredCrossPlatformCases, execution]);

  // CRUD handlers
  const openRunner = useCallback(
    async (tc: TestCase | CrossPlatformTestCase, type: CaseType) => {
      setRunnerCase(tc);
      setRunnerCaseType(type);
      try {
        await hydrateOne(tc.id);
      } catch (e) {
        console.warn("hydrateOne failed (non-fatal):", e);
      }
      setShowRunnerDialog(true);
    },
    [hydrateOne],
  );

  const openCreate = useCallback(() => {
    setEditingTestCase(null);
    setShowCreateDialog(true);
  }, []);

  const openEdit = useCallback((tc: CombinedTestCase) => {
    setEditingTestCase(tc);
    setShowEditDialog(true);
  }, []);

  const openDelete = useCallback((tc: CombinedTestCase) => {
    setDeletingTestCase(tc);
    setShowDeleteDialog(true);
  }, []);

  const runTestFromSheet = useCallback(
    (tc: CombinedTestCase) => {
      const type =
        tc._caseType === "cross-platform" ? "cross-platform" : "regular";
      void openRunner(tc, type);
    },
    [openRunner],
  );

  const handleProjectChange = useCallback((projectId: string) => {
    setSelectedProject(projectId);
    setCurrentPage(1);
    setCrossPlatformCurrentPage(1);
  }, []);

  const updateTestCaseStatus = useCallback(
    async (testCaseId: string, newStatus: "draft" | "active" | "archived") => {
      setUpdating(testCaseId);
      try {
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
    [refresh],
  );

  const isRegularTestCase = (
    tc: CombinedTestCase,
  ): tc is TestCase & { _caseType?: "regular" } => {
    return tc._caseType === "regular" || !tc._caseType;
  };

  const isCrossPlatformTestCase = (
    tc: CombinedTestCase,
  ): tc is CrossPlatformTestCase & { _caseType: "cross-platform" } => {
    return tc._caseType === "cross-platform";
  };

  const handleViewDetails = useCallback(
    (tc: CombinedTestCase) => {
      router.push(`/test-cases/${tc.id}`);
    },
    [router],
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
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/50 dark:to-indigo-950/50 border border-blue-200 dark:border-blue-800 rounded-lg p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-blue-900 dark:text-blue-100">
                {currentSession.name}
              </h3>
              <p className="text-blue-700 dark:text-blue-300 text-sm">
                Test Session • Environment: {currentSession.environment}
              </p>
            </div>
            <Badge
              variant={
                currentSession.status === "in_progress"
                  ? "default"
                  : "secondary"
              }
              className="capitalize"
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
        runStatusFilter={runStatusFilter}
        onRunStatusFilterChange={(next) => {
          setRunStatusFilter(next);
          setCurrentPage(1);
          setCrossPlatformCurrentPage(1);
        }}
      />

      <Tabs defaultValue="regular" className="w-full">
        <TabsList className="grid w-full grid-cols-2 h-11">
          <TabsTrigger
            value="regular"
            className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            <FlaskConical className="h-4 w-4" />
            <span className="font-medium">Regular Tests</span>
            <Badge variant="secondary" className="ml-auto">
              {filteredTestCases.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger
            value="cross-platform"
            className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            <Layers className="h-4 w-4" />
            <span className="font-medium">Cross-Platform</span>
            <Badge variant="secondary" className="ml-auto">
              {filteredCrossPlatformCases.length}
            </Badge>
          </TabsTrigger>
        </TabsList>

        {/* Regular Tests Tab */}
        <TabsContent value="regular" className="space-y-4 mt-6">
          <BulkActionsToolbar
            selectedIds={regularBulkActions.selectedIds}
            allTestCases={regularCasesWithType}
            type="regular"
            onSelectAll={regularBulkActions.selectAll}
            onDeselectAll={regularBulkActions.deselectAll}
            onBulkUpdate={regularBulkActions.bulkUpdate}
            onBulkDelete={regularBulkActions.bulkDelete}
            onBulkAddToSuite={regularBulkActions.bulkAddToSuite}
            onBulkExport={regularBulkActions.bulkExport}
          />

          <UnifiedTestCaseTable
            testCases={filteredTestCases}
            paginated={paginatedTestCases}
            filteredCount={filteredTestCases.length}
            execution={execution}
            updating={updating}
            selectedIds={regularBulkActions.selectedIds}
            selectAll={regularBulkActions.selectAll}
            deselectAll={regularBulkActions.deselectAll}
            toggleSelection={regularBulkActions.toggleSelection}
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
            onOpenDetails={handleViewDetails}
            onOpenCreate={openCreate}
            onOpenActionSheet={handleViewDetails}
            onUpdateStatus={updateTestCaseStatus}
          />
        </TabsContent>

        {/* Cross-Platform Tests Tab */}
        <TabsContent value="cross-platform" className="space-y-4 mt-6">
          <BulkActionsToolbar
            selectedIds={crossPlatformBulkActions.selectedIds}
            allTestCases={crossPlatformCasesWithType}
            type="cross-platform"
            onSelectAll={crossPlatformBulkActions.selectAll}
            onDeselectAll={crossPlatformBulkActions.deselectAll}
            onBulkUpdate={crossPlatformBulkActions.bulkUpdate}
            onBulkDelete={crossPlatformBulkActions.bulkDelete}
            onBulkAddToSuite={crossPlatformBulkActions.bulkAddToSuite}
            onBulkExport={crossPlatformBulkActions.bulkExport}
          />

          <UnifiedTestCaseTable
            testCases={filteredCrossPlatformCases}
            paginated={paginatedCrossPlatformCases}
            filteredCount={filteredCrossPlatformCases.length}
            execution={execution}
            updating={null}
            selectedIds={crossPlatformBulkActions.selectedIds}
            selectAll={crossPlatformBulkActions.selectAll}
            deselectAll={crossPlatformBulkActions.deselectAll}
            toggleSelection={crossPlatformBulkActions.toggleSelection}
            currentPage={crossPlatformCurrentPage}
            totalPages={crossPlatformTotalPages}
            startIndex={crossPlatformStartIndex}
            endIndex={crossPlatformEndIndex}
            onPrevPage={() =>
              setCrossPlatformCurrentPage((p) => Math.max(1, p - 1))
            }
            onNextPage={() =>
              setCrossPlatformCurrentPage((p) =>
                Math.min(crossPlatformTotalPages, p + 1),
              )
            }
            getPriorityColor={getPriorityColor}
            getProjectColor={getProjectColor}
            getRelativeTime={getRelativeTime}
            onOpenDetails={handleViewDetails}
            onOpenCreate={openCreate}
            onOpenActionSheet={handleViewDetails}
          />
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
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

      <TestCaseFormDialog
        open={showCreateDialog || showEditDialog}
        mode={showCreateDialog ? "create" : "edit"}
        testCase={
          editingTestCase && isRegularTestCase(editingTestCase)
            ? (editingTestCase as TestCase)
            : null
        }
        generationId={generationId}
        onClose={() => {
          setShowCreateDialog(false);
          setShowEditDialog(false);
          setEditingTestCase(null);
        }}
        onSuccess={refresh}
      />

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

      <div className="h-2" />
    </div>
  );
}
