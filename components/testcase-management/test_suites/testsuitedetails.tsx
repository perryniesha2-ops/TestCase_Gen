// components/test-library/SuiteDetailsTabs.tsx
"use client";

import React, {
  useEffect,
  useMemo,
  useState,
  useCallback,
  useRef,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Plus,
  Trash2,
  Search,
  GripVertical,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  FolderOpen,
  Loader2,
  Save,
  Settings,
  ListChecks,
  ArrowUpRight,
  Layers,
  FileCode,
} from "lucide-react";

import type { Project, TestSuite } from "@/types/test-cases";
import type { SuiteTestCase, TestCase } from "@/hooks/useSuiteDetails";

// Drag + drop
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

type SuiteEditForm = {
  name: string;
  description: string;
  status: string;
  suite_type: string;
  project_id: string; // "" when none
};

export type SuiteDetailsTabsProps = {
  suite: TestSuite;
  suiteTestCases: SuiteTestCase[];
  availableTestCases: TestCase[];
  projects: Project[];

  initialLoading: boolean;
  busy: boolean;

  defaultTab?: "details" | "assigned" | "available";
  onSaveSuite: (patch: SuiteEditForm) => Promise<void>;
  onAddTestCase: (testCase: TestCase) => Promise<void>;
  onRemoveTestCase: (suiteTestCaseId: string) => Promise<void>;
  onUpdatePriority: (
    suiteTestCaseId: string,
    priority: string,
  ) => Promise<void>;

  onReorderSuiteTestCases?: (
    items: Array<{ id: string; sequence_order: number }>,
  ) => Promise<void>;

  showOpenFullPageButton?: boolean;
};

function normalizeOrderValue(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 999999;
}

function ensureSequentialOrder<
  T extends { id: string; sequence_order: number },
>(items: T[]): T[] {
  return items.map((item, idx) => ({
    ...item,
    sequence_order: idx + 1,
  }));
}

function SortableAssignedRow(props: {
  suiteTestCase: SuiteTestCase;
  suiteKind: string;
  busy: boolean;
  getStatusIcon: (status?: string) => React.ReactNode;
  getPriorityColor: (priority: string) => string;
  onUpdatePriority: (
    suiteTestCaseId: string,
    priority: string,
  ) => Promise<void>;
  onRemoveTestCase: (suiteTestCaseId: string) => Promise<void>;
}) {
  const { suiteTestCase } = props;

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: suiteTestCase.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };

  return (
    <TableRow ref={setNodeRef} style={style}>
      <TableCell>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-md p-1 hover:bg-accent"
            aria-label="Drag to reorder"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-4 w-4 text-muted-foreground cursor-move" />
          </button>
          <span className="font-mono text-sm">
            {suiteTestCase.sequence_order}
          </span>
        </div>
      </TableCell>

      {/* ... rest of the row remains the same ... */}
      <TableCell className="w-[360px] max-w-[360px] font-medium">
        {suiteTestCase.test_cases ? (
          <div className="min-w-0">
            <div className="font-medium truncate">
              {suiteTestCase.test_cases.title}
            </div>
            <div className="text-sm text-muted-foreground line-clamp-1">
              {suiteTestCase.test_cases.description}
            </div>
          </div>
        ) : (
          <span className="text-sm text-red-500">
            Linked test case not found
          </span>
        )}
      </TableCell>

      <TableCell>
        {suiteTestCase.test_cases && (
          <Badge variant="outline" className="capitalize">
            {suiteTestCase.test_cases.platform ||
              suiteTestCase.test_cases.test_type}
          </Badge>
        )}
      </TableCell>

      <TableCell>
        <Select
          value={suiteTestCase.priority}
          onValueChange={(value) =>
            void props.onUpdatePriority(suiteTestCase.id, value)
          }
          disabled={props.busy}
        >
          <SelectTrigger className="w-[120px] h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="low">Low</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="critical">Critical</SelectItem>
          </SelectContent>
        </Select>
      </TableCell>

      <TableCell>
        {suiteTestCase.test_cases && (
          <div className="flex items-center gap-2">
            {props.getStatusIcon(suiteTestCase.test_cases.execution_status)}
            <span className="text-sm capitalize">
              {(suiteTestCase.test_cases.execution_status ?? "not_run").replace(
                "_",
                " ",
              )}
            </span>
          </div>
        )}
      </TableCell>

      <TableCell>
        <span className="text-sm">
          {suiteTestCase.estimated_duration_minutes}m
        </span>
      </TableCell>

      <TableCell className="text-right">
        <Button
          size="sm"
          variant="ghost"
          className="h-8 w-8 p-0 text-destructive hover:text-destructive"
          onClick={() => void props.onRemoveTestCase(suiteTestCase.id)}
          disabled={props.busy}
          aria-label="Remove test case from suite"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </TableCell>
    </TableRow>
  );
}

