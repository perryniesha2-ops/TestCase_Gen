"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  Wrench,
  Ban,
  RefreshCw,
  ChevronRight,
} from "lucide-react";
import type {
  TriageRow,
  SuiteTriageResponse,
  TriageCategory,
} from "@/types/triage-types";

type Props = {
  suiteId: string;
  onOpenManageSuite?: () => void;
  onOpenTestCase?: (testCaseId: string) => void;
  onImproveTestCase?: (testCaseId: string) => void;
};

function categoryMeta(cat: TriageCategory) {
  switch (cat) {
    case "quick_win":
      return {
        title: "Quick wins",
        icon: TrendingUp,
        hint: "High value, low effort cases.",
      };
    case "high_value":
      return {
        title: "High value",
        icon: CheckCircle2,
        hint: "Worth doing automation for the impact.",
      };
    case "needs_prep":
      return {
        title: "Needs prep",
        icon: Wrench,
        hint: "Improve steps/assertions or reduce ambiguity first.",
      };
    case "not_recommended":
      return {
        title: "Not recommended",
        icon: Ban,
        hint: "Low readiness or not recommended for automation.",
      };
  }
}

function priorityBadge(p: TriageRow["priority"]) {
  const map: Record<TriageRow["priority"], string> = {
    low: "bg-muted text-muted-foreground",
    medium: "bg-blue-50 text-blue-700 border border-blue-200",
    high: "bg-orange-50 text-orange-700 border border-orange-200",
    critical: "bg-red-50 text-red-700 border border-red-200",
  };
  return map[p] ?? "bg-muted";
}

function scoreLabel(n: number) {
  if (n >= 8) return "High";
  if (n >= 5) return "Medium";
  return "Low";
}

function pct(n: number) {
  return Math.round(n * 100);
}

function clamp10(n: number) {
  if (Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(10, n));
}

