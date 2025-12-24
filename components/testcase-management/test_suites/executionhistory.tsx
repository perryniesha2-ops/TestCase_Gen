"use client"

import React, { useEffect, useMemo, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
  BarChart3, AlertTriangle, MinusCircle,
} from "lucide-react"
import { toast } from "sonner"

type ExecutionStatus = "not_run" | "in_progress" | "passed" | "failed" | "skipped" | "blocked"
type AllowedStatus = "passed" | "failed" | "skipped" | "blocked"
type StatusFilter = "all" | AllowedStatus

type ExecutionHistoryRow = {
  execution_id: string
  suite_id: string
  suite_name: string
  session_id: string | null
  test_case_id: string
  test_title: string
  test_description: string | null
  execution_status: AllowedStatus
  execution_notes: string | null
  failure_reason: string | null
  created_at: string
  started_at: string | null
  completed_at: string | null
  duration_ms: number | null
  evidence_count: number
}

type SupabaseExecutionRow = {
  id: string
  suite_id: string
  session_id: string | null
  test_case_id: string
  execution_status: ExecutionStatus
  execution_notes: string | null
  failure_reason: string | null
  created_at: string
  started_at: string | null
  completed_at: string | null
  test_suites: { id: string; name: string } | null
  test_cases: { id: string; title: string; description: string | null } | null
}

type AttachmentRow = {
  id: string
  execution_id: string
  file_path: string
  file_name: string
  file_type: string | null
  file_size: number | null
  created_at: string
  step_number: number | null
  description: string | null
}

function useDebouncedValue<T>(value: T, delayMs = 300) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const id = window.setTimeout(() => setDebounced(value), delayMs)
    return () => window.clearTimeout(id)
  }, [value, delayMs])
  return debounced
}

