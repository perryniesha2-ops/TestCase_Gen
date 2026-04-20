// app/api/generate-test-cases/bootstrap/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ─── Constants ────────────────────────────────────────────────────────────────

const LIMITS = {
  requirements: { default: 200, min: 1, max: 1000 },
  templates: { default: 200, min: 1, max: 1000 },
} as const;

// ─── Utilities ────────────────────────────────────────────────────────────────

function toInt(
  v: string | null,
  fallback: number,
  min: number,
  max: number,
): number {
  const n = Number(v);
  if (!Number.isFinite(n) || n < min) return fallback;
  return Math.min(Math.floor(n), max);
}

function jsonError(message: string, status = 500) {
  return NextResponse.json(
    { error: message },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export async function GET(req: Request) {
  // Single auth call via createClient — no separate requireAuth needed
  const supabase = await createClient();
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();

  if (authErr || !user) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    const url = new URL(req.url);

    const requirementsLimit = toInt(
      url.searchParams.get("requirementsLimit"),
      LIMITS.requirements.default,
      LIMITS.requirements.min,
      LIMITS.requirements.max,
    );
    const templatesLimit = toInt(
      url.searchParams.get("templatesLimit"),
      LIMITS.templates.default,
      LIMITS.templates.min,
      LIMITS.templates.max,
    );
    const includeArchivedProjects =
      url.searchParams.get("projectsIncludeArchived") === "true";

    // ── All queries run in parallel ───────────────────────────────────────────
    // Note: user_profiles preferences are returned by /api/auth/me and stored
    // in the auth context. If test_case_defaults is needed here, add
    // `preferences` to the /api/auth/me response and remove the profile query.
    const [projectsRes, requirementsRes, templatesRes] = await Promise.all([
      includeArchivedProjects
        ? supabase
            .from("projects")
            .select("id, name, color, icon, status")
            .eq("user_id", user.id)
            .order("name")
        : supabase
            .from("projects")
            .select("id, name, color, icon, status")
            .eq("user_id", user.id)
            .neq("status", "archived")
            .order("name"),

      supabase
        .from("requirements")
        .select("id, title, description, type, priority, status, project_id")
        .eq("user_id", user.id)
        .neq("status", "archived")
        .order("title", { ascending: true })
        .limit(requirementsLimit),

      supabase
        .from("test_case_templates")
        .select(
          "id, name, description, category, template_content, is_favorite, usage_count, project_id, last_used_at",
        )
        .eq("user_id", user.id)
        .order("is_favorite", { ascending: false })
        .order("usage_count", { ascending: false })
        .limit(templatesLimit),
    ]);

    if (projectsRes.error) return jsonError(projectsRes.error.message);
    if (requirementsRes.error) return jsonError(requirementsRes.error.message);
    if (templatesRes.error) return jsonError(templatesRes.error.message);

    // ── Fetch preferences separately — small query, not on critical path ──────
    // This is kept here until preferences are added to /api/auth/me.
    // Once preferences are in the auth context, remove this query and
    // read defaults from useAuth() on the client instead.
    const { data: profileData } = await supabase
      .from("user_profiles")
      .select("preferences")
      .eq("id", user.id)
      .maybeSingle();

    const defaults = profileData?.preferences?.test_case_defaults ?? null;

    return NextResponse.json(
      {
        projects: projectsRes.data ?? [],
        requirements: requirementsRes.data ?? [],
        templates: templatesRes.data ?? [],
        defaults,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unexpected error";
    return jsonError(message, 500);
  }
}
