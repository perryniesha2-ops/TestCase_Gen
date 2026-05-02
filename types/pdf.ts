// types/pdf.ts
// Single source of truth for all PDF export payloads.
// Add a new member to PDFRequest when you add a new document type.

// ─── Report ───────────────────────────────────────────────────────────────────

export type ReportPDFSection = {
  id: string;
  metric: string;
};

export type ReportPDFData = {
  reportName: string;
  periodLabel: string;
  generatedAt: string;
  days?: number;
  // Which sections the user configured — PDF renders only these, in this order
  sections: ReportPDFSection[];

  total_tests: number;
  passed: number;
  failed: number;
  blocked: number;
  skipped: number;
  not_run: number;
  pass_rate: number;

  requirements_total: number;
  requirements_tested: number;
  coverage_percentage: number;

  automation_runs: number;
  automation_pass_rate: number;

  execution_trend: Array<{
    date: string;
    passed: number;
    failed: number;
    total: number;
  }>;
  suite_performance: Array<{
    suite_name: string;
    execution_count: number;
    avg_pass_rate: number;
    last_execution: string;
  }>;
  top_failures: Array<{
    test_title: string;
    failure_count: number;
    pass_rate: number;
  }>;
  flaky_tests: Array<{
    test_title: string;
    flakiness_score: number;
    total_executions: number;
  }>;
  test_type_breakdown: Array<{ name: string; count: number }>;
};

// ─── Requirements ─────────────────────────────────────────────────────────────
// Placeholder — fill in when you build RequirementsPDF.tsx

export type RequirementsPDFData = {
  title: string;
  generatedAt: string;
  projectName?: string;
  requirements: Array<{
    id: string;
    title: string;
    description?: string;
    status?: string;
    priority?: string;
    projectName?: string;
    createdAt?: string;
  }>;
};

// ─── Automation run ───────────────────────────────────────────────────────────
// Placeholder — fill in when you build AutomationRunPDF.tsx

export type AutomationRunPDFData = {
  title: string;
  generatedAt: string;
  runNumber: number;
  suiteName: string;
  status: string;
  framework: string;
  environment: string;
  passedTests: number;
  failedTests: number;
  skippedTests: number;
  totalTests: number;
  durationMs: number;
  branch?: string;
  commitSha?: string;
  executions: Array<{
    title: string;
    status: string;
    durationMinutes?: number;
    failureReason?: string;
  }>;
};

// ─── Discriminated union ──────────────────────────────────────────────────────
// The POST body sent to /api/pdf from any client.

export type PDFRequest =
  | { type: "report"; filename: string; data: ReportPDFData }
  | { type: "requirements"; filename: string; data: RequirementsPDFData }
  | { type: "automation_run"; filename: string; data: AutomationRunPDFData };
