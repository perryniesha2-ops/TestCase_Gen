// app/api/test-cases/[testCaseId]/versions/[versionId]/restore/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ─── POST /api/test-cases/[testCaseId]/versions/[versionId]/restore ──────────
// Restores the test case to the state captured in the given version.
// Does NOT auto-snapshot before restoring — the UI warns the user and
// they can manually save a version first if they want.

export async function POST(
  _req: Request,
  ctx: { params: Promise<{ testCaseId: string; versionId: string }> },
) {
  const { testCaseId, versionId } = await ctx.params;

  const supabase = await createClient();
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();
  if (authErr || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify test case ownership
  const { data: tc } = await supabase
    .from("test_cases")
    .select("id")
    .eq("id", testCaseId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!tc) {
    return NextResponse.json({ error: "Test case not found" }, { status: 404 });
  }

  // Fetch the version (RLS ensures it belongs to this user's test case)
  const { data: version, error: vErr } = await supabase
    .from("test_case_versions")
    .select(
      "title, description, preconditions, test_steps, expected_result, priority, status",
    )
    .eq("id", versionId)
    .eq("test_case_id", testCaseId)
    .maybeSingle();

  if (vErr || !version) {
    return NextResponse.json({ error: "Version not found" }, { status: 404 });
  }

  // Apply the version's snapshot back to the live test case
  const { data: updated, error: updateErr } = await supabase
    .from("test_cases")
    .update({
      title: version.title,
      description: version.description,
      preconditions: version.preconditions,
      test_steps: version.test_steps,
      expected_result: version.expected_result,
      priority: version.priority,
      status: version.status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", testCaseId)
    .eq("user_id", user.id)
    .select()
    .single();

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  return NextResponse.json({ testCase: updated });
}
