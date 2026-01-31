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
      `,
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (generationId) tcQuery = tcQuery.eq("generation_id", generationId);
    if (projectId) tcQuery = tcQuery.eq("project_id", projectId);

    const { data: testCases, error: tcErr } = await tcQuery;
    if (tcErr) {
      return NextResponse.json({ error: tcErr.message }, { status: 500 });
    }

    // 3) Cross-platform test cases - FIXED: Removed trailing comma and extra whitespace
    let crossPlatformQuery = supabase
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
        project_id,
        created_at,
        projects (id, name, color, icon)
      `,
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (projectId) {
      crossPlatformQuery = crossPlatformQuery.eq("project_id", projectId);
    }

    const { data: rawCrossPlatformCases, error: cpErr } =
      await crossPlatformQuery;

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

    // 6) Latest execution status map (single query via view)
    const regularIds = (testCases ?? []).map((t: any) => t.id);
    const crossIds = (rawCrossPlatformCases ?? []).map((t: any) => t.id);
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

      if (sessionId) {
        // If your view contains session_id, you can filter here.
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
      testCases: testCases ?? [],
      crossPlatformCases: rawCrossPlatformCases ?? [],
      currentSession,
      executionByCaseId,
      projects: projects ?? [],
      generations: generations ?? [],
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Unexpected error" },
      { status: 500 },
    );
  }
}
