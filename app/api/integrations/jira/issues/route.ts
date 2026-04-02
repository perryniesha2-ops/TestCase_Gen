// app/api/integrations/jira/issues/route.ts
//
// Returns all integration_issues for a given Jira integration,
// joined with the linked test execution and test case title.
//
// GET /api/integrations/jira/issues?integration_id=<id>

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  const integration_id = url.searchParams.get("integration_id");

  if (!integration_id) {
    return NextResponse.json(
      { error: "integration_id is required" },
      { status: 400 },
    );
  }

  // Verify the integration belongs to this user
  const { data: integration } = await supabase
    .from("integrations")
    .select("id")
    .eq("id", integration_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!integration) {
    return NextResponse.json(
      { error: "Integration not found" },
      { status: 404 },
    );
  }

  const { data: issues, error } = await supabase
    .from("integration_issues")
    .select(
      `
      id,
      external_issue_id,
      external_issue_url,
      status,
      issue_type,
      updated_at,
      metadata,
      test_executions (
        id,
        status,
        test_cases ( title )
      )
    `,
    )
    .eq("integration_id", integration_id)
    .order("updated_at", { ascending: false })
    .limit(100);

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ issues: issues ?? [] });
}
