import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const type = requestUrl.searchParams.get("type");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      return NextResponse.redirect(
        new URL("/login?error=callback_error", request.url)
      );
    }
  }

  // Handle different auth flows
  if (type === "recovery") {
    // Password reset flow
    return NextResponse.redirect(new URL("/reset-password", request.url));
  }

  // Default flow (email confirmation, signup, etc.)
  return NextResponse.redirect(new URL("/dashboard", request.url));
}
