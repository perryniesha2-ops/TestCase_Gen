// app/api/integrations/jira/issues/route.ts
//
// Returns all integration_issues for a given Jira integration,
// with the linked test case title resolved manually to avoid
// depending on Supabase FK relationships being defined.
//
// GET /api/integrations/jira/issues?integration_id=<id>

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth/api-auth";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const { user, response } = await requireAuth();
  if (response) return response;

  const supabase = await createClient();

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

  // Fetch integration_issues — no nested join, resolve titles separately
  const { data: issues, error: issuesError } = await supabase
    .from("integration_issues")
    .select(
      "id, execution_id, external_issue_id, external_issue_url, status, created_at, issue_type, metadata",
    )
    .eq("integration_id", integration_id)
    .order("created_at", { ascending: false })
    .limit(100);

  if (issuesError) {
    console.error("[jira/issues] DB error:", issuesError);
    return NextResponse.json({ error: issuesError.message }, { status: 500 });
  }

  if (!issues || issues.length === 0) {
    return NextResponse.json({ issues: [] });
  }

  // Resolve test case titles from executions
  const executionIds = issues
    .map((i) => i.execution_id)
    .filter(Boolean) as string[];
  const titleByExecutionId = new Map<string, string>();

  if (executionIds.length > 0) {
    const { data: executions } = await supabase
      .from("test_executions")
      .select("id, test_case_id, platform_test_case_id")
      .in("id", executionIds);

    if (executions && executions.length > 0) {
      const regularIds = [
        ...new Set(executions.map((e) => e.test_case_id).filter(Boolean)),
      ] as string[];
      const platformIds = [
        ...new Set(
          executions.map((e) => e.platform_test_case_id).filter(Boolean),
        ),
      ] as string[];

      const regularTitleMap = new Map<string, string>();
      const platformTitleMap = new Map<string, string>();

      if (regularIds.length > 0) {
        const { data: cases } = await supabase
          .from("test_cases")
          .select("id, title")
          .in("id", regularIds);
        (cases ?? []).forEach((c) => regularTitleMap.set(c.id, c.title));
      }

      if (platformIds.length > 0) {
        const { data: cases } = await supabase
          .from("platform_test_cases")
          .select("id, title")
          .in("id", platformIds);
        (cases ?? []).forEach((c) => platformTitleMap.set(c.id, c.title));
      }

      for (const exec of executions) {
        const title = exec.test_case_id
          ? regularTitleMap.get(exec.test_case_id)
          : platformTitleMap.get(exec.platform_test_case_id);
        if (title) titleByExecutionId.set(exec.id, title);
      }
    }
  }

  // Shape the response
  const shaped = issues.map((issue) => ({
    id: issue.id,
    external_issue_id: issue.external_issue_id,
    external_issue_url: issue.external_issue_url,
    status: issue.status,
    issue_type: issue.issue_type,
    metadata: issue.metadata,
    test_case_title: issue.execution_id
      ? (titleByExecutionId.get(issue.execution_id) ?? null)
      : null,
  }));

  return NextResponse.json({ issues: shaped });
}
