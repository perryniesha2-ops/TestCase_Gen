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

const inputCn = cn(
  "h-10 rounded-xl border-gray-200 bg-gray-50 text-sm text-gray-900 placeholder:text-gray-400",
  "dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-white/20",
  "focus-visible:border-cyan-400/50 focus-visible:ring-cyan-400/20",
  "dark:focus-visible:border-cyan-400/50 dark:focus-visible:ring-cyan-400/10",
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
    if (inFlightRef.current || cooldown > 0) return;

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
    <div className="relative flex min-h-screen items-center justify-center px-4">
      {/* ── Light mode background ── */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 -z-10 block dark:hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-sky-50" />
        <div
          className="absolute -left-40 -top-40 h-[600px] w-[600px] rounded-full opacity-20"
          style={{
            background:
              "radial-gradient(circle, #38bdf8 0%, #0ea5e9 50%, transparent 70%)",
            filter: "blur(80px)",
          }}
        />
        <div
          className="absolute -right-20 bottom-1/3 h-[400px] w-[400px] rounded-full opacity-10"
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
        {/* Gradient border */}
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

        {/* Card */}
        <div
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
            <div className="mb-8 flex flex-col items-center text-center">
              <Logo size="lg" />
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

              {/* Password + Confirm */}
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
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:text-white/25 dark:hover:text-white/50"
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
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:text-white/25 dark:hover:text-white/50"
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

            <p className="mt-6 text-center text-xs text-gray-400 dark:text-white/25">
              Already have an account?{" "}
              <Link
                href="/login"
                className="text-cyan-700 transition-colors hover:text-cyan-500 dark:text-cyan-400 dark:hover:text-cyan-300"
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
