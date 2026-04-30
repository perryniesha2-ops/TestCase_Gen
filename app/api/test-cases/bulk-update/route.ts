// app/api/test-cases/bulk-update/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ─── POST /api/test-cases/bulk-update ────────────────────────────────────────
// Body: {
//   regularIds: string[]
//   crossIds: string[]
//   updates: { status?, priority?, project_id? }
// }

const ALLOWED_FIELDS = new Set(["status", "priority", "project_id"]);
const VALID_STATUSES = new Set(["draft", "active", "archived"]);
const VALID_PRIORITIES = new Set(["low", "medium", "high", "critical"]);

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
    const rawUpdates: Record<string, unknown> = body.updates ?? {};

    if (regularIds.length + crossIds.length === 0) {
      return NextResponse.json({ error: "No IDs provided" }, { status: 400 });
    }

    // Whitelist only safe fields — never allow user_id, generation_id, etc.
    const patch: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(rawUpdates)) {
      if (!ALLOWED_FIELDS.has(key)) continue;
      if (key === "status" && !VALID_STATUSES.has(val as string)) continue;
      if (key === "priority" && !VALID_PRIORITIES.has(val as string)) continue;
      patch[key] = val;
    }

    if (Object.keys(patch).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update" },
        { status: 400 },
      );
    }

    patch.updated_at = new Date().toISOString();

    const errors: string[] = [];

    if (regularIds.length > 0) {
      const { error } = await supabase
        .from("test_cases")
        .update(patch)
        .in("id", regularIds)
        .eq("user_id", user.id); // ownership enforced server-side
      if (error) errors.push(`test_cases: ${error.message}`);
    }

    if (crossIds.length > 0) {
      const { error } = await supabase
        .from("platform_test_cases")
        .update(patch)
        .in("id", crossIds)
        .eq("user_id", user.id);
      if (error) errors.push(`platform_test_cases: ${error.message}`);
    }

    if (errors.length > 0) {
      return NextResponse.json({ error: errors.join("; ") }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      updated: regularIds.length + crossIds.length,
    });
  } catch (e: any) {
    console.error("[bulk-update] Unexpected error:", e);
    return NextResponse.json(
      { error: e?.message ?? "Unexpected error" },
      { status: 500 },
    );
  }
}
