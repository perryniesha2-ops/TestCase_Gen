// app/api/billing/webhooks/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { headers } from "next/headers";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2026-01-28.clover",
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || "";

// IMPORTANT: Use service role for admin operations
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

export async function POST(request: NextRequest) {
  console.log("\n🎣 Webhook received");

  try {
    const body = await request.text();
    const headersList = await headers();
    const signature = headersList.get("stripe-signature");

    if (!signature) {
      console.error("❌ No Stripe signature found");
      return NextResponse.json({ error: "No signature" }, { status: 400 });
    }

    // Verify webhook signature
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err: any) {
      console.error("❌ Webhook signature verification failed:", err.message);
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    // Handle the event
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;

        if (session.subscription) {
          const subscription = await stripe.subscriptions.retrieve(
            session.subscription as string,
          );
          await handleSubscriptionCreated(subscription, session);
        } else {
          console.log("⚠️ No subscription in checkout session");
        }
        break;
      }

      case "customer.subscription.created": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionCreated(subscription);
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdated(subscription);
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(subscription);
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoicePaymentSucceeded(invoice);
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoicePaymentFailed(invoice);
        break;
      }

      default:
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error("❌ Webhook error:", error);
    return NextResponse.json(
      { error: "Webhook processing failed", details: error.message },
      { status: 500 },
    );
  }
}

