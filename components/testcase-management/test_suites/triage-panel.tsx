"use client"

import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import {
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  Wrench,
  Ban,
  RefreshCw,
  ChevronRight,
} from "lucide-react"
import type { TriageRow, SuiteTriageResponse, TriageCategory } from "@/types/triage-types"

type Props = {
  suiteId: string
  // optional: let parent open a “Manage Suite” dialog on a specific case
  onOpenManageSuite?: () => void
  // optional: navigate/open a test case editor
  onOpenTestCase?: (testCaseId: string) => void
}

type BucketKey = "quick_wins" | "strategic" | "maintenance" | "not_ready"


function categoryMeta(cat: TriageCategory) {
  switch (cat) {
    case "quick_win":
      return { title: "Quick wins", icon: TrendingUp, hint: "High value, low effort candidates to start with." }
    case "high_value":
      return { title: "High value", icon: CheckCircle2, hint: "Worth doing soon; may take a bit more effort." }
    case "needs_prep":
      return { title: "Needs prep", icon: Wrench, hint: "Improve steps/assertions or reduce ambiguity first." }
    case "not_recommended":
      return { title: "Not recommended", icon: Ban, hint: "Low readiness or high risk right now." }
  }
}

function priorityBadge(p: TriageRow["priority"]) {
  const map: Record<TriageRow["priority"], string> = {
    low: "bg-muted text-muted-foreground",
    medium: "bg-blue-50 text-blue-700 border border-blue-200",
    high: "bg-orange-50 text-orange-700 border border-orange-200",
    critical: "bg-red-50 text-red-700 border border-red-200",
  }
  return map[p] ?? "bg-muted"
}

function scoreLabel(n: number) {
  if (n >= 8) return "High"
  if (n >= 5) return "Medium"
  return "Low"
}

function pct(n: number) {
  return Math.round(n * 100)
}

