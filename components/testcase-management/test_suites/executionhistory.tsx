"use client";

import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Loader2,
  Image as ImageIcon,
  Eye,
  Download,
  Clock,
  Calendar,
  FileText,
  AlertCircle,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronUp,
  BarChart3,
  AlertTriangle,
  MinusCircle,
  ClipboardCheck,
  ListChecks,
} from "lucide-react";
import { toast } from "sonner";

import { RunReviewDialog } from "./dialogs/run-review-dialog";

type ExecutionStatus =
  | "not_run"
  | "in_progress"
  | "passed"
  | "failed"
  | "skipped"
  | "blocked";
type AllowedStatus = "passed" | "failed" | "skipped" | "blocked";
type StatusFilter = "all" | AllowedStatus;

type RunStatus = "planned" | "in_progress" | "paused" | "completed" | "aborted";

type AttachmentRow = {
  id: string;
  execution_id: string;
  file_path: string;
  file_name: string;
  file_type: string | null;
  file_size: number | null;
  created_at: string;
  step_number: number | null;
  description: string | null;
};

type SupabaseExecutionRow = {
  id: string;
  suite_id: string;
  session_id: string | null;
  test_case_id: string;
  execution_status: ExecutionStatus;
  execution_notes: string | null;
  failure_reason: string | null;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  review_needs_update?: boolean | null;
  review_create_issue?: boolean | null;
  review_note?: string | null;
  reviewed_at?: string | null;
  jira_issue_key: string | null;
  testrail_defect_id: string | null;
  test_suites: { id: string; name: string; project_id: string | null } | null;
  test_cases: { id: string; title: string; description: string | null } | null;
};

export type ExecutionHistoryRow = {
  execution_id: string;
  suite_id: string;
  suite_name: string;
  session_id: string | null;
  test_case_id: string;
  test_title: string;
  test_description: string | null;
  execution_status: AllowedStatus;
  execution_notes: string | null;
  failure_reason: string | null;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  duration_ms: number | null;
  evidence_count: number;

  // review fields (persisted on test_executions)
  review_needs_update: boolean;
  review_create_issue: boolean;
  review_note: string | null;
  reviewed_at: string | null;

  // integration fields
  jira_issue_key: string | null;
  testrail_defect_id: string | null;
};

type RunRow = {
  id: string;
  user_id: string;
  suite_id: string | null;
  suite_name: string;
  name: string;
  description: string | null;
  status: RunStatus;
  planned_start: string | null;
  actual_start: string | null;
  actual_end: string | null;
  environment: string | null;
  test_cases_total: number;
  test_cases_completed: number;
  progress_percentage: number;
  passed_cases: number;
  failed_cases: number;
  skipped_cases: number;
  blocked_cases: number;
  created_at: string;
  updated_at: string;
  paused_at: string | null;
  auto_advance: boolean;
};

type RunWithStats = RunRow & {
  evidence_total: number;
  review_done: boolean;

  /**
   * Runs are aggregates; issues belong to executions.
   * We show a summary count for the run.
   */
  linked_issue_count: number;
};

type IntegrationRow = {
  id: string;
  integration_type: "jira" | "testrail";
  project_id: string | null;
  sync_enabled: boolean;
  config: any; // ideally strongly typed
};

function useDebouncedValue<T>(value: T, delayMs = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(id);
  }, [value, delayMs]);
  return debounced;
}

function formatDuration(ms: number | null) {
  if (!ms) return "-";
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}

function statusBadge(s: AllowedStatus) {
  switch (s) {
    case "passed":
      return (
        <Badge className="bg-green-600 gap-1">
          <CheckCircle2 className="h-3 w-3" />
          Passed
        </Badge>
      );
    case "failed":
      return (
        <Badge variant="destructive" className="gap-1">
          <XCircle className="h-3 w-3" />
          Failed
        </Badge>
      );
    case "blocked":
      return (
        <Badge className="bg-orange-600 gap-1">
          <AlertTriangle className="h-3 w-3" />
          Blocked
        </Badge>
      );
    case "skipped":
      return (
        <Badge className="bg-slate-600 gap-1">
          <MinusCircle className="h-3 w-3" />
          Skipped
        </Badge>
      );
  }
}

function runStatusBadge(s: RunStatus) {
  const base = "gap-1";
  if (s === "completed")
    return <Badge className={`bg-green-600 ${base}`}>Completed</Badge>;
  if (s === "paused")
    return <Badge className={`bg-orange-600 ${base}`}>Paused</Badge>;
  if (s === "in_progress")
    return <Badge className={`bg-blue-600 ${base}`}>In progress</Badge>;
  if (s === "planned")
    return (
      <Badge variant="secondary" className={base}>
        Planned
      </Badge>
    );
  if (s === "aborted")
    return (
      <Badge variant="destructive" className={base}>
        Aborted
      </Badge>
    );
  return (
    <Badge variant="secondary" className={base}>
      {s}
    </Badge>
  );
}

function IssueLink({
  jiraKey,
  testrailId,
  jiraUrl,
  testrailUrl,
}: {
  jiraKey: string | null;
  testrailId: string | null;
  jiraUrl?: string | null;
  testrailUrl?: string | null;
}) {
  if (jiraKey) {
    const href = jiraUrl ?? null;

    return (
      <a
        href={href || "#"}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
        onClick={(e) => {
          if (!href) {
            e.preventDefault();
            toast.error("Jira URL not configured");
          }
        }}
      >
        <svg className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor">
          <path d="M11.53 2c0 2.4 1.97 4.35 4.35 4.35h1.78v1.7c0 2.4 1.94 4.34 4.34 4.34V2.84a.84.84 0 0 0-.84-.84h-9.63zm-.84 7.32c0 2.4 1.97 4.35 4.35 4.35h1.78v1.7c0 2.4 1.94 4.34 4.34 4.34V10.16a.84.84 0 0 0-.84-.84h-9.63zm-9.63 7.32c0 2.4 1.97 4.35 4.35 4.35h1.78v1.7c0 2.4 1.94 4.34 4.34 4.34V17.48a.84.84 0 0 0-.84-.84H1.06z" />
        </svg>
        {jiraKey}
      </a>
    );
  }

  if (testrailId) {
    const href = testrailUrl ?? null;

    return (
      <a
        href={href || "#"}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 text-xs text-emerald-700 hover:underline"
        onClick={(e) => {
          if (!href) {
            e.preventDefault();
            toast.error("TestRail URL not configured");
          }
        }}
      >
        <FileText className="h-3 w-3" />
        {testrailId}
      </a>
    );
  }

  return <span className="text-xs text-muted-foreground">—</span>;
}

