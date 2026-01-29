// components/test-library/SuiteDetailsTabs.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
} from "lucide-react";
import type { Project, TestSuite } from "@/types/test-cases";
import type { SuiteTestCase, TestCase } from "@/hooks/useSuiteDetails";

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

  showOpenFullPageButton?: boolean;
};

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
    showOpenFullPageButton = false,
  } = props;

  const router = useRouter();
  const NONE = "none";

  const [activeTab, setActiveTab] = useState<string>(defaultTab);
  const [searchTerm, setSearchTerm] = useState("");
  const [savingSuite, setSavingSuite] = useState(false);

  const [editForm, setEditForm] = useState<SuiteEditForm>({
    name: suite.name ?? "",
    description: suite.description ?? "",
    status: suite.status ?? "active",
    suite_type: suite.suite_type ?? "manual",
    project_id: suite.project_id ?? "",
  });

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

  function getStatusIcon(status?: string) {
    // Add ? to make it optional
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

  const assignedTestCaseIds = useMemo(
    () => new Set(suiteTestCases.map((stc) => stc.test_case_id)),
    [suiteTestCases],
  );

  const filteredAvailableTestCases = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return availableTestCases.filter((tc) => {
      if (assignedTestCaseIds.has(tc.id)) return false;
      if (!q) return true;
      return tc.title.toLowerCase().includes(q);
    });
  }, [availableTestCases, assignedTestCaseIds, searchTerm]);

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

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="min-w-0">
          <h2 className="text-base font-semibold truncate">{suite.name}</h2>
          <p className="text-sm text-muted-foreground">
            Edit suite details and manage assigned test cases.
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge variant="secondary">{suiteTestCases.length} assigned</Badge>
            {suite.project_id ? (
              <Badge variant="outline">Project linked</Badge>
            ) : (
              <Badge variant="outline">No project</Badge>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {showOpenFullPageButton && (
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
            Assigned ({suiteTestCases.length})
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

        {/* ASSIGNED */}
        <TabsContent
          value="assigned"
          className="flex-1 overflow-hidden flex flex-col mt-4"
        >
          <div className="text-sm text-muted-foreground mb-4">
            Test cases currently assigned to this suite.
          </div>

          <div className="flex-1 overflow-auto">
            {initialLoading ? (
              <div className="text-center py-12">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                <p>Loading assigned tests...</p>
              </div>
            ) : suiteTestCases.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed border-muted rounded-lg">
                <Plus className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-muted-foreground">
                  No test cases assigned yet
                </p>
                <p className="text-sm text-muted-foreground">
                  Switch to &quot;Available&quot; to add test cases
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[70px]">Order</TableHead>
                    <TableHead>Test Case</TableHead>
                    <TableHead className="w-[110px]">Type</TableHead>
                    <TableHead className="w-[130px]">Priority</TableHead>
                    <TableHead className="w-[140px]">Exec Status</TableHead>
                    <TableHead className="w-[120px]">Est. Duration</TableHead>
                    <TableHead className="w-[90px] text-right">
                      Remove
                    </TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {suiteTestCases.map((suiteTestCase) => (
                    <TableRow key={suiteTestCase.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <GripVertical className="h-4 w-4 text-muted-foreground cursor-move" />
                          <span className="font-mono text-sm">
                            {suiteTestCase.sequence_order}
                          </span>
                        </div>
                      </TableCell>

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
                          <Badge variant="outline">
                            {suiteTestCase.test_cases.test_type}
                          </Badge>
                        )}
                      </TableCell>

                      <TableCell>
                        <Select
                          value={suiteTestCase.priority}
                          onValueChange={(value) =>
                            void onUpdatePriority(suiteTestCase.id, value)
                          }
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
                            {getStatusIcon(
                              suiteTestCase.test_cases.execution_status,
                            )}
                            <span className="text-sm capitalize">
                              {(
                                suiteTestCase.test_cases.execution_status ??
                                "not_run"
                              ).replace("_", " ")}
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
                          onClick={() =>
                            void onRemoveTestCase(suiteTestCase.id)
                          }
                          disabled={busy}
                          aria-label="Remove test case from suite"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </TabsContent>

        {/* AVAILABLE */}
        <TabsContent
          value="available"
          className="flex-1 overflow-hidden flex flex-col mt-4"
        >
          <div className="space-y-4 mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search available test cases..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="flex-1 overflow-auto">
            {filteredAvailableTestCases.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed border-muted rounded-lg">
                <Search className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-muted-foreground">
                  No available test cases found
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[360px]">Test Case</TableHead>
                    <TableHead className="w-[110px]">Type</TableHead>
                    <TableHead className="w-[110px]">Priority</TableHead>
                    <TableHead className="w-[140px]">Exec Status</TableHead>
                    <TableHead className="w-[90px] text-right">Add</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {filteredAvailableTestCases.map((testCase) => (
                    <TableRow key={testCase.id}>
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
                        <Badge variant="outline">{testCase.test_type}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={getPriorityColor(testCase.priority)}>
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
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
