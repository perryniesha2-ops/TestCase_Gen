// app/api/billing/subscribe/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { headers } from "next/headers";
import Stripe from "stripe";

// Initialize Stripe - make sure to add STRIPE_SECRET_KEY to your environment variables
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2025-11-17.clover",
});

const priceIds = {
  pro_monthly: process.env.STRIPE_PRO_MONTHLY_PRICE_ID,
  pro_yearly: process.env.STRIPE_PRO_YEARLY_PRICE_ID,
  team_monthly: process.env.STRIPE_TEAM_MONTHLY_PRICE_ID,
  team_yearly: process.env.STRIPE_TEAM_YEARLY_PRICE_ID,
};

export async function POST(request: NextRequest) {
  try {
    const { planId, isYearly, userId } = await request.json();

    // Validate required fields
    if (!planId || !userId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Get user from Supabase
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user || user.id !== userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get the correct price ID
    const priceKey = `${planId}_${isYearly ? "yearly" : "monthly"}`;
    const priceId = priceIds[priceKey as keyof typeof priceIds];

    if (!priceId) {
      return NextResponse.json(
        { error: "Invalid plan selected" },
        { status: 400 }
      );
    }

    // Create or retrieve Stripe customer
    let customerId: string;

    // Check if user already has a Stripe customer ID
    const { data: existingProfile } = await supabase
      .from("user_profiles")
      .select("stripe_customer_id")
      .eq("id", userId)
      .single();

    if (existingProfile?.stripe_customer_id) {
      customerId = existingProfile.stripe_customer_id;
    } else {
      // Create new Stripe customer
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          user_id: userId,
        },
      });

      customerId = customer.id;

      // Store customer ID in database
      await supabase.from("user_profiles").upsert({
        id: userId,
        stripe_customer_id: customerId,
        email: user.email,
      });
    }

    // Create Stripe checkout session
    const headersList = await headers();
    const origin =
      headersList.get("origin") || process.env.NEXT_PUBLIC_SITE_URL;

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ["card"],
      mode: "subscription",
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${origin}/billing?success=true&session_id={CHECKOUT_SESSION_ID}&t=${Date.now()}`,
      cancel_url: `${origin}/billing?canceled=true`,
      metadata: {
        user_id: userId,
        plan_id: planId,
      },
      allow_promotion_codes: true,
      subscription_data: {
        trial_period_days: planId === "pro" ? 14 : planId === "team" ? 14 : 0,
        metadata: {
          user_id: userId,
          plan_id: planId,
        },
      },
    });

    return NextResponse.json({
      checkoutUrl: session.url,
      sessionId: session.id,
    });
  } catch (error) {
    console.error("Subscription error:", error);
    return NextResponse.json(
      {
        error: "Failed to create subscription",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
