"use client";

import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
  useMemo,
} from "react";
import { useRouter } from "next/navigation";
import { AddRequirementModal } from "@/components/requirements/add-requirement-modal";
import { ImportRequirementsDialog } from "@/components/requirements/import-requirements-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toastError } from "@/lib/utils/toast-utils";
import {
  ChevronDown,
  Download,
  FileText,
  FileSpreadsheet,
  FolderOpen,
  Loader2,
  Search,
  Upload,
  X,
} from "lucide-react";
import { RequirementsTable } from "./requirements-table";
import { getProjectColor } from "@/lib/utils/requirement-helpers";
import type { Project, Requirement } from "@/types/requirements";

// ── Types ─────────────────────────────────────────────────────────────────────

interface RequirementsListProps {
  onRequirementSelected?: (requirement: Requirement) => void;
  selectable?: boolean;
}

type RequirementListResponse = {
  requirements: Requirement[];
  totalPages: number;
  totalCount: number;
  page: number;
  pageSize: number;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function useDebouncedValue<T>(value: T, delayMs: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(t);
  }, [value, delayMs]);
  return debounced;
}

function buildQueryParams(input: {
  page: number;
  pageSize: number;
  projectId?: string;
  q?: string;
  status?: string;
  priority?: string;
}) {
  const params = new URLSearchParams();
  params.set("page", String(input.page));
  params.set("pageSize", String(input.pageSize));
  if (input.projectId) params.set("projectId", input.projectId);
  if (input.q) params.set("q", input.q);
  if (input.status && input.status !== "all")
    params.set("status", input.status);
  if (input.priority && input.priority !== "all")
    params.set("priority", input.priority);
  return params;
}

