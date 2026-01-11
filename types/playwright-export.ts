// Types for the Playwright export feature

export type TestStep = {
  step_number?: number;
  action: string;
  expected: string;
};

export type TestCase = {
  id: string;
  title: string;
  description: string | null;
  test_type: string | null;
  expected_result: string | null;
  test_steps: TestStep[];
};

export type TestSuite = {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at?: string;
};

export type SuiteLink = {
  id: string;
  suite_id: string;
  test_case_id: string;
  sequence_order: number | null;
  priority: string | null;
  estimated_duration_minutes: number | null;
};

export type ExportRequest = {
  suiteId: string;
};

export type ExportResponse = {
  ok: boolean;
  error?: string;
};

// Generated project types
export type GeneratedProject = {
  generatedAt: string;
  suite: {
    id: string;
    name: string;
    description: string | null;
  };
  cases: Array<{
    id: string;
    title: string;
    sequence_order: number | null;
    priority: string | null;
    estimated_duration_minutes: number | null;
    caseKey: string;
  }>;
};

export type PlaywrightConfig = {
  testDir: string;
  timeout: number;
  expect: {
    timeout: number;
  };
  retries: number;
  reporter: Array<[string, Record<string, any>?]>;
  use: {
    baseURL?: string;
    headless: boolean;
    trace: string;
    screenshot: string;
    video: string;
  };
};

// Database row types (matching Supabase schema)
export type TestCaseRow = {
  id: string;
  title: string;
  description: string | null;
  test_type: string | null;
  expected_result: string | null;
  test_steps: unknown; // JSON column - can be array, string, or object
  created_at: string;
  updated_at: string;
};

export type SuiteRow = {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
};

export type SuiteLinkRow = {
  id: string;
  suite_id: string;
  test_case_id: string;
  sequence_order: number | null;
  priority: string | null;
  estimated_duration_minutes: number | null;
  created_at: string;
};
