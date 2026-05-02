"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { customResetPassword } from "@/app/auth/actions/auth";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import {
  ArrowLeft,
  ArrowRight,
  AlertTriangle,
  Mail,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { motion } from "framer-motion";
import { Logo } from "../pagecomponents/brandlogo";

const inputCn = cn(
  "h-10 rounded-xl border-gray-200 bg-gray-50 text-sm text-gray-900 placeholder:text-gray-400",
  "dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-white/20",
  "focus-visible:border-cyan-400/50 focus-visible:ring-cyan-400/20",
  "dark:focus-visible:border-cyan-400/50 dark:focus-visible:ring-cyan-400/10",
  "disabled:opacity-40",
);

export function ForgotPasswordForm() {
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [email, setEmail] = useState("");
  const [emailNotConfirmed, setEmailNotConfirmed] = useState(false);
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  useEffect(() => {
    if (error === "expired") {
      toast.error("Reset link expired", {
        description:
          "The password reset link has expired. Please request a new one.",
        duration: 5000,
      });
    }
  }, [error]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setEmailNotConfirmed(false);

    const formData = new FormData(e.currentTarget);
    const enteredEmail = String(formData.get("email") || "");

    try {
      const result = await customResetPassword(formData);
      if (result?.error) {
        if (result.code === "EMAIL_NOT_CONFIRMED") {
          setEmailNotConfirmed(true);
          setEmail(enteredEmail);
          toast.error("Email not confirmed", {
            description: result.message || result.error,
          });
        } else {
          toast.error("Reset failed", { description: result.error });
        }
      } else if (result?.success) {
        setEmail(enteredEmail);
        setSent(true);
        toast.success("Reset email sent!", { description: result.message });
      } else {
        toast.error("Reset failed", { description: "Please try again." });
      }
    } catch (err) {
      console.error(err);
      toast.error("An unexpected error occurred");
    } finally {
      setLoading(false);
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
                {sent ? "Check your email" : "Reset your password"}
              </p>
            </div>

            {/* Sent state */}
            {sent ? (
              <div className="space-y-4">
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-500/20 dark:bg-emerald-500/10">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-emerald-800 dark:text-emerald-300">
                        Reset link sent
                      </p>
                      <p className="text-xs leading-relaxed text-emerald-700 dark:text-emerald-300/70">
                        We&apos;ve emailed a reset link to{" "}
                        <span className="font-semibold">{email}</span>. The link
                        expires in 1 hour.
                      </p>
                    </div>
                  </div>
                </div>

                {error === "expired" && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-500/20 dark:bg-amber-500/10">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                      <p className="text-xs leading-relaxed text-amber-700 dark:text-amber-300/80">
                        Your previous link expired. This new link will also
                        expire in 1 hour.
                      </p>
                    </div>
                  </div>
                )}

                <p className="text-center text-[11px] text-gray-400 dark:text-white/25">
                  Didn&apos;t receive it? Check spam/junk, or try another
                  address.
                </p>

                <button
                  type="button"
                  onClick={() => {
                    setSent(false);
                    setEmail("");
                  }}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 text-sm font-medium text-gray-700 transition-all hover:bg-gray-100 dark:border-white/10 dark:bg-white/5 dark:text-white/70 dark:hover:bg-white/10 dark:hover:text-white"
                >
                  Send another link
                </button>

                <p className="text-center text-xs text-gray-400 dark:text-white/25">
                  <Link
                    href="/login"
                    className="inline-flex items-center gap-1 text-cyan-600 transition-colors hover:text-cyan-500 dark:text-cyan-400 dark:hover:text-cyan-300"
                  >
                    <ArrowLeft className="h-3 w-3" />
                    Back to login
                  </Link>
                </p>
              </div>
            ) : (
              /* Default state */
              <div className="space-y-4">
                {error === "expired" && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-500/20 dark:bg-amber-500/10">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                      <p className="text-xs leading-relaxed text-amber-700 dark:text-amber-300/80">
                        Your reset link expired. Request a new one below.
                      </p>
                    </div>
                  </div>
                )}

                {emailNotConfirmed && (
                  <motion.div
                    className="rounded-xl border border-red-300 bg-red-50 p-4 dark:border-red-500/20 dark:bg-red-500/10"
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
                          Confirm your email before resetting your password.
                        </p>
                        <Link
                          href={`/resend-confirmation?email=${encodeURIComponent(email)}`}
                          className="inline-flex items-center gap-1.5 text-xs font-medium text-red-700 underline-offset-2 hover:underline dark:text-red-300"
                        >
                          <Mail className="h-3 w-3" />
                          Resend confirmation email
                        </Link>
                      </div>
                    </div>
                  </motion.div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
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
                      placeholder="you@company.com"
                      required
                      disabled={loading}
                      defaultValue={email}
                      className={inputCn}
                    />
                  </div>

                  <div className="pt-1">
                    <button
                      type="submit"
                      disabled={loading}
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
                          Sending...
                        </>
                      ) : (
                        <>
                          Send reset link
                          <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
                        </>
                      )}
                    </button>
                  </div>
                </form>

                <p className="text-center text-xs text-gray-400 dark:text-white/25">
                  <Link
                    href="/login"
                    className="inline-flex items-center gap-1 text-cyan-700 transition-colors hover:text-cyan-500 dark:text-cyan-400 dark:hover:text-cyan-300"
                  >
                    <ArrowLeft className="h-3 w-3" />
                    Back to login
                  </Link>
                </p>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
