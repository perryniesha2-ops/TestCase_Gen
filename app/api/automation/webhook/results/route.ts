// /app/api/automation/webhook/results/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

interface TestResultPayload {
    suite_id: string;
    session_id: string;
    test_results: Array<{
        test_case_id: string | null;
        execution_status: 'passed' | 'failed' | 'skipped';
        started_at: string;
        completed_at: string;
        duration_minutes: number;
        execution_notes: string | null;
        failure_reason: string | null;
        stack_trace: string | null;
        browser: string;
        os_version: string;
        test_environment: string;
        playwright_version: string;
    }>;
    metadata: {
        total_tests: number;
        passed_tests: number;
        failed_tests: number;
        skipped_tests: number;
        overall_status: 'passed' | 'failed';
    };
}

export async function POST(req: Request) {
    try {
        const authHeader = req.headers.get("Authorization");
        if (!authHeader?.startsWith("Bearer ")) {
            return NextResponse.json(
                { error: "Missing or invalid authorization header" },
                { status: 401 }
            );
        }

        const apiKey = authHeader.substring(7);

        // Create service role client to bypass RLS for API key verification
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!,
            {
                auth: {
                    autoRefreshToken: false,
                    persistSession: false
                }
            }
        );

        // Verify API key (id IS the user_id in user_profiles)
        const { data: profile, error: profileError } = await supabase
            .from("user_profiles")
            .select("id")  // ✅ Changed from "id, user_id" to just "id"
            .eq("api_key", apiKey)
            .single();

        if (profileError || !profile) {
            console.error("API key verification failed:", profileError);
            return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
        }

        const payload: TestResultPayload = await req.json();

        // Verify suite belongs to user (use profile.id as the user_id)
        const { data: suite, error: suiteError } = await supabase
            .from("test_suites")
            .select("id, user_id")
            .eq("id", payload.suite_id)
            .eq("user_id", profile.id)  // ✅ Changed from profile.user_id to profile.id
            .single();

        if (suiteError || !suite) {
            console.error("Suite verification failed:", suiteError);
            return NextResponse.json(
                { error: "Suite not found or access denied" },
                { status: 404 }
            );
        }

        // Map status for existing table
        const mapStatus = (status: string) => {
            if (status === 'passed') return 'passed';
            if (status === 'failed') return 'failed';
            if (status === 'skipped') return 'skipped';
            return 'failed';
        };

        // Create execution record (suite-level)
        const { data: execution, error: execError } = await supabase
            .from("test_executions")
            .insert({
                user_id: profile.id,        // ✅ Changed from profile.user_id
                executed_by: profile.id,    // ✅ Changed from profile.user_id
                suite_id: payload.suite_id,
                test_case_id: null,
                execution_type: 'automated',
                execution_status: mapStatus(payload.metadata.overall_status),
                started_at: payload.test_results[0]?.started_at || new Date().toISOString(),
                completed_at: new Date().toISOString(),
                duration_minutes: Math.round(payload.test_results.reduce((sum, r) => sum + r.duration_minutes, 0)),                test_environment: payload.test_results[0]?.test_environment || 'local',
                browser: payload.test_results[0]?.browser || 'chromium',
                os_version: payload.test_results[0]?.os_version || null,
                playwright_version: payload.test_results[0]?.playwright_version || null,
                total_tests: payload.metadata.total_tests,
                passed_tests: payload.metadata.passed_tests,
                failed_tests: payload.metadata.failed_tests,
                skipped_tests: payload.metadata.skipped_tests,
            })
            .select()
            .single();

        if (execError || !execution) {
            console.error("Failed to create execution:", execError);
            return NextResponse.json(
                { error: "Failed to save execution" },
                { status: 500 }
            );
        }

        // Save individual test results to test_results table
        const results = payload.test_results
            .filter(r => r.test_case_id)
            .map(r => ({
                execution_id: execution.id,
                test_case_id: r.test_case_id,
                status: mapStatus(r.execution_status),
                duration_ms: Math.round(r.duration_minutes * 60 * 1000),
                error_message: r.failure_reason,
                stack_trace: r.stack_trace,
            }));

        if (results.length > 0) {
            const { error: resultsError } = await supabase
                .from("test_results")
                .insert(results);

            if (resultsError) {
                console.error("Failed to save test results:", resultsError);
            }
        }

        return NextResponse.json({
            success: true,
            execution_id: execution.id,
            results_saved: results.length,
            message: `Saved automated execution with ${results.length} test results`,
        });

    } catch (error) {
        console.error("Webhook error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}