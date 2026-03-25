"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { customResetPassword } from "@/app/auth/actions/auth";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { ArrowLeft, ArrowRight, AlertTriangle, Mail, AlertCircle, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";
import { Logo } from "../pagecomponents/brandlogo";

const inputCn = cn(
  "h-10 rounded-xl border-gray-300 bg-white text-sm text-gray-900 placeholder:text-gray-400",
  "dark:border-white/10 dark:bg-white/6 dark:text-white dark:placeholder:text-white/20",
  "focus-visible:border-blue-500/50 focus-visible:ring-blue-500/20",
  "dark:focus-visible:border-blue-400/50 dark:focus-visible:ring-blue-400/20",
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
    <div className="landing-bg relative flex min-h-screen items-center justify-center px-4">
      {/* Atmospheric glows */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <div
          className="absolute -left-40 -top-40 h-125 w-125 rounded-full opacity-20"
          style={{
            background: "radial-gradient(circle, #3b82f6, transparent 65%)",
            filter: "blur(80px)",
          }}
        />
        <div
          className="absolute -bottom-20 -right-20 h-100 w-100 rounded-full opacity-15"
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
                {sent ? "Check your email" : "Reset your password"}
              </p>
            </div>

            {/* --- SENT STATE --- */}
            {sent ? (
              <div className="space-y-4">
                {/* Success box */}
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

                {/* Expired warning (if came from expired link) */}
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

                {/* Send another link */}
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => { setSent(false); setEmail(""); }}
                    className={cn(
                      "w-full rounded-xl border border-gray-300 bg-gray-100 py-2.5 text-sm font-medium text-gray-700",
                      "transition-all duration-200 hover:bg-gray-200 hover:text-gray-900",
                      "dark:border-white/10 dark:bg-white/5 dark:text-white/70 dark:hover:bg-white/10 dark:hover:text-white",
                    )}
                  >
                    Send another link
                  </button>
                </div>

                <p className="text-center text-xs text-gray-400 dark:text-white/25">
                  <Link
                    href="/login"
                    className="inline-flex items-center gap-1 text-gray-600 transition-colors hover:text-gray-900 dark:text-white/50 dark:hover:text-white/80"
                  >
                    <ArrowLeft className="h-3 w-3" />
                    Back to login
                  </Link>
                </p>
              </div>
            ) : (
              /* --- DEFAULT STATE --- */
              <div className="space-y-4">
                {/* Expired link alert */}
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

                {/* Email not confirmed alert */}
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
                    className="inline-flex items-center gap-1 text-gray-600 transition-colors hover:text-gray-900 dark:text-white/50 dark:hover:text-white/80"
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