export function ExecutionHistory() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();

  // shared filters
  const [availableSuites, setAvailableSuites] = useState<
    Array<{ id: string; name: string }>
  >([]);
  const [suiteId, setSuiteId] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("all"); // all, today, week, month, year

  // runs tab
  const [runs, setRuns] = useState<RunWithStats[]>([]);
  const [runsLoading, setRunsLoading] = useState(true);
  const [runsSearch, setRunsSearch] = useState("");
  const debouncedRunsSearch = useDebouncedValue(runsSearch, 300);

  // executions tab
  const [rows, setRows] = useState<ExecutionHistoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [status, setStatus] = useState<StatusFilter>("all");
  const [hasEvidence, setHasEvidence] = useState(false);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);

  // pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(20);
  const [totalCount, setTotalCount] = useState(0);

  // evidence dialog
  const [openView, setOpenView] = useState(false);
  const [activeExecution, setActiveExecution] =
    useState<ExecutionHistoryRow | null>(null);
  const [evidenceLoading, setEvidenceLoading] = useState(false);
  const [evidence, setEvidence] = useState<AttachmentRow[]>([]);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // run review dialog
  const [isRunReviewOpen, setIsRunReviewOpen] = useState(false);
  const [activeRun, setActiveRun] = useState<RunWithStats | null>(null);
  const [runRows, setRunRows] = useState<ExecutionHistoryRow[]>([]);
  const [runRowsLoading, setRunRowsLoading] = useState(false);
  const [runSaveBusy, setRunSaveBusy] = useState(false);
  const [showAborted, setShowAborted] = useState(false);

  const [integrations, setIntegrations] = useState<IntegrationRow[]>([]);
  const [integrationLoading, setIntegrationLoading] = useState(false);
  const [selectedIntegrationId, setSelectedIntegrationId] = useState("none");
  const [creatingIssues, setCreatingIssues] = useState(false);

  //jira

  const [jiraBaseUrl, setJiraBaseUrl] = useState<string | null>(null);
  const onSelectedIntegrationIdChange = (id: string) => {
    setSelectedIntegrationId(id);
  };

  const INCLUDED_STATUSES: AllowedStatus[] = [
    "passed",
    "failed",
    "blocked",
    "skipped",
  ];

  useEffect(() => {
    void fetchSuites();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    void fetchRuns();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [suiteId, dateFilter, debouncedRunsSearch, showAborted]);

  useEffect(() => {
    void fetchHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    status,
    hasEvidence,
    debouncedSearch,
    suiteId,
    dateFilter,
    currentPage,
    pageSize,
  ]);

  useEffect(() => {
    setCurrentPage(1);
  }, [status, hasEvidence, debouncedSearch, suiteId, dateFilter, pageSize]);

  async function fetchSuites() {
    try {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return;

      const { data, error } = await supabase
        .from("suites")
        .select("id, name")
        .eq("user_id", auth.user.id)
        .order("name");

      if (error) throw error;
      setAvailableSuites(data ?? []);
    } catch (err) {
      console.error(err);
      setAvailableSuites([]);
    }
  }

  function computeStartDate(dateFilterValue: string) {
    let startDate: string | null = null;
    const now = new Date();

    if (dateFilterValue === "today") {
      startDate = new Date(now.setHours(0, 0, 0, 0)).toISOString();
    } else if (dateFilterValue === "week") {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      startDate = weekAgo.toISOString();
    } else if (dateFilterValue === "month") {
      const monthAgo = new Date();
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      startDate = monthAgo.toISOString();
    } else if (dateFilterValue === "year") {
      const yearAgo = new Date();
      yearAgo.setFullYear(yearAgo.getFullYear() - 1);
      startDate = yearAgo.toISOString();
    }

    return startDate;
  }

  async function createIssuesFromReview() {
    if (!activeRun) {
      toast.error("No active run");
      return;
    }
    if (selectedIntegrationId === "none") {
      toast.error("Select an integration first");
      return;
    }

    // only rows checked for "Create issue" and not already linked
    const targets = runRows.filter(
      (r) =>
        r.review_create_issue && !r.jira_issue_key && !r.testrail_defect_id,
    );

    if (targets.length === 0) {
      toast.info("No rows selected (or already linked).");
      return;
    }

    setCreatingIssues(true);
    try {
      const res = await fetch("/api/integrations/create-issues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          integration_id: selectedIntegrationId,
          executions: targets.map((r) => ({
            execution_id: r.execution_id,
            test_case_id: r.test_case_id,
            test_title: r.test_title,
            suite_name: r.suite_name,
            failure_reason: r.failure_reason,
          })),
        }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error ?? "Failed to create issues");

      // Patch local rows so the dialog updates immediately
      const results = (json.results ?? []) as Array<{
        success: boolean;
        execution_id: string;
        issue_key?: string; // Jira
        run_id?: number; // TestRail
        error?: string;
      }>;

      setRunRows((prev) =>
        prev.map((r) => {
          const match = results.find(
            (x) => x.execution_id === r.execution_id && x.success,
          );
          if (!match) return r;

          // Jira returns issue_key
          if (match.issue_key) {
            return { ...r, jira_issue_key: match.issue_key };
          }

          // TestRail returns run_id, store a friendly "R123" (or whatever you prefer)
          if (match.run_id != null) {
            return { ...r, testrail_defect_id: `R${match.run_id}` };
          }

          return r;
        }),
      );

      toast.success(
        `Created ${json.created ?? 0} of ${json.total ?? targets.length} issues`,
      );
      void fetchHistory();
      void fetchRuns();
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : "Failed to create issues");
    } finally {
      setCreatingIssues(false);
    }
  }

  async function fetchRuns() {
    setRunsLoading(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) {
        setRuns([]);
        return;
      }

      const startDate = computeStartDate(dateFilter);

      let q = supabase
        .from("test_run_sessions")
        .select(
          `
        id,
        user_id,
        suite_id,
        name,
        description,
        status,
        planned_start,
        actual_start,
        actual_end,
        environment,
        test_cases_total,
        test_cases_completed,
        progress_percentage,
        passed_cases,
        failed_cases,
        skipped_cases,
        blocked_cases,
        created_at,
        updated_at,
        paused_at,
        auto_advance
      `,
        )
        .eq("user_id", auth.user.id)
        .order("created_at", { ascending: false })
        .limit(200);

      if (showAborted) q = q.in("status", ["completed", "aborted"]);
      else q = q.eq("status", "completed");

      if (suiteId !== "all") q = q.eq("suite_id", suiteId);
      if (startDate) q = q.gte("created_at", startDate);

      const { data: sessionsRaw, error } = await q;
      if (error) throw error;

      const sessions = (sessionsRaw ?? []) as Array<any>;

      const suiteIds = [
        ...new Set(sessions.map((s) => s.suite_id).filter(Boolean)),
      ];
      const suiteMap = new Map<
        string,
        { id: string; name: string; project_id: string | null }
      >();
      if (suiteIds.length > 0) {
        const { data: suites } = await supabase
          .from("suites")
          .select("id, name, project_id")
          .in("id", suiteIds);
        (suites ?? []).forEach((s: any) => suiteMap.set(s.id, s));
      }

      // Client-side search
      const s = debouncedRunsSearch.trim().toLowerCase();
      const filtered = s
        ? sessions.filter((r) => {
            const suiteName = String(
              suiteMap.get(r.suite_id)?.name ?? "",
            ).toLowerCase();
            const runName = String(r?.name ?? "").toLowerCase();
            const desc = String(r?.description ?? "").toLowerCase();
            const env = String(r?.environment ?? "").toLowerCase();
            return (
              suiteName.includes(s) ||
              runName.includes(s) ||
              desc.includes(s) ||
              env.includes(s) ||
              String(r.id).includes(s)
            );
          })
        : sessions;

      const sessionIds = filtered.map((x) => x.id);

      if (sessionIds.length === 0) {
        setRuns([]);
        return;
      }

      // Pull executions to compute review_done, evidence_total, and issue summary
      const { data: execRaw, error: execErr } = await supabase
        .from("test_executions")
        .select(
          "id, session_id, reviewed_at, jira_issue_key, testrail_defect_id",
        )
        .in("session_id", sessionIds);

      if (execErr) throw execErr;

      const execs = (execRaw ?? []) as Array<{
        id: string;
        session_id: string | null;
        reviewed_at: string | null;
        jira_issue_key: string | null;
        testrail_defect_id: string | null;
      }>;

      const execIds = execs.map((e) => e.id);
      const evidenceCountByExecution = new Map<string, number>();

      if (execIds.length > 0) {
        const { data: attsRaw, error: attErr } = await supabase
          .from("test_attachments")
          .select("execution_id")
          .in("execution_id", execIds);

        if (attErr) throw attErr;

        for (const a of (attsRaw ?? []) as Array<{ execution_id: string }>) {
          evidenceCountByExecution.set(
            a.execution_id,
            (evidenceCountByExecution.get(a.execution_id) ?? 0) + 1,
          );
        }
      }

      const evidenceBySession = new Map<string, number>();
      const reviewedBySession = new Map<string, boolean>();
      const issuesBySession = new Map<string, number>();

      for (const e of execs) {
        if (!e.session_id) continue;

        if (e.reviewed_at) reviewedBySession.set(e.session_id, true);

        const ev = evidenceCountByExecution.get(e.id) ?? 0;
        evidenceBySession.set(
          e.session_id,
          (evidenceBySession.get(e.session_id) ?? 0) + ev,
        );

        const hasIssue = Boolean(e.jira_issue_key || e.testrail_defect_id);
        if (hasIssue) {
          issuesBySession.set(
            e.session_id,
            (issuesBySession.get(e.session_id) ?? 0) + 1,
          );
        }
      }

      const mapped: RunWithStats[] = filtered.map((r) => {
        const suite = suiteMap.get(r.suite_id);
        return {
          id: r.id,
          user_id: r.user_id,
          suite_id: r.suite_id ?? null,
          suite_name: suite?.name ?? "Unknown Suite",

          name: r.name,
          description: r.description ?? null,
          status: (r.status ?? "planned") as RunStatus,

          planned_start: r.planned_start ?? null,
          actual_start: r.actual_start ?? null,
          actual_end: r.actual_end ?? null,

          environment: r.environment ?? null,

          test_cases_total: Number(r.test_cases_total ?? 0),
          test_cases_completed: Number(r.test_cases_completed ?? 0),
          progress_percentage: Number(r.progress_percentage ?? 0),

          passed_cases: Number(r.passed_cases ?? 0),
          failed_cases: Number(r.failed_cases ?? 0),
          skipped_cases: Number(r.skipped_cases ?? 0),
          blocked_cases: Number(r.blocked_cases ?? 0),

          created_at: r.created_at,
          updated_at: r.updated_at,
          paused_at: r.paused_at ?? null,
          auto_advance: Boolean(r.auto_advance ?? true),

          evidence_total: evidenceBySession.get(r.id) ?? 0,
          review_done: Boolean(reviewedBySession.get(r.id) ?? false),
          linked_issue_count: issuesBySession.get(r.id) ?? 0,
        };
      });

      setRuns(mapped);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load run history");
      setRuns([]);
    } finally {
      setRunsLoading(false);
    }
  }

  async function fetchHistory() {
    setLoading(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) {
        setRows([]);
        return;
      }

      const startDate = computeStartDate(dateFilter);

      let countQuery = supabase
        .from("test_executions")
        .select("id", { count: "exact", head: true })
        .eq("executed_by", auth.user.id)
        .in("execution_status", INCLUDED_STATUSES);

      let dataQuery = supabase
        .from("test_executions")
        .select(
          `
        id,
        suite_id,
        session_id,
        test_case_id,
        platform_test_case_id,
        execution_status,
        execution_notes,
        failure_reason,
        created_at,
        started_at,
        completed_at,
        review_needs_update,
        review_create_issue,
        review_note,
        reviewed_at,
        jira_issue_key,
        testrail_defect_id
      `,
        )
        .eq("executed_by", auth.user.id)
        .in("execution_status", INCLUDED_STATUSES)
        .order("created_at", { ascending: false });

      if (suiteId !== "all") {
        countQuery = countQuery.eq("suite_id", suiteId);
        dataQuery = dataQuery.eq("suite_id", suiteId);
      }
      if (status !== "all") {
        countQuery = countQuery.eq("execution_status", status);
        dataQuery = dataQuery.eq("execution_status", status);
      }
      if (startDate) {
        countQuery = countQuery.gte("created_at", startDate);
        dataQuery = dataQuery.gte("created_at", startDate);
      }

      const { count, error: countError } = await countQuery;
      if (countError) throw countError;
      setTotalCount(count ?? 0);

      const from = (currentPage - 1) * pageSize;
      const to = from + pageSize - 1;
      dataQuery = dataQuery.range(from, to);

      const { data: execsRaw, error } = await dataQuery;
      if (error) throw error;

      const execs = (execsRaw ?? []) as any[];

      const suiteIds = [
        ...new Set(execs.map((e) => e.suite_id).filter(Boolean)),
      ];
      const suiteMap = new Map<
        string,
        { id: string; name: string; project_id: string | null }
      >();
      if (suiteIds.length > 0) {
        const { data: suites } = await supabase
          .from("suites")
          .select("id, name, project_id")
          .in("id", suiteIds);
        (suites ?? []).forEach((s: any) => suiteMap.set(s.id, s));
      }

      const regularIds = [
        ...new Set(execs.map((e) => e.test_case_id).filter(Boolean)),
      ];
      const regularMap = new Map<
        string,
        { id: string; title: string; description: string | null }
      >();
      if (regularIds.length > 0) {
        const { data: cases } = await supabase
          .from("test_cases")
          .select("id, title, description")
          .in("id", regularIds);
        (cases ?? []).forEach((c: any) => regularMap.set(c.id, c));
      }

      const platformIds = [
        ...new Set(execs.map((e) => e.platform_test_case_id).filter(Boolean)),
      ];
      const platformMap = new Map<
        string,
        { id: string; title: string; description: string | null }
      >();
      if (platformIds.length > 0) {
        const { data: cases } = await supabase
          .from("platform_test_cases")
          .select("id, title, description")
          .in("id", platformIds);
        (cases ?? []).forEach((c: any) => platformMap.set(c.id, c));
      }

      const projectId = suiteMap.values().next().value?.project_id ?? null;
      await loadIntegrationsForProject(projectId);

      const base: ExecutionHistoryRow[] = execs.map((e) => {
        const suite = suiteMap.get(e.suite_id);
        const testCase = e.test_case_id
          ? regularMap.get(e.test_case_id)
          : platformMap.get(e.platform_test_case_id);

        let duration: number | null = null;
        if (e.started_at && e.completed_at) {
          duration =
            new Date(e.completed_at).getTime() -
            new Date(e.started_at).getTime();
        }

        return {
          execution_id: e.id,
          suite_id: e.suite_id,
          suite_name: suite?.name ?? "Unknown Suite",
          session_id: e.session_id ?? null,
          test_case_id: e.test_case_id || e.platform_test_case_id,
          test_title: testCase?.title ?? "Unknown Test",
          test_description: testCase?.description ?? null,
          execution_status: (e.execution_status as AllowedStatus) ?? "passed",
          execution_notes: e.execution_notes ?? null,
          failure_reason: e.failure_reason ?? null,
          created_at: e.created_at,
          started_at: e.started_at ?? null,
          completed_at: e.completed_at ?? null,
          duration_ms: duration,
          evidence_count: 0,
          review_needs_update: Boolean(e.review_needs_update ?? false),
          review_create_issue: Boolean(e.review_create_issue ?? false),
          review_note: (e.review_note ?? null) as string | null,
          reviewed_at: (e.reviewed_at ?? null) as string | null,
          jira_issue_key: e.jira_issue_key ?? null,
          testrail_defect_id: e.testrail_defect_id ?? null,
        };
      });

      const s = debouncedSearch.trim().toLowerCase();
      const searched = s
        ? base.filter((r) => {
            return (
              r.test_title.toLowerCase().includes(s) ||
              r.suite_name.toLowerCase().includes(s) ||
              (r.failure_reason ?? "").toLowerCase().includes(s) ||
              (r.test_description ?? "").toLowerCase().includes(s)
            );
          })
        : base;

      const execIds = searched.map((r) => r.execution_id);
      if (execIds.length === 0) {
        setRows([]);
        return;
      }

      const { data: attsRaw, error: attErr } = await supabase
        .from("test_attachments")
        .select("execution_id")
        .in("execution_id", execIds);

      if (attErr) throw attErr;

      const counts = new Map<string, number>();
      for (const a of (attsRaw ?? []) as Array<{ execution_id: string }>) {
        counts.set(a.execution_id, (counts.get(a.execution_id) ?? 0) + 1);
      }

      const withCounts = searched.map((r) => ({
        ...r,
        evidence_count: counts.get(r.execution_id) ?? 0,
      }));

      setRows(
        hasEvidence
          ? withCounts.filter((r) => r.evidence_count > 0)
          : withCounts,
      );
    } catch (err) {
      console.error(err);
      toast.error("Failed to load execution history");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  function toggleRowExpansion(executionId: string) {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(executionId)) next.delete(executionId);
      else next.add(executionId);
      return next;
    });
  }

  async function loadIntegrationsForProject(projectId: string | null) {
    setIntegrationLoading(true);
    try {
      const qs = projectId
        ? `?project_id=${encodeURIComponent(projectId)}`
        : "";
      const res = await fetch(`/api/integrations${qs}`);
      const json = await res.json();
      if (!res.ok)
        throw new Error(json?.error ?? "Failed to load integrations");

      const list = (json.integrations ?? []).filter(
        (i: any) => i.integration_type === "jira",
      );
      setIntegrations(list);

      const firstEnabled = list.find((i: any) => i.sync_enabled) ?? list[0];
      setSelectedIntegrationId(firstEnabled?.id ?? "none");

      if (firstEnabled?.config?.url) {
        setJiraBaseUrl(firstEnabled.config.url);
      } else {
        setJiraBaseUrl(null);
      }
    } finally {
      setIntegrationLoading(false);
    }
  }

  async function createSignedUrl(
    filePath: string,
    expiresInSeconds: number,
  ): Promise<string> {
    try {
      const { data, error } = await supabase.storage
        .from("test-attachments")
        .createSignedUrl(filePath, expiresInSeconds);

      if (error) throw error;
      return data.signedUrl;
    } catch (err) {
      console.error("Error creating signed URL:", err);
      return "";
    }
  }

  async function openExecution(execution: ExecutionHistoryRow) {
    setActiveExecution(execution);
    setOpenView(true);
    setEvidence([]);
    setEvidenceLoading(true);

    try {
      const { data, error } = await supabase
        .from("test_attachments")
        .select(
          "id, execution_id, file_name, file_path, file_type, file_size, created_at, step_number, description",
        )
        .eq("execution_id", execution.execution_id)
        .order("step_number", { ascending: true, nullsFirst: false })
        .order("created_at", { ascending: true });

      if (error) throw error;
      setEvidence((data ?? []) as AttachmentRow[]);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load evidence");
      setEvidence([]);
    } finally {
      setEvidenceLoading(false);
    }
  }

  async function downloadEvidence() {
    if (evidence.length === 0) return;

    toast.info("Downloading evidence files...");
    for (const att of evidence) {
      try {
        const url = await createSignedUrl(att.file_path, 60 * 60);
        if (!url) continue;
        const a = document.createElement("a");
        a.href = url;
        a.download = att.file_name;
        a.click();
      } catch (err) {
        console.error("Download error:", err);
      }
    }
  }

  function exportToCSV() {
    if (rows.length === 0) {
      toast.error("No data to export");
      return;
    }

    const headers = [
      "Date",
      "Time",
      "Suite",
      "Test Case",
      "Description",
      "Status",
      "Duration (seconds)",
      "Evidence Count",
      "Failure Reason",
      "Execution Notes",
      "Needs Update",
      "Create Issue",
      "Review Note",
      "Reviewed At",
      "Jira Issue Key",
      "TestRail Defect ID",
    ];

    const csvRows = rows.map((r) => {
      const date = new Date(r.created_at);
      const durationSeconds = r.duration_ms
        ? Math.floor(r.duration_ms / 1000)
        : 0;

      return [
        date.toLocaleDateString(),
        date.toLocaleTimeString(),
        r.suite_name,
        r.test_title,
        r.test_description || "",
        r.execution_status,
        durationSeconds,
        r.evidence_count,
        r.failure_reason || "",
        r.execution_notes || "",
        r.review_needs_update ? "yes" : "no",
        r.review_create_issue ? "yes" : "no",
        r.review_note || "",
        r.reviewed_at ? new Date(r.reviewed_at).toLocaleString() : "",
        r.jira_issue_key ?? "",
        r.testrail_defect_id ?? "",
      ];
    });

    const escapeCsvField = (field: string | number) => {
      const str = String(field);
      if (str.includes(",") || str.includes('"') || str.includes("\n")) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const csv = [
      headers.join(","),
      ...csvRows.map((row) => row.map(escapeCsvField).join(",")),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const filename = `executionhistory-${dateFilter}-${
      new Date().toISOString().split("T")[0]
    }.csv`;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success(`Exported ${rows.length} executions to CSV`);
  }

  function exportTrendReport() {
    if (rows.length === 0) {
      toast.error("No data to export");
      return;
    }

    const byDate = new Map<
      string,
      {
        passed: number;
        failed: number;
        blocked: number;
        skipped: number;
        total: number;
      }
    >();
    rows.forEach((r) => {
      const date = new Date(r.created_at).toLocaleDateString();
      const existing = byDate.get(date) || {
        passed: 0,
        failed: 0,
        blocked: 0,
        skipped: 0,
        total: 0,
      };
      existing.total++;
      if (r.execution_status === "passed") existing.passed++;
      if (r.execution_status === "failed") existing.failed++;
      if (r.execution_status === "blocked") existing.blocked++;
      if (r.execution_status === "skipped") existing.skipped++;
      byDate.set(date, existing);
    });

    const headers = ["Date", "Total Tests", "Passed", "Failed", "Pass Rate %"];
    const trendRows = Array.from(byDate.entries())
      .sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime())
      .map(([date, stats]) => {
        const passRate = stats.total
          ? Math.round((stats.passed / stats.total) * 100)
          : 0;
        return [date, stats.total, stats.passed, stats.failed, passRate];
      });

    const csv = [
      headers.join(","),
      ...trendRows.map((row) => row.join(",")),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `test-trends-${dateFilter}-${
      new Date().toISOString().split("T")[0]
    }.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success("Exported trend report");
  }

  // ========= Post-run review =========

  async function openRunReview(run: RunWithStats) {
    setActiveRun(run);
    setIsRunReviewOpen(true);
    setRunRows([]);
    setRunRowsLoading(true);

    try {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) {
        toast.error("You must be signed in");
        return;
      }

      const { data: execsRaw, error } = await supabase
        .from("test_executions")
        .select(
          `
    id,
    suite_id,
    session_id,
    test_case_id,
    platform_test_case_id,
    execution_status,
    execution_notes,
    failure_reason,
    created_at,
    started_at,
    completed_at,
    review_needs_update,
    review_create_issue,
    review_note,
    reviewed_at,
    jira_issue_key,
    testrail_defect_id
  `,
        )
        .eq("executed_by", auth.user.id)
        .eq("session_id", run.id)
        .in("execution_status", INCLUDED_STATUSES)
        .order("created_at", { ascending: true });

      if (error) throw error;

      const execs = (execsRaw ?? []) as any[];

      const suiteIds = [
        ...new Set(execs.map((e) => e.suite_id).filter(Boolean)),
      ];
      const suiteMap = new Map<
        string,
        { id: string; name: string; project_id: string | null }
      >();
      if (suiteIds.length > 0) {
        const { data: suites } = await supabase
          .from("suites")
          .select("id, name, project_id")
          .in("id", suiteIds);
        (suites ?? []).forEach((s: any) => suiteMap.set(s.id, s));
      }

      const regularIds = [
        ...new Set(execs.map((e) => e.test_case_id).filter(Boolean)),
      ];
      const regularMap = new Map<
        string,
        { id: string; title: string; description: string | null }
      >();
      if (regularIds.length > 0) {
        const { data: cases } = await supabase
          .from("test_cases")
          .select("id, title, description")
          .in("id", regularIds);
        (cases ?? []).forEach((c: any) => regularMap.set(c.id, c));
      }

      const platformIds = [
        ...new Set(execs.map((e) => e.platform_test_case_id).filter(Boolean)),
      ];
      const platformMap = new Map<
        string,
        { id: string; title: string; description: string | null }
      >();
      if (platformIds.length > 0) {
        const { data: cases } = await supabase
          .from("platform_test_cases")
          .select("id, title, description")
          .in("id", platformIds);
        (cases ?? []).forEach((c: any) => platformMap.set(c.id, c));
      }

      const projectId = suiteMap.values().next().value?.project_id ?? null;
      if (projectId) {
        await loadIntegrationsForProject(projectId);
      }

      // Evidence counts
      const execIds = execs.map((e) => e.id);
      const counts = new Map<string, number>();
      if (execIds.length) {
        const { data: attsRaw, error: attErr } = await supabase
          .from("test_attachments")
          .select("execution_id")
          .in("execution_id", execIds);
        if (attErr) throw attErr;
        for (const a of (attsRaw ?? []) as Array<{ execution_id: string }>) {
          counts.set(a.execution_id, (counts.get(a.execution_id) ?? 0) + 1);
        }
      }

      const mapped: ExecutionHistoryRow[] = execs.map((e) => {
        const suite = suiteMap.get(e.suite_id);
        const testCase = e.test_case_id
          ? regularMap.get(e.test_case_id)
          : platformMap.get(e.platform_test_case_id);

        let duration: number | null = null;
        if (e.started_at && e.completed_at) {
          duration =
            new Date(e.completed_at).getTime() -
            new Date(e.started_at).getTime();
        }

        return {
          execution_id: e.id,
          suite_id: e.suite_id,
          suite_name: suite?.name ?? "Unknown Suite",
          session_id: e.session_id ?? null,
          test_case_id: e.test_case_id || e.platform_test_case_id,
          test_title: testCase?.title ?? "Unknown Test",
          test_description: testCase?.description ?? null,
          execution_status: (e.execution_status as AllowedStatus) ?? "passed",
          execution_notes: e.execution_notes ?? null,
          failure_reason: e.failure_reason ?? null,
          created_at: e.created_at,
          started_at: e.started_at ?? null,
          completed_at: e.completed_at ?? null,
          duration_ms: duration,
          evidence_count: counts.get(e.id) ?? 0,
          review_needs_update: Boolean(e.review_needs_update ?? false),
          review_create_issue: Boolean(e.review_create_issue ?? false),
          review_note: (e.review_note ?? null) as string | null,
          reviewed_at: (e.reviewed_at ?? null) as string | null,
          jira_issue_key: e.jira_issue_key ?? null,
          testrail_defect_id: e.testrail_defect_id ?? null,
        };
      });

      setRunRows(mapped);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load run details");
      setRunRows([]);
    } finally {
      setRunRowsLoading(false);
    }
  }

  function patchRunRow(
    executionId: string,
    patch: Partial<ExecutionHistoryRow>,
  ) {
    setRunRows((prev) =>
      prev.map((r) =>
        r.execution_id === executionId ? { ...r, ...patch } : r,
      ),
    );
  }

  function bulkMarkFailuresNeedsUpdate(value: boolean) {
    setRunRows((prev) =>
      prev.map((r) =>
        r.execution_status === "failed"
          ? { ...r, review_needs_update: value }
          : r,
      ),
    );
  }

  function bulkMarkAllCreateIssue(value: boolean) {
    setRunRows((prev) =>
      prev.map((r) => ({ ...r, review_create_issue: value })),
    );
  }

  const handleIntegrationChange = (id: string) => {
    setSelectedIntegrationId(id);

    const selected = integrations.find((i) => i.id === id);
    if (selected?.config?.url) {
      setJiraBaseUrl(selected.config.url);
    } else {
      setJiraBaseUrl(null);
    }
  };

  async function saveRunReview() {
    if (!activeRun) return;
    if (runRows.length === 0) {
      toast.error("Nothing to save");
      return;
    }

    setRunSaveBusy(true);
    try {
      const batchSize = 50;
      for (let i = 0; i < runRows.length; i += batchSize) {
        const slice = runRows.slice(i, i + batchSize);

        for (const r of slice) {
          const { error } = await supabase
            .from("test_executions")
            .update({
              review_needs_update: r.review_needs_update,
              review_create_issue: r.review_create_issue,
              review_note: r.review_note?.trim() ? r.review_note.trim() : null,
              reviewed_at: new Date().toISOString(),
            })
            .eq("id", r.execution_id);

          if (error) throw error;
        }
      }

      toast.success("Run review saved");
      void fetchRuns();
      void fetchHistory();
      setIsRunReviewOpen(false);
    } catch (err) {
      console.error(err);
      toast.error("Failed to save review");
    } finally {
      setRunSaveBusy(false);
    }
  }

  const execStats = useMemo(() => {
    const total = rows.length;
    const passed = rows.filter((r) => r.execution_status === "passed").length;
    const failed = rows.filter((r) => r.execution_status === "failed").length;
    const withEvidence = rows.filter((r) => r.evidence_count > 0).length;
    return { total, passed, failed, withEvidence };
  }, [rows]);

  const runSummaryStats = useMemo(() => {
    const totalRuns = runs.length;
    const completed = runs.filter((r) => r.status === "completed").length;
    const withFailures = runs.filter((r) => r.failed_cases > 0).length;
    const reviewed = runs.filter((r) => r.review_done).length;
    return { totalRuns, completed, withFailures, reviewed };
  }, [runs]);

  return (
    <div className="space-y-4 text-sm">
      <Tabs defaultValue="runs" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger
            value="runs"
            className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            <ClipboardCheck className="h-4 w-4" />
            Runs (Post-run review)
          </TabsTrigger>
          <TabsTrigger
            value="executions"
            className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            <ListChecks className="h-4 w-4" />
            Executions
          </TabsTrigger>
        </TabsList>

        {/* ================== RUNS TAB ================== */}
        <TabsContent value="runs" className="space-y-4 mt-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-4 rounded-lg border shadow-sm">
              <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {runSummaryStats.totalRuns}
              </div>
              <div className="text-sm text-slate-600 dark:text-slate-400">
                Runs
              </div>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 p-4 rounded-lg border border-green-200 dark:border-green-800 shadow-sm">
              <div className="text-2xl font-bold text-green-700 dark:text-green-400">
                {runSummaryStats.completed}
              </div>
              <div className="text-sm text-green-600 dark:text-green-500">
                Completed
              </div>
            </div>
            <div className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 p-4 rounded-lg border border-red-200 dark:border-red-800 shadow-sm">
              <div className="text-2xl font-bold text-red-700 dark:text-red-400">
                {runSummaryStats.withFailures}
              </div>
              <div className="text-sm text-red-600 dark:text-red-500">
                Runs with failures
              </div>
            </div>
            <div className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 p-4 rounded-lg border border-orange-200 dark:border-orange-800 shadow-sm">
              <div className="text-2xl font-bold text-orange-700 dark:text-orange-400">
                {runSummaryStats.reviewed}
              </div>
              <div className="text-sm text-orange-600 dark:text-orange-500">
                Reviewed
              </div>
            </div>
          </div>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-3 py-4">
              <div className="flex flex-wrap items-center gap-3">
                <Input
                  value={runsSearch}
                  onChange={(e) => setRunsSearch(e.target.value)}
                  placeholder="Search run name, suite…"
                  className="w-[280px]"
                />

                <Select value={dateFilter} onValueChange={setDateFilter}>
                  <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder="Date range" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All time</SelectItem>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="week">Last 7 days</SelectItem>
                    <SelectItem value="month">Last 30 days</SelectItem>
                    <SelectItem value="year">Last year</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={suiteId} onValueChange={setSuiteId}>
                  <SelectTrigger className="w-[220px]">
                    <SelectValue placeholder="All suites" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All suites</SelectItem>
                    {availableSuites.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={showAborted}
                    onCheckedChange={(v) => setShowAborted(Boolean(v))}
                  />
                  <span className="text-sm text-muted-foreground">
                    Show incomplete runs
                  </span>
                </div>
              </div>
            </CardHeader>

            <CardContent className="pt-0">
              {runsLoading ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="h-6 w-6 animate-spin" />
                  <span className="ml-3 text-muted-foreground">
                    Loading runs…
                  </span>
                </div>
              ) : runs.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground">
                  No runs match your filters.
                </div>
              ) : (
                <div className="space-y-3">
                  {runs.map((r) => {
                    const created = new Date(r.created_at);
                    const passRate = r.test_cases_total
                      ? Math.round((r.passed_cases / r.test_cases_total) * 100)
                      : 0;

                    return (
                      <Card
                        key={r.id}
                        className="hover:bg-muted/50 transition-colors"
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-4">
                            {/* Left: Date */}
                            <div className="flex items-center gap-3 min-w-[140px]">
                              <Calendar className="h-5 w-5 text-muted-foreground" />
                              <div>
                                <div className="font-medium text-sm">
                                  {created.toLocaleDateString()}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {created.toLocaleTimeString()}
                                </div>
                              </div>
                            </div>

                            {/* Middle: Run Info */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-sm font-medium text-muted-foreground">
                                  {r.suite_name}
                                </span>
                                {runStatusBadge(r.status)}
                              </div>
                              <div className="font-semibold mb-2">
                                {r.name || `Run ${r.id.slice(0, 8)}…`}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {r.test_cases_completed ?? 0}/
                                {r.test_cases_total ?? 0} complete •{" "}
                                {r.progress_percentage ?? passRate}%
                              </div>
                            </div>

                            {/* Right: Stats */}
                            <div className="flex items-center gap-6">
                              {/* Test Results */}
                              <div className="space-y-1.5">
                                <div className="text-xs font-medium text-muted-foreground mb-2">
                                  Results
                                </div>
                                <div className="flex flex-wrap gap-2">
                                  <Badge
                                    variant="secondary"
                                    className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-100"
                                  >
                                    <CheckCircle2 className="h-3 w-3 mr-1" />
                                    {r.passed_cases}
                                  </Badge>
                                  <Badge
                                    variant="secondary"
                                    className="bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-100"
                                  >
                                    <XCircle className="h-3 w-3 mr-1" />
                                    {r.failed_cases}
                                  </Badge>
                                  <Badge
                                    variant="secondary"
                                    className="bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-100"
                                  >
                                    <AlertTriangle className="h-3 w-3 mr-1" />
                                    {r.blocked_cases}
                                  </Badge>
                                  <Badge
                                    variant="secondary"
                                    className="bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-100"
                                  >
                                    <MinusCircle className="h-3 w-3 mr-1" />
                                    {r.skipped_cases}
                                  </Badge>
                                </div>
                                <div className="text-xs text-muted-foreground mt-2">
                                  Pass rate: {passRate}%
                                </div>
                              </div>

                              {/* Evidence & Issues */}
                              <div className="space-y-2 min-w-[100px]">
                                <div className="flex items-center gap-2 text-sm">
                                  <ImageIcon className="h-4 w-4 text-muted-foreground" />
                                  <span className="font-medium">
                                    {r.evidence_total}
                                  </span>
                                  <span className="text-xs text-muted-foreground">
                                    evidence
                                  </span>
                                </div>
                                {r.linked_issue_count > 0 ? (
                                  <div className="flex items-center gap-2 text-sm">
                                    <FileText className="h-4 w-4 text-muted-foreground" />
                                    <span className="font-medium">
                                      {r.linked_issue_count}
                                    </span>
                                    <span className="text-xs text-muted-foreground">
                                      issues
                                    </span>
                                  </div>
                                ) : (
                                  <div className="text-xs text-muted-foreground">
                                    No issues
                                  </div>
                                )}
                              </div>

                              {/* Action */}
                              <div>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="gap-2"
                                  onClick={() =>
                                    router.push(`/test-runs/${r.id}/review`)
                                  }
                                >
                                  <Eye className="h-4 w-4" />
                                  Review
                                </Button>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <RunReviewDialog
            open={isRunReviewOpen}
            onOpenChange={(v) => {
              setIsRunReviewOpen(v);
              if (!v) {
                setActiveRun(null);
                setRunRows([]);
                setIntegrations([]);
                setSelectedIntegrationId("none");
                setJiraBaseUrl(null);
              }
            }}
            activeRun={activeRun}
            rows={runRows}
            loading={runRowsLoading}
            integrations={integrations}
            integrationLoading={integrationLoading}
            selectedIntegrationId={selectedIntegrationId}
            onSelectedIntegrationIdChange={handleIntegrationChange}
            onCreateIssues={createIssuesFromReview}
            creatingIssues={creatingIssues}
            saving={runSaveBusy}
            onMarkFailuresNeedsUpdate={() => bulkMarkFailuresNeedsUpdate(true)}
            onClearFailuresNeedsUpdate={() =>
              bulkMarkFailuresNeedsUpdate(false)
            }
            onMarkAllCreateIssue={() => bulkMarkAllCreateIssue(true)}
            onClearAllCreateIssue={() => bulkMarkAllCreateIssue(false)}
            onPatchRow={patchRunRow}
            onOpenEvidence={(row) => void openExecution(row)}
            onSave={() => void saveRunReview()}
          />
        </TabsContent>

        {/* ================== EXECUTIONS TAB ================== */}
        <TabsContent value="executions" className="space-y-4 mt-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-4 rounded-lg border shadow-sm">
              <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {execStats.total}
              </div>
              <div className="text-sm text-slate-600 dark:text-slate-400">
                Total Executions
              </div>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 p-4 rounded-lg border border-green-200 dark:border-green-800 shadow-sm">
              <div className="text-2xl font-bold text-green-700 dark:text-green-400">
                {execStats.passed}
              </div>
              <div className="text-sm text-green-600 dark:text-green-500">
                Passed
              </div>
            </div>
            <div className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 p-4 rounded-lg border border-red-200 dark:border-red-800 shadow-sm">
              <div className="text-2xl font-bold text-red-700 dark:text-red-400">
                {execStats.failed}
              </div>
              <div className="text-sm text-red-600 dark:text-red-500">
                Failed
              </div>
            </div>
            <div className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 p-4 rounded-lg border border-orange-200 dark:border-orange-800 shadow-sm">
              <div className="text-2xl font-bold text-orange-700 dark:text-orange-400">
                {execStats.withEvidence}
              </div>
              <div className="text-sm text-orange-600 dark:text-orange-500">
                Executions With Evidence
              </div>
            </div>
          </div>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-3 py-4">
              <div className="flex flex-wrap items-center gap-3">
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search suite, test title, reason…"
                  className="w-[280px]"
                />

                <Select value={dateFilter} onValueChange={setDateFilter}>
                  <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder="Date range" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All time</SelectItem>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="week">Last 7 days</SelectItem>
                    <SelectItem value="month">Last 30 days</SelectItem>
                    <SelectItem value="year">Last year</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={suiteId} onValueChange={setSuiteId}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="All suites" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All suites</SelectItem>
                    {availableSuites.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select
                  value={status}
                  onValueChange={(v) => setStatus(v as StatusFilter)}
                >
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="All results" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All results</SelectItem>
                    <SelectItem value="passed">Passed</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                    <SelectItem value="blocked">Blocked</SelectItem>
                    <SelectItem value="skipped">Skipped</SelectItem>
                  </SelectContent>
                </Select>

                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={hasEvidence}
                    onCheckedChange={(v) => setHasEvidence(Boolean(v))}
                  />
                  <span className="text-sm text-muted-foreground">
                    Has evidence
                  </span>
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="gap-2">
                      <Download className="h-4 w-4" />
                      Export
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={exportToCSV}>
                      <FileText className="h-4 w-4 mr-2" />
                      Export All Data (CSV)
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={exportTrendReport}>
                      <BarChart3 className="h-4 w-4 mr-2" />
                      Export Trend Report (CSV)
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardHeader>

            <CardContent className="pt-0">
              {loading ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="h-6 w-6 animate-spin" />
                  <span className="ml-3 text-muted-foreground">
                    Loading history…
                  </span>
                </div>
              ) : rows.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground">
                  No executions match your filters.
                </div>
              ) : (
                <>
                  <Table className="text-xs">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[40px]"></TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead className="w-[100] max-w-[200ps]">
                          Suite
                        </TableHead>
                        <TableHead className="w-[200px] max-w-[200px]">
                          Test Case
                        </TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Duration</TableHead>
                        <TableHead>Issue</TableHead>
                        <TableHead className="w-[70px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>

                    <TableBody>
                      {rows.map((r) => {
                        const isExpanded = expandedRows.has(r.execution_id);

                        return (
                          <React.Fragment key={r.execution_id}>
                            <TableRow>
                              <TableCell>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0"
                                  onClick={() =>
                                    toggleRowExpansion(r.execution_id)
                                  }
                                >
                                  {isExpanded ? (
                                    <ChevronUp className="h-4 w-4" />
                                  ) : (
                                    <ChevronDown className="h-4 w-4" />
                                  )}
                                </Button>
                              </TableCell>

                              <TableCell className="text-sm text-muted-foreground">
                                <div className="flex items-center gap-2">
                                  <Calendar className="h-4 w-4" />
                                  {new Date(r.created_at).toLocaleDateString()}
                                </div>
                                <div className="text-xs">
                                  {new Date(r.created_at).toLocaleTimeString()}
                                </div>
                              </TableCell>

                              <TableCell className="font-medium">
                                {r.suite_name}
                              </TableCell>

                              <TableCell>
                                <div className="font-medium">
                                  {r.test_title}
                                </div>
                              </TableCell>

                              <TableCell>
                                {statusBadge(r.execution_status)}
                              </TableCell>

                              <TableCell>
                                <div className="flex items-center gap-2 text-sm">
                                  <Clock className="h-4 w-4 text-muted-foreground" />
                                  {formatDuration(r.duration_ms)}
                                </div>
                              </TableCell>

                              <TableCell>
                                <IssueLink
                                  jiraKey={r.jira_issue_key}
                                  testrailId={r.testrail_defect_id}
                                  jiraUrl={
                                    r.jira_issue_key && jiraBaseUrl
                                      ? `${jiraBaseUrl}/browse/${encodeURIComponent(r.jira_issue_key)}`
                                      : undefined
                                  }
                                  testrailUrl={
                                    r.testrail_defect_id
                                      ? `https://your-testrail.com/index.php?/defects/view/${encodeURIComponent(
                                          r.testrail_defect_id,
                                        )}`
                                      : undefined
                                  }
                                />
                              </TableCell>

                              <TableCell className="w-[60px]">
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => openExecution(r)}
                                  className="h-8 w-8"
                                  title="View execution"
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>

                            {isExpanded && (
                              <TableRow>
                                <TableCell colSpan={9} className="bg-muted/30">
                                  <div className="p-4 space-y-3">
                                    {r.execution_notes && (
                                      <div>
                                        <div className="text-sm font-medium mb-1">
                                          Execution Notes:
                                        </div>
                                        <div className="text-sm text-muted-foreground bg-background p-3 rounded-lg">
                                          {r.execution_notes}
                                        </div>
                                      </div>
                                    )}

                                    {r.failure_reason && (
                                      <div>
                                        <div className="text-sm font-medium mb-1 flex items-center gap-2 text-destructive">
                                          <AlertCircle className="h-4 w-4" />
                                          Failure Reason:
                                        </div>
                                        <div className="text-sm text-muted-foreground bg-background p-3 rounded-lg border-l-4 border-destructive">
                                          {r.failure_reason}
                                        </div>
                                      </div>
                                    )}

                                    {(r.jira_issue_key ||
                                      r.testrail_defect_id) && (
                                      <div className="flex items-center gap-2 text-xs">
                                        <span className="font-medium">
                                          Linked Issue:
                                        </span>
                                        <IssueLink
                                          jiraKey={r.jira_issue_key}
                                          testrailId={r.testrail_defect_id}
                                          jiraUrl={
                                            r.jira_issue_key && jiraBaseUrl
                                              ? `${jiraBaseUrl}/browse/${encodeURIComponent(r.jira_issue_key)}`
                                              : undefined
                                          }
                                          testrailUrl={
                                            r.testrail_defect_id
                                              ? `https://your-testrail.com/index.php?/defects/view/${encodeURIComponent(
                                                  r.testrail_defect_id,
                                                )}`
                                              : undefined
                                          }
                                        />
                                      </div>
                                    )}

                                    <div className="flex gap-4 text-xs text-muted-foreground flex-wrap">
                                      <div>
                                        <span className="font-medium">
                                          Started:
                                        </span>{" "}
                                        {r.started_at
                                          ? new Date(
                                              r.started_at,
                                            ).toLocaleString()
                                          : "-"}
                                      </div>
                                      <div>
                                        <span className="font-medium">
                                          Completed:
                                        </span>{" "}
                                        {r.completed_at
                                          ? new Date(
                                              r.completed_at,
                                            ).toLocaleString()
                                          : "-"}
                                      </div>
                                      <div>
                                        <span className="font-medium">
                                          Reviewed:
                                        </span>{" "}
                                        {r.reviewed_at
                                          ? new Date(
                                              r.reviewed_at,
                                            ).toLocaleString()
                                          : "-"}
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <Badge variant="secondary">
                                          Needs update:{" "}
                                          {r.review_needs_update ? "yes" : "no"}
                                        </Badge>
                                        <Badge variant="secondary">
                                          Create issue:{" "}
                                          {r.review_create_issue ? "yes" : "no"}
                                        </Badge>
                                      </div>
                                    </div>
                                  </div>
                                </TableCell>
                              </TableRow>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </TableBody>
                  </Table>

                  <div className="flex items-center justify-between mt-4 pt-4 border-t">
                    <div className="text-sm text-muted-foreground">
                      Showing{" "}
                      {Math.min((currentPage - 1) * pageSize + 1, totalCount)}{" "}
                      to {Math.min(currentPage * pageSize, totalCount)} of{" "}
                      {totalCount} results
                    </div>

                    <Select
                      value={String(pageSize)}
                      onValueChange={(v) => setPageSize(Number(v))}
                    >
                      <SelectTrigger className="w-[120px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="10">10 per page</SelectItem>
                        <SelectItem value="20">20 per page</SelectItem>
                        <SelectItem value="50">50 per page</SelectItem>
                        <SelectItem value="100">100 per page</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(1)}
                      disabled={currentPage === 1}
                    >
                      First
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      Previous
                    </Button>

                    <div className="flex items-center gap-2 px-3">
                      <span className="text-sm">
                        Page {currentPage} of {Math.ceil(totalCount / pageSize)}
                      </span>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => p + 1)}
                      disabled={currentPage >= Math.ceil(totalCount / pageSize)}
                    >
                      Next
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setCurrentPage(Math.ceil(totalCount / pageSize))
                      }
                      disabled={currentPage >= Math.ceil(totalCount / pageSize)}
                    >
                      Last
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      <div className="h-4" />

      {/* View Evidence Dialog */}
      <Dialog open={openView} onOpenChange={setOpenView}>
        <DialogContent className="max-w-6xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between pr-8">
              <span>Test Execution Evidence</span>
              {activeExecution && statusBadge(activeExecution.execution_status)}
            </DialogTitle>
            <DialogDescription>
              {activeExecution?.test_title} • {activeExecution?.suite_name}
            </DialogDescription>
          </DialogHeader>

          <Tabs
            defaultValue="screenshots"
            className="flex-1 flex flex-col overflow-hidden"
          >
            <TabsList>
              <TabsTrigger value="screenshots">
                Screenshots ({evidence.length})
              </TabsTrigger>
              <TabsTrigger value="details">Details</TabsTrigger>
            </TabsList>

            <TabsContent
              value="screenshots"
              className="flex-1 overflow-auto mt-4"
            >
              {evidenceLoading ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="h-6 w-6 animate-spin" />
                  <span className="ml-3 text-muted-foreground">
                    Loading evidence…
                  </span>
                </div>
              ) : evidence.length === 0 ? (
                <div className="py-10 text-center text-muted-foreground">
                  <ImageIcon className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No evidence uploaded for this execution.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {evidence.map((att) => (
                    <AttachmentCardWithSignedUrl
                      key={att.id}
                      attachment={att}
                      onPreview={setPreviewImage}
                      getSignedUrl={createSignedUrl}
                    />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="details" className="space-y-4 overflow-auto">
              {activeExecution && (
                <div className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">
                        Execution Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <span className="text-muted-foreground">Status:</span>
                          <div className="mt-1">
                            {statusBadge(activeExecution.execution_status)}
                          </div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">
                            Duration:
                          </span>
                          <div className="font-medium mt-1">
                            {formatDuration(activeExecution.duration_ms)}
                          </div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">
                            Started:
                          </span>
                          <div className="font-medium mt-1">
                            {activeExecution.started_at
                              ? new Date(
                                  activeExecution.started_at,
                                ).toLocaleString()
                              : "-"}
                          </div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">
                            Completed:
                          </span>
                          <div className="font-medium mt-1">
                            {activeExecution.completed_at
                              ? new Date(
                                  activeExecution.completed_at,
                                ).toLocaleString()
                              : "-"}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {activeExecution.execution_notes && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">
                          Execution Notes
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                          {activeExecution.execution_notes}
                        </p>
                      </CardContent>
                    </Card>
                  )}

                  {activeExecution.failure_reason && (
                    <Card className="border-destructive">
                      <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2 text-destructive">
                          <AlertCircle className="h-5 w-5" />
                          Failure Reason
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                          {activeExecution.failure_reason}
                        </p>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenView(false)}>
              Close
            </Button>
            {evidence.length > 0 && (
              <Button onClick={downloadEvidence}>
                <Download className="h-4 w-4 mr-2" />
                Download All Evidence
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Image Preview Dialog */}
      {previewImage && (
        <Dialog
          open={!!previewImage}
          onOpenChange={() => setPreviewImage(null)}
        >
          <DialogContent className="max-w-[95vw] max-h-[95vh] p-0">
            <DialogHeader className="sr-only">
              <DialogTitle>Image Preview</DialogTitle>
            </DialogHeader>
            <div className="relative w-full h-full flex items-center justify-center bg-black">
              <img
                src={previewImage}
                alt="Preview"
                className="max-w-full max-h-[90vh] object-contain"
              />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function AttachmentCardWithSignedUrl({
  attachment,
  onPreview,
  getSignedUrl,
}: {
  attachment: AttachmentRow;
  onPreview: (url: string) => void;
  getSignedUrl: (path: string, expires: number) => Promise<string>;
}) {
  const [imageUrl, setImageUrl] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadUrl() {
      try {
        setLoading(true);
        const url = await getSignedUrl(attachment.file_path, 60 * 60);
        if (!cancelled) setImageUrl(url);
      } catch (err) {
        console.error("Error loading image:", err);
        if (!cancelled) setImageUrl("");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadUrl();
    return () => {
      cancelled = true;
    };
  }, [attachment.file_path, getSignedUrl]);

  const isImage = attachment.file_type?.startsWith("image/");

  const handleDownload = useCallback(
    async (e: React.MouseEvent) => {
      e.stopPropagation();
      const freshUrl = await getSignedUrl(attachment.file_path, 60 * 60);
      if (!freshUrl) {
        toast.error("Failed to download file");
        return;
      }
      const a = document.createElement("a");
      a.href = freshUrl;
      a.download = attachment.file_name;
      a.click();
    },
    [attachment.file_path, attachment.file_name, getSignedUrl],
  );

  return (
    <Card className="overflow-hidden group">
      <div
        className="aspect-video bg-muted relative cursor-pointer"
        onClick={() => imageUrl && onPreview(imageUrl)}
      >
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : imageUrl && isImage ? (
          <img
            src={imageUrl}
            alt={attachment.file_name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <FileText className="h-12 w-12 text-muted-foreground" />
          </div>
        )}

        {attachment.step_number != null && (
          <Badge className="absolute top-2 left-2 text-xs">
            Step {attachment.step_number}
          </Badge>
        )}
      </div>

      <CardContent className="p-3">
        <p className="text-sm font-medium line-clamp-1">
          {attachment.file_name}
        </p>
        {attachment.description && (
          <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
            {attachment.description}
          </p>
        )}
        <div className="flex items-center justify-between mt-2">
          <span className="text-xs text-muted-foreground">
            {new Date(attachment.created_at).toLocaleTimeString()}
          </span>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-2"
            onClick={handleDownload}
            disabled={loading || !imageUrl}
          >
            <Download className="h-3 w-3" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
