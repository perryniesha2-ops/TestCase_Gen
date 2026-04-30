// app/api/billing/webhooks/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { headers } from "next/headers";
import Stripe from "stripe";
import { createEmailService } from "@/lib/email-service";
import { getStripeClient, mapSubscriptionStatus } from "@/lib/stripe";

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET ?? "";

// Service-role client for webhook handlers — bypasses RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

const emailService = createEmailService();

// ─── Main handler ─────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const stripe = getStripeClient();

  try {
    const body = await request.text();
    const headersList = await headers();
    const signature = headersList.get("stripe-signature");

    if (!signature) {
      return NextResponse.json({ error: "No signature" }, { status: 400 });
    }

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err: any) {
      console.error("[webhook] Signature verification failed:", err.message);
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.subscription) {
          const subscription = await stripe.subscriptions.retrieve(
            session.subscription as string,
          );
          await handleSubscriptionCreated(subscription, session);
        }
        break;
      }
      case "customer.subscription.created": {
        await handleSubscriptionCreated(
          event.data.object as Stripe.Subscription,
        );
        break;
      }
      case "customer.subscription.updated": {
        await handleSubscriptionUpdated(
          event.data.object as Stripe.Subscription,
        );
        break;
      }
      case "customer.subscription.deleted": {
        await handleSubscriptionDeleted(
          event.data.object as Stripe.Subscription,
        );
        break;
      }
      case "invoice.payment_succeeded": {
        await handleInvoicePaymentSucceeded(
          event.data.object as Stripe.Invoice,
          stripe,
        );
        break;
      }
      case "invoice.payment_failed": {
        await handleInvoicePaymentFailed(
          event.data.object as Stripe.Invoice,
          stripe,
        );
        break;
      }
      default:
        // Unhandled event type — ignore silently
        break;
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error("[webhook] Error:", error);
    return NextResponse.json(
      { error: "Webhook processing failed", details: error.message },
      { status: 500 },
    );
  }
}

// ─── Event handlers ───────────────────────────────────────────────────────────

