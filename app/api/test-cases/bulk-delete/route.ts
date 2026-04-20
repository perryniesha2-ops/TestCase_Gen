// app/api/test-cases/bulk-delete/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ─── POST /api/test-cases/bulk-delete ────────────────────────────────────────
// Body: { regularIds: string[], crossIds: string[] }
//
// Cascades deletions in dependency order for both test case types.
// Each type is handled independently so a failure in one doesn't
// block the other from being reported accurately.

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();

    if (authErr || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const regularIds: string[] = Array.isArray(body.regularIds)
      ? body.regularIds
      : [];
    const crossIds: string[] = Array.isArray(body.crossIds)
      ? body.crossIds
      : [];

    if (regularIds.length + crossIds.length === 0) {
      return NextResponse.json({ error: "No IDs provided" }, { status: 400 });
    }

    // Verify ownership before deleting — only delete IDs that belong to this user
    if (regularIds.length > 0) {
      const { data: owned } = await supabase
        .from("test_cases")
        .select("id")
        .in("id", regularIds)
        .eq("user_id", user.id);

      const ownedIds = (owned ?? []).map((r) => r.id);
      const unauthorized = regularIds.filter((id) => !ownedIds.includes(id));
      if (unauthorized.length > 0) {
        return NextResponse.json(
          { error: "Unauthorized: some test cases do not belong to you" },
          { status: 403 },
        );
      }
    }

    if (crossIds.length > 0) {
      const { data: owned } = await supabase
        .from("platform_test_cases")
        .select("id")
        .in("id", crossIds)
        .eq("user_id", user.id);

      const ownedIds = (owned ?? []).map((r) => r.id);
      const unauthorized = crossIds.filter((id) => !ownedIds.includes(id));
      if (unauthorized.length > 0) {
        return NextResponse.json(
          {
            error:
              "Unauthorized: some platform test cases do not belong to you",
          },
          { status: 403 },
        );
      }
    }

    const errors: string[] = [];

    // ── Regular test cases ────────────────────────────────────────────────────
    if (regularIds.length > 0) {
      // Cascade in dependency order
      const steps: Array<{ table: string; column: string }> = [
        { table: "test_attachments", column: "test_case_id" },
        { table: "requirement_test_cases", column: "test_case_id" },
        { table: "test_executions", column: "test_case_id" },
        { table: "suite_items", column: "test_case_id" },
      ];

      for (const { table, column } of steps) {
        const { error } = await supabase
          .from(table)
          .delete()
          .in(column, regularIds);
        if (error) {
          console.warn(
            `[bulk-delete] ${table}.${column} cleanup failed:`,
            error.message,
          );
          // Non-fatal — continue to attempt main delete
        }
      }

      const { error } = await supabase
        .from("test_cases")
        .delete()
        .in("id", regularIds)
        .eq("user_id", user.id);

      if (error) errors.push(`test_cases: ${error.message}`);
    }

    // ── Cross-platform test cases ──────────────────────────────────────────────
    if (crossIds.length > 0) {
      const steps: Array<{ table: string; column: string }> = [
        { table: "test_attachments", column: "platform_test_case_id" },
        { table: "requirement_platform_test_cases", column: "test_case_id" },
        { table: "test_executions", column: "platform_test_case_id" },
        { table: "suite_items", column: "platform_test_case_id" },
      ];

      for (const { table, column } of steps) {
        const { error } = await supabase
          .from(table)
          .delete()
          .in(column, crossIds);
        if (error) {
          console.warn(
            `[bulk-delete] ${table}.${column} cleanup failed:`,
            error.message,
          );
        }
      }

      const { error } = await supabase
        .from("platform_test_cases")
        .delete()
        .in("id", crossIds)
        .eq("user_id", user.id);

      if (error) errors.push(`platform_test_cases: ${error.message}`);
    }

    if (errors.length > 0) {
      return NextResponse.json({ error: errors.join("; ") }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      deleted: regularIds.length + crossIds.length,
    });
  } catch (e: any) {
    console.error("[bulk-delete] Unexpected error:", e);
    return NextResponse.json(
      { error: e?.message ?? "Unexpected error" },
      { status: 500 },
    );
  }
}
