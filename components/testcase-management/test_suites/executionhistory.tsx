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
  Zap,
} from "lucide-react";

import { toastError, toastInfo, toastSuccess } from "@/lib/utils/toast-utils";
import { ExecutionHistoryRow, AllowedStatus } from "@/types/executions";

// ─── Types ────────────────────────────────────────────────────────────────────

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
  linked_issue_count: number;
  is_automation: boolean;
};

type IntegrationRow = {
  id: string;
  integration_type: "jira" | "testrail";
  project_id: string | null;
  sync_enabled: boolean;
  config: Record<string, string>;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const INCLUDED_STATUSES: AllowedStatus[] = [
  "passed",
  "failed",
  "blocked",
  "skipped",
];

const EXECUTION_SELECT = `
  id, suite_id, session_id, test_case_id, platform_test_case_id,
  execution_status, execution_notes, failure_reason, created_at,
  started_at, completed_at, review_needs_update, review_create_issue,
  review_note, reviewed_at, jira_issue_key, testrail_defect_id,
  automation_run_id
`;

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

function computeStartDate(dateFilterValue: string): string | null {
  const now = new Date();
  if (dateFilterValue === "today")
    return new Date(now.setHours(0, 0, 0, 0)).toISOString();
  if (dateFilterValue === "week") {
    now.setDate(now.getDate() - 7);
    return now.toISOString();
  }
  if (dateFilterValue === "month") {
    now.setMonth(now.getMonth() - 1);
    return now.toISOString();
  }
  if (dateFilterValue === "year") {
    now.setFullYear(now.getFullYear() - 1);
    return now.toISOString();
  }
  return null;
}

function mapExecToRow(
  e: Record<string, unknown>,
  suiteMap: Map<
    string,
    { id: string; name: string; project_id: string | null }
  >,
  regularMap: Map<
    string,
    { id: string; title: string; description: string | null }
  >,
  platformMap: Map<
    string,
    { id: string; title: string; description: string | null }
  >,
  evidenceCounts: Map<string, number>,
  suiteName?: string,
): ExecutionHistoryRow {
  const suite = suiteMap.get(e.suite_id as string);
  const testCase = e.test_case_id
    ? regularMap.get(e.test_case_id as string)
    : platformMap.get(e.platform_test_case_id as string);

  const duration =
    e.started_at && e.completed_at
      ? new Date(e.completed_at as string).getTime() -
        new Date(e.started_at as string).getTime()
      : null;

  return {
    execution_id: e.id as string,
    suite_id: e.suite_id as string,
    suite_name: suiteName ?? suite?.name ?? "Unknown Suite",
    session_id: (e.session_id as string) ?? null,
    test_case_id: (e.test_case_id || e.platform_test_case_id) as string,
    test_title: testCase?.title ?? "Unknown Test",
    test_description: testCase?.description ?? null,
    execution_status: (e.execution_status as AllowedStatus) ?? "passed",
    execution_notes: (e.execution_notes as string) ?? null,
    failure_reason: (e.failure_reason as string) ?? null,
    created_at: e.created_at as string,
    started_at: (e.started_at as string) ?? null,
    completed_at: (e.completed_at as string) ?? null,
    duration_ms: duration,
    evidence_count: evidenceCounts.get(e.id as string) ?? 0,
    review_needs_update: Boolean(e.review_needs_update ?? false),
    review_create_issue: Boolean(e.review_create_issue ?? false),
    review_note: (e.review_note as string) ?? null,
    reviewed_at: (e.reviewed_at as string) ?? null,
    jira_issue_key: (e.jira_issue_key as string) ?? null,
    testrail_defect_id: (e.testrail_defect_id as string) ?? null,
    automation_run_id: (e.automation_run_id as string) ?? null,
  };
}

async function resolveTestCaseMaps(
  supabase: ReturnType<typeof createClient>,
  execs: Record<string, unknown>[],
) {
  const regularIds = [
    ...new Set(execs.map((e) => e.test_case_id).filter(Boolean)),
  ] as string[];
  const platformIds = [
    ...new Set(execs.map((e) => e.platform_test_case_id).filter(Boolean)),
  ] as string[];

  const regularMap = new Map<
    string,
    { id: string; title: string; description: string | null }
  >();
  const platformMap = new Map<
    string,
    { id: string; title: string; description: string | null }
  >();

  if (regularIds.length > 0) {
    const { data } = await supabase
      .from("test_cases")
      .select("id, title, description")
      .in("id", regularIds);
    (data ?? []).forEach((c) => regularMap.set(c.id, c));
  }
  if (platformIds.length > 0) {
    const { data } = await supabase
      .from("platform_test_cases")
      .select("id, title, description")
      .in("id", platformIds);
    (data ?? []).forEach((c) => platformMap.set(c.id, c));
  }

  return { regularMap, platformMap };
}

async function resolveEvidenceCounts(
  supabase: ReturnType<typeof createClient>,
  execIds: string[],
): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  if (execIds.length === 0) return counts;
  const { data } = await supabase
    .from("test_attachments")
    .select("execution_id")
    .in("execution_id", execIds);
  for (const a of data ?? []) {
    counts.set(a.execution_id, (counts.get(a.execution_id) ?? 0) + 1);
  }
  return counts;
}

