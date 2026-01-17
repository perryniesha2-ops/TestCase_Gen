"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth/auth-context";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  FolderOpen,
  Plus,
  Trash2,
  Edit,
  Archive,
  MoreVertical,
  Search,
  Filter,
  Loader2,
  CheckCircle,
  Clock,
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
} from "lucide-react";

// Types
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

interface ProjectWithStats {
  id: string;
  user_id: string;
  name: string;
  description?: string | null;
  status: ProjectStatus;
  color: ProjectColor;
  icon: string;
  start_date?: string | null;
  target_end_date?: string | null;
  actual_end_date?: string | null;
  tags: string[];
  created_at: string;
  updated_at: string;
  test_suites_count: number;
  requirements_count: number;
  templates_count: number;
  test_cases_count: number;
}

interface ProjectFormData {
  name: string;
  description: string;
  status: ProjectStatus;
  color: ProjectColor;
  icon: string;
  start_date: string;
  target_end_date: string;
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

const colorClasses: Record<
  ProjectColor,
  { bg: string; border: string; text: string }
> = {
  blue: { bg: "bg-blue-100", border: "border-blue-300", text: "text-blue-700" },
  green: {
    bg: "bg-green-100",
    border: "border-green-300",
    text: "text-green-700",
  },
  purple: {
    bg: "bg-purple-100",
    border: "border-purple-300",
    text: "text-purple-700",
  },
  orange: {
    bg: "bg-orange-100",
    border: "border-orange-300",
    text: "text-orange-700",
  },
  red: { bg: "bg-red-100", border: "border-red-300", text: "text-red-700" },
  pink: { bg: "bg-pink-100", border: "border-pink-300", text: "text-pink-700" },
  indigo: {
    bg: "bg-indigo-100",
    border: "border-indigo-300",
    text: "text-indigo-700",
  },
  yellow: {
    bg: "bg-yellow-100",
    border: "border-yellow-300",
    text: "text-yellow-700",
  },
  gray: { bg: "bg-gray-100", border: "border-gray-300", text: "text-gray-700" },
};

export function ProjectManager() {
  const { user, loading: authLoading } = useAuth();
  const [projects, setProjects] = useState<ProjectWithStats[]>([]);
  const [filteredProjects, setFilteredProjects] = useState<ProjectWithStats[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingProject, setEditingProject] = useState<ProjectWithStats | null>(
    null
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | "all">(
    "all"
  );
  const [activeTab, setActiveTab] = useState<"active" | "archived">("active");

  const [formData, setFormData] = useState<ProjectFormData>({
    name: "",
    description: "",
    status: "active",
    color: "blue",
    icon: "folder",
    start_date: "",
    target_end_date: "",
  });

  useEffect(() => {
    if (user) fetchProjects();
  }, [user]);

  useEffect(() => {
    if (user) {
      filterProjects();
    }
  }, [projects, searchQuery, statusFilter, activeTab, user]);

  async function fetchProjects() {
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/projects/overview", { cache: "no-store" });
      const raw = await res.text().catch(() => "");
      const payload = raw ? JSON.parse(raw) : null;

      if (!res.ok) throw new Error(payload?.error ?? `Failed (${res.status})`);

      setProjects(payload.projects ?? []);
    } catch (error) {
      console.error("Error fetching projects:", error);
      toast.error("Failed to load projects");
    } finally {
      setLoading(false);
    }
  }

  function filterProjects() {
    let filtered = projects;

    // Filter by tab
    filtered =
      activeTab === "active"
        ? filtered.filter((p) => p.status !== "archived")
        : filtered.filter((p) => p.status === "archived");

    // Filter by status
    if (statusFilter !== "all") {
      filtered = filtered.filter((p) => p.status === statusFilter);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          p.description?.toLowerCase().includes(query)
      );
    }

    setFilteredProjects(filtered);
  }

