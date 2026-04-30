// lib/stripe.ts

import Stripe from "stripe";
import { SupabaseClient } from "@supabase/supabase-js";

let _stripe: Stripe | null = null;

export function getStripeClient(): Stripe {
  if (_stripe) return _stripe;

  const apiKey = process.env.STRIPE_SECRET_KEY;
  if (!apiKey) throw new Error("STRIPE_SECRET_KEY is not configured");

  _stripe = new Stripe(apiKey, {
    apiVersion: "2026-01-28.clover",
  });

  return _stripe;
}

// ─── Ensure Stripe customer exists ───────────────────────────────────────────
// Used by subscribe and any other route that needs a Stripe customer.
// Returns the customer ID — creates one if needed.

export async function ensureStripeCustomer(
  stripe: Stripe,
  supabase: SupabaseClient,
  userId: string,
  userEmail: string | undefined,
  existingCustomerId?: string | null,
): Promise<string> {
  if (existingCustomerId) {
    try {
      await stripe.customers.retrieve(existingCustomerId);
      return existingCustomerId;
    } catch (err: any) {
      if (err.code !== "resource_missing") throw err;
      // Customer missing in Stripe — fall through to create
    }
  }

  // Create new Stripe customer
  const customer = await stripe.customers.create({
    email: userEmail,
    metadata: { user_id: userId },
  });

  // Persist new customer ID
  await supabase
    .from("user_profiles")
    .update({ stripe_customer_id: customer.id })
    .eq("id", userId);

  return customer.id;
}

// ─── Map Stripe statuses to DB statuses ──────────────────────────────────────

export function mapSubscriptionStatus(stripeStatus: string): string {
  const map: Record<string, string> = {
    trialing: "trial",
    active: "active",
    past_due: "past_due",
    canceled: "canceled",
    cancelled: "canceled",
    incomplete: "past_due",
    incomplete_expired: "canceled",
    unpaid: "past_due",
  };
  return map[stripeStatus] ?? "active";
}

// ─── Price ID lookup ──────────────────────────────────────────────────────────

const priceIds = {
  pro_monthly: process.env.STRIPE_PRO_MONTHLY_PRICE_ID,
  pro_yearly: process.env.STRIPE_PRO_YEARLY_PRICE_ID,
  team_monthly: process.env.STRIPE_TEAM_MONTHLY_PRICE_ID,
  team_yearly: process.env.STRIPE_TEAM_YEARLY_PRICE_ID,
} as const;

export function getPriceId(
  planId: string,
  isYearly: boolean,
): string | undefined {
  const key =
    `${planId}_${isYearly ? "yearly" : "monthly"}` as keyof typeof priceIds;
  return priceIds[key];
}
