// components/test-suites/TestSuiteTable.tsx
"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FileText, FolderOpen, Target, Layers, FileCode } from "lucide-react";
import type { TestSuite } from "@/types/test-cases";

type Props = {
  suites: TestSuite[];
  searchTerm: string;
  filterType: string;
  onCreateSuite: () => void;
  onViewDetails: (suite: TestSuite) => void;
  getStatusIcon: (status: string) => React.ReactNode;
  getStatusBadge: (status: string) => React.ReactNode;
  getSuiteTypeColor: (type: string) => string;
  getDisplaySuiteType: (suite: TestSuite) => string;
  getProjectColor: (color: string) => string;
};

export function TestSuiteTable({
  suites,
  searchTerm,
  filterType,
  onCreateSuite,
  onViewDetails,
  getStatusIcon,
  getStatusBadge,
  getSuiteTypeColor,
  getDisplaySuiteType,
  getProjectColor,
}: Props) {
  return (
    <div className="border rounded-lg" data-testid="suite-table">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Suite Name</TableHead>
            <TableHead className="w-[120px]">Kind</TableHead>
            <TableHead className="w-[120px]">Type</TableHead>
            <TableHead className="w-[140px]">Project</TableHead>
            <TableHead className="w-[100px]">Status</TableHead>
            <TableHead className="w-[100px]">Test Cases</TableHead>
            <TableHead className="w-[200px]">Progress</TableHead>
            <TableHead className="w-[180px] text-right">Details</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody data-testid="suite-table-body">
          {suites.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="text-center py-12">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  No test suites found
                </h3>
                <p className="text-muted-foreground mb-4">
                  {searchTerm || filterType !== "all"
                    ? "Try adjusting your search or filters"
                    : "Create your first test suite to get started"}
                </p>
                {!searchTerm && filterType === "all" && (
                  <Button
                    onClick={onCreateSuite}
                    data-testid="btn-create-first-suite"
                  >
                    Create Test Suite
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ) : (
            suites.map((suite) => {
              const suiteKind = (suite as any).kind || "regular";

              return (
                <TableRow
                  key={suite.id}
                  className="group"
                  data-testid="suite-row"
                  data-suite-id={suite.id}
                  data-suite-name={suite.name}
                >
                  <TableCell>
                    <div className="space-y-1">
                      <div
                        className="font-medium flex items-center gap-2"
                        data-testid="suite-name"
                      >
                        {getStatusIcon(suite.status)}
                        {suite.name}
                      </div>
                      <div className="text-sm text-muted-foreground line-clamp-1">
                        {suite.description || "No description"}
                      </div>
                    </div>
                  </TableCell>

                  <TableCell>
                    <Badge
                      variant={
                        suiteKind === "cross-platform" ? "secondary" : "outline"
                      }
                      className="capitalize"
                      data-testid="suite-kind-badge"
                    >
                      <div className="flex items-center gap-1">
                        {suiteKind === "cross-platform" ? (
                          <>
                            <Layers className="h-3 w-3" />
                            Cross-Platform
                          </>
                        ) : (
                          <>
                            <FileCode className="h-3 w-3" />
                            Regular
                          </>
                        )}
                      </div>
                    </Badge>
                  </TableCell>

                  <TableCell>
                    <Badge
                      className={getSuiteTypeColor(getDisplaySuiteType(suite))}
                      data-testid="suite-type-badge"
                    >
                      {getDisplaySuiteType(suite)}
                    </Badge>
                  </TableCell>

                  <TableCell>
                    {suite.projects ? (
                      <div
                        className="flex items-center gap-2"
                        data-testid="suite-project"
                      >
                        <FolderOpen
                          className={`h-4 w-4 ${getProjectColor(
                            suite.projects.color,
                          )}`}
                        />
                        <span className="text-sm truncate">
                          {suite.projects.name}
                        </span>
                      </div>
                    ) : (
                      <span
                        className="text-xs text-muted-foreground"
                        data-testid="suite-no-project"
                      >
                        No project
                      </span>
                    )}
                  </TableCell>

                  <TableCell data-testid="suite-status">
                    {getStatusBadge(suite.status)}
                  </TableCell>

                  <TableCell>
                    <div
                      className="flex items-center gap-2"
                      data-testid="suite-test-case-count"
                    >
                      <Target className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">
                        {suite.test_case_count}
                      </span>
                    </div>
                  </TableCell>

                  <TableCell>
                    {suite.execution_stats &&
                    suite.execution_stats.total > 0 ? (
                      <div className="space-y-2" data-testid="suite-progress">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">
                            Pass Rate
                          </span>
                          <span
                            className="font-medium"
                            data-testid="suite-pass-rate"
                          >
                            {Math.round(
                              (suite.execution_stats.passed /
                                suite.execution_stats.total) *
                                100,
                            )}
                            %
                          </span>
                        </div>
                        <Progress
                          value={
                            (suite.execution_stats.passed /
                              suite.execution_stats.total) *
                            100
                          }
                          className="h-2"
                        />
                        <div className="flex gap-3 text-xs">
                          <span
                            className="text-green-600"
                            data-testid="suite-passed-count"
                          >
                            ✓ {suite.execution_stats.passed}
                          </span>
                          <span
                            className="text-red-600"
                            data-testid="suite-failed-count"
                          >
                            ✗ {suite.execution_stats.failed}
                          </span>
                          <span
                            className="text-orange-600"
                            data-testid="suite-blocked-count"
                          >
                            ⚠ {suite.execution_stats.blocked}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <span
                        className="text-sm text-muted-foreground"
                        data-testid="suite-no-runs"
                      >
                        No runs yet
                      </span>
                    )}
                  </TableCell>

                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onViewDetails(suite)}
                      data-testid="btn-suite-details"
                      data-suite-id={suite.id}
                    >
                      Details
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}
