// app/api/requirements/overview/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

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

    const { searchParams } = new URL(req.url);

    const page = clamp(Number(searchParams.get("page") || 1), 1, 10_000);
    const pageSize = clamp(Number(searchParams.get("pageSize") || 10), 1, 100);

    const q = (searchParams.get("q") || "").trim();
    const project = (searchParams.get("project") || "").trim();
    const status = (searchParams.get("status") || "all").trim();
    const priority = (searchParams.get("priority") || "all").trim();

    const sort = (searchParams.get("sort") || "created_at").trim();
    const dir =
      (searchParams.get("dir") || "desc").trim().toLowerCase() === "asc"
        ? "asc"
        : "desc";

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    // 1) Base requirements query (single paginated query)
    // IMPORTANT: include "count: exact" so we can compute total pages without a second call.
    let queryBuilder = supabase
      .from("requirements")
      .select(
        `
          id,
          user_id,
          project_id,
          title,
          description,
          type,
          priority,
          status,
          external_id,
          coverage_percentage,
          created_at,
          updated_at,
          projects:project_id(id, name, color, icon)
        `,
        { count: "exact" }
      )
      .eq("user_id", user.id);

    if (project) queryBuilder = queryBuilder.eq("project_id", project);
    if (status !== "all") queryBuilder = queryBuilder.eq("status", status);
    if (priority !== "all")
      queryBuilder = queryBuilder.eq("priority", priority);

    // Simple text search (safe default). If you later add FTS, we can swap this.
    if (q) {
      // title OR description OR external_id
      // Note: "or" syntax is PostgREST. This works in Supabase.
      queryBuilder = queryBuilder.or(
        `title.ilike.%${q}%,description.ilike.%${q}%,external_id.ilike.%${q}%`
      );
    }

    // Sorting (whitelist to avoid accidental invalid columns)
    const allowedSort = new Set([
      "created_at",
      "updated_at",
      "priority",
      "status",
      "title",
    ]);
    const sortCol = allowedSort.has(sort) ? sort : "created_at";

    const {
      data: rows,
      error: reqErr,
      count,
    } = await queryBuilder
      .order(sortCol, { ascending: dir === "asc" })
      .range(from, to);

    if (reqErr) {
      return NextResponse.json({ error: reqErr.message }, { status: 500 });
    }

    const requirements = rows ?? [];
    const totalCount = count ?? 0;

    if (requirements.length === 0) {
      return NextResponse.json({
        requirements: [],
        page,
        pageSize,
        totalCount,
      });
    }

    // 2) Aggregate test_case_count per requirement (single query)
    const requirementIds = requirements.map((r: any) => r.id);

    const { data: links, error: linksErr } = await supabase
      .from("requirement_test_cases")
      .select("requirement_id, test_case_id")
      .in("requirement_id", requirementIds);

    if (linksErr) {
      return NextResponse.json({ error: linksErr.message }, { status: 500 });
    }

    const testCountByReq: Record<string, number> = {};
    for (const row of links ?? []) {
      const rid = row.requirement_id as string;
      testCountByReq[rid] = (testCountByReq[rid] ?? 0) + 1;
    }

    // 3) Merge counts into requirements
    const enriched = requirements.map((r: any) => ({
      ...r,
      test_case_count: testCountByReq[r.id] ?? 0,
      // If coverage_percentage is stored in requirements table, we keep it.
      // If it's null, set 0 so the UI doesn't break.
      coverage_percentage:
        typeof r.coverage_percentage === "number" ? r.coverage_percentage : 0,
    }));

    return NextResponse.json({
      requirements: enriched,
      page,
      pageSize,
      totalCount,
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Unexpected error" },
      { status: 500 }
    );
  }
}
