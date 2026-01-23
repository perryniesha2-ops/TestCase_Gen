// lib/integrations/testrail-client.ts
import axios, { AxiosInstance } from "axios";

export class TestRailIntegration {
  private client: AxiosInstance;

  constructor(config: { url: string; username: string; apiKey: string }) {
    this.client = axios.create({
      baseURL: `${config.url}/index.php?/api/v2`,
      auth: {
        username: config.username,
        password: config.apiKey,
      },
      headers: {
        "Content-Type": "application/json",
      },
    });
  }

  // Import test cases from TestRail
  async importTestCases(projectId: number, suiteId?: number) {
    const endpoint = suiteId
      ? `/get_cases/${projectId}&suite_id=${suiteId}`
      : `/get_cases/${projectId}`;

    const response = await this.client.get(endpoint);

    return (
      response.data.cases?.map((testCase: any) => ({
        external_id: testCase.id.toString(),
        title: testCase.title,
        description: testCase.custom_preconds || "",
        steps:
          testCase.custom_steps_separated?.map((step: any) => ({
            description: step.content,
            expected: step.expected,
          })) || [],
        priority: this.mapTestRailPriority(testCase.priority_id),
        metadata: {
          testrail_id: testCase.id,
          section_id: testCase.section_id,
          type_id: testCase.type_id,
          testrail_url: `${this.client.defaults.baseURL?.replace(
            "/index.php?/api/v2",
            ""
          )}/index.php?/cases/view/${testCase.id}`,
        },
      })) || []
    );
  }

  // Export test case to TestRail
  async exportTestCase(
    testCase: {
      title: string;
      description: string;
      steps?: Array<{ description: string; expected: string }>;
      priority: string;
    },
    projectId: number,
    sectionId: number
  ) {
    const response = await this.client.post(`/add_case/${sectionId}`, {
      title: testCase.title,
      custom_preconds: testCase.description,
      custom_steps_separated: testCase.steps?.map((step) => ({
        content: step.description,
        expected: step.expected,
      })),
      priority_id: this.mapPriorityToTestRail(testCase.priority),
    });

    return response.data;
  }

  // Create test run in TestRail
  async createTestRun(
    runData: {
      name: string;
      suite_id: number;
      case_ids: number[];
    },
    projectId: number
  ) {
    const response = await this.client.post(`/add_run/${projectId}`, runData);
    return response.data;
  }

  // Push test results to TestRail
  async pushTestResults(
    runId: number,
    results: Array<{
      case_id: number;
      status_id: number; // 1=Passed, 5=Failed, 2=Blocked, 4=Retest
      comment?: string;
      elapsed?: string; // Duration in format: "1m 30s"
      defects?: string; // Comma-separated list of defect IDs
    }>
  ) {
    const response = await this.client.post(`/add_results_for_cases/${runId}`, {
      results,
    });

    return response.data;
  }

  // Sync execution results
  async syncExecutionResult(
    execution: {
      test_case_id: string;
      execution_status: string;
      failure_reason?: string;
      duration_ms?: number;
    },
    runId: number
  ) {
    const statusId = this.mapStatusToTestRail(execution.execution_status);
    const elapsed = execution.duration_ms
      ? this.formatDuration(execution.duration_ms)
      : undefined;

    await this.client.post(
      `/add_result_for_case/${runId}/${execution.test_case_id}`,
      {
        status_id: statusId,
        comment: execution.failure_reason || "Test executed via SynthQA",
        elapsed,
      }
    );
  }

  private mapStatusToTestRail(status: string): number {
    const mapping: Record<string, number> = {
      passed: 1,
      blocked: 2,
      failed: 5,
      skipped: 4,
    };
    return mapping[status] || 1;
  }

  private mapTestRailPriority(priorityId: number): string {
    const mapping: Record<number, string> = {
      1: "low",
      2: "medium",
      3: "high",
      4: "critical",
    };
    return mapping[priorityId] || "medium";
  }

  private mapPriorityToTestRail(priority: string): number {
    const mapping: Record<string, number> = {
      low: 1,
      medium: 2,
      high: 3,
      critical: 4,
    };
    return mapping[priority] || 2;
  }

  private formatDuration(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`;
    }
    return `${seconds}s`;
  }
}
