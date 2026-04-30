// app/api/billing/refresh-tier/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("subscription_tier, subscription_status")
    .eq("id", user.id)
    .single();

  const status = profile?.subscription_status ?? "inactive";
  const tier = profile?.subscription_tier ?? "free";
  const isActive = status === "active" || status === "trial";
  const userTier = isActive && tier !== "free" ? tier : "free";

  const response = NextResponse.json({ tier: userTier });

  // Reset the middleware cookie with fresh data
  response.cookies.set("user_tier", userTier, {
    maxAge: 5 * 60,
    httpOnly: true,
    sameSite: "lax",
  });
  response.cookies.set("tier_cache_time", Date.now().toString(), {
    maxAge: 5 * 60,
    httpOnly: true,
    sameSite: "lax",
  });

  return response;
}
