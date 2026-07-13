"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth/auth-context";
import {
  FolderOpen,
  Plus,
  Trash2,
  Edit,
  Archive,
  MoreVertical,
  Search,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ProjectEditorDialog } from "@/components/projects/projecteditor";
import { ProjectStatus, ProjectColor, ProjectFormData } from "@/types/projects";

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

const colorAccent: Record<ProjectColor, string> = {
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

const colorIconBg: Record<ProjectColor, string> = {
  blue: "bg-blue-100 text-blue-600 dark:bg-blue-400/10 dark:text-blue-300",
  green:
    "bg-emerald-100 text-emerald-600 dark:bg-emerald-400/10 dark:text-emerald-300",
  purple:
    "bg-purple-100 text-purple-600 dark:bg-purple-400/10 dark:text-purple-300",
  orange:
    "bg-orange-100 text-orange-600 dark:bg-orange-400/10 dark:text-orange-300",
  red: "bg-rose-100 text-rose-600 dark:bg-rose-400/10 dark:text-rose-300",
  pink: "bg-pink-100 text-pink-600 dark:bg-pink-400/10 dark:text-pink-300",
  indigo:
    "bg-indigo-100 text-indigo-600 dark:bg-indigo-400/10 dark:text-indigo-300",
  yellow:
    "bg-amber-100 text-amber-600 dark:bg-amber-400/10 dark:text-amber-300",
  gray: "bg-slate-100 text-slate-500 dark:bg-slate-700/60 dark:text-slate-400",
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

const statusChip: Record<ProjectStatus, string> = {
  active: "bg-cyan-100 text-cyan-700 dark:bg-cyan-400/10 dark:text-cyan-300",
  completed:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300",
  on_hold:
    "bg-amber-100 text-amber-700 dark:bg-amber-400/10 dark:text-amber-300",
  archived:
    "bg-slate-100 text-slate-500 dark:bg-slate-700/60 dark:text-slate-400",
};

async function safeJson(res: Response) {
  const text = await res.text().catch(() => "");
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return null;
  }
}

function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800/60 ${className}`}
    />
  );
}

function ProjectStatsStrip({ projects }: { projects: ProjectWithStats[] }) {
  const active = projects.filter((p) => p.status === "active").length;
  const completed = projects.filter((p) => p.status === "completed").length;
  const totalItems = projects.reduce(
    (s, p) =>
      s + p.test_suites_count + p.requirements_count + p.templates_count,
    0,
  );
  const cells = [
    { label: "Total projects", value: String(projects.length) },
    { label: "Active", value: String(active), tone: "ok" as const },
    { label: "Completed", value: String(completed) },
    { label: "Total items", value: String(totalItems) },
  ];
  return (
    <section className="mb-4 grid grid-cols-2 overflow-hidden rounded-2xl border border-slate-200 bg-white sm:grid-cols-4 sm:divide-x sm:divide-slate-100 dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900">
      {cells.map((c) => (
        <div key={c.label} className="px-5 py-4">
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
            {c.label}
          </div>
          <div
            className={`mt-1.5 font-mono text-xl font-semibold ${
              c.tone === "ok"
                ? "text-emerald-500 dark:text-emerald-400"
                : "text-slate-800 dark:text-slate-100"
            }`}
          >
            {c.value}
          </div>
        </div>
      ))}
    </section>
  );
}

function ProjectCard({
  project,
  onEdit,
  onArchive,
  onDelete,
}: {
  project: ProjectWithStats;
  onEdit: (p: ProjectWithStats) => void;
  onArchive: (p: ProjectWithStats) => void;
  onDelete: (id: string) => void;
}) {
  const Icon = projectIcons[project.icon] ?? Folder;
  return (
    <div className="relative flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      <div
        className={`absolute left-0 top-0 h-full w-1 ${colorAccent[project.color]}`}
      />
      <div className="flex flex-1 flex-col gap-3 px-5 py-4 pl-6">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${colorIconBg[project.color]}`}
            >
              <Icon className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <Link
                href={`/projects/${project.id}`}
                className="block truncate text-[14px] font-semibold text-slate-800 hover:text-cyan-600 transition-colors dark:text-slate-100 dark:hover:text-cyan-300"
              >
                {project.name}
              </Link>
              <span
                className={`mt-0.5 inline-block rounded-full px-2 py-0.5 font-mono text-[10px] ${statusChip[project.status]}`}
              >
                {project.status.replace("_", " ")}
              </span>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-300">
                <MoreVertical className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900"
            >
              <DropdownMenuItem
                onClick={() => onEdit(project)}
                className="text-slate-700 focus:bg-slate-50 dark:text-slate-200 dark:focus:bg-slate-800"
              >
                <Edit className="h-4 w-4 mr-2" /> Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onArchive(project)}
                className="text-slate-700 focus:bg-slate-50 dark:text-slate-200 dark:focus:bg-slate-800"
              >
                <Archive className="h-4 w-4 mr-2" />
                {project.status === "archived" ? "Unarchive" : "Archive"}
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-slate-100 dark:bg-slate-700" />
              <DropdownMenuItem
                onClick={() => onDelete(project.id)}
                className="text-rose-500 focus:bg-slate-50 dark:text-rose-400 dark:focus:bg-slate-800"
              >
                <Trash2 className="h-4 w-4 mr-2" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        {project.description && (
          <p className="line-clamp-2 text-[12.5px] leading-relaxed text-slate-400 dark:text-slate-500">
            {project.description}
          </p>
        )}
        <div className="flex items-center gap-4 text-xs text-slate-400 dark:text-slate-500">
          <span>
            <span className="font-mono text-slate-600 dark:text-slate-300">
              {project.test_suites_count}
            </span>{" "}
            suites
          </span>
          <span>
            <span className="font-mono text-slate-600 dark:text-slate-300">
              {project.requirements_count}
            </span>{" "}
            reqs
          </span>
          <span>
            <span className="font-mono text-slate-600 dark:text-slate-300">
              {project.templates_count}
            </span>{" "}
            templates
          </span>
        </div>
      </div>
      <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3 pl-6 dark:border-slate-800">
        <Link
          href={`/projects/${project.id}/settings/integrations`}
          className="text-xs text-slate-400 hover:text-cyan-600 transition-colors dark:hover:text-cyan-300"
        >
          Integrations →
        </Link>
        <Link
          href={`/projects/${project.id}`}
          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-cyan-400 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-200"
        >
          Open
        </Link>
      </div>
    </div>
  );
}

