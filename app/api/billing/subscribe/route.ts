// app/api/billing/subscribe/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { headers } from "next/headers";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2025-12-15.clover",
});

const priceIds = {
  pro_monthly: process.env.STRIPE_PRO_MONTHLY_PRICE_ID,
  pro_yearly: process.env.STRIPE_PRO_YEARLY_PRICE_ID,
  team_monthly: process.env.STRIPE_TEAM_MONTHLY_PRICE_ID,
  team_yearly: process.env.STRIPE_TEAM_YEARLY_PRICE_ID,
};

export async function POST(request: NextRequest) {
  console.log("📋 Subscribe route called");

  try {
    const body = await request.json();
    const { planId, isYearly, userId } = body;

    // Validate required fields
    if (!planId || !userId) {
      console.error("❌ Missing required fields:", { planId, userId });
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    console.log(`✅ Processing: ${planId}, yearly: ${isYearly}`);

    // Don't process free, enterprise, or team through checkout
    if (planId === "free" || planId === "enterprise" || planId === "team") {
      console.log("⚠️ Invalid plan for checkout:", planId);
      return NextResponse.json(
        { error: "Invalid plan for checkout" },
        { status: 400 }
      );
    }

    // Get user from Supabase
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user || user.id !== userId) {
      console.error("❌ Authentication failed");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("✅ User authenticated:", user.id);

    // Get the correct price ID
    const priceKey = `${planId}_${
      isYearly ? "yearly" : "monthly"
    }` as keyof typeof priceIds;
    const priceId = priceIds[priceKey];

    if (!priceId) {
      console.error("❌ No price ID for:", priceKey);
      console.error("Available prices:", priceIds);
      return NextResponse.json(
        { error: "Invalid plan configuration. Please contact support." },
        { status: 400 }
      );
    }

    console.log("✅ Price ID:", priceId);

    // Check for existing profile
    const { data: existingProfile } = await supabase
      .from("user_profiles")
      .select("stripe_customer_id, subscription_id, subscription_status")
      .eq("id", userId)
      .single();

    // Check for active subscription
    if (existingProfile?.subscription_id) {
      try {
        const existingSubscription = await stripe.subscriptions.retrieve(
          existingProfile.subscription_id
        );

        if (
          existingSubscription.status === "active" ||
          existingSubscription.status === "trialing"
        ) {
          console.log("⚠️ User already has active subscription");
          return NextResponse.json(
            {
              error:
                "You already have an active subscription. Use 'Manage Subscription' to make changes.",
            },
            { status: 400 }
          );
        }
      } catch (error: any) {
        if (error.code !== "resource_missing") {
          console.error("❌ Error checking subscription:", error);
        }
      }
    }

    let customerId: string;

    // FIXED: Check if customer exists in Stripe before using it
    if (existingProfile?.stripe_customer_id) {
      console.log(
        "🔍 Checking if customer exists:",
        existingProfile.stripe_customer_id
      );

      try {
        // Try to retrieve the customer from Stripe
        await stripe.customers.retrieve(existingProfile.stripe_customer_id);
        customerId = existingProfile.stripe_customer_id;
        console.log("✅ Using existing customer:", customerId);
      } catch (error: any) {
        if (error.code === "resource_missing") {
          // Customer doesn't exist in Stripe - create a new one
          console.log("⚠️ Customer not found in Stripe, creating new one");

          const customer = await stripe.customers.create({
            email: user.email,
            metadata: {
              user_id: userId,
            },
          });

          customerId = customer.id;
          console.log("✅ Created new customer:", customerId);

          // Update database with new customer ID
          await supabase
            .from("user_profiles")
            .update({ stripe_customer_id: customerId })
            .eq("id", userId);

          console.log("✅ Updated database with new customer ID");
        } else {
          // Some other error occurred
          console.error("❌ Error checking customer:", error);
          throw error;
        }
      }
    } else {
      // No customer ID in database - create new customer
      console.log("🆕 Creating new Stripe customer...");

      const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          user_id: userId,
        },
      });

      customerId = customer.id;
      console.log("✅ Created new customer:", customerId);

      // Store customer ID in database
      await supabase
        .from("user_profiles")
        .update({ stripe_customer_id: customerId })
        .eq("id", userId);

      console.log("✅ Saved customer ID to database");
    }

    // Create Stripe checkout session
    console.log("🛒 Creating checkout session...");

    const headersList = await headers();
    const origin =
      headersList.get("origin") ||
      process.env.NEXT_PUBLIC_SITE_URL ||
      "http://localhost:3000";

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
      success_url: `${origin}/billing?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/billing?canceled=true`,
      metadata: {
        user_id: userId,
        plan_id: planId,
      },
      allow_promotion_codes: true,
      subscription_data: {
        trial_period_days: planId === "pro" ? 14 : 0,
        metadata: {
          user_id: userId,
          plan_id: planId,
        },
      },
    });

    console.log("✅ Checkout session created:", session.id);

    return NextResponse.json({
      checkoutUrl: session.url,
      sessionId: session.id,
    });
  } catch (error: any) {
    console.error("❌ Subscription error:", error);
    return NextResponse.json(
      {
        error: "Failed to create subscription",
        details: error.message || "Unknown error",
      },
      { status: 500 }
    );
  }
}