// ─── Badge helpers ────────────────────────────────────────────────────────────

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
  if (s === "completed")
    return <Badge className="bg-green-600 gap-1">Completed</Badge>;
  if (s === "paused")
    return <Badge className="bg-orange-600 gap-1">Paused</Badge>;
  if (s === "in_progress")
    return <Badge className="bg-blue-600 gap-1">In progress</Badge>;
  if (s === "planned") return <Badge variant="secondary">Planned</Badge>;
  if (s === "aborted") return <Badge variant="destructive">Aborted</Badge>;
  return <Badge variant="secondary">{s}</Badge>;
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
    return (
      <a
        href={jiraUrl || "#"}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
        onClick={(e) => {
          if (!jiraUrl) {
            e.preventDefault();
            toastError("Jira URL not configured");
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
    return (
      <a
        href={testrailUrl || "#"}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 text-xs text-emerald-700 hover:underline"
        onClick={(e) => {
          if (!testrailUrl) {
            e.preventDefault();
            toastError("TestRail URL not configured");
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

// ─── Main component ───────────────────────────────────────────────────────────

export function ExecutionHistory({
  suiteId: propSuiteId,
}: { suiteId?: string } = {}) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();

  const [availableSuites, setAvailableSuites] = useState<
    Array<{ id: string; name: string }>
  >([]);
  const [suiteId, setSuiteId] = useState<string>(propSuiteId ?? "all");
  const [dateFilter, setDateFilter] = useState<string>("all");

  // runs tab
  const [runs, setRuns] = useState<RunWithStats[]>([]);
  const [runsLoading, setRunsLoading] = useState(true);
  const [runsSearch, setRunsSearch] = useState("");
  const debouncedRunsSearch = useDebouncedValue(runsSearch, 300);
  const [showAborted, setShowAborted] = useState(false);

  // executions tab
  const [rows, setRows] = useState<ExecutionHistoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [status, setStatus] = useState<StatusFilter>("all");
  const [hasEvidence, setHasEvidence] = useState(false);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);
  const [integrationLoading, setIntegrationLoading] = useState(false);

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

  // integrations
  const [integrations, setIntegrations] = useState<IntegrationRow[]>([]);
  const [selectedIntegrationId, setSelectedIntegrationId] = useState("none");
  const [jiraBaseUrl, setJiraBaseUrl] = useState<string | null>(null);

  useEffect(() => {
    if (propSuiteId) setSuiteId(propSuiteId);
  }, [propSuiteId]);
  useEffect(() => {
    void fetchSuites();
  }, []);
  useEffect(() => {
    void fetchRuns();
  }, [suiteId, dateFilter, debouncedRunsSearch, showAborted]);
  useEffect(() => {
    void fetchHistory();
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

  // ─── Data fetching ──────────────────────────────────────────────────────────

  async function fetchSuites() {
    try {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return;
      const { data } = await supabase
        .from("suites")
        .select("id, name")
        .eq("user_id", auth.user.id)
        .order("name");
      setAvailableSuites(data ?? []);
    } catch (err) {
      console.error(err);
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

      // ── Manual runs ──
      let q = supabase
        .from("test_run_sessions")
        .select(
          "id, user_id, suite_id, name, description, status, planned_start, actual_start, actual_end, environment, test_cases_total, test_cases_completed, progress_percentage, passed_cases, failed_cases, skipped_cases, blocked_cases, created_at, updated_at, paused_at, auto_advance",
        )
        .eq("user_id", auth.user.id)
        .order("created_at", { ascending: false })
        .limit(200);

      if (showAborted) q = q.in("status", ["completed", "aborted"]);
      else q = q.eq("status", "completed");
      if (suiteId !== "all") q = q.eq("suite_id", suiteId);
      if (startDate) q = q.gte("created_at", startDate);

      const { data: sessionsRaw } = await q;

      // ── Automation runs ──
      let aq = supabase
        .from("automation_runs")
        .select(
          "id, user_id, suite_id, run_number, status, framework, environment, browser, total_tests, passed_tests, failed_tests, skipped_tests, started_at, completed_at, created_at",
        )
        .eq("user_id", auth.user.id)
        .order("created_at", { ascending: false })
        .limit(200);

      if (suiteId !== "all") aq = aq.eq("suite_id", suiteId);
      if (startDate) aq = aq.gte("created_at", startDate);

      const { data: automationRaw } = await aq;

      // Resolve suite names
      const allSuiteIds = [
        ...new Set(
          [
            ...(sessionsRaw ?? []).map(
              (s: Record<string, unknown>) => s.suite_id,
            ),
            ...(automationRaw ?? []).map(
              (a: Record<string, unknown>) => a.suite_id,
            ),
          ].filter(Boolean) as string[],
        ),
      ];
      const suiteMap = new Map<
        string,
        { id: string; name: string; project_id: string | null }
      >();
      if (allSuiteIds.length > 0) {
        const { data: suites } = await supabase
          .from("suites")
          .select("id, name, project_id")
          .in("id", allSuiteIds);
        (suites ?? []).forEach((s) => suiteMap.set(s.id, s));
      }

      // Map manual sessions
      const manualRuns: RunWithStats[] = (sessionsRaw ?? []).map(
        (r: Record<string, unknown>) => ({
          id: r.id as string,
          user_id: r.user_id as string,
          suite_id: (r.suite_id as string) ?? null,
          suite_name:
            suiteMap.get(r.suite_id as string)?.name ?? "Unknown Suite",
          name: r.name as string,
          description: (r.description as string) ?? null,
          status: (r.status ?? "planned") as RunStatus,
          planned_start: (r.planned_start as string) ?? null,
          actual_start: (r.actual_start as string) ?? null,
          actual_end: (r.actual_end as string) ?? null,
          environment: (r.environment as string) ?? null,
          test_cases_total: Number(r.test_cases_total ?? 0),
          test_cases_completed: Number(r.test_cases_completed ?? 0),
          progress_percentage: Number(r.progress_percentage ?? 0),
          passed_cases: Number(r.passed_cases ?? 0),
          failed_cases: Number(r.failed_cases ?? 0),
          skipped_cases: Number(r.skipped_cases ?? 0),
          blocked_cases: Number(r.blocked_cases ?? 0),
          created_at: r.created_at as string,
          updated_at: r.updated_at as string,
          paused_at: (r.paused_at as string) ?? null,
          auto_advance: Boolean(r.auto_advance ?? true),
          evidence_total: 0,
          review_done: false,
          linked_issue_count: 0,
          is_automation: false,
        }),
      );

      // Map automation runs
      const automationRuns: RunWithStats[] = (automationRaw ?? []).map(
        (r: Record<string, unknown>) => ({
          id: r.id as string,
          user_id: r.user_id as string,
          suite_id: (r.suite_id as string) ?? null,
          suite_name:
            suiteMap.get(r.suite_id as string)?.name ?? "Unknown Suite",
          name: `Run #${r.run_number} — ${r.framework ?? "playwright"}`,
          description: `${r.browser ?? "chromium"} · ${r.environment ?? "local"}`,
          status: "completed" as RunStatus,
          planned_start: null,
          actual_start: (r.started_at as string) ?? null,
          actual_end: (r.completed_at as string) ?? null,
          environment: (r.environment as string) ?? null,
          test_cases_total: Number(r.total_tests ?? 0),
          test_cases_completed: Number(r.total_tests ?? 0),
          progress_percentage: 100,
          passed_cases: Number(r.passed_tests ?? 0),
          failed_cases: Number(r.failed_tests ?? 0),
          skipped_cases: Number(r.skipped_tests ?? 0),
          blocked_cases: 0,
          created_at: r.created_at as string,
          updated_at: r.created_at as string,
          paused_at: null,
          auto_advance: false,
          evidence_total: 0,
          review_done: false,
          linked_issue_count: 0,
          is_automation: true,
        }),
      );

      let allRuns = [...manualRuns, ...automationRuns].sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );

      // Client-side search
      const s = debouncedRunsSearch.trim().toLowerCase();
      if (s) {
        allRuns = allRuns.filter(
          (r) =>
            r.suite_name.toLowerCase().includes(s) ||
            r.name.toLowerCase().includes(s) ||
            (r.description ?? "").toLowerCase().includes(s) ||
            (r.environment ?? "").toLowerCase().includes(s),
        );
      }

      // ── Resolve evidence + review + issue counts for ALL runs (manual + automation) ──
      //
      // Manual runs: group executions by session_id
      const sessionIds = manualRuns.map((r) => r.id);
      // Automation runs: group executions by automation_run_id
      const automationRunIds = automationRuns.map((r) => r.id);

      const evidenceByRunId = new Map<string, number>();
      const reviewedByRunId = new Map<string, boolean>();
      const issuesByRunId = new Map<string, number>();

      // Fetch manual-linked executions
      if (sessionIds.length > 0) {
        const { data: manualExecStats } = await supabase
          .from("test_executions")
          .select(
            "id, session_id, reviewed_at, jira_issue_key, testrail_defect_id",
          )
          .in("session_id", sessionIds);

        const manualExecIds = (manualExecStats ?? []).map((e) => e.id);
        const manualEvidence = await resolveEvidenceCounts(
          supabase,
          manualExecIds,
        );

        for (const e of manualExecStats ?? []) {
          const key = e.session_id;
          if (!key) continue;
          if (e.reviewed_at) reviewedByRunId.set(key, true);
          evidenceByRunId.set(
            key,
            (evidenceByRunId.get(key) ?? 0) + (manualEvidence.get(e.id) ?? 0),
          );
          if (e.jira_issue_key || e.testrail_defect_id) {
            issuesByRunId.set(key, (issuesByRunId.get(key) ?? 0) + 1);
          }
        }
      }

      // Fetch automation-linked executions
      if (automationRunIds.length > 0) {
        const { data: autoExecStats } = await supabase
          .from("test_executions")
          .select(
            "id, automation_run_id, reviewed_at, jira_issue_key, testrail_defect_id",
          )
          .in("automation_run_id", automationRunIds);

        const autoExecIds = (autoExecStats ?? []).map((e) => e.id);
        const autoEvidence = await resolveEvidenceCounts(supabase, autoExecIds);

        for (const e of autoExecStats ?? []) {
          const key = e.automation_run_id;
          if (!key) continue;
          if (e.reviewed_at) reviewedByRunId.set(key, true);
          autoEvidence &&
            evidenceByRunId.set(
              key,
              (evidenceByRunId.get(key) ?? 0) + (autoEvidence.get(e.id) ?? 0),
            );
          if (e.jira_issue_key || e.testrail_defect_id) {
            issuesByRunId.set(key, (issuesByRunId.get(key) ?? 0) + 1);
          }
        }
      }

      // Patch stats back onto every run
      allRuns = allRuns.map((r) => ({
        ...r,
        evidence_total: evidenceByRunId.get(r.id) ?? 0,
        review_done: Boolean(reviewedByRunId.get(r.id) ?? false),
        linked_issue_count: issuesByRunId.get(r.id) ?? 0,
      }));

      setRuns(allRuns);
    } catch (err) {
      console.error(err);
      toastError("Failed to load run history");
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
        .select(EXECUTION_SELECT)
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

      const { count } = await countQuery;
      setTotalCount(count ?? 0);

      const from = (currentPage - 1) * pageSize;
      dataQuery = dataQuery.range(from, from + pageSize - 1);

      const { data: execsRaw, error } = await dataQuery;
      if (error) throw error;

      const execs = (execsRaw ?? []) as Record<string, unknown>[];

      const suiteIds = [
        ...new Set(execs.map((e) => e.suite_id).filter(Boolean)),
      ] as string[];
      const suiteMap = new Map<
        string,
        { id: string; name: string; project_id: string | null }
      >();
      if (suiteIds.length > 0) {
        const { data: suites } = await supabase
          .from("suites")
          .select("id, name, project_id")
          .in("id", suiteIds);
        (suites ?? []).forEach((s) => suiteMap.set(s.id, s));
      }

      const { regularMap, platformMap } = await resolveTestCaseMaps(
        supabase,
        execs,
      );
      const projectId = suiteMap.values().next().value?.project_id ?? null;
      await loadIntegrationsForProject(projectId);

      const sq = debouncedSearch.trim().toLowerCase();
      const searched = sq
        ? execs.filter((e) => {
            const suite = suiteMap.get(e.suite_id as string);
            const testCase = e.test_case_id
              ? regularMap.get(e.test_case_id as string)
              : platformMap.get(e.platform_test_case_id as string);
            return (
              String(testCase?.title ?? "")
                .toLowerCase()
                .includes(sq) ||
              String(suite?.name ?? "")
                .toLowerCase()
                .includes(sq) ||
              String(e.failure_reason ?? "")
                .toLowerCase()
                .includes(sq) ||
              String(testCase?.description ?? "")
                .toLowerCase()
                .includes(sq)
            );
          })
        : execs;

      const execIds = searched.map((e) => e.id as string);
      if (execIds.length === 0) {
        setRows([]);
        return;
      }

      const evidenceCounts = await resolveEvidenceCounts(supabase, execIds);
      let mapped = searched.map((e) =>
        mapExecToRow(e, suiteMap, regularMap, platformMap, evidenceCounts),
      );
      if (hasEvidence) mapped = mapped.filter((r) => r.evidence_count > 0);
      setRows(mapped);
    } catch (err) {
      console.error(err);
      toastError("Failed to load execution history");
      setRows([]);
    } finally {
      setLoading(false);
    }
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
        (i: IntegrationRow) => i.integration_type === "jira",
      );
      setIntegrations(list);
      const firstEnabled =
        list.find((i: IntegrationRow) => i.sync_enabled) ?? list[0];
      setSelectedIntegrationId(firstEnabled?.id ?? "none");
      setJiraBaseUrl(firstEnabled?.config?.url ?? null);
    } finally {
      setIntegrationLoading(false);
    }
  }

  // ─── Run review — navigate to the dedicated page for both run types ───────────

  function openRunReview(run: RunWithStats) {
    const params = run.is_automation ? "?type=automation" : "";
    router.push(`/test-runs/${run.id}/review${params}`);
  }

  // ─── Evidence ───────────────────────────────────────────────────────────────

  async function createSignedUrl(
    filePath: string,
    expiresInSeconds: number,
  ): Promise<string> {
    const { data, error } = await supabase.storage
      .from("test-attachments")
      .createSignedUrl(filePath, expiresInSeconds);
    if (error) throw error;
    return data.signedUrl;
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
    } catch {
      toastError("Failed to load evidence");
      setEvidence([]);
    } finally {
      setEvidenceLoading(false);
    }
  }

  async function downloadEvidence() {
    if (evidence.length === 0) return;
    toastInfo("Downloading evidence files…");
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

  // ─── Exports ─────────────────────────────────────────────────────────────────

  function exportToCSV() {
    if (rows.length === 0) {
      toastError("No data to export");
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
    const escape = (f: string | number) => {
      const s = String(f);
      return s.includes(",") || s.includes('"') || s.includes("\n")
        ? `"${s.replace(/"/g, '""')}"`
        : s;
    };
    const csvRows = rows.map((r) => {
      const date = new Date(r.created_at);
      return [
        date.toLocaleDateString(),
        date.toLocaleTimeString(),
        r.suite_name,
        r.test_title,
        r.test_description || "",
        r.execution_status,
        r.duration_ms ? Math.floor(r.duration_ms / 1000) : 0,
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
    const csv = [
      headers.join(","),
      ...csvRows.map((row) => row.map(escape).join(",")),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `executionhistory-${dateFilter}-${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toastSuccess(`Exported ${rows.length} executions to CSV`);
  }

  function exportTrendReport() {
    if (rows.length === 0) {
      toastError("No data to export");
      return;
    }
    const byDate = new Map<
      string,
      { passed: number; failed: number; total: number }
    >();
    rows.forEach((r) => {
      const date = new Date(r.created_at).toLocaleDateString();
      const existing = byDate.get(date) || { passed: 0, failed: 0, total: 0 };
      existing.total++;
      if (r.execution_status === "passed") existing.passed++;
      if (r.execution_status === "failed") existing.failed++;
      byDate.set(date, existing);
    });
    const headers = ["Date", "Total Tests", "Passed", "Failed", "Pass Rate %"];
    const trendRows = Array.from(byDate.entries())
      .sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime())
      .map(([date, s]) => [
        date,
        s.total,
        s.passed,
        s.failed,
        s.total ? Math.round((s.passed / s.total) * 100) : 0,
      ]);
    const csv = [headers.join(","), ...trendRows.map((r) => r.join(","))].join(
      "\n",
    );
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `test-trends-${dateFilter}-${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toastSuccess("Exported trend report");
  }

  // ─── Derived state ────────────────────────────────────────────────────────

  function toggleRowExpansion(executionId: string) {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      next.has(executionId) ? next.delete(executionId) : next.add(executionId);
      return next;
    });
  }

  const execStats = useMemo(
    () => ({
      total: rows.length,
      passed: rows.filter((r) => r.execution_status === "passed").length,
      failed: rows.filter((r) => r.execution_status === "failed").length,
      withEvidence: rows.filter((r) => r.evidence_count > 0).length,
    }),
    [rows],
  );

  const runSummaryStats = useMemo(
    () => ({
      totalRuns: runs.length,
      completed: runs.filter((r) => r.status === "completed").length,
      withFailures: runs.filter((r) => r.failed_cases > 0).length,
      reviewed: runs.filter((r) => r.review_done).length,
    }),
    [runs],
  );

  const handleIntegrationChange = (id: string) => {
    setSelectedIntegrationId(id);
    const selected = integrations.find((i) => i.id === id);
    setJiraBaseUrl(selected?.config?.url ?? null);
  };

  // ─── Render ──────────────────────────────────────────────────────────────────

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

        {/* ── Runs Tab ─────────────────────────────────────────────────────── */}
        <TabsContent value="runs" className="space-y-4 mt-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              {
                value: runSummaryStats.totalRuns,
                label: "Runs",
                color: "blue",
              },
              {
                value: runSummaryStats.completed,
                label: "Completed",
                color: "green",
              },
              {
                value: runSummaryStats.withFailures,
                label: "Runs with failures",
                color: "red",
              },
              {
                value: runSummaryStats.reviewed,
                label: "Reviewed",
                color: "orange",
              },
            ].map(({ value, label, color }) => (
              <div
                key={label}
                className={`bg-gradient-to-br from-${color}-50 to-${color}-100 dark:from-${color}-900/20 dark:to-${color}-800/20 p-4 rounded-lg border border-${color}-200 dark:border-${color}-800 shadow-sm`}
              >
                <div
                  className={`text-2xl font-bold text-${color}-700 dark:text-${color}-400`}
                >
                  {value}
                </div>
                <div
                  className={`text-sm text-${color}-600 dark:text-${color}-500`}
                >
                  {label}
                </div>
              </div>
            ))}
          </div>

          <Card>
            <CardHeader className="flex flex-row items-center gap-3 py-4">
              <div className="flex flex-col sm:flex-row sm:flex-wrap items-start sm:items-center gap-2 w-full">
                <Input
                  value={runsSearch}
                  onChange={(e) => setRunsSearch(e.target.value)}
                  placeholder="Search run name, suite…"
                  className="w-full sm:w-[240px]"
                />
                <Select value={dateFilter} onValueChange={setDateFilter}>
                  <SelectTrigger className="w-full sm:w-[160px]">
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
                {!propSuiteId && (
                  <Select value={suiteId} onValueChange={setSuiteId}>
                    <SelectTrigger className="w-full sm:w-[200px]">
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
                )}
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
                        <CardContent className="p-3 sm:p-4">
                          {/* ── Row 1: date · status badges · review button ── */}
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground min-w-0">
                              <Calendar className="h-3.5 w-3.5 shrink-0" />
                              <span className="font-medium text-foreground">
                                {created.toLocaleDateString()}
                              </span>
                              <span className="hidden sm:inline">
                                · {created.toLocaleTimeString()}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              {runStatusBadge(r.status)}
                              {r.is_automation && (
                                <Badge
                                  variant="outline"
                                  className="text-[10px] gap-1 border-blue-200 text-blue-600 dark:border-blue-800 dark:text-blue-400"
                                >
                                  <Zap className="h-2.5 w-2.5" />
                                  <span className="hidden xs:inline">auto</span>
                                </Badge>
                              )}
                              <Button
                                size="sm"
                                variant="outline"
                                className="gap-1.5 h-7 text-xs px-2"
                                onClick={() => openRunReview(r)}
                              >
                                <Eye className="h-3.5 w-3.5" />
                                <span className="hidden sm:inline">Review</span>
                              </Button>
                            </div>
                          </div>

                          {/* ── Row 2: suite name + run name ── */}
                          <div className="mb-2.5">
                            <div className="text-[11px] text-muted-foreground uppercase tracking-wide mb-0.5">
                              {r.suite_name}
                            </div>
                            <div className="font-semibold text-sm leading-snug truncate">
                              {r.name || `Run ${r.id.slice(0, 8)}…`}
                            </div>
                          </div>

                          {/* ── Row 3: progress + result badges + meta ── */}
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                            {/* Progress */}
                            <span className="text-xs text-muted-foreground">
                              {r.test_cases_completed}/{r.test_cases_total}
                              {" · "}
                              {passRate}% pass
                            </span>

                            {/* Result badges */}
                            <div className="flex gap-1 flex-wrap">
                              <Badge
                                variant="secondary"
                                className="bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300 text-[11px] h-5 px-1.5"
                              >
                                <CheckCircle2 className="h-2.5 w-2.5 mr-0.5" />
                                {r.passed_cases}
                              </Badge>
                              <Badge
                                variant="secondary"
                                className="bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300 text-[11px] h-5 px-1.5"
                              >
                                <XCircle className="h-2.5 w-2.5 mr-0.5" />
                                {r.failed_cases}
                              </Badge>
                              {r.blocked_cases > 0 && (
                                <Badge
                                  variant="secondary"
                                  className="bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300 text-[11px] h-5 px-1.5"
                                >
                                  <AlertTriangle className="h-2.5 w-2.5 mr-0.5" />
                                  {r.blocked_cases}
                                </Badge>
                              )}
                              {r.skipped_cases > 0 && (
                                <Badge
                                  variant="secondary"
                                  className="bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 text-[11px] h-5 px-1.5"
                                >
                                  <MinusCircle className="h-2.5 w-2.5 mr-0.5" />
                                  {r.skipped_cases}
                                </Badge>
                              )}
                            </div>

                            {/* Evidence + issues */}
                            {r.evidence_total > 0 && (
                              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                <ImageIcon className="h-3.5 w-3.5" />
                                {r.evidence_total}
                              </span>
                            )}
                            {r.linked_issue_count > 0 && (
                              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                <FileText className="h-3.5 w-3.5" />
                                {r.linked_issue_count} issue
                                {r.linked_issue_count !== 1 ? "s" : ""}
                              </span>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Executions Tab ───────────────────────────────────────────────── */}
        <TabsContent value="executions" className="space-y-4 mt-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-4 rounded-lg border shadow-sm">
              <div className="text-2xl font-bold">{execStats.total}</div>
              <div className="text-sm text-muted-foreground">
                Total Executions
              </div>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 p-4 rounded-lg border border-green-200 dark:border-green-800 shadow-sm">
              <div className="text-2xl font-bold text-green-700 dark:text-green-400">
                {execStats.passed}
              </div>
              <div className="text-sm text-green-600">Passed</div>
            </div>
            <div className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 p-4 rounded-lg border border-red-200 dark:border-red-800 shadow-sm">
              <div className="text-2xl font-bold text-red-700 dark:text-red-400">
                {execStats.failed}
              </div>
              <div className="text-sm text-red-600">Failed</div>
            </div>
            <div className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 p-4 rounded-lg border border-orange-200 dark:border-orange-800 shadow-sm">
              <div className="text-2xl font-bold text-orange-700 dark:text-orange-400">
                {execStats.withEvidence}
              </div>
              <div className="text-sm text-orange-600">With Evidence</div>
            </div>
          </div>

          <Card>
            <CardHeader className="py-4">
              <div className="flex flex-col sm:flex-row sm:flex-wrap items-start sm:items-center gap-2 w-full">
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search suite, test title, reason…"
                  className="w-full sm:w-[240px]"
                />
                <Select value={dateFilter} onValueChange={setDateFilter}>
                  <SelectTrigger className="w-full sm:w-[160px]">
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
                {!propSuiteId && (
                  <Select value={suiteId} onValueChange={setSuiteId}>
                    <SelectTrigger className="w-full sm:w-[200px]">
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
                )}
                <Select
                  value={status}
                  onValueChange={(v) => setStatus(v as StatusFilter)}
                >
                  <SelectTrigger className="w-full sm:w-[140px]">
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
                <div className="flex items-center gap-4">
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
                      <Button variant="outline" size="sm" className="gap-2">
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
                        <TableHead>Suite</TableHead>
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
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-sm font-medium text-muted-foreground">
                                    {r.suite_name}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="font-medium">
                                  {r.test_title}
                                </div>
                                {r.automation_run_id && (
                                  <Badge
                                    variant="outline"
                                    className="mt-1 text-[10px] gap-1 border-blue-200 text-blue-600 dark:border-blue-800 dark:text-blue-400"
                                  >
                                    <Zap className="h-2.5 w-2.5" />
                                    automated
                                  </Badge>
                                )}
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
                                      ? `https://your-testrail.com/index.php?/defects/view/${encodeURIComponent(r.testrail_defect_id)}`
                                      : undefined
                                  }
                                />
                              </TableCell>
                              <TableCell>
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
                                <TableCell colSpan={8} className="bg-muted/30">
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
                  <div className="flex items-center gap-2 mt-2">
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
                    <span className="text-sm px-3">
                      Page {currentPage} of {Math.ceil(totalCount / pageSize)}
                    </span>
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

      {/* Evidence Dialog */}
      <Dialog open={openView} onOpenChange={setOpenView}>
        <DialogContent className="max-w-6xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between pr-8">
              <span>Test Execution Evidence</span>
              {activeExecution && statusBadge(activeExecution.execution_status)}
            </DialogTitle>
            <DialogDescription>
              {activeExecution?.test_title} · {activeExecution?.suite_name}
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

      {/* Image Preview */}
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

// ─── AttachmentCard ───────────────────────────────────────────────────────────

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
      } catch {
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
        toastError("Failed to download file");
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
