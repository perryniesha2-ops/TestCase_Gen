// app/(authenticated)/automation/[suiteId]/page-client.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth/auth-context";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft,
  Download,
  Settings,
  FileCode,
  History,
  CheckCircle2,
  AlertCircle,
  Clock,
  Code2,
  Zap,
  FileText,
  TrendingUp,
  Activity,
} from "lucide-react";
import { ExportAutomationButton } from "@/components/automation/export-automation-button";
import { AutomationHistory } from "@/components/automation/automation-executionhistory";
import { AddAutomationButton } from "@/components/automation/add-automation-button";
import { AutomationConfigDialog } from "@/components/automation/automation-config-dialog";

interface AutomationPageProps {
  suiteId: string;
}

export function AutomationPage({ suiteId }: AutomationPageProps) {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [suite, setSuite] = useState<any>(null);
  const [testCases, setTestCases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [showConfigDialog, setShowConfigDialog] = useState(false);

  useEffect(() => {
    if (suiteId && user) {
      loadSuiteData();
    }
  }, [suiteId, user]);

  const loadSuiteData = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      const supabase = createClient();

      // Load suite with ALL automation metadata
      const { data: suiteData, error: suiteError } = await supabase
        .from("suites")
        .select(
          `
          *,
          projects:project_id(id, name, color, icon)
        `,
        )
        .eq("id", suiteId)
        .eq("user_id", user.id)
        .single();

      if (suiteError) throw suiteError;

      // Load test cases
      const { data: suiteCases, error: casesError } = await supabase
        .from("suite_items")
        .select(
          `
          *,
          test_cases (
            id,
            title,
            description,
            test_type,
            test_steps,
            automation_metadata
          ),
          platform_test_cases (
            id,
            title,
            description,
            platform,
            framework,
            steps,
            automation_metadata
          )
        `,
        )
        .eq("suite_id", suiteId)
        .order("sequence_order", { ascending: true });

      if (casesError) throw casesError;

      // Calculate automation stats
      const cases = (suiteCases || [])
        .map((sc: any) => {
          const tc = sc.test_cases || sc.platform_test_cases;
          if (!tc) return null;

          const steps = tc.test_steps || tc.steps || [];
          const hasSteps = Array.isArray(steps) && steps.length > 0;

          // Check if steps have automation data (selector + action_type)
          const hasAutomationData =
            Array.isArray(steps) &&
            steps.some((s: any) => s.selector && s.action_type);

          return {
            ...tc,
            has_steps: hasSteps,
            has_automation_metadata: hasAutomationData,
            ready_for_export: suiteData.automation_enabled && hasAutomationData,
          };
        })
        .filter(Boolean);

      const automationStats = {
        total: cases.length,
        with_steps: cases.filter((c: any) => c.has_steps).length,
        with_automation: cases.filter((c: any) => c.has_automation_metadata)
          .length,
        ready: cases.filter((c: any) => c.ready_for_export).length,
      };

      setSuite({
        ...suiteData,
        automation_stats: automationStats,
      });
      setTestCases(cases);
    } catch (error) {
      console.error("Error loading suite:", error);
      toast.error("Failed to load suite data");
    } finally {
      setLoading(false);
    }
  }, [suiteId, user]);

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    router.push("/login");
    return null;
  }

  if (!suite) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Suite not found</h1>
            <p className="text-muted-foreground">
              The requested test suite could not be found
            </p>
          </div>
        </div>
      </div>
    );
  }

  const total = suite.automation_stats?.total || 0;
  const ready = suite.automation_stats?.ready || 0;
  const automationPercentage =
    total > 0 ? Math.round((ready / total) * 100) : 0;

  const getStatusColor = (status: string) => {
    switch (status) {
      case "ready":
      case "active":
        return "bg-green-500";
      case "in_progress":
        return "bg-yellow-500";
      case "not_configured":
        return "bg-gray-500";
      case "deprecated":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  const getStatusLabel = (status: string) => {
    return (
      status?.replace("_", " ").replace(/\b\w/g, (l) => l.toUpperCase()) ||
      "Not Configured"
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <Code2 className="h-6 w-6 text-primary" />
              <h1 className="text-3xl font-bold">{suite.name}</h1>
              <Badge className={getStatusColor(suite.automation_status)}>
                {getStatusLabel(suite.automation_status)}
              </Badge>
              <Badge variant="outline" className="gap-1">
                <Zap className="h-3 w-3" />
                {suite.automation_framework?.toUpperCase() || "PLAYWRIGHT"}
              </Badge>
            </div>
          </div>
          <div className="h-6" />
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowConfigDialog(true)}
          >
            <Settings className="h-4 w-4 mr-2" />
            Configure
          </Button>

          <Button
            variant="outline"
            onClick={() => router.push("/test-library")}
          >
            Back to Suites
          </Button>

          {suite.automation_enabled && (
            <ExportAutomationButton
              suiteId={suite.id}
              suiteName={suite.name}
              framework={suite.automation_framework || "playwright"} // ✅ Pass framework
              variant="default"
            />
          )}
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tests</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{total}</div>
            <p className="text-xs text-muted-foreground">Test cases in suite</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Automation Ready
            </CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{ready}</div>
            <p className="text-xs text-muted-foreground">
              {automationPercentage}% ready
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pass Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {suite.automation_pass_rate
                ? `${suite.automation_pass_rate}%`
                : "N/A"}
            </div>
            <p className="text-xs text-muted-foreground">
              {suite.total_automation_runs || 0} total runs
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Last Run</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {suite.last_automation_run
                ? new Date(suite.last_automation_run).toLocaleDateString()
                : "Never"}
            </div>
            <p className="text-xs text-muted-foreground">
              Most recent execution
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-6"
      >
        <TabsList>
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <FileCode className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            Execution History
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Configuration Status */}
          {!suite.automation_enabled && (
            <Card className="border-dashed border-2 border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <AlertCircle className="h-5 w-5 text-yellow-600" />
                      Automation Not Configured
                    </CardTitle>
                    <CardDescription className="mt-2">
                      Generate automation metadata to enable test export and
                      execution
                    </CardDescription>
                  </div>
                  <AddAutomationButton
                    suiteId={suite.id}
                    applicationUrl={suite.base_url || "https://app.example.com"}
                    onComplete={loadSuiteData}
                    variant="default"
                  />
                </div>
              </CardHeader>
            </Card>
          )}

          {/* Export Call to Action */}
          <Card className="border-dashed border-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Download className="h-5 w-5" />
                    Ready to Automate?
                  </CardTitle>
                  <CardDescription className="mt-2">
                    {suite.automation_enabled
                      ? "Export this suite as a Playwright project and start running automated tests"
                      : "Configure automation first to enable export"}
                  </CardDescription>
                </div>

                <div className="flex items-center gap-2">
                  {suite.automation_enabled ? (
                    <ExportAutomationButton
                      suiteId={suite.id}
                      suiteName={suite.name}
                      framework={suite.automation_framework || "playwright"}
                    />
                  ) : (
                    <Button variant="outline">
                      <Download className="h-4 w-4 mr-2" />
                      Export Disabled
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>

            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
                  <div>
                    <p className="font-medium">Complete Project</p>
                    <p className="text-muted-foreground">
                      Includes all configuration and dependencies
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
                  <div>
                    <p className="font-medium">TypeScript Tests</p>
                    <p className="text-muted-foreground">
                      {ready} test specifications with executable code
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
                  <div>
                    <p className="font-medium">Ready to Run</p>
                    <p className="text-muted-foreground">
                      Setup takes less than 5 minutes
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Test Cases List */}
          <Card>
            <CardHeader>
              <CardTitle>Test Cases ({testCases.length})</CardTitle>
              <CardDescription>
                Tests included in this automation suite
              </CardDescription>
            </CardHeader>
            <CardContent>
              {testCases.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No test cases in this suite yet</p>
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={() => router.push("/test-library")}
                  >
                    Manage Test Cases
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {testCases.map((tc, idx) => (
                    <div
                      key={tc.id}
                      className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <span className="text-sm text-muted-foreground font-mono">
                          #{String(idx + 1).padStart(2, "0")}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{tc.title}</p>
                          {tc.description && (
                            <p className="text-sm text-muted-foreground truncate">
                              {tc.description}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {tc.ready_for_export ? (
                          <Badge variant="default" className="gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            Ready
                          </Badge>
                        ) : tc.has_automation_metadata ? (
                          <Badge variant="secondary" className="gap-1">
                            <Zap className="h-3 w-3" />
                            Has Metadata
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="gap-1">
                            <AlertCircle className="h-3 w-3" />
                            Needs Automation
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Execution History Tab */}
        <TabsContent value="history">
          <AutomationHistory suiteId={suite.id} />
        </TabsContent>
      </Tabs>

      {/* Configuration Dialog */}
      <AutomationConfigDialog
        open={showConfigDialog}
        onOpenChange={setShowConfigDialog}
        suite={suite}
        onUpdate={loadSuiteData}
      />
    </div>
  );
}