async function handleSubscriptionCreated(
  subscription: Stripe.Subscription,
  session?: Stripe.Checkout.Session,
) {
  const userId = subscription.metadata?.user_id;

  if (!userId) {
    return;
  }

  try {
    const planId = subscription.metadata?.plan_id || "pro";
    const mappedStatus = mapSubscriptionStatus(subscription.status);

    const subscriptionData = subscription as any;
    console.log("📅 Raw Stripe data:", {
      current_period_start: subscriptionData.current_period_start, // Should be a number
      current_period_end: subscriptionData.current_period_end, // Should be a number
      trial_end: subscriptionData.trial_end, // Should be a number
    });

    // Update user profile
    const { error: profileError } = await supabaseAdmin
      .from("user_profiles")
      .update({
        subscription_tier: planId,
        subscription_status: mappedStatus,
        subscription_id: subscription.id,
        stripe_customer_id: subscription.customer as string,
        current_period_start: subscriptionData.current_period_start
          ? new Date(subscriptionData.current_period_start * 1000).toISOString()
          : null,
        current_period_end: subscriptionData.current_period_end
          ? new Date(subscriptionData.current_period_end * 1000).toISOString()
          : null,
        trial_ends_at: subscriptionData.trial_end
          ? new Date(subscriptionData.trial_end * 1000).toISOString()
          : null,
        cancel_at_period_end: subscriptionData.cancel_at_period_end || false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId);

    if (profileError) {
      throw profileError;
    }

    console.log("✅ User profile updated");

    // Create billing event
    await createBillingEvent({
      user_id: userId,
      event_type: "subscription_created",
      subscription_id: subscription.id,
      metadata: {
        plan_id: planId,
        status: subscription.status,
        trial_end: subscriptionData.trial_end,
        current_period_end: subscriptionData.current_period_end,
      },
    });

    // Update usage limits
    await updateUsageLimits(userId, planId);

    console.log("🎉 Subscription created successfully");
  } catch (error: any) {
    console.error("❌ Error in handleSubscriptionCreated:", error);
    throw error;
  }
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const userId = subscription.metadata?.user_id;

  if (!userId) {
    return;
  }

  try {
    const planId = subscription.metadata?.plan_id || "pro";
    const mappedStatus = mapSubscriptionStatus(subscription.status);

    // FIXED: Type-safe access
    const subscriptionData = subscription as any;

    const { error } = await supabaseAdmin
      .from("user_profiles")
      .update({
        subscription_tier: planId,
        subscription_status: mappedStatus,
        current_period_start: subscriptionData.current_period_start
          ? new Date(subscriptionData.current_period_start * 1000).toISOString()
          : null,
        current_period_end: subscriptionData.current_period_end
          ? new Date(subscriptionData.current_period_end * 1000).toISOString()
          : null,
        cancel_at_period_end: subscriptionData.cancel_at_period_end || false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId);

    if (error) {
      console.error("❌ Error updating subscription:", error);
      throw error;
    }

    // Create billing event
    await createBillingEvent({
      user_id: userId,
      event_type: "subscription_updated",
      subscription_id: subscription.id,
      metadata: {
        plan_id: planId,
        status: subscription.status,
        cancel_at_period_end: subscriptionData.cancel_at_period_end,
      },
    });

    // Update usage limits if plan changed
    await updateUsageLimits(userId, planId);
  } catch (error: any) {
    console.error("❌ Error in handleSubscriptionUpdated:", error);
    throw error;
  }
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const userId = subscription.metadata?.user_id;

  if (!userId) {
    return;
  }

  try {
    // FIXED: Type-safe access
    const subscriptionData = subscription as any;

    const { error } = await supabaseAdmin
      .from("user_profiles")
      .update({
        subscription_tier: "free",
        subscription_status: "canceled",
        subscription_id: null,
        cancel_at_period_end: false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId);

    if (error) {
      console.error("❌ Error canceling subscription:", error);
      throw error;
    }

    // Create billing event
    await createBillingEvent({
      user_id: userId,
      event_type: "subscription_canceled",
      subscription_id: subscription.id,
      metadata: {
        canceled_at: subscriptionData.canceled_at,
        ended_at: subscriptionData.ended_at,
      },
    });

    // Reset to free tier limits
    await updateUsageLimits(userId, "free");
  } catch (error: any) {
    console.error("❌ Error in handleSubscriptionDeleted:", error);
    throw error;
  }
}

async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  // FIXED: Type-safe subscription extraction
  let subscriptionId: string | null = null;

  if ("subscription" in invoice && invoice.subscription) {
    if (typeof invoice.subscription === "string") {
      subscriptionId = invoice.subscription;
    } else if (
      typeof invoice.subscription === "object" &&
      invoice.subscription !== null
    ) {
      subscriptionId = (invoice.subscription as any).id || null;
    }
  }

  if (!subscriptionId) {
    console.log("⚪ Invoice not related to subscription");
    return;
  }

  try {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    const userId = subscription.metadata?.user_id;

    if (!userId) {
      console.log("⚪ No user_id in subscription metadata");
      return;
    }

    // Ensure subscription is active
    const { error } = await supabaseAdmin
      .from("user_profiles")
      .update({
        subscription_status: "active",
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId);

    if (error) {
      console.error("❌ Error updating payment status:", error);
    }

    // FIXED: Type-safe invoice access
    const invoiceData = invoice as any;

    // Create billing event
    await createBillingEvent({
      user_id: userId,
      event_type: "payment_succeeded",
      amount: invoiceData.amount_paid || 0,
      currency: invoiceData.currency || "usd",
      invoice_id: invoice.id,
      subscription_id: subscriptionId,
      payment_intent_id: invoiceData.payment_intent
        ? typeof invoiceData.payment_intent === "string"
          ? invoiceData.payment_intent
          : invoiceData.payment_intent.id
        : null,
      metadata: {
        invoice_number: invoiceData.number,
        paid: invoiceData.paid,
      },
    });
  } catch (error: any) {
    console.error("❌ Error in handleInvoicePaymentSucceeded:", error);
  }
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  // FIXED: Type-safe subscription extraction
  let subscriptionId: string | null = null;

  if ("subscription" in invoice && invoice.subscription) {
    if (typeof invoice.subscription === "string") {
      subscriptionId = invoice.subscription;
    } else if (
      typeof invoice.subscription === "object" &&
      invoice.subscription !== null
    ) {
      subscriptionId = (invoice.subscription as any).id || null;
    }
  }

  if (!subscriptionId) {
    console.log("⚪ Invoice not related to subscription");
    return;
  }

  try {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    const userId = subscription.metadata?.user_id;

    if (!userId) {
      console.log("⚪ No user_id in subscription metadata");
      return;
    }

    // Mark subscription as past_due
    const { error } = await supabaseAdmin
      .from("user_profiles")
      .update({
        subscription_status: "past_due",
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId);

    if (error) {
      console.error("❌ Error updating payment failure:", error);
    }

    // FIXED: Type-safe invoice access
    const invoiceData = invoice as any;

    // Create billing event
    await createBillingEvent({
      user_id: userId,
      event_type: "payment_failed",
      amount: invoiceData.amount_due || 0,
      currency: invoiceData.currency || "usd",
      invoice_id: invoice.id,
      subscription_id: subscriptionId,
      payment_intent_id: invoiceData.payment_intent
        ? typeof invoiceData.payment_intent === "string"
          ? invoiceData.payment_intent
          : invoiceData.payment_intent.id
        : null,
      metadata: {
        attempt_count: invoiceData.attempt_count,
        next_payment_attempt: invoiceData.next_payment_attempt,
      },
    });
  } catch (error: any) {
    console.error("❌ Error in handleInvoicePaymentFailed:", error);
  }
}

// Helper: Map Stripe statuses to database statuses
function mapSubscriptionStatus(stripeStatus: string): string {
  const statusMap: { [key: string]: string } = {
    trialing: "trial",
    active: "active",
    past_due: "past_due",
    canceled: "canceled",
    cancelled: "canceled",
    incomplete: "past_due",
    incomplete_expired: "canceled",
    unpaid: "past_due",
  };

  return statusMap[stripeStatus] || "active";
}

async function updateUsageLimits(userId: string, planId: string) {
  const planLimits = {
    free: { testCases: 20, apiCalls: 200 },
    pro: { testCases: 500, apiCalls: 5000 },
    team: { testCases: 2000, apiCalls: 20000 },
    enterprise: { testCases: -1, apiCalls: -1 }, // -1 = unlimited
  };

  const limits =
    planLimits[planId as keyof typeof planLimits] || planLimits.free;
  const currentMonth = new Date().toISOString().slice(0, 7); // "2026-01"

  try {
    // Get existing usage to preserve current counts
    const { data: existingUsage } = await supabaseAdmin
      .from("user_usage")
      .select("test_cases_generated, api_calls_used")
      .eq("user_id", userId)
      .eq("month", currentMonth)
      .single();

    const upsertData = {
      user_id: userId,
      month: currentMonth,
      test_cases_generated: existingUsage?.test_cases_generated || 0,
      api_calls_used: existingUsage?.api_calls_used || 0,
      monthly_limit_test_cases: limits.testCases,
      monthly_limit_api_calls: limits.apiCalls,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabaseAdmin
      .from("user_usage")
      .upsert(upsertData, {
        onConflict: "user_id,month",
        ignoreDuplicates: false, // IMPORTANT: Allow updates
      });

    if (error) {
      console.error("❌ Error updating usage limits:", error);
      throw error;
    }

    return true;
  } catch (error) {
    console.error("❌ Failed to update usage limits:", error);
    return false;
  }
}

// Helper: Create billing event
async function createBillingEvent(event: {
  user_id: string;
  event_type: string;
  amount?: number;
  currency?: string;
  invoice_id?: string | null;
  subscription_id?: string;
  payment_intent_id?: string | null;
  metadata?: any;
}) {
  try {
    const { error } = await supabaseAdmin.from("billing_events").insert({
      user_id: event.user_id,
      event_type: event.event_type,
      amount: event.amount || null,
      currency: event.currency || "usd",
      invoice_id: event.invoice_id || null,
      subscription_id: event.subscription_id || null,
      payment_intent_id: event.payment_intent_id || null,
      metadata: event.metadata || {},
      created_at: new Date().toISOString(),
    });

    if (error) {
      console.error("❌ Error creating billing event:", error);
    }
  } catch (error: any) {
    console.error("❌ Error in createBillingEvent:", error);
  }
}