export function ExecutionHistory() {
  const supabase = useMemo(() => createClient(), [])

  const [rows, setRows] = useState<ExecutionHistoryRow[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())

  const [status, setStatus] = useState<StatusFilter>("all")
  const [hasEvidence, setHasEvidence] = useState(false)
  const [search, setSearch] = useState("")
  const debouncedSearch = useDebouncedValue(search, 300)
  const [suiteId, setSuiteId] = useState<string>("all")
  const [dateFilter, setDateFilter] = useState<string>("all") // all, today, week, month, year

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState<number>(20)
  const [totalCount, setTotalCount] = useState(0)

  const [availableSuites, setAvailableSuites] = useState<Array<{ id: string; name: string }>>([])

  // View dialog
  const [openView, setOpenView] = useState(false)
  const [activeExecution, setActiveExecution] = useState<ExecutionHistoryRow | null>(null)
  const [evidenceLoading, setEvidenceLoading] = useState(false)
  const [evidence, setEvidence] = useState<AttachmentRow[]>([])
  const [previewImage, setPreviewImage] = useState<string | null>(null)
  const INCLUDED_STATUSES: AllowedStatus[] = ["passed", "failed", "blocked", "skipped"]


  useEffect(() => {
    void fetchSuites()
  }, [])

  useEffect(() => {
    void fetchHistory()
  }, [status, hasEvidence, debouncedSearch, suiteId, dateFilter, currentPage, pageSize])

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [status, hasEvidence, debouncedSearch, suiteId, dateFilter, pageSize])

  async function fetchSuites() {
    try {
      const { data: auth } = await supabase.auth.getUser()
      if (!auth.user) return

      const { data, error } = await supabase
        .from("test_suites")
        .select("id, name")
        .eq("user_id", auth.user.id)
        .order("name")

      if (error) throw error
      setAvailableSuites(data ?? [])
    } catch (err) {
      console.error(err)
      setAvailableSuites([])
    }
  }

  async function fetchHistory() {
    setLoading(true)
    try {
      const { data: auth } = await supabase.auth.getUser()
      if (!auth.user) {
        setRows([])
        return
      }

      // Calculate date range
      let startDate: string | null = null
      const now = new Date()
      
      if (dateFilter === "today") {
        startDate = new Date(now.setHours(0, 0, 0, 0)).toISOString()
      } else if (dateFilter === "week") {
        const weekAgo = new Date(now)
        weekAgo.setDate(weekAgo.getDate() - 7)
        startDate = weekAgo.toISOString()
      } else if (dateFilter === "month") {
        const monthAgo = new Date(now)
        monthAgo.setMonth(monthAgo.getMonth() - 1)
        startDate = monthAgo.toISOString()
      } else if (dateFilter === "year") {
        const yearAgo = new Date(now)
        yearAgo.setFullYear(yearAgo.getFullYear() - 1)
        startDate = yearAgo.toISOString()
      }

      // Build base query
      let countQuery = supabase
        .from("test_executions")
        .select("id", { count: "exact", head: true })
        .eq("executed_by", auth.user.id)
        .in("execution_status", INCLUDED_STATUSES)

      let dataQuery = supabase
        .from("test_executions")
        .select(
          `
          id,
          suite_id,
          session_id,
          test_case_id,
          execution_status,
          execution_notes,
          failure_reason,
          created_at,
          started_at,
          completed_at,
          test_suites:suite_id ( id, name ),
          test_cases:test_case_id ( id, title, description )
        `
        )
        .eq("executed_by", auth.user.id)
        .in("execution_status", INCLUDED_STATUSES)
        .order("created_at", { ascending: false })

      // Apply filters to both queries
      if (suiteId !== "all") {
        countQuery = countQuery.eq("suite_id", suiteId)
        dataQuery = dataQuery.eq("suite_id", suiteId)
      }
      if (status !== "all") {
        countQuery = countQuery.eq("execution_status", status)
        dataQuery = dataQuery.eq("execution_status", status)
      }
      if (startDate) {
        countQuery = countQuery.gte("created_at", startDate)
        dataQuery = dataQuery.gte("created_at", startDate)
      }

      // Get total count first
      const { count, error: countError } = await countQuery
      if (countError) throw countError
      setTotalCount(count ?? 0)

      // Apply pagination to data query
      const from = (currentPage - 1) * pageSize
      const to = from + pageSize - 1
      dataQuery = dataQuery.range(from, to)

      const { data: execsRaw, error } = await dataQuery
      if (error) throw error

      const execs = (execsRaw ?? []) as unknown as SupabaseExecutionRow[]

      // Calculate duration
      const base: ExecutionHistoryRow[] = execs.map((e) => {
        let duration = null
        if (e.started_at && e.completed_at) {
          const start = new Date(e.started_at).getTime()
          const end = new Date(e.completed_at).getTime()
          duration = end - start
        }

        return {
          execution_id: e.id,
          suite_id: e.suite_id,
          suite_name: e.test_suites?.name ?? "Unknown Suite",
          session_id: e.session_id ?? null,
          test_case_id: e.test_case_id,
          test_title: e.test_cases?.title ?? "Unknown Test",
          test_description: e.test_cases?.description ?? null,
          execution_status: (e.execution_status as AllowedStatus) ?? "passed",
          execution_notes: e.execution_notes ?? null,
          failure_reason: e.failure_reason ?? null,
          created_at: e.created_at,
          started_at: e.started_at ?? null,
          completed_at: e.completed_at ?? null,
          duration_ms: duration,
          evidence_count: 0,
        }
      })

      // Client-side search
      const s = debouncedSearch.trim().toLowerCase()
      const searched = s
        ? base.filter((r) => {
            return (
              r.test_title.toLowerCase().includes(s) ||
              r.suite_name.toLowerCase().includes(s) ||
              (r.failure_reason ?? "").toLowerCase().includes(s) ||
              (r.test_description ?? "").toLowerCase().includes(s)
            )
          })
        : base

      const execIds = searched.map((r) => r.execution_id)
      if (execIds.length === 0) {
        setRows([])
        return
      }

      // Evidence counts
      const { data: attsRaw, error: attErr } = await supabase
        .from("test_attachments")
        .select("execution_id")
        .in("execution_id", execIds)

      if (attErr) throw attErr

      const counts = new Map<string, number>()
      for (const a of (attsRaw ?? []) as Array<{ execution_id: string }>) {
        counts.set(a.execution_id, (counts.get(a.execution_id) ?? 0) + 1)
      }

      const withCounts = searched.map((r) => ({
        ...r,
        evidence_count: counts.get(r.execution_id) ?? 0,
      }))

      setRows(hasEvidence ? withCounts.filter((r) => r.evidence_count > 0) : withCounts)
    } catch (err) {
      console.error(err)
      toast.error("Failed to load execution history")
      setRows([])
    } finally {
      setLoading(false)
    }
  }

  async function openExecution(execution: ExecutionHistoryRow) {
    setActiveExecution(execution)
    setOpenView(true)
    setEvidence([])
    setEvidenceLoading(true)

    try {
      const { data, error } = await supabase
        .from("test_attachments")
        .select("id, execution_id, file_name, file_path, file_type, file_size, created_at, step_number, description")
        .eq("execution_id", execution.execution_id)
        .order("step_number", { ascending: true, nullsFirst: false })
        .order("created_at", { ascending: true })

      if (error) throw error
      setEvidence((data ?? []) as AttachmentRow[])
    } catch (err) {
      console.error(err)
      toast.error("Failed to load evidence")
      setEvidence([])
    } finally {
      setEvidenceLoading(false)
    }
  }

  function toggleRowExpansion(executionId: string) {
    setExpandedRows((prev) => {
      const next = new Set(prev)
      if (next.has(executionId)) {
        next.delete(executionId)
      } else {
        next.add(executionId)
      }
      return next
    })
  }

  function formatDuration(ms: number | null) {
    if (!ms) return "-"
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`
    }
    return `${seconds}s`
  }

  function getFileUrl(filePath: string): Promise<string> {
    return createSignedUrl(filePath, 60 * 60) // 1 hour expiry
  }

  async function createSignedUrl(filePath: string, expiresInSeconds: number): Promise<string> {
    try {
      const { data, error } = await supabase.storage
        .from("test-attachments")
        .createSignedUrl(filePath, expiresInSeconds)
      
      if (error) throw error
      return data.signedUrl
    } catch (err) {
      console.error("Error creating signed URL:", err)
      return ""
    }
  }

  async function downloadEvidence() {
    if (evidence.length === 0) return
    
    toast.info("Downloading evidence files...")
    
    for (const att of evidence) {
      try {
        const url = await getFileUrl(att.file_path)
        if (!url) continue
        
        const a = document.createElement("a")
        a.href = url
        a.download = att.file_name
        a.click()
      } catch (err) {
        console.error("Download error:", err)
      }
    }
  }

  function exportToCSV() {
    if (rows.length === 0) {
      toast.error("No data to export")
      return
    }

    // CSV headers
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
    ]

    // CSV rows
    const csvRows = rows.map((r) => {
      const date = new Date(r.created_at)
      const durationSeconds = r.duration_ms ? Math.floor(r.duration_ms / 1000) : 0

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
      ]
    })

    // Escape and quote CSV fields
    const escapeCsvField = (field: string | number) => {
      const str = String(field)
      if (str.includes(",") || str.includes('"') || str.includes("\n")) {
        return `"${str.replace(/"/g, '""')}"`
      }
      return str
    }

    // Build CSV content
    const csv = [
      headers.join(","),
      ...csvRows.map((row) => row.map(escapeCsvField).join(",")),
    ].join("\n")

    // Download
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    
    // Generate filename with date range
    const filename = `execution-history-${dateFilter}-${new Date().toISOString().split("T")[0]}.csv`
    link.download = filename
    
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    toast.success(`Exported ${rows.length} executions to CSV`)
  }

  function exportTrendReport() {
    if (rows.length === 0) {
      toast.error("No data to export")
      return
    }

    // Group by date
const byDate = new Map<string, { passed: number; failed: number; blocked: number; skipped: number; total: number }>()
    
    rows.forEach((r) => {
      const date = new Date(r.created_at).toLocaleDateString()
      const existing = byDate.get(date) || { passed: 0, failed: 0, blocked:0, skipped: 0,total: 0 }
      
      existing.total++
if (r.execution_status === "passed") existing.passed++
if (r.execution_status === "failed") existing.failed++
if (r.execution_status === "blocked") existing.blocked++
if (r.execution_status === "skipped") existing.skipped++

      
      byDate.set(date, existing)
    })

    // Build trend CSV
    const headers = ["Date", "Total Tests", "Passed", "Failed", "Pass Rate %"]
    const trendRows = Array.from(byDate.entries())
      .sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime())
      .map(([date, stats]) => {
        const passRate = Math.round((stats.passed / stats.total) * 100)
        return [date, stats.total, stats.passed, stats.failed, passRate]
      })

    const csv = [
      headers.join(","),
      ...trendRows.map((row) => row.join(",")),
    ].join("\n")

    // Download
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `test-trends-${dateFilter}-${new Date().toISOString().split("T")[0]}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    toast.success("Exported trend report")
  }

  function statusBadge(s: AllowedStatus) {
  switch (s) {
    case "passed":
      return (
        <Badge className="bg-green-600 gap-1">
          <CheckCircle2 className="h-3 w-3" />
          Passed
        </Badge>
      )

    case "failed":
      return (
        <Badge variant="destructive" className="gap-1">
          <XCircle className="h-3 w-3" />
          Failed
        </Badge>
      )

    case "blocked":
      return (
        <Badge className="bg-orange-600 gap-1">
          <AlertTriangle className="h-3 w-3" />
          Blocked
        </Badge>
      )

    case "skipped":
      return (
        <Badge className="bg-slate-600 gap-1">
          <MinusCircle className="h-3 w-3" />
          Skipped
        </Badge>
      )
  }
}


  // Stats for dashboard
  const stats = useMemo(() => {
    const total = rows.length
    const passed = rows.filter((r) => r.execution_status === "passed").length
    const failed = rows.filter((r) => r.execution_status === "failed").length
    const withEvidence = rows.filter((r) => r.evidence_count > 0).length
    
    return { total, passed, failed, withEvidence }
  }, [rows])

  return (
  <div className="space-y-4 text-sm">
      {/* Stats Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">Total Executions</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">{stats.passed}</div>
            <p className="text-xs text-muted-foreground">Passed</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-red-600">{stats.failed}</div>
            <p className="text-xs text-muted-foreground">Failed</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{stats.withEvidence}</div>
            <p className="text-xs text-muted-foreground">With Evidence</p>
          </CardContent>
        </Card>
      </div>

      {/* Main History Table */}
      <Card>
  <CardHeader className="flex flex-row items-center justify-between gap-3 py-4">
          <CardTitle>Execution History</CardTitle>

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

            <Select value={status} onValueChange={(v) => setStatus(v as StatusFilter)}>
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
              <Checkbox checked={hasEvidence} onCheckedChange={(v) => setHasEvidence(Boolean(v))} />
              <span className="text-sm text-muted-foreground">Has evidence</span>
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
              <span className="ml-3 text-muted-foreground">Loading history…</span>
            </div>
          ) : rows.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              No executions match your filters.
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[40px]"></TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Suite</TableHead>
                    <TableHead className="max-w-[360px] w-[360px]">Test Case</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Evidence</TableHead>
                    <TableHead className="w-[90px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => {
                    const isExpanded = expandedRows.has(r.execution_id)
                    
                    return (
                      <React.Fragment key={r.execution_id}>
                        <TableRow>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={() => toggleRowExpansion(r.execution_id)}
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
                          <TableCell className="font-medium">{r.suite_name}</TableCell>
                          <TableCell>
                            <div className="font-medium">{r.test_title}</div>
                              
                          </TableCell>
                          <TableCell>{statusBadge(r.execution_status)}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2 text-sm">
                              <Clock className="h-4 w-4 text-muted-foreground" />
                              {formatDuration(r.duration_ms)}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <ImageIcon className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm font-medium">{r.evidence_count}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-1"
                              onClick={() => openExecution(r)}
                            >
                              <Eye className="h-4 w-4" />
                              View
                            </Button>
                          </TableCell>
                        </TableRow>
                        
                        {/* Expanded Details Row */}
                        {isExpanded && (
                          <TableRow>
                            <TableCell colSpan={8} className="bg-muted/30">
                              <div className="p-4 space-y-3">
                                {r.execution_notes && (
                                  <div>
                                    <div className="text-sm font-medium mb-1">Execution Notes:</div>
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
                                
                                <div className="flex gap-4 text-xs text-muted-foreground">
                                  <div>
                                    <span className="font-medium">Started:</span>{" "}
                                    {r.started_at ? new Date(r.started_at).toLocaleString() : "-"}
                                  </div>
                                  <div>
                                    <span className="font-medium">Completed:</span>{" "}
                                    {r.completed_at ? new Date(r.completed_at).toLocaleString() : "-"}
                                  </div>
                                </div>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </React.Fragment>
                    )
                  })}
                </TableBody>
              </Table>

              {/* Pagination Controls */}
              <div className="flex items-center justify-between mt-4 pt-4 border-t">
                <div className="flex items-center gap-4">
                  <div className="text-sm text-muted-foreground">
                    Showing {Math.min((currentPage - 1) * pageSize + 1, totalCount)} to{" "}
                    {Math.min(currentPage * pageSize, totalCount)} of {totalCount} results
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
                    onClick={() => setCurrentPage(Math.ceil(totalCount / pageSize))}
                    disabled={currentPage >= Math.ceil(totalCount / pageSize)}
                  >
                    Last
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

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

          <Tabs defaultValue="screenshots" className="flex-1 flex flex-col overflow-hidden">
            <TabsList>
              <TabsTrigger value="screenshots">
                Screenshots ({evidence.length})
              </TabsTrigger>
              <TabsTrigger value="details">
                Details
              </TabsTrigger>
            </TabsList>

            <TabsContent value="screenshots" className="flex-1 overflow-auto mt-4">
              {evidenceLoading ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="h-6 w-6 animate-spin" />
                  <span className="ml-3 text-muted-foreground">Loading evidence…</span>
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
                      <CardTitle className="text-base">Execution Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <span className="text-muted-foreground">Status:</span>
                          <div className="mt-1">{statusBadge(activeExecution.execution_status)}</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Duration:</span>
                          <div className="font-medium mt-1">
                            {formatDuration(activeExecution.duration_ms)}
                          </div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Started:</span>
                          <div className="font-medium mt-1">
                            {activeExecution.started_at 
                              ? new Date(activeExecution.started_at).toLocaleString()
                              : "-"}
                          </div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Completed:</span>
                          <div className="font-medium mt-1">
                            {activeExecution.completed_at
                              ? new Date(activeExecution.completed_at).toLocaleString()
                              : "-"}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {activeExecution.execution_notes && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Execution Notes</CardTitle>
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
        <Dialog open={!!previewImage} onOpenChange={() => setPreviewImage(null)}>
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
  )
}

// Separate component to handle signed URL loading for each attachment
function AttachmentCardWithSignedUrl({
  attachment,
  onPreview,
  getSignedUrl,
}: {
  attachment: AttachmentRow
  onPreview: (url: string) => void
  getSignedUrl: (path: string, expires: number) => Promise<string>
}) {
  const [imageUrl, setImageUrl] = useState<string>("")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function loadUrl() {
      try {
        setLoading(true)
        const url = await getSignedUrl(attachment.file_path, 60 * 60) // 1 hour
        if (!cancelled) {
          setImageUrl(url)
        }
      } catch (err) {
        console.error("Error loading image:", err)
        if (!cancelled) {
          setImageUrl("")
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    loadUrl()

    return () => {
      cancelled = true
    }
  }, [attachment.file_path, getSignedUrl])

  const isImage = attachment.file_type?.startsWith("image/")

  async function handleDownload(e: React.MouseEvent) {
    e.stopPropagation()
    
    // Refresh URL before download to avoid expiry
    const freshUrl = await getSignedUrl(attachment.file_path, 60 * 60)
    if (!freshUrl) {
      toast.error("Failed to download file")
      return
    }

    const a = document.createElement("a")
    a.href = freshUrl
    a.download = attachment.file_name
    a.click()
  }

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
        
        {attachment.step_number && (
          <Badge className="absolute top-2 left-2 text-xs">
            Step {attachment.step_number}
          </Badge>
        )}
      </div>
      
      <CardContent className="p-3">
        <p className="text-sm font-medium line-clamp-1">{attachment.file_name}</p>
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
  )
}