// app/api/test-cases/[testCaseId]/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ─── GET /api/test-cases/[testCaseId] ────────────────────────────────────────

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ testCaseId: string }> },
) {
  const { testCaseId } = await ctx.params;
  const supabase = await createClient();
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();
  if (authErr || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: regularCase, error: regularError } = await supabase
    .from("test_cases")
    .select(
      `
      id, generation_id, title, description, test_type, priority, status,
      preconditions, test_steps, expected_result, created_at, updated_at,
      execution_status, is_edge_case, is_negative_test, is_security_test,
      is_boundary_test, project_id, projects (id, name, color, icon)
    `,
    )
    .eq("id", testCaseId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (regularError)
    return NextResponse.json({ error: regularError.message }, { status: 500 });

  if (regularCase) {
    return NextResponse.json({
      testCase: {
        ...regularCase,
        projects: Array.isArray(regularCase.projects)
          ? (regularCase.projects[0] ?? null)
          : regularCase.projects,
      },
      caseType: "regular",
    });
  }

  const { data: platformCase, error: platformError } = await supabase
    .from("platform_test_cases")
    .select(
      `
      id, suite_id, platform, framework, title, description, preconditions,
      steps, expected_results, automation_hints, priority, execution_status,
      created_at, updated_at, approved_at, approved_by, automation_metadata,
      status, project_id, projects (id, name, color, icon)
    `,
    )
    .eq("id", testCaseId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (platformError)
    return NextResponse.json({ error: platformError.message }, { status: 500 });

  if (platformCase) {
    return NextResponse.json({
      testCase: {
        ...platformCase,
        projects: Array.isArray(platformCase.projects)
          ? (platformCase.projects[0] ?? null)
          : platformCase.projects,
      },
      caseType: "cross-platform",
    });
  }

  return NextResponse.json({ error: "Test case not found" }, { status: 404 });
}

// ─── DELETE /api/test-cases/[testCaseId] ─────────────────────────────────────

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ testCaseId: string }> },
) {
  const { testCaseId } = await ctx.params;
  const supabase = await createClient();
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();
  if (authErr || !user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: regularCase } = await supabase
    .from("test_cases")
    .select("id")
    .eq("id", testCaseId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (regularCase) {
    for (const { table, column } of [
      { table: "test_attachments", column: "test_case_id" },
      { table: "requirement_test_cases", column: "test_case_id" },
      { table: "test_executions", column: "test_case_id" },
      { table: "suite_items", column: "test_case_id" },
    ]) {
      await supabase.from(table).delete().eq(column, testCaseId);
    }
    const { error } = await supabase
      .from("test_cases")
      .delete()
      .eq("id", testCaseId)
      .eq("user_id", user.id);
    if (error)
      return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  const { data: platformCase } = await supabase
    .from("platform_test_cases")
    .select("id")
    .eq("id", testCaseId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!platformCase)
    return NextResponse.json({ error: "Test case not found" }, { status: 404 });

  for (const { table, column } of [
    { table: "test_attachments", column: "platform_test_case_id" },
    { table: "requirement_platform_test_cases", column: "test_case_id" },
    { table: "test_executions", column: "platform_test_case_id" },
    { table: "suite_items", column: "platform_test_case_id" },
  ]) {
    await supabase.from(table).delete().eq(column, testCaseId);
  }
  const { error } = await supabase
    .from("platform_test_cases")
    .delete()
    .eq("id", testCaseId)
    .eq("user_id", user.id);
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}

// ─── PATCH /api/test-cases/[testCaseId] ──────────────────────────────────────
// Updates fields on either test_cases or platform_test_cases.
// Handles both content edits and status updates from the same endpoint.

export async function PATCH(
  request: Request,
  ctx: { params: Promise<{ testCaseId: string }> },
) {
  const { testCaseId } = await ctx.params;
  const supabase = await createClient();
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();
  if (authErr || !user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();

  // ── Regular test case ───────────────────────────────────────────────────────
  const { data: regularCase } = await supabase
    .from("test_cases")
    .select("id")
    .eq("id", testCaseId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (regularCase) {
    const ALLOWED_REGULAR = [
      "title",
      "description",
      "preconditions",
      "test_steps",
      "expected_result",
      "priority",
      "status",
      "is_edge_case",
      "is_negative_test",
      "is_security_test",
      "is_boundary_test",
    ] as const;

    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    for (const key of ALLOWED_REGULAR) {
      if (key in body) updates[key] = body[key];
    }

    const { data, error } = await supabase
      .from("test_cases")
      .update(updates)
      .eq("id", testCaseId)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error)
      return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ testCase: data });
  }

  // ── Platform test case ──────────────────────────────────────────────────────
  const { data: platformCase } = await supabase
    .from("platform_test_cases")
    .select("id")
    .eq("id", testCaseId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!platformCase) {
    return NextResponse.json({ error: "Test case not found" }, { status: 404 });
  }

  const ALLOWED_PLATFORM = [
    "title",
    "description",
    "preconditions",
    "steps",
    "expected_results",
    "automation_hints",
    "priority",
    "status",
  ] as const;

  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  for (const key of ALLOWED_PLATFORM) {
    if (key in body) updates[key] = body[key];
  }

  const { data, error } = await supabase
    .from("platform_test_cases")
    .update(updates)
    .eq("id", testCaseId)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ testCase: data });
}
