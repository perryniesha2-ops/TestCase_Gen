// app/api/cron/trial-ending/route.ts
// This sends emails to users whose trial ends in 3 days

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createEmailService } from "@/lib/email-service";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  },
);

export async function GET(request: NextRequest) {
  try {
    // ⭐ VERIFY CRON SECRET (prevents unauthorized access)
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const emailService = createEmailService();
    if (!emailService) {
      console.error("Email service not configured");
      return NextResponse.json(
        { error: "Email service not configured" },
        { status: 500 },
      );
    }

    // Calculate date range: 3 days from now (give or take a few hours for buffer)
    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
    threeDaysFromNow.setHours(0, 0, 0, 0); // Start of day

    const threeDaysFromNowEnd = new Date(threeDaysFromNow);
    threeDaysFromNowEnd.setHours(23, 59, 59, 999); // End of day

    console.log(
      "🔍 Looking for trials ending on:",
      threeDaysFromNow.toISOString(),
    );

    // Find users whose trial ends in 3 days
    const { data: users, error } = await supabaseAdmin
      .from("user_profiles")
      .select("id, email, full_name, trial_ends_at, subscription_tier")
      .eq("subscription_status", "trial")
      .gte("trial_ends_at", threeDaysFromNow.toISOString())
      .lte("trial_ends_at", threeDaysFromNowEnd.toISOString());

    if (error) {
      console.error("Database error:", error);
      return NextResponse.json(
        { error: "Database query failed" },
        { status: 500 },
      );
    }

    if (!users || users.length === 0) {
      console.log("✅ No trials ending in 3 days");
      return NextResponse.json({
        success: true,
        message: "No trials ending soon",
        sent: 0,
      });
    }

    console.log(`📧 Found ${users.length} users whose trial ends in 3 days`);

    // Send emails
    let sentCount = 0;
    let failedCount = 0;

    for (const user of users) {
      try {
        const trialEndDate = new Date(user.trial_ends_at).toLocaleDateString(
          "en-US",
          {
            month: "long",
            day: "numeric",
            year: "numeric",
          },
        );

        const success = await emailService.sendTrialEndingSoonEmail({
          to: user.email,
          userName: user.full_name || undefined,
          trialEndDate,
          daysLeft: 3,
        });

        if (success) {
          sentCount++;
          console.log(`✅ Sent trial ending email to: ${user.email}`);
        } else {
          failedCount++;
          console.error(`❌ Failed to send to: ${user.email}`);
        }

        // Small delay to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 100));
      } catch (error) {
        failedCount++;
        console.error(`❌ Error sending email to ${user.email}:`, error);
      }
    }

    console.log(`📊 Results: ${sentCount} sent, ${failedCount} failed`);

    return NextResponse.json({
      success: true,
      sent: sentCount,
      failed: failedCount,
      total: users.length,
    });
  } catch (error: any) {
    console.error("❌ Cron job error:", error);
    return NextResponse.json(
      { error: "Cron job failed", details: error.message },
      { status: 500 },
    );
  }
}
