// app/api/templates/route.ts
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

export async function GET(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();

  if (authErr || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const scope = url.searchParams.get("scope") ?? "my";
  const projectId = url.searchParams.get("projectId") || null;

  let query = supabase
    .from("test_case_templates")
    .select(
      "id,user_id,project_id,name,description,category,template_content,test_types,is_public,is_favorite,usage_count,last_used_at,created_at,updated_at",
    )
    .order("created_at", { ascending: false });

  if (scope === "public") {
    query = query.eq("is_public", true).neq("user_id", user.id);
  } else {
    query = query.eq("user_id", user.id);
  }

  // Apply optional project filter
  if (projectId) {
    query = query.eq("project_id", projectId);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ templates: data ?? [] });
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();

  if (authErr || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));

  const name = String(body?.name ?? "").trim();
  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const category = body?.category ?? "functional";
  if (!VALID_CATEGORIES.includes(category)) {
    return NextResponse.json({ error: "Invalid category" }, { status: 400 });
  }

  const testTypes = Array.isArray(body?.test_types) ? body.test_types : [];

  const { data: template, error } = await supabase
    .from("test_case_templates")
    .insert({
      user_id: user.id,
      name,
      description: body?.description ? String(body.description).trim() : null,
      category,
      template_content: body?.template_content ?? {},
      test_types: testTypes,
      project_id: body?.project_id || null,
      is_public: Boolean(body?.is_public ?? false),
      is_favorite: Boolean(body?.is_favorite ?? false),
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ template }, { status: 201 });
}
