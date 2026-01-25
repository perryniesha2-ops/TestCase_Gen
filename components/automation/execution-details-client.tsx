"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    CheckCircle2,
    XCircle,
    Clock,
    AlertCircle,
    ArrowLeft,
    ExternalLink,
    Loader2,
} from "lucide-react";

interface ExecutionDetailsClientProps {
    executionId: string;
}

export function ExecutionDetailsClient({
                                           executionId,
                                       }: ExecutionDetailsClientProps) {
    const router = useRouter();
    const [execution, setExecution] = useState<any>(null);
    const [testResults, setTestResults] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadExecutionDetails();
    }, [executionId]);

    async function loadExecutionDetails() {
        try {
            const supabase = createClient();

            // Load execution with suite info
            const { data: exec, error: execError } = await supabase
                .from("test_executions")
                .select("*, test_suites(id, name)")
                .eq("id", executionId)
                .single();

            if (execError) {
                console.error("Error loading execution:", execError);
                return;
            }

            // Load individual test results with test case details
            const { data: results, error: resultsError } = await supabase
                .from("test_results")
                .select(
                    `
          id,
          execution_id,
          test_case_id,
          status,
          duration_ms,
          error_message,
          stack_trace,
          created_at,
          test_cases(id, title, description, test_type)
        `
                )
                .eq("execution_id", executionId)
                .order("created_at", { ascending: true });

            if (resultsError) {
                console.error("Error loading test results:", resultsError);
            }

            setExecution(exec);
            setTestResults(results || []);
        } catch (error) {
            console.error("Error loading execution details:", error);
        } finally {
            setLoading(false);
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="text-center">
                    <Loader2 className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-muted-foreground">Loading execution details...</p>
                </div>
            </div>
        );
    }

    if (!execution) {
        return (
            <div className="space-y-6">
                <Card>
                    <CardContent className="py-20 text-center">
                        <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                        <p className="text-lg font-medium">Execution not found</p>
                        <p className="text-muted-foreground mt-2">
                            The requested test execution could not be found
                        </p>
                        <Button
                            variant="outline"
                            className="mt-4"
                            onClick={() => router.back()}
                        >
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Go Back
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    const statusColor =
        execution.execution_status === "passed" ? "default" : "destructive";

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-start justify-between">
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => router.back()}
                        >
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                        <div>
                            <h1 className="text-3xl font-bold">
                                {execution.test_suites?.name || "Test Execution"}
                            </h1>
                            <p className="text-muted-foreground mt-1">
                                {new Date(execution.started_at).toLocaleString()} •{" "}
                                {execution.duration_minutes}m {execution.duration_minutes === 1 ? "minute" : "minutes"}
                            </p>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">

                    <Badge variant={statusColor} className="text-base px-4 py-1">
                        {execution.execution_status?.toUpperCase()}
                    </Badge>
                </div>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Tests</CardTitle>
                        <Clock className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {execution.total_tests || 0}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Test cases executed
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Passed</CardTitle>
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">
                            {execution.passed_tests || 0}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {execution.total_tests > 0
                                ? Math.round(
                                    ((execution.passed_tests || 0) / execution.total_tests) *
                                    100
                                )
                                : 0}
                            % success rate
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Failed</CardTitle>
                        <XCircle className="h-4 w-4 text-red-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-600">
                            {execution.failed_tests || 0}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Tests with errors
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Duration</CardTitle>
                        <Clock className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {execution.duration_minutes}m
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Avg {testResults.length > 0
                            ? Math.round((execution.duration_minutes / testResults.length) * 60)
                            : 0}s per test
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Environment Info */}
            <Card>
                <CardHeader>
                    <CardTitle>Execution Environment</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                            <p className="text-sm text-muted-foreground">Browser</p>
                            <p className="font-medium">
                                {execution.browser || "Unknown"}
                            </p>
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Environment</p>
                            <p className="font-medium">
                                {execution.test_environment || "Unknown"}
                            </p>
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Operating System</p>
                            <p className="font-medium">
                                {execution.os_version || "Unknown"}
                            </p>
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">
                                Playwright Version
                            </p>
                            <p className="font-medium">
                                {execution.playwright_version || "Unknown"}
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Individual Test Results */}
            <Card>
                <CardHeader>
                    <CardTitle>
                        Test Results ({testResults.length})
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {testResults.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                            <p>No individual test results recorded</p>
                            <p className="text-sm mt-2">
                                Tests may not have been linked to test cases
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {testResults.map((result, idx) => {
                                const testCase = Array.isArray(result.test_cases)
                                    ? result.test_cases[0]
                                    : result.test_cases;

                                return (
                                    <div
                                        key={result.id}
                                        className="border rounded-lg p-4 space-y-3 hover:bg-accent/50 transition-colors"
                                    >
                                        {/* Test Header */}
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground font-mono">
                            #{String(idx + 1).padStart(2, "0")}
                          </span>
                                                    <h3 className="font-semibold truncate">
                                                        {testCase?.title || "Untitled Test"}
                                                    </h3>
                                                    <Badge
                                                        variant={
                                                            result.status === "passed"
                                                                ? "default"
                                                                : result.status === "failed"
                                                                    ? "destructive"
                                                                    : "secondary"
                                                        }
                                                    >
                                                        {result.status}
                                                    </Badge>
                                                </div>
                                                {testCase?.description && (
                                                    <p className="text-sm text-muted-foreground mt-1">
                                                        {testCase.description}
                                                    </p>
                                                )}
                                                {testCase?.test_type && (
                                                    <Badge variant="outline" className="mt-2">
                                                        {testCase.test_type}
                                                    </Badge>
                                                )}
                                            </div>
                                            <div className="text-right ml-4">
                                                <p className="text-sm font-medium">
                                                    {(result.duration_ms / 1000).toFixed(1)}s
                                                </p>
                                                {testCase?.id && (
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="mt-1 h-7 text-xs"
                                                        onClick={() =>
                                                            router.push(`/test-cases/${testCase.id}`)
                                                        }
                                                    >
                                                        View Test Case
                                                    </Button>
                                                )}
                                            </div>
                                        </div>

                                        {/* Error Details */}
                                        {result.status === "failed" && result.error_message && (
                                            <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-lg p-3 space-y-2">
                                                <div className="flex items-start gap-2">
                                                    <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-medium text-red-900 dark:text-red-100">
                                                            Error Message
                                                        </p>
                                                        <p className="text-sm text-red-800 dark:text-red-200 mt-1 whitespace-pre-wrap">
                                                            {result.error_message}
                                                        </p>
                                                    </div>
                                                </div>

                                                {/* Stack Trace */}
                                                {result.stack_trace && (
                                                    <details className="mt-2">
                                                        <summary className="text-sm font-medium cursor-pointer text-red-900 dark:text-red-100 hover:underline">
                                                            Show Stack Trace
                                                        </summary>
                                                        <pre className="mt-2 text-xs bg-black/5 dark:bg-black/20 p-3 rounded overflow-x-auto">
                              {result.stack_trace}
                            </pre>
                                                    </details>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}