  async function saveProject() {
    if (!user) return;

    if (!formData.name.trim()) {
      toast.error("Please enter a project name");
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();

      const projectData = {
        user_id: user.id,
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        status: formData.status,
        color: formData.color,
        icon: formData.icon,
        start_date: formData.start_date || null,
        target_end_date: formData.target_end_date || null,
        tags: [],
      };

      if (editingProject) {
        const { error } = await supabase
          .from("projects")
          .update(projectData)
          .eq("id", editingProject.id);

        if (error) throw error;
        toast.success("Project updated successfully");
      } else {
        const { error } = await supabase.from("projects").insert(projectData);

        if (error) throw error;
        toast.success("Project created successfully");
      }

      setShowDialog(false);
      setEditingProject(null);
      resetForm();
      await fetchProjects();
    } catch (error) {
      console.error("Error saving project:", error);
      toast.error("Failed to save project");
    } finally {
      setLoading(false);
    }
  }

  async function deleteProject(id: string) {
    if (!user) {
      toast.error("Please sign in to delete projects");
      return;
    }

    if (!confirm("Delete this project? Linked items will become unassigned."))
      return;

    try {
      const supabase = createClient();
      const { error } = await supabase.from("projects").delete().eq("id", id);

      if (error) throw error;
      toast.success("Project deleted");
      await fetchProjects();
    } catch (error) {
      console.error("Error deleting project:", error);
      toast.error("Failed to delete project");
    }
  }

