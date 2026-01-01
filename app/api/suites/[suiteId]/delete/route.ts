// app/api/suites/[suiteId]/delete/route.ts
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createClient as createAdminClient } from "@supabase/supabase-js"

export const runtime = "nodejs"

type Ctx = {
  params: {
    suiteId: string
  }
}


function extractSuiteIdFromUrl(req: Request): string | null {
  try {
    const { pathname } = new URL(req.url)
    const parts = pathname.split("/").filter(Boolean)
    const suitesIdx = parts.indexOf("suites")
    const suiteId = suitesIdx >= 0 ? parts[suitesIdx + 1] : null
    return suiteId && suiteId.trim().length > 0 ? suiteId.trim() : null
  } catch {
    return null
  }
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  try {
  
    const suiteId = ctx?.params?.suiteId ?? extractSuiteIdFromUrl(req)

  if (!suiteId) {
      return NextResponse.json({ error: "Missing suiteId" }, { status: 400 })
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

    // Verify suite ownership (use normal client so RLS applies)
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
      return NextResponse.json({ error: "Suite not found" }, { status: 404 })
    }

    if (suite.user_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Admin client (service role) for updates/deletes that should bypass RLS
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

    // 1) Detach executions so history remains, and suite FK no longer blocks delete
    //    IMPORTANT: suite_id FK has no ON DELETE SET NULL in your schema.
    const { error: detachExecErr, count: detachedExecCount } = await admin
      .from("test_executions")
      .update({ suite_id: null })
      .eq("suite_id", suiteId)

    if (detachExecErr) {
      return NextResponse.json(
        { error: "Failed to detach executions", details: detachExecErr.message },
        { status: 500 }
      )
    }

    // 2) Delete run sessions for suite (execution.session_id will auto-null due to FK ON DELETE SET NULL)
    const { error: delSessionsErr, count: deletedSessionsCount } = await admin
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
    const { error: delLinksErr, count: deletedLinksCount } = await admin
      .from("test_suite_cases")
      .delete()
      .eq("suite_id", suiteId)

    if (delLinksErr) {
      return NextResponse.json(
        { error: "Failed to delete suite links", details: delLinksErr.message },
        { status: 500 }
      )
    }

    // 4) Delete suite
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

    return NextResponse.json({
      success: true,
      suiteId,
      detached_executions: detachedExecCount ?? 0,
      deleted_sessions: deletedSessionsCount ?? 0,
      deleted_links: deletedLinksCount ?? 0,
    })
  } catch (err) {
    console.error("suite delete route error:", err)
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 })
  }
}
