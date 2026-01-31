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
} from "lucide-react";
import { ExportPlaywrightButton } from "@/components/automation/export-playwright-button";
import { PlaywrightExecutionHistory } from "@/components/automation/playwrightexecutionhistory";
import type { TestSuite } from "@/types/test-cases";
import { AddAutomationButton } from "@/components/automation/add-automation-button";

interface AutomationPageProps {
  suiteId: string;
}

export function AutomationPage({ suiteId }: AutomationPageProps) {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [suite, setSuite] = useState<TestSuite | null>(null);
  const [testCases, setTestCases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");

  const storageKey = `synthqa_automation_added_${suiteId}`;
  const [automationAdded, setAutomationAdded] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved === "1") setAutomationAdded(true);
    } catch {}
  }, [storageKey]);

  const markAutomationAdded = useCallback(() => {
    setAutomationAdded(true);
    try {
      localStorage.setItem(storageKey, "1");
    } catch {}
  }, [storageKey]);

  useEffect(() => {
    if (suiteId && user) {
      loadSuiteData();
    }
  }, [suiteId, user, automationAdded]);

  const loadSuiteData = useCallback(
    async (overrideAutomationAdded?: boolean) => {
      if (!user) {
        console.error("No user available");
        return;
      }

      const isAutomationAdded = overrideAutomationAdded ?? automationAdded;

      try {
        setLoading(true);
        const supabase = createClient();

        // Load suite from unified suites table
        const { data: suiteData, error: suiteError } = await supabase
          .from("suites")
          .select(`*, projects:project_id(id, name, color, icon)`)
          .eq("id", suiteId)
          .eq("user_id", user.id)
          .single();

        if (suiteError) throw suiteError;

        // Load test cases based on suite kind
        let cases: any[] = [];

        if (suiteData.kind === "regular") {
          // For regular suites, load from suite_items + test_cases
          const { data: suiteCases, error: casesError } = await supabase
            .from("suite_items")
            .select(
              `
              id,
              sequence_order,
              test_cases (
                id,
                title,
                description,
                test_type,
                test_steps,
                automation_metadata
              )
            `,
            )
            .eq("suite_id", suiteId)
            .not("test_case_id", "is", null)
            .order("sequence_order", { ascending: true });

          if (casesError) throw casesError;

          cases = (suiteCases || [])
            .map((sc: any) => {
              const tc = Array.isArray(sc.test_cases)
                ? sc.test_cases[0]
                : sc.test_cases;

              if (!tc) return null;

              const hasSteps =
                Array.isArray(tc?.test_steps) && tc.test_steps.length > 0;
              const hasAutomationData =
                tc?.automation_metadata &&
                Object.keys(tc.automation_metadata).length > 0;

              return {
                ...tc,
                has_steps: hasSteps,
                has_automation_metadata: hasAutomationData,
                ready_for_export: isAutomationAdded && hasSteps,
              };
            })
            .filter(Boolean);
        } else if (suiteData.kind === "cross-platform") {
          // For cross-platform suites, load from suite_items + platform_test_cases
          const { data: suiteCases, error: casesError } = await supabase
            .from("suite_items")
            .select(
              `
              id,
              sequence_order,
              platform_test_cases (
                id,
                title,
                description,
                platform,
                steps,
                automation_metadata
              )
            `,
            )
            .eq("suite_id", suiteId)
            .not("platform_test_case_id", "is", null)
            .order("sequence_order", { ascending: true });

          if (casesError) throw casesError;

          cases = (suiteCases || [])
            .map((sc: any) => {
              const tc = Array.isArray(sc.platform_test_cases)
                ? sc.platform_test_cases[0]
                : sc.platform_test_cases;

              if (!tc) return null;

              const hasSteps = Array.isArray(tc?.steps) && tc.steps.length > 0;
              const hasAutomationData =
                tc?.automation_metadata &&
                Object.keys(tc.automation_metadata).length > 0;

              return {
                ...tc,
                has_steps: hasSteps,
                has_automation_metadata: hasAutomationData,
                ready_for_export: isAutomationAdded && hasSteps,
              };
            })
            .filter(Boolean);
        }

        const automationStats = {
          total: cases.length,
          with_steps: cases.filter((c) => c.has_steps).length,
          with_automation: cases.filter((c) => c.has_automation_metadata)
            .length,
          ready: isAutomationAdded
            ? cases.filter((c) => c.ready_for_export).length
            : 0,
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
    },
    [automationAdded, suiteId, user],
  );

  if (authLoading) {
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

  const total = suite.automation_stats?.total || 0;
  const ready = suite.automation_stats?.ready || 0;
  const automationPercentage =
    total > 0 ? Math.round((ready / total) * 100) : 0;

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
              <Badge variant="outline" className="ml-2">
                {suite.kind}
              </Badge>
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

          {automationAdded && (
            <ExportPlaywrightButton
              suiteId={suite.id}
              suiteName={suite.name}
              variant="default"
              size="default"
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
            <div className="text-2xl font-bold">
              {automationAdded ? ready : 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {automationAdded
                ? `${automationPercentage}% ready`
                : "Add automation to calculate readiness"}
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
              {automationAdded
                ? suite.automation_stats?.with_automation || 0
                : 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {automationAdded
                ? "Enhanced with selectors"
                : "Generated after automation is added"}
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

      {/* Main Content - Rest of the component remains the same */}
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

        <TabsContent value="overview" className="space-y-6">
          {/* Your existing overview content */}
        </TabsContent>

        <TabsContent value="history">
          <PlaywrightExecutionHistory suiteId={suite.id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
