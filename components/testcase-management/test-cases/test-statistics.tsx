// components/test-cases/test-statistics.tsx
"use client";

import { useMemo } from "react";
import {
  Shield,
  AlertTriangle,
  Maximize2,
  Workflow,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

interface TestCase {
  is_negative_test: boolean;
  is_security_test: boolean;
  is_boundary_test: boolean;
  is_edge_case: boolean;
  priority: string;
  status?: string;
}

interface TestStatisticsProps {
  testCases: TestCase[];
  showDetails?: boolean;
}

export function TestStatistics({
  testCases,
  showDetails = true,
}: TestStatisticsProps) {
  const stats = useMemo(() => {
    const total = testCases.length;
    const negative = testCases.filter((tc) => tc.is_negative_test).length;
    const security = testCases.filter((tc) => tc.is_security_test).length;
    const boundary = testCases.filter((tc) => tc.is_boundary_test).length;
    const edge = testCases.filter((tc) => tc.is_edge_case).length;
    const positive = total - negative; // Assuming non-negative tests are positive

    // Priority breakdown
    const critical = testCases.filter(
      (tc) => tc.priority === "critical"
    ).length;
    const high = testCases.filter((tc) => tc.priority === "high").length;
    const medium = testCases.filter((tc) => tc.priority === "medium").length;
    const low = testCases.filter((tc) => tc.priority === "low").length;

    // Status breakdown (if available)
    const passed = testCases.filter((tc) => tc.status === "passed").length;
    const failed = testCases.filter((tc) => tc.status === "failed").length;
    const blocked = testCases.filter((tc) => tc.status === "blocked").length;
    const pending = testCases.filter(
      (tc) => tc.status === "draft" || tc.status === "pending" || !tc.status
    ).length;

    return {
      total,
      positive,
      negative,
      security,
      boundary,
      edge,
      priority: { critical, high, medium, low },
      status: { passed, failed, blocked, pending },
    };
  }, [testCases]);

  const calculatePercentage = (count: number) => {
    return stats.total > 0 ? Math.round((count / stats.total) * 100) : 0;
  };

  if (stats.total === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs">Total Tests</CardDescription>
            <CardTitle className="text-2xl">{stats.total}</CardTitle>
          </CardHeader>
        </Card>

        <Card className="border-green-200 bg-green-50/50">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" />
              Positive
            </CardDescription>
            <CardTitle className="text-2xl">{stats.positive}</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-xs text-muted-foreground">
              {calculatePercentage(stats.positive)}% of total
            </p>
          </CardContent>
        </Card>

        <Card className="border-orange-200 bg-orange-50/50">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              Negative
            </CardDescription>
            <CardTitle className="text-2xl">{stats.negative}</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-xs text-muted-foreground">
              {calculatePercentage(stats.negative)}% of total
            </p>
          </CardContent>
        </Card>

        <Card className="border-red-200 bg-red-50/50">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs flex items-center gap-1">
              <Shield className="h-3 w-3" />
              Security
            </CardDescription>
            <CardTitle className="text-2xl">{stats.security}</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-xs text-muted-foreground">
              {calculatePercentage(stats.security)}% of total
            </p>
          </CardContent>
        </Card>

        <Card className="border-blue-200 bg-blue-50/50">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs flex items-center gap-1">
              <Maximize2 className="h-3 w-3" />
              Boundary
            </CardDescription>
            <CardTitle className="text-2xl">{stats.boundary}</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-xs text-muted-foreground">
              {calculatePercentage(stats.boundary)}% of total
            </p>
          </CardContent>
        </Card>
      </div>

      {showDetails && (
        <>
          {/* Priority Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Priority Distribution</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-muted-foreground">Critical</span>
                  <span className="font-medium">
                    {stats.priority.critical} (
                    {calculatePercentage(stats.priority.critical)}%)
                  </span>
                </div>
                <Progress
                  value={calculatePercentage(stats.priority.critical)}
                  className="h-2"
                />
              </div>

              <div>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-muted-foreground">High</span>
                  <span className="font-medium">
                    {stats.priority.high} (
                    {calculatePercentage(stats.priority.high)}%)
                  </span>
                </div>
                <Progress
                  value={calculatePercentage(stats.priority.high)}
                  className="h-2"
                />
              </div>

              <div>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-muted-foreground">Medium</span>
                  <span className="font-medium">
                    {stats.priority.medium} (
                    {calculatePercentage(stats.priority.medium)}%)
                  </span>
                </div>
                <Progress
                  value={calculatePercentage(stats.priority.medium)}
                  className="h-2"
                />
              </div>

              <div>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-muted-foreground">Low</span>
                  <span className="font-medium">
                    {stats.priority.low} (
                    {calculatePercentage(stats.priority.low)}%)
                  </span>
                </div>
                <Progress
                  value={calculatePercentage(stats.priority.low)}
                  className="h-2"
                />
              </div>
            </CardContent>
          </Card>

          {/* Test Type Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Test Coverage Analysis</CardTitle>
              <CardDescription className="text-xs">
                Distribution of test types for comprehensive coverage
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-green-500" />
                    <span className="text-sm">Happy Path Tests</span>
                  </div>
                  <span className="text-sm font-medium">{stats.positive}</span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-orange-500" />
                    <span className="text-sm">Negative/Unhappy Path</span>
                  </div>
                  <span className="text-sm font-medium">{stats.negative}</span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-red-500" />
                    <span className="text-sm">Security Tests</span>
                  </div>
                  <span className="text-sm font-medium">{stats.security}</span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-blue-500" />
                    <span className="text-sm">Boundary/Limit Tests</span>
                  </div>
                  <span className="text-sm font-medium">{stats.boundary}</span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-purple-500" />
                    <span className="text-sm">Edge Cases</span>
                  </div>
                  <span className="text-sm font-medium">{stats.edge}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Execution Status (if available) */}
          {(stats.status.passed > 0 ||
            stats.status.failed > 0 ||
            stats.status.blocked > 0) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Execution Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {stats.status.passed > 0 && (
                  <div>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                        Passed
                      </span>
                      <span className="font-medium">
                        {stats.status.passed} (
                        {calculatePercentage(stats.status.passed)}%)
                      </span>
                    </div>
                    <Progress
                      value={calculatePercentage(stats.status.passed)}
                      className="h-2 bg-green-100"
                    />
                  </div>
                )}

                {stats.status.failed > 0 && (
                  <div>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="flex items-center gap-2">
                        <XCircle className="h-4 w-4 text-red-600" />
                        Failed
                      </span>
                      <span className="font-medium">
                        {stats.status.failed} (
                        {calculatePercentage(stats.status.failed)}%)
                      </span>
                    </div>
                    <Progress
                      value={calculatePercentage(stats.status.failed)}
                      className="h-2 bg-red-100"
                    />
                  </div>
                )}

                {stats.status.blocked > 0 && (
                  <div>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-yellow-600" />
                        Blocked
                      </span>
                      <span className="font-medium">
                        {stats.status.blocked} (
                        {calculatePercentage(stats.status.blocked)}%)
                      </span>
                    </div>
                    <Progress
                      value={calculatePercentage(stats.status.blocked)}
                      className="h-2 bg-yellow-100"
                    />
                  </div>
                )}

                {stats.status.pending > 0 && (
                  <div>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="flex items-center gap-2">
                        <Workflow className="h-4 w-4 text-gray-600" />
                        Pending
                      </span>
                      <span className="font-medium">
                        {stats.status.pending} (
                        {calculatePercentage(stats.status.pending)}%)
                      </span>
                    </div>
                    <Progress
                      value={calculatePercentage(stats.status.pending)}
                      className="h-2 bg-gray-100"
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
