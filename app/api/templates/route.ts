import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
  const scope = url.searchParams.get("scope") ?? "my"; // "my" | "public"

  let query = supabase
    .from("test_case_templates")
    .select(
      "id,user_id,name,description,category,template_content,is_public,is_favorite,usage_count,last_used_at,created_at,updated_at",
    )
    .order("created_at", { ascending: false });

  if (scope === "public") {
    query = query.eq("is_public", true).neq("user_id", user.id);
  } else {
    query = query.eq("user_id", user.id);
  }

  const { data, error } = await query;
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ templates: data ?? [] });
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();
  if (authErr || !user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));

  const name = String(body?.name ?? "").trim();
  if (!name)
    return NextResponse.json({ error: "Name is required" }, { status: 400 });

  const template = {
    user_id: user.id,
    name,
    description: body?.description ? String(body.description).trim() : null,
    category: body?.category ?? "functional",
    template_content: body?.template_content ?? {},
    is_public: Boolean(body?.is_public ?? false),
    is_favorite: Boolean(body?.is_favorite ?? false),
  };

  const { error } = await supabase.from("test_case_templates").insert(template);
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
