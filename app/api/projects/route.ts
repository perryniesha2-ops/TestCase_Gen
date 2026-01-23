import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

  const name = String(body.name ?? "").trim();
  if (!name) {
    return NextResponse.json(
      { error: "Name cannot be empty" },
      { status: 400 },
    );
  }

  const insert = {
    user_id: user.id,
    name,
    description: body.description ?? null,
    status: body.status ?? "active",
    color: body.color ?? "blue",
    icon: body.icon ?? "folder",
    start_date: body.start_date ?? null,
    target_end_date: body.target_end_date ?? null,
    tags: Array.isArray(body.tags) ? body.tags : [],
  };

  const { data, error } = await supabase
    .from("projects")
    .insert(insert)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ project: data }, { status: 201 });
}
