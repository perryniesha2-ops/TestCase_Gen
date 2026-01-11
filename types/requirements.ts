// types/requirements.ts

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
  type: "functional" | "user_story" | "use_case" | "non_functional";
  external_id: string | null;
  acceptance_criteria: string[] | null;
  priority: "low" | "medium" | "high" | "critical";
  status: "draft" | "active" | "archived";
  source: string;
  projectid?: string | null;
  project_id?: string | null;
  projects?: Project | null;
  metadata?: Record<string, string | number | boolean>;
  created_at: string;
  updated_at: string;
  test_case_count: number;
  coverage_percentage: number;
}

export interface TestCase {
  id: string;
  title: string;
  test_type: string;
  priority: string;
  status: string;
  created_at: string;
  updated_at: string;
  projects?: Project;
}

export interface RequirementTestCase {
  id: string;
  requirement_id: string;
  test_case_id: string;
  coverage_type: "direct" | "indirect" | "negative";
  test_cases?: TestCase;
}
