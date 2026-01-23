import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;

  const supabase = await createClient();
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();
  if (authErr || !user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));

  // Only allow safe fields
  const update: Record<string, any> = {};
  if (body.name !== undefined) update.name = String(body.name).trim();
  if (body.description !== undefined)
    update.description = body.description
      ? String(body.description).trim()
      : null;
  if (body.category !== undefined) update.category = body.category;
  if (body.template_content !== undefined)
    update.template_content = body.template_content;
  if (body.is_public !== undefined) update.is_public = Boolean(body.is_public);
  if (body.is_favorite !== undefined)
    update.is_favorite = Boolean(body.is_favorite);

  if (update.name !== undefined && !update.name) {
    return NextResponse.json(
      { error: "Name cannot be empty" },
      { status: 400 },
    );
  }

  // Ownership enforced here
  const { error } = await supabase
    .from("test_case_templates")
    .update(update)
    .eq("id", id)
    .eq("user_id", user.id);

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}

export async function DELETE(
  _: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;

  const supabase = await createClient();
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();
  if (authErr || !user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { error } = await supabase
    .from("test_case_templates")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
