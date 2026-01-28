// components/test-suites/SuiteDetailsPageClient.tsx
"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/auth-context";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  ArrowLeft,
  Play,
  Code2,
  Trash2,
  RefreshCcw,
} from "lucide-react";
import { toast } from "sonner";

import { SuiteDetailsTabs } from "@/components/testcase-management/test_suites/SuiteDetailsTabs";
import { useSuiteDetails } from "@/hooks/useSuiteDetails";
import { TestSessionExecution } from "@/components/testcase-management/test_suites/testsessionexecution";
import { UnifiedExportButton } from "@/components/testcase-management/test_suites/unifiedExportButton";
import type { PlatformType } from "@/lib/exports/export-strategy";

type ExportCounts = {
  apiCasesFound: number;
  apiCasesMissingMetadata: number;
};

// NEW: Add suite kind type
type SuiteKind = "regular" | "cross-platform";

export function SuiteDetailsPageClient({ suiteId }: { suiteId: string }) {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const details = useSuiteDetails(suiteId, user?.id, { enabled: true });
  const [runOpen, setRunOpen] = React.useState(false);

  // NEW: Track suite kind and platforms
  const [suiteKind, setSuiteKind] = React.useState<SuiteKind>("regular");
  const [platforms, setPlatforms] = React.useState<PlatformType[]>([]);

  const [exportCounts, setExportCounts] = React.useState<ExportCounts>({
    apiCasesFound: 0,
    apiCasesMissingMetadata: 0,
  });
  const [exportCountsLoading, setExportCountsLoading] = React.useState(false);
  const [exportCountsError, setExportCountsError] = React.useState<
    string | null
  >(null);

  // NEW: Fetch suite kind and platforms
  const fetchSuiteMetadata = React.useCallback(async () => {
    if (!user?.id || !suiteId) return;

    try {
      const res = await fetch(`/api/suites/${suiteId}/metadata`, {
        method: "GET",
        cache: "no-store",
      });

      if (res.ok) {
        const data = await res.json();

        setSuiteKind(data.kind || "regular");
        setPlatforms(data.platforms || []);
      } else {
        console.error(
          "❌ Metadata fetch failed:",
          res.status,
          await res.text(),
        );
      }
    } catch (e) {
      console.error("❌ Failed to fetch suite metadata:", e);
    }
  }, [user?.id, suiteId]);

  React.useEffect(() => {
    void fetchSuiteMetadata();
  }, [fetchSuiteMetadata]);

  const fetchExportSummary = React.useCallback(async () => {
    if (!user?.id) return;
    if (!suiteId) return;

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
      });
    } catch (e) {
      setExportCountsError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setExportCountsLoading(false);
    }
  }, [user?.id, suiteId]);

  React.useEffect(() => {
    void fetchExportSummary();
  }, [fetchExportSummary]);

  const [deleting, setDeleting] = React.useState(false);

  async function handleDeleteSuite() {
    if (!details.suite) return;

    const ok = window.confirm(
      `Delete suite "${details.suite.name}"?\n\nThis cannot be undone.`,
    );
    if (!ok) return;

    setDeleting(true);
    try {
      const res = await fetch(`/api/suites/${details.suite.id}`, {
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

  function handleRunSuite() {
    if (!details.suite) return;
    setRunOpen(true);
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

  return (
    <div className="space-y-4">
      {/* Page header with actions */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => router.back()}
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>

          <div className="flex items-center gap-2">
            {/* NEW: Add UnifiedExportButton here */}
            <UnifiedExportButton
              suiteId={suiteId}
              suiteKind={suiteKind}
              platforms={platforms}
            />

            <Button
              size="sm"
              className="gap-2"
              onClick={handleRunSuite}
              disabled={!details.suite}
            >
              <Play className="h-4 w-4" />
              Run tests
            </Button>

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

        <div className="text-sm text-muted-foreground">{suiteName}</div>
      </div>

      {/* Optional: Keep the old SuiteExportsCard for additional info */}
      {suiteKind === "regular" && (
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <Button
              size="sm"
              variant="outline"
              className="gap-2"
              onClick={() => void fetchExportSummary()}
              disabled={exportCountsLoading}
            >
              {exportCountsLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCcw className="h-4 w-4" />
              )}
              Refresh
            </Button>
          </div>

          {exportCountsLoading && (
            <div className="text-xs text-muted-foreground">
              Refreshing export counts…
            </div>
          )}
          {exportCountsError && (
            <div className="text-xs text-destructive">
              Export summary error: {exportCountsError}
            </div>
          )}
        </div>
      )}

      {/* Tabs */}
      {!details.suite ? (
        <div className="flex items-center justify-center py-20">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading suite...
          </div>
        </div>
      ) : (
        <div className="border rounded-lg p-4 bg-background">
          <SuiteDetailsTabs
            suite={details.suite}
            suiteTestCases={details.suiteTestCases}
            availableTestCases={details.availableTestCases}
            projects={details.projects}
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
      )}

      {details.suite && runOpen && (
        <TestSessionExecution
          suite={details.suite}
          open={runOpen}
          onOpenChange={setRunOpen}
          onSessionComplete={() => {}}
        />
      )}
    </div>
  );
}
