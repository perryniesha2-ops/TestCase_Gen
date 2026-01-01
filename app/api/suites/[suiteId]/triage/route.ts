// app/api/suites/[suiteId]/triage/route.ts
import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"

import { createClient } from "@/lib/supabase/server"

export const runtime = "nodejs"

type Priority = "low" | "medium" | "high" | "critical"
type TriageCategory = "quick_win" | "high_value" | "needs_prep" | "not_recommended"

type FixSuggestion = {
  code:
    | "ADD_PRECONDITIONS"
    | "ADD_URL"
    | "ADD_TEST_DATA"
    | "MAKE_ASSERTION_EXPLICIT"
    | "SPLIT_STEPS"
  title: string
  detail: string
}

type TriageRow = {
  test_case_id: string
  title: string
  test_type: string
  priority: Priority

  eligible: boolean
  category: TriageCategory

  value: number
  effort: number
  confidence: number

  reasons: string[]
  fix_suggestions: FixSuggestion[]

  has_script?: boolean
  script_status?: string | null
}

type SuiteTriageResponse = {
  success: true
  suiteId: string
  rows: TriageRow[]
}

type Step = { action: string; expected: string }
type TestCaseShape = {
  id: string
  title: string
  priority: string | null
  test_type: string | null
  test_steps: Step[] | null
  expected_result: string | null
  preconditions: string | null
  automation_status?: string | null
}


function extractSuiteIdFromUrl(req: Request): string | null {
  try {
    const { pathname } = new URL(req.url)
    // /api/suites/<suiteId>/triage
    const parts = pathname.split("/").filter(Boolean)
    const suitesIdx = parts.indexOf("suites")
    const suiteId = suitesIdx >= 0 ? parts[suitesIdx + 1] : null
    return suiteId && suiteId.length > 0 ? suiteId : null
  } catch {
    return null
  }
}

// -----------------------------
// Scoring / triage helpers
// -----------------------------
function toPriority(p: unknown): Priority {
  const s = (typeof p === "string" ? p : "").toLowerCase().trim()
  if (s === "critical" || s === "high" || s === "medium" || s === "low") return s
  return "medium"
}

function clamp0to10(n: number) {
  if (Number.isNaN(n)) return 0
  return Math.max(0, Math.min(10, Math.round(n)))
}

function isVague(text: string) {
  return /\b(verify|check|ensure|validate|confirm)\b/i.test(text)
}

function hasUrlHint(action: string) {
  return /https?:\/\/|\/[a-zA-Z0-9]/.test(action)
}

function hasConcreteData(action: string) {
  return /@|\.com|\$|USD|\b\d{2,}\b/.test(action)
}

function deriveFixSuggestions(tc: {
  preconditions?: string | null
  test_steps?: Step[] | null
  expected_result?: string | null
}): FixSuggestion[] {
  const suggestions: FixSuggestion[] = []
  const steps = tc.test_steps ?? []

  const hasUrl = steps.some((s) => hasUrlHint(s.action ?? ""))
  const hasData = steps.some((s) => hasConcreteData(s.action ?? ""))

  if (!tc.preconditions || tc.preconditions.trim().length < 10) {
    suggestions.push({
      code: "ADD_PRECONDITIONS",
      title: "Add preconditions",
      detail: "Specify login state, required data, and environment setup.",
    })
  }

  if (!hasUrl) {
    suggestions.push({
      code: "ADD_URL",
      title: "Add navigation context",
      detail: "Include the exact page/URL or route for the first navigation step.",
    })
  }

  if (!hasData) {
    suggestions.push({
      code: "ADD_TEST_DATA",
      title: "Use concrete test data",
      detail: "Replace placeholders with real values (emails, names, numbers, boundary values).",
    })
  }

  const hasVagueExpected =
    steps.some((s) => (s.expected ?? "").length < 40 && isVague(s.expected ?? "")) ||
    isVague(tc.expected_result ?? "")

  if (hasVagueExpected) {
    suggestions.push({
      code: "MAKE_ASSERTION_EXPLICIT",
      title: "Make assertions explicit",
      detail: "Expected results should mention exact UI text, URL, state, or data changes.",
    })
  }

  const hasCompoundSteps = steps.some((s) => (s.action ?? "").includes(" and "))
  if (hasCompoundSteps) {
    suggestions.push({
      code: "SPLIT_STEPS",
      title: "Split compound steps",
      detail: "Each step should map to one action and one verification.",
    })
  }

  return suggestions.slice(0, 3)
}

function scoreValue(tc: TestCaseShape): number {
  const p = toPriority(tc.priority)
  const base =
    p === "critical" ? 10 :
    p === "high" ? 8 :
    p === "medium" ? 5 : 3

  const tt = (tc.test_type ?? "").toLowerCase()
  const bump = tt.includes("e2e") || tt.includes("regression") || tt.includes("smoke") ? 1 : 0
  return clamp0to10(base + bump)
}

function scoreEffort(tc: TestCaseShape): number {
  const steps = tc.test_steps ?? []
  const stepCount = steps.length

  const vagueCount = steps.filter((s) => isVague(s.expected ?? "") || isVague(s.action ?? "")).length
  const compound = steps.filter((s) => (s.action ?? "").includes(" and ")).length

  const raw =
    2 +
    Math.min(6, stepCount * 0.6) +
    Math.min(2, vagueCount * 0.5) +
    Math.min(2, compound * 0.5)

  return clamp0to10(raw)
}

