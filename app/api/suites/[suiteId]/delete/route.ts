// app/api/suites/[suiteId]/delete/route.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

function extractSuiteIdFromUrl(req: Request): string | null {
  try {
    const { pathname } = new URL(req.url);
    // expected: /api/suites/<suiteId>/delete
    const parts = pathname.split("/").filter(Boolean);
    const suitesIdx = parts.indexOf("suites");
    const suiteId = suitesIdx >= 0 ? parts[suitesIdx + 1] : null;
    return suiteId && suiteId.trim().length > 0 ? suiteId.trim() : null;
  } catch {
    return null;
  }
}

async function getSuiteIdFromContext(ctx: unknown): Promise<string | null> {
  const paramsMaybe = (ctx as any)?.params;
  if (!paramsMaybe) return null;

  const params =
    typeof paramsMaybe?.then === "function" ? await paramsMaybe : paramsMaybe;
  const suiteId = params?.suiteId;
  return typeof suiteId === "string" && suiteId.trim().length > 0
    ? suiteId.trim()
    : null;
}

export async function DELETE(req: NextRequest, ctx: unknown) {
  try {
    const suiteId =
      (await getSuiteIdFromContext(ctx)) ?? extractSuiteIdFromUrl(req);

    if (!suiteId) {
      return NextResponse.json(
        { error: "Missing suiteId", debug: { url: req.url } },
        { status: 400 },
      );
    }

    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch suite to verify ownership and get suite kind
    const { data: suite, error: suiteErr } = await supabase
      .from("suites")
      .select("id, user_id, kind, name")
      .eq("id", suiteId)
      .maybeSingle();

    if (suiteErr) {
      return NextResponse.json(
        { error: "Failed to load suite", details: suiteErr.message },
        { status: 500 },
      );
    }

    if (!suite) {
      return NextResponse.json(
        { error: "Suite not found", suiteId },
        { status: 404 },
      );
    }

    if (suite.user_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Admin client (service role)
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !serviceKey) {
      return NextResponse.json(
        { error: "Server misconfigured (missing Supabase env)" },
        { status: 500 },
      );
    }

    const admin = createAdminClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Track what we're deleting for better logging
    const deleteStats = {
      suite_kind: suite.kind || "regular",
      suite_name: suite.name,
      executions_detached: 0,
      sessions_deleted: 0,
      regular_links_deleted: 0,
      platform_links_deleted: 0,
    };

    // 1) Detach executions so suite delete isn't blocked
    const { data: detachedExecs, error: detachExecErr } = await admin
      .from("test_executions")
      .update({ suite_id: null })
      .eq("suite_id", suiteId)
      .select("id");

    if (detachExecErr) {
      return NextResponse.json(
        {
          error: "Failed to detach executions",
          details: detachExecErr.message,
        },
        { status: 500 },
      );
    }

    deleteStats.executions_detached = detachedExecs?.length || 0;

    // 2) Delete suite run sessions
    const { data: deletedSessions, error: delSessionsErr } = await admin
      .from("test_run_sessions")
      .delete()
      .eq("suite_id", suiteId)
      .select("id");

    if (delSessionsErr) {
      return NextResponse.json(
        {
          error: "Failed to delete suite sessions",
          details: delSessionsErr.message,
        },
        { status: 500 },
      );
    }

    deleteStats.sessions_deleted = deletedSessions?.length || 0;

    // 3) Get counts of links before deletion (for logging)
    const { data: regularLinks } = await admin
      .from("suite_items")
      .select("id")
      .eq("suite_id", suiteId)
      .not("test_case_id", "is", null);

    const { data: platformLinks } = await admin
      .from("suite_items")
      .select("id")
      .eq("suite_id", suiteId)
      .not("platform_test_case_id", "is", null);

    deleteStats.regular_links_deleted = regularLinks?.length || 0;
    deleteStats.platform_links_deleted = platformLinks?.length || 0;

    // 4) Delete all suite-case links (handles both regular and cross-platform)
    const { error: delLinksErr } = await admin
      .from("suite_items")
      .delete()
      .eq("suite_id", suiteId);

    if (delLinksErr) {
      return NextResponse.json(
        { error: "Failed to delete suite links", details: delLinksErr.message },
        { status: 500 },
      );
    }

    // 5) Delete the suite itself
    const { error: delSuiteErr } = await admin
      .from("suites")
      .delete()
      .eq("id", suiteId);

    if (delSuiteErr) {
      return NextResponse.json(
        { error: "Failed to delete suite", details: delSuiteErr.message },
        { status: 500 },
      );
    }

    // 6) Confirm deletion was successful
    const { data: stillThere, error: confirmErr } = await admin
      .from("suites")
      .select("id")
      .eq("id", suiteId)
      .maybeSingle();

    if (confirmErr) {
      return NextResponse.json(
        {
          error: "Delete completed but confirmation failed",
          details: confirmErr.message,
        },
        { status: 500 },
      );
    }

    if (stillThere) {
      return NextResponse.json(
        { error: "Suite still exists after delete (no-op)", suiteId },
        { status: 500 },
      );
    }

    // Log deletion stats (helpful for debugging)
    console.log(`Suite deleted successfully:`, {
      suiteId,
      ...deleteStats,
    });

    return NextResponse.json({
      success: true,
      suiteId,
      deleted: deleteStats,
    });
  } catch (err) {
    console.error("suite delete route error:", err);
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}
