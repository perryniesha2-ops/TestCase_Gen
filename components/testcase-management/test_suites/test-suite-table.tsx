"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  FileText,
  FolderOpen,
  Search,
  Download,
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
} from "lucide-react";
import type { TestSuite } from "@/types/test-cases";

// ─── Types ────────────────────────────────────────────────────────────────────

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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function escapeCSV(value: string | number | null | undefined): string {
  const str = String(value ?? "");
  return str.includes(",") || str.includes('"') || str.includes("\n")
    ? `"${str.replace(/"/g, '""')}"`
    : str;
}

function exportCSV(
  suites: TestSuite[],
  getDisplaySuiteType: (s: TestSuite) => string,
) {
  const headers = [
    "Suite Name",
    "Suite Type",
    "Kind",
    "Project",
    "Status",
    "Test Cases",
    "Total Runs",
    "Passed",
    "Failed",
    "Pass Rate %",
  ];

  const rows = suites.map((s) => [
    s.name,
    getDisplaySuiteType(s),
    (s as any).kind ?? "regular",
    s.projects?.name ?? "",
    s.status,
    s.test_case_count,
    s.execution_stats?.total ?? 0,
    s.execution_stats?.passed ?? 0,
    s.execution_stats?.failed ?? 0,
    (s.execution_stats?.total ?? 0) > 0
      ? Math.round(
          ((s.execution_stats?.passed ?? 0) / s.execution_stats!.total) * 100,
        )
      : 0,
  ]);

  const csv = [headers, ...rows]
    .map((row) => row.map(escapeCSV).join(","))
    .join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `test-suites-${new Date().toISOString().split("T")[0]}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

async function exportXLSX(
  suites: TestSuite[],
  getDisplaySuiteType: (s: TestSuite) => string,
) {
  const ExcelJS = await import("exceljs");
  const wb = new ExcelJS.Workbook();
  wb.creator = "Test Suites Export";
  wb.created = new Date();

  const ws = wb.addWorksheet("Test Suites");

  ws.columns = [
    { header: "Suite Name", key: "name", width: 36 },
    { header: "Suite Type", key: "type", width: 18 },
    { header: "Kind", key: "kind", width: 16 },
    { header: "Project", key: "project", width: 24 },
    { header: "Status", key: "status", width: 14 },
    { header: "Test Cases", key: "test_cases", width: 14 },
    { header: "Total Runs", key: "total_runs", width: 14 },
    { header: "Passed", key: "passed", width: 12 },
    { header: "Failed", key: "failed", width: 12 },
    { header: "Pass Rate %", key: "pass_rate", width: 14 },
  ];

  // Header styling
  const headerRow = ws.getRow(1);
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" }, name: "Arial" };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF4F46E5" },
    };
    cell.alignment = { vertical: "middle", horizontal: "left" };
  });
  headerRow.height = 22;

  // Data rows
  suites.forEach((s, i) => {
    const passRate =
      (s.execution_stats?.total ?? 0) > 0
        ? Math.round(
            ((s.execution_stats?.passed ?? 0) / s.execution_stats!.total) * 100,
          )
        : 0;

    const row = ws.addRow({
      name: s.name,
      type: getDisplaySuiteType(s),
      kind: (s as any).kind ?? "regular",
      project: s.projects?.name ?? "",
      status: s.status,
      test_cases: s.test_case_count,
      total_runs: s.execution_stats?.total ?? 0,
      passed: s.execution_stats?.passed ?? 0,
      failed: s.execution_stats?.failed ?? 0,
      pass_rate: passRate,
    });

    row.eachCell((cell) => {
      cell.font = { name: "Arial", size: 10 };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: i % 2 === 0 ? "FFFFFFFF" : "FFF8FAFC" },
      };
      cell.alignment = { vertical: "middle" };
    });
    row.height = 18;
  });

  ws.views = [{ state: "frozen", ySplit: 1 }];
  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: 10 } };

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `test-suites-${new Date().toISOString().split("T")[0]}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ─── Component ────────────────────────────────────────────────────────────────

export function TestSuiteTable({
  suites,
  searchTerm: externalSearch,
  filterType: externalFilterType,
  onCreateSuite,
  onViewDetails,
  getStatusIcon,
  getStatusBadge,
  getSuiteTypeColor,
  getDisplaySuiteType,
  getProjectColor,
}: Props) {
  // ── Local filter state ─────────────────────────────────────────────────────
  const [localSearch, setLocalSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [suiteTypeFilter, setSuiteTypeFilter] = useState("all");
  const [projectFilter, setProjectFilter] = useState("all");
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  // Derive unique projects for the project filter
  const projectOptions = useMemo(() => {
    const seen = new Map<string, string>();
    suites.forEach((s) => {
      if (s.projects?.name) seen.set(s.projects.name, s.projects.name);
    });
    return [...seen.entries()];
  }, [suites]);

  // Derive unique statuses
  const statusOptions = useMemo(() => {
    const seen = new Set<string>();
    suites.forEach((s) => seen.add(s.status));
    return [...seen];
  }, [suites]);

  // ── Filtered list ──────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const term = localSearch.trim().toLowerCase();
    return suites.filter((s) => {
      if (
        term &&
        !s.name.toLowerCase().includes(term) &&
        !(s.description ?? "").toLowerCase().includes(term)
      )
        return false;
      if (statusFilter !== "all" && s.status !== statusFilter) return false;
      if (
        suiteTypeFilter !== "all" &&
        ((s as any).kind ?? "regular") !== suiteTypeFilter
      )
        return false;
      if (projectFilter !== "all" && s.projects?.name !== projectFilter)
        return false;
      return true;
    });
  }, [
    suites,
    localSearch,
    statusFilter,
    suiteTypeFilter,
    projectFilter,
    getDisplaySuiteType,
  ]);

  // Reset to page 1 when filters change
  const resetPage = () => setCurrentPage(1);

  // ── Pagination ─────────────────────────────────────────────────────────────
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIdx = (safeCurrentPage - 1) * pageSize;
  const paginated = filtered.slice(startIdx, startIdx + pageSize);

  const hasFilters =
    localSearch ||
    statusFilter !== "all" ||
    suiteTypeFilter !== "all" ||
    projectFilter !== "all";

  return (
    <div className="space-y-4">
      {/* ── Toolbar ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search suites…"
            value={localSearch}
            onChange={(e) => {
              setLocalSearch(e.target.value);
              resetPage();
            }}
            className="pl-9"
          />
        </div>

        {/* Suite type filter */}
        <Select
          value={suiteTypeFilter}
          onValueChange={(v) => {
            setSuiteTypeFilter(v);
            resetPage();
          }}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Suite Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="regular">Regular</SelectItem>
            <SelectItem value="cross-platform">Cross-Platform</SelectItem>
          </SelectContent>
        </Select>

        {/* Status filter */}
        <Select
          value={statusFilter}
          onValueChange={(v) => {
            setStatusFilter(v);
            resetPage();
          }}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            {statusOptions.map((s) => (
              <SelectItem key={s} value={s} className="capitalize">
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Project filter */}
        <Select
          value={projectFilter}
          onValueChange={(v) => {
            setProjectFilter(v);
            resetPage();
          }}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="All Projects" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Projects</SelectItem>
            {projectOptions.map(([name]) => (
              <SelectItem key={name} value={name}>
                {name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setLocalSearch("");
              setStatusFilter("all");
              setSuiteTypeFilter("all");
              setProjectFilter("all");
              resetPage();
            }}
          >
            Clear filters
          </Button>
        )}

        {/* Export */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2 ml-auto">
              <Download className="h-4 w-4" />
              Export
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={() => exportCSV(filtered, getDisplaySuiteType)}
            >
              <FileText className="h-4 w-4 mr-2 text-green-600" />
              CSV
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => exportXLSX(filtered, getDisplaySuiteType)}
            >
              <FileSpreadsheet className="h-4 w-4 mr-2 text-emerald-600" />
              Excel (.xlsx)
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* ── Table ───────────────────────────────────────────────────────────── */}
      <div
        className="border rounded-lg overflow-hidden bg-card"
        data-testid="suite-table"
      >
        <Table>
          <TableHeader className="bg-muted/30">
            <TableRow className="hover:bg-transparent border-b">
              <TableHead className="font-semibold text-xs uppercase tracking-wide text-muted-foreground">
                Suite Name
              </TableHead>
              <TableHead className="w-[140px] font-semibold text-xs uppercase tracking-wide text-muted-foreground">
                Suite Type
              </TableHead>
              <TableHead className="w-[140px] font-semibold text-xs uppercase tracking-wide text-muted-foreground">
                Project
              </TableHead>
              <TableHead className="w-[100px] font-semibold text-xs uppercase tracking-wide text-muted-foreground">
                Status
              </TableHead>
              <TableHead className="w-[100px] font-semibold text-xs uppercase tracking-wide text-muted-foreground">
                Test Cases
              </TableHead>
              <TableHead className="w-[220px] font-semibold text-xs uppercase tracking-wide text-muted-foreground">
                Progress
              </TableHead>
              <TableHead className="w-[80px]" />
            </TableRow>
          </TableHeader>

          <TableBody data-testid="suite-table-body">
            {paginated.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-16">
                  <FileText className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
                  <p className="font-medium">
                    {hasFilters
                      ? "No suites match your filters"
                      : "No test suites found"}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1 mb-3">
                    {hasFilters
                      ? "Try adjusting your search or filters"
                      : "Create your first test suite to get started"}
                  </p>
                  {!hasFilters && (
                    <Button
                      size="sm"
                      onClick={onCreateSuite}
                      data-testid="btn-create-first-suite"
                    >
                      Create Test Suite
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ) : (
              paginated.map((suite) => {
                const passRate =
                  (suite.execution_stats?.total ?? 0) > 0
                    ? Math.round(
                        (suite.execution_stats!.passed /
                          suite.execution_stats!.total) *
                          100,
                      )
                    : 0;

                return (
                  <TableRow
                    key={suite.id}
                    className="group hover:bg-muted/20 transition-colors border-b last:border-0 cursor-pointer"
                    data-testid="suite-row"
                    data-suite-id={suite.id}
                    data-suite-name={suite.name}
                    onClick={() => onViewDetails(suite)}
                  >
                    {/* Name */}
                    <TableCell className="py-3">
                      <div className="space-y-0.5">
                        <div
                          className="font-medium text-sm flex items-center gap-2"
                          data-testid="suite-name"
                        >
                          {getStatusIcon(suite.status)}
                          {suite.name}
                        </div>
                        <div className="text-xs text-muted-foreground line-clamp-1">
                          {suite.description || "No description"}
                        </div>
                      </div>
                    </TableCell>

                    {/* Suite Type */}
                    <TableCell className="py-3">
                      <Badge
                        className={`${getSuiteTypeColor(getDisplaySuiteType(suite))} text-xs h-5 px-1.5`}
                        data-testid="suite-type-badge"
                      >
                        {getDisplaySuiteType(suite)}
                      </Badge>
                    </TableCell>

                    {/* Project */}
                    <TableCell className="py-3">
                      {suite.projects ? (
                        <div
                          className="flex items-center gap-1.5"
                          data-testid="suite-project"
                        >
                          <FolderOpen
                            className={`h-3.5 w-3.5 shrink-0 ${getProjectColor(suite.projects.color)}`}
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

                    {/* Status */}
                    <TableCell className="py-3" data-testid="suite-status">
                      {getStatusBadge(suite.status)}
                    </TableCell>

                    {/* Test Cases */}
                    <TableCell className="py-3">
                      <div
                        className="flex items-center gap-1.5"
                        data-testid="suite-test-case-count"
                      >
                        <span className="font-medium text-sm">
                          {suite.test_case_count}
                        </span>
                      </div>
                    </TableCell>

                    {/* Progress */}
                    <TableCell className="py-3">
                      {suite.execution_stats &&
                      (suite.execution_stats.total ?? 0) > 0 ? (
                        <div
                          className="space-y-1.5"
                          data-testid="suite-progress"
                        >
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">
                              Pass Rate
                            </span>
                            <span
                              className="font-medium"
                              data-testid="suite-pass-rate"
                            >
                              {passRate}%
                            </span>
                          </div>
                          <Progress value={passRate} className="h-1.5" />
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
                          className="text-xs text-muted-foreground"
                          data-testid="suite-no-runs"
                        >
                          No runs yet
                        </span>
                      )}
                    </TableCell>

                    {/* Details */}
                    <TableCell
                      className="py-3 pr-3 text-right"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7"
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

      {/* ── Pagination ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-1">
        <p className="text-sm text-muted-foreground">
          {filtered.length === 0 ? (
            "No results"
          ) : (
            <>
              Showing{" "}
              <span className="font-medium text-foreground">
                {startIdx + 1}
              </span>
              –
              <span className="font-medium text-foreground">
                {Math.min(startIdx + pageSize, filtered.length)}
              </span>{" "}
              of{" "}
              <span className="font-medium text-foreground">
                {filtered.length}
              </span>{" "}
              {filtered.length !== 1 ? "suites" : "suite"}
            </>
          )}
        </p>

        {totalPages > 1 && (
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={safeCurrentPage === 1}
              className="h-8 px-3"
            >
              <ChevronLeft className="h-4 w-4 mr-1" /> Previous
            </Button>
            <span className="text-sm px-2 text-muted-foreground">
              {safeCurrentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={safeCurrentPage === totalPages}
              className="h-8 px-3"
            >
              Next <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
