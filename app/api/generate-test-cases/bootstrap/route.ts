import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth/api-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function toInt(v: string | null, fallback: number) {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

function jsonError(message: string, status = 500, details?: unknown) {
  return NextResponse.json(
    { error: message, details: details ?? null },
    { status, headers: { "Cache-Control": "no-store" } }
  );
}

export async function GET(req: Request) {
  const { user, response } = await requireAuth();
  if (response) return response;

  try {
    const supabase = await createClient();

    const url = new URL(req.url);

    const requirementsLimit = toInt(
      url.searchParams.get("requirementsLimit"),
      200
    );
    const templatesLimit = toInt(url.searchParams.get("templatesLimit"), 200);

    // If you want archived projects hidden by default:
    const includeArchivedProjects =
      url.searchParams.get("projectsIncludeArchived") === "true";

    const projectsQuery = supabase
      .from("projects")
      .select("id, name, color, icon, status")
      .eq("user_id", user.id)
      .order("name");

    const projectsRes = includeArchivedProjects
      ? await projectsQuery
      : await projectsQuery.neq("status", "archived");

    // Fetch remaining items in parallel
    const [requirementsRes, profileRes, templatesRes] = await Promise.all([
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
          "id, name, description, category, template_content, is_favorite, usage_count, project_id, last_used_at"
        )
        .eq("user_id", user.id)
        .order("is_favorite", { ascending: false })
        .order("usage_count", { ascending: false })
        .limit(templatesLimit),
    ]);

    // projectsRes is awaited above
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
        templates: templatesRes.data ?? [], // ✅ IMPORTANT (missing before)
        defaults, // { model, count, coverage } if present
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (e: any) {
    return jsonError(e?.message ?? "Unexpected error", 500);
  }
}
