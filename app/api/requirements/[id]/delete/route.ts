import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isUuid(v: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    v
  );
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await ctx.params;

    if (!id || !isUuid(id)) {
      return NextResponse.json(
        { error: "Invalid requirement id" },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();

    if (authErr || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Optional: ownership verification (recommended if you store user_id on requirements)
    const { data: existing, error: readErr } = await supabase
      .from("requirements")
      .select("id, user_id")
      .eq("id", id)
      .maybeSingle();

    if (readErr)
      return NextResponse.json({ error: readErr.message }, { status: 500 });
    if (!existing)
      return NextResponse.json(
        { error: "Requirement not found" },
        { status: 404 }
      );
    if ((existing as any).user_id && (existing as any).user_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { error: delErr } = await supabase
      .from("requirements")
      .delete()
      .eq("id", id);
    if (delErr)
      return NextResponse.json({ error: delErr.message }, { status: 500 });

    return NextResponse.json(
      { ok: true, id },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Unexpected error" },
      { status: 500 }
    );
  }
}
