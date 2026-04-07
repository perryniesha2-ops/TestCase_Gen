// app/api/automation/webhook/results/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendNotification } from "@/lib/notifications/send";
import { resolveNeedsRerun } from "@/lib/utils/resolve-needs-rerun";

export const runtime = "nodejs";

interface TestResultPayload {
  suite_id: string;
  session_id: string;
  framework?:
    | "playwright"
    | "selenium"
    | "cypress"
    | "puppeteer"
    | "testcafe"
    | "webdriverio";
  test_results: Array<{
    test_case_id: string | null;
    execution_status: "passed" | "failed" | "skipped";
    started_at: string;
    completed_at: string;
    duration_minutes: number;
    execution_notes: string | null;
    failure_reason: string | null;
    stack_trace: string | null;
    browser: string;
    os_version: string;
    test_environment: string;
    framework?: string;
    framework_version?: string;
    playwright_version?: string;
    selenium_version?: string;
    cypress_version?: string;
  }>;
  metadata: {
    total_tests: number;
    passed_tests: number;
    failed_tests: number;
    skipped_tests: number;
    overall_status: "passed" | "failed";
    ci_provider?: string;
    branch?: string;
    commit_sha?: string;
    commit_message?: string;
  };
}

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Missing or invalid authorization header" },
        { status: 401 },
      );
    }

    const apiKey = authHeader.substring(7);

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      },
    );

    const { data: profile, error: profileError } = await supabase
      .from("user_profiles")
      .select("id")
      .eq("api_key", apiKey)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
    }

    const payload: TestResultPayload = await req.json();

    const { data: suite, error: suiteError } = await supabase
      .from("suites")
      .select("id, name, user_id, total_automation_runs")
      .eq("id", payload.suite_id)
      .eq("user_id", profile.id)
      .single();

    if (suiteError || !suite) {
      console.error("[webhook] Suite verification failed:", suiteError);
      return NextResponse.json(
        { error: "Suite not found or access denied" },
        { status: 404 },
      );
    }

    const startTime = new Date(
      payload.test_results[0]?.started_at || Date.now(),
    );
    const endTime = new Date();
    const durationMs = endTime.getTime() - startTime.getTime();
    const runNumber = (suite.total_automation_runs || 0) + 1;

    const framework =
      payload.framework || payload.test_results[0]?.framework || "playwright";

    const frameworkVersion =
      payload.test_results[0]?.framework_version ||
      payload.test_results[0]?.playwright_version ||
      payload.test_results[0]?.selenium_version ||
      payload.test_results[0]?.cypress_version ||
      null;

    // ============================================================================
    // CREATE AUTOMATION RUN
    // ============================================================================
    const { data: automationRun, error: runError } = await supabase
      .from("automation_runs")
      .insert({
        suite_id: payload.suite_id,
        user_id: profile.id,
        run_number: runNumber,
        status: payload.metadata.overall_status,
        framework: framework,
        environment: payload.test_results[0]?.test_environment || "local",
        browser: payload.test_results[0]?.browser || "chromium",
        os_version: payload.test_results[0]?.os_version || null,
        ci_provider: payload.metadata.ci_provider || null,
        branch: payload.metadata.branch || null,
        commit_sha: payload.metadata.commit_sha || null,
        commit_message: payload.metadata.commit_message || null,
        triggered_by: payload.metadata.ci_provider ? "webhook" : "manual",
        total_tests: payload.metadata.total_tests,
        passed_tests: payload.metadata.passed_tests,
        failed_tests: payload.metadata.failed_tests,
        skipped_tests: payload.metadata.skipped_tests,
        started_at: startTime.toISOString(),
        completed_at: endTime.toISOString(),
        duration_ms: durationMs,
        framework_version: frameworkVersion,
      })
      .select()
      .single();

    if (runError) {
      console.error("❌ FAILED TO CREATE AUTOMATION RUN:", {
        error: runError,
        message: runError.message,
        code: runError.code,
      });
      return NextResponse.json(
        { error: "Failed to save automation run", details: runError.message },
        { status: 500 },
      );
    }

    if (!automationRun) {
      console.error("❌ NO AUTOMATION RUN RETURNED");
      return NextResponse.json(
        { error: "No automation run data returned" },
        { status: 500 },
      );
    }

    // ============================================================================
    // UPDATE SUITE PASS RATE
    // ============================================================================
    const { error: passRateError } = await supabase.rpc(
      "update_suite_pass_rate",
      {
        p_suite_id: payload.suite_id,
        p_passed: payload.metadata.passed_tests,
        p_total: payload.metadata.total_tests,
      },
    );

    if (passRateError) {
      console.error(
        "[webhook] Failed to update suite pass rate:",
        passRateError,
      );
    }

    // ============================================================================
    // CREATE TEST EXECUTIONS
    // ============================================================================

    // Filter out any results with no test_case_id (e.g. auth setup steps)
    const validResults = payload.test_results.filter(
      (r) => r.test_case_id !== null,
    );

    const executions = validResults.map((r) => {
      const testFramework = (r.framework || framework).toLowerCase();
      const testFrameworkVersion =
        r.framework_version ||
        r.playwright_version ||
        r.selenium_version ||
        r.cypress_version ||
        null;

      return {
        user_id: profile.id,
        executed_by: profile.id,
        suite_id: payload.suite_id,
        test_case_id: r.test_case_id,
        execution_type: "automated",
        execution_status: r.execution_status,
        started_at: r.started_at,
        completed_at: r.completed_at,
        duration_minutes: r.duration_minutes,
        execution_notes: r.execution_notes,
        failure_reason: r.failure_reason,
        stack_trace: r.stack_trace,
        test_environment: r.test_environment,
        browser: r.browser,
        os_version: r.os_version,
        framework: testFramework,
        framework_version: testFrameworkVersion,
        session_id: null,
        automation_session_id: payload.session_id,
        automation_run_id: automationRun.id,
        total_tests: payload.metadata.total_tests,
        passed_tests: payload.metadata.passed_tests,
        failed_tests: payload.metadata.failed_tests,
        skipped_tests: payload.metadata.skipped_tests,
      };
    });

    // ── Insert executions ──
    const { data: insertedExecutions, error: executionsError } = await supabase
      .from("test_executions")
      .insert(executions)
      .select("id");

    if (executionsError) {
      console.error("❌ FAILED TO INSERT EXECUTIONS:", {
        error: executionsError,
        message: executionsError.message,
        code: executionsError.code,
        details: executionsError.details,
        hint: executionsError.hint,
      });
      return NextResponse.json({
        success: true,
        automation_run_id: automationRun.id,
        run_number: runNumber,
        executions_saved: 0,
        executions_error: executionsError.message,
        message: `Automation run #${runNumber} saved but test executions failed: ${executionsError.message}`,
      });
    }

    const passedOrFailedResults = validResults.filter(
      (r) =>
        r.test_case_id &&
        (r.execution_status === "passed" || r.execution_status === "failed"),
    );
    if (passedOrFailedResults.length > 0) {
      await Promise.allSettled(
        passedOrFailedResults.map((r) =>
          resolveNeedsRerun(supabase, r.test_case_id!, r.execution_status),
        ),
      );
    }

    // ── Fire notifications after successful insert ──
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.synthqa.app";
    const durationStr = `${Math.round(durationMs / 1000)}s`;
    const passRate =
      payload.metadata.total_tests > 0
        ? Math.round(
            (payload.metadata.passed_tests / payload.metadata.total_tests) *
              100,
          )
        : 0;

    if (payload.metadata.failed_tests > 0) {
      const failedResults = payload.test_results.filter(
        (r) => r.execution_status === "failed",
      );
      void sendNotification({
        event: "run_failed",
        userId: profile.id,
        suiteName: suite.name,
        suiteId: payload.suite_id,
        runNumber,
        totalTests: payload.metadata.total_tests,
        failedTests: payload.metadata.failed_tests,
        failedCases: failedResults.map((r) => ({
          title: r.test_case_id ?? "Unknown",
          reason: r.failure_reason,
        })),
        appUrl,
      });
    } else {
      void sendNotification({
        event: "automation_completed",
        userId: profile.id,
        suiteName: suite.name,
        suiteId: payload.suite_id,
        runNumber,
        framework,
        totalTests: payload.metadata.total_tests,
        passedTests: payload.metadata.passed_tests,
        failedTests: 0,
        passRate,
        duration: durationStr,
        appUrl,
      });
    }

    return NextResponse.json({
      success: true,
      automation_run_id: automationRun.id,
      run_number: runNumber,
      executions_saved: insertedExecutions?.length ?? executions.length,
      message: `Saved ${framework} automation run #${runNumber} with ${executions.length} test results`,
    });
  } catch (error) {
    console.error("[webhook] Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
