// lib/test-execution.ts
// Shared types for test execution system

export type ExecutionStatus = 'not_run' | 'in_progress' | 'passed' | 'failed' | 'blocked' | 'skipped'

export type TestCasePriority = 'low' | 'medium' | 'high' | 'critical'

export type TestCaseStatus = 'draft' | 'active' | 'archived'

export type SuiteType = 'manual' | 'automated' | 'regression' | 'smoke' | 'integration'

export type SuiteStatus = 'draft' | 'active' | 'completed' | 'archived'

export interface TestStep {
  step_number: number
  action: string
  expected: string
}

export interface TestCase {
  id: string
  title: string
  description: string
  test_type: string
  priority: TestCasePriority
  preconditions: string | null
  test_steps: TestStep[]
  expected_result: string
  status: TestCaseStatus
  created_at?: string
  updated_at?: string
}

export interface SessionStats {
  passed: number
  failed: number
  blocked: number
  skipped: number
  total?: number
  completed?: number
}

export interface TestSession {
  id: string
  suite_id: string
  name: string
  status: 'not_started' | 'in_progress' | 'completed' | 'paused'
  environment: string
  actual_start?: string
  actual_end?: string
  progress_percentage: number
  test_cases_total: number
  test_cases_completed: number
  created_by: string
  created_at?: string
  updated_at?: string
  stats?: SessionStats
}

export interface TestSuite {
  id: string
  name: string
  description: string  // Required, not optional
  suite_type: SuiteType
  status: SuiteStatus
  planned_start_date?: string
  planned_end_date?: string
  actual_start_date?: string
  actual_end_date?: string
  created_at: string
  updated_at?: string
  user_id?: string
  test_case_count?: number
  test_cases?: TestCase[]
  active_session?: {
    id: string
    status: string
    actual_start: string
    progress_percentage: number
    test_cases_completed: number
    test_cases_total: number
  } | null
  execution_stats?: SessionStats
  progress_percentage?: number
  completed_count?: number
}

export interface TestExecution {
  id?: string
  test_case_id: string
  session_id: string
  executed_by: string
  execution_status: ExecutionStatus
  completed_steps: number[]
  failed_steps?: Array<{
    step_number: number
    failure_reason: string
  }>
  execution_notes?: string
  failure_reason?: string
  test_environment: string
  browser?: string
  os_version?: string
  started_at: string
  completed_at?: string
  duration_minutes?: number
  created_at?: string
  updated_at?: string
}