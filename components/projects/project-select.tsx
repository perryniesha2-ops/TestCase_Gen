"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

import { Project, ProjectColor, ProjectStatus } from "@/types/projects";

interface ProjectSelectProps {
  value?: string;
  onSelect: (project: Project | null) => void;
  disabled?: boolean;
  placeholder?: string;
  allowEmpty?: boolean;
  /** Provide projects from a parent bootstrap to skip the internal fetch */
  projects?: Project[];
  /** If true, never fetch internally — use only what's in the projects prop */
  disableFetch?: boolean;
}

// ─── Icon / color maps ────────────────────────────────────────────────────────

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

const colorDotClass: Record<ProjectColor, string> = {
  blue: "bg-blue-500",
  green: "bg-green-500",
  purple: "bg-purple-500",
  orange: "bg-orange-500",
  red: "bg-red-500",
  pink: "bg-pink-500",
  indigo: "bg-indigo-500",
  yellow: "bg-yellow-500",
  gray: "bg-gray-500",
};

// ─── Component ────────────────────────────────────────────────────────────────

export function ProjectSelect({
  value,
  onSelect,
  disabled,
  projects: projectsProp,
  disableFetch,
}: ProjectSelectProps) {
  const [projects, setProjects] = useState<Project[]>(projectsProp ?? []);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [loading, setLoading] = useState(false);

  // ── Sync internal list when parent provides/updates projects ───────────────
  // useState(projectsProp ?? []) only runs once at mount. The parent typically
  // resolves projectsProp after an async bootstrap, so without this effect the
  // dropdown stays empty even after the parent has data.
  useEffect(() => {
    if (projectsProp !== undefined) {
      setProjects(projectsProp);
    }
  }, [projectsProp]);

  // ── Fetch from API when not using parent-provided list ─────────────────────
  // Only runs when disableFetch=false AND projectsProp is not provided.
  useEffect(() => {
    if (disableFetch) return;
    if (projectsProp !== undefined) return;
    void fetchProjects();
  }, [disableFetch, projectsProp]);

  // ── Keep selectedProject in sync with value + current list ────────────────
  useEffect(() => {
    if (value) {
      setSelectedProject(projects.find((p) => p.id === value) ?? null);
    } else {
      setSelectedProject(null);
    }
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

  function handleProjectSelect(projectId: string) {
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
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">
          Assign to Project (Optional)
        </Label>
        {selectedProject && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={clearProject}
            disabled={disabled}
          >
            <X className="h-4 w-4 mr-1" />
            Clear
          </Button>
        )}
      </div>

      {selectedProject ? (
        <Card className="border-2 border-primary">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              {(() => {
                const Icon = projectIcons[selectedProject.icon] ?? Folder;
                return <Icon className="h-4 w-4 text-primary" />;
              })()}
              <CardTitle className="text-base">
                {selectedProject.name}
              </CardTitle>
              <Badge variant="outline" className="text-xs">
                {selectedProject.status}
              </Badge>
            </div>
            {selectedProject.description && (
              <CardDescription className="text-xs">
                {selectedProject.description}
              </CardDescription>
            )}
          </CardHeader>
        </Card>
      ) : (
        <>
          <Select
            value={value}
            onValueChange={handleProjectSelect}
            disabled={disabled || loading}
          >
            <SelectTrigger className="h-10">
              <SelectValue
                placeholder={
                  loading ? "Loading projects..." : "Select a project"
                }
              />
            </SelectTrigger>
            <SelectContent>
              {projects.map((project) => {
                const Icon = projectIcons[project.icon] ?? Folder;
                return (
                  <SelectItem key={project.id} value={project.id}>
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4" />
                      <span>{project.name}</span>
                      <Badge variant="secondary" className="text-xs ml-auto">
                        {project.status}
                      </Badge>
                    </div>
                  </SelectItem>
                );
              })}

              {emptyState && (
                <div className="px-2 py-6 text-center text-sm text-muted-foreground">
                  No active projects. Create one first!
                </div>
              )}
            </SelectContent>
          </Select>

          <p className="text-xs text-muted-foreground">
            Assign this to a project for better organization
          </p>
        </>
      )}

      {/* Project Details Dialog */}
      {selectedProject && (
        <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {(() => {
                  const Icon = projectIcons[selectedProject.icon] ?? Folder;
                  return <Icon className="h-5 w-5" />;
                })()}
                {selectedProject.name}
              </DialogTitle>
              <DialogDescription>
                {selectedProject.description ?? "No description provided"}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="flex items-center gap-2">
                <Badge>{selectedProject.status}</Badge>
                <div
                  className={`w-3 h-3 rounded-full ${
                    colorDotClass[selectedProject.color] ?? "bg-gray-500"
                  }`}
                />
              </div>

              {(selectedProject.test_suites_count != null ||
                selectedProject.requirements_count != null ||
                selectedProject.templates_count != null) && (
                <div className="space-y-3">
                  <h4 className="font-medium text-sm">Project Contents</h4>
                  <div className="grid gap-2 text-sm">
                    <div className="flex justify-between py-2 border-b">
                      <span className="text-muted-foreground">
                        Test Suites:
                      </span>
                      <span className="font-medium">
                        {selectedProject.test_suites_count ?? 0}
                      </span>
                    </div>
                    <div className="flex justify-between py-2 border-b">
                      <span className="text-muted-foreground">
                        Requirements:
                      </span>
                      <span className="font-medium">
                        {selectedProject.requirements_count ?? 0}
                      </span>
                    </div>
                    <div className="flex justify-between py-2">
                      <span className="text-muted-foreground">Templates:</span>
                      <span className="font-medium">
                        {selectedProject.templates_count ?? 0}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
