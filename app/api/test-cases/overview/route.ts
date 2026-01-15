// app/api/test-cases/overview/route.ts
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

    const url = new URL(req.url);
    const generationId = url.searchParams.get("generation");
    const sessionId = url.searchParams.get("session");
    const projectId = url.searchParams.get("project");

    // 1) Projects (toolbar)
    const { data: projects, error: projErr } = await supabase
      .from("projects")
      .select("id, name, color, icon")
      .eq("user_id", user.id)
      .order("name");

    if (projErr) {
      return NextResponse.json({ error: projErr.message }, { status: 500 });
    }

    // 2) Regular test cases (return full fields needed by runner)
    let tcQuery = supabase
      .from("test_cases")
      .select(
        `
        id,
        generation_id,
        title,
        description,
        test_type,
        priority,
        preconditions,
        test_steps,
        expected_result,
        is_edge_case,
        status,
        created_at,
        updated_at,
        project_id,
        projects:project_id(id, name, color, icon)
      `
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (generationId) tcQuery = tcQuery.eq("generation_id", generationId);
    if (projectId) tcQuery = tcQuery.eq("project_id", projectId);

    const { data: testCases, error: tcErr } = await tcQuery;
    if (tcErr) {
      return NextResponse.json({ error: tcErr.message }, { status: 500 });
    }

    // 3) Cross-platform test cases (platform_test_cases joined to suites)
    // Note: project filtering for cross-platform depends on your schema.
    // If your suites have project_id, you can filter via the joined suite.
    const { data: crossPlatformCases, error: cpErr } = await supabase
      .from("platform_test_cases")
      .select(
        `
        id,
        suite_id,
        platform,
        framework,
        title,
        description,
        preconditions,
        steps,
        expected_results,
        automation_hints,
        priority,
        status,
        created_at,
        cross_platform_test_suites!inner(
          id,
          requirement,
          user_id,
          platforms,
          generated_at
        )
      `
      )
      .eq("cross_platform_test_suites.user_id", user.id)
      .order("created_at", { ascending: false });

    if (cpErr) {
      return NextResponse.json({ error: cpErr.message }, { status: 500 });
    }

    // 4) Session header (optional)
    let currentSession: any = null;
    if (sessionId) {
      const { data: s, error: sErr } = await supabase
        .from("test_run_sessions")
        .select("id, name, environment, status")
        .eq("id", sessionId)
        .single();

      if (!sErr) currentSession = s;
    }

    // 5) Generations (optional, but keeps old UI compatible)
    const { data: generations, error: genErr } = await supabase
      .from("test_case_generations")
      .select("id, title")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (genErr) {
      return NextResponse.json({ error: genErr.message }, { status: 500 });
    }

    // 6) Cross-platform suites map (optional, keeps old UI compatible)
    const { data: suites, error: suitesErr } = await supabase
      .from("cross_platform_test_suites")
      .select("id, requirement, platforms, generated_at")
      .eq("user_id", user.id)
      .order("generated_at", { ascending: false });

    if (suitesErr) {
      return NextResponse.json({ error: suitesErr.message }, { status: 500 });
    }

    // 7) Latest execution status map (single query via view)
    const regularIds = (testCases ?? []).map((t: any) => t.id);
    const crossIds = (crossPlatformCases ?? []).map((t: any) => t.id);
    const ids = [...regularIds, ...crossIds];

    const executionByCaseId: Record<
      string,
      { status: string; executed_at?: string | null }
    > = {};

    if (ids.length > 0) {
      let exQuery = supabase
        .from("v_test_case_latest_execution")
        .select("test_case_id, execution_status, executed_at")
        .in("test_case_id", ids);

      // If your view already filters by session, ignore this.
      // If it doesn't, and you want session-scoped "latest", you should implement
      // a session-specific view or switch to a query against test_executions.
      if (sessionId) {
        // If your view contains session_id, you can filter here.
        // Otherwise do nothing.
        // exQuery = exQuery.eq("session_id", sessionId);
      }

      const { data: rows, error: exErr } = await exQuery;

      if (exErr) {
        return NextResponse.json({ error: exErr.message }, { status: 500 });
      }

      for (const r of rows ?? []) {
        executionByCaseId[r.test_case_id] = {
          status: r.execution_status,
          executed_at: r.executed_at,
        };
      }
    }

    return NextResponse.json({
      projects: projects ?? [],
      testCases: testCases ?? [],
      crossPlatformCases: crossPlatformCases ?? [],
      currentSession,
      executionByCaseId,

      generations: generations ?? [],
      crossPlatformSuites: suites ?? [],
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Unexpected error" },
      { status: 500 }
    );
  }
}
