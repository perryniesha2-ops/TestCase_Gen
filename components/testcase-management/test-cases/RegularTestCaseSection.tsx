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
import { BulkActionsToolbar } from "./toolbars/BulkActionsToolbar";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Circle,
  Clock,
  FileDown,
  FlaskConical,
  Loader2,
  MoreHorizontal,
  XCircle,
  FolderOpen,
} from "lucide-react";

import type { TestCase, TestExecution } from "@/types/test-cases";

type Props = {
  testCases: TestCase[];
  paginated: TestCase[];
  filteredCount: number;

  execution: TestExecution;
  updating: string | null;
  onRun: (tc: TestCase) => void;

  selectedIds: Set<string>;
  selectAll: () => void;
  deselectAll: () => void;
  toggleSelection: (id: string) => void;

  onBulkUpdate: (ids: string[], updates: Partial<TestCase>) => Promise<void>;
  onBulkDelete: (ids: string[]) => Promise<void>;
  onBulkAddToSuite: (ids: string[], suiteId: string) => Promise<void>;
  onBulkExport: (ids: string[]) => void;

  currentPage: number;
  totalPages: number;
  startIndex: number;
  endIndex: number;
  onPrevPage: () => void;
  onNextPage: () => void;

  getPriorityColor: (priority: string) => string;
  getProjectColor: (color: string) => string;

  onOpenDetails: (tc: TestCase) => void;
  onOpenCreate: () => void;
  onOpenActionSheet: (tc: TestCase) => void;
  onUpdateStatus: (
    testCaseId: string,
    status: "draft" | "active" | "archived"
  ) => void;
};

export function RegularTestCaseSection(props: Props) {
  const {
    testCases,
    paginated,
    filteredCount,
    execution,
    updating,
    onRun,
    selectedIds,
    selectAll,
    deselectAll,
    toggleSelection,
    onBulkUpdate,
    onBulkDelete,
    onBulkAddToSuite,
    onBulkExport,
    currentPage,
    totalPages,
    startIndex,
    endIndex,
    onPrevPage,
    onNextPage,
    getPriorityColor,
    getProjectColor,
    onOpenDetails,
    onOpenCreate,
    onOpenActionSheet,
    onUpdateStatus,
  } = props;

  const passed = testCases.filter(
    (tc) => execution[tc.id]?.status === "passed"
  ).length;
  const failed = testCases.filter(
    (tc) => execution[tc.id]?.status === "failed"
  ).length;
  const blocked = testCases.filter(
    (tc) => execution[tc.id]?.status === "blocked"
  ).length;
  const inProgress = testCases.filter(
    (tc) => execution[tc.id]?.status === "in_progress"
  ).length;
  const notRun = testCases.filter(
    (tc) => execution[tc.id]?.status === "not_run"
  ).length;

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <div className="bg-card p-4 rounded-lg border">
          <div className="text-2xl font-bold">{filteredCount}</div>
          <div className="text-sm text-muted-foreground">Total</div>
        </div>
        <div className="bg-card p-4 rounded-lg border">
          <div className="text-2xl font-bold text-green-600">{passed}</div>
          <div className="text-sm text-muted-foreground">Passed</div>
        </div>
        <div className="bg-card p-4 rounded-lg border">
          <div className="text-2xl font-bold text-red-600">{failed}</div>
          <div className="text-sm text-muted-foreground">Failed</div>
        </div>
        <div className="bg-card p-4 rounded-lg border">
          <div className="text-2xl font-bold text-orange-600">{blocked}</div>
          <div className="text-sm text-muted-foreground">Blocked</div>
        </div>
        <div className="bg-card p-4 rounded-lg border">
          <div className="text-2xl font-bold text-blue-600">{inProgress}</div>
          <div className="text-sm text-muted-foreground">In Progress</div>
        </div>
        <div className="bg-card p-4 rounded-lg border">
          <div className="text-2xl font-bold text-gray-500">{notRun}</div>
          <div className="text-sm text-muted-foreground">Not Run</div>
        </div>
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <BulkActionsToolbar
          selectedIds={selectedIds}
          allTestCases={testCases}
          onSelectAll={selectAll}
          onDeselectAll={deselectAll}
          onBulkUpdate={onBulkUpdate}
          onBulkDelete={onBulkDelete}
          onBulkAddToSuite={onBulkAddToSuite}
          onBulkExport={onBulkExport}
        />

        <Table>
          <TableHeader>
            <TableRow>
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
              <TableHead>Title</TableHead>
              <TableHead className="w-[160px]">Project</TableHead>
              <TableHead className="w-[140px]">Status</TableHead>
              <TableHead className="w-[110px]">Priority</TableHead>
              <TableHead className="w-[120px]">Type</TableHead>
              <TableHead className="w-[80px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {paginated.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12">
                  <div className="flex flex-col items-center gap-2">
                    <FlaskConical className="h-8 w-8 text-muted-foreground" />
                    <p className="text-muted-foreground">No test cases found</p>
                    <Button
                      onClick={onOpenCreate}
                      variant="outline"
                      className="mt-2"
                    >
                      Create your first test case
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              paginated.map((testCase) => {
                const exec = execution[testCase.id];

                return (
                  <TableRow key={testCase.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedIds.has(testCase.id)}
                        onCheckedChange={() => toggleSelection(testCase.id)}
                      />
                    </TableCell>

                    <TableCell className="font-medium">
                      <div
                        className="flex items-center gap-2 cursor-pointer hover:text-primary"
                        onClick={() => onOpenDetails(testCase)}
                      >
                        {exec?.status === "passed" && (
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                        )}
                        {exec?.status === "failed" && (
                          <XCircle className="h-4 w-4 text-red-600" />
                        )}
                        {exec?.status === "blocked" && (
                          <AlertTriangle className="h-4 w-4 text-orange-600" />
                        )}
                        {exec?.status === "skipped" && (
                          <Circle className="h-4 w-4 text-gray-400" />
                        )}
                        {exec?.status === "in_progress" && (
                          <Clock className="h-4 w-4 text-blue-600" />
                        )}
                        {exec?.status === "not_run" && (
                          <Circle className="h-4 w-4 text-gray-400" />
                        )}
                        <span className="truncate">{testCase.title}</span>
                        {exec?.duration_minutes ? (
                          <span className="text-xs text-muted-foreground">
                            ({exec.duration_minutes}m)
                          </span>
                        ) : null}
                      </div>
                    </TableCell>

                    <TableCell>
                      {testCase.projects ? (
                        <div className="flex items-center gap-2 min-w-0">
                          <FolderOpen
                            className={`h-4 w-4 ${getProjectColor(
                              testCase.projects.color
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
                      <Select
                        value={testCase.status}
                        onValueChange={(
                          value: "draft" | "active" | "archived"
                        ) => onUpdateStatus(testCase.id, value)}
                        disabled={updating === testCase.id}
                      >
                        <SelectTrigger className="w-[140px] h-8">
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
                    </TableCell>

                    <TableCell>
                      <Badge className={getPriorityColor(testCase.priority)}>
                        {testCase.priority}
                      </Badge>
                    </TableCell>

                    <TableCell>
                      <Badge variant="secondary">{testCase.test_type}</Badge>
                    </TableCell>

                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => onOpenActionSheet(testCase)}
                      >
                        <MoreHorizontal className="h-4 w-4" />
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
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {startIndex + 1}-{Math.min(endIndex, filteredCount)} of{" "}
            {filteredCount} test cases
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onPrevPage}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onNextPage}
              disabled={currentPage === totalPages}
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
