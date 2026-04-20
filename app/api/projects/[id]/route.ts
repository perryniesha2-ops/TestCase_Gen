// app/api/projects/[id]/route.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ─── Validation constants ─────────────────────────────────────────────────────

const VALID_STATUSES = ["active", "archived", "completed", "on_hold"] as const;
const VALID_COLORS = [
  "blue",
  "green",
  "purple",
  "orange",
  "red",
  "pink",
  "indigo",
  "yellow",
  "gray",
] as const;
const VALID_ICONS = [
  "folder",
  "smartphone",
  "code",
  "shield",
  "globe",
  "database",
  "cloud",
  "rocket",
  "package",
  "terminal",
] as const;

// ─── Shared auth + ownership check ───────────────────────────────────────────

async function resolveProject(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();

  if (authErr || !user)
    return {
      error: "Unauthorized",
      status: 401,
      supabase,
      user: null,
      project: null,
    };

  const { data: project, error: projErr } = await supabase
    .from("projects")
    .select("id, user_id")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (projErr)
    return {
      error: projErr.message,
      status: 500,
      supabase,
      user,
      project: null,
    };
  if (!project)
    return { error: "Not found", status: 404, supabase, user, project: null };

  return { error: null, status: 200, supabase, user, project };
}

// ─── GET ──────────────────────────────────────────────────────────────────────

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const url = new URL(req.url);
  const days = Math.max(
    1,
    Math.min(365, Number(url.searchParams.get("days") ?? 30)),
  );

  const { error, status, supabase, project } = await resolveProject(id);
  if (error || !project) {
    return NextResponse.json({ error }, { status });
  }

  // Fetch project row + all RPCs in parallel — fully independent
  const [
    projectRowRes,
    dashboardRes,
    suiteStatsRes,
    recentExecsRes,
    timelineRes,
    problemTestsRes,
  ] = await Promise.all([
    supabase
      .from("projects")
      .select(
        "id,user_id,name,description,status,color,icon,created_at,updated_at",
      )
      .eq("id", id)
      .eq("user_id", project.user_id)
      .single(),
    supabase.rpc("project_dashboard", { p_project_id: id, p_days: days }),
    supabase.rpc("project_suites_summary", { p_project_id: id }),
    supabase.rpc("project_recent_executions", {
      p_project_id: id,
      p_limit: 20,
    }),
    supabase.rpc("project_execution_timeline", {
      p_project_id: id,
      p_days: days,
    }),
    supabase.rpc("project_top_problem_tests", {
      p_project_id: id,
      p_days: days,
      p_limit: 10,
    }),
  ]);

  if (dashboardRes.error) {
    return NextResponse.json(
      { error: dashboardRes.error.message },
      { status: 400 },
    );
  }

  return NextResponse.json({
    project: projectRowRes.data ?? null,
    dashboard: dashboardRes.data,
    suites: suiteStatsRes.data ?? [],
    recent_executions: recentExecsRes.data ?? [],
    timeline: timelineRes.data ?? [],
    problem_tests: problemTestsRes.data ?? [],
  });
}

// ─── PATCH ────────────────────────────────────────────────────────────────────

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;

  const { error, status, supabase, user, project } = await resolveProject(id);
  if (error || !project || !user) {
    return NextResponse.json({ error }, { status });
  }

  const body = await req.json().catch(() => ({}));
  const update: Record<string, any> = {};

  // Name
  if (body.name !== undefined) {
    const name = String(body.name).trim();
    if (!name)
      return NextResponse.json(
        { error: "Name cannot be empty" },
        { status: 400 },
      );
    update.name = name;
  }

  // Description
  if (body.description !== undefined) {
    update.description = body.description || null;
  }

  // Status — whitelist
  if (body.status !== undefined) {
    if (!VALID_STATUSES.includes(body.status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }
    update.status = body.status;
  }

  // Color — whitelist
  if (body.color !== undefined) {
    if (!VALID_COLORS.includes(body.color)) {
      return NextResponse.json({ error: "Invalid color" }, { status: 400 });
    }
    update.color = body.color;
  }

  // Icon — whitelist
  if (body.icon !== undefined) {
    if (!VALID_ICONS.includes(body.icon)) {
      return NextResponse.json({ error: "Invalid icon" }, { status: 400 });
    }
    update.icon = body.icon;
  }

  // Dates
  if (body.start_date !== undefined)
    update.start_date = body.start_date || null;
  if (body.target_end_date !== undefined)
    update.target_end_date = body.target_end_date || null;

  if (Object.keys(update).length === 0) {
    return NextResponse.json(
      { error: "No valid fields to update" },
      { status: 400 },
    );
  }

  update.updated_at = new Date().toISOString();

  const { error: updateErr } = await supabase
    .from("projects")
    .update(update)
    .eq("id", id)
    .eq("user_id", user.id);

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

// ─── DELETE ───────────────────────────────────────────────────────────────────

export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;

  const { error, status, supabase, user, project } = await resolveProject(id);
  if (error || !project || !user) {
    return NextResponse.json({ error }, { status });
  }

  // Delete integrations linked to this project first (prevents FK violation)
  const { error: integErr } = await supabase
    .from("integrations")
    .delete()
    .eq("project_id", id);

  if (integErr) {
    return NextResponse.json({ error: integErr.message }, { status: 500 });
  }

  // Delete the project — RLS + eq user_id ensures ownership
  const { error: deleteErr } = await supabase
    .from("projects")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (deleteErr) {
    return NextResponse.json({ error: deleteErr.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