export function TriagePanel({ suiteId, onOpenManageSuite, onOpenTestCase }: Props) {
  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState<TriageRow[]>([])
  const [refreshing, setRefreshing] = useState(false)

  async function load() {
    if (!suiteId) {
    setRows([])
    setLoading(false)
    return
  }

    setLoading(true)
    try {
      const res = await fetch(`/api/suites/${suiteId}/triage`, { method: "GET" })
      if (!res.ok) {
        const msg = await res.text().catch(() => "")
        throw new Error(msg || `Failed to load triage (${res.status})`)
      }
      const data = (await res.json()) as SuiteTriageResponse
      setRows(data.rows ?? [])
    } catch (e) {
      console.error(e)
      toast.error("Failed to load triage suggestions")
      setRows([])
    } finally {
      setLoading(false)
    }
  }

  async function refresh() {
    setRefreshing(true)
    try {
      await load()
      toast.success("Triage refreshed")
    } finally {
      setRefreshing(false)
    }
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [suiteId])

  const buckets = useMemo(() => {
  const by: Record<TriageCategory, TriageRow[]> = {
    quick_win: [],
    high_value: [],
    needs_prep: [],
    not_recommended: [],
  }

  for (const r of rows) {
    const cat = r?.category

    if (cat && cat in by) {
      by[cat as TriageCategory].push(r)
    } else {
          by.needs_prep.push({ ...r, category: "needs_prep" } as TriageRow)
    }
  }

  return by
}, [rows])


  const headline = useMemo(() => {
    const total = rows.length
    const eligible = rows.filter((r) => r.eligible).length
    const quick = buckets.quick_win.length
    const high = buckets.high_value.length

    return {
      total,
      eligible,
      quick,
      high,
    }
  }, [rows, buckets])

  if (loading) {
    return (
      <div className="rounded-lg border bg-background">
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <div className="space-y-1">
            <div className="text-sm font-medium">Triage & selection</div>
            <div className="text-xs text-muted-foreground">Prioritize what to tackle first.</div>
          </div>
          <Skeleton className="h-9 w-[120px]" />
        </div>
        <div className="px-4 py-4 space-y-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-lg border bg-background">
      <div className="px-4 py-3 border-b flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <div className="text-sm font-medium">Triage & selection</div>
            <Badge variant="outline" className="text-xs text-muted-foreground">
              {headline.eligible}/{headline.total} ready
            </Badge>
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            Identify high-impact cases and surface what needs tightening before you invest time.
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
            <span className="inline-flex items-center gap-1">
              <TrendingUp className="h-3.5 w-3.5 text-muted-foreground" />
              Quick wins: <span className="font-medium">{headline.quick}</span>
            </span>
            <span className="text-muted-foreground">•</span>
            <span className="inline-flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5 text-muted-foreground" />
              High value: <span className="font-medium">{headline.high}</span>
            </span>
          </div>
        </div>

        <Button
          size="sm"
          variant="outline"
          className="h-9 gap-2"
          onClick={refresh}
          disabled={refreshing}
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <div className="px-4 py-4 space-y-5">
        {rows.length === 0 ? (
          <div className="text-sm text-muted-foreground">
            No cases found in this suite yet. Add test cases first to see prioritization suggestions.
          </div>
        ) : (
          <>
            <Bucket
              category="quick_win"
              rows={buckets.quick_win}
              onOpenManageSuite={onOpenManageSuite}
              onOpenTestCase={onOpenTestCase}
            />
            <Separator />
            <Bucket
              category="high_value"
              rows={buckets.high_value}
              onOpenManageSuite={onOpenManageSuite}
              onOpenTestCase={onOpenTestCase}
            />
            <Separator />
            <Bucket
              category="needs_prep"
              rows={buckets.needs_prep}
              onOpenManageSuite={onOpenManageSuite}
              onOpenTestCase={onOpenTestCase}
            />
            <Separator />
            <Bucket
              category="not_recommended"
              rows={buckets.not_recommended}
              onOpenManageSuite={onOpenManageSuite}
              onOpenTestCase={onOpenTestCase}
            />
          </>
        )}
      </div>
    </div>
  )
}

function Bucket({
  category,
  rows,
  onOpenManageSuite,
  onOpenTestCase,
}: {
  category: TriageCategory
  rows: TriageRow[]
  onOpenManageSuite?: () => void
  onOpenTestCase?: (id: string) => void
}) {
  const meta = categoryMeta(category)
  const Icon = meta.icon

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Icon className="h-4 w-4 text-muted-foreground" />
            <div className="text-sm font-medium">{meta.title}</div>
            <Badge variant="secondary" className="text-xs">
              {rows.length}
            </Badge>
          </div>
          <div className="text-xs text-muted-foreground mt-1">{meta.hint}</div>
        </div>

        {onOpenManageSuite && rows.length > 0 && (
          <Button size="sm" variant="ghost" className="h-8 gap-1" onClick={onOpenManageSuite}>
            Manage suite
            <ChevronRight className="h-4 w-4" />
          </Button>
        )}
      </div>

      {rows.length === 0 ? (
        <div className="text-xs text-muted-foreground">Nothing in this bucket right now.</div>
      ) : (
        <div className="space-y-2">
          {rows.slice(0, 5).map((r) => (
            <TriageRowCard key={r.test_case_id} row={r} onOpenTestCase={onOpenTestCase} />
          ))}
          {rows.length > 5 && (
            <div className="text-xs text-muted-foreground">
              Showing 5 of {rows.length}. Use “Manage suite” to review the full list.
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function TriageRowCard({
  row,
  onOpenTestCase,
}: {
  row: TriageRow
  onOpenTestCase?: (id: string) => void
}) {
  const reasons = row.reasons?.slice(0, 2) ?? []
  const hasMoreReasons = (row.reasons?.length ?? 0) > 2

  const confidenceLabel = scoreLabel(row.confidence)
  const effortLabel = scoreLabel(10 - row.effort) // invert for “goodness” label
  const valueLabel = scoreLabel(row.value)

  const riskIcon =
    row.category === "needs_prep" ? (
      <AlertTriangle className="h-4 w-4 text-muted-foreground" />
    ) : row.category === "not_recommended" ? (
      <AlertTriangle className="h-4 w-4 text-destructive" />
    ) : (
      <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
    )

  return (
    <div className="rounded-lg border bg-background p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            {riskIcon}
            <div className="font-medium text-sm truncate">{row.title}</div>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Badge className={priorityBadge(row.priority)}>{row.priority}</Badge>
            <Badge variant="outline" className="text-xs text-muted-foreground">
              {row.test_type}
            </Badge>

            <Badge variant="secondary" className="text-xs">
              Value: {valueLabel}
            </Badge>
            <Badge variant="secondary" className="text-xs">
              Effort: {effortLabel}
            </Badge>
            <Badge variant="secondary" className="text-xs">
              Confidence: {confidenceLabel}
            </Badge>

            {row.has_script && (
              <Badge variant="outline" className="text-xs text-muted-foreground">
                Script: {row.script_status ?? "unknown"}
              </Badge>
            )}
          </div>

          {/* If script health exists, show pass rate quickly */}
          {row.health && row.health.total_runs > 0 && (
            <div className="mt-3 space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">
                  Recent stability (pass rate, last {Math.min(row.health.total_runs, 10)} runs)
                </span>
                <span className="font-medium">{pct(row.health.pass_rate)}%</span>
              </div>
              <Progress value={row.health.pass_rate * 100} className="h-2" />
            </div>
          )}

          {reasons.length > 0 && (
            <div className="mt-3 text-xs text-muted-foreground space-y-1">
              {reasons.map((t, i) => (
                <div key={i} className="line-clamp-2">
                  • {t}
                </div>
              ))}
              {hasMoreReasons && <div>• …</div>}
            </div>
          )}
        </div>

        {onOpenTestCase && (
          <Button
            size="sm"
            variant="ghost"
            className="h-8 shrink-0"
            onClick={() => onOpenTestCase(row.test_case_id)}
          >
            View
          </Button>
        )}
      </div>
    </div>
  )
}
