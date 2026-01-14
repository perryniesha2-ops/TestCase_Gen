"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AddRequirementModal } from "@/components/requirements/add-requirement-modal";
import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Loader2,
  Search,
  FileDown,
  ChevronDown,
  FolderOpen,
} from "lucide-react";
import { RequirementsTable } from "./requirements-table";
import { RequirementDetailsDialog } from "./requirement-details-dialog";
import { LinkTestCasesDialog } from "./link-test-cases-dialog";
import { EditRequirementModal } from "./edit-requirement-modal";
import { useRequirements } from "@/hooks/use-requirements";
import { getProjectColor } from "@/lib/utils/requirement-helpers";
import type { Requirement, Project } from "@/types/requirements";

interface RequirementsListProps {
  onRequirementSelected?: (requirement: Requirement) => void;
  selectable?: boolean;
}

export function RequirementsList({
  onRequirementSelected,
  selectable = false,
}: RequirementsListProps) {
  // Filter State
  const [selectedProject, setSelectedProject] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Dialog State
  const [selectedRequirement, setSelectedRequirement] =
    useState<Requirement | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);

  const router = useRouter();

  // Projects State
  const [projects, setProjects] = useState<Project[]>([]);

  // Custom hook for requirements data
  const { requirements, loading, fetchRequirements, deleteRequirement } =
    useRequirements(selectedProject);

  // Load projects on mount
  useEffect(() => {
    fetchProjects();
  }, []);

  // Fetch projects from database
  async function fetchProjects() {
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const { data, error } = await supabase
        .from("projects")
        .select("id, name, color, icon")
        .eq("user_id", user.id)
        .order("name");

      if (error) throw error;
      setProjects(data || []);
    } catch (error) {
      console.error("Error fetching projects:", error);
    }
  }

  // Get selected project name for display
  const selectedProjectName = selectedProject
    ? projects.find((p) => p.id === selectedProject)?.name
    : null;

  // Filter requirements based on search and filters
  const filteredRequirements = requirements.filter((req) => {
    const matchesSearch =
      req.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.external_id?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === "all" || req.status === statusFilter;
    const matchesPriority =
      priorityFilter === "all" || req.priority === priorityFilter;

    return matchesSearch && matchesStatus && matchesPriority;
  });

  // Pagination calculations
  const totalPages = Math.ceil(filteredRequirements.length / itemsPerPage);
  const paginatedRequirements = filteredRequirements.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleRequirementAdded = async () => {
    await fetchRequirements();
    router.refresh();
  };

  // Event Handlers
  function handleRowClick(requirement: Requirement) {
    if (selectable && onRequirementSelected) {
      onRequirementSelected(requirement);
    } else {
      setSelectedRequirement(requirement);
      setShowDetailsDialog(true);
    }
  }

  function handleOpenLinkDialog(requirement: Requirement) {
    setSelectedRequirement(requirement);
    setShowLinkDialog(true);
  }

  function handleOpenEditDialog(requirement: Requirement) {
    setSelectedRequirement(requirement);
    setShowEditDialog(true);
  }

  async function handleDelete(requirement: Requirement) {
    if (!confirm(`Are you sure you want to delete "${requirement.title}"?`)) {
      return;
    }

    const success = await deleteRequirement(requirement.id);
    if (success) {
      toast.success("Requirement deleted successfully");
      fetchRequirements();
    }
  }

  function handleExport() {
    toast.info("Export functionality coming soon");
  }

  function handleProjectFilterChange(projectId: string) {
    setSelectedProject(projectId);
    setCurrentPage(1);
  }

  function handleStatusFilterChange(status: string) {
    setStatusFilter(status);
    setCurrentPage(1);
  }

  function handlePriorityFilterChange(priority: string) {
    setPriorityFilter(priority);
    setCurrentPage(1);
  }

  function handleSearchChange(value: string) {
    setSearchTerm(value);
    setCurrentPage(1);
  }

  // Loading State
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end gap-2">
        <AddRequirementModal
          defaultProjectId={selectedProject || undefined}
          onRequirementAdded={handleRequirementAdded}
        >
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Requirement
          </Button>
        </AddRequirementModal>
      </div>
      {/* Filters Section */}
      <div className="flex items-center gap-4">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search requirements..."
            value={searchTerm}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Project Filter Dropdown */}
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

            <DropdownMenuItem onClick={() => handleProjectFilterChange("")}>
              All Projects
            </DropdownMenuItem>

            {projects.length > 0 && <DropdownMenuSeparator />}

            {projects.map((project) => (
              <DropdownMenuItem
                key={project.id}
                onClick={() => handleProjectFilterChange(project.id)}
              >
                <FolderOpen
                  className={`h-4 w-4 mr-2 ${getProjectColor(project.color)}`}
                />
                <span>{project.name}</span>
              </DropdownMenuItem>
            ))}

            {projects.length === 0 && (
              <div className="px-2 py-6 text-center text-sm text-muted-foreground">
                No projects yet
              </div>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Status Filter */}
        <Select value={statusFilter} onValueChange={handleStatusFilterChange}>
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

        {/* Priority Filter */}
        <Select
          value={priorityFilter}
          onValueChange={handlePriorityFilterChange}
        >
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

        {/* Export Button */}
        <Button variant="outline" onClick={handleExport}>
          <FileDown className="h-4 w-4 mr-2" />
          Export
        </Button>
      </div>

      {/* Requirements Table */}
      <RequirementsTable
        requirements={paginatedRequirements}
        selectable={selectable}
        currentPage={currentPage}
        totalPages={totalPages}
        totalCount={filteredRequirements.length}
        itemsPerPage={itemsPerPage}
        onRowClick={handleRowClick}
        onOpenLinkDialog={handleOpenLinkDialog}
        onOpenEditDialog={handleOpenEditDialog}
        onDelete={handleDelete}
        onPageChange={setCurrentPage}
      />

      {/* Requirement Details Dialog */}
      {selectedRequirement && (
        <RequirementDetailsDialog
          requirement={selectedRequirement}
          open={showDetailsDialog}
          onOpenChange={setShowDetailsDialog}
          onOpenLinkDialog={() => handleOpenLinkDialog(selectedRequirement)}
        />
      )}

      {/* Edit Requirement Dialog */}
      {selectedRequirement && (
        <EditRequirementModal
          requirement={selectedRequirement}
          open={showEditDialog}
          onOpenChange={setShowEditDialog}
          onSuccess={fetchRequirements}
        />
      )}

      {/* Link Test Cases Dialog */}
      {selectedRequirement && (
        <LinkTestCasesDialog
          requirement={selectedRequirement}
          open={showLinkDialog}
          onOpenChange={setShowLinkDialog}
          onLinked={fetchRequirements}
        />
      )}
    </div>
  );
}
