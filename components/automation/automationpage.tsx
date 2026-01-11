"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
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
  Play,
  Settings,
  FileCode,
  History,
  CheckCircle2,
  AlertCircle,
  Clock,
  Code2,
  Zap,
  FileText,
} from "lucide-react";
import { ExportPlaywrightButton } from "@/components/automation/export-playwright-button";
import { PlaywrightExecutionHistory } from "@/components/automation/playwrightexecutionhistory";
import type { TestSuite } from "@/types/test-cases";

interface AutomationPageProps {
  suiteId: string;
}

export function AutomationPage({ suiteId }: AutomationPageProps) {
  const router = useRouter();
  const [suite, setSuite] = useState<TestSuite | null>(null);
  const [testCases, setTestCases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    if (suiteId) {
      loadSuiteData();
    }
  }, [suiteId]);

  async function loadSuiteData() {
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      // Load suite
      const { data: suiteData, error: suiteError } = await supabase
        .from("test_suites")
        .select(`*, projects:project_id(id, name, color, icon)`)
        .eq("id", suiteId)
        .eq("user_id", user.id)
        .single();

      if (suiteError) throw suiteError;

      // Load test cases
      const { data: suiteCases, error: casesError } = await supabase
        .from("test_suite_cases")
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
          )
        `
        )
        .eq("suite_id", suiteId)
        .order("sequence_order", { ascending: true });

      if (casesError) throw casesError;

      // Calculate automation stats
      const cases = (suiteCases || []).map((sc: any) => {
        const tc = Array.isArray(sc.test_cases)
          ? sc.test_cases[0]
          : sc.test_cases;

        const hasSteps =
          Array.isArray(tc?.test_steps) && tc.test_steps.length > 0;
        const hasAutomationData =
          tc?.automation_metadata &&
          Object.keys(tc.automation_metadata).length > 0;

        return {
          ...tc,
          has_steps: hasSteps,
          has_automation_metadata: hasAutomationData,
          ready_for_export: hasSteps,
        };
      });

      const automationStats = {
        total: cases.length,
        with_steps: cases.filter((c) => c.has_steps).length,
        with_automation: cases.filter((c) => c.has_automation_metadata).length,
        ready: cases.filter((c) => c.ready_for_export).length,
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
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="space-y-2 flex-1">
            <div className="h-8 w-64 bg-muted animate-pulse rounded" />
            <div className="h-4 w-48 bg-muted animate-pulse rounded" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      </div>
    );
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

  const automationPercentage = suite.automation_stats
    ? Math.round(
        (suite.automation_stats.ready / suite.automation_stats.total) * 100
      )
    : 0;

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
            </div>
            <p className="text-muted-foreground mt-1">Test Automation Hub</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => router.push("/test-library")}
          >
            Back to Suites
          </Button>
          <ExportPlaywrightButton
            suiteId={suite.id}
            suiteName={suite.name}
            variant="default"
            size="default"
          />
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
            <div className="text-2xl font-bold">
              {suite.automation_stats?.total || 0}
            </div>
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
            <div className="text-2xl font-bold">
              {suite.automation_stats?.ready || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {automationPercentage}% ready
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">With Metadata</CardTitle>
            <Zap className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {suite.automation_stats?.with_automation || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Enhanced with selectors
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Suite Type</CardTitle>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold capitalize">
              {suite.suite_type || "Manual"}
            </div>
            <p className="text-xs text-muted-foreground">Test suite type</p>
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
          <TabsTrigger value="export" className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            Export & Setup
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            Execution History
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
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
                    Export this suite as a Playwright project and start running
                    automated tests
                  </CardDescription>
                </div>
                <ExportPlaywrightButton
                  suiteId={suite.id}
                  suiteName={suite.name}
                />
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
                      {suite.automation_stats?.ready || 0} test specifications
                      generated
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
                    onClick={() => router.push("/test-suites")}
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
                        ) : (
                          <Badge variant="secondary" className="gap-1">
                            <AlertCircle className="h-3 w-3" />
                            Needs Steps
                          </Badge>
                        )}
                        {tc.has_automation_metadata && (
                          <Badge variant="outline" className="gap-1">
                            <Zap className="h-3 w-3" />
                            Enhanced
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Automation Readiness */}
          <Card>
            <CardHeader>
              <CardTitle>Automation Readiness</CardTitle>
              <CardDescription>
                Current automation coverage for this suite
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    Tests ready for automation
                  </span>
                  <span className="font-medium">
                    {suite.automation_stats?.ready || 0} of{" "}
                    {suite.automation_stats?.total || 0}
                  </span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all"
                    style={{ width: `${automationPercentage}%` }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">
                    With Test Steps
                  </p>
                  <p className="text-2xl font-bold">
                    {suite.automation_stats?.with_steps || 0}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">
                    With Automation Data
                  </p>
                  <p className="text-2xl font-bold">
                    {suite.automation_stats?.with_automation || 0}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">
                    Completion Rate
                  </p>
                  <p className="text-2xl font-bold">{automationPercentage}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Export & Setup Tab */}
        <TabsContent value="export" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Export to Playwright</CardTitle>
              <CardDescription>
                Download a complete, ready-to-run Playwright automation project
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Export Button */}
              <div className="flex items-center justify-center py-8 border-2 border-dashed rounded-lg">
                <div className="text-center space-y-4">
                  <Download className="h-16 w-16 mx-auto text-muted-foreground" />
                  <div>
                    <h3 className="text-lg font-semibold mb-2">
                      Export Suite: {suite.name}
                    </h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Includes {suite.automation_stats?.total || 0} test cases
                    </p>
                  </div>
                  <ExportPlaywrightButton
                    suiteId={suite.id}
                    suiteName={suite.name}
                    size="lg"
                  />
                </div>
              </div>

              {/* What's Included */}
              <div>
                <h4 className="font-semibold mb-3">What's Included</h4>
                <div className="space-y-2">
                  <div className="flex items-start gap-2 text-sm">
                    <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
                    <div>
                      <p className="font-medium">Complete Playwright Project</p>
                      <p className="text-muted-foreground">
                        package.json, playwright.config.ts, TypeScript setup
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2 text-sm">
                    <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
                    <div>
                      <p className="font-medium">Test Specifications</p>
                      <p className="text-muted-foreground">
                        {suite.automation_stats?.ready || 0} TypeScript test
                        files with step-by-step execution
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2 text-sm">
                    <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
                    <div>
                      <p className="font-medium">Test Data Snapshots</p>
                      <p className="text-muted-foreground">
                        JSON snapshots of all test cases and expected results
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2 text-sm">
                    <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
                    <div>
                      <p className="font-medium">Setup Documentation</p>
                      <p className="text-muted-foreground">
                        README with installation and usage instructions
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Next Steps */}
              <div>
                <h4 className="font-semibold mb-3">Next Steps After Export</h4>
                <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                  <li>Extract the ZIP file to your desired location</li>
                  <li>
                    Run{" "}
                    <code className="px-1.5 py-0.5 rounded bg-muted">
                      pnpm install
                    </code>{" "}
                    and{" "}
                    <code className="px-1.5 py-0.5 rounded bg-muted">
                      npx playwright install
                    </code>
                  </li>
                  <li>
                    Configure{" "}
                    <code className="px-1.5 py-0.5 rounded bg-muted">.env</code>{" "}
                    file with your BASE_URL
                  </li>
                  <li>Implement selectors and assertions in TODO blocks</li>
                  <li>
                    Run tests with{" "}
                    <code className="px-1.5 py-0.5 rounded bg-muted">
                      pnpm test
                    </code>
                  </li>
                </ol>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Execution History Tab */}
        <TabsContent value="history">
          <PlaywrightExecutionHistory suiteId={suite.id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
