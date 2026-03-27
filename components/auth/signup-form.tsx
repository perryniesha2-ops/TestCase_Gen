"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { customSignup } from "@/app/auth/actions/auth";
import { ArrowRight, Eye, EyeOff } from "lucide-react";
import { motion } from "framer-motion";
import { Logo } from "../pagecomponents/brandlogo";

const COOLDOWN_SECONDS = 3;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const inputCn = cn(
  "h-10 rounded-xl border-gray-300 bg-white text-sm text-gray-900 placeholder:text-gray-400",
  "dark:border-white/10 dark:bg-white/6 dark:text-white dark:placeholder:text-white/20",
  "focus-visible:border-blue-500/50 focus-visible:ring-blue-500/20",
  "dark:focus-visible:border-blue-400/50 dark:focus-visible:ring-blue-400/20",
  "disabled:opacity-40",
);

export function SignupForm() {
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const inFlightRef = useRef(false);
  const cooldownTimerRef = useRef<number | null>(null);

  const router = useRouter();

  const disabled = loading || cooldown > 0;

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

    if (inFlightRef.current) return;
    if (cooldown > 0) return;

    inFlightRef.current = true;
    setLoading(true);

    const formData = new FormData(e.currentTarget);

    const password = (formData.get("password") ?? "").toString();
    const confirmPassword = (formData.get("confirmPassword") ?? "").toString();
    const email = (formData.get("email") ?? "").toString();

    if (email.length > 254) {
      toast.error("Email address must not exceed 254 characters");
      setLoading(false);
      inFlightRef.current = false;
      startCooldown(COOLDOWN_SECONDS);
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Passwords don't match");
      setLoading(false);
      inFlightRef.current = false;
      startCooldown(COOLDOWN_SECONDS);
      return;
    }

    try {
      const result = await customSignup(formData);

      if (result?.error) {
        toast.error("Signup failed", { description: result.error });
      } else if (result?.success && result?.requiresConfirmation) {
        toast.success("Account created!", {
          description: "Please check your email to confirm your account.",
        });
      } else if (result?.success) {
        router.push("/dashboard");
      } else {
        toast.error("Signup failed", { description: "Unexpected response." });
      }
    } catch (error) {
      toast.error("An unexpected error occurred");
      console.error(error);
    } finally {
      setLoading(false);
      inFlightRef.current = false;
      startCooldown(COOLDOWN_SECONDS);
    }
  }

  return (
    <div className="landing-bg relative flex min-h-screen items-center justify-center px-4">
      {/* Atmospheric glows */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <div
          className="absolute -right-40 -top-40 h-125 w-125 rounded-full opacity-20"
          style={{
            background: "radial-gradient(circle, #3b82f6, transparent 65%)",
            filter: "blur(80px)",
          }}
        />
        <div
          className="absolute -bottom-20 -left-20 h-100 w-100 rounded-full opacity-15"
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
        {/* Card glow halo */}
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 scale-110 rounded-3xl opacity-30"
          style={{
            background:
              "radial-gradient(ellipse at 50% 80%, #3b82f6, transparent 65%)",
            filter: "blur(40px)",
          }}
        />

        {/* Card */}
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl shadow-gray-200 backdrop-blur-xl dark:border-white/10 dark:bg-white/5 dark:shadow-black/50">
          {/* Top accent line */}
          <div
            className="h-px w-full"
            style={{
              background:
                "linear-gradient(90deg, transparent, rgba(96,165,250,0.6) 40%, rgba(167,139,250,0.6) 60%, transparent)",
            }}
          />

          <div className="px-8 pb-8 pt-7">
            {/* Header */}
            <div className="mb-8 flex flex-col items-center text-center">
              <span className="text-lg font-bold tracking-tight text-gray-900 dark:text-white">
                <Logo size="lg" />
              </span>
              <p className="mt-1 text-sm text-gray-500 dark:text-white/35">
                Create your account
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Full Name */}
              <div className="space-y-1.5">
                <label
                  htmlFor="name"
                  className="text-xs font-medium text-gray-600 dark:text-white/50"
                >
                  Full Name
                </label>
                <Input
                  id="name"
                  name="name"
                  type="text"
                  required
                  disabled={disabled}
                  placeholder="John Doe"
                  className={inputCn}
                />
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <label
                  htmlFor="email"
                  className="text-xs font-medium text-gray-600 dark:text-white/50"
                >
                  Email
                </label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  required
                  maxLength={254}
                  disabled={disabled}
                  placeholder="you@company.com"
                  className={inputCn}
                />
              </div>

              {/* Password + Confirm side by side */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label
                    htmlFor="password"
                    className="text-xs font-medium text-gray-600 dark:text-white/50"
                  >
                    Password
                  </label>
                  <div className="relative">
                    <Input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      required
                      minLength={6}
                      maxLength={72}
                      disabled={disabled}
                      placeholder="••••••••"
                      className={cn(inputCn, "pr-10")}
                    />
                    <button
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

                <div className="space-y-1.5">
                  <label
                    htmlFor="confirmPassword"
                    className="text-xs font-medium text-gray-600 dark:text-white/50"
                  >
                    Confirm
                  </label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      name="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      required
                      minLength={6}
                      maxLength={72}
                      disabled={disabled}
                      placeholder="••••••••"
                      className={cn(inputCn, "pr-10")}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 transition-colors hover:text-gray-600 dark:text-white/25 dark:hover:text-white/50"
                      tabIndex={-1}
                      aria-label={
                        showConfirmPassword ? "Hide password" : "Show password"
                      }
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
              <p className="text-[11px] text-gray-400 dark:text-white/25">
                Must be at least 6 characters long.
              </p>

              {/* Submit */}
              <div className="pt-1">
                <button
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
                      Creating account...
                    </>
                  ) : cooldown > 0 ? (
                    `Please wait ${cooldown}s...`
                  ) : (
                    <>
                      Create account
                      <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* Sign in link */}
            <p className="mt-6 text-center text-xs text-gray-400 dark:text-white/25">
              Already have an account?{" "}
              <Link
                href="/login"
                className="text-gray-600 transition-colors hover:text-gray-900 dark:text-white/50 dark:hover:text-white/80"
              >
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
