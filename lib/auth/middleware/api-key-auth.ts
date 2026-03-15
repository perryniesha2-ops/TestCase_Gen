// lib/middleware/api-key-auth.ts
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export type ApiKeyAuthResult = {
  userId: string;
  email: string;
  subscriptionTier: "free" | "pro" | "team" | "enterprise";
  apiKey: string;
};

/**
 * Validate API key from Authorization header
 * For use in external API endpoints (e.g., /api/v1/*)
 */
export async function requireApiKey(request: Request): Promise<{
  user: ApiKeyAuthResult | null;
  response: NextResponse | null;
}> {
  // Extract API key from Authorization header
  const authHeader = request.headers.get("Authorization");

  if (!authHeader) {
    return {
      user: null,
      response: NextResponse.json(
        {
          error: "Missing API key",
          message:
            "Please provide an API key in the Authorization header: Bearer YOUR_API_KEY",
          docs: "https://docs.synthqa.com/api/authentication",
        },
        { status: 401 },
      ),
    };
  }

  // Support both formats:
  // Authorization: Bearer synthqa_abc123
  // Authorization: synthqa_abc123
  let apiKey = authHeader;
  if (authHeader.startsWith("Bearer ")) {
    apiKey = authHeader.substring(7);
  }

  // Validate API key format
  if (!apiKey.startsWith("synthqa_")) {
    return {
      user: null,
      response: NextResponse.json(
        {
          error: "Invalid API key format",
          message: 'API key must start with "synthqa_"',
        },
        { status: 401 },
      ),
    };
  }

  const supabase = await createClient();

  // Look up user by API key
  const { data: profile, error } = await supabase
    .from("user_profiles")
    .select("id, email, subscription_tier, subscription_status, api_key")
    .eq("api_key", apiKey)
    .single();

  if (error || !profile) {
    return {
      user: null,
      response: NextResponse.json(
        {
          error: "Invalid API key",
          message: "The provided API key is not valid or has been revoked",
        },
        { status: 401 },
      ),
    };
  }

  // Check subscription status
  const isActive =
    profile.subscription_status === "active" ||
    profile.subscription_status === "trial";

  const tier = isActive ? profile.subscription_tier : "free";

  return {
    user: {
      userId: profile.id,
      email: profile.email,
      subscriptionTier: tier || "free",
      apiKey: profile.api_key,
    },
    response: null,
  };
}

/**
 * Optional: Get API key user without requiring auth
 */
export async function getApiKeyUser(request: Request) {
  const authHeader = request.headers.get("Authorization");

  if (!authHeader) {
    return { user: null, error: "Missing Authorization header" };
  }

  let apiKey = authHeader;
  if (authHeader.startsWith("Bearer ")) {
    apiKey = authHeader.substring(7);
  }

  if (!apiKey.startsWith("synthqa_")) {
    return { user: null, error: "Invalid API key format" };
  }

  const supabase = await createClient();

  const { data: profile, error } = await supabase
    .from("user_profiles")
    .select("id, email, subscription_tier, api_key")
    .eq("api_key", apiKey)
    .single();

  if (error || !profile) {
    return { user: null, error: "Invalid API key" };
  }

  return {
    user: {
      userId: profile.id,
      email: profile.email,
      subscriptionTier: profile.subscription_tier || "free",
      apiKey: profile.api_key,
    },
    error: null,
  };
}
