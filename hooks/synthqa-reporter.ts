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
    this.sessionId = `playwright-${Date.now()}`;
  }

  onTestEnd(test: TestCase, result: TestResult) {
    const duration = result.duration / 1000 / 60;

    this.testResults.push({
      test_case_id: this.extractTestCaseId(test),
      execution_status: this.mapStatus(result.status),
      started_at: new Date(Date.now() - result.duration).toISOString(),
      completed_at: new Date().toISOString(),
      duration_minutes: Math.max(duration, 0.01),
      execution_notes: this.getExecutionNotes(result),
      failure_reason: result.error?.message || null,
      stack_trace: result.error?.stack || null,
      browser: process.env.BROWSER || "chromium",
      os_version: process.platform,
      test_environment: process.env.TEST_ENV || "local",
      framework: "playwright",
      framework_version: this.getPlaywrightVersion(),
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

    const payload = {
      suite_id: this.suiteId,
      session_id: this.sessionId,
      framework: "playwright",
      test_results: this.testResults,
      metadata: {
        total_tests: this.testResults.length,
        passed_tests: passed,
        failed_tests: failed,
        skipped_tests: skipped,
        overall_status: failed > 0 ? "failed" : "passed",
        ci_provider: process.env.CI_PROVIDER || null,
        branch: process.env.GIT_BRANCH || null,
        commit_sha: process.env.GIT_COMMIT || null,
        commit_message: process.env.GIT_COMMIT_MESSAGE || null,
      },
    };

    await this.sendToSynthQA(payload);
  }

  private mapStatus(status: string): string {
    if (status === "passed") return "passed";
    if (status === "failed") return "failed";
    if (status === "skipped") return "skipped";
    return "failed";
  }

  private extractTestCaseId(test: TestCase): string | null {
    // Extract from test title (the UUID we set as the test name)
    const titleMatch = test.title.match(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
    if (titleMatch) {
      return titleMatch[0];
    }

    return null;
  }

  private getExecutionNotes(result: TestResult): string | null {
    if (result.retry > 0) {
      return `Test retried ${result.retry} time(s)`;
    }
    return result.status === "passed" ? "Test passed successfully" : null;
  }

  private getPlaywrightVersion(): string {
    try {
      return require("@playwright/test/package.json").version;
    } catch {
      return "unknown";
    }
  }

  private async sendToSynthQA(data: any) {
    const webhookUrl = process.env.SYNTHQA_WEBHOOK_URL;
    const apiKey = process.env.SYNTHQA_API_KEY;

    if (!webhookUrl) {
      console.log("⚠️  SYNTHQA_WEBHOOK_URL not set - skipping result upload");
      console.log(
        "   To sync results back to SynthQA, add SYNTHQA_WEBHOOK_URL to .env",
      );
      return;
    }

    if (!apiKey) {
      console.log("⚠️  SYNTHQA_API_KEY not set - skipping result upload");
      return;
    }

    try {
      console.log("📤 Sending test results to SynthQA...");

      const controller = new AbortController();

      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(data),
        signal: controller.signal,
      });

      if (!response.ok) {
        const error = await response.text();
        console.error(`❌ Failed to send results: ${response.statusText}`);
        console.error(`   Response: ${error}`);
      } else {
        console.log(
          `✅ Test results synced to SynthQA (${data.metadata.total_tests} tests)`,
        );
      }
    } catch (error) {
      console.error("❌ Error sending results to SynthQA:", error);
    }
  }
}

export default SynthQAReporter;