function ArchivedRow({
  project,
  onRestore,
  onDelete,
}: {
  project: ProjectWithStats;
  onRestore: (p: ProjectWithStats) => void;
  onDelete: (id: string) => void;
}) {
  const Icon = projectIcons[project.icon] ?? Folder;
  return (
    <li className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-950/60">
      <div
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${colorIconBg[project.color]}`}
      >
        <Icon className="h-3.5 w-3.5" />
      </div>
      <span className="flex-1 truncate text-[13.5px] text-slate-500 dark:text-slate-400">
        {project.name}
      </span>
      <button
        onClick={() => onRestore(project)}
        className="shrink-0 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-cyan-400 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-200"
      >
        Restore
      </button>
      <button
        onClick={() => onDelete(project.id)}
        className="shrink-0 rounded-lg border border-slate-200 px-2 py-1.5 text-xs text-rose-500 transition hover:border-rose-400 dark:border-slate-800 dark:text-rose-400"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </li>
  );
}

export function ProjectManager() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [projects, setProjects] = useState<ProjectWithStats[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [editingProject, setEditingProject] = useState<ProjectWithStats | null>(
    null,
  );
  const [searchQuery, setSearchQuery] = useState("");
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
    if (authLoading || !user) return;
    void fetchProjects();
  }, [authLoading, user?.id]);

  async function fetchProjects() {
    setLoading(true);
    try {
      const res = await fetch("/api/projects/overview", { cache: "no-store" });
      if (res.status === 401) {
        router.replace("/login");
        return;
      }
      const payload = await safeJson(res);
      if (!res.ok) throw new Error(payload?.error ?? `Failed (${res.status})`);
      setProjects(payload?.projects ?? []);
    } catch (e) {
      console.error(e);
      toast.error("Failed to load projects");
    } finally {
      setLoading(false);
    }
  }

  const activeProjects = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return projects.filter(
      (p) =>
        p.status !== "archived" &&
        (!q ||
          p.name.toLowerCase().includes(q) ||
          p.description?.toLowerCase().includes(q)),
    );
  }, [projects, searchQuery]);

  const archivedProjects = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return projects.filter(
      (p) =>
        p.status === "archived" && (!q || p.name.toLowerCase().includes(q)),
    );
  }, [projects, searchQuery]);

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
  function openNew() {
    setEditingProject(null);
    resetForm();
    setShowDialog(true);
  }
  function openEdit(p: ProjectWithStats) {
    setEditingProject(p);
    setFormData({
      name: p.name,
      description: p.description ?? "",
      status: p.status,
      color: p.color,
      icon: p.icon,
      start_date: p.start_date ?? "",
      target_end_date: p.target_end_date ?? "",
    });
    setShowDialog(true);
  }

  async function saveProject() {
    if (!formData.name.trim()) {
      toast.error("Enter a project name");
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
        editingProject ? `/api/projects/${editingProject.id}` : "/api/projects",
        {
          method: editingProject ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
      );
      if (res.status === 401) {
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
      console.error(e);
      toast.error("Failed to save project");
    } finally {
      setLoading(false);
    }
  }

  async function deleteProject(id: string) {
    if (!confirm("Delete this project? Linked items will become unassigned."))
      return;
    setLoading(true);
    try {
      const res = await fetch(`/api/projects/${id}`, { method: "DELETE" });
      if (res.status === 401) {
        router.replace("/login");
        return;
      }
      const payload = await safeJson(res);
      if (!res.ok) throw new Error(payload?.error ?? `Failed (${res.status})`);
      toast.success("Project deleted");
      await fetchProjects();
    } catch (e) {
      console.error(e);
      toast.error("Failed to delete project");
    } finally {
      setLoading(false);
    }
  }

  async function toggleArchive(project: ProjectWithStats) {
    const newStatus: ProjectStatus =
      project.status === "archived" ? "active" : "archived";
    setLoading(true);
    try {
      const res = await fetch(`/api/projects/${project.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.status === 401) {
        router.replace("/login");
        return;
      }
      const payload = await safeJson(res);
      if (!res.ok) throw new Error(payload?.error ?? `Failed (${res.status})`);
      toast.success(
        newStatus === "archived" ? "Project archived" : "Project restored",
      );
      await fetchProjects();
    } catch (e) {
      console.error(e);
      toast.error("Failed to update project");
    } finally {
      setLoading(false);
    }
  }

  if (authLoading)
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-12 w-full" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-44" />
          ))}
        </div>
      </div>
    );

  if (!user)
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white px-6 py-16 text-center dark:border-slate-800 dark:bg-slate-900">
        <FolderOpen className="h-8 w-8 text-slate-300 dark:text-slate-600" />
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Sign in to view and manage projects.
        </p>
        <Link
          href="/login"
          className="rounded-full border border-slate-200 px-4 py-1.5 text-xs font-medium text-slate-600 hover:border-slate-300 transition dark:border-slate-700 dark:text-slate-300 dark:hover:border-slate-500"
        >
          Go to login
        </Link>
      </div>
    );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-base font-semibold text-slate-800 dark:text-slate-100">
          Projects
        </h1>
        <button
          onClick={openNew}
          className="flex items-center gap-1.5 rounded-full border border-cyan-500/40 bg-cyan-50 px-4 py-1.5 text-xs font-medium text-cyan-700 transition hover:bg-cyan-100 dark:border-cyan-400/40 dark:bg-cyan-400/10 dark:text-cyan-300 dark:hover:bg-cyan-400/20"
        >
          <Plus className="h-3.5 w-3.5" /> New project
        </button>
      </div>

      <ProjectStatsStrip projects={projects} />

      {/* Search + tabs */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
          <input
            type="text"
            placeholder="Search projects…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-700 placeholder:text-slate-400 focus:border-cyan-400/60 focus:outline-none dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-200 dark:placeholder:text-slate-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <div className="flex gap-1 rounded-xl border border-slate-200 bg-white p-1 dark:border-slate-800 dark:bg-slate-900">
          {(["active", "archived"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                activeTab === tab
                  ? "bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-100"
                  : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
              <span
                className={`ml-1.5 font-mono text-[10px] ${
                  activeTab === tab
                    ? "text-slate-500 dark:text-slate-400"
                    : "text-slate-400 dark:text-slate-600"
                }`}
              >
                {tab === "active"
                  ? activeProjects.length
                  : archivedProjects.length}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-44" />
          ))}
        </div>
      ) : activeTab === "active" ? (
        activeProjects.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white px-6 py-16 text-center dark:border-slate-800 dark:bg-slate-900">
            <FolderOpen className="h-8 w-8 text-slate-300 dark:text-slate-600" />
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {searchQuery
                ? "No projects match your search."
                : "No projects yet — create your first one."}
            </p>
            {!searchQuery && (
              <button
                onClick={openNew}
                className="flex items-center gap-1.5 rounded-full border border-cyan-500/40 bg-cyan-50 px-4 py-1.5 text-xs font-medium text-cyan-700 transition hover:bg-cyan-100 dark:border-cyan-400/40 dark:bg-cyan-400/10 dark:text-cyan-300 dark:hover:bg-cyan-400/20"
              >
                <Plus className="h-3.5 w-3.5" /> New project
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {activeProjects.map((p) => (
              <ProjectCard
                key={p.id}
                project={p}
                onEdit={openEdit}
                onArchive={toggleArchive}
                onDelete={deleteProject}
              />
            ))}
          </div>
        )
      ) : archivedProjects.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white px-6 py-12 text-center dark:border-slate-800 dark:bg-slate-900">
          <Archive className="h-8 w-8 text-slate-300 dark:text-slate-600" />
          <p className="text-sm text-slate-500 dark:text-slate-400">
            No archived projects.
          </p>
        </div>
      ) : (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <h3 className="mb-3 text-sm font-semibold text-slate-800 dark:text-slate-100">
            Archived projects
          </h3>
          <ul className="space-y-2">
            {archivedProjects.map((p) => (
              <ArchivedRow
                key={p.id}
                project={p}
                onRestore={toggleArchive}
                onDelete={deleteProject}
              />
            ))}
          </ul>
        </section>
      )}

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
