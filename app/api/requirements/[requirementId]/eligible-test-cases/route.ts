// app/api/requirements/[requirementId]/eligible-test-cases/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isUuid(s: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    s,
  );
}

function toInt(v: string | null, fallback: number) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.floor(n) : fallback;
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function clampString(s: string | null, maxLen: number) {
  const t = (s ?? "").trim();
  return t.length > maxLen ? t.slice(0, maxLen) : t;
}

type RegularCaseRow = {
  id: string;
  title: string;
  test_type: string | null;
  priority: string | null;
  status: string | null;
  created_at: string;
  updated_at: string | null;
  project_id: string | null;
  projects?: { id: string; name: string; color: string; icon: string } | null;
};

type PlatformCaseRow = {
  id: string;
  title: string;
  platform: string | null;
  framework: string | null;
  priority: string | null;
  status: string | null;
  created_at: string;
  updated_at: string | null;
  project_id: string | null;
  projects?: { id: string; name: string; color: string; icon: string } | null;
};

export async function GET(
  req: Request,
  { params }: { params: { requirementId: string } },
) {
  try {
    const requirementId = params.requirementId;

    if (!isUuid(requirementId)) {
      return NextResponse.json(
        { error: "Invalid requirementId" },
        { status: 400 },
      );
    }

    const supabase = await createClient();
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();

    if (authErr || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const projectId = clampString(url.searchParams.get("projectId"), 64);
    const status = clampString(url.searchParams.get("status"), 50) || "all";
    const priority = clampString(url.searchParams.get("priority"), 20) || "all";
    const q = clampString(url.searchParams.get("q"), 120);

    const limit = clamp(toInt(url.searchParams.get("limit"), 50), 1, 200);

    // 1) Find already-linked cases for this requirement (both types)
    const { data: links, error: linksErr } = await supabase
      .from("requirement_test_cases")
      .select("test_case_id, platform_test_case_id")
      .eq("requirement_id", requirementId);

    if (linksErr) {
      return NextResponse.json({ error: linksErr.message }, { status: 500 });
    }

    const linkedRegularIds = new Set<string>();
    const linkedPlatformIds = new Set<string>();

    for (const l of links ?? []) {
      if (l.test_case_id) linkedRegularIds.add(l.test_case_id);
      if (l.platform_test_case_id)
        linkedPlatformIds.add(l.platform_test_case_id);
    }

    // Helper for "NOT IN" using PostgREST syntax
    const notIn = (ids: Set<string>) => {
      if (ids.size === 0) return null;
      // PostgREST: not.in.(id1,id2)
      return `(${Array.from(ids).join(",")})`;
    };

    // 2) Query regular test cases
    let regularQ = supabase
      .from("test_cases")
      .select(
        `
        id,
        title,
        test_type,
        priority,
        status,
        created_at,
        updated_at,
        project_id,
        projects:project_id(id, name, color, icon)
      `,
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (projectId) regularQ = regularQ.eq("project_id", projectId);
    if (status !== "all") regularQ = regularQ.eq("status", status);
    if (priority !== "all") regularQ = regularQ.eq("priority", priority);

    if (q) {
      const pattern = `%${q}%`;
      regularQ = regularQ.or(`title.ilike.${pattern}`);
    }

    const regularNotIn = notIn(linkedRegularIds);
    if (regularNotIn) regularQ = regularQ.not("id", "in", regularNotIn);

    const { data: regular, error: regErr } = await regularQ;
    if (regErr) {
      return NextResponse.json({ error: regErr.message }, { status: 500 });
    }

    // 3) Query cross-platform test cases
    let platformQ = supabase
      .from("platform_test_cases")
      .select(
        `
        id,
        title,
        platform,
        framework,
        priority,
        status,
        created_at,
        updated_at,
        project_id,
        projects:project_id(id, name, color, icon)
      `,
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (projectId) platformQ = platformQ.eq("project_id", projectId);
    if (status !== "all") platformQ = platformQ.eq("status", status);
    if (priority !== "all") platformQ = platformQ.eq("priority", priority);

    if (q) {
      const pattern = `%${q}%`;
      platformQ = platformQ.or(`title.ilike.${pattern}`);
    }

    const platformNotIn = notIn(linkedPlatformIds);
    if (platformNotIn) platformQ = platformQ.not("id", "in", platformNotIn);

    const { data: crossPlatform, error: platErr } = await platformQ;
    if (platErr) {
      return NextResponse.json({ error: platErr.message }, { status: 500 });
    }

    // Add _caseType so your UI can render consistently
    const regularWithType = (regular ?? []).map((tc: any) => ({
      ...tc,
      _caseType: "regular" as const,
      projects: Array.isArray(tc.projects) ? tc.projects[0] : tc.projects,
    }));

    const crossWithType = (crossPlatform ?? []).map((tc: any) => ({
      ...tc,
      _caseType: "cross-platform" as const,
      projects: Array.isArray(tc.projects) ? tc.projects[0] : tc.projects,
    }));

    return NextResponse.json(
      {
        eligible: {
          regular: regularWithType as RegularCaseRow[],
          crossPlatform: crossWithType as PlatformCaseRow[],
        },
        counts: {
          regular: regularWithType.length,
          crossPlatform: crossWithType.length,
          total: regularWithType.length + crossWithType.length,
        },
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
