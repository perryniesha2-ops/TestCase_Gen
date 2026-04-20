// app/api/suites/list/route.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();

  if (authErr || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const projectId = url.searchParams.get("projectId") || null;
  const kind = url.searchParams.get("kind") || null;
  const status = url.searchParams.get("status") || null;

  let query = supabase
    .from("suites")
    .select("id, name, suite_type, kind, status, created_at, project_id")
    .eq("user_id", user.id)
    .order("name");

  if (projectId) query = query.eq("project_id", projectId);
  if (kind) query = query.eq("kind", kind);
  if (status) query = query.eq("status", status);

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ suites: data ?? [] });
}
