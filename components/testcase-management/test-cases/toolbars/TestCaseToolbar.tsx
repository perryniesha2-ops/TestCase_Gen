"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import {
  ChevronDown,
  FolderOpen,
  Plus,
  Search,
  Download,
  Filter,
} from "lucide-react";
import type { Project } from "@/types/test-cases";

export type RunStatusFilter = "passed" | "failed" | "skipped" | "blocked";

type Props = {
  searchTerm: string;
  onSearchTermChange: (v: string) => void;

  projects: Project[];
  selectedProject: string;
  selectedProjectName: string | null;
  onProjectChange: (projectId: string) => void;

  // NEW: run status filter
  runStatusFilter: RunStatusFilter[];
  onRunStatusFilterChange: (next: RunStatusFilter[]) => void;

  onCreate: () => void;
  getProjectColor: (color: string) => string;
  exportButton?: React.ReactNode;
  filterComponent?: React.ReactNode;
  onExport?: () => void;
};

const RUN_STATUS_OPTIONS: Array<{ value: RunStatusFilter; label: string }> = [
  { value: "passed", label: "Passed" },
  { value: "failed", label: "Failed" },
  { value: "skipped", label: "Skipped" },
  { value: "blocked", label: "Blocked" },
];

function toggleInArray<T>(arr: T[], v: T) {
  return arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];
}

export function TestCaseToolbar({
  searchTerm,
  onSearchTermChange,
  projects,
  selectedProjectName,
  onProjectChange,
  onCreate,
  getProjectColor,
  exportButton,
  filterComponent,
  onExport,

  runStatusFilter,
  onRunStatusFilterChange,
}: Props) {
  const runStatusLabel =
    runStatusFilter.length > 0
      ? `Run Status (${runStatusFilter.length})`
      : "Run Status";

  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-4">
      <div>
        <Button onClick={onCreate}>
          <Plus className="h-4 w-4 mr-2" />
          New Test Case
        </Button>
      </div>

      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search test cases..."
          value={searchTerm}
          onChange={(e) => onSearchTermChange(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Project filter */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="min-w-[220px] justify-between">
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

        <DropdownMenuContent align="end" className="w-[240px]">
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

      {/* NEW: Run status filter */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="min-w-[170px] justify-between">
            <span
              className={runStatusFilter.length ? "" : "text-muted-foreground"}
            >
              {runStatusLabel}
            </span>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 opacity-70" />
              <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
            </div>
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-[220px]">
          <DropdownMenuLabel>Filter by Run Status</DropdownMenuLabel>
          <DropdownMenuSeparator />

          {RUN_STATUS_OPTIONS.map((opt) => (
            <DropdownMenuCheckboxItem
              key={opt.value}
              checked={runStatusFilter.includes(opt.value)}
              onCheckedChange={() =>
                onRunStatusFilterChange(
                  toggleInArray(runStatusFilter, opt.value),
                )
              }
            >
              {opt.label}
            </DropdownMenuCheckboxItem>
          ))}

          <DropdownMenuSeparator />
          <DropdownMenuItem
            disabled={runStatusFilter.length === 0}
            onClick={() => onRunStatusFilterChange([])}
          >
            Clear
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <div className="flex gap-2 md:gap-3">
        {filterComponent}
        {exportButton ||
          (onExport && (
            <Button variant="outline" size="sm" onClick={onExport}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          ))}
      </div>
    </div>
  );
}
