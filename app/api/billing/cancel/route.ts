// app/api/billing/cancel/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createEmailService } from "@/lib/email-service";
import { getStripeClient } from "@/lib/stripe";

function formatDate(unixTimestamp: number | null): string {
  if (!unixTimestamp) return "the end of your billing cycle";
  return new Date(unixTimestamp * 1000).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const stripe = getStripeClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabase
      .from("user_profiles")
      .select(
        "subscription_id, stripe_customer_id, subscription_tier, email, full_name",
      )
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: "User profile not found" },
        { status: 404 },
      );
    }

    if (!profile.subscription_id) {
      return NextResponse.json(
        { error: "No active subscription found" },
        { status: 400 },
      );
    }

    const body = await request.json().catch(() => ({}));
    const { reasons = [], feedback = null } = body;

    // Cancel in Stripe at period end
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

    const sub = subscription as any;
    const periodEndTimestamp = sub.current_period_end;
    const accessUntilDate = formatDate(periodEndTimestamp);

    // Update DB
    const { error: updateError } = await supabase
      .from("user_profiles")
      .update({
        cancel_at_period_end: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    if (updateError) {
      console.error("[billing/cancel] DB update warning:", updateError);
    }

    // Log billing event
    try {
      await supabase.from("billing_events").insert({
        user_id: user.id,
        event_type: "subscription_cancelled",
        subscription_id: profile.subscription_id,
        metadata: {
          cancel_at_period_end: true,
          current_period_end: periodEndTimestamp
            ? new Date(periodEndTimestamp * 1000).toISOString()
            : null,
          reasons,
          feedback,
          plan: profile.subscription_tier,
        },
        created_at: new Date().toISOString(),
      });
    } catch (e) {
      console.error("[billing/cancel] Failed to log event:", e);
    }

    // Send cancellation email — non-critical, don't throw on failure
    try {
      const emailService = createEmailService();
      if (emailService) {
        await emailService.sendSubscriptionCancelledEmail({
          to: profile.email,
          userName: profile.full_name || undefined,
          accessUntilDate,
          planName: profile.subscription_tier.toUpperCase(),
        });
      }
    } catch (emailError) {
      console.error("[billing/cancel] Failed to send email:", emailError);
    }

    return NextResponse.json({
      success: true,
      message: "Subscription cancelled successfully",
      cancel_at_period_end: true,
      current_period_end: periodEndTimestamp,
      access_until: accessUntilDate,
    });
  } catch (error: any) {
    console.error("[billing/cancel]", error);
    return NextResponse.json(
      { error: "Failed to cancel subscription", details: error.message },
      { status: 500 },
    );
  }
}