function scoreConfidence(tc: TestCaseShape): number {
  const steps = tc.test_steps ?? []
  if (steps.length === 0) return 0

  const incomplete = steps.filter((s) => !(s.action ?? "").trim() || !(s.expected ?? "").trim()).length
  const vague = steps.filter((s) => isVague(s.expected ?? "")).length

  const hasExpectedResult = Boolean(tc.expected_result && tc.expected_result.trim().length > 0)
  const hasPreconditions = Boolean(tc.preconditions && tc.preconditions.trim().length > 0)

  let raw = 9
  raw -= incomplete * 2
  raw -= Math.min(3, vague * 0.5)
  if (!hasExpectedResult) raw -= 2
  if (!hasPreconditions) raw -= 1

  return clamp0to10(raw)
}

function pickCategory(value: number, effort: number, confidence: number, eligible: boolean): TriageCategory {
  if (!eligible) return "needs_prep"
  if (confidence <= 3) return "needs_prep"
  if (value >= 7 && effort <= 4) return "quick_win"
  if (value >= 7) return "high_value"
  if (value <= 4 && effort >= 7) return "not_recommended"
  return "needs_prep"
}

function buildReasons(tc: TestCaseShape, value: number, effort: number, confidence: number): string[] {
  const reasons: string[] = []
  const steps = tc.test_steps ?? []

  if (toPriority(tc.priority) === "critical") reasons.push("High priority.")
  if (steps.length === 0) reasons.push("No test steps found.")
  if (steps.some((s) => !(s.action ?? "").trim() || !(s.expected ?? "").trim())) reasons.push("Some steps are incomplete.")
  if (steps.some((s) => isVague(s.expected ?? ""))) reasons.push("Expected results are vague; tighten assertions.")
  if (!tc.preconditions) reasons.push("Preconditions are missing or too brief.")
  if (!tc.expected_result) reasons.push("Overall expected result is missing.")
  if (value >= 7 && effort <= 4) reasons.push("High value with relatively low effort.")
  if (confidence >= 8) reasons.push("Strong detail quality; good candidate for automation conversion.")

  return reasons.slice(0, 3)
}

// -----------------------------
// Handler (canonical signature)
// -----------------------------
export async function GET(req: Request, { params }: { params: { suiteId: string } }) {
  try {
    // Canonical params, plus optional fallback
    const suiteId = params?.suiteId ?? extractSuiteIdFromUrl(req)

    if (!suiteId) {
      return NextResponse.json(
        { error: "Missing suiteId", debug: { url: req.url, params: params ?? null } },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data, error } = await supabase
      .from("test_suite_cases")
      .select(
        `
        test_case_id,
        sequence_order,
        test_cases (
          id,
          title,
          priority,
          test_type,
          test_steps,
          expected_result,
          preconditions,
          automation_status
        )
      `
      )
      .eq("suite_id", suiteId)
      .order("sequence_order", { ascending: true })

    if (error) {
      return NextResponse.json(
        { error: "Failed to load suite cases", details: error.message },
        { status: 500 }
      )
    }

    const testCases: TestCaseShape[] = (data ?? [])
      .map((r: any) => (Array.isArray(r.test_cases) ? r.test_cases[0] : r.test_cases))
      .filter(Boolean)

    if (testCases.length === 0) {
      const empty: SuiteTriageResponse = { success: true, suiteId, rows: [] }
      return NextResponse.json(empty)
    }

    // OPTIONAL: script status lookup (remove this whole block if you’re removing automation)
    const ids = testCases.map((tc) => tc.id)
    const { data: scripts } = await supabase
      .from("automation_scripts")
      .select("test_case_id, status")
      .in("test_case_id", ids)

    const scriptByCase = new Map<string, { status: string | null }>()
    for (const s of scripts ?? []) {
      scriptByCase.set(s.test_case_id, { status: (s as any).status ?? null })
    }

    const rows: TriageRow[] = testCases.map((tc) => {
      const steps = tc.test_steps ?? []
      const eligible =
        steps.length > 0 &&
        steps.every(
          (s) => (s.action ?? "").trim().length > 0 && (s.expected ?? "").trim().length > 0
        )

      const value = scoreValue(tc)
      const effort = scoreEffort(tc)
      const confidence = scoreConfidence(tc)
      const category = pickCategory(value, effort, confidence, eligible)
      const reasons = buildReasons(tc, value, effort, confidence)

      const script = scriptByCase.get(tc.id)

      return {
        test_case_id: tc.id,
        title: tc.title,
        test_type: (tc.test_type ?? "functional").toLowerCase(),
        priority: toPriority(tc.priority),

        eligible,
        category,

        value,
        effort,
        confidence,

        reasons,
        fix_suggestions: deriveFixSuggestions(tc),

        has_script: Boolean(script),
        script_status: script?.status ?? null,
      }
    })

    const payload: SuiteTriageResponse = { success: true, suiteId, rows }
    return NextResponse.json(payload)
  } catch (err) {
    console.error("triage route error:", err)
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 })
  }
}
