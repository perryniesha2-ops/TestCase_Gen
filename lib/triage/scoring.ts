import type { Priority, TestCase, AutomationScript, ExecutionHistoryRow } from "@/types/test-cases"
import { evaluateReadiness } from "./readiness"

export type TriageCategory = "quick_win" | "high_value" | "needs_prep" | "not_recommended"

export type TriageScore = {
  test_case_id: string
  value: number        // 0-100
  effort: number       // 0-100 (lower is better)
  confidence: "low" | "medium" | "high"
  category: TriageCategory
  reasons: string[]
  readiness: ReturnType<typeof evaluateReadiness>
  has_script: boolean
}

function clamp(n: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, n))
}

function priorityWeight(p: Priority): number {
  switch (p) {
    case "critical": return 40
    case "high": return 30
    case "medium": return 18
    case "low": return 10
    default: return 18
  }
}

function calcRunSignals(history: ExecutionHistoryRow[]) {
  const total = history.length
  const passed = history.filter(h => h.execution_status === "passed").length
  const failed = history.filter(h => h.execution_status === "failed").length
  const blocked = history.filter(h => h.execution_status === "blocked").length
  const skipped = history.filter(h => h.execution_status === "skipped").length

  const failRate = total > 0 ? failed / total : 0
  const passRate = total > 0 ? passed / total : 0

  return { total, passed, failed, blocked, skipped, failRate, passRate }
}

function estimateEffortFromSteps(stepsCount: number) {
  // 0 steps -> max effort (because it needs work)
  if (stepsCount <= 0) return 85
  if (stepsCount <= 3) return 20
  if (stepsCount <= 6) return 35
  if (stepsCount <= 10) return 55
  return 75
}

export function scoreTestCaseForTriage(args: {
  testCase: TestCase
  executionHistory: ExecutionHistoryRow[]  // history for this test case (optionally filtered by suite)
  hasScript: boolean
}): TriageScore {
  const { testCase, executionHistory, hasScript } = args

  const readiness = evaluateReadiness({
    title: testCase.title,
    description: testCase.description,
    preconditions: testCase.preconditions,
    expected_result: testCase.expected_result,
    test_steps: testCase.test_steps,
  })

  const reasons: string[] = [...readiness.reasons]

  // VALUE
  // Priority is the baseline value driver.
  let value = priorityWeight(testCase.priority)

  // If it has a lot of history/runs, it’s worth automating.
  const runSignals = calcRunSignals(executionHistory)
  if (runSignals.total >= 10) {
    value += 25
    reasons.push("Frequently executed (10+ historical runs).")
  } else if (runSignals.total >= 5) {
    value += 15
    reasons.push("Repeatedly executed (5+ historical runs).")
  } else if (runSignals.total > 0) {
    value += 8
    reasons.push("Has execution history.")
  }

  // Failures can indicate either instability or importance.
  // For Stage 1, treat *some* failures as value (catches regressions),
  // but high fail rate lowers confidence.
  if (runSignals.failed > 0) {
    value += clamp(runSignals.failed * 2, 0, 10)
    reasons.push("Has captured failures; automation could prevent regressions.")
  }

  // EFFORT
  // Effort grows with step count, missing structure, and exploratory signals.
  let effort = estimateEffortFromSteps(testCase.test_steps?.length ?? 0)

  if (readiness.status === "needs_info") effort += 15
  if (readiness.status === "exploratory") effort += 30
  if (!testCase.preconditions || testCase.preconditions.trim() === "") effort += 5

  effort = clamp(effort)

  // CONFIDENCE
  let confidence: TriageScore["confidence"] = "high"
  if (readiness.status === "exploratory") confidence = "low"
  else if (readiness.status === "needs_info") confidence = "medium"

  if (runSignals.total >= 5 && runSignals.failRate >= 0.5) {
    confidence = "low"
    reasons.push("High failure rate in history; may be flaky or unstable.")
  }

  // CATEGORY
  // Quick win: high value, low effort, acceptable confidence, and no script (or script missing)
  // If script already exists, this can still be "quick win" but in Stage 2 you’ll treat as “ready to execute”.
  const normalizedValue = clamp(value)
  const normalizedEffort = clamp(effort)

  let category: TriageCategory = "needs_prep"

  if (confidence === "low") {
    category = "not_recommended"
  } else if (normalizedValue >= 60 && normalizedEffort <= 35) {
    category = "quick_win"
  } else if (normalizedValue >= 60 && normalizedEffort > 35) {
    category = "high_value"
  } else if (normalizedValue < 60 && normalizedEffort <= 35) {
    category = "quick_win" // still a “small win” bucket; you can rename in UI
  } else {
    category = "needs_prep"
  }

  // If script already exists, add context (do not change category; that’s a Stage 2 concept)
  if (hasScript) reasons.push("An automation script already exists for this test case.")

  return {
    test_case_id: testCase.id,
    value: normalizedValue,
    effort: normalizedEffort,
    confidence,
    category,
    reasons,
    readiness,
    has_script: hasScript,
  }
}
