// app/api/test-sessions/[sessionId]/executions/[executionId]/attachments/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ─── GET /api/test-sessions/[sessionId]/executions/[executionId]/attachments ─
// Returns all attachments for a specific execution.

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ sessionId: string; executionId: string }> },
) {
  const { sessionId, executionId } = await ctx.params;

  const supabase = await createClient();
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();
  if (authErr || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify session belongs to user
  const { data: session } = await supabase
    .from("test_run_sessions")
    .select("id")
    .eq("id", sessionId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  // Verify execution belongs to session
  const { data: execution } = await supabase
    .from("test_executions")
    .select("id")
    .eq("id", executionId)
    .eq("session_id", sessionId)
    .maybeSingle();

  if (!execution) {
    return NextResponse.json({ error: "Execution not found" }, { status: 404 });
  }

  const { data, error } = await supabase
    .from("test_attachments")
    .select("*")
    .eq("execution_id", executionId)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ attachments: data ?? [] });
}
