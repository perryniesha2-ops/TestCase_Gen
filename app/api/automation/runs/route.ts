// app/api/automation/runs/route.ts
// GET /api/automation/runs
// Query params: suiteId, status, framework, dateRange, page, pageSize

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function computeStartDate(filter: string): string | null {
  if (filter === "today")
    return new Date(new Date().setHours(0, 0, 0, 0)).toISOString();
  if (filter === "week") {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString();
  }
  if (filter === "month") {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d.toISOString();
  }
  return null;
}

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();
    if (authErr || !user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const url = new URL(req.url);
    const suiteId = url.searchParams.get("suiteId") || null;
    const status = url.searchParams.get("status") || null;
    const framework = url.searchParams.get("framework") || null;
    const dateRange = url.searchParams.get("dateRange") || "all";
    const page = Math.max(1, Number(url.searchParams.get("page") ?? 1));
    const pageSize = Math.min(
      100,
      Math.max(1, Number(url.searchParams.get("pageSize") ?? 50)),
    );

    // Scope to user's suites
    const { data: userSuites, error: suitesErr } = await supabase
      .from("suites")
      .select("id, name")
      .eq("user_id", user.id);

    if (suitesErr)
      return NextResponse.json({ error: suitesErr.message }, { status: 500 });

    if (!userSuites || userSuites.length === 0) {
      return NextResponse.json({
        runs: [],
        totalCount: 0,
        totalPages: 0,
        page,
        pageSize,
      });
    }

    const suiteIds = userSuites.map((s) => s.id);
    const suiteNameMap = new Map(userSuites.map((s) => [s.id, s.name]));

    let query = supabase
      .from("automation_runs")
      .select("*", { count: "exact" })
      .in("suite_id", suiteIds)
      .order("started_at", { ascending: false })
      .range((page - 1) * pageSize, page * pageSize - 1);

    if (suiteId) query = query.eq("suite_id", suiteId);
    if (status) query = query.eq("status", status);
    if (framework) query = query.eq("framework", framework);

    const startDate = computeStartDate(dateRange);
    if (startDate) query = query.gte("started_at", startDate);

    const { data, error, count } = await query;
    if (error)
      return NextResponse.json({ error: error.message }, { status: 500 });

    const runs = (data ?? []).map((run) => ({
      ...run,
      suite_name: suiteNameMap.get(run.suite_id) ?? "Unknown Suite",
    }));

    return NextResponse.json({
      runs,
      totalCount: count ?? 0,
      totalPages: Math.ceil((count ?? 0) / pageSize),
      page,
      pageSize,
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Unexpected error" },
      { status: 500 },
    );
  }
}