async function safeJson(res: Response) {
  const raw = await res.text().catch(() => "");
  try {
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

// ── Export helpers ────────────────────────────────────────────────────────────

function escapeCSV(value: string | number | null | undefined): string {
  const str = String(value ?? "");
  return str.includes(",") || str.includes('"') || str.includes("\n")
    ? `"${str.replace(/"/g, '""')}"`
    : str;
}

function exportCSV(requirements: Requirement[]) {
  const headers = [
    "Title",
    "Project",
    "Type",
    "Priority",
    "Status",
    "External ID",
    "Created",
  ];
  const rows = requirements.map((r) => [
    r.title,
    r.projects?.name ?? "",
    r.type.replace("_", " "),
    r.priority,
    r.status,
    r.external_id ?? "",
    new Date(r.created_at).toLocaleDateString(),
  ]);
  const csv = [headers, ...rows]
    .map((row) => row.map(escapeCSV).join(","))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `requirements-${new Date().toISOString().split("T")[0]}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

async function exportXLSX(requirements: Requirement[]) {
  const ExcelJS = await import("exceljs");
  const wb = new ExcelJS.Workbook();
  wb.creator = "Requirements Export";
  wb.created = new Date();
  const ws = wb.addWorksheet("Requirements");
  ws.columns = [
    { header: "Title", key: "title", width: 48 },
    { header: "Project", key: "project", width: 24 },
    { header: "Type", key: "type", width: 18 },
    { header: "Priority", key: "priority", width: 14 },
    { header: "Status", key: "status", width: 16 },
    { header: "External ID", key: "external_id", width: 18 },
    { header: "Created", key: "created", width: 18 },
  ];
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
  requirements.forEach((r, i) => {
    const row = ws.addRow({
      title: r.title,
      project: r.projects?.name ?? "",
      type: r.type.replace("_", " "),
      priority: r.priority,
      status: r.status,
      external_id: r.external_id ?? "",
      created: new Date(r.created_at).toLocaleDateString(),
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
  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: 7 } };
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `requirements-${new Date().toISOString().split("T")[0]}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ── Filter select ─────────────────────────────────────────────────────────────

function FilterSelect({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-cyan-400/60 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export function RequirementsList({
  onRequirementSelected,
  selectable = false,
}: RequirementsListProps) {
  const router = useRouter();

  const [selectedProject, setSelectedProject] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearch = useDebouncedValue(searchTerm, 300);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const [projects, setProjects] = useState<Project[]>([]);
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const reqFetchSeq = useRef(0);
  const didInitialLoad = useRef(false);

  const selectedProjectName = useMemo(
    () => projects.find((p) => p.id === selectedProject)?.name ?? null,
    [projects, selectedProject],
  );

  const fetchRequirementsList = useCallback(
    async (opts?: { initial?: boolean; page?: number }) => {
      const seq = ++reqFetchSeq.current;
      const targetPage = opts?.page ?? currentPage;
      if (opts?.initial) setInitialLoading(true);
      else setRefreshing(true);
      try {
        const params = buildQueryParams({
          page: targetPage,
          pageSize,
          projectId: selectedProject || undefined,
          q: debouncedSearch?.trim() || undefined,
          status: statusFilter,
          priority: priorityFilter,
        });
        const res = await fetch(`/api/requirements/list?${params.toString()}`, {
          cache: "no-store",
        });
        const payload = (await safeJson(res)) as RequirementListResponse | null;
        if (!res.ok)
          throw new Error((payload as any)?.error ?? `Failed (${res.status})`);
        if (seq !== reqFetchSeq.current) return;
        setRequirements(payload?.requirements ?? []);
        setTotalPages(payload?.totalPages ?? 1);
        setTotalCount(payload?.totalCount ?? 0);
      } catch (err: any) {
        if (seq !== reqFetchSeq.current) return;
        toastError(err?.message ?? "Failed to load requirements");
      } finally {
        if (seq !== reqFetchSeq.current) return;
        setInitialLoading(false);
        setRefreshing(false);
      }
    },
    [selectedProject, debouncedSearch, statusFilter, priorityFilter, pageSize],
  );

  useEffect(() => {
    if (didInitialLoad.current) return;
    didInitialLoad.current = true;
    (async () => {
      try {
        setInitialLoading(true);
        const projectsRes = await fetch("/api/projects/list", {
          cache: "no-store",
        });
        const projectsPayload = await safeJson(projectsRes);
        if (projectsRes.ok) setProjects(projectsPayload?.projects ?? []);
      } catch (err) {
        console.error("fetchProjects error:", err);
      }
      await fetchRequirementsList({ initial: true, page: 1 });
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isFirstFilterRun = useRef(true);
  useEffect(() => {
    if (isFirstFilterRun.current) {
      isFirstFilterRun.current = false;
      return;
    }
    setCurrentPage(1);
    void fetchRequirementsList({ page: 1 });
  }, [selectedProject, debouncedSearch, statusFilter, priorityFilter]);

  const prevPage = useRef(currentPage);
  useEffect(() => {
    if (prevPage.current === currentPage) return;
    prevPage.current = currentPage;
    void fetchRequirementsList({ page: currentPage });
  }, [currentPage, fetchRequirementsList]);

  const handleRowClick = useCallback(
    (requirement: Requirement) => {
      if (selectable && onRequirementSelected) {
        onRequirementSelected(requirement);
        return;
      }
      router.push(`/requirements/${requirement.id}`);
    },
    [selectable, onRequirementSelected, router],
  );

  const hasActiveFilters =
    selectedProject ||
    statusFilter !== "all" ||
    priorityFilter !== "all" ||
    searchTerm;

  // ── Loading ───────────────────────────────────────────────────────────────

  if (initialLoading)
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-slate-400 dark:text-slate-500">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span className="text-sm">Loading requirements…</span>
      </div>
    );

  return (
    <div className="space-y-4">
      {/* ── Top bar ── */}
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-base font-semibold text-slate-800 dark:text-slate-100">
          Requirements
          {totalCount > 0 && (
            <span className="ml-2 font-mono text-xs font-normal text-slate-400 dark:text-slate-500">
              ({totalCount})
            </span>
          )}
        </h1>

        <div className="flex items-center gap-2">
          {/* Import */}
          <ImportRequirementsDialog
            projectId={selectedProject}
            onImportComplete={async () => {
              setCurrentPage(1);
              await fetchRequirementsList({ page: 1 });
              router.refresh();
            }}
          >
            <button className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 py-1.5 text-xs font-medium text-slate-600 transition hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-slate-600">
              <Upload className="h-3.5 w-3.5" /> Import
            </button>
          </ImportRequirementsDialog>

          {/* Export */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                disabled={requirements.length === 0}
                className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 py-1.5 text-xs font-medium text-slate-600 transition hover:border-slate-300 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-slate-600"
              >
                <Download className="h-3.5 w-3.5" /> Export
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900"
            >
              <DropdownMenuItem
                onClick={() => exportCSV(requirements)}
                className="text-slate-700 focus:bg-slate-50 dark:text-slate-200 dark:focus:bg-slate-800"
              >
                <FileText className="h-4 w-4 mr-2 text-emerald-500" /> CSV
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => exportXLSX(requirements)}
                className="text-slate-700 focus:bg-slate-50 dark:text-slate-200 dark:focus:bg-slate-800"
              >
                <FileSpreadsheet className="h-4 w-4 mr-2 text-emerald-500" />{" "}
                Excel (.xlsx)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Add */}
          <AddRequirementModal
            onRequirementAdded={(newReq) =>
              setRequirements((prev) => [newReq, ...prev])
            }
          >
            <button className="flex items-center gap-1.5 rounded-full border border-cyan-500/40 bg-cyan-50 px-4 py-1.5 text-xs font-medium text-cyan-700 transition hover:bg-cyan-100 dark:border-cyan-400/40 dark:bg-cyan-400/10 dark:text-cyan-300 dark:hover:bg-cyan-400/20">
              + Add requirement
            </button>
          </AddRequirementModal>
        </div>
      </div>

      {/* ── Filters ── */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
          <input
            type="text"
            placeholder="Search requirements…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-700 placeholder:text-slate-400 focus:border-cyan-400/60 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:placeholder:text-slate-500"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Project filter */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 transition hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
              {selectedProject ? (
                <>
                  <FolderOpen className="h-3.5 w-3.5 shrink-0 text-cyan-500" />
                  <span className="truncate max-w-[120px]">
                    {selectedProjectName}
                  </span>
                </>
              ) : (
                <>
                  <FolderOpen className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                  <span className="text-slate-400 dark:text-slate-500">
                    All projects
                  </span>
                </>
              )}
              <ChevronDown className="h-3.5 w-3.5 shrink-0 text-slate-400 ml-1" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            className="w-56 border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900"
          >
            <DropdownMenuLabel className="text-xs text-slate-500 dark:text-slate-400">
              Filter by project
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-slate-100 dark:bg-slate-800" />
            <DropdownMenuItem
              onClick={() => setSelectedProject("")}
              className="text-slate-700 focus:bg-slate-50 dark:text-slate-200 dark:focus:bg-slate-800"
            >
              All projects
            </DropdownMenuItem>
            {projects.length > 0 && (
              <DropdownMenuSeparator className="bg-slate-100 dark:bg-slate-800" />
            )}
            {projects.map((project) => (
              <DropdownMenuItem
                key={project.id}
                onClick={() => setSelectedProject(project.id)}
                className="text-slate-700 focus:bg-slate-50 dark:text-slate-200 dark:focus:bg-slate-800"
              >
                <FolderOpen
                  className={`h-4 w-4 mr-2 ${getProjectColor(project.color)}`}
                />
                <span className="truncate">{project.name}</span>
              </DropdownMenuItem>
            ))}
            {projects.length === 0 && (
              <div className="px-2 py-6 text-center text-sm text-slate-400 dark:text-slate-500">
                No projects yet
              </div>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Status */}
        <FilterSelect
          value={statusFilter}
          onChange={setStatusFilter}
          options={[
            { value: "all", label: "All status" },
            { value: "draft", label: "Draft" },
            { value: "approved", label: "Approved" },
            { value: "implemented", label: "Implemented" },
            { value: "tested", label: "Tested" },
            { value: "rejected", label: "Rejected" },
          ]}
        />

        {/* Priority */}
        <FilterSelect
          value={priorityFilter}
          onChange={setPriorityFilter}
          options={[
            { value: "all", label: "All priority" },
            { value: "critical", label: "Critical" },
            { value: "high", label: "High" },
            { value: "medium", label: "Medium" },
            { value: "low", label: "Low" },
          ]}
        />

        {/* Clear filters */}
        {hasActiveFilters && (
          <button
            onClick={() => {
              setSelectedProject("");
              setStatusFilter("all");
              setPriorityFilter("all");
              setSearchTerm("");
            }}
            className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 transition dark:hover:text-slate-300"
          >
            <X className="h-3 w-3" /> Clear
          </button>
        )}

        {/* Refreshing indicator */}
        {refreshing && (
          <div className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Updating…
          </div>
        )}
      </div>

      {/* ── Table ── */}
      <RequirementsTable
        requirements={requirements}
        selectable={selectable}
        currentPage={currentPage}
        totalPages={totalPages}
        totalCount={totalCount}
        itemsPerPage={pageSize}
        onRowClick={handleRowClick}
        onPageChange={setCurrentPage}
      />
    </div>
  );
}
