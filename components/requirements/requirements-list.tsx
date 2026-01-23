"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
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
import { RequirementsTable } from "./requirements-table";
import { RequirementDetailsDialog } from "./requirement-details-dialog";
import { LinkTestCasesDialog } from "./link-test-cases-dialog";
import { EditRequirementModal } from "./edit-requirement-modal";
import { getProjectColor } from "@/lib/utils/requirement-helpers";
import type { Project, Requirement } from "@/types/requirements";
import {
  ChevronDown,
  FileDown,
  FolderOpen,
  Loader2,
  Plus,
  Search,
  Upload,
} from "lucide-react";

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

export function RequirementsList({
  onRequirementSelected,
  selectable = false,
}: RequirementsListProps) {
  const router = useRouter();

  // ----- Filters -----
  const [selectedProject, setSelectedProject] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearch = useDebouncedValue(searchTerm, 300);

  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");

  // Server pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // ----- Data -----
  const [projects, setProjects] = useState<Project[]>([]);
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // ----- UI state -----
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Dialogs
  const [selectedRequirement, setSelectedRequirement] =
    useState<Requirement | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);

  // Prevent race conditions when multiple fetches overlap
  const reqFetchSeq = useRef(0);

  const selectedProjectName = useMemo(() => {
    if (!selectedProject) return null;
    return projects.find((p) => p.id === selectedProject)?.name ?? null;
  }, [projects, selectedProject]);

  const fetchProjects = useCallback(async () => {
    const res = await fetch("/api/projects/list", { cache: "no-store" });
    const payload = await safeJson(res);

    if (!res.ok) {
      throw new Error(
        payload?.error ?? `Failed to load projects (${res.status})`,
      );
    }

    setProjects(payload?.projects ?? []);
  }, []);

  const fetchRequirementsList = useCallback(
    async (opts?: { initial?: boolean }) => {
      const seq = ++reqFetchSeq.current;

      if (opts?.initial) setInitialLoading(true);
      else setRefreshing(true);

      try {
        const params = buildQueryParams({
          page: currentPage,
          pageSize,
          projectId: selectedProject || undefined,
          q: debouncedSearch?.trim() || undefined,
          status: statusFilter,
          priority: priorityFilter,
        });

        const res = await fetch(`/api/requirements/list?${params.toString()}`, {
          cache: "no-store",
        });

        const payload = (await safeJson(res)) as RequirementListResponse | any;

        if (!res.ok) {
          throw new Error(
            payload?.error ?? `Failed to load requirements (${res.status})`,
          );
        }

        // If a newer request started after this one, ignore this response
        if (seq !== reqFetchSeq.current) return;

        setRequirements(payload?.requirements ?? []);
        setTotalPages(payload?.totalPages ?? 1);
        setTotalCount(payload?.totalCount ?? 0);

        // If backend echoes page/pageSize, you can optionally sync them here.
      } catch (err: any) {
        if (seq !== reqFetchSeq.current) return;
        console.error("fetchRequirementsList error:", err);
        toast.error(err?.message ?? "Failed to load requirements");
      } finally {
        if (seq !== reqFetchSeq.current) return;
        setInitialLoading(false);
        setRefreshing(false);
      }
    },
    [
      currentPage,
      pageSize,
      selectedProject,
      debouncedSearch,
      statusFilter,
      priorityFilter,
    ],
  );

  useEffect(() => {
    // Initial load: projects + requirements
    (async () => {
      try {
        setInitialLoading(true);
        await fetchProjects();
        await fetchRequirementsList({ initial: true });
      } catch (err: any) {
        console.error("Initial load error:", err);
        toast.error(err?.message ?? "Failed to load requirements");
        setInitialLoading(false);
      }
    })();
  }, [fetchProjects, fetchRequirementsList]);

  useEffect(() => {
    // Any filter change should reset to page 1, but avoid double-fetch:
    // If currentPage is already 1, just refetch. Otherwise setCurrentPage(1)
    // and let the page effect below refetch.
    setCurrentPage((prev) => (prev === 1 ? 1 : 1));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProject, debouncedSearch, statusFilter, priorityFilter]);

  useEffect(() => {
    // Fetch when currentPage changes (and after filter changes reset it)
    fetchRequirementsList();
  }, [currentPage, fetchRequirementsList]);

  const handleRequirementAdded = useCallback(async () => {
    // If you want the new item to appear, refresh the list (page 1 tends to be safest)
    setCurrentPage(1);
    await fetchRequirementsList();
    router.refresh();
  }, [fetchRequirementsList, router]);

  const handleRowClick = useCallback(
    (requirement: Requirement) => {
      if (selectable && onRequirementSelected) {
        onRequirementSelected(requirement);
        return;
      }
      setSelectedRequirement(requirement);
      setShowDetailsDialog(true);
    },
    [selectable, onRequirementSelected],
  );

  const handleOpenLinkDialog = useCallback((requirement: Requirement) => {
    setSelectedRequirement(requirement);
    setShowLinkDialog(true);
  }, []);

  const handleOpenEditDialog = useCallback((requirement: Requirement) => {
    setSelectedRequirement(requirement);
    setShowEditDialog(true);
  }, []);

  const deleteRequirement = useCallback(async (requirementId: string) => {
    const res = await fetch(`/api/requirements/${requirementId}/delete`, {
      method: "DELETE",
    });
    const payload = await safeJson(res);

    if (!res.ok) {
      throw new Error(payload?.error ?? `Delete failed (${res.status})`);
    }
  }, []);

  const handleDelete = useCallback(
    async (requirement: Requirement) => {
      const ok = window.confirm(
        `Are you sure you want to delete "${requirement.title}"?`,
      );
      if (!ok) return;

      try {
        // Optimistic removal first
        setRequirements((prev) => prev.filter((r) => r.id !== requirement.id));
        setTotalCount((prev) => Math.max(0, prev - 1));

        await deleteRequirement(requirement.id);

        toast.success("Requirement deleted");

        // Refresh to keep counts/pages correct (especially if page becomes empty)
        await fetchRequirementsList();
      } catch (err: any) {
        console.error("deleteRequirement error:", err);
        toast.error(err?.message ?? "Failed to delete requirement");
        // Re-sync list after failure
        await fetchRequirementsList();
      }
    },
    [deleteRequirement, fetchRequirementsList],
  );

  const handleExport = useCallback(() => {
    toast.info("Export functionality coming soon");
  }, []);

  const onProjectChange = useCallback((projectId: string) => {
    setSelectedProject(projectId);
    setCurrentPage(1);
  }, []);

  const onStatusChange = useCallback((status: string) => {
    setStatusFilter(status);
    setCurrentPage(1);
  }, []);

  const onPriorityChange = useCallback((priority: string) => {
    setPriorityFilter(priority);
    setCurrentPage(1);
  }, []);

  const onSearchChange = useCallback((value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  }, []);

  if (initialLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top actions */}
      <div className="flex items-center justify-end gap-2">
        <ImportRequirementsDialog projectId={selectedProject}>
          <Button variant="outline">
            <Upload className="h-4 w-4 mr-2" />
            Import
          </Button>
        </ImportRequirementsDialog>
        {/* Create (single) */}
        <AddRequirementModal
          onRequirementAdded={(newReq) => {
            setRequirements((prev) => [newReq, ...prev]);
          }}
        />{" "}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search requirements..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Project dropdown */}
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

            <DropdownMenuItem onClick={() => onProjectChange("")}>
              All Projects
            </DropdownMenuItem>

            {projects.length > 0 && <DropdownMenuSeparator />}

            {projects.map((project) => (
              <DropdownMenuItem
                key={project.id}
                onClick={() => onProjectChange(project.id)}
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

        {/* Status */}
        <Select value={statusFilter} onValueChange={onStatusChange}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
          </SelectContent>
        </Select>

        {/* Priority */}
        <Select value={priorityFilter} onValueChange={onPriorityChange}>
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

        {/* Export */}
        <Button variant="outline" onClick={handleExport} className="gap-2">
          <FileDown className="h-4 w-4" />
          Export
        </Button>
      </div>

      {/* Inline refresh indicator (does not block UI) */}
      {refreshing && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Updating…
        </div>
      )}

      {/* Table */}
      <RequirementsTable
        requirements={requirements}
        selectable={selectable}
        currentPage={currentPage}
        totalPages={totalPages}
        totalCount={totalCount}
        itemsPerPage={pageSize}
        onRowClick={handleRowClick}
        onOpenLinkDialog={handleOpenLinkDialog}
        onOpenEditDialog={handleOpenEditDialog}
        onDelete={handleDelete}
        onPageChange={setCurrentPage}
      />

      {/* Details */}
      {selectedRequirement && (
        <RequirementDetailsDialog
          requirement={selectedRequirement}
          open={showDetailsDialog}
          onOpenChange={setShowDetailsDialog}
          onOpenLinkDialog={() => handleOpenLinkDialog(selectedRequirement)}
        />
      )}

      {/* Edit */}
      {selectedRequirement && (
        <EditRequirementModal
          requirement={selectedRequirement}
          open={showEditDialog}
          onOpenChange={setShowEditDialog}
          onSuccess={fetchRequirementsList}
        />
      )}

      {/* Link tests */}
      {selectedRequirement && (
        <LinkTestCasesDialog
          requirement={selectedRequirement}
          open={showLinkDialog}
          onOpenChange={setShowLinkDialog}
          onLinked={fetchRequirementsList}
        />
      )}
    </div>
  );
}
