// app/api/notifications/weekly-summary/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendNotification } from "@/lib/notifications/send";

export const runtime = "nodejs";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://www.synthqa.app";

export async function POST(req: Request) {
  // Verify cron secret so only GitHub Actions / Vercel cron can call this
  const authHeader = req.headers.get("Authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Get all users with email notifications enabled
    const { data: profiles, error: profilesError } = await supabase
      .from("user_profiles")
      .select("id, email, preferences");

    if (profilesError || !profiles) {
      return NextResponse.json(
        { error: "Failed to fetch profiles" },
        { status: 500 },
      );
    }

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    let sent = 0;
    let skipped = 0;

    for (const profile of profiles) {
      const prefs = profile.preferences ?? {};
      if (prefs?.notifications?.email === false) {
        skipped++;
        continue;
      }

      // Get automation runs from last 7 days for this user
      const { data: runs } = await supabase
        .from("automation_runs")
        .select("id, status, total_tests, passed_tests, failed_tests, suite_id")
        .eq("user_id", profile.id)
        .gte("created_at", sevenDaysAgo.toISOString());

      if (!runs || runs.length === 0) {
        skipped++;
        continue;
      }

      const totalRuns = runs.length;
      const totalTests = runs.reduce((sum, r) => sum + (r.total_tests ?? 0), 0);
      const totalPassed = runs.reduce(
        (sum, r) => sum + (r.passed_tests ?? 0),
        0,
      );
      const overallPassRate =
        totalTests > 0 ? Math.round((totalPassed / totalTests) * 100) : 0;

      // Find top failing suites
      const failsBySuite: Record<
        string,
        { name: string; failedCount: number }
      > = {};
      for (const run of runs) {
        if ((run.failed_tests ?? 0) > 0) {
          if (!failsBySuite[run.suite_id]) {
            // Fetch suite name
            const { data: suite } = await supabase
              .from("suites")
              .select("name")
              .eq("id", run.suite_id)
              .single();
            failsBySuite[run.suite_id] = {
              name: suite?.name ?? "Unknown suite",
              failedCount: 0,
            };
          }
          failsBySuite[run.suite_id].failedCount += run.failed_tests ?? 0;
        }
      }

      const topFailingSuites = Object.values(failsBySuite)
        .sort((a, b) => b.failedCount - a.failedCount)
        .slice(0, 3);

      const success = await sendNotification({
        event: "weekly_summary",
        userId: profile.id,
        totalRuns,
        totalTests,
        overallPassRate,
        topFailingSuites,
        appUrl: APP_URL,
      });

      if (success) sent++;
      else skipped++;
    }

    return NextResponse.json({
      success: true,
      sent,
      skipped,
      message: `Weekly summary sent to ${sent} users, skipped ${skipped}`,
    });
  } catch (error) {
    console.error("[weekly-summary] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
