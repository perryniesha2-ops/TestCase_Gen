// app/api/requirements/[requirementId]/links/route.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ─── Shared auth + ownership check ───────────────────────────────────────────

async function resolveRequirement(requirementId: string) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();

  if (authErr || !user) {
    return { error: "Unauthorized", status: 401, supabase, user: null };
  }

  const { data: req, error: reqErr } = await supabase
    .from("requirements")
    .select("id")
    .eq("id", requirementId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (reqErr)
    return { error: reqErr.message, status: 500, supabase, user: null };
  if (!req)
    return {
      error: "Requirement not found",
      status: 404,
      supabase,
      user: null,
    };

  return { error: null, status: 200, supabase, user };
}

// ─── GET /api/requirements/[requirementId]/links ──────────────────────────────

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ requirementId: string }> },
) {
  const { requirementId } = await ctx.params;
  const { error, status, supabase, user } =
    await resolveRequirement(requirementId);
  if (error || !user) return NextResponse.json({ error }, { status });

  const [regularRes, platformRes] = await Promise.all([
    supabase
      .from("requirement_test_cases")
      .select(
        `
        id,
        requirement_id,
        test_case_id,
        coverage_type,
        created_at,
        test_cases (
          id,
          title,
          test_type,
          priority,
          status
        )
      `,
      )
      .eq("requirement_id", requirementId),

    supabase
      .from("requirement_platform_test_cases")
      .select(
        `
        id,
        requirement_id,
        test_case_id,
        coverage_type,
        created_at,
        platform_test_cases (
          id,
          title,
          platform,
          framework,
          priority,
          status
        )
      `,
      )
      .eq("requirement_id", requirementId),
  ]);

  if (regularRes.error) {
    return NextResponse.json(
      { error: regularRes.error.message },
      { status: 500 },
    );
  }
  if (platformRes.error) {
    return NextResponse.json(
      { error: platformRes.error.message },
      { status: 500 },
    );
  }

  const regularLinks = (regularRes.data ?? []).map((link: any) => ({
    id: link.id,
    requirement_id: link.requirement_id,
    test_case_id: link.test_case_id,
    coverage_type: link.coverage_type,
    test_case_type: "regular" as const,
    created_at: link.created_at,
    test_case_title: link.test_cases?.title ?? null,
    test_case_test_type: link.test_cases?.test_type ?? null,
    test_case_priority: link.test_cases?.priority ?? null,
    test_case_platform: null,
    test_case_framework: null,
  }));

  const platformLinks = (platformRes.data ?? []).map((link: any) => ({
    id: link.id,
    requirement_id: link.requirement_id,
    test_case_id: link.test_case_id,
    coverage_type: link.coverage_type,
    test_case_type: "cross-platform" as const,
    created_at: link.created_at,
    test_case_title: link.platform_test_cases?.title ?? null,
    test_case_platform: link.platform_test_cases?.platform ?? null,
    test_case_framework: link.platform_test_cases?.framework ?? null,
    test_case_priority: link.platform_test_cases?.priority ?? null,
    test_case_test_type: null,
  }));

  return NextResponse.json({ links: [...regularLinks, ...platformLinks] });
}

// ─── POST /api/requirements/[requirementId]/links ─────────────────────────────

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ requirementId: string }> },
) {
  const { requirementId } = await ctx.params;
  const { error, status, supabase, user } =
    await resolveRequirement(requirementId);
  if (error || !user) return NextResponse.json({ error }, { status });

  const body = await req.json().catch(() => ({}));
  const links: Array<{
    test_case_id: string;
    test_case_type: "regular" | "cross-platform";
    coverage_type?: string;
  }> = body.links ?? [];

  if (!Array.isArray(links) || links.length === 0) {
    return NextResponse.json(
      { error: "links array is required" },
      { status: 400 },
    );
  }

  const validCoverage = ["direct", "indirect", "negative"];
  for (const link of links) {
    if (link.coverage_type && !validCoverage.includes(link.coverage_type)) {
      return NextResponse.json(
        { error: `Invalid coverage_type: ${link.coverage_type}` },
        { status: 400 },
      );
    }
  }

  const regularLinks = links.filter((l) => l.test_case_type === "regular");
  const platformLinks = links.filter(
    (l) => l.test_case_type === "cross-platform",
  );
  const errors: string[] = [];

  if (regularLinks.length > 0) {
    const { error } = await supabase.from("requirement_test_cases").insert(
      regularLinks.map((l) => ({
        requirement_id: requirementId,
        test_case_id: l.test_case_id,
        coverage_type: l.coverage_type ?? "direct",
      })),
    );
    if (error) errors.push(error.message);
  }

  if (platformLinks.length > 0) {
    const { error } = await supabase
      .from("requirement_platform_test_cases")
      .insert(
        platformLinks.map((l) => ({
          requirement_id: requirementId,
          test_case_id: l.test_case_id,
          coverage_type: l.coverage_type ?? "direct",
        })),
      );
    if (error) errors.push(error.message);
  }

  if (errors.length > 0) {
    return NextResponse.json({ error: errors.join("; ") }, { status: 500 });
  }

  return NextResponse.json({ success: true, linked: links.length });
}
