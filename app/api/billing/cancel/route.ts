// app/api/billing/cancel/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createEmailService } from "@/lib/email-service";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2026-01-28.clover",
});

// Helper: Format Unix timestamp to readable date
function formatDate(unixTimestamp: number | null): string {
  if (!unixTimestamp) return "the end of your billing cycle";

  return new Date(unixTimestamp * 1000).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

// Helper: Log billing event
async function logBillingEvent(
  supabase: any,
  data: {
    userId: string;
    eventType: string;
    subscriptionId: string;
    metadata?: any;
  },
) {
  try {
    await supabase.from("billing_events").insert({
      user_id: data.userId,
      event_type: data.eventType,
      subscription_id: data.subscriptionId,
      metadata: data.metadata || {},
      created_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error("⚠️ Failed to log billing event:", error);
    // Don't throw - this is non-critical
  }
}

// Helper: Send cancellation email
async function sendCancellationEmail(
  email: string,
  userName: string | null,
  planName: string,
  accessUntilDate: string,
) {
  try {
    const emailService = createEmailService();
    if (!emailService) {
      console.warn(
        "⚠️ Email service not configured - skipping cancellation email",
      );
      return;
    }

    await emailService.sendSubscriptionCancelledEmail({
      to: email,
      userName: userName || undefined,
      accessUntilDate,
      planName: planName.toUpperCase(),
    });
  } catch (error) {
    console.error("⚠️ Failed to send cancellation email:", error);
    // Don't throw - email failure shouldn't block cancellation
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // 1. Authenticate user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      console.log("❌ Unauthorized - no user found");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("👤 User:", user.id);

    // 2. Get user profile with subscription info
    const { data: profile, error: profileError } = await supabase
      .from("user_profiles")
      .select(
        "subscription_id, stripe_customer_id, subscription_tier, email, full_name",
      )
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      console.error("❌ Profile not found:", profileError);
      return NextResponse.json(
        { error: "User profile not found" },
        { status: 404 },
      );
    }

    if (!profile.subscription_id) {
      console.log("⚠️ No active subscription");
      return NextResponse.json(
        { error: "No active subscription found" },
        { status: 400 },
      );
    }

    console.log("📦 Subscription:", profile.subscription_id);
    console.log("💳 Plan:", profile.subscription_tier);

    // 3. Get optional feedback from request
    const body = await request.json().catch(() => ({}));
    const { reasons = [], feedback = null } = body;

    // 4. Cancel subscription in Stripe (at period end)
    const subscription = await stripe.subscriptions.update(
      profile.subscription_id,
      {
        cancel_at_period_end: true,
        metadata: {
          cancelled_by: "user",
          cancellation_reasons: reasons.join(", ") || "Not specified",
          cancellation_feedback: feedback || "",
        },
      },
    );

    // 5. Extract period end date (type-safe)
    const sub = subscription as any;
    const periodEndTimestamp = sub.current_period_end;
    const accessUntilDate = formatDate(periodEndTimestamp);

    console.log("📅 Access until:", accessUntilDate);

    // 6. Update database
    const { error: updateError } = await supabase
      .from("user_profiles")
      .update({
        cancel_at_period_end: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    if (updateError) {
      console.error("⚠️ Database update warning:", updateError);
      // Don't fail - Stripe is the source of truth
    } else {
      console.log("✅ Database updated");
    }

    // 7. Log cancellation event
    await logBillingEvent(supabase, {
      userId: user.id,
      eventType: "subscription_cancelled",
      subscriptionId: profile.subscription_id,
      metadata: {
        cancel_at_period_end: true,
        current_period_end: periodEndTimestamp
          ? new Date(periodEndTimestamp * 1000).toISOString()
          : null,
        reasons,
        feedback,
        plan: profile.subscription_tier,
      },
    });

    // 8. Send cancellation email
    await sendCancellationEmail(
      profile.email,
      profile.full_name,
      profile.subscription_tier,
      accessUntilDate,
    );

    // 9. Return success response
    return NextResponse.json({
      success: true,
      message: "Subscription cancelled successfully",
      cancel_at_period_end: true,
      current_period_end: periodEndTimestamp,
      access_until: accessUntilDate,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        error: "Failed to cancel subscription",
        details: error.message || "Unknown error",
      },
      { status: 500 },
    );
  }
}