export function SuiteDetailsTabs(props: SuiteDetailsTabsProps) {
  const {
    suite,
    suiteTestCases,
    availableTestCases,
    projects,
    initialLoading,
    busy,
    defaultTab = "assigned",
    onSaveSuite,
    onAddTestCase,
    onRemoveTestCase,
    onUpdatePriority,
    onReorderSuiteTestCases,
    showOpenFullPageButton = false,
  } = props;

  const router = useRouter();
  const NONE = "none";

  const [activeTab, setActiveTab] = useState<string>(defaultTab);
  const [searchTerm, setSearchTerm] = useState("");
  const [savingSuite, setSavingSuite] = useState(false);

  // ✅ Use ref to track latest state for async operations
  const orderedRef = useRef<SuiteTestCase[]>([]);

  // Local ordered list (so drag reorder actually changes UI)
  const [orderedSuiteTestCases, setOrderedSuiteTestCases] = useState<
    SuiteTestCase[]
  >([]);

  // ✅ Update ref whenever state changes
  useEffect(() => {
    orderedRef.current = orderedSuiteTestCases;
  }, [orderedSuiteTestCases]);

  // Bulk select on available tab
  const [selectedAvailableIds, setSelectedAvailableIds] = useState<Set<string>>(
    new Set(),
  );
  const [bulkAssigning, setBulkAssigning] = useState(false);

  const [editForm, setEditForm] = useState<SuiteEditForm>({
    name: suite.name ?? "",
    description: suite.description ?? "",
    status: suite.status ?? "active",
    suite_type: suite.suite_type ?? "manual",
    project_id: suite.project_id ?? "",
  });

  // Get suite kind (with fallback for TypeScript)
  const suiteKind = (suite as any).kind || "regular";

  // keep form in sync when suite changes
  useEffect(() => {
    setEditForm({
      name: suite.name ?? "",
      description: suite.description ?? "",
      status: suite.status ?? "active",
      suite_type: suite.suite_type ?? "manual",
      project_id: suite.project_id ?? "",
    });
  }, [
    suite.id,
    suite.name,
    suite.description,
    suite.status,
    suite.suite_type,
    suite.project_id,
  ]);

  // ✅ Keep local ordered list in sync with incoming suiteTestCases
  // AND ensure sequence is always sequential (1, 2, 3, ...)
  useEffect(() => {
    const sorted = [...suiteTestCases].sort((a, b) => {
      const ao = normalizeOrderValue(a.sequence_order);
      const bo = normalizeOrderValue(b.sequence_order);
      if (ao !== bo) return ao - bo;
      return String(a.id).localeCompare(String(b.id));
    });

    // ✅ Ensure sequence_order is always 1, 2, 3, ... (fix any gaps or duplicates)
    const normalized = ensureSequentialOrder(sorted);

    setOrderedSuiteTestCases(normalized);
  }, [suiteTestCases]);

  function getStatusIcon(status?: string) {
    switch (status) {
      case "passed":
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "failed":
        return <XCircle className="h-4 w-4 text-red-600" />;
      case "blocked":
        return <AlertTriangle className="h-4 w-4 text-orange-600" />;
      case "skipped":
      case "not_run":
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  }

  function getPriorityColor(priority: string) {
    switch (priority) {
      case "critical":
        return "bg-red-500 text-white";
      case "high":
        return "bg-orange-500 text-white";
      case "medium":
        return "bg-yellow-500 text-black";
      case "low":
        return "bg-blue-500 text-white";
      default:
        return "bg-gray-500 text-white";
    }
  }

  function getProjectColor(color: string): string {
    const colors: Record<string, string> = {
      blue: "text-blue-500",
      green: "text-green-500",
      purple: "text-purple-500",
      orange: "text-orange-500",
      red: "text-red-500",
      pink: "text-pink-500",
      indigo: "text-indigo-500",
      yellow: "text-yellow-500",
      gray: "text-gray-500",
    };
    return colors[color] || "text-gray-500";
  }

  const assignedTestCaseIds = useMemo(() => {
    return new Set(
      orderedSuiteTestCases.map(
        (stc) => stc.test_case_id || stc.platform_test_case_id,
      ),
    );
  }, [orderedSuiteTestCases]);

  const filteredAvailableTestCases = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return availableTestCases.filter((tc) => {
      if (assignedTestCaseIds.has(tc.id)) return false;
      if (!q) return true;
      return tc.title.toLowerCase().includes(q);
    });
  }, [availableTestCases, assignedTestCaseIds, searchTerm]);

  const visibleAvailableIds = useMemo(
    () => filteredAvailableTestCases.map((t) => t.id),
    [filteredAvailableTestCases],
  );

  const allVisibleSelected = useMemo(() => {
    if (visibleAvailableIds.length === 0) return false;
    return visibleAvailableIds.every((id) => selectedAvailableIds.has(id));
  }, [selectedAvailableIds, visibleAvailableIds]);

  const someVisibleSelected = useMemo(() => {
    return visibleAvailableIds.some((id) => selectedAvailableIds.has(id));
  }, [selectedAvailableIds, visibleAvailableIds]);

  const toggleSelectVisibleAll = useCallback(() => {
    setSelectedAvailableIds((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) {
        for (const id of visibleAvailableIds) next.delete(id);
      } else {
        for (const id of visibleAvailableIds) next.add(id);
      }
      return next;
    });
  }, [allVisibleSelected, visibleAvailableIds]);

  const toggleSelectOne = useCallback((id: string) => {
    setSelectedAvailableIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const clearSelection = useCallback(
    () => setSelectedAvailableIds(new Set()),
    [],
  );

  async function saveSuite() {
    if (!editForm.name.trim()) {
      setActiveTab("details");
      return;
    }
    setSavingSuite(true);
    try {
      await onSaveSuite(editForm);
    } finally {
      setSavingSuite(false);
    }
  }

  // ✅ Fixed DnD reorder handling
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  const handleDragEnd = useCallback(
    async (event: any) => {
      const { active, over } = event;
      if (!over || active?.id === over?.id) return;

      // ✅ Calculate the new order synchronously from current state
      const currentItems = orderedRef.current;
      const oldIndex = currentItems.findIndex((x) => x.id === active.id);
      const newIndex = currentItems.findIndex((x) => x.id === over.id);

      if (oldIndex < 0 || newIndex < 0) return;

      const moved = arrayMove(currentItems, oldIndex, newIndex);
      const reordered = ensureSequentialOrder(moved);

      // ✅ Update state optimistically
      setOrderedSuiteTestCases(reordered);

      // ✅ Persist to backend
      if (onReorderSuiteTestCases) {
        try {
          const payload = reordered.map((item) => ({
            id: item.id,
            sequence_order: item.sequence_order,
          }));

          await onReorderSuiteTestCases(payload);
        } catch (e) {
          console.error("Persist reorder failed:", e);
          // ✅ Revert to server state on error
          router.refresh();
        }
      }
    },
    [onReorderSuiteTestCases, router],
  );

  // ----- Bulk assign -----
  const bulkAssignSelected = useCallback(async () => {
    if (busy) return;

    const ids = Array.from(selectedAvailableIds);
    if (ids.length === 0) return;

    setBulkAssigning(true);
    try {
      // Keep a stable order: assign in the order items appear in the filtered list
      const byId = new Map(filteredAvailableTestCases.map((t) => [t.id, t]));
      const ordered = visibleAvailableIds.filter((id) =>
        selectedAvailableIds.has(id),
      );

      for (const id of ordered) {
        const tc = byId.get(id);
        if (!tc) continue;
        await onAddTestCase(tc);
      }

      clearSelection();
      setActiveTab("assigned");
    } finally {
      setBulkAssigning(false);
    }
  }, [
    busy,
    clearSelection,
    filteredAvailableTestCases,
    onAddTestCase,
    selectedAvailableIds,
    visibleAvailableIds,
  ]);

  return (
    <div className="h-full flex flex-col">
      {/* ... rest of the component remains the same ... */}
      {/* The render section doesn't need changes */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-base font-semibold truncate">{suite.name}</h2>
            <Badge
              variant={suiteKind === "cross-platform" ? "secondary" : "outline"}
              className="capitalize"
            >
              {suiteKind === "cross-platform" ? (
                <div className="flex items-center gap-1">
                  <Layers className="h-3 w-3" />
                  Cross-Platform
                </div>
              ) : (
                <div className="flex items-center gap-1">
                  <FileCode className="h-3 w-3" />
                  Regular
                </div>
              )}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {suiteKind === "cross-platform"
              ? "Manage cross-platform test cases across Web, Mobile, API, and more."
              : "Edit suite details and manage assigned test cases."}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge variant="secondary">
              {orderedSuiteTestCases.length} assigned
            </Badge>
            {suite.project_id ? (
              <Badge variant="outline">Project linked</Badge>
            ) : (
              <Badge variant="outline">No project</Badge>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {props.showOpenFullPageButton && (
            <Button asChild variant="outline" size="sm" className="gap-2">
              <Link href={`/test-library/${suite.id}`}>
                <ArrowUpRight className="h-4 w-4" />
                Open
              </Link>
            </Button>
          )}

          <Button
            onClick={() => void saveSuite()}
            disabled={busy || savingSuite}
            size="sm"
            className="gap-2"
          >
            {savingSuite ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Save
          </Button>
        </div>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="flex-1 flex flex-col overflow-hidden"
      >
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="details" className="gap-2">
            <Settings className="h-4 w-4" />
            Details
          </TabsTrigger>
          <TabsTrigger value="assigned" className="gap-2">
            <ListChecks className="h-4 w-4" />
            Assigned ({orderedSuiteTestCases.length})
          </TabsTrigger>
          <TabsTrigger value="available" className="gap-2">
            <Plus className="h-4 w-4" />
            Available ({filteredAvailableTestCases.length})
          </TabsTrigger>
        </TabsList>

        {/* DETAILS */}
        <TabsContent value="details" className="flex-1 overflow-auto mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-2">
              <Label>Suite Name *</Label>
              <Input
                value={editForm.name}
                onChange={(e) =>
                  setEditForm((p) => ({ ...p, name: e.target.value }))
                }
                placeholder="e.g., User Authentication Regression"
              />
            </div>

            <div className="space-y-2">
              <Label>Suite Kind</Label>
              <div className="flex items-center h-10 px-3 rounded-md border border-input bg-muted">
                <Badge
                  variant={
                    suiteKind === "cross-platform" ? "secondary" : "outline"
                  }
                  className="capitalize"
                >
                  {suiteKind === "cross-platform" ? (
                    <div className="flex items-center gap-1">
                      <Layers className="h-3 w-3" />
                      Cross-Platform
                    </div>
                  ) : (
                    <div className="flex items-center gap-1">
                      <FileCode className="h-3 w-3" />
                      Regular
                    </div>
                  )}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Suite kind cannot be changed after creation
              </p>
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={editForm.status}
                onValueChange={(v) => setEditForm((p) => ({ ...p, status: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Suite Type</Label>
              <Select
                value={editForm.suite_type}
                onValueChange={(v) =>
                  setEditForm((p) => ({ ...p, suite_type: v }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">Manual</SelectItem>
                  <SelectItem value="regression">Regression</SelectItem>
                  <SelectItem value="smoke">Smoke</SelectItem>
                  <SelectItem value="integration">Integration</SelectItem>
                  <SelectItem value="automated">Automated</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Project (Optional)</Label>
              <Select
                value={editForm.project_id ? editForm.project_id : NONE}
                onValueChange={(value) =>
                  setEditForm((p) => ({
                    ...p,
                    project_id: value === NONE ? "" : value,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a project" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>
                    <span className="text-muted-foreground">No Project</span>
                  </SelectItem>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      <div className="flex items-center gap-2">
                        <FolderOpen
                          className={`h-4 w-4 ${getProjectColor(project.color)}`}
                        />
                        {project.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label>Description</Label>
              <Textarea
                value={editForm.description}
                onChange={(e) =>
                  setEditForm((p) => ({ ...p, description: e.target.value }))
                }
                placeholder="What is this suite intended to validate?"
                rows={4}
              />
            </div>
          </div>
        </TabsContent>

        {/* ASSIGNED (with real reorder) */}
        <TabsContent
          value="assigned"
          className="flex-1 overflow-hidden flex flex-col mt-4"
        >
          <div className="text-sm text-muted-foreground mb-4">
            {suiteKind === "cross-platform"
              ? "Cross-platform test cases currently assigned to this suite."
              : "Test cases currently assigned to this suite."}
          </div>

          <div className="flex-1 overflow-auto">
            {initialLoading ? (
              <div className="text-center py-12">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                <p>Loading assigned tests...</p>
              </div>
            ) : orderedSuiteTestCases.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed border-muted rounded-lg">
                <Plus className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-muted-foreground">
                  No test cases assigned yet
                </p>
                <p className="text-sm text-muted-foreground">
                  Switch to &quot;Available&quot; to add{" "}
                  {suiteKind === "cross-platform" ? "cross-platform " : ""}test
                  cases
                </p>
              </div>
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={orderedSuiteTestCases.map((x) => x.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[70px]">Order</TableHead>
                        <TableHead>Test Case</TableHead>
                        <TableHead className="w-[110px]">
                          {suiteKind === "cross-platform" ? "Platform" : "Type"}
                        </TableHead>
                        <TableHead className="w-[130px]">Priority</TableHead>
                        <TableHead className="w-[140px]">Exec Status</TableHead>
                        <TableHead className="w-[120px]">
                          Est. Duration
                        </TableHead>
                        <TableHead className="w-[90px] text-right">
                          Remove
                        </TableHead>
                      </TableRow>
                    </TableHeader>

                    <TableBody>
                      {orderedSuiteTestCases.map((suiteTestCase) => (
                        <SortableAssignedRow
                          key={suiteTestCase.id}
                          suiteTestCase={suiteTestCase}
                          suiteKind={suiteKind}
                          busy={busy}
                          getStatusIcon={getStatusIcon}
                          getPriorityColor={getPriorityColor}
                          onUpdatePriority={onUpdatePriority}
                          onRemoveTestCase={onRemoveTestCase}
                        />
                      ))}
                    </TableBody>
                  </Table>
                </SortableContext>
              </DndContext>
            )}
          </div>
        </TabsContent>

        {/* AVAILABLE (with bulk toolbar) */}
        <TabsContent
          value="available"
          className="flex-1 overflow-hidden flex flex-col mt-4"
        >
          <div className="space-y-4 mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={`Search available ${suiteKind === "cross-platform" ? "cross-platform " : ""}test cases...`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Bulk actions toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-muted/30 px-3 py-2">
              <div className="flex items-center gap-3">
                <Checkbox
                  checked={
                    allVisibleSelected
                      ? true
                      : someVisibleSelected
                        ? "indeterminate"
                        : false
                  }
                  onCheckedChange={toggleSelectVisibleAll}
                  aria-label="Select all visible"
                />
                <div className="text-sm">
                  <span className="font-medium">
                    {selectedAvailableIds.size}
                  </span>{" "}
                  selected
                  <span className="text-muted-foreground">
                    {" "}
                    · {filteredAvailableTestCases.length} available
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearSelection}
                  disabled={busy || selectedAvailableIds.size === 0}
                >
                  Clear
                </Button>
                <Button
                  size="sm"
                  className="gap-2"
                  onClick={() => void bulkAssignSelected()}
                  disabled={
                    busy || bulkAssigning || selectedAvailableIds.size === 0
                  }
                >
                  {bulkAssigning ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                  Add selected
                </Button>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-auto">
            {filteredAvailableTestCases.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed border-muted rounded-lg">
                <Search className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-muted-foreground">
                  No available{" "}
                  {suiteKind === "cross-platform" ? "cross-platform " : ""}test
                  cases found
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[44px]">
                      <span className="sr-only">Select</span>
                    </TableHead>
                    <TableHead className="w-[360px]">Test Case</TableHead>
                    <TableHead className="w-[110px]">
                      {suiteKind === "cross-platform" ? "Platform" : "Type"}
                    </TableHead>
                    <TableHead className="w-[110px]">Priority</TableHead>
                    <TableHead className="w-[140px]">Exec Status</TableHead>
                    <TableHead className="w-[90px] text-right">Add</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {filteredAvailableTestCases.map((testCase) => {
                    const checked = selectedAvailableIds.has(testCase.id);
                    return (
                      <TableRow key={testCase.id}>
                        <TableCell>
                          <Checkbox
                            checked={checked}
                            onCheckedChange={() => toggleSelectOne(testCase.id)}
                            aria-label={`Select ${testCase.title}`}
                          />
                        </TableCell>

                        <TableCell className="w-[360px] max-w-[360px] font-medium">
                          <div className="min-w-0">
                            <div className="font-medium truncate">
                              {testCase.title}
                            </div>
                            <div className="text-sm text-muted-foreground line-clamp-1">
                              {testCase.description}
                            </div>
                          </div>
                        </TableCell>

                        <TableCell>
                          <Badge variant="outline" className="capitalize">
                            {testCase.platform || testCase.test_type}
                          </Badge>
                        </TableCell>

                        <TableCell>
                          <Badge
                            className={getPriorityColor(testCase.priority)}
                          >
                            {testCase.priority}
                          </Badge>
                        </TableCell>

                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getStatusIcon(testCase.execution_status)}
                            <span className="text-sm capitalize">
                              {(testCase.execution_status ?? "not_run").replace(
                                "_",
                                " ",
                              )}
                            </span>
                          </div>
                        </TableCell>

                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            onClick={() => void onAddTestCase(testCase)}
                            disabled={busy}
                            className="h-8"
                            aria-label="Add to suite"
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
