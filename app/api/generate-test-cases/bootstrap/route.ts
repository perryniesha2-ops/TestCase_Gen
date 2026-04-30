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

    // ── Short-circuit: requirements-only mode ─────────────────────────────────
    // Used by pages that only need the requirements list (e.g. cross-platform
    // generator). Skips the projects, templates, and preferences queries entirely.
    const requirementsOnly =
      url.searchParams.get("requirementsOnly") === "true";

    const requirementsLimit = toInt(
      url.searchParams.get("requirementsLimit"),
      LIMITS.requirements.default,
      LIMITS.requirements.min,
      LIMITS.requirements.max,
    );

    if (requirementsOnly) {
      const { data, error } = await supabase
        .from("requirements")
        .select(
          "id, title, description, acceptance_criteria, type, priority, status, project_id",
        )
        .eq("user_id", user.id)
        .neq("status", "archived")
        .order("title", { ascending: true })
        .limit(requirementsLimit);

      if (error) return jsonError(error.message);

      return NextResponse.json(
        {
          projects: [],
          requirements: data ?? [],
          templates: [],
          defaults: null,
        },
        { headers: { "Cache-Control": "no-store" } },
      );
    }

    const templatesLimit = toInt(
      url.searchParams.get("templatesLimit"),
      LIMITS.templates.default,
      LIMITS.templates.min,
      LIMITS.templates.max,
    );
    const includeArchivedProjects =
      url.searchParams.get("projectsIncludeArchived") === "true";

    // ── All queries run in parallel ───────────────────────────────────────────
    const [projectsRes, requirementsRes, templatesRes, profileRes] =
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
          .from("test_case_templates")
          .select(
            "id, name, description, category, template_content, is_favorite, usage_count, project_id, last_used_at",
          )
          .eq("user_id", user.id)
          .order("is_favorite", { ascending: false })
          .order("usage_count", { ascending: false })
          .limit(templatesLimit),

        supabase
          .from("user_profiles")
          .select("preferences")
          .eq("id", user.id)
          .maybeSingle(),
      ]);

    if (projectsRes.error) return jsonError(projectsRes.error.message);
    if (requirementsRes.error) return jsonError(requirementsRes.error.message);
    if (templatesRes.error) return jsonError(templatesRes.error.message);
    // profileRes failure is non-fatal — defaults gracefully to null

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
