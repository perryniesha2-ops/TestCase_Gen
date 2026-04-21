// components/testcase-management/test-cases/TestCaseDetailsPageClient.tsx
"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/auth-context";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Loader2,
  ArrowLeft,
  Play,
  Edit3,
  Trash2,
  Monitor,
  Smartphone,
  Globe,
  Eye,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import type { TestCase, CrossPlatformTestCase } from "@/types/test-cases";
import { TestCaseFormDialog } from "@/components/testcase-management/test-cases/dialogs/test-case-form-dialog";
import { TestRunnerDialog } from "@/components/testcase-management/test-cases/dialogs/test-runner-dialog";
import { ExecutionHistoryTab } from "@/components/testcase-management/test-cases/executionhistory";
import { VersionHistoryPanel } from "@/components/testcase-management/test-cases/versionhistorypanel";
import { useExecutions } from "@/hooks/useExecutions";
import { toastError, toastSuccess } from "@/lib/utils/toast-utils";

const platformIcons = {
  web: Monitor,
  mobile: Smartphone,
  api: Globe,
  accessibility: Eye,
  performance: Zap,
};

function isRegularTestCase(
  tc: TestCase | CrossPlatformTestCase,
): tc is TestCase {
  return "test_steps" in tc && "test_type" in tc;
}

function isCrossPlatformTestCase(
  tc: TestCase | CrossPlatformTestCase,
): tc is CrossPlatformTestCase {
  return "platform" in tc && "framework" in tc;
}

