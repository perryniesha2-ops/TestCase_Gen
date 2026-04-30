// app/api/billing/reactivate/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getStripeClient } from "@/lib/stripe";

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
      .select("subscription_id, cancel_at_period_end, subscription_tier")
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
        { error: "No subscription found" },
        { status: 400 },
      );
    }

    if (!profile.cancel_at_period_end) {
      return NextResponse.json(
        { error: "Subscription is not scheduled for cancellation" },
        { status: 400 },
      );
    }

    // Reactivate in Stripe
    await stripe.subscriptions.update(profile.subscription_id, {
      cancel_at_period_end: false,
      metadata: {
        reactivated_at: new Date().toISOString(),
        reactivated_by: "user",
      },
    });

    // Update DB
    const { error: updateError } = await supabase
      .from("user_profiles")
      .update({
        cancel_at_period_end: false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    if (updateError) {
      console.error("[billing/reactivate] DB update warning:", updateError);
    }

    // Log billing event
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
      console.error("[billing/reactivate] Failed to log event:", e);
    }

    // Clear middleware tier cache so new status is picked up immediately
    const response = NextResponse.json({
      success: true,
      message: "Subscription reactivated successfully",
      subscription_id: profile.subscription_id,
    });

    response.cookies.set("user_tier", "", { maxAge: 0 });
    response.cookies.set("tier_cache_time", "", { maxAge: 0 });

    return response;
  } catch (error: any) {
    console.error("[billing/reactivate]", error);
    return NextResponse.json(
      { error: "Failed to reactivate subscription", details: error.message },
      { status: 500 },
    );
  }
}
