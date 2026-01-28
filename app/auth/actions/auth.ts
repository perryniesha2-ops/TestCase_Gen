"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AuthTokenService, type UserMetadata } from "@/lib/password-reset";
import { createEmailService } from "@/lib/email-service";
import { NextResponse } from "next/server";

type AuthResult =
  | { success: true; message?: string; requiresConfirmation?: boolean }
  | { error: string; code?: string; retryAfterSeconds?: number };

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export async function signup(formData: FormData) {
  const supabase = await createClient();

  // Get form data
  const data = {
    email: formData.get("email") as string,
    password: formData.get("password") as string,
    name: formData.get("name") as string,
  };

  // Validate inputs
  if (!data.email || !data.password) {
    return { error: "Email and password are required" };
  }

  if (data.password.length < 6) {
    return { error: "Password must be at least 6 characters" };
  }

  // Create user in Supabase Auth
  const { data: authData, error } = await supabase.auth.signUp({
    email: data.email,
    password: data.password,
    options: {
      data: {
        full_name: data.name,
      },
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
    },
  });

  if (error) {
    return { error: error.message };
  }

  // Check if email confirmation is required
  if (authData.user && !authData.session) {
    return {
      success: true,
      message: "Check your email to confirm your account!",
    };
  }

  // Return success, let the client handle redirect
  revalidatePath("/", "layout");
  return { success: true };
}

export async function login(formData: FormData): Promise<AuthResult> {
  try {
    const supabase = await createClient();

    const email = normalizeEmail((formData.get("email") ?? "").toString());
    const password = (formData.get("password") ?? "").toString();

    if (!email || !password) {
      return { error: "Email and password are required", code: "VALIDATION" };
    }

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      const msg = (error.message || "").toLowerCase();

      // Check if it's an email confirmation issue
      if (msg.includes("email not confirmed") || msg.includes("confirm")) {
        return {
          error: "Please confirm your email address before logging in.",
          code: "EMAIL_NOT_CONFIRMED",
        };
      }

      if (msg.includes("too many") || msg.includes("rate")) {
        return {
          error: "Too many attempts. Please wait and try again.",
          code: "RATE_LIMITED",
          retryAfterSeconds: 30,
        };
      }

      return {
        error: "Invalid email or password.",
        code: "INVALID_CREDENTIALS",
      };
    }

    revalidatePath("/", "layout");
    return { success: true };
  } catch (e) {
    console.error("login failed:", e);
    return { error: "An unexpected error occurred.", code: "SERVER_ERROR" };
  }
}

export async function logout() {
  const supabase = await createClient();

  try {
    // Sign out from Supabase (clears server-side session)
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error("Logout error:", error);
      return { error: error.message };
    }

    // Clear any cached data
    revalidatePath("/", "layout");

    // Redirect to login page
    redirect("/login");
  } catch (error) {
    console.error("Unexpected logout error:", error);
    return { error: "An unexpected error occurred during logout" };
  }
}

// Client-side logout helper for additional cleanup
export async function logoutWithCleanup() {
  const supabase = await createClient();

  try {
    // Sign out from Supabase
    const { error } = await supabase.auth.signOut();

    if (error) {
      throw error;
    }

    // Clear any localStorage items related to our app
    if (typeof window !== "undefined") {
      // Clear any app-specific localStorage items
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (
          key &&
          (key.startsWith("synthqa-") ||
            key.startsWith("test-case-") ||
            key.startsWith("requirement-") ||
            key.includes("generator-"))
        ) {
          keysToRemove.push(key);
        }
      }

      // Remove app-specific items
      keysToRemove.forEach((key) => localStorage.removeItem(key));

      // Clear sessionStorage as well
      sessionStorage.clear();

      // Force reload to ensure clean state
      window.location.href = "/login";
    }

    return { success: true };
  } catch (error) {
    console.error("Logout error:", error);
    throw error;
  }
}

// Custom signup with email confirmation
export async function customSignup(formData: FormData) {
  const data = {
    email: formData.get("email") as string,
    password: formData.get("password") as string,
    name: formData.get("name") as string,
  };

  // Validate inputs
  if (!data.email || !data.password) {
    return { error: "Email and password are required" };
  }

  if (data.password.length < 6) {
    return { error: "Password must be at least 6 characters" };
  }

  try {
    const supabase = await createClient();

    // Create user in Supabase Auth without confirmation
    const { data: authData, error } = await supabase.auth.admin.createUser({
      email: data.email,
      password: data.password,
      user_metadata: {
        full_name: data.name,
      },
      email_confirm: false, // We'll handle confirmation ourselves
    });

    if (error) {
      return { error: error.message };
    }

    if (!authData.user) {
      return { error: "Failed to create user" };
    }

    // Create custom confirmation token
    const tokenResult = await AuthTokenService.createConfirmationToken(
      data.email,
      authData.user.id,
      { full_name: data.name },
    );

    if (!tokenResult.success) {
      return {
        error: tokenResult.error || "Failed to create confirmation token",
      };
    }

    // Send confirmation email
    const emailService = createEmailService();
    if (!emailService) {
      return { error: "Email service not configured" };
    }

    const emailSent = await emailService.sendConfirmationEmail({
      to: data.email,
      token: tokenResult.token!,
      expiresAt: tokenResult.expiresAt!,
      userName: data.name,
    });

    if (!emailSent) {
      return { error: "Failed to send confirmation email" };
    }

    return {
      success: true,
      message:
        "Account created! Please check your email to confirm your account.",
      requiresConfirmation: true,
    };
  } catch (error) {
    console.error("Custom signup error:", error);
    return { error: "An unexpected error occurred" };
  }
}

