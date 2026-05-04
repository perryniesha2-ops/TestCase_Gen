"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { login } from "@/app/auth/actions/auth";
import { cn } from "@/lib/utils";
import { useSingleFlight } from "@/lib/auth/use-single-flight";
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
      className="relative flex min-h-screen items-center justify-center px-4"
    >
      {/* ── Light mode background ── */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 -z-10 block dark:hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-sky-50" />
        <div
          className="absolute -right-40 -top-40 h-[600px] w-[600px] rounded-full opacity-20"
          style={{
            background:
              "radial-gradient(circle, #38bdf8 0%, #0ea5e9 50%, transparent 70%)",
            filter: "blur(80px)",
          }}
        />
        <div
          className="absolute -left-20 bottom-1/3 h-[400px] w-[400px] rounded-full opacity-10"
          style={{
            background:
              "radial-gradient(circle, #06b6d4 0%, #0284c7 50%, transparent 70%)",
            filter: "blur(100px)",
          }}
        />
      </div>

      {/* ── Dark mode aurora ── */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 -z-10 hidden dark:block"
      >
        <div className="absolute inset-0 bg-[#020810]" />
        <div
          className="absolute -left-[10%] -top-[10%] h-[70vh] w-[65vw] rounded-full"
          style={{
            background:
              "radial-gradient(ellipse at 30% 20%, #0d2a4a 0%, #0a1f3d 20%, #061428 45%, transparent 75%)",
            filter: "blur(70px)",
            animation: "auroraShift 8s ease-in-out infinite",
          }}
        />
        <div
          className="absolute -right-[15%] -top-[5%] h-[60vh] w-[55vw] rounded-full"
          style={{
            background:
              "radial-gradient(ellipse at 70% 20%, #0a1f3d 0%, #07152e 30%, transparent 70%)",
            filter: "blur(80px)",
            animation: "auroraShift2 10s ease-in-out infinite",
          }}
        />
        <div
          className="absolute left-[15%] -top-[5%] h-[55vh] w-[70vw] rounded-full"
          style={{
            background:
              "radial-gradient(ellipse at 50% 0%, #06b6d4 0%, #0284c7 18%, #034d8a 40%, transparent 68%)",
            filter: "blur(80px)",
            opacity: 0.35,
            animation: "auroraShift 6s ease-in-out infinite",
          }}
        />
        <div
          className="absolute left-[40%] bottom-0 h-[50vh] w-[50vw] rounded-full"
          style={{
            background:
              "radial-gradient(ellipse at 50% 100%, #0d2a4a 0%, #061428 50%, transparent 75%)",
            filter: "blur(80px)",
            opacity: 0.6,
            animation: "auroraShift2 9s ease-in-out infinite",
          }}
        />
        <div
          className="absolute top-0 left-0 right-0 h-[2px]"
          style={{
            background:
              "linear-gradient(90deg, transparent 0%, #06b6d4 25%, #38bdf8 50%, #06b6d4 75%, transparent 100%)",
            opacity: 0.5,
          }}
        />
        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.4) 1px, transparent 1px)",
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
        {/* Card glow halo */}
        <div
          aria-hidden="true"
          className="absolute -inset-[1px] rounded-2xl"
          style={{
            background:
              "linear-gradient(160deg, #22d3ee 0%, #0ea5e9 30%, #1d4ed8 70%, #0a0f1e 100%)",
            opacity: 0.7,
          }}
        />
        <div
          aria-hidden="true"
          className="absolute -inset-[3px] rounded-2xl"
          style={{
            background:
              "linear-gradient(160deg, #22d3ee 0%, #0ea5e9 40%, transparent 70%)",
            filter: "blur(10px)",
            opacity: 0.15,
          }}
        />

        <div
          data-testid="login-card"
          className="relative overflow-hidden rounded-[15px] border border-gray-200 bg-white shadow-2xl shadow-gray-200/50 backdrop-blur-xl dark:border-white/10 dark:bg-[#080f1e] dark:shadow-black/50"
          style={{ margin: "1px" }}
        >
          {/* Top rim light */}
          <div
            className="h-px w-full"
            style={{
              background:
                "linear-gradient(90deg, transparent, #06b6d4 40%, #38bdf8 50%, #06b6d4 60%, transparent)",
              opacity: 0.5,
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
              {/* Email */}
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
                  maxLength={254}
                  className={cn(
                    "h-10 rounded-xl border-gray-200 bg-gray-50 text-sm text-gray-900 placeholder:text-gray-400",
                    "dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-white/20",
                    "focus-visible:border-cyan-400/50 focus-visible:ring-cyan-400/20",
                    "dark:focus-visible:border-cyan-400/50 dark:focus-visible:ring-cyan-400/10",
                    "disabled:opacity-40",
                  )}
                />
              </div>

              {/* Password */}
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
                    minLength={6}
                    className={cn(
                      "h-10 rounded-xl border-gray-200 bg-gray-50 pr-10 text-sm text-gray-900 placeholder:text-gray-400",
                      "dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-white/20",
                      "focus-visible:border-cyan-400/50 focus-visible:ring-cyan-400/20",
                      "dark:focus-visible:border-cyan-400/50 dark:focus-visible:ring-cyan-400/10",
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
                    "group relative w-full overflow-hidden rounded-xl py-2.5 text-sm font-semibold text-white",
                    "bg-cyan-700 hover:bg-cyan-500 shadow-lg shadow-cyan-600/20",
                    "dark:bg-cyan-700 dark:hover:bg-cyan-400 dark:shadow-cyan-900/40",
                    "transition-all duration-200",
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

            <p
              data-testid="signup-prompt"
              className="mt-6 text-center text-xs text-gray-400 dark:text-white/25"
            >
              Don&apos;t have an account?{" "}
              <Link
                data-testid="signup-link"
                href="/signup"
                className="text-cyan-700 transition-colors hover:text-cyan-500 dark:text-cyan-400 dark:hover:text-cyan-300"
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
