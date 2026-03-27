export type AllowedStatus = "passed" | "failed" | "skipped" | "blocked";

export type ExecutionHistoryRow = {
  execution_id: string;
  suite_id: string;
  suite_name: string;
  session_id: string | null;
  test_case_id: string;
  test_title: string;
  test_description: string | null;
  execution_status: AllowedStatus;
  execution_notes: string | null;
  failure_reason: string | null;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  duration_ms: number | null;
  evidence_count: number;
  review_needs_update: boolean;
  review_create_issue: boolean;
  review_note: string | null;
  reviewed_at: string | null;
  jira_issue_key: string | null;
  testrail_defect_id: string | null;
  automation_run_id: string | null;
};