// Confirm email with custom token
export async function confirmEmail(formData: FormData) {
  const token = formData.get("token") as string;

  if (!token) {
    return { error: "Confirmation token is required" };
  }

  try {
    // Verify token
    const tokenResult = await AuthTokenService.verifyConfirmationToken(token);

    if (!tokenResult.valid) {
      return { error: tokenResult.error || "Invalid confirmation token" };
    }

    // Confirm user in Supabase Auth
    const supabase = await createClient();
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      tokenResult.userId!,
      { email_confirm: true },
    );

    if (updateError) {
      return { error: "Failed to confirm email" };
    }

    // Mark token as used
    await AuthTokenService.markConfirmationTokenAsUsed(tokenResult.tokenId!);

    return {
      success: true,
      message: "Email confirmed successfully! You can now log in.",
      email: tokenResult.email,
    };
  } catch (error) {
    console.error("Email confirmation error:", error);
    return { error: "An unexpected error occurred" };
  }
}

// Resend confirmation email
export async function resendConfirmationEmail(formData: FormData) {
  const email = formData.get("email") as string;

  if (!email) {
    return { error: "Email is required" };
  }

  try {
    const supabase = await createClient();

    // Find user by email
    const {
      data: { users },
      error: userError,
    } = await supabase.auth.admin.listUsers();
    const user = users?.find((u) => u.email === email);

    if (!user) {
      // Don't reveal if email exists or not for security
      return {
        success: true,
        message:
          "If that email exists and needs confirmation, we've sent a new link.",
      };
    }

    // Check if user is already confirmed
    if (user.email_confirmed_at) {
      return {
        error: "This email is already confirmed. You can log in normally.",
      };
    }

    // Create new confirmation token
    const tokenResult = await AuthTokenService.createConfirmationToken(
      email,
      user.id,
      user.user_metadata,
    );

    if (!tokenResult.success) {
      return {
        error: tokenResult.error || "Failed to create confirmation token",
      };
    }

    // Send new confirmation email
    const emailService = createEmailService();
    if (!emailService) {
      return { error: "Email service not configured" };
    }

    const emailSent = await emailService.sendConfirmationEmail({
      to: email,
      token: tokenResult.token!,
      expiresAt: tokenResult.expiresAt!,
      userName: user.user_metadata?.full_name,
    });

    if (!emailSent) {
      return { error: "Failed to send confirmation email" };
    }

    return {
      success: true,
      message: "New confirmation email sent! Please check your inbox.",
    };
  } catch (error) {
    return { error: "An unexpected error occurred" };
  }
}

// app/actions/auth.ts - Update customResetPassword

export async function customResetPassword(formData: FormData) {
  const email = formData.get("email") as string;

  if (!email) {
    return { error: "Email is required" };
  }

  try {
    const supabase = await createClient();

    // Check if user exists and if email is confirmed
    const {
      data: { users },
      error: userError,
    } = await supabase.auth.admin.listUsers();
    const user = users?.find((u) => u.email === normalizeEmail(email));

    if (!user) {
      // Don't reveal if email exists
      return {
        success: true,
        message:
          "If that email exists, we've sent a reset link. Check your inbox!",
      };
    }

    // If email is not confirmed, offer to resend confirmation instead
    if (!user.email_confirmed_at) {
      return {
        error: "This email address hasn't been confirmed yet.",
        code: "EMAIL_NOT_CONFIRMED",
        message:
          "Please confirm your email first. We can resend the confirmation email if needed.",
      };
    }

    // Create reset token
    const result = await AuthTokenService.createResetToken(email);

    if (!result.success) {
      return { error: result.error || "Failed to create reset token" };
    }

    // Send email if token was created successfully
    if (result.token && result.email && result.expiresAt) {
      const emailService = createEmailService();

      if (!emailService) {
        return { error: "Email service not configured" };
      }

      const emailSent = await emailService.sendPasswordResetEmail({
        to: result.email,
        token: result.token,
        expiresAt: result.expiresAt,
      });

      if (!emailSent) {
        return { error: "Failed to send reset email" };
      }
    }

    return {
      success: true,
      message:
        "If that email exists, we've sent a reset link. Check your inbox!",
    };
  } catch (error) {
    console.error("Password reset error:", error);
    return { error: "An unexpected error occurred" };
  }
}

export async function customUpdatePassword(formData: FormData) {
  const token = formData.get("token") as string;
  const password = formData.get("password") as string;

  if (!token) {
    return { error: "Reset token is required" };
  }

  if (!password || password.length < 6) {
    return { error: "Password must be at least 6 characters" };
  }

  try {
    // Verify token
    const tokenResult = await AuthTokenService.verifyResetToken(token);

    if (!tokenResult.valid) {
      return { error: tokenResult.error || "Invalid reset token" };
    }

    // Update password in Supabase Auth
    const supabase = await createClient();
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      tokenResult.userId!,
      { password },
    );

    if (updateError) {
      return { error: "Failed to update password" };
    }

    // Mark token as used
    await AuthTokenService.markResetTokenAsUsed(tokenResult.tokenId!);

    return {
      success: true,
      message: "Password updated successfully",
    };
  } catch (error) {
    return { error: "An unexpected error occurred" };
  }
}

export async function updatePassword(formData: FormData) {
  const supabase = await createClient();
  const password = formData.get("password") as string;

  if (!password || password.length < 6) {
    return { error: "Password must be at least 6 characters" };
  }

  const { error } = await supabase.auth.updateUser({
    password: password,
  });

  if (error) {
    return { error: error.message };
  }

  return {
    success: true,
    message: "Password updated successfully",
  };
}
