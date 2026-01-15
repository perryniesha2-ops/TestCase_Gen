import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function toInt(v: string | null, fallback: number) {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

function clampString(s: string, maxLen: number) {
  const t = (s ?? "").trim();
  return t.length > maxLen ? t.slice(0, maxLen) : t;
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

    const url = new URL(req.url);

    const projectId = url.searchParams.get("projectId") || "";
    const status = url.searchParams.get("status") || "all";
    const priority = url.searchParams.get("priority") || "all";
    const q = clampString(url.searchParams.get("q") || "", 120);

    const page = toInt(url.searchParams.get("page"), 1);
    const pageSize = Math.min(toInt(url.searchParams.get("pageSize"), 10), 100);

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
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
        { count: "estimated" }
      )
      .eq("user_id", user.id);

    if (projectId) query = query.eq("project_id", projectId);
    if (status !== "all") query = query.eq("status", status);
    if (priority !== "all") query = query.eq("priority", priority);

    if (q) {
      const pattern = `%${q}%`;
      query = query.or(
        `title.ilike.${pattern},description.ilike.${pattern},external_id.ilike.${pattern}`
      );
    }

    const { data, error, count } = await query
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const totalCount = count ?? 0;
    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
    const hasNextPage = page < totalPages;

    return NextResponse.json(
      {
        requirements: data ?? [],
        totalCount,
        totalPages,
        hasNextPage,
        page,
        pageSize,
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Unexpected error" },
      { status: 500 }
    );
  }
}
