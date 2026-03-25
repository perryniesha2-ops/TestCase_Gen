"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Mail, AlertCircle, CheckCircle2, ArrowRight, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { resendConfirmationEmail } from "@/app/auth/actions/auth";
import { motion } from "framer-motion";
import { Logo } from "../pagecomponents/brandlogo";

const inputCn = cn(
  "h-10 rounded-xl border-gray-300 bg-white text-sm text-gray-900 placeholder:text-gray-400",
  "dark:border-white/10 dark:bg-white/6 dark:text-white dark:placeholder:text-white/20",
  "focus-visible:border-blue-500/50 focus-visible:ring-blue-500/20",
  "dark:focus-visible:border-blue-400/50 dark:focus-visible:ring-blue-400/20",
  "disabled:opacity-40",
);

export function ResendConfirmationPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    success?: boolean;
    error?: string;
    message?: string;
  } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    const formData = new FormData();
    formData.append("email", email);

    const response = await resendConfirmationEmail(formData);
    setResult(response);
    setLoading(false);
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
              <Logo size="lg" />
              <p className="mt-1 text-sm text-gray-500 dark:text-white/35">
                Resend confirmation email
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email field */}
              <div className="space-y-1.5">
                <label
                  htmlFor="email"
                  className="text-xs font-medium text-gray-600 dark:text-white/50"
                >
                  Email Address
                </label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                  className={inputCn}
                />
              </div>

              {/* Error alert */}
              {result?.error && (
                <motion.div
                  className="rounded-xl border border-red-300 bg-red-50 p-4 dark:border-red-500/20 dark:bg-red-500/10"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="flex items-start gap-3">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600 dark:text-red-400" />
                    <p className="text-sm text-red-700 dark:text-red-300">
                      {result.error}
                    </p>
                  </div>
                </motion.div>
              )}

              {/* Success alert */}
              {result?.success && (
                <motion.div
                  className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-500/20 dark:bg-emerald-500/10"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                    <p className="text-sm text-emerald-800 dark:text-emerald-300">
                      {result.message}
                    </p>
                  </div>
                </motion.div>
              )}

              {/* Submit */}
              <div className="pt-1">
                <button
                  type="submit"
                  disabled={loading}
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
                      Sending...
                    </>
                  ) : (
                    <>
                      Send Confirmation Email
                      <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* Footer links */}
            <div className="mt-6 space-y-2 text-center text-xs text-gray-400 dark:text-white/25">
              <p>
                Already confirmed?{" "}
                <Link
                  href="/login"
                  className="text-gray-600 transition-colors hover:text-gray-900 dark:text-white/50 dark:hover:text-white/80"
                >
                  Sign in
                </Link>
              </p>
              <p>
                Don&apos;t have an account?{" "}
                <Link
                  href="/signup"
                  className="text-gray-600 transition-colors hover:text-gray-900 dark:text-white/50 dark:hover:text-white/80"
                >
                  Sign up
                </Link>
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
