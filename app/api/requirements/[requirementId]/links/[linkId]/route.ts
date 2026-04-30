// app/api/requirements/[requirementId]/links/[linkId]/route.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ─── DELETE /api/requirements/[requirementId]/links/[linkId] ─────────────────

export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ requirementId: string; linkId: string }> },
) {
  const { requirementId, linkId } = await ctx.params;

  const supabase = await createClient();
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();

  if (authErr || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify requirement belongs to user before deleting links
  const { data: req, error: reqErr } = await supabase
    .from("requirements")
    .select("id")
    .eq("id", requirementId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (reqErr) {
    return NextResponse.json({ error: reqErr.message }, { status: 500 });
  }
  if (!req) {
    return NextResponse.json(
      { error: "Requirement not found" },
      { status: 404 },
    );
  }

  // Try both tables — only one will have the row
  const [regularRes, platformRes] = await Promise.all([
    supabase
      .from("requirement_test_cases")
      .delete()
      .eq("id", linkId)
      .eq("requirement_id", requirementId),

    supabase
      .from("requirement_platform_test_cases")
      .delete()
      .eq("id", linkId)
      .eq("requirement_id", requirementId),
  ]);

  if (regularRes.error && platformRes.error) {
    return NextResponse.json(
      { error: regularRes.error.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true });
}
