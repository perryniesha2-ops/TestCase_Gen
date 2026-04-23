// components/test-suites/SuiteDetailsPageClient.tsx
"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useCallback } from "react";
import { useAuth } from "@/lib/auth/auth-context";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Loader2,
  ArrowLeft,
  Play,
  Code2,
  Trash2,
  FileText,
  Clock,
  BarChart3,
} from "lucide-react";
import { toast } from "sonner";

import { SuiteDetailsTabs } from "@/components/testcase-management/test_suites/testsuitedetails";
import { useSuiteDetails } from "@/hooks/useSuiteDetails";
import { TestSessionExecution } from "@/components/testcase-management/test_suites/testsessionexecution";
import { UnifiedExportButton } from "@/components/testcase-management/test_suites/unifiedExportButton";
import { ExecutionHistory } from "@/components/testcase-management/test_suites/executionhistory";
import { SuiteReports } from "@/components/testcase-management/test_suites/suitesreport";
import type { PlatformType } from "@/lib/exports/export-strategy";
import { SuiteKind } from "@/lib/suites/resolve-suite";
import { Project } from "@/types/projects";

type ExportCounts = {
  apiCasesFound: number;
  apiCasesMissingMetadata: number;
  suiteKind?: string;
};

export function SuiteDetailsPageClient({ suiteId }: { suiteId: string }) {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const details = useSuiteDetails(suiteId, user?.id, { enabled: true });
  const [runOpen, setRunOpen] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState("test-cases");

  const [suiteKind, setSuiteKind] = React.useState<SuiteKind>("regular");
  const [platforms, setPlatforms] = React.useState<PlatformType[]>([]);
  const [metadataLoading, setMetadataLoading] = React.useState(true);

  const [exportCounts, setExportCounts] = React.useState<ExportCounts>({
    apiCasesFound: 0,
    apiCasesMissingMetadata: 0,
  });
  const [exportCountsLoading, setExportCountsLoading] = React.useState(false);
  const [exportCountsError, setExportCountsError] = React.useState<
    string | null
  >(null);

  const [projects, setProjects] = useState<Project[]>([]);

  const canAutomate = suiteKind === "regular";

  const fetchSuiteMetadata = React.useCallback(async () => {
    if (!user?.id || !suiteId) return;
    setMetadataLoading(true);
    try {
      const res = await fetch(`/api/suites/${suiteId}/metadata`, {
        method: "GET",
        cache: "no-store",
      });
      if (res.ok) {
        const data = await res.json();
        setSuiteKind(data.kind || "regular");
        setPlatforms(data.platforms || []);
      }
    } catch (e) {
      console.error("❌ Failed to fetch suite metadata:", e);
    } finally {
      setMetadataLoading(false);
    }
  }, [user?.id, suiteId]);

  const metadataFetchedRef = React.useRef(false);

  React.useEffect(() => {
    if (!user?.id || !suiteId) return;
    if (metadataFetchedRef.current) return;
    metadataFetchedRef.current = true;
    void fetchSuiteMetadata();
    fetchProjects();
  }, [user?.id, suiteId]);

  const fetchExportSummary = React.useCallback(async () => {
    if (!user?.id || !suiteId) return;
    setExportCountsLoading(true);
    setExportCountsError(null);
    try {
      const res = await fetch(`/api/suites/${suiteId}/export-summary`, {
        method: "GET",
        cache: "no-store",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(
          err?.error || `Export summary failed (HTTP ${res.status})`,
        );
      }
      const data = (await res.json()) as Partial<ExportCounts>;
      setExportCounts({
        apiCasesFound: Number(data.apiCasesFound ?? 0),
        apiCasesMissingMetadata: Number(data.apiCasesMissingMetadata ?? 0),
        suiteKind: data.suiteKind,
      });
    } catch (e) {
      setExportCountsError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setExportCountsLoading(false);
    }
  }, [user?.id, suiteId]);

  const exportFetchedRef = React.useRef(false);
  React.useEffect(() => {
    if (!user?.id || !suiteId) return;
    if (exportFetchedRef.current) return;
    exportFetchedRef.current = true;
    void fetchExportSummary();
  }, [user?.id, suiteId]);

  const [deleting, setDeleting] = React.useState(false);

  async function fetchProjects() {
    try {
      const res = await fetch("/api/projects/list", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to load projects");
      const data = await res.json();
      setProjects(data.projects ?? []);
    } catch (error) {
      console.error("[TestCaseFormDialog] fetchProjects error:", error);
    }
  }

  async function handleDeleteSuite() {
    if (!details.suite) return;
    const ok = window.confirm(
      `Delete suite "${details.suite.name}"?\n\nThis cannot be undone.`,
    );
    if (!ok) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/suites/${suiteId}/delete`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || `Delete failed (HTTP ${res.status})`);
      }
      toast.success("Suite deleted");
      router.push("/test-library");
    } catch (e) {
      toast.error("Failed to delete suite", {
        description: e instanceof Error ? e.message : "Unknown error",
      });
    } finally {
      setDeleting(false);
    }
  }

  if (authLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading...
        </div>
      </div>
    );
  }

  if (!user) {
    router.push("/login");
    return null;
  }

  const suiteName = details.suite?.name ?? "Suite";

  if (!authLoading && !suiteName) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Suite not found</h2>
          <p className="text-muted-foreground mb-4">
            This suite doesn't exist or you don't have access to it.
          </p>
          <Button onClick={() => router.push("/test-library")}>
            Back to Test Library
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* ── Page header ── */}
      <div className="flex flex-col gap-3">
        {/* Row 1: Back button + action buttons */}
        {/* On mobile: Back sits alone left, actions wrap into a second row */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-2 self-start"
            onClick={() => router.back()}
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>

          {/* Action buttons — wrap naturally on mobile */}
          <div className="flex flex-wrap items-center gap-2">
            <UnifiedExportButton
              suiteId={suiteId}
              suiteKind={suiteKind}
              platforms={platforms}
            />

            <Button
              size="sm"
              className="gap-2"
              onClick={() => setRunOpen(true)}
              disabled={!details.suite}
            >
              <Play className="h-4 w-4" />
              Run tests
            </Button>

            {canAutomate && (
              <Button
                size="sm"
                variant="outline"
                className="gap-2"
                onClick={() =>
                  details.suite &&
                  router.push(`/automation/suites/${details.suite.id}`)
                }
                disabled={!details.suite}
              >
                <Code2 className="h-4 w-4" />
                Automation
              </Button>
            )}

            <Button
              size="sm"
              variant="destructive"
              className="gap-2"
              onClick={handleDeleteSuite}
              disabled={!details.suite || deleting}
            >
              {deleting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              Delete
            </Button>
          </div>
        </div>

        {/* Row 2: Suite name + kind/platform badges */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="text-sm text-muted-foreground truncate max-w-[280px] sm:max-w-none">
            {suiteName}
          </div>
          {!metadataLoading && (
            <>
              <Badge variant="outline" className="capitalize shrink-0">
                {suiteKind}
              </Badge>
              {suiteKind === "cross-platform" && platforms.length > 0 && (
                <div className="flex flex-wrap items-center gap-1">
                  {platforms.map((platform) => (
                    <Badge
                      key={platform}
                      variant="secondary"
                      className="capitalize text-xs shrink-0"
                    >
                      {platform}
                    </Badge>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── Main content tabs ── */}
      {!details.suite ? (
        <div className="flex items-center justify-center py-20">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading suite...
          </div>
        </div>
      ) : (
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="space-y-4"
        >
          {/* Tab triggers — icon+label on sm+, icon-only on xs */}
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger
              value="test-cases"
              className="flex items-center gap-1 sm:gap-2"
            >
              <FileText className="h-4 w-4 shrink-0" />
              <span>Test Cases</span>
            </TabsTrigger>
            <TabsTrigger
              value="run-history"
              className="flex items-center gap-1 sm:gap-2"
            >
              <Clock className="h-4 w-4 shrink-0" />
              <span>Run History</span>
            </TabsTrigger>
            <TabsTrigger
              value="reports"
              className="flex items-center gap-1 sm:gap-2"
            >
              <BarChart3 className="h-4 w-4 shrink-0" />
              <span>Reports</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="test-cases">
            <div className="border rounded-lg p-3 sm:p-4 bg-background">
              <SuiteDetailsTabs
                suite={details.suite}
                suiteTestCases={details.suiteTestCases}
                availableTestCases={details.availableTestCases}
                projects={projects}
                initialLoading={details.initialLoading}
                busy={details.loading}
                defaultTab="assigned"
                showOpenFullPageButton={false}
                onSaveSuite={details.saveSuiteDetails}
                onAddTestCase={details.addTestCaseToSuite}
                onRemoveTestCase={details.removeTestCaseFromSuite}
                onUpdatePriority={details.updateTestCasePriority}
              />
            </div>
          </TabsContent>

          <TabsContent value="run-history">
            <ExecutionHistory suiteId={suiteId} />
          </TabsContent>

          <TabsContent value="reports">
            <SuiteReports suiteId={suiteId} showAllSuites={false} />
          </TabsContent>
        </Tabs>
      )}

      {details.suite && (
        <TestSessionExecution
          suite={details.suite}
          open={runOpen}
          onOpenChange={setRunOpen}
          onSessionComplete={() => {
            setRunOpen(false);
            setActiveTab("run-history");
          }}
        />
      )}
    </div>
  );
}
