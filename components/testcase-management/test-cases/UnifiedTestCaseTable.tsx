// components/testcase-management/UnifiedTestCaseTable.tsx
"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Circle,
  Clock,
  FlaskConical,
  FolderOpen,
  Loader2,
  Monitor,
  Smartphone,
  Globe,
  Eye,
  Zap,
  ExternalLink,
  XCircle,
} from "lucide-react";

import type {
  TestCase,
  CrossPlatformTestCase,
  TestExecution,
} from "@/types/test-cases";

const platformIcons = {
  web: Monitor,
  mobile: Smartphone,
  api: Globe,
  accessibility: Eye,
  performance: Zap,
};

type CombinedTestCase = (TestCase | CrossPlatformTestCase) & {
  _caseType?: "regular" | "cross-platform";
};

// Pre-computed metrics passed in from the parent.
// Driven by useStats (all-time DB values) rather than derived from
// the local execution state map which only reflects the current session.
export type TableMetrics = {
  total: number;
  passed: number;
  failed: number;
  blocked: number;
  inProgress: number;
  notRun: number;
};

type Props = {
  testCases: CombinedTestCase[];
  paginated: CombinedTestCase[];
  filteredCount: number;

  execution: TestExecution;
  updating: string | null;

  /** All-time stats from useStats. Falls back to deriving from execution if absent. */
  metrics?: TableMetrics;

  selectedIds: Set<string>;
  selectAll: () => void;
  deselectAll: () => void;
  toggleSelection: (id: string) => void;

  currentPage: number;
  totalPages: number;
  startIndex: number;
  endIndex: number;
  onPrevPage: () => void;
  onNextPage: () => void;

  getPriorityColor: (priority: string) => string;
  getProjectColor: (color: string) => string;
  getRelativeTime?: (date: string) => string;

  onOpenDetails: (tc: CombinedTestCase) => void;
  onOpenCreate: () => void;
  onOpenActionSheet: (tc: CombinedTestCase) => void;
  onUpdateStatus?: (
    testCaseId: string,
    status: "draft" | "active" | "archived",
  ) => void;
};

