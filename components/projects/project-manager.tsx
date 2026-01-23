"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth/auth-context";

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
import { ProjectEditorDialog } from "@/components/projects/projecteditor";

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
  { bg: string; border: string; text: string; accent: string }
> = {
  blue: {
    bg: "bg-blue-950/30",
    border: "border-blue-700/40",
    text: "text-blue-200",
    accent: "bg-blue-500",
  },
  green: {
    bg: "bg-emerald-950/30",
    border: "border-emerald-700/40",
    text: "text-emerald-200",
    accent: "bg-emerald-500",
  },
  purple: {
    bg: "bg-purple-950/30",
    border: "border-purple-700/40",
    text: "text-purple-200",
    accent: "bg-purple-500",
  },
  orange: {
    bg: "bg-orange-950/30",
    border: "border-orange-700/40",
    text: "text-orange-200",
    accent: "bg-orange-500",
  },
  red: {
    bg: "bg-red-950/30",
    border: "border-red-700/40",
    text: "text-red-200",
    accent: "bg-red-500",
  },
  pink: {
    bg: "bg-pink-950/30",
    border: "border-pink-700/40",
    text: "text-pink-200",
    accent: "bg-pink-500",
  },
  indigo: {
    bg: "bg-indigo-950/30",
    border: "border-indigo-700/40",
    text: "text-indigo-200",
    accent: "bg-indigo-500",
  },
  yellow: {
    bg: "bg-amber-950/30",
    border: "border-amber-700/40",
    text: "text-amber-200",
    accent: "bg-amber-500",
  },
  gray: {
    bg: "bg-slate-950/30",
    border: "border-slate-700/40",
    text: "text-slate-200",
    accent: "bg-slate-500",
  },
};

async function safeJson(res: Response) {
  const text = await res.text().catch(() => "");
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return null;
  }
}

