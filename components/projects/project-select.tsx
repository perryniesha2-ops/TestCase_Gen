"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
  CardContent,
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

type ProjectStatus = "active" | "archived" | "completed" | "on_hold";
type ProjectColor =
  | "blue"
  | "green"
  | "purple"
  | "orange"
  | "red"
  | "pink"
  | "indigo"
  | "yellow"
  | "gray";

interface Project {
  id: string;
  name: string;
  description?: string | null;
  status: ProjectStatus;
  color: ProjectColor;
  icon: string;
  test_suites_count?: number;
  requirements_count?: number;
  templates_count?: number;
}

interface ProjectSelectProps {
  value?: string;
  onSelect: (project: Project | null) => void;
  disabled?: boolean;
  placeholder?: string;
  allowEmpty?: boolean;
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

export function ProjectSelect({
  value,
  onSelect,
  disabled,
}: ProjectSelectProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    if (value) {
      const project = projects.find((p) => p.id === value);
      setSelectedProject(project || null);
    } else {
      setSelectedProject(null);
    }
  }, [value, projects]);

  async function fetchProjects() {
    setLoading(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .eq("status", "active")
        .order("name");

      if (error) throw error;

      // Get counts for each project
      const projectsWithCounts = await Promise.all(
        (data || []).map(async (project) => {
          const [
            { count: suitesCount },
            { count: reqCount },
            { count: templatesCount },
          ] = await Promise.all([
            supabase
              .from("test_suites")
              .select("*", { count: "exact", head: true })
              .eq("project_id", project.id),
            supabase
              .from("requirements")
              .select("*", { count: "exact", head: true })
              .eq("project_id", project.id),
            supabase
              .from("test_case_templates")
              .select("*", { count: "exact", head: true })
              .eq("project_id", project.id),
          ]);

          return {
            ...project,
            test_suites_count: suitesCount || 0,
            requirements_count: reqCount || 0,
            templates_count: templatesCount || 0,
          } as Project;
        })
      );

      setProjects(projectsWithCounts);
    } catch (error) {
      console.error("Error fetching projects:", error);
    } finally {
      setLoading(false);
    }
  }

  function handleProjectSelect(projectId: string) {
    const project = projects.find((p) => p.id === projectId);
    if (!project) return;

    setSelectedProject(project);
    onSelect(project);
    toast.success(`Assigned to project "${project.name}"`);
  }

  function clearProject() {
    setSelectedProject(null);
    onSelect(null);
  }

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
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {(() => {
                  const Icon = projectIcons[selectedProject.icon] || Folder;
                  return <Icon className="h-4 w-4 text-primary" />;
                })()}
                <CardTitle className="text-base">
                  {selectedProject.name}
                </CardTitle>
                <Badge variant="outline" className="text-xs">
                  {selectedProject.status}
                </Badge>
              </div>
            </div>
            {selectedProject.description && (
              <CardDescription className="text-xs">
                {selectedProject.description}
              </CardDescription>
            )}
          </CardHeader>
          <CardContent className="pb-3">
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="text-center">
                <div className="font-bold text-blue-600">
                  {selectedProject.test_suites_count || 0}
                </div>
                <div className="text-muted-foreground">Suites</div>
              </div>
              <div className="text-center">
                <div className="font-bold text-purple-600">
                  {selectedProject.requirements_count || 0}
                </div>
                <div className="text-muted-foreground">Reqs</div>
              </div>
              <div className="text-center">
                <div className="font-bold text-green-600">
                  {selectedProject.templates_count || 0}
                </div>
                <div className="text-muted-foreground">Templates</div>
              </div>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-full mt-3"
              onClick={() => setShowDetailsDialog(true)}
            >
              View Details
            </Button>
          </CardContent>
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
                const Icon = projectIcons[project.icon] || Folder;
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

              {projects.length === 0 && !loading && (
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
                  const Icon = projectIcons[selectedProject.icon] || Folder;
                  return <Icon className="h-5 w-5" />;
                })()}
                {selectedProject.name}
              </DialogTitle>
              <DialogDescription>
                {selectedProject.description || "No description provided"}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="flex items-center gap-2">
                <Badge>{selectedProject.status}</Badge>
                <div
                  className={`w-3 h-3 rounded-full bg-${selectedProject.color}-500`}
                />
              </div>

              <div className="space-y-3">
                <h4 className="font-medium text-sm">Project Contents</h4>
                <div className="grid gap-2 text-sm">
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-muted-foreground">Test Suites:</span>
                    <span className="font-medium">
                      {selectedProject.test_suites_count || 0}
                    </span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-muted-foreground">Requirements:</span>
                    <span className="font-medium">
                      {selectedProject.requirements_count || 0}
                    </span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-muted-foreground">Templates:</span>
                    <span className="font-medium">
                      {selectedProject.templates_count || 0}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