export function TestCaseDetailsPageClient({
  testCaseId,
}: {
  testCaseId: string;
}) {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [testCase, setTestCase] = React.useState<
    TestCase | CrossPlatformTestCase | null
  >(null);
  const [caseType, setCaseType] = React.useState<"regular" | "cross-platform">(
    "regular",
  );
  const [loading, setLoading] = React.useState(true);
  const [deleting, setDeleting] = React.useState(false);
  const [showEditDialog, setShowEditDialog] = React.useState(false);
  const [showRunnerDialog, setShowRunnerDialog] = React.useState(false);

  const {
    execution,
    setExecution,
    hydrateOne,
    toggleStep,
    saveProgress,
    saveResult,
    reset,
  } = useExecutions({ sessionId: null });

  const fetchTestCase = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/test-cases/${testCaseId}`, {
        cache: "no-store",
      });
      if (res.status === 404) {
        toast.error("Test case not found");
        router.push("/test-library");
        return;
      }
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload?.error ?? `Failed (${res.status})`);
      }
      const payload = await res.json();
      setTestCase(payload.testCase);
      setCaseType(payload.caseType ?? "regular");
    } catch {
      toast.error("Failed to load test case");
      router.push("/test-library");
    } finally {
      setLoading(false);
    }
  }, [testCaseId, router]);

  React.useEffect(() => {
    if (!user?.id) return;
    void fetchTestCase();
  }, [user?.id, fetchTestCase]);

  React.useEffect(() => {
    if (!testCase) return;
    setExecution((prev) => ({
      ...prev,
      [testCaseId]: {
        ...(prev[testCaseId] ?? { completedSteps: [], failedSteps: [] }),
        status: testCase.execution_status || "not_run",
        completedSteps: prev[testCaseId]?.completedSteps ?? [],
        failedSteps: prev[testCaseId]?.failedSteps ?? [],
      },
    }));
  }, [testCase, setExecution, testCaseId]);

  const handleDelete = async () => {
    if (!testCase) return;
    const confirmed = window.confirm(
      `Delete test case "${testCase.title}"?\n\nThis will also delete:\n• All linked suite assignments\n• All execution history\n• All requirement links\n• All attachments\n• All saved versions\n\nThis cannot be undone.`,
    );
    if (!confirmed) return;

    setDeleting(true);
    try {
      const res = await fetch(`/api/test-cases/${testCaseId}`, {
        method: "DELETE",
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload?.error ?? "Failed to delete");
      toastSuccess("Test case deleted successfully");
      router.push("/test-cases");
    } catch (error: any) {
      toastError(error?.message ?? "Failed to delete test case.");
    } finally {
      setDeleting(false);
    }
  };

  const handleRun = async () => {
    if (!testCase) return;
    try {
      await hydrateOne(testCaseId, caseType);
    } catch {}
    setShowRunnerDialog(true);
  };

  const getPriorityColor = (priority: string) => {
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
  };

  if (authLoading || loading) {
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

  if (!testCase) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <p className="text-lg font-semibold">Test case not found</p>
          <Button onClick={() => router.push("/test-library")} className="mt-4">
            Back to Test Library
          </Button>
        </div>
      </div>
    );
  }

  const isRegular = isRegularTestCase(testCase);
  const isCrossPlatform = isCrossPlatformTestCase(testCase);

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
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
              <Button size="sm" className="gap-2" onClick={handleRun}>
                <Play className="h-4 w-4" />
                Run Test
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="gap-2"
                onClick={() => setShowEditDialog(true)}
              >
                <Edit3 className="h-4 w-4" />
                Edit
              </Button>
              <Button
                size="sm"
                variant="destructive"
                className="gap-2"
                onClick={handleDelete}
                disabled={deleting}
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

          <div className="space-y-2">
            <h1 className="text-2xl font-bold">{testCase.title}</h1>
            <div className="flex flex-wrap items-center gap-2">
              <Badge className={getPriorityColor(testCase.priority)}>
                {testCase.priority}
              </Badge>
              {isRegular && (
                <Badge variant="secondary">{testCase.test_type}</Badge>
              )}
              {isCrossPlatform && (
                <>
                  <Badge variant="default" className="gap-1">
                    {(() => {
                      const Icon =
                        platformIcons[
                          testCase.platform as keyof typeof platformIcons
                        ];
                      return Icon ? <Icon className="h-3 w-3" /> : null;
                    })()}
                    {testCase.platform}
                  </Badge>
                  <Badge variant="outline">{testCase.framework}</Badge>
                </>
              )}
              <Badge variant="outline" className="capitalize">
                {testCase.status}
              </Badge>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="details" className="w-full">
          <TabsList
            className={`grid w-full ${isRegular ? "grid-cols-3" : "grid-cols-2"}`}
          >
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="execution">Execution History</TabsTrigger>
            {isRegular && (
              <TabsTrigger value="versions">Version History</TabsTrigger>
            )}
          </TabsList>

          {/* Details */}
          <TabsContent value="details" className="space-y-6 mt-6">
            <div className="rounded-lg border bg-card p-6 shadow-sm overflow-hidden">
              <h3 className="text-lg font-semibold mb-3">Description</h3>
              <p className="text-muted-foreground break-words">
                {testCase.description || "No description provided"}
              </p>
            </div>

            {testCase.preconditions && (
              <div className="rounded-lg border bg-card p-6 shadow-sm overflow-hidden">
                <h3 className="text-lg font-semibold mb-3">Preconditions</h3>
                {Array.isArray(testCase.preconditions) ? (
                  <ul className="list-disc list-inside text-muted-foreground space-y-1">
                    {testCase.preconditions.map((p: string, i: number) => (
                      <li key={i} className="break-words">
                        {p}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-muted-foreground break-words">
                    {testCase.preconditions}
                  </p>
                )}
              </div>
            )}

            {isRegular && (
              <div className="rounded-lg border bg-card p-6 shadow-sm overflow-hidden">
                <h3 className="text-lg font-semibold mb-4">Test Steps</h3>
                {testCase.test_steps?.length ? (
                  <div className="space-y-3">
                    {testCase.test_steps.map((step, idx) => (
                      <div
                        key={idx}
                        className="border rounded-lg p-4 overflow-hidden"
                      >
                        <div className="font-medium mb-2 break-words">
                          Step {step.step_number}: {step.action}
                        </div>
                        <div className="text-sm text-muted-foreground break-words">
                          Expected: {step.expected}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">No steps available</p>
                )}
              </div>
            )}

            {isCrossPlatform && (
              <div className="rounded-lg border bg-card p-6 shadow-sm">
                <h3 className="text-lg font-semibold mb-4">Test Steps</h3>
                {testCase.steps?.length ? (
                  <div className="space-y-3">
                    {testCase.steps.map((step, idx) => (
                      <div key={idx} className="border rounded-lg p-4">
                        <div className="font-medium mb-2">
                          Step {idx + 1}: {step}
                        </div>
                        {testCase.expected_results?.[idx] && (
                          <div className="text-sm text-muted-foreground break-words">
                            Expected: {testCase.expected_results[idx]}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">No steps available</p>
                )}
              </div>
            )}

            {isRegular && testCase.expected_result && (
              <div className="rounded-lg border bg-card p-6 shadow-sm overflow-hidden">
                <h3 className="text-lg font-semibold mb-3">Expected Result</h3>
                <p className="text-muted-foreground break-words">
                  {testCase.expected_result}
                </p>
              </div>
            )}

            {isCrossPlatform && testCase.automation_hints?.length ? (
              <div className="rounded-lg border bg-card p-6 shadow-sm overflow-hidden">
                <h3 className="text-lg font-semibold mb-3">Automation Hints</h3>
                <ul className="list-disc list-inside text-muted-foreground space-y-1">
                  {testCase.automation_hints.map((hint, idx) => (
                    <li key={idx} className="break-words">
                      {hint}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <div className="rounded-lg border bg-card p-6 shadow-sm">
              <h3 className="text-lg font-semibold mb-4">Details</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Created</p>
                  <p className="font-medium">
                    {new Date(testCase.created_at).toLocaleDateString()}
                  </p>
                </div>
                {testCase.updated_at && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">
                      Last Updated
                    </p>
                    <p className="font-medium">
                      {new Date(testCase.updated_at).toLocaleDateString()}
                    </p>
                  </div>
                )}
                {testCase.projects && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">
                      Project
                    </p>
                    <p className="font-medium">{testCase.projects.name}</p>
                  </div>
                )}
                {isCrossPlatform && testCase.approved_at && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">
                      Approved
                    </p>
                    <p className="font-medium">
                      {new Date(testCase.approved_at).toLocaleDateString()}
                    </p>
                  </div>
                )}
              </div>
            </div>
            <div className="h-2" />
          </TabsContent>

          {/* Execution History */}
          <TabsContent value="execution" className="mt-6">
            <ExecutionHistoryTab testCaseId={testCase.id} caseType={caseType} />
          </TabsContent>

          {/* Version History — regular cases only */}
          {isRegular && (
            <TabsContent value="versions" className="mt-6">
              <VersionHistoryPanel
                testCaseId={testCase.id}
                currentTestCase={testCase as TestCase}
                onRestored={() => void fetchTestCase()}
              />
            </TabsContent>
          )}
        </Tabs>
        <div className="h-4" />
      </div>

      <TestCaseFormDialog
        open={showEditDialog}
        mode="edit"
        testCase={testCase}
        caseType={caseType}
        generationId={
          isRegular && testCase.generation_id ? testCase.generation_id : null
        }
        onClose={() => setShowEditDialog(false)}
        onSuccess={() => {
          void fetchTestCase();
          setShowEditDialog(false);
        }}
      />

      <TestRunnerDialog
        open={showRunnerDialog}
        onOpenChange={setShowRunnerDialog}
        testCase={testCase}
        caseType={caseType}
        executionRow={execution[testCase.id]}
        onSaveProgress={(id, updates) => saveProgress(id, updates, caseType)}
        onFinalize={(id, status, details) =>
          saveResult(id, status, details, caseType)
        }
        onReset={(id) => reset(id, caseType)}
        onToggleStep={toggleStep}
      />
    </>
  );
}
