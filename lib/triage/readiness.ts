import type { TestCase, TestStep } from "@/types/test-cases"

export type ReadinessStatus = "ready" | "needs_info" | "exploratory"

export type ReadinessResult = {
  status: ReadinessStatus
  reasons: string[]
  missing: Array<"preconditions" | "steps" | "assertions" | "data">
}

const VAGUE_PATTERNS = [
  /verify it works/i,
  /ensure it works/i,
  /check that it works/i,
  /looks good/i,
  /visually/i,
  /confirm design/i,
  /intuitively/i,
  /should be fine/i,
]

const MANUAL_ONLY_PATTERNS = [
  /visual/i,
  /look and feel/i,
  /layout/i,
  /alignment/i,
  /color/i,
  /font/i,
  /animation/i,
]

function isBlank(s: string | null | undefined) {
  return !s || s.trim().length === 0
}

function stepIsComplete(step: TestStep) {
  return !isBlank(step.action) && !isBlank(step.expected)
}

function countVagueSignals(text: string) {
  return VAGUE_PATTERNS.reduce((acc, rx) => acc + (rx.test(text) ? 1 : 0), 0)
}

function hasManualOnlySignals(text: string) {
  return MANUAL_ONLY_PATTERNS.some((rx) => rx.test(text))
}

export function evaluateReadiness(tc: Pick<TestCase, "preconditions" | "expected_result" | "test_steps" | "description" | "title">): ReadinessResult {
  const reasons: string[] = []
  const missing: ReadinessResult["missing"] = []

  const steps = Array.isArray(tc.test_steps) ? tc.test_steps : []
  const hasSteps = steps.length > 0
  const incompleteSteps = steps.filter((s) => !stepIsComplete(s)).length

  const combinedText =
    [tc.title, tc.description, tc.preconditions ?? "", tc.expected_result ?? "", ...steps.map(s => `${s.action} ${s.expected}`)]
      .join(" ")
      .trim()

  const manualOnly = hasManualOnlySignals(combinedText)
  const vagueCount = countVagueSignals(combinedText)

  if (!hasSteps) {
    missing.push("steps")
    reasons.push("No test steps defined.")
  } else if (incompleteSteps > 0) {
    missing.push("steps")
    reasons.push(`${incompleteSteps} step(s) are missing action or expected result.`)
  }

  if (isBlank(tc.expected_result)) {
    missing.push("assertions")
    reasons.push("Missing overall expected result.")
  }

  if (isBlank(tc.preconditions)) {
    missing.push("preconditions")
    reasons.push("No preconditions specified (may be fine, but often needed).")
  }

  if (manualOnly) {
    reasons.push("Contains visual/subjective checks that are typically manual.")
    return { status: "exploratory", reasons, missing }
  }

  // If vague signals are common, consider "needs_info"
  if (vagueCount >= 1) {
    reasons.push("Contains vague language; consider making assertions more specific.")
  }

  const status: ReadinessStatus =
    missing.length === 0 && vagueCount === 0
      ? "ready"
      : missing.length === 0 && vagueCount > 0
        ? "needs_info"
        : "needs_info"

  return { status, reasons, missing }
}
