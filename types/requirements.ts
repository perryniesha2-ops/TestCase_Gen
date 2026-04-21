// types/requirements.ts

// ─── Enums ────────────────────────────────────────────────────────────────────

export type RequirementType =
  | "functional"
  | "user_story"
  | "use_case"
  | "non_functional";

export type RequirementPriority = "low" | "medium" | "high" | "critical";

// Full set of statuses used in DB and UI
export type RequirementStatus =
  | "draft"
  | "approved"
  | "implemented"
  | "tested"
  | "rejected"
  | "archived";

export type CoverageType = "direct" | "indirect" | "negative";

// ─── Core entities ────────────────────────────────────────────────────────────

export interface Project {
  id: string;
  name: string;
  color: string;
  icon: string;
}

export interface Requirement {
  id: string;
  title: string;
  description: string;
  type: RequirementType;
  external_id: string | null;
  acceptance_criteria: string[] | null;
  priority: RequirementPriority;
  status: RequirementStatus;
  source: string | null;
  project_id: string | null; // fixed: was `projectid`
  projects?: Project | null; // joined project row
  metadata?: Record<string, string | number | boolean> | null;
  created_at: string;
  updated_at: string;
  // Computed server-side by list route — not always present
  test_case_count?: number;
  regular_test_case_count?: number;
  platform_test_case_count?: number;
}

export interface TestCase {
  id: string;
  title: string;
  test_type: string;
  priority: string;
  status: string;
  created_at: string;
  updated_at: string;
  projects?: Project | null;
}

export interface RequirementTestCase {
  id: string;
  requirement_id: string;
  test_case_id: string;
  coverage_type: CoverageType;
  test_cases?: TestCase | null;
}

// ─── API response shapes ──────────────────────────────────────────────────────

export interface RequirementListResponse {
  requirements: Requirement[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasNextPage: boolean;
}

export type RequirementRow = {
  id: string;
  title: string;
  description: string;
  type: string;
  priority: string;
  status?: string;
  project_id?: string | null;
};

export type RequirementOption = {
  id: string;
  label: string;
  title: string;
  description: string;
  type: string;
  priority: string;
  value: string;
  project_id?: string | null;
};
