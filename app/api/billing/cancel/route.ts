// app/api/billing/cancel/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2026-01-28.clover",
});

export async function POST(request: NextRequest) {
  console.log("🚫 Cancel subscription request");

  try {
    const supabase = await createClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user profile with subscription info
    const { data: profile, error: profileError } = await supabase
      .from("user_profiles")
      .select("subscription_id, stripe_customer_id, subscription_tier")
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

    // Get feedback from request (optional)
    const body = await request.json().catch(() => ({}));
    const { reasons = [], feedback = null } = body;

    // Cancel subscription at period end (user keeps access until then)
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

    console.log(
      "✅ Subscription set to cancel at period end:",
      subscription.id,
    );

    // Extract period end safely (it's a Unix timestamp) - use type assertion to fix TS error
    const subscriptionData = subscription as any;
    const currentPeriodEnd = subscriptionData.current_period_end
      ? new Date(subscriptionData.current_period_end * 1000).toISOString()
      : null;

    // Update user profile - mark as cancelled but keep subscription active until period end
    const { error: updateError } = await supabase
      .from("user_profiles")
      .update({
        cancel_at_period_end: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    if (updateError) {
      console.error("❌ Error updating profile:", updateError);
      // Don't fail the request - subscription is already cancelled in Stripe
    }

    // Log cancellation event (optional - for analytics)
    try {
      await supabase.from("billing_events").insert({
        user_id: user.id,
        event_type: "subscription_cancelled",
        subscription_id: profile.subscription_id,
        metadata: {
          cancel_at_period_end: true,
          current_period_end: currentPeriodEnd,
          reasons,
          feedback,
        },
        created_at: new Date().toISOString(),
      });
    } catch (e) {
      console.error("Failed to log cancellation event:", e);
      // Don't fail the request
    }

    return NextResponse.json({
      success: true,
      message: "Subscription cancelled successfully",
      cancel_at_period_end: true,
      current_period_end: subscriptionData.current_period_end,
    });
  } catch (error: any) {
    console.error("❌ Cancellation error:", error);
    return NextResponse.json(
      {
        error: "Failed to cancel subscription",
        details: error.message || "Unknown error",
      },
      { status: 500 },
    );
  }
}
