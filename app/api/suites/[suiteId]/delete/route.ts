// app/api/suites/[suiteId]/delete/route.ts
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createClient as createAdminClient } from "@supabase/supabase-js"

export const runtime = "nodejs"

function extractSuiteIdFromUrl(req: Request): string | null {
  try {
    const { pathname } = new URL(req.url)
    // expected: /api/suites/<suiteId>/delete
    const parts = pathname.split("/").filter(Boolean)
    const suitesIdx = parts.indexOf("suites")
    const suiteId = suitesIdx >= 0 ? parts[suitesIdx + 1] : null
    return suiteId && suiteId.trim().length > 0 ? suiteId.trim() : null
  } catch {
    return null
  }
}

// Supports ctx.params being either an object OR a Promise<object>
async function getSuiteIdFromContext(ctx: unknown): Promise<string | null> {
  const paramsMaybe = (ctx as any)?.params
  if (!paramsMaybe) return null

  // If it's a Promise, await it; otherwise use as-is
  const params = typeof paramsMaybe?.then === "function" ? await paramsMaybe : paramsMaybe
  const suiteId = params?.suiteId
  return typeof suiteId === "string" && suiteId.trim().length > 0 ? suiteId.trim() : null
}

export async function DELETE(req: NextRequest, ctx: unknown) {
  try {
    const suiteId =
      (await getSuiteIdFromContext(ctx)) ??
      extractSuiteIdFromUrl(req)

    if (!suiteId) {
      return NextResponse.json(
        { error: "Missing suiteId", debug: { url: req.url } },
        { status: 400 }
      )
    }

    // Auth (cookie-based)
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Verify suite ownership (RLS applies)
    const { data: suite, error: suiteErr } = await supabase
      .from("test_suites")
      .select("id, user_id")
      .eq("id", suiteId)
      .maybeSingle()

    if (suiteErr) {
      return NextResponse.json(
        { error: "Failed to load suite", details: suiteErr.message },
        { status: 500 }
      )
    }

    if (!suite) {
      return NextResponse.json({ error: "Suite not found", suiteId }, { status: 404 })
    }

    if (suite.user_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Admin client (service role)
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !serviceKey) {
      return NextResponse.json(
        { error: "Server misconfigured (missing Supabase env)" },
        { status: 500 }
      )
    }

    const admin = createAdminClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })

    // 1) Detach executions so suite delete isn't blocked
    const { error: detachExecErr } = await admin
      .from("test_executions")
      .update({ suite_id: null })
      .eq("suite_id", suiteId)

    if (detachExecErr) {
      return NextResponse.json(
        { error: "Failed to detach executions", details: detachExecErr.message },
        { status: 500 }
      )
    }

    // 2) Delete suite run sessions
    const { error: delSessionsErr } = await admin
      .from("test_run_sessions")
      .delete()
      .eq("suite_id", suiteId)

    if (delSessionsErr) {
      return NextResponse.json(
        { error: "Failed to delete suite sessions", details: delSessionsErr.message },
        { status: 500 }
      )
    }

    // 3) Delete suite-case links
    const { error: delLinksErr } = await admin
      .from("test_suite_cases")
      .delete()
      .eq("suite_id", suiteId)

    if (delLinksErr) {
      return NextResponse.json(
        { error: "Failed to delete suite links", details: delLinksErr.message },
        { status: 500 }
      )
    }

    // 4) Delete suite (and verify it actually deleted)
    const { error: delSuiteErr } = await admin
      .from("test_suites")
      .delete()
      .eq("id", suiteId)

    if (delSuiteErr) {
      return NextResponse.json(
        { error: "Failed to delete suite", details: delSuiteErr.message },
        { status: 500 }
      )
    }

    // Confirm it’s gone (prevents “silent no-op”)
    const { data: stillThere, error: confirmErr } = await admin
      .from("test_suites")
      .select("id")
      .eq("id", suiteId)
      .maybeSingle()

    if (confirmErr) {
      return NextResponse.json(
        { error: "Delete completed but confirmation failed", details: confirmErr.message },
        { status: 500 }
      )
    }

    if (stillThere) {
      return NextResponse.json(
        { error: "Suite still exists after delete (no-op)", suiteId },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, suiteId })
  } catch (err) {
    console.error("suite delete route error:", err)
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 })
  }
}
