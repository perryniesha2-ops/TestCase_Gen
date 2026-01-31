// types/test-cases.ts

export type ExecutionStatus =
  | "not_run"
  | "in_progress"
  | "passed"
  | "failed"
  | "blocked"
  | "skipped";

export type ApprovalStatus = "draft" | "active" | "archived" | "pending";

export type Priority = "low" | "medium" | "high" | "critical";

export type AutomationMode = "manual" | "partial" | "automated";

export interface TestStep {
  step_number: number;
  action: string;
  expected: string;
  data?: unknown;
}

export interface TestCase {
  id: string;
  generation_id: string;
  title: string;
  description: string;
  test_type: string;
  priority: Priority;
  preconditions: string | null;
  test_steps: TestStep[];
  expected_result: string;
  is_edge_case: boolean;
  status: ApprovalStatus;
  execution_status: ExecutionStatus;
  created_at: string;
  project_id?: string | null;
  projects?: Project;
  updated_at: string;
  is_negative_test: boolean;
  is_security_test: boolean;
  is_boundary_test: boolean;
  user_id?: string; // ✅ Added for consistency
}

export interface CrossPlatformTestCase {
  id: string;
  suite_id: string;
  user_id?: string;
  platform: string;
  framework: string;
  title: string;
  description: string;
  preconditions: string[] | string;
  steps: string[];
  expected_results: string[];
  automation_hints?: string[];
  automation_metadata?: Record<string, any>;
  project_id?: string | null;
  projects?: Project;
  priority: Priority;
  execution_status: ExecutionStatus;
  status: ApprovalStatus;
  created_at: string;
  updated_at?: string;
  approved_at?: string;
  approved_by?: string;
}

// ✅ NEW: Combined type for unified table
export type CombinedTestCase = (TestCase | CrossPlatformTestCase) & {
  _caseType?: "regular" | "cross-platform";
};

// ✅ NEW: Type guards
export function isRegularTestCase(
  tc: CombinedTestCase,
): tc is TestCase & { _caseType?: "regular" } {
  return tc._caseType === "regular" || !tc._caseType || "test_steps" in tc;
}

export function isCrossPlatformTestCase(
  tc: CombinedTestCase,
): tc is CrossPlatformTestCase & { _caseType: "cross-platform" } {
  return (
    tc._caseType === "cross-platform" || ("platform" in tc && "framework" in tc)
  );
}

export interface TestCaseForm {
  title: string;
  description: string;
  test_type: string;
  priority: "low" | "medium" | "high" | "critical";
  preconditions: string;
  test_steps: TestStep[];
  expected_result: string;
  status: "draft" | "active" | "archived" | "pending" | "approved" | "rejected";
  project_id?: string | null;
}

export interface TestExecution {
  [testCaseId: string]: {
    id?: string;
    status: ExecutionStatus;
    completedSteps: number[];
    failedSteps: Array<{
      step_number: number;
      failure_reason: string;
    }>;
    notes?: string;
    failure_reason?: string;
    started_at?: string;
    completed_at?: string;
    duration_minutes?: number;
    test_environment?: string;
    browser?: string;
    os_version?: string;
    attachments?: Attachment[];
    batch_id?: string;
    is_bulk_execution?: boolean;
  };
}

export interface TestSession {
  id: string;
  name: string;
  status: string;
  environment: string;
  actual_start?: string;
  stats: SessionStats;
  test_cases_completed: number;
  progress_percentage: number;
}

export interface ExecutionDetails {
  notes?: string;
  failure_reason?: string;
  environment?: string;
  browser?: string;
  os_version?: string;
}

export interface Project {
  id: string;
  name: string;
  color: string;
  icon: string;
}

export interface Generation {
  id: string;
  title: string;
}

export const platformIcons = {
  web: "Monitor",
  mobile: "Smartphone",
  api: "Globe",
  accessibility: "Eye",
  performance: "Zap",
} as const;

export type PlatformType = keyof typeof platformIcons;

