// app/api/billing/reactivate/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import Stripe from "stripe";

function getStripeClient() {
  const apiKey = process.env.STRIPE_SECRET_KEY;

  if (!apiKey) {
    throw new Error("STRIPE_SECRET_KEY is not configured");
  }

  return new Stripe(apiKey, {
    apiVersion: "2026-01-28.clover",
  });
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const stripe = getStripeClient();

    // 1. Authenticate user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Get subscription info
    const { data: profile, error: profileError } = await supabase
      .from("user_profiles")
      .select("subscription_id, cancel_at_period_end, subscription_tier")
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
      console.log("⚠️ No subscription found");
      return NextResponse.json(
        { error: "No subscription found" },
        { status: 400 },
      );
    }

    if (!profile.cancel_at_period_end) {
      return NextResponse.json(
        { error: "Subscription is not cancelled" },
        { status: 400 },
      );
    }

    // 3. Reactivate in Stripe
    const subscription = await stripe.subscriptions.update(
      profile.subscription_id,
      {
        cancel_at_period_end: false,
        metadata: {
          reactivated_at: new Date().toISOString(),
          reactivated_by: "user",
        },
      },
    );

    // 4. Update database
    const { error: updateError } = await supabase
      .from("user_profiles")
      .update({
        cancel_at_period_end: false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    if (updateError) {
      console.error("⚠️ Database update warning:", updateError);
    }

    // 5. Log reactivation event
    try {
      await supabase.from("billing_events").insert({
        user_id: user.id,
        event_type: "subscription_reactivated",
        subscription_id: profile.subscription_id,
        metadata: {
          plan: profile.subscription_tier,
          reactivated_at: new Date().toISOString(),
        },
        created_at: new Date().toISOString(),
      });
    } catch (e) {
      console.error("⚠️ Failed to log event:", e);
    }

    // 6. Clear tier cache (so middleware picks up new status immediately)
    const response = NextResponse.json({
      success: true,
      message: "Subscription reactivated successfully",
      subscription_id: profile.subscription_id,
    });

    // Clear cookies so middleware refreshes tier
    response.cookies.set("user_tier", "", { maxAge: 0 });
    response.cookies.set("tier_cache_time", "", { maxAge: 0 });

    return response;
  } catch (error: any) {
    return NextResponse.json(
      {
        error: "Failed to reactivate subscription",
        details: error.message || "Unknown error",
      },
      { status: 500 },
    );
  }
}