export function ProjectManager() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [projects, setProjects] = useState<ProjectWithStats[]>([]);
  const [filteredProjects, setFilteredProjects] = useState<ProjectWithStats[]>(
    [],
  );
  const [loading, setLoading] = useState(false);

  const [showDialog, setShowDialog] = useState(false);
  const [editingProject, setEditingProject] = useState<ProjectWithStats | null>(
    null,
  );

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | "all">(
    "all",
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
    if (authLoading) return;
    if (!user) return;
    void fetchProjects();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user?.id]);

  useEffect(() => {
    filterProjects();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projects, searchQuery, statusFilter, activeTab]);

  async function fetchProjects() {
    setLoading(true);
    try {
      const res = await fetch("/api/projects/overview", { cache: "no-store" });

      if (res.status === 401) {
        toast.error("Your session has expired. Please sign in again.");
        router.replace("/login");
        return;
      }

      const payload = await safeJson(res);
      if (!res.ok) throw new Error(payload?.error ?? `Failed (${res.status})`);

      setProjects(payload?.projects ?? []);
    } catch (e) {
      console.error("Error fetching projects:", e);
      toast.error("Failed to load projects");
    } finally {
      setLoading(false);
    }
  }

  function filterProjects() {
    let filtered = projects;

    filtered =
      activeTab === "active"
        ? filtered.filter((p) => p.status !== "archived")
        : filtered.filter((p) => p.status === "archived");

    if (statusFilter !== "all")
      filtered = filtered.filter((p) => p.status === statusFilter);

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.description?.toLowerCase().includes(q),
      );
    }

    setFilteredProjects(filtered);
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

  async function saveProject() {
    if (!user) {
      toast.error("Please sign in to create or edit projects.");
      router.replace("/login");
      return;
    }

    if (!formData.name.trim()) {
      toast.error("Please enter a project name");
      return;
    }

    setLoading(true);
    try {
      const body = {
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        status: formData.status,
        color: formData.color,
        icon: formData.icon,
        start_date: formData.start_date || null,
        target_end_date: formData.target_end_date || null,
      };

      const res = await fetch(
        editingProject ? `/api/projects/${editingProject.id}` : `/api/projects`,
        {
          method: editingProject ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
      );

      if (res.status === 401) {
        toast.error("Your session has expired. Please sign in again.");
        router.replace("/login");
        return;
      }

      const payload = await safeJson(res);
      if (!res.ok) throw new Error(payload?.error ?? `Failed (${res.status})`);

      toast.success(editingProject ? "Project updated" : "Project created");
      setShowDialog(false);
      setEditingProject(null);
      resetForm();
      await fetchProjects();
    } catch (e) {
      console.error("Error saving project:", e);
      toast.error("Failed to save project");
    } finally {
      setLoading(false);
    }
  }

  async function deleteProject(id: string) {
    if (!user) {
      toast.error("Please sign in to delete projects.");
      router.replace("/login");
      return;
    }

    if (!confirm("Delete this project? Linked items will become unassigned."))
      return;

    setLoading(true);
    try {
      const res = await fetch(`/api/projects/${id}`, { method: "DELETE" });

      if (res.status === 401) {
        toast.error("Your session has expired. Please sign in again.");
        router.replace("/login");
        return;
      }

      const payload = await safeJson(res);
      if (!res.ok) throw new Error(payload?.error ?? `Failed (${res.status})`);

      toast.success("Project deleted");
      await fetchProjects();
    } catch (e) {
      console.error("Error deleting project:", e);
      toast.error("Failed to delete project");
    } finally {
      setLoading(false);
    }
  }

  async function toggleArchiveProject(
    id: string,
    currentStatus: ProjectStatus,
  ) {
    if (!user) {
      toast.error("Please sign in to update projects.");
      router.replace("/login");
      return;
    }

    setLoading(true);
    try {
      const newStatus: ProjectStatus =
        currentStatus === "archived" ? "active" : "archived";

      const res = await fetch(`/api/projects/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (res.status === 401) {
        toast.error("Your session has expired. Please sign in again.");
        router.replace("/login");
        return;
      }

      const payload = await safeJson(res);
      if (!res.ok) throw new Error(payload?.error ?? `Failed (${res.status})`);

      toast.success(
        newStatus === "archived" ? "Project archived" : "Project unarchived",
      );
      await fetchProjects();
    } catch (e) {
      console.error("Error updating project:", e);
      toast.error("Failed to update project");
    } finally {
      setLoading(false);
    }
  }

  const activeProjects = useMemo(
    () => projects.filter((p) => p.status === "active"),
    [projects],
  );
  const completedProjects = useMemo(
    () => projects.filter((p) => p.status === "completed"),
    [projects],
  );

  const totalItems = useMemo(
    () =>
      projects.reduce(
        (sum, p) =>
          sum + p.test_suites_count + p.requirements_count + p.templates_count,
        0,
      ),
    [projects],
  );

  // ---------- Render gates ----------
  if (authLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <FolderOpen className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Sign in required</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Please sign in to view and manage projects.
          </p>
          <Button asChild>
            <Link href="/login">Go to Login</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  // ---------- Main UI ----------
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div />
        <Button onClick={openNewDialog} size="lg">
          <Plus className="h-5 w-5 mr-2" />
          New Project
        </Button>
      </div>

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

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
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
          onValueChange={(v) => setStatusFilter(v as any)}
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

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
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
                      className={`absolute top-0 left-0 w-full h-1 ${colors.accent}`}
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
                            <CardTitle className="text-lg leading-snug break-words line-clamp-2">
                              <Link
                                href={`/projects/${project.id}`}
                                className="hover:underline"
                                title={project.name}
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
                                toggleArchiveProject(project.id, project.status)
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
                          <div className="font-bold">
                            {project.test_suites_count}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Suites
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="font-bold">
                            {project.requirements_count}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Reqs
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="font-bold">
                            {project.templates_count}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Templates
                          </div>
                        </div>
                      </div>
                    </CardContent>

                    <CardFooter className="flex items-center justify-between gap-2">
                      <Button asChild size="lg" variant="default">
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
                            toggleArchiveProject(project.id, project.status)
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
      </Tabs>

      <ProjectEditorDialog
        open={showDialog}
        mode={editingProject ? "edit" : "create"}
        loading={loading}
        formData={formData}
        setFormData={setFormData}
        onSave={saveProject}
        onCancel={() => {
          setShowDialog(false);
          setEditingProject(null);
          resetForm();
        }}
        projectIcons={projectIcons}
        colorClasses={colorClasses}
      />
    </div>
  );
}