async function handleSubscriptionCreated(
  subscription: Stripe.Subscription,
  session?: Stripe.Checkout.Session,
) {
  const userId = subscription.metadata?.user_id;
  if (!userId) return;

  try {
    const planId = subscription.metadata?.plan_id ?? "pro";
    const mappedStatus = mapSubscriptionStatus(subscription.status);
    const sub = subscription as any;

    await supabaseAdmin
      .from("user_profiles")
      .update({
        subscription_tier: planId,
        subscription_status: mappedStatus,
        subscription_id: subscription.id,
        stripe_customer_id: subscription.customer as string,
        current_period_start: sub.current_period_start
          ? new Date(sub.current_period_start * 1000).toISOString()
          : null,
        current_period_end: sub.current_period_end
          ? new Date(sub.current_period_end * 1000).toISOString()
          : null,
        trial_ends_at: sub.trial_end
          ? new Date(sub.trial_end * 1000).toISOString()
          : null,
        cancel_at_period_end: sub.cancel_at_period_end ?? false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId);

    // Send trial started email
    if (mappedStatus === "trial" && emailService) {
      try {
        const { data: profile } = await supabaseAdmin
          .from("user_profiles")
          .select("email, full_name")
          .eq("id", userId)
          .single();

        if (profile) {
          const trialEndDate = sub.trial_end
            ? new Date(sub.trial_end * 1000).toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })
            : "in 14 days";

          await emailService.sendTrialStartedEmail({
            to: profile.email,
            userName: profile.full_name ?? undefined,
            trialEndDate,
            planName: planId.toUpperCase(),
          });
        }
      } catch (emailError) {
        console.error("[webhook] Failed to send trial email:", emailError);
      }
    }

    await createBillingEvent({
      user_id: userId,
      event_type: "subscription_created",
      subscription_id: subscription.id,
      metadata: {
        plan_id: planId,
        status: subscription.status,
        trial_end: sub.trial_end,
        current_period_end: sub.current_period_end,
      },
    });

    await updateUsageLimits(userId, planId);
  } catch (error: any) {
    console.error("[webhook] handleSubscriptionCreated error:", error);
    throw error;
  }
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const userId = subscription.metadata?.user_id;
  if (!userId) return;

  try {
    const planId = subscription.metadata?.plan_id ?? "pro";
    const mappedStatus = mapSubscriptionStatus(subscription.status);
    const sub = subscription as any;

    await supabaseAdmin
      .from("user_profiles")
      .update({
        subscription_tier: planId,
        subscription_status: mappedStatus,
        current_period_start: sub.current_period_start
          ? new Date(sub.current_period_start * 1000).toISOString()
          : null,
        current_period_end: sub.current_period_end
          ? new Date(sub.current_period_end * 1000).toISOString()
          : null,
        cancel_at_period_end: sub.cancel_at_period_end ?? false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId);

    await createBillingEvent({
      user_id: userId,
      event_type: "subscription_updated",
      subscription_id: subscription.id,
      metadata: {
        plan_id: planId,
        status: subscription.status,
        cancel_at_period_end: sub.cancel_at_period_end,
      },
    });

    await updateUsageLimits(userId, planId);
  } catch (error: any) {
    console.error("[webhook] handleSubscriptionUpdated error:", error);
    throw error;
  }
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const userId = subscription.metadata?.user_id;
  if (!userId) return;

  try {
    const sub = subscription as any;

    const { data: userProfile } = await supabaseAdmin
      .from("user_profiles")
      .select("email, full_name, subscription_tier")
      .eq("id", userId)
      .single();

    await supabaseAdmin
      .from("user_profiles")
      .update({
        subscription_tier: "free",
        subscription_status: "canceled",
        subscription_id: null,
        cancel_at_period_end: false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId);

    if (userProfile && emailService) {
      try {
        await emailService.sendSubscriptionEndedEmail({
          to: userProfile.email,
          userName: userProfile.full_name ?? undefined,
          planName: userProfile.subscription_tier.toUpperCase(),
        });
      } catch (emailError) {
        console.error("[webhook] Failed to send ended email:", emailError);
      }
    }

    await createBillingEvent({
      user_id: userId,
      event_type: "subscription_canceled",
      subscription_id: subscription.id,
      metadata: {
        canceled_at: sub.canceled_at,
        ended_at: sub.ended_at,
      },
    });

    await updateUsageLimits(userId, "free");
  } catch (error: any) {
    console.error("[webhook] handleSubscriptionDeleted error:", error);
    throw error;
  }
}

async function handleInvoicePaymentSucceeded(
  invoice: Stripe.Invoice,
  stripe: Stripe,
) {
  const subscriptionId = resolveSubscriptionId(invoice);
  if (!subscriptionId) return;

  try {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    const userId = subscription.metadata?.user_id;
    if (!userId) return;

    const invoiceData = invoice as any;

    const { data: profile } = await supabaseAdmin
      .from("user_profiles")
      .select("email, full_name, subscription_status")
      .eq("id", userId)
      .single();

    const previousStatus = profile?.subscription_status;

    await supabaseAdmin
      .from("user_profiles")
      .update({
        subscription_status: "active",
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId);

    // Send welcome email on trial → paid conversion
    const isTrialConversion =
      previousStatus === "trial" &&
      invoiceData.billing_reason === "subscription_cycle" &&
      invoiceData.amount_paid > 0;

    if (isTrialConversion && profile && emailService) {
      try {
        const sub = subscription as any;
        const nextBillingDate = sub.current_period_end
          ? new Date(sub.current_period_end * 1000).toLocaleDateString(
              "en-US",
              { month: "long", day: "numeric", year: "numeric" },
            )
          : "next month";

        await emailService.sendWelcomeToProEmail({
          to: profile.email,
          userName: profile.full_name ?? undefined,
          nextBillingDate,
          amount: invoiceData.amount_paid
            ? `$${(invoiceData.amount_paid / 100).toFixed(2)}`
            : "$15.00",
        });
      } catch (emailError) {
        console.error("[webhook] Failed to send welcome email:", emailError);
      }
    }

    await createBillingEvent({
      user_id: userId,
      event_type: "payment_succeeded",
      amount: invoiceData.amount_paid ?? 0,
      currency: invoiceData.currency ?? "usd",
      invoice_id: invoice.id,
      subscription_id: subscriptionId,
      payment_intent_id: resolvePaymentIntentId(invoiceData.payment_intent),
      metadata: { invoice_number: invoiceData.number, paid: invoiceData.paid },
    });
  } catch (error: any) {
    console.error("[webhook] handleInvoicePaymentSucceeded error:", error);
  }
}

async function handleInvoicePaymentFailed(
  invoice: Stripe.Invoice,
  stripe: Stripe,
) {
  const subscriptionId = resolveSubscriptionId(invoice);
  if (!subscriptionId) return;

  try {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    const userId = subscription.metadata?.user_id;
    if (!userId) return;

    const invoiceData = invoice as any;

    await supabaseAdmin
      .from("user_profiles")
      .update({
        subscription_status: "past_due",
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId);

    await createBillingEvent({
      user_id: userId,
      event_type: "payment_failed",
      amount: invoiceData.amount_due ?? 0,
      currency: invoiceData.currency ?? "usd",
      invoice_id: invoice.id,
      subscription_id: subscriptionId,
      payment_intent_id: resolvePaymentIntentId(invoiceData.payment_intent),
      metadata: {
        attempt_count: invoiceData.attempt_count,
        next_payment_attempt: invoiceData.next_payment_attempt,
      },
    });
  } catch (error: any) {
    console.error("[webhook] handleInvoicePaymentFailed error:", error);
  }
}

// ─── Utilities ────────────────────────────────────────────────────────────────

function resolveSubscriptionId(invoice: Stripe.Invoice): string | null {
  const sub = (invoice as any).subscription;
  if (!sub) return null;
  if (typeof sub === "string") return sub;
  if (typeof sub === "object" && sub !== null) return sub.id ?? null;
  return null;
}

function resolvePaymentIntentId(pi: any): string | null {
  if (!pi) return null;
  if (typeof pi === "string") return pi;
  if (typeof pi === "object") return pi.id ?? null;
  return null;
}

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
    await supabaseAdmin.from("billing_events").insert({
      user_id: event.user_id,
      event_type: event.event_type,
      amount: event.amount ?? null,
      currency: event.currency ?? "usd",
      invoice_id: event.invoice_id ?? null,
      subscription_id: event.subscription_id ?? null,
      payment_intent_id: event.payment_intent_id ?? null,
      metadata: event.metadata ?? {},
      created_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[webhook] createBillingEvent error:", error);
  }
}

async function updateUsageLimits(userId: string, planId: string) {
  const planLimits: Record<string, { testCases: number; apiCalls: number }> = {
    free: { testCases: 20, apiCalls: 200 },
    pro: { testCases: 500, apiCalls: 5000 },
    team: { testCases: 2000, apiCalls: 20000 },
    enterprise: { testCases: -1, apiCalls: -1 },
  };

  const limits = planLimits[planId] ?? planLimits.free;
  const currentMonth = new Date().toISOString().slice(0, 7);

  try {
    const { data: existing } = await supabaseAdmin
      .from("user_usage")
      .select("test_cases_generated, api_calls_used")
      .eq("user_id", userId)
      .eq("month", currentMonth)
      .single();

    await supabaseAdmin.from("user_usage").upsert(
      {
        user_id: userId,
        month: currentMonth,
        test_cases_generated: existing?.test_cases_generated ?? 0,
        api_calls_used: existing?.api_calls_used ?? 0,
        monthly_limit_test_cases: limits.testCases,
        monthly_limit_api_calls: limits.apiCalls,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,month", ignoreDuplicates: false },
    );
  } catch (error) {
    console.error("[webhook] updateUsageLimits error:", error);
  }
}
