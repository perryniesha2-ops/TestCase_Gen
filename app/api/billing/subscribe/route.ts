// app/api/billing/subscribe/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { headers } from "next/headers";
import {
  getStripeClient,
  ensureStripeCustomer,
  getPriceId,
} from "@/lib/stripe";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { planId, isYearly } = body;

    if (!planId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    if (planId === "free" || planId === "enterprise" || planId === "team") {
      return NextResponse.json(
        { error: "Invalid plan for checkout" },
        { status: 400 },
      );
    }

    const supabase = await createClient();
    const stripe = getStripeClient();

    // Always use the authenticated session — never trust client-provided userId
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = user.id;

    const priceId = getPriceId(planId, isYearly);
    if (!priceId) {
      return NextResponse.json(
        { error: "Invalid plan configuration. Please contact support." },
        { status: 400 },
      );
    }

    // Fetch profile for existing customer/subscription data
    const { data: existingProfile } = await supabase
      .from("user_profiles")
      .select("stripe_customer_id, subscription_id, subscription_status")
      .eq("id", userId)
      .single();

    // Check for active subscription
    if (existingProfile?.subscription_id) {
      try {
        const existing = await stripe.subscriptions.retrieve(
          existingProfile.subscription_id,
        );
        if (existing.status === "active" || existing.status === "trialing") {
          return NextResponse.json(
            {
              error:
                "You already have an active subscription. Use 'Manage Subscription' to make changes.",
            },
            { status: 400 },
          );
        }
      } catch (err: any) {
        if (err.code !== "resource_missing") throw err;
      }
    }

    // Ensure Stripe customer exists (creates if missing)
    const customerId = await ensureStripeCustomer(
      stripe,
      supabase,
      userId,
      user.email,
      existingProfile?.stripe_customer_id,
    );

    const headersList = await headers();
    const origin =
      headersList.get("origin") ||
      process.env.NEXT_PUBLIC_SITE_URL ||
      "http://localhost:3000";

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ["card"],
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/billing?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/billing?canceled=true`,
      metadata: { user_id: userId, plan_id: planId },
      allow_promotion_codes: true,
      subscription_data: {
        trial_period_days: planId === "pro" ? 14 : 0,
        metadata: { user_id: userId, plan_id: planId },
      },
    });

    return NextResponse.json({
      checkoutUrl: session.url,
      sessionId: session.id,
    });
  } catch (error: any) {
    console.error("[billing/subscribe]", error);
    return NextResponse.json(
      { error: "Failed to create subscription", details: error.message },
      { status: 500 },
    );
  }
}
