import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth/api-auth";

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

function jsonError(message: string, status = 500, details?: unknown) {
  return NextResponse.json(
    { error: message, details: details ?? null },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export async function GET(req: Request) {
  const { user, response } = await requireAuth();
  if (response) return response;

  try {
    const supabase = await createClient();
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

    // All four queries run in parallel
    const [projectsRes, requirementsRes, profileRes, templatesRes] =
      await Promise.all([
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
          .from("user_profiles")
          .select("preferences")
          .eq("id", user.id)
          .maybeSingle(),

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

    if (projectsRes.error) return jsonError(projectsRes.error.message, 500);
    if (requirementsRes.error)
      return jsonError(requirementsRes.error.message, 500);
    if (profileRes.error) return jsonError(profileRes.error.message, 500);
    if (templatesRes.error) return jsonError(templatesRes.error.message, 500);

    const defaults = profileRes.data?.preferences?.test_case_defaults ?? null;

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
