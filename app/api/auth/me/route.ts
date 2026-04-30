import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

//Get profile from database

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return NextResponse.json({ user: null });
  }

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("subscription_tier, subscription_status, full_name, avatar_url")
    .eq("id", user.id)
    .single();

  const subscriptionStatus = profile?.subscription_status ?? "inactive";
  const rawTier = profile?.subscription_tier ?? "free";
  const isActive =
    subscriptionStatus === "active" || subscriptionStatus === "trial";
  const subscription_tier = isActive && rawTier !== "free" ? rawTier : "free";

  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      user_metadata: user.user_metadata ?? {},
      full_name: profile?.full_name ?? user.user_metadata?.full_name ?? null,
      avatar_url: profile?.avatar_url ?? user.user_metadata?.avatar_url ?? null,
      subscription_tier,
      subscription_status: subscriptionStatus,
    },
  });
}
