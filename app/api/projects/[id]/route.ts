import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;

  const supabase = await createClient();
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();

  if (authErr || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));

  const update: Record<string, any> = {};
  if (body.name !== undefined) update.name = String(body.name).trim();
  if (body.description !== undefined)
    update.description = body.description || null;
  if (body.status !== undefined) update.status = body.status;
  if (body.color !== undefined) update.color = body.color;
  if (body.icon !== undefined) update.icon = body.icon;
  if (body.start_date !== undefined)
    update.start_date = body.start_date || null;
  if (body.target_end_date !== undefined)
    update.target_end_date = body.target_end_date || null;

  if (update.name !== undefined && !update.name) {
    return NextResponse.json(
      { error: "Name cannot be empty" },
      { status: 400 },
    );
  }

  const { error } = await supabase
    .from("projects")
    .update(update)
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;

  const supabase = await createClient();
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();

  if (authErr || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 1) Verify the project belongs to the user (optional but clearer errors)
  const { data: project, error: projErr } = await supabase
    .from("projects")
    .select("id")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (projErr) {
    return NextResponse.json({ error: projErr.message }, { status: 500 });
  }
  if (!project) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // 2) Delete integrations that reference this project (prevents FK violation)
  const { error: integErr } = await supabase
    .from("integrations")
    .delete()
    .eq("project_id", id);

  if (integErr) {
    return NextResponse.json({ error: integErr.message }, { status: 500 });
  }

  // 3) Delete the project
  const { error } = await supabase
    .from("projects")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