  async function archiveProject(id: string, currentStatus: ProjectStatus) {
    if (!user) {
      toast.error("Please sign in to update projects");
      return;
    }
    const newStatus = currentStatus === "archived" ? "active" : "archived";

    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("projects")
        .update({ status: newStatus })
        .eq("id", id);

      if (error) throw error;
      toast.success(
        `Project ${newStatus === "archived" ? "archived" : "unarchived"}`
      );
      await fetchProjects();
    } catch (error) {
      console.error("Error updating project:", error);
      toast.error("Failed to update project");
    }
  }

  function resetForm() {
    setFormData({
      name: "",
      description: "",
      status: "active",
      color: "blue",
      icon: "folder",
      start_date: "",
      target_end_date: "",
    });
  }

  function openEditDialog(project: ProjectWithStats) {
    setEditingProject(project);
    setFormData({
      name: project.name,
      description: project.description || "",
      status: project.status,
      color: project.color,
      icon: project.icon,
      start_date: project.start_date || "",
      target_end_date: project.target_end_date || "",
    });
    setShowDialog(true);
  }

  function openNewDialog() {
    setEditingProject(null);
    resetForm();
    setShowDialog(true);
  }

  const activeProjects = projects.filter((p) => p.status === "active");
  const completedProjects = projects.filter((p) => p.status === "completed");
  const totalItems = projects.reduce(
    (sum, p) =>
      sum + p.test_suites_count + p.requirements_count + p.templates_count,
    0
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div></div>
        <Button onClick={openNewDialog} size="lg">
          <Plus className="h-5 w-5 mr-2" />
          New Project
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Total Projects
            </CardTitle>
            <FolderOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{projects.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeProjects.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedProjects.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Items</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalItems}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search projects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <Select
          value={statusFilter}
          onValueChange={(value) =>
            setStatusFilter(value as ProjectStatus | "all")
          }
        >
          <SelectTrigger className="w-full sm:w-[200px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="on_hold">On Hold</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as "active" | "archived")}
      >
        <TabsList>
          <TabsTrigger value="active">Active Projects</TabsTrigger>
          <TabsTrigger value="archived">Archived</TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="mt-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredProjects.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <FolderOpen className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  No projects found
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {searchQuery || statusFilter !== "all"
                    ? "Try adjusting your filters"
                    : "Create your first project to get started"}
                </p>
                {!searchQuery && statusFilter === "all" && (
                  <Button onClick={openNewDialog}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Project
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredProjects.map((project) => {
                const Icon = projectIcons[project.icon] || Folder;
                const colors = colorClasses[project.color];

                return (
                  <Card
                    key={project.id}
                    className="relative overflow-hidden hover:shadow-lg transition-shadow"
                  >
                    <div
                      className={`absolute top-0 left-0 w-full h-1 bg-${project.color}-500`}
                    />

                    <CardHeader className="pt-6">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div
                            className={`p-2 rounded-lg ${colors.bg} ${colors.border} border`}
                          >
                            <Icon className={`h-5 w-5 ${colors.text}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <CardTitle className="text-lg truncate">
                              <Link
                                href={`/projects/${project.id}`}
                                className="hover:underline"
                              >
                                {project.name}
                              </Link>
                            </CardTitle>

                            <Badge variant="outline" className="mt-1 text-xs">
                              {project.status}
                            </Badge>
                          </div>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => openEditDialog(project)}
                            >
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() =>
                                archiveProject(project.id, project.status)
                              }
                            >
                              <Archive className="h-4 w-4 mr-2" />
                              {project.status === "archived"
                                ? "Unarchive"
                                : "Archive"}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => deleteProject(project.id)}
                              className="text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      {project.description && (
                        <CardDescription className="line-clamp-2 mt-2">
                          {project.description}
                        </CardDescription>
                      )}
                    </CardHeader>

                    <CardContent className="space-y-3">
                      <div className="grid grid-cols-3 gap-2 text-sm">
                        <div className="text-center">
                          <div className="font-bold text-blue-600">
                            {project.test_suites_count}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Suites
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="font-bold text-purple-600">
                            {project.requirements_count}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Reqs
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="font-bold text-green-600">
                            {project.templates_count}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Templates
                          </div>
                        </div>
                      </div>

                      {(project.start_date || project.target_end_date) && (
                        <div className="text-xs text-muted-foreground border-t pt-2">
                          {project.start_date && (
                            <div>
                              Started:{" "}
                              {new Date(
                                project.start_date
                              ).toLocaleDateString()}
                            </div>
                          )}
                          {project.target_end_date && (
                            <div>
                              Target:{" "}
                              {new Date(
                                project.target_end_date
                              ).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                      )}
                    </CardContent>
                    <CardFooter className="flex items-center justify-between gap-2">
                      <Button asChild size="sm">
                        <Link href={`/projects/${project.id}`}>Open</Link>
                      </Button>

                      <Button asChild size="sm" variant="outline">
                        <Link
                          href={`/projects/${project.id}/settings/integrations`}
                        >
                          Integrations
                        </Link>
                      </Button>
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="archived" className="mt-6">
          {/* Same structure as active tab */}
          {filteredProjects.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Archive className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  No archived projects
                </h3>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredProjects.map((project) => {
                const Icon = projectIcons[project.icon] || Folder;
                const colors = colorClasses[project.color];

                return (
                  <Card key={project.id} className="relative opacity-75">
                    <CardHeader>
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${colors.bg}`}>
                          <Icon className={`h-5 w-5 ${colors.text}`} />
                        </div>
                        <div className="flex-1">
                          <CardTitle className="text-lg">
                            {project.name}
                          </CardTitle>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            archiveProject(project.id, project.status)
                          }
                        >
                          Restore
                        </Button>
                      </div>
                    </CardHeader>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
        <div className="h-2" />
      </Tabs>
      <div className="h-2" />

      {/* Create/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingProject ? "Edit Project" : "Create New Project"}
            </DialogTitle>
            <DialogDescription>
              {editingProject
                ? "Update your project details"
                : "Create a new project to organize your test work"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Project Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="e.g., Mobile App v2.0"
                maxLength={100}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Describe this project..."
                rows={3}
                maxLength={500}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) =>
                    setFormData({ ...formData, status: value as ProjectStatus })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="on_hold">On Hold</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="icon">Icon</Label>
                <Select
                  value={formData.icon}
                  onValueChange={(value) =>
                    setFormData({ ...formData, icon: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(projectIcons).map(([key, Icon]) => (
                      <SelectItem key={key} value={key}>
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4" />
                          {key}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Color</Label>
              <div className="flex gap-2 flex-wrap">
                {(Object.keys(colorClasses) as ProjectColor[]).map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setFormData({ ...formData, color })}
                    className={`w-10 h-10 rounded-full bg-${color}-500 ${
                      formData.color === color
                        ? "ring-2 ring-offset-2 ring-primary"
                        : ""
                    }`}
                    title={color}
                  />
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start_date">Start Date</Label>
                <Input
                  id="start_date"
                  type="date"
                  value={formData.start_date}
                  onChange={(e) =>
                    setFormData({ ...formData, start_date: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="target_end_date">Target End Date</Label>
                <Input
                  id="target_end_date"
                  type="date"
                  value={formData.target_end_date}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      target_end_date: e.target.value,
                    })
                  }
                />
              </div>
            </div>
          </div>
          <div className="h-2" />

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowDialog(false);
                setEditingProject(null);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={saveProject}
              disabled={loading || !formData.name.trim()}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : editingProject ? (
                "Update Project"
              ) : (
                "Create Project"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
