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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
  MoreHorizontal,
  XCircle,
  Monitor,
  Smartphone,
  Globe,
  Eye,
  Zap,
  ExternalLink,
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

type Props = {
  testCases: CombinedTestCase[];
  paginated: CombinedTestCase[];
  filteredCount: number;

  execution: TestExecution;
  updating: string | null;

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
  getApprovalStatusBadge?: (status?: string) => React.ReactNode;
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
    getApprovalStatusBadge,
    getRelativeTime,
    onOpenDetails,
    onOpenCreate,
    onOpenActionSheet,
    onUpdateStatus,
  } = props;

  // Calculate stats
  const passed = testCases.filter(
    (tc) => execution[tc.id]?.status === "passed",
  ).length;
  const failed = testCases.filter(
    (tc) => execution[tc.id]?.status === "failed",
  ).length;
  const blocked = testCases.filter(
    (tc) => execution[tc.id]?.status === "blocked",
  ).length;
  const inProgress = testCases.filter(
    (tc) => execution[tc.id]?.status === "in_progress",
  ).length;
  const notRun = testCases.filter(
    (tc) => execution[tc.id]?.status === "not_run",
  ).length;

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
      case "skipped":
        return <Circle className="h-4 w-4 text-gray-400" />;
      default:
        return <Circle className="h-4 w-4 text-gray-400" />;
    }
  };

  const isRegularCase = (tc: CombinedTestCase): tc is TestCase => {
    return tc._caseType === "regular" || !tc._caseType;
  };

  const isCrossPlatformCase = (
    tc: CombinedTestCase,
  ): tc is CrossPlatformTestCase => {
    return tc._caseType === "cross-platform";
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <div className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-4 rounded-lg border shadow-sm">
          <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            {filteredCount}
          </div>
          <div className="text-sm text-slate-600 dark:text-slate-400">
            Total
          </div>
        </div>
        <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 p-4 rounded-lg border border-green-200 dark:border-green-800 shadow-sm">
          <div className="text-2xl font-bold text-green-700 dark:text-green-400">
            {passed}
          </div>
          <div className="text-sm text-green-600 dark:text-green-500">
            Passed
          </div>
        </div>
        <div className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 p-4 rounded-lg border border-red-200 dark:border-red-800 shadow-sm">
          <div className="text-2xl font-bold text-red-700 dark:text-red-400">
            {failed}
          </div>
          <div className="text-sm text-red-600 dark:text-red-500">Failed</div>
        </div>
        <div className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 p-4 rounded-lg border border-orange-200 dark:border-orange-800 shadow-sm">
          <div className="text-2xl font-bold text-orange-700 dark:text-orange-400">
            {blocked}
          </div>
          <div className="text-sm text-orange-600 dark:text-orange-500">
            Blocked
          </div>
        </div>
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800 shadow-sm">
          <div className="text-2xl font-bold text-blue-700 dark:text-blue-400">
            {inProgress}
          </div>
          <div className="text-sm text-blue-600 dark:text-blue-500">
            In Progress
          </div>
        </div>
        <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900/20 dark:to-gray-800/20 p-4 rounded-lg border border-gray-200 dark:border-gray-800 shadow-sm">
          <div className="text-2xl font-bold text-gray-700 dark:text-gray-400">
            {notRun}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-500">
            Not Run
          </div>
        </div>
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
                            className={`h-4 w-4 flex-shrink-0 ${getProjectColor(
                              testCase.projects.color,
                            )}`}
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
                      {isCrossPlatform && getApprovalStatusBadge ? (
                        getApprovalStatusBadge(testCase.status)
                      ) : onUpdateStatus && isRegular ? (
                        <Select
                          value={testCase.status}
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
