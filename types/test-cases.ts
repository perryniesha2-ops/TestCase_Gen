// app/pages/test-cases/types/test-cases.ts

export type ExecutionStatus = 'not_run' | 'in_progress' | 'passed' | 'failed' | 'blocked' | 'skipped'
export type ApprovalStatus = 'draft' | 'active' | 'archived'| 'pending'| "approved"| "rejected"
export type Priority = 'low' | 'medium' | 'high' | 'critical'

export interface TestStep {
  step_number: number
  action: string
  expected: string
}

export interface TestCase {
  id: string
  generation_id: string
  title: string
  description: string
  test_type: string
  priority: Priority
  preconditions: string | null
  test_steps: TestStep[]
  expected_result: string
  is_edge_case: boolean
  status: ApprovalStatus
  execution_status: ExecutionStatus
  created_at: string
  project_id?: string | null
  projects?: Project
  
}

export interface CrossPlatformTestCase {
  id: string
  suite_id: string
  platform: string
  framework: string
  title: string
  description: string
  preconditions: string[]
  steps: string[]
  expected_results: string[]
  automation_hints?: string[]
  priority: Priority
  execution_status: ExecutionStatus
  status: ApprovalStatus
  created_at: string
  cross_platform_test_suites?: {
    requirement: string
    user_id: string
  }
}


export interface TestCaseForm {
  title: string
  description: string
  test_type: string
  priority: 'low' | 'medium' | 'high' | 'critical'
  preconditions: string
  test_steps: TestStep[]
  expected_result: string
  status: 'draft' | 'active' | 'archived' |'pending' |"approved"| "rejected"
  project_id?: string | null
}

export interface TestExecution {
  [testCaseId: string]: {
    id?: string
    status: ExecutionStatus
    completedSteps: number[]
    failedSteps: Array<{
      step_number: number
      failure_reason: string
    }>
    notes?: string
    failure_reason?: string
    started_at?: string
    completed_at?: string
    duration_minutes?: number
    test_environment?: string
    browser?: string
    os_version?: string
      attachments?: Attachment[]  
  batch_id?: string            
  is_bulk_execution?: boolean 
  }

}

export interface TestSession {
  id: string
  name: string
  status: string
  environment: string
  actual_start?: string
    stats: SessionStats
    test_cases_completed: number
    progress_percentage: number

}

export interface ExecutionDetails {
  notes?: string
  failure_reason?: string
  environment?: string
  browser?: string
  os_version?: string
}

export interface Project {
  id: string
  name: string
  color: string
  icon: string
}
export interface Generation {
  id: string
  title: string
}

export interface CrossPlatformSuite {
  id: string
  requirement: string
  platforms: string[]
  generated_at: string
}
export const platformIcons = {
  web: 'Monitor',
  mobile: 'Smartphone',
  api: 'Globe',
  accessibility: 'Eye',
  performance: 'Zap'
} as const

export const testTypes = [
  'functional', 
  'integration', 
  'unit', 
  'e2e', 
  'security', 
  'performance', 
  'accessibility', 
  'api', 
  'regression', 
  'smoke', 
  'user acceptance'
] as const

export interface TestSuite {
  id: string
  name: string
  description?: string
  suite_type: 'manual' | 'automated' | 'regression' | 'smoke' | 'integration'
  status: 'draft' | 'active' | 'completed' | 'archived'
  planned_start_date?: string
  planned_end_date?: string
  actual_start_date?: string
  actual_end_date?: string
  created_at: string
  test_case_count?: number
  project_id: string | null
  projects?: Project
  execution_stats?: {
    total: number
    passed: number
    failed: number
    skipped: number
    blocked: number
  }
   
}

export interface SessionStats {
  passed: number
  failed: number
  blocked: number
  skipped: number
}

interface TestRunSessionRow {
  id: string
  user_id: string
  suite_id: string | null
  name: string
  description: string | null
  status: "planned" | "in_progress" | "paused" | "completed" | "aborted"
  planned_start: string | null
  actual_start: string | null
  actual_end: string | null
  environment: string | null
  test_cases_total: number
  test_cases_completed: number
  progress_percentage: number
  passed_cases: number
  failed_cases: number
  skipped_cases: number
  blocked_cases: number
  created_at: string | null
  updated_at: string | null
  created_by: string | null
}




export type SuiteType = 'manual' | 'automated' | 'regression' | 'smoke' | 'integration'

export interface FormData {
  name: string
  description: string
  suite_type: SuiteType
  planned_start_date: string
  planned_end_date: string
}

export interface Attachment {
  name: string
  url: string
  type: string
  size: number
  uploaded_at: string
}



export type ExecutionHistoryRow = {
  execution_id: string
  suite_id: string
  suite_name: string
  session_id: string | null

  test_case_id: string
  test_title: string

  execution_status: ExecutionStatus
  failure_reason: string | null

  created_at: string
  started_at: string | null
  completed_at: string | null

  evidence_count: number
}

export interface TestAttachment {
  id: string
  file_name: string
  file_path: string
  file_type: string
  file_size: number | null  
  description?: string | null  
  step_number?: number | null  
  created_at: string
}


























