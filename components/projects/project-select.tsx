"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Folder,
  Smartphone,
  Code,
  Shield,
  Globe,
  Database,
  Cloud,
  Rocket,
  Package,
  Terminal,
  X,
  ChevronDown,
} from "lucide-react";
import { Project, ProjectColor } from "@/types/projects";

interface ProjectSelectProps {
  value?: string;
  onSelect: (project: Project | null) => void;
  disabled?: boolean;
  projects?: Project[];
  disableFetch?: boolean;
}

const projectIcons: Record<
  string,
  React.ComponentType<{ className?: string }>
> = {
  folder: Folder,
  smartphone: Smartphone,
  code: Code,
  shield: Shield,
  globe: Globe,
  database: Database,
  cloud: Cloud,
  rocket: Rocket,
  package: Package,
  terminal: Terminal,
};

const colorDot: Record<ProjectColor, string> = {
  blue: "bg-blue-500",
  green: "bg-emerald-500",
  purple: "bg-purple-500",
  orange: "bg-orange-500",
  red: "bg-rose-500",
  pink: "bg-pink-500",
  indigo: "bg-indigo-500",
  yellow: "bg-amber-500",
  gray: "bg-slate-400",
};

const statusChip: Record<string, string> = {
  active: "bg-cyan-100 text-cyan-700 dark:bg-cyan-400/10 dark:text-cyan-300",
  completed:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300",
  on_hold:
    "bg-amber-100 text-amber-700 dark:bg-amber-400/10 dark:text-amber-300",
  archived:
    "bg-slate-100 text-slate-500 dark:bg-slate-700/60 dark:text-slate-400",
};

export function ProjectSelect({
  value,
  onSelect,
  disabled,
  projects: projectsProp,
  disableFetch,
}: ProjectSelectProps) {
  const [projects, setProjects] = useState<Project[]>(projectsProp ?? []);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (projectsProp !== undefined) setProjects(projectsProp);
  }, [projectsProp]);

  useEffect(() => {
    if (disableFetch || projectsProp !== undefined) return;
    void fetchProjects();
  }, [disableFetch, projectsProp]);

  useEffect(() => {
    setSelectedProject(
      value ? (projects.find((p) => p.id === value) ?? null) : null,
    );
  }, [value, projects]);

  async function fetchProjects() {
    setLoading(true);
    try {
      const res = await fetch("/api/projects/list", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to load projects");
      const data = await res.json();
      setProjects(data.projects ?? []);
    } catch (err) {
      console.error("[ProjectSelect] fetch error:", err);
    } finally {
      setLoading(false);
    }
  }

  function handleSelect(projectId: string) {
    const project = projects.find((p) => p.id === projectId) ?? null;
    setSelectedProject(project);
    onSelect(project);
  }

  function clearProject() {
    setSelectedProject(null);
    onSelect(null);
  }

  const emptyState = useMemo(
    () => projects.length === 0 && !loading,
    [projects.length, loading],
  );

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-medium text-slate-600 dark:text-slate-400">
          Assign to Project{" "}
          <span className="text-slate-400 dark:text-slate-500">(Optional)</span>
        </Label>
        {selectedProject && (
          <button
            type="button"
            onClick={clearProject}
            disabled={disabled}
            className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 transition dark:hover:text-slate-300"
          >
            <X className="h-3 w-3" /> Clear
          </button>
        )}
      </div>

      {selectedProject ? (
        // Selected state — compact card
        <div className="flex items-center gap-3 rounded-xl border border-cyan-200 bg-cyan-50 px-4 py-3 dark:border-cyan-400/20 dark:bg-cyan-400/5">
          <div
            className={`h-2 w-2 rounded-full shrink-0 ${colorDot[selectedProject.color as ProjectColor] ?? "bg-slate-400"}`}
          />
          {(() => {
            const Icon = projectIcons[selectedProject.icon] ?? Folder;
            return (
              <Icon className="h-4 w-4 shrink-0 text-cyan-600 dark:text-cyan-400" />
            );
          })()}
          <div className="min-w-0 flex-1">
            <div className="truncate text-[13px] font-medium text-slate-800 dark:text-slate-100">
              {selectedProject.name}
            </div>
            {selectedProject.description && (
              <div className="truncate text-[11px] text-slate-400 dark:text-slate-500">
                {selectedProject.description}
              </div>
            )}
          </div>
          <span
            className={`shrink-0 rounded-full px-2 py-0.5 font-mono text-[10px] ${statusChip[selectedProject.status] ?? statusChip.active}`}
          >
            {selectedProject.status.replace("_", " ")}
          </span>
        </div>
      ) : (
        <>
          <Select
            value={value}
            onValueChange={handleSelect}
            disabled={disabled || loading}
          >
            <SelectTrigger className="border-slate-200 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
              <SelectValue
                placeholder={loading ? "Loading projects…" : "Select a project"}
              />
            </SelectTrigger>
            <SelectContent className="border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
              {projects.map((project) => {
                const Icon = projectIcons[project.icon] ?? Folder;
                return (
                  <SelectItem key={project.id} value={project.id}>
                    <div className="flex items-center gap-2">
                      <div
                        className={`h-2 w-2 rounded-full ${colorDot[project.color as ProjectColor] ?? "bg-slate-400"}`}
                      />
                      <Icon className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
                      <span>{project.name}</span>
                      <span
                        className={`ml-auto rounded-full px-1.5 py-0.5 font-mono text-[9px] ${statusChip[project.status] ?? statusChip.active}`}
                      >
                        {project.status.replace("_", " ")}
                      </span>
                    </div>
                  </SelectItem>
                );
              })}
              {emptyState && (
                <div className="px-2 py-6 text-center text-sm text-slate-400 dark:text-slate-500">
                  No active projects. Create one first.
                </div>
              )}
            </SelectContent>
          </Select>
          <p className="text-[11px] text-slate-400 dark:text-slate-500">
            Assign this to a project for better organization.
          </p>
        </>
      )}
    </div>
  );
}
