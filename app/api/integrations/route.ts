import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  const projectId = url.searchParams.get("project_id");

  let q = supabase
    .from("integrations")
    // do NOT return config (contains secrets)
    .select(
      "id, project_id, integration_type, display_name, sync_enabled, status, created_at"
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (projectId) q = q.eq("project_id", projectId);

  const { data, error } = await q;
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ integrations: data ?? [] });
}
