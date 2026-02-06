// types/dashboard.ts
export interface ProjectDashboard {
  project_id: string;
  counts: {
    templates: number;
    requirements: number;
    test_cases: number;
    platform_test_cases: number;
    test_cases_total: number;
    suites: number;
  };
  executions: {
    total: number;
    passed: number;
    failed: number;
    blocked: number;
    skipped: number;
    not_run: number;
    in_progress: number;
    pass_rate: number;
    by_case_type: {
      regular: number;
      platform: number;
    };
  };
  avg_duration_minutes: number;
  last_execution_at: string | null;
}

export interface SuiteStats {
  suite_id: string;
  name: string;
  suite_type: string;
  status: string;
  test_case_count: number;
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  blocked: number;
}

export interface RecentExecution {
  execution_id: string;
  test_case_id: string | null;
  platform_test_case_id: string | null;
  case_type: "regular" | "platform" | "unknown";
  test_title: string;
  test_type: string;
  execution_status: string;
  started_at: string;
  completed_at: string | null;
  duration_minutes: number | null;
  executed_by: string;
  suite_id: string | null;
  suite_name: string | null;
}

// types/dashboard.ts

export interface SuiteSummary {
  suite_id: string;
  name: string;
  description: string | null;
  suite_type: string;
  status: string;
  created_at: string;
  test_case_count: number;
  execution_count: number;
  passed_count: number;
  failed_count: number;
  blocked_count: number;
  skipped_count: number;
  pass_rate: number;
}

export interface ExecutionTimelineData {
  execution_date: string;
  total_executions: number;
  passed_count: number;
  failed_count: number;
  blocked_count: number;
  skipped_count: number;
  pass_rate: number;
}