export const testTypes = [
  "functional",
  "integration",
  "unit",
  "e2e",
  "security",
  "performance",
  "accessibility",
  "api",
  "regression",
  "smoke",
  "user acceptance",
] as const;

export interface TestSuite {
  id: string;
  name: string;
  description?: string | null;
  kind: string;
  suite_type: "manual" | "automated" | "regression" | "smoke" | "integration";
  status: "draft" | "active" | "completed" | "archived";
  planned_start_date?: string;
  planned_end_date?: string;
  actual_start_date?: string;
  actual_end_date?: string;
  created_at: string;
  test_case_count?: number;
  project_id: string | null;
  projects?: Project;
  execution_stats?: {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
    blocked: number;
  };
  automation_stats?: {
    total: number;
    with_steps: number;
    with_automation: number;
    ready: number;
  };
}

// ✅ NEW: Suite-TestCase relationship supporting both types
export interface SuiteTestCase {
  id: string;
  suite_id: string;
  test_case_id: string | null; // For regular test cases
  platform_test_case_id: string | null; // For cross-platform test cases
  sequence_order: number;
  priority: Priority;
  estimated_duration_minutes: number;
  test_cases?: TestCase | null;
  platform_test_cases?: CrossPlatformTestCase | null;
}

export interface SessionStats {
  passed: number;
  failed: number;
  blocked: number;
  skipped: number;
}

interface TestRunSessionRow {
  id: string;
  user_id: string;
  suite_id: string | null;
  name: string;
  description: string | null;
  status: "planned" | "in_progress" | "paused" | "completed" | "aborted";
  planned_start: string | null;
  actual_start: string | null;
  actual_end: string | null;
  environment: string | null;
  test_cases_total: number;
  test_cases_completed: number;
  progress_percentage: number;
  passed_cases: number;
  failed_cases: number;
  skipped_cases: number;
  blocked_cases: number;
  created_at: string | null;
  updated_at: string | null;
  created_by: string | null;
}

export type SuiteType =
  | "manual"
  | "automated"
  | "regression"
  | "smoke"
  | "integration";

export interface FormData {
  name: string;
  description: string;
  suite_type: SuiteType;
  planned_start_date: string;
  planned_end_date: string;
}

export interface Attachment {
  name: string;
  url: string;
  type: string;
  size: number;
  uploaded_at: string;
}

export type ExecutionHistoryRow = {
  execution_id: string;
  suite_id: string;
  suite_name: string;
  session_id: string | null;

  test_case_id: string;
  test_title: string;

  execution_status: ExecutionStatus;
  failure_reason: string | null;

  created_at: string;
  started_at: string | null;
  completed_at: string | null;

  evidence_count: number;
};

export interface TestAttachment {
  id: string;
  file_name: string;
  file_path: string;
  file_type: string;
  file_size: number | null;
  description?: string | null;
  step_number?: number | null;
  created_at: string;
}

export type AutomationScript = {
  id: string;
  test_case_id: string;
  framework?: string | null;
  status?: string | null;
  script_content: string | null;
  updated_at?: string | null;
  created_at?: string | null;
};

export type ExecutionByCaseId = Record<
  string,
  { status: ExecutionStatus; executed_at?: string | null }
>;

export type TestCasesOverviewResponse = {
  projects: Project[];
  testCases: TestCase[];
  crossPlatformCases: CrossPlatformTestCase[];
  currentSession: Pick<
    TestSession,
    "id" | "name" | "environment" | "status"
  > | null;
  executionByCaseId: ExecutionByCaseId;

  // optional compatibility fields
  generations: Generation[];
};

// ✅ NEW: Export types for dialog components
export type AnyTestCase = TestCase | CrossPlatformTestCase;

// ✅ NEW: Helper to get case type from object
export function getCaseType(tc: AnyTestCase): "regular" | "cross-platform" {
  if ("test_steps" in tc && "test_type" in tc) {
    return "regular";
  }
  if ("platform" in tc && "framework" in tc) {
    return "cross-platform";
  }
  return "regular"; // fallback
}