function avg(nums: number[]) {
  if (!nums.length) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function toPctFrom10(n: number) {
  return Math.round(clamp10(n) * 10);
}

function band(n10: number) {
  const n = clamp10(n10);
  if (n >= 8) return { label: "High", hint: "Strong candidate" };
  if (n >= 5) return { label: "Medium", hint: "Some work needed" };
  return { label: "Low", hint: "Not ready yet" };
}

function computeSuiteScore(rows: TriageRow[]) {
  const total = rows.length;
  const eligibleRows = rows.filter((r) => r.eligible);
  const eligible = eligibleRows.length;

  const likelihood10 = avg(
    eligibleRows.map((r) => avg([clamp10(r.confidence), clamp10(r.value)]))
  );

  const readiness10 = avg(
    eligibleRows.map((r) =>
      avg([clamp10(r.confidence), clamp10(10 - r.effort)])
    )
  );

  const eligibilityPct = total ? Math.round((eligible / total) * 100) : 0;
  const scripted = eligibleRows.filter((r) => r.has_script).length;
  const scriptPct = eligible ? Math.round((scripted / eligible) * 100) : 0;

  return {
    total,
    eligible,
    scripted,
    eligibilityPct,
    scriptPct,
    likelihood10,
    readiness10,
    likelihoodBand: band(likelihood10),
    readinessBand: band(readiness10),
  };
}

function TriageScorecards({ rows }: { rows: TriageRow[] }) {
  const score = useMemo(() => computeSuiteScore(rows), [rows]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="rounded-lg border bg-background p-4">
        <div className="flex items-center justify-between">
          <div className="text-xs text-muted-foreground">
            Automation likelihood
          </div>
          <Badge variant="secondary" className="text-xs">
            {score.likelihoodBand.label}
          </Badge>
        </div>
        <div className="mt-2 text-2xl font-semibold">
          {toPctFrom10(score.likelihood10)}%
        </div>
        <div className="mt-2">
          <Progress value={toPctFrom10(score.likelihood10)} className="h-2" />
        </div>
        <div className="mt-2 text-xs text-muted-foreground"></div>
      </div>

      <div className="rounded-lg border bg-background p-4">
        <div className="flex items-center justify-between">
          <div className="text-xs text-muted-foreground">Readiness</div>
          <Badge variant="secondary" className="text-xs">
            {score.readinessBand.label}
          </Badge>
        </div>
        <div className="mt-2 text-2xl font-semibold">
          {toPctFrom10(score.readiness10)}%
        </div>
        <div className="mt-2">
          <Progress value={toPctFrom10(score.readiness10)} className="h-2" />
        </div>
      </div>

      <div className="rounded-lg border bg-background p-4">
        <div className="text-xs text-muted-foreground">Coverage</div>
        <div className="mt-2 text-2xl font-semibold">
          {score.eligible}/{score.total}
        </div>

        <div className="mt-2">
          <Progress value={score.eligibilityPct} className="h-2" />
        </div>
        <div className="mt-1 text-xs text-muted-foreground">
          Eligible For Automation({score.eligibilityPct}%)
          {score.eligible > 0 ? ` • Scripted ${score.scriptPct}%` : ""}
        </div>
      </div>
    </div>
  );
}

export function TriagePanel({
  suiteId,
  onOpenManageSuite,
  onOpenTestCase,
  onImproveTestCase,
}: Props) {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<TriageRow[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [debugText, setDebugText] = useState<string>("(debug not started)");

  const load = useCallback(async () => {
    setDebugText(`load() called • suiteId="${suiteId}"`);

    if (!suiteId) {
      setRows([]);
      setLoading(false);
      setDebugText("ABORT: missing suiteId prop");
      return;
    }

    setLoading(true);
    const url = `/api/suites/${suiteId}/triage`;
    setDebugText(`fetching ${url}`);

    try {
      const res = await fetch(url, { method: "GET", cache: "no-store" });

      let payload: SuiteTriageResponse | null = null;
      try {
        payload = (await res.json()) as SuiteTriageResponse;
      } catch (parseErr) {
        console.error("[triage] json parse error", parseErr);
      }

      if (!res.ok) {
        if (res.status === 401)
          toast.error("Please sign in to view triage data");
        else
          toast.error(
            `Failed to load triage data: ${res.status} ${res.statusText}`
          );

        if (payload && "error" in (payload as any)) {
          setDebugText(`error payload: ${(payload as any).error}`);
        }

        setRows([]);
        return;
      }

      const nextRows = payload?.rows ?? [];
      setRows(nextRows);
      setDebugText(`ok • rows=${nextRows.length}`);
    } catch (e) {
      console.error("[triage] fetch error", e);
      toast.error("Failed to load triage data");
      setRows([]);
      setDebugText(`catch: ${(e as Error)?.message ?? "unknown error"}`);
    } finally {
      setLoading(false);
    }
  }, [suiteId]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  }, [load]);

  useEffect(() => {
    void load();
  }, [load]);

  const buckets = useMemo(() => {
    const by: Record<TriageCategory, TriageRow[]> = {
      quick_win: [],
      high_value: [],
      needs_prep: [],
      not_recommended: [],
    };

    for (const r of rows) {
      const cat = r?.category;
      if (cat && cat in by) by[cat as TriageCategory].push(r);
      else by.needs_prep.push({ ...r, category: "needs_prep" } as TriageRow);
    }

    return by;
  }, [rows]);

  const headline = useMemo(() => {
    const total = rows.length;
    const eligible = rows.filter((r) => r.eligible).length;
    const quick = buckets.quick_win.length;
    const high = buckets.high_value.length;
    return { total, eligible, quick, high };
  }, [rows, buckets]);

  // NOTE: scorecards now render outside loading too.
  return (
    <div className="rounded-lg border bg-background">
      <div className="px-4 py-3 border-b flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <div className="text-sm font-medium">
              Triage & Automation Readiness
            </div>
            <Badge variant="outline" className="text-xs text-muted-foreground">
              {headline.eligible}/{headline.total} ready
            </Badge>
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            Identify high-impact cases and surface what needs improving.
          </div>
        </div>

        <Button
          variant="ghost"
          size="sm"
          className="gap-2"
          onClick={refresh}
          disabled={refreshing}
        >
          <RefreshCw
            className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
          />
          Refresh
        </Button>
      </div>

      <div className="px-4 py-4 space-y-5">
        {/* Scorecards always show (even if rows=[]) */}
        <TriageScorecards rows={rows} />

        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : rows.length === 0 ? (
          <div className="text-sm text-muted-foreground">
            No cases found in this suite yet. Add test cases first to see
            prioritization suggestions.
          </div>
        ) : (
          <>
            <Bucket
              category="quick_win"
              rows={buckets.quick_win}
              onOpenManageSuite={onOpenManageSuite}
              onOpenTestCase={onOpenTestCase}
              onImproveTestCase={onImproveTestCase}
            />
            <Separator />
            <Bucket
              category="high_value"
              rows={buckets.high_value}
              onOpenManageSuite={onOpenManageSuite}
              onOpenTestCase={onOpenTestCase}
              onImproveTestCase={onImproveTestCase}
            />
            <Separator />
            <Bucket
              category="needs_prep"
              rows={buckets.needs_prep}
              onOpenManageSuite={onOpenManageSuite}
              onOpenTestCase={onOpenTestCase}
              onImproveTestCase={onImproveTestCase}
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
  );
}

function Bucket({
  category,
  rows,
  onOpenManageSuite,
  onOpenTestCase,
  onImproveTestCase,
}: {
  category: TriageCategory;
  rows: TriageRow[];
  onOpenManageSuite?: () => void;
  onOpenTestCase?: (id: string) => void;
  onImproveTestCase?: (id: string) => void;
}) {
  const meta = categoryMeta(category);
  const Icon = meta.icon;

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
          <Button
            size="sm"
            variant="ghost"
            className="h-8 gap-1"
            onClick={onOpenManageSuite}
          >
            Manage suite
            <ChevronRight className="h-4 w-4" />
          </Button>
        )}
      </div>

      {rows.length === 0 ? (
        <div className="text-xs text-muted-foreground">
          Nothing in this bucket right now.
        </div>
      ) : (
        <div className="space-y-2">
          {rows.slice(0, 5).map((r) => (
            <TriageRowCard
              key={r.test_case_id}
              row={r}
              onOpenTestCase={onOpenTestCase}
              onImproveTestCase={onImproveTestCase}
            />
          ))}
          {rows.length > 5 && (
            <div className="text-xs text-muted-foreground">
              Showing 5 of {rows.length}. Use “Manage suite” to review the full
              list.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function TriageRowCard({
  row,
  onOpenTestCase,
  onImproveTestCase,
}: {
  row: TriageRow;
  onOpenTestCase?: (id: string) => void;
  onImproveTestCase?: (id: string) => void;
}) {
  const reasons = row.reasons?.slice(0, 2) ?? [];
  const hasMoreReasons = (row.reasons?.length ?? 0) > 2;

  const confidenceLabel = scoreLabel(row.confidence);
  const effortLabel = scoreLabel(10 - row.effort);
  const valueLabel = scoreLabel(row.value);

  const riskIcon =
    row.category === "needs_prep" ? (
      <AlertTriangle className="h-4 w-4 text-muted-foreground" />
    ) : row.category === "not_recommended" ? (
      <AlertTriangle className="h-4 w-4 text-destructive" />
    ) : (
      <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
    );

  return (
    <div className="rounded-lg border bg-background p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            {riskIcon}
            <div className="font-medium text-sm truncate">{row.title}</div>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Badge className={priorityBadge(row.priority)}>
              {row.priority}
            </Badge>
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
              <Badge
                variant="outline"
                className="text-xs text-muted-foreground"
              >
                Script: {row.script_status ?? "unknown"}
              </Badge>
            )}
          </div>

          {"health" in row && (row as any).health?.total_runs > 0 && (
            <div className="mt-3 space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">
                  Recent stability (pass rate, last{" "}
                  {Math.min((row as any).health.total_runs, 10)} runs)
                </span>
                <span className="font-medium">
                  {pct((row as any).health.pass_rate)}%
                </span>
              </div>
              <Progress
                value={(row as any).health.pass_rate * 100}
                className="h-2"
              />
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

        <div className="flex gap-2 shrink-0">
          {onOpenTestCase && (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => onOpenTestCase(row.test_case_id)}
            >
              View Case
            </Button>
          )}

          {onImproveTestCase && row.category !== "not_recommended" && (
            <Button
              size="sm"
              variant="default"
              onClick={() => onImproveTestCase(row.test_case_id)}
            >
              Improve Case
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
