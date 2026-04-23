"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { login } from "@/app/auth/actions/auth";
import { cn } from "@/lib/utils";
import { useSingleFlight } from "@/lib/auth/use-single-flight";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth/auth-context";
import { AlertCircle, Mail, ArrowRight, Eye, EyeOff } from "lucide-react";
import { motion } from "framer-motion";
import { Logo } from "../pagecomponents/brandlogo";

const COOLDOWN_SECONDS = 3;

export function LoginForm() {
  const router = useRouter();

  const [cooldown, setCooldown] = useState(0);
  const cooldownTimerRef = useRef<number | null>(null);
  const [emailNotConfirmed, setEmailNotConfirmed] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const { run, loading } = useSingleFlight(async (formData: FormData) => {
    return await login(formData);
  });

  const disabled = loading || cooldown > 0;
  const { refreshAuth } = useAuth();

  useEffect(() => {
    return () => {
      if (cooldownTimerRef.current)
        window.clearInterval(cooldownTimerRef.current);
    };
  }, []);

  function startCooldown(seconds: number) {
    if (cooldownTimerRef.current)
      window.clearInterval(cooldownTimerRef.current);
    setCooldown(seconds);
    cooldownTimerRef.current = window.setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          if (cooldownTimerRef.current)
            window.clearInterval(cooldownTimerRef.current);
          cooldownTimerRef.current = null;
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setEmailNotConfirmed(false);
    if (cooldown > 0) return;

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const result = await run(formData);
    if (!result) return;

    startCooldown(COOLDOWN_SECONDS);

    if ("error" in result) {
      if (result.code === "EMAIL_NOT_CONFIRMED") {
        setEmailNotConfirmed(true);
        setUserEmail(email);
        toast.error("Email not confirmed", { description: result.error });
      } else {
        toast.error("Login failed", { description: result.error });
      }
      return;
    }

    toast.success("Welcome back!");
    await refreshAuth();
    router.replace("/dashboard");
    router.refresh();
  }

  return (
    <div
      data-testid="login-page"
      className="landing-bg relative flex min-h-screen items-center justify-center px-4"
    >
      {/* Atmospheric glows */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <div
          className="absolute -left-40 -top-40 h-[500px] w-[500px] rounded-full opacity-20"
          style={{
            background: "radial-gradient(circle, #3b82f6, transparent 65%)",
            filter: "blur(80px)",
          }}
        />
        <div
          className="absolute -bottom-20 -right-20 h-[400px] w-[400px] rounded-full opacity-15"
          style={{
            background: "radial-gradient(circle, #a78bfa, transparent 65%)",
            filter: "blur(80px)",
          }}
        />
        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />
      </div>

      <motion.div
        className="relative w-full max-w-sm"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      >
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 scale-110 rounded-3xl opacity-30"
          style={{
            background:
              "radial-gradient(ellipse at 50% 80%, #3b82f6, transparent 65%)",
            filter: "blur(40px)",
          }}
        />

        <div
          data-testid="login-card"
          className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl shadow-gray-200 backdrop-blur-xl dark:border-white/10 dark:bg-white/5 dark:shadow-black/50"
        >
          <div
            className="h-px w-full"
            style={{
              background:
                "linear-gradient(90deg, transparent, rgba(96,165,250,0.6) 40%, rgba(167,139,250,0.6) 60%, transparent)",
            }}
          />

          <div className="px-8 pb-8 pt-7">
            {/* Header */}
            <div
              data-testid="login-header"
              className="mb-8 flex flex-col items-center text-center"
            >
              <Logo size="lg" />
              <p className="mt-1 text-sm text-gray-500 dark:text-white/35">
                Welcome back
              </p>
            </div>

            {/* Email not confirmed alert */}
            {emailNotConfirmed && (
              <motion.div
                data-testid="email-not-confirmed-alert"
                className="mb-5 overflow-hidden rounded-xl border border-red-300 bg-red-50 p-4 dark:border-red-500/20 dark:bg-red-500/10"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                transition={{ duration: 0.3 }}
              >
                <div className="flex items-start gap-3">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600 dark:text-red-400" />
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-red-700 dark:text-red-300">
                      Email not confirmed
                    </p>
                    <p className="text-xs leading-relaxed text-red-600 dark:text-red-300/70">
                      Check your inbox for the confirmation email.
                    </p>
                    <Link
                      data-testid="resend-confirmation-link"
                      href={`/resend-confirmation?email=${encodeURIComponent(userEmail)}`}
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-red-700 underline-offset-2 hover:underline dark:text-red-300"
                    >
                      <Mail className="h-3 w-3" />
                      Resend confirmation email
                    </Link>
                  </div>
                </div>
              </motion.div>
            )}

            <form
              data-testid="login-form"
              onSubmit={handleSubmit}
              className="space-y-4"
            >
              {/* Email field */}
              <div className="space-y-1.5">
                <label
                  htmlFor="email"
                  className="text-xs font-medium text-gray-600 dark:text-white/50"
                >
                  Email
                </label>
                <Input
                  data-testid="login-email-input"
                  id="email"
                  name="email"
                  type="email"
                  required
                  disabled={disabled}
                  defaultValue={userEmail}
                  placeholder="you@company.com"
                  className={cn(
                    "h-10 rounded-xl border-gray-300 bg-white text-sm text-gray-900 placeholder:text-gray-400 dark:border-white/10 dark:bg-white/6 dark:text-white dark:placeholder:text-white/20",
                    "focus-visible:border-blue-500/50 focus-visible:ring-blue-500/20 dark:focus-visible:border-blue-400/50 dark:focus-visible:ring-blue-400/20",
                    "disabled:opacity-40",
                  )}
                />
              </div>

              {/* Password field */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="password"
                    className="text-xs font-medium text-gray-600 dark:text-white/50"
                  >
                    Password
                  </label>
                  <Link
                    data-testid="forgot-password-link"
                    href="/forgot-password"
                    className="text-xs text-gray-400 transition-colors hover:text-gray-700 dark:text-white/30 dark:hover:text-white/60"
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <Input
                    data-testid="login-password-input"
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    required
                    disabled={disabled}
                    placeholder="••••••••"
                    className={cn(
                      "h-10 rounded-xl border-gray-300 bg-white pr-10 text-sm text-gray-900 placeholder:text-gray-400 dark:border-white/10 dark:bg-white/6 dark:text-white dark:placeholder:text-white/20",
                      "focus-visible:border-blue-500/50 focus-visible:ring-blue-500/20 dark:focus-visible:border-blue-400/50 dark:focus-visible:ring-blue-400/20",
                      "disabled:opacity-40",
                    )}
                  />
                  <button
                    data-testid="toggle-password-visibility"
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 transition-colors hover:text-gray-600 dark:text-white/25 dark:hover:text-white/50"
                    tabIndex={-1}
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Submit */}
              <div className="pt-1">
                <button
                  data-testid="login-submit-button"
                  type="submit"
                  disabled={disabled}
                  aria-busy={loading}
                  className={cn(
                    "group relative w-full overflow-hidden rounded-xl bg-gray-900 py-2.5 text-sm font-semibold text-white dark:bg-white dark:text-gray-900",
                    "transition-all duration-200 hover:bg-gray-800 hover:shadow-lg hover:shadow-gray-900/10 dark:hover:bg-white/90 dark:hover:shadow-white/10",
                    "disabled:cursor-not-allowed disabled:opacity-50",
                    "flex items-center justify-center gap-2",
                  )}
                >
                  {loading ? (
                    <>
                      <svg
                        className="h-4 w-4 animate-spin"
                        viewBox="0 0 24 24"
                        fill="none"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                        />
                      </svg>
                      Signing in...
                    </>
                  ) : cooldown > 0 ? (
                    `Please wait ${cooldown}s...`
                  ) : (
                    <>
                      Sign in
                      <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* Sign up link */}
            <p
              data-testid="signup-prompt"
              className="mt-6 text-center text-xs text-gray-400 dark:text-white/25"
            >
              Don&apos;t have an account?{" "}
              <Link
                data-testid="signup-link"
                href="/signup"
                className="text-gray-600 transition-colors hover:text-gray-900 dark:text-white/50 dark:hover:text-white/80"
              >
                Sign up
              </Link>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
