// app/api/automation/webhook/results/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

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

    // ✅ ADD DEBUG LOG
    console.log("📦 WEBHOOK RECEIVED:", {
      suite_id: payload.suite_id,
      total_tests: payload.test_results?.length,
      tests_with_case_id: payload.test_results?.filter((r) => r.test_case_id)
        .length,
      sample: payload.test_results?.[0],
    });

    const { data: suite, error: suiteError } = await supabase
      .from("suites")
      .select("id, user_id, total_automation_runs")
      .eq("id", payload.suite_id)
      .eq("user_id", profile.id)
      .single();

    if (suiteError || !suite) {
      console.error("Suite verification failed:", suiteError);
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

    // ✅ CHECK FOR ERRORS IMMEDIATELY AFTER INSERT
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

    console.log("✅ AUTOMATION RUN CREATED:", {
      id: automationRun.id,
      run_number: automationRun.run_number,
    });

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
      console.error("Failed to update suite pass rate:", passRateError);
    }

    // ============================================================================
    // CREATE TEST EXECUTIONS
    // ============================================================================
    const executions = payload.test_results.map((r) => {
      const testFramework = r.framework || framework;
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
        test_case_id: r.test_case_id || null,
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
        session_id: null, // ✅ NULL for automated tests (FK to test_run_sessions)
        automation_session_id: payload.session_id, // ✅ NEW: Store automation session
        automation_run_id: automationRun.id,
        total_tests: payload.metadata.total_tests,
        passed_tests: payload.metadata.passed_tests,
        failed_tests: payload.metadata.failed_tests,
        skipped_tests: payload.metadata.skipped_tests,
      };
    });
    console.log("📝 CREATING TEST EXECUTIONS:", {
      count: executions.length,
      automation_run_id: automationRun.id,
      sample: executions[0],
    });

    if (executions.length > 0) {
      const { data: insertedExecs, error: execError } = await supabase
        .from("test_executions")
        .insert(executions)
        .select(); // ✅ Get back inserted records

      if (execError) {
        console.error("❌ FAILED TO INSERT TEST EXECUTIONS:", {
          error: execError,
          message: execError.message,
          code: execError.code,
        });
        // Don't return error - automation_run was created successfully
      } else {
        console.log("✅ INSERTED TEST EXECUTIONS:", insertedExecs?.length);
      }
    } else {
      console.warn("⚠️  NO EXECUTIONS TO INSERT");
    }

    return NextResponse.json({
      success: true,
      automation_run_id: automationRun.id,
      run_number: runNumber,
      executions_saved: executions.length,
      message: `Saved ${framework} automation run #${runNumber} with ${executions.length} test results`,
    });
  } catch (error) {
    console.error("❌ WEBHOOK ERROR:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