export function UnifiedTestCaseTable(props: Props) {
  const {
    testCases,
    paginated,
    filteredCount,
    execution,
    updating,
    metrics,
    selectedIds,
    selectAll,
    deselectAll,
    toggleSelection,
    currentPage,
    totalPages,
    startIndex,
    endIndex,
    onPrevPage,
    onNextPage,
    getPriorityColor,
    getProjectColor,
    getRelativeTime,
    onOpenDetails,
    onOpenCreate,
    onOpenActionSheet,
    onUpdateStatus,
  } = props;

  // Use passed-in metrics if available (all-time from useStats),
  // otherwise fall back to deriving from local execution state.
  const displayMetrics: TableMetrics = metrics ?? {
    total: filteredCount,
    passed: testCases.filter((tc) => execution[tc.id]?.status === "passed")
      .length,
    failed: testCases.filter((tc) => execution[tc.id]?.status === "failed")
      .length,
    blocked: testCases.filter((tc) => execution[tc.id]?.status === "blocked")
      .length,
    inProgress: testCases.filter(
      (tc) => execution[tc.id]?.status === "in_progress",
    ).length,
    notRun: testCases.filter(
      (tc) => !execution[tc.id] || execution[tc.id]?.status === "not_run",
    ).length,
  };

  const getExecutionIcon = (status?: string) => {
    switch (status) {
      case "passed":
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case "failed":
        return <XCircle className="h-4 w-4 text-red-600" />;
      case "blocked":
        return <AlertTriangle className="h-4 w-4 text-orange-600" />;
      case "in_progress":
        return <Clock className="h-4 w-4 text-blue-600" />;
      default:
        return <Circle className="h-4 w-4 text-gray-400" />;
    }
  };

  const isRegularCase = (tc: CombinedTestCase): tc is TestCase =>
    tc._caseType === "regular" || !tc._caseType;

  const isCrossPlatformCase = (
    tc: CombinedTestCase,
  ): tc is CrossPlatformTestCase => tc._caseType === "cross-platform";

  const statCards = [
    { label: "Total", value: displayMetrics.total, color: "white" },
    { label: "Passed", value: displayMetrics.passed, color: "green" },
    { label: "Failed", value: displayMetrics.failed, color: "red" },
    { label: "Blocked", value: displayMetrics.blocked, color: "orange" },
    { label: "In Progress", value: displayMetrics.inProgress, color: "cyan" },
    { label: "Not Run", value: displayMetrics.notRun, color: "gray" },
  ] as const;

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        {statCards.map(({ label, value, color }) => (
          <div
            key={label}
            className={`bg-gradient-to-br from-${color}-50 to-${color}-500 dark:from-${color}-900/20 dark:to-${color}-800/20 p-4 rounded-lg border border-${color}-200 dark:border-${color}-800 shadow-sm`}
          >
            <div
              className={`text-2xl font-bold text-${color}-700 dark:text-${color}-400`}
            >
              {value}
            </div>
            <div className={`text-sm text-${color}-600 dark:text-${color}-500`}>
              {label}
            </div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-hidden shadow-sm bg-card">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-[50px]">
                <Checkbox
                  checked={
                    selectedIds.size === testCases.length &&
                    testCases.length > 0
                  }
                  onCheckedChange={(checked) =>
                    checked ? selectAll() : deselectAll()
                  }
                />
              </TableHead>
              <TableHead className="w-[360px]">Test Case</TableHead>
              <TableHead className="w-[140px] font-semibold">
                Type/Platform
              </TableHead>
              <TableHead className="w-[160px] font-semibold">Project</TableHead>
              <TableHead className="w-[120px] font-semibold">Status</TableHead>
              <TableHead className="w-[110px] font-semibold">
                Priority
              </TableHead>
              <TableHead className="w-[80px] text-right font-semibold">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {paginated.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12">
                  <div className="flex flex-col items-center gap-3">
                    <FlaskConical className="h-12 w-12 text-muted-foreground" />
                    <div className="space-y-1">
                      <p className="text-lg font-semibold">
                        No test cases found
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Create your first test case to get started
                      </p>
                    </div>
                    <Button
                      onClick={onOpenCreate}
                      variant="default"
                      className="mt-2"
                    >
                      Create Test Case
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              paginated.map((testCase) => {
                const exec = execution[testCase.id];
                const isRegular = isRegularCase(testCase);
                const isCrossPlatform = isCrossPlatformCase(testCase);

                return (
                  <TableRow
                    key={testCase.id}
                    className="group hover:bg-muted/30 transition-colors"
                  >
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selectedIds.has(testCase.id)}
                        onCheckedChange={() => toggleSelection(testCase.id)}
                      />
                    </TableCell>

                    <TableCell className="w-[360px] max-w-[360px] font-medium">
                      <div
                        className="flex items-start gap-3 cursor-pointer"
                        onClick={() => onOpenDetails(testCase)}
                      >
                        <div className="mt-0.5 shrink-0">
                          {getExecutionIcon(exec?.status)}
                        </div>
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="truncate hover:text-primary transition-colors">
                              {testCase.title}
                            </span>
                            {exec?.duration_minutes && (
                              <Badge
                                variant="outline"
                                className="text-xs shrink-0"
                              >
                                {exec.duration_minutes}m
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-1">
                            {testCase.description}
                          </p>
                        </div>
                      </div>
                    </TableCell>

                    <TableCell>
                      {isCrossPlatform ? (
                        <div className="flex items-center gap-2">
                          {(() => {
                            const Icon =
                              platformIcons[
                                testCase.platform as keyof typeof platformIcons
                              ];
                            return Icon ? (
                              <Icon className="h-4 w-4 text-muted-foreground" />
                            ) : null;
                          })()}
                          <div className="space-y-1">
                            <Badge variant="default" className="text-xs">
                              {testCase.platform}
                            </Badge>
                            <p className="text-xs text-muted-foreground">
                              {testCase.framework}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <Badge variant="secondary" className="text-xs">
                          {testCase.test_type}
                        </Badge>
                      )}
                    </TableCell>

                    <TableCell>
                      {testCase.projects ? (
                        <div className="flex items-center gap-2 min-w-0">
                          <FolderOpen
                            className={`h-4 w-4 flex-shrink-0 ${getProjectColor(testCase.projects.color)}`}
                          />
                          <span className="text-sm truncate">
                            {testCase.projects.name}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          No project
                        </span>
                      )}
                    </TableCell>

                    <TableCell>
                      {onUpdateStatus ? (
                        <Select
                          value={testCase.status as any}
                          onValueChange={(
                            value: "draft" | "active" | "archived",
                          ) => onUpdateStatus(testCase.id, value)}
                          disabled={updating === testCase.id}
                        >
                          <SelectTrigger className="w-[120px] h-8">
                            {updating === testCase.id ? (
                              <Loader2 className="h-3 w-3 animate-spin mr-2" />
                            ) : null}
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="draft">Draft</SelectItem>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="archived">Archived</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge variant="outline" className="capitalize">
                          {testCase.status}
                        </Badge>
                      )}
                    </TableCell>

                    <TableCell>
                      <Badge className={getPriorityColor(testCase.priority)}>
                        {testCase.priority}
                      </Badge>
                    </TableCell>

                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => onOpenActionSheet(testCase)}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-2">
          <p className="text-sm text-muted-foreground">
            Showing <span className="font-medium">{startIndex + 1}</span>-
            <span className="font-medium">
              {Math.min(endIndex, filteredCount)}
            </span>{" "}
            of <span className="font-medium">{filteredCount}</span> test cases
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onPrevPage}
              disabled={currentPage === 1}
              className="h-8"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>
            <div className="flex items-center gap-1 px-2">
              <span className="text-sm font-medium">{currentPage}</span>
              <span className="text-sm text-muted-foreground">of</span>
              <span className="text-sm font-medium">{totalPages}</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={onNextPage}
              disabled={currentPage === totalPages}
              className="h-8"
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
