export type TriageCategory = "quick_win" | "high_value" | "needs_prep" | "not_recommended"

export type ScriptHealth = {
  total_runs: number
  pass_rate: number
  fail_rate: number
  timeout_rate: number
  last_run_at: string | null
  median_duration_ms: number | null
  confidence: "high" | "medium" | "low"
  reasons: string[]
}

export type TriageRow = {
  test_case_id: string
  title: string
  priority: "low" | "medium" | "high" | "critical"
  test_type: string
  eligible: boolean
  has_script: boolean
  script_status: string | null
  value: number 
  effort: number
  confidence: number 
  category: TriageCategory
  reasons: string[]
  health?: ScriptHealth
 fix_suggestions?: FixSuggestion[]
}

export type SuiteTriageResponse = {
 suiteId: string
  rows: TriageRow[]
}


export type FixSuggestion = {
  code:
    | "ADD_URL"
    | "ADD_TEST_DATA"
    | "SPLIT_STEPS"
    | "MAKE_ASSERTION_EXPLICIT"
    | "REMOVE_AMBIGUITY"
    | "ADD_PRECONDITIONS"
    | "ADD_SELECTORS_HINTS"
  title: string
  detail: string
}