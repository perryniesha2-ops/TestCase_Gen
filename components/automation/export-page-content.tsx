"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ExportPlaywrightButton } from "@/components/automation/export-automation-button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  ArrowLeft,
  CheckCircle2,
  FileCode,
  Folder,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";

type TestCase = {
  id: string;
  title: string;
  test_type?: string | null;
  description: string | null;
  platform?: string;
};

type Suite = {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  kind: "regular" | "cross-platform";
};

interface ExportPageContentProps {
  suiteId: string;
}

export function ExportPageContent({ suiteId }: ExportPageContentProps) {
  const router = useRouter();
  const [suite, setSuite] = useState<Suite | null>(null);
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSuiteData();
  }, [suiteId]);

  async function loadSuiteData() {
    try {
      setLoading(true);
      setError(null);

      const supabase = createClient();

      const { data: suiteData, error: suiteError } = await supabase
        .from("suites")
        .select("id, name, description, created_at, kind")
        .eq("id", suiteId)
        .single();

      if (suiteError) throw suiteError;
      setSuite(suiteData);

      if (suiteData.kind === "regular") {
        const { data: items, error: itemsError } = await supabase
          .from("suite_items")
          .select(
            `
            test_case_id,
            sequence_order,
            test_cases (
              id,
              title,
              test_type,
              description
            )
          `,
          )
          .eq("suite_id", suiteId)
          .not("test_case_id", "is", null)
          .order("sequence_order", { ascending: true });

        if (itemsError) throw itemsError;

        const cases = (items || [])
          .map((item: any) => {
            const tc = Array.isArray(item.test_cases)
              ? item.test_cases[0]
              : item.test_cases;
            return tc;
          })
          .filter(Boolean) as TestCase[];

        setTestCases(cases);
      } else if (suiteData.kind === "cross-platform") {
        const { data: items, error: itemsError } = await supabase
          .from("suite_items")
          .select(
            `
            platform_test_case_id,
            sequence_order,
            platform_test_cases (
              id,
              title,
              platform,
              description
            )
          `,
          )
          .eq("suite_id", suiteId)
          .not("platform_test_case_id", "is", null)
          .order("sequence_order", { ascending: true });

        if (itemsError) throw itemsError;

        const cases = (items || [])
          .map((item: any) => {
            const tc = Array.isArray(item.platform_test_cases)
              ? item.platform_test_cases[0]
              : item.platform_test_cases;
            return tc ? { ...tc, test_type: tc.platform } : null;
          })
          .filter(Boolean) as TestCase[];

        setTestCases(cases);
      }
    } catch (err) {
      console.error("Error loading suite:", err);
      setError(
        err instanceof Error ? err.message : "Failed to load suite data",
      );
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="container max-w-4xl py-8 space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error || !suite) {
    return (
      <div className="container max-w-4xl py-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error || "Suite not found"}</AlertDescription>
        </Alert>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => router.back()}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Go Back
        </Button>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => router.back()}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-3xl font-bold">Export Test Suite</h1>
          </div>
          <p className="text-muted-foreground">
            Generate a ready-to-run Playwright automation project
          </p>
        </div>
      </div>

      {/* Suite Info */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2">
                <Folder className="h-5 w-5" />
                {suite.name}
                <Badge variant="outline" className="ml-2">
                  {suite.kind}
                </Badge>
              </CardTitle>
              {suite.description && (
                <CardDescription>{suite.description}</CardDescription>
              )}
            </div>
            <ExportPlaywrightButton
              suiteId={suite.id}
              suiteName={suite.name}
              size="lg"
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Test Cases:</span>
              <span className="ml-2 font-medium">{testCases.length}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Created:</span>
              <span className="ml-2 font-medium">
                {new Date(suite.created_at).toLocaleDateString()}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Suite Type:</span>
              <span className="ml-2 font-medium capitalize">{suite.kind}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* What's Included */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileCode className="h-5 w-5" />
            What's Included
          </CardTitle>
          <CardDescription>
            Your export will contain a complete Playwright project
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-start gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
            <div>
              <p className="font-medium">Project Configuration</p>
              <p className="text-sm text-muted-foreground">
                package.json, playwright.config.ts, TypeScript setup
              </p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
            <div>
              <p className="font-medium">Test Specifications</p>
              <p className="text-sm text-muted-foreground">
                {testCases.length} TypeScript test files with step-by-step
                execution
                {suite.kind === "cross-platform" &&
                  " across multiple platforms"}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
            <div>
              <p className="font-medium">Test Data Snapshots</p>
              <p className="text-sm text-muted-foreground">
                JSON snapshots of all test cases and expected results
              </p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
            <div>
              <p className="font-medium">Documentation</p>
              <p className="text-sm text-muted-foreground">
                README with setup instructions and usage guide
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Test Cases Preview */}
      {testCases.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Test Cases ({testCases.length})</CardTitle>
            <CardDescription>
              These test cases will be included in your export
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {testCases.map((tc, idx) => (
                <div
                  key={tc.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <span className="text-sm text-muted-foreground font-mono">
                      #{String(idx + 1).padStart(2, "0")}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{tc.title}</p>
                      {tc.description && (
                        <p className="text-sm text-muted-foreground line-clamp-1">
                          {tc.description}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {tc.test_type && (
                      <Badge variant="outline" className="capitalize">
                        {tc.test_type}
                      </Badge>
                    )}
                    {tc.platform && (
                      <Badge variant="secondary" className="capitalize">
                        {tc.platform}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {testCases.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Test Cases</h3>
            <p className="text-sm text-muted-foreground mb-4">
              This suite doesn't have any test cases yet.
            </p>
            <Button
              variant="outline"
              onClick={() => router.push(`/test-library`)}
            >
              Manage Test Cases
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Next Steps */}
      <Card>
        <CardHeader>
          <CardTitle>Next Steps</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
            <li>Extract the ZIP file to your desired location</li>
            <li>
              Run <code className="px-1.5 py-0.5 rounded bg-muted">pnpm i</code>{" "}
              and{" "}
              <code className="px-1.5 py-0.5 rounded bg-muted">
                npx playwright install
              </code>
            </li>
            <li>
              Copy{" "}
              <code className="px-1.5 py-0.5 rounded bg-muted">
                .env.example
              </code>{" "}
              to <code className="px-1.5 py-0.5 rounded bg-muted">.env</code>{" "}
              and configure BASE_URL
            </li>
            <li>Implement selectors and assertions in the TODO blocks</li>
            <li>
              Run tests with{" "}
              <code className="px-1.5 py-0.5 rounded bg-muted">pnpm test</code>
            </li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
