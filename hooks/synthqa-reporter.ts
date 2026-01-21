// synthqa-reporter.ts
import {
  Reporter,
  TestCase,
  TestResult,
  FullResult,
} from "@playwright/test/reporter";

class SynthQAReporter implements Reporter {
  private suiteId: string;
  private sessionId: string;
  private testResults: any[] = [];

  constructor(options: { suiteId: string }) {
    this.suiteId = options.suiteId;
    this.sessionId = `playwright-${Date.now()}`; // Or use CI build ID
  }

  onTestEnd(test: TestCase, result: TestResult) {
    const duration = result.duration / 1000 / 60; // Convert to minutes

    this.testResults.push({
      test_case_id: this.extractTestCaseId(test), // Extract from test metadata
      execution_status: this.mapStatus(result.status),
      started_at: new Date(Date.now() - result.duration).toISOString(),
      completed_at: new Date().toISOString(),
      duration_minutes: Math.max(duration, 0.01), // At least 0.01 minutes
      execution_notes: this.getExecutionNotes(result),
      failure_reason: result.error?.message || null,
      browser: process.env.BROWSER || "chromium",
      os_version: process.platform,
      test_environment: process.env.TEST_ENV || "staging",
      ci_provider: process.env.CI_PROVIDER || null,
      branch: process.env.GIT_BRANCH || null,
      commit_sha: process.env.GIT_COMMIT || null,
      playwright_version: require("@playwright/test/package.json").version,
    });
  }

  async onEnd(result: FullResult) {
    const passed = this.testResults.filter(
      (t) => t.execution_status === "passed",
    ).length;
    const failed = this.testResults.filter(
      (t) => t.execution_status === "failed",
    ).length;
    const skipped = this.testResults.filter(
      (t) => t.execution_status === "skipped",
    ).length;

    await this.sendToWebhook({
      suite_id: this.suiteId,
      session_id: this.sessionId,
      test_results: this.testResults,
      metadata: {
        total_tests: this.testResults.length,
        passed_tests: passed,
        failed_tests: failed,
        skipped_tests: skipped,
      },
    });
  }

  private mapStatus(status: string): string {
    if (status === "passed") return "passed";
    if (status === "failed") return "failed";
    if (status === "skipped") return "skipped";
    return "failed";
  }

  private extractTestCaseId(test: TestCase): string | null {
    // Try to extract test_case_id from test metadata/annotations
    const annotation = test.annotations.find((a) => a.type === "synthqa_id");
    return annotation?.description || null;
  }

  private getExecutionNotes(result: TestResult): string | null {
    if (result.retry > 0) {
      return `Test retried ${result.retry} time(s)`;
    }
    return result.status === "passed" ? "Test passed successfully" : null;
  }

  private async sendToWebhook(data: any) {
    try {
      const response = await fetch(process.env.SYNTHQA_WEBHOOK_URL || "", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.SYNTHQA_API_KEY}`,
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        console.error("Failed to send results:", response.statusText);
      } else {
        console.log("✅ Test results sent to SynthQA");
      }
    } catch (error) {
      console.error("Error sending results:", error);
    }
  }
}

export default SynthQAReporter;
