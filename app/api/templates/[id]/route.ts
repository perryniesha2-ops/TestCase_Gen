// app/api/templates/[id]/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID_CATEGORIES = [
  "functional",
  "security",
  "performance",
  "integration",
  "regression",
  "accessibility",
  "other",
] as const;

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

  if (authErr || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const update: Record<string, any> = {};

  if (body.name !== undefined) {
    const name = String(body.name).trim();
    if (!name) {
      return NextResponse.json(
        { error: "Name cannot be empty" },
        { status: 400 },
      );
    }
    update.name = name;
  }

  if (body.description !== undefined) {
    update.description = body.description
      ? String(body.description).trim()
      : null;
  }

  if (body.category !== undefined) {
    if (!VALID_CATEGORIES.includes(body.category)) {
      return NextResponse.json({ error: "Invalid category" }, { status: 400 });
    }
    update.category = body.category;
  }

  if (body.template_content !== undefined) {
    update.template_content = body.template_content;
  }

  // test_types was missing from original PATCH — now included
  if (body.test_types !== undefined) {
    update.test_types = Array.isArray(body.test_types) ? body.test_types : [];
  }

  if (body.is_public !== undefined) {
    update.is_public = Boolean(body.is_public);
  }

  if (body.is_favorite !== undefined) {
    update.is_favorite = Boolean(body.is_favorite);
  }

  if (body.project_id !== undefined) {
    update.project_id = body.project_id || null;
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json(
      { error: "No valid fields to update" },
      { status: 400 },
    );
  }

  // Always stamp updated_at
  update.updated_at = new Date().toISOString();

  const { error } = await supabase
    .from("test_case_templates")
    .update(update)
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

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

  if (authErr || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { error } = await supabase
    .from("test_case_templates")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
