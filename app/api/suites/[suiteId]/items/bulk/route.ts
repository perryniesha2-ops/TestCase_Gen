// app/api/suites/[suiteId]/items/bulk/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ─── POST /api/suites/[suiteId]/items/bulk ────────────────────────────────────
// Body: { regularIds: string[], crossIds: string[] }
//
// Adds test cases to a suite. Sequence order is computed server-side
// using MAX(sequence_order) to avoid the race condition that occurs
// when two clients read the same max and produce duplicate order values.

export async function POST(
  req: Request,
  ctx: { params: Promise<{ suiteId: string }> },
) {
  try {
    const { suiteId } = await ctx.params;
    const supabase = await createClient();
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();

    if (authErr || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify suite belongs to user
    const { data: suite, error: suiteErr } = await supabase
      .from("suites")
      .select("id")
      .eq("id", suiteId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (suiteErr) {
      return NextResponse.json({ error: suiteErr.message }, { status: 500 });
    }
    if (!suite) {
      return NextResponse.json({ error: "Suite not found" }, { status: 404 });
    }

    const body = await req.json().catch(() => ({}));
    const regularIds: string[] = Array.isArray(body.regularIds)
      ? body.regularIds
      : [];
    const crossIds: string[] = Array.isArray(body.crossIds)
      ? body.crossIds
      : [];
    const total = regularIds.length + crossIds.length;

    if (total === 0) {
      return NextResponse.json({ error: "No IDs provided" }, { status: 400 });
    }

    // Get current max sequence_order server-side — eliminates race condition
    const { data: maxRow } = await supabase
      .from("suite_items")
      .select("sequence_order")
      .eq("suite_id", suiteId)
      .order("sequence_order", { ascending: false })
      .limit(1)
      .maybeSingle();

    const baseOrder = maxRow?.sequence_order ?? 0;

    const rows = [
      ...regularIds.map((testCaseId, index) => ({
        suite_id: suiteId,
        test_case_id: testCaseId,
        platform_test_case_id: null,
        sequence_order: baseOrder + index + 1,
        priority: "medium",
        estimated_duration_minutes: 5,
      })),
      ...crossIds.map((platformTestCaseId, index) => ({
        suite_id: suiteId,
        test_case_id: null,
        platform_test_case_id: platformTestCaseId,
        sequence_order: baseOrder + regularIds.length + index + 1,
        priority: "medium",
        estimated_duration_minutes: 5,
      })),
    ];

    const { error } = await supabase.from("suite_items").insert(rows);

    if (error) {
      // Unique constraint — some cases already in suite
      if (error.code === "23505") {
        return NextResponse.json(
          {
            error: "Some test cases are already in this suite",
            code: "duplicate",
          },
          { status: 409 },
        );
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, added: total });
  } catch (e: any) {
    console.error("[suite-items-bulk] Unexpected error:", e);
    return NextResponse.json(
      { error: e?.message ?? "Unexpected error" },
      { status: 500 },
    );
  }
}
