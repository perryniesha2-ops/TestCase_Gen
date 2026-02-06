// app/api/requirements/list/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function toInt(v: string | null, fallback: number) {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

function clampString(s: string | null, maxLen: number) {
  const t = (s ?? "").trim();
  return t.length > maxLen ? t.slice(0, maxLen) : t;
}

type ProjectRow = { id: string; name: string; color: string; icon: string };

type RequirementRow = {
  id: string;
  title: string;
  description: string | null;
  type: string | null;
  external_id: string | null;
  acceptance_criteria: unknown | null;
  priority: string | null;
  status: string | null;
  source: string | null;
  project_id: string | null;
  created_at: string;
  updated_at: string;
  projects?: ProjectRow | ProjectRow[] | null;
};

type LinkRow = {
  requirement_id: string;
  test_case_id: string | null;
  platform_test_case_id: string | null;
};

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

    const projectId = clampString(url.searchParams.get("projectId"), 64) ?? "";
    const status = clampString(url.searchParams.get("status"), 50) || "all";
    const priority = clampString(url.searchParams.get("priority"), 20) || "all";
    const q = clampString(url.searchParams.get("q"), 120) ?? "";

    const page = toInt(url.searchParams.get("page"), 1);
    const pageSize = Math.min(toInt(url.searchParams.get("pageSize"), 10), 100);

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    // 1) requirements page query
    let qb = supabase
      .from("requirements")
      .select(
        `
          id,
          title,
          description,
          type,
          external_id,
          acceptance_criteria,
          priority,
          status,
          source,
          project_id,
          created_at,
          updated_at,
          projects:project_id(id, name, color, icon)
        `,
        { count: "estimated" },
      )
      .eq("user_id", user.id);

    if (projectId) qb = qb.eq("project_id", projectId);
    if (status !== "all") qb = qb.eq("status", status);
    if (priority !== "all") qb = qb.eq("priority", priority);

    if (q) {
      const pattern = `%${q}%`;
      qb = qb.or(
        `title.ilike.${pattern},description.ilike.${pattern},external_id.ilike.${pattern}`,
      );
    }

    const {
      data: rows,
      error: reqErr,
      count,
    } = await qb.order("created_at", { ascending: false }).range(from, to);

    if (reqErr) {
      return NextResponse.json({ error: reqErr.message }, { status: 500 });
    }

    const requirements = (rows ?? []) as RequirementRow[];

    // Fast return
    const totalCount = count ?? 0;
    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
    const hasNextPage = page < totalPages;

    if (requirements.length === 0) {
      return NextResponse.json(
        {
          requirements: [],
          totalCount,
          totalPages,
          hasNextPage,
          page,
          pageSize,
        },
        { headers: { "Cache-Control": "no-store" } },
      );
    }

    // 2) load link rows for these requirements (counts for BOTH types)
    const requirementIds = requirements.map((r) => r.id);

    const { data: links, error: linksErr } = await supabase
      .from("requirement_test_cases")
      .select("requirement_id,test_case_id,platform_test_case_id")
      .in("requirement_id", requirementIds);

    if (linksErr) {
      return NextResponse.json({ error: linksErr.message }, { status: 500 });
    }

    const regularCountByReq: Record<string, number> = {};
    const platformCountByReq: Record<string, number> = {};

    for (const l of (links ?? []) as LinkRow[]) {
      const rid = l.requirement_id;
      if (l.test_case_id) {
        regularCountByReq[rid] = (regularCountByReq[rid] ?? 0) + 1;
      }
      if (l.platform_test_case_id) {
        platformCountByReq[rid] = (platformCountByReq[rid] ?? 0) + 1;
      }
    }

    // 3) enrich requirements
    const enriched = requirements.map((r) => {
      const regular = regularCountByReq[r.id] ?? 0;
      const platform = platformCountByReq[r.id] ?? 0;
      const total = regular + platform;

      return {
        ...r,
        regular_test_case_count: regular,
        platform_test_case_count: platform,
        test_case_count: total,
      };
    });

    return NextResponse.json(
      {
        requirements: enriched,
        totalCount,
        totalPages,
        hasNextPage,
        page,
        pageSize,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Unexpected error" },
      { status: 500 },
    );
  }
}
