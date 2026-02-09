// components/testcase-management/test-cases/ExecutionHistoryTab.tsx
"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Circle,
  Clock,
  User,
  Calendar,
  Monitor,
  FileText,
  Download,
  Loader2,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

type ExecutionHistoryItem = {
  id: string;
  execution_status: string;
  executed_by: string;
  execution_type: string;
  test_environment: string;
  browser?: string;
  os_version?: string;
  device_type?: string;
  duration_seconds?: number;
  notes?: string;
  failure_reason?: string;
  started_at: string;
  completed_at?: string;
  completed_steps?: number[];
  failed_steps?: Array<{ step_number: number; failure_reason: string }>;
};

interface ExecutionHistoryTabProps {
  testCaseId: string;
  caseType: "regular" | "cross-platform";
}

export function ExecutionHistoryTab({
  testCaseId,
  caseType,
}: ExecutionHistoryTabProps) {
  const [loading, setLoading] = useState(true);
  const [executions, setExecutions] = useState<ExecutionHistoryItem[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    passed: 0,
    failed: 0,
    blocked: 0,
    passRate: 0,
    avgDuration: 0,
  });

  useEffect(() => {
    fetchExecutionHistory();
  }, [testCaseId, caseType]);

  const fetchExecutionHistory = async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const table =
        caseType === "regular" ? "test_executions" : "platform_test_executions";

      const { data, error } = await supabase
        .from(table)
        .select("*")
        .eq("test_case_id", testCaseId)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;

      setExecutions(data || []);

      // Calculate stats
      const total = data?.length || 0;
      const passed =
        data?.filter((e) => e.execution_status === "passed").length || 0;
      const failed =
        data?.filter((e) => e.execution_status === "failed").length || 0;
      const blocked =
        data?.filter((e) => e.execution_status === "blocked").length || 0;
      const passRate = total > 0 ? Math.round((passed / total) * 100) : 0;

      const durations =
        data
          ?.filter((e) => e.duration_seconds)
          .map((e) => e.duration_seconds) || [];
      const avgDuration =
        durations.length > 0
          ? Math.round(
              durations.reduce((a, b) => a + b, 0) / durations.length / 60,
            )
          : 0;

      setStats({ total, passed, failed, blocked, passRate, avgDuration });
    } catch (error) {
      console.error("Error fetching execution history:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "passed":
        return <CheckCircle2 className="h-5 w-5 text-green-600" />;
      case "failed":
        return <XCircle className="h-5 w-5 text-red-600" />;
      case "blocked":
        return <AlertTriangle className="h-5 w-5 text-orange-600" />;
      case "in_progress":
        return <Clock className="h-5 w-5 text-blue-600" />;
      default:
        return <Circle className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const config = {
      passed: {
        variant: "default" as const,
        className: "bg-green-500 hover:bg-green-600",
      },
      failed: { variant: "destructive" as const, className: "" },
      blocked: {
        variant: "secondary" as const,
        className: "bg-orange-500 hover:bg-orange-600 text-white",
      },
      skipped: { variant: "outline" as const, className: "" },
      in_progress: {
        variant: "default" as const,
        className: "bg-blue-500 hover:bg-blue-600",
      },
    };
    const s = config[status as keyof typeof config] || config.skipped;
    return (
      <Badge variant={s.variant} className={s.className}>
        {status.replace("_", " ")}
      </Badge>
    );
  };

  const exportHistory = () => {
    const csv = [
      ["Date", "Status", "Environment", "Duration (min)", "Notes"].join(","),
      ...executions.map((e) =>
        [
          new Date(e.started_at).toLocaleString(),
          e.execution_status,
          e.test_environment,
          e.duration_seconds ? Math.round(e.duration_seconds / 60) : "",
          e.notes || "",
        ].join(","),
      ),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `execution-history-${testCaseId}.csv`;
    a.click();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Runs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card className="border-green-200 dark:border-green-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-600 dark:text-green-400">
              Passed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {stats.passed}
            </div>
          </CardContent>
        </Card>

        <Card className="border-red-200 dark:border-red-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-red-600 dark:text-red-400">
              Failed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">
              {stats.failed}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pass Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div className="text-2xl font-bold">{stats.passRate}%</div>
              {stats.passRate >= 80 ? (
                <TrendingUp className="h-4 w-4 text-green-600" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-600" />
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Export Button */}
      {executions.length > 0 && (
        <div className="flex justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={exportHistory}
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        </div>
      )}

      {/* Execution Timeline */}
      {executions.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Clock className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No execution history</h3>
            <p className="text-sm text-muted-foreground">
              Run this test case to start building execution history
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {executions.map((exec, idx) => (
            <Card key={exec.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4 flex-1">
                    <div className="mt-1">
                      {getStatusIcon(exec.execution_status)}
                    </div>

                    <div className="flex-1 space-y-3">
                      <div className="flex items-center gap-3 flex-wrap">
                        {getStatusBadge(exec.execution_status)}
                        <Badge variant="outline" className="capitalize">
                          {exec.execution_type}
                        </Badge>
                        <Badge variant="secondary">
                          {exec.test_environment}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          {new Date(exec.started_at).toLocaleString()}
                          <span className="text-xs">
                            ({formatDistanceToNow(new Date(exec.started_at))}{" "}
                            ago)
                          </span>
                        </div>

                        {exec.duration_seconds && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Clock className="h-4 w-4" />
                            Duration: {Math.round(exec.duration_seconds / 60)}m
                          </div>
                        )}

                        {exec.browser && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Monitor className="h-4 w-4" />
                            {exec.browser}
                            {exec.os_version && ` • ${exec.os_version}`}
                          </div>
                        )}

                        {exec.device_type && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Monitor className="h-4 w-4" />
                            {exec.device_type}
                          </div>
                        )}
                      </div>

                      {/* Completed Steps */}
                      {exec.completed_steps &&
                        exec.completed_steps.length > 0 && (
                          <div className="text-sm">
                            <span className="text-muted-foreground">
                              Completed steps: {exec.completed_steps.join(", ")}
                            </span>
                          </div>
                        )}

                      {/* Failed Steps */}
                      {exec.failed_steps && exec.failed_steps.length > 0 && (
                        <div className="space-y-1">
                          {exec.failed_steps.map((fs, i) => (
                            <div
                              key={i}
                              className="text-sm bg-red-50 dark:bg-red-950/20 p-2 rounded"
                            >
                              <span className="font-medium text-red-700 dark:text-red-400">
                                Step {fs.step_number} failed:
                              </span>{" "}
                              <span className="text-red-600 dark:text-red-400">
                                {fs.failure_reason}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Notes */}
                      {exec.notes && (
                        <div className="text-sm bg-muted p-3 rounded">
                          <div className="flex items-start gap-2">
                            <FileText className="h-4 w-4 mt-0.5 text-muted-foreground" />
                            <p className="text-muted-foreground">
                              {exec.notes}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Failure Reason */}
                      {exec.failure_reason && (
                        <div className="text-sm bg-red-50 dark:bg-red-950/20 p-3 rounded border border-red-200 dark:border-red-800">
                          <p className="font-medium text-red-700 dark:text-red-400 mb-1">
                            Failure Reason:
                          </p>
                          <p className="text-red-600 dark:text-red-400">
                            {exec.failure_reason}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>

              {idx < executions.length - 1 && <Separator />}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
