import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function requireAuth() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return {
      user: null,
      response: NextResponse.json(
        { error: "Unauthorized", details: "Please sign in to continue" },
        { status: 401 }
      ),
    };
  }

  return { user, response: null };
}

// Optional: Get user without requiring auth
export async function getAuthUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  return { user: user ?? null, error };
}
