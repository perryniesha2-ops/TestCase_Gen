"use client";

import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
  useMemo,
} from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toastSuccess, toastError } from "@/lib/utils/toast-utils";
import {
  ChevronDown,
  Download,
  FileText,
  FileSpreadsheet,
  FolderOpen,
  Loader2,
  Search,
  Upload,
} from "lucide-react";

import { RequirementsTable } from "./requirements-table";
import { getProjectColor } from "@/lib/utils/requirement-helpers";
import type { Project, Requirement } from "@/types/requirements";

// ─── Types ────────────────────────────────────────────────────────────────────

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

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

// ─── Export helpers ───────────────────────────────────────────────────────────

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

// ─── Component ────────────────────────────────────────────────────────────────

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

  if (initialLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Top actions ───────────────────────────────────────────────────── */}
      <div className="flex items-center justify-end gap-2">
        <ImportRequirementsDialog
          projectId={selectedProject}
          onImportComplete={async () => {
            setCurrentPage(1);
            await fetchRequirementsList({ page: 1 });
            router.refresh();
          }}
        >
          <Button variant="outline">
            <Upload className="h-4 w-4 mr-2" />
            Import
          </Button>
        </ImportRequirementsDialog>

        {/* Export — exports current page results respecting active filters */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" disabled={requirements.length === 0}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => exportCSV(requirements)}>
              <FileText className="h-4 w-4 mr-2 text-green-600" />
              CSV
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => exportXLSX(requirements)}>
              <FileSpreadsheet className="h-4 w-4 mr-2 text-emerald-600" />
              Excel (.xlsx)
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <AddRequirementModal
          onRequirementAdded={(newReq) => {
            setRequirements((prev) => [newReq, ...prev]);
          }}
        />
      </div>

      {/* ── Filters ───────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search requirements..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="min-w-[180px] justify-between">
              {selectedProjectName ? (
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <FolderOpen className="h-4 w-4 shrink-0" />
                  <span className="truncate">{selectedProjectName}</span>
                </div>
              ) : (
                <span className="text-muted-foreground">All Projects</span>
              )}
              <ChevronDown className="h-4 w-4 ml-2 shrink-0 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[220px]">
            <DropdownMenuLabel>Filter by Project</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setSelectedProject("")}>
              All Projects
            </DropdownMenuItem>
            {projects.length > 0 && <DropdownMenuSeparator />}
            {projects.map((project) => (
              <DropdownMenuItem
                key={project.id}
                onClick={() => setSelectedProject(project.id)}
              >
                <FolderOpen
                  className={`h-4 w-4 mr-2 ${getProjectColor(project.color)}`}
                />
                <span className="truncate">{project.name}</span>
              </DropdownMenuItem>
            ))}
            {projects.length === 0 && (
              <div className="px-2 py-6 text-center text-sm text-muted-foreground">
                No projects yet
              </div>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="implemented">Implemented</SelectItem>
            <SelectItem value="tested">Tested</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>

        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priority</SelectItem>
            <SelectItem value="critical">Critical</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {refreshing && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Updating…
        </div>
      )}

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
      <div className="h-4" />
    </div>
  );
}
