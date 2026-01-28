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
import { FileText, FolderOpen, Target } from "lucide-react";
import type { TestSuite } from "@/types/test-cases";

type Props = {
  suites: TestSuite[];
  searchTerm: string;
  filterType: string;
  onCreateSuite: () => void;

  // change this:
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
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Suite Name</TableHead>
            <TableHead className="w-[120px]">Type</TableHead>
            <TableHead className="w-[140px]">Project</TableHead>
            <TableHead className="w-[100px]">Status</TableHead>
            <TableHead className="w-[100px]">Test Cases</TableHead>
            <TableHead className="w-[200px]">Progress</TableHead>
            <TableHead className="w-[180px] text-right">Details</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {suites.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center py-12">
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
                  <Button onClick={onCreateSuite}>Create Test Suite</Button>
                )}
              </TableCell>
            </TableRow>
          ) : (
            suites.map((suite) => (
              <TableRow key={suite.id} className="group">
                <TableCell>
                  <div className="space-y-1">
                    <div className="font-medium flex items-center gap-2">
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
                    className={getSuiteTypeColor(getDisplaySuiteType(suite))}
                  >
                    {getDisplaySuiteType(suite)}
                  </Badge>
                </TableCell>

                <TableCell>
                  {suite.projects ? (
                    <div className="flex items-center gap-2">
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
                    <span className="text-xs text-muted-foreground">
                      No project
                    </span>
                  )}
                </TableCell>

                <TableCell>{getStatusBadge(suite.status)}</TableCell>

                <TableCell>
                  <div className="flex items-center gap-2">
                    <Target className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{suite.test_case_count}</span>
                  </div>
                </TableCell>

                <TableCell>
                  {suite.execution_stats && suite.execution_stats.total > 0 ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Pass Rate</span>
                        <span className="font-medium">
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
                        <span className="text-green-600">
                          ✓ {suite.execution_stats.passed}
                        </span>
                        <span className="text-red-600">
                          ✗ {suite.execution_stats.failed}
                        </span>
                        <span className="text-orange-600">
                          ⚠ {suite.execution_stats.blocked}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <span className="text-sm text-muted-foreground">
                      No runs yet
                    </span>
                  )}
                </TableCell>

                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onViewDetails(suite)}
                  >
                    Details
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
