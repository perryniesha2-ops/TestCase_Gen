import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

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
    .select(
      "id, project_id, integration_type, display_name, sync_enabled, status, created_at, config",
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (projectId) q = q.eq("project_id", projectId);

  const { data, error } = await q;

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ integrations: data ?? [] });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));

  const integration_id = body?.integration_id;
  const integration_type = String(body?.integration_type ?? "");
  const project_id = body?.project_id ? String(body.project_id) : null;
  const config = body?.config ?? null;

  if (!integration_type) {
    return NextResponse.json(
      { error: "integration_type is required" },
      { status: 400 },
    );
  }
  if (!project_id) {
    return NextResponse.json(
      { error: "project_id is required" },
      { status: 400 },
    );
  }
  if (!config || typeof config !== "object") {
    return NextResponse.json({ error: "config is required" }, { status: 400 });
  }

  const display_name =
    integration_type === "jira"
      ? "Jira"
      : integration_type === "testrail"
        ? "TestRail"
        : integration_type;

  const sync_enabled = Boolean(body?.auto_sync ?? body?.sync_enabled ?? false);

  if (integration_id) {
    const { data, error } = await supabase
      .from("integrations")
      .update({
        sync_enabled,
        config,
      })
      .eq("id", integration_id)
      .eq("user_id", user.id)
      .select(
        "id, project_id, integration_type, display_name, sync_enabled, status, created_at, config",
      )
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json(
        {
          error:
            "Integration not found or you don't have permission to update it",
        },
        { status: 404 },
      );
    }

    return NextResponse.json({ integration: data }, { status: 200 });
  }

  const { data, error } = await supabase
    .from("integrations")
    .insert({
      user_id: user.id,
      project_id,
      integration_type,
      display_name,
      sync_enabled,
      status: "active",
      config,
    })
    .select(
      "id, project_id, integration_type, display_name, sync_enabled, status, created_at, config",
    )
    .maybeSingle();

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ integration: data }, { status: 200 });
}
