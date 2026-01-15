import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();

    if (authErr || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 1) base suites + projects
    const { data: suites, error: suitesErr } = await supabase
      .from("test_suites")
      .select(
        `
        *,
        projects:project_id(id, name, color, icon)
      `
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (suitesErr) {
      return NextResponse.json({ error: suitesErr.message }, { status: 500 });
    }

    const suiteIds = (suites ?? []).map((s: any) => s.id);

    // If no suites, return quickly
    if (suiteIds.length === 0) {
      return NextResponse.json({ suites: [] });
    }

    // 2) counts per suite (single query)
    const { data: suiteCases, error: casesErr } = await supabase
      .from("test_suite_cases")
      .select("suite_id, test_case_id")
      .in("suite_id", suiteIds);

    if (casesErr) {
      return NextResponse.json({ error: casesErr.message }, { status: 500 });
    }

    // 3) eligible (has steps) - single query using join
    // This matches your current eligibility logic: test_cases.test_steps length > 0
    const { data: suiteCaseWithSteps, error: stepsErr } = await supabase
      .from("test_suite_cases")
      .select(
        `
        suite_id,
        test_case_id,
        test_cases:test_case_id(id, test_steps)
      `
      )
      .in("suite_id", suiteIds);

    if (stepsErr) {
      return NextResponse.json({ error: stepsErr.message }, { status: 500 });
    }

    // 4) execution stats per suite (single query)
    // We count all executions associated with suite_id
    const { data: executions, error: execErr } = await supabase
      .from("test_executions")
      .select("suite_id, execution_status")
      .in("suite_id", suiteIds);

    if (execErr) {
      return NextResponse.json({ error: execErr.message }, { status: 500 });
    }

    // Build maps
    const countBySuite: Record<string, number> = {};
    for (const row of suiteCases ?? []) {
      countBySuite[row.suite_id] = (countBySuite[row.suite_id] ?? 0) + 1;
    }

    const statsBySuite: Record<
      string,
      {
        total: number;
        passed: number;
        failed: number;
        skipped: number;
        blocked: number;
      }
    > = {};

    for (const row of executions ?? []) {
      const sid = row.suite_id as string;
      if (!sid) continue;

      const s = (statsBySuite[sid] ??= {
        total: 0,
        passed: 0,
        failed: 0,
        skipped: 0,
        blocked: 0,
      });

      s.total += 1;
      if (row.execution_status === "passed") s.passed += 1;
      else if (row.execution_status === "failed") s.failed += 1;
      else if (row.execution_status === "skipped") s.skipped += 1;
      else if (row.execution_status === "blocked") s.blocked += 1;
    }

    // 5) Compose response: keep suite list stable for UI
    const suitesOut = (suites ?? []).map((suite: any) => {
      const test_case_count = countBySuite[suite.id] ?? 0;

      return {
        ...suite,
        test_case_count,
        execution_stats: statsBySuite[suite.id] ?? {
          total: 0,
          passed: 0,
          failed: 0,
          skipped: 0,
          blocked: 0,
        },
      };
    });

    return NextResponse.json({ suites: suitesOut });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Unexpected error" },
      { status: 500 }
    );
  }
}
