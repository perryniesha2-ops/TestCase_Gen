import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type IdRow = { project_id: string | null };

function countIdsByProject(rows: IdRow[] | null | undefined) {
  const map: Record<string, number> = {};
  for (const r of rows ?? []) {
    if (!r.project_id) continue;
    map[r.project_id] = (map[r.project_id] ?? 0) + 1;
  }
  return map;
}

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();

    if (authErr || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 1) Base projects
    const { data: projects, error: projErr } = await supabase
      .from("projects")
      .select(
        "id, user_id, name, description, status, color, icon, start_date, target_end_date, actual_end_date, tags, created_at, updated_at",
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (projErr) {
      return NextResponse.json({ error: projErr.message }, { status: 500 });
    }

    const projectIds = (projects ?? []).map((p: any) => p.id);
    if (projectIds.length === 0) {
      return NextResponse.json({ projects: [] });
    }

    // 2) Count related rows with *IDs-only* queries (3 queries total)
    // NOTE: this is equivalent to "group by project_id" but done in Node.
    const [
      { data: suiteRows, error: suitesErr },
      { data: reqRows, error: reqErr },
      { data: tmplRows, error: tmplErr },
    ] = await Promise.all([
      supabase
        .from("test_suites")
        .select("project_id")
        .in("project_id", projectIds),

      supabase
        .from("requirements")
        .select("project_id")
        .in("project_id", projectIds),

      supabase
        .from("test_case_templates")
        .select("project_id")
        .in("project_id", projectIds),
    ]);

    if (suitesErr)
      return NextResponse.json({ error: suitesErr.message }, { status: 500 });
    if (reqErr)
      return NextResponse.json({ error: reqErr.message }, { status: 500 });
    if (tmplErr)
      return NextResponse.json({ error: tmplErr.message }, { status: 500 });

    const suitesByProject = countIdsByProject(suiteRows as any);
    const reqByProject = countIdsByProject(reqRows as any);
    const tmplByProject = countIdsByProject(tmplRows as any);

    const out = (projects ?? []).map((p: any) => ({
      ...p,
      test_suites_count: suitesByProject[p.id] ?? 0,
      requirements_count: reqByProject[p.id] ?? 0,
      templates_count: tmplByProject[p.id] ?? 0,
      test_cases_count: 0, // keep stable for now
    }));

    return NextResponse.json({ projects: out });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Unexpected error" },
      { status: 500 },
    );
  }
}
