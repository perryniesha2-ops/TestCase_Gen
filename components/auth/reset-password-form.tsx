"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { customUpdatePassword } from "@/app/auth/actions/auth";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import {
  CheckCircle,
  AlertTriangle,
  Eye,
  EyeOff,
  Loader2,
  ArrowRight,
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

const AuroraBackground = () => (
  <>
    {/* Light mode */}
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

    {/* Dark mode aurora */}
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
  </>
);

const CardShell = ({
  children,
  subtitle,
}: {
  children: React.ReactNode;
  subtitle: string;
}) => (
  <div className="relative flex min-h-screen items-center justify-center px-4">
    <AuroraBackground />
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
      <div
        className="relative overflow-hidden rounded-[15px] border border-gray-200 bg-white shadow-2xl shadow-gray-200/50 backdrop-blur-xl dark:border-white/10 dark:bg-[#080f1e] dark:shadow-black/50"
        style={{ margin: "1px" }}
      >
        <div
          className="h-px w-full"
          style={{
            background:
              "linear-gradient(90deg, transparent, #06b6d4 40%, #38bdf8 50%, #06b6d4 60%, transparent)",
            opacity: 0.5,
          }}
        />
        <div className="px-8 pb-8 pt-7">
          <div className="mb-8 flex flex-col items-center text-center">
            <Logo size="lg" />
            <p className="mt-1 text-sm text-gray-500 dark:text-white/35">
              {subtitle}
            </p>
          </div>
          {children}
        </div>
      </div>
    </motion.div>
  </div>
);

export function ResetPasswordForm() {
  const [loading, setLoading] = useState(false);
  const [checkingToken, setCheckingToken] = useState(true);
  const [isValidToken, setIsValidToken] = useState<boolean | null>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [success, setSuccess] = useState(false);
  const [tokenError, setTokenError] = useState<string | null>(null);

  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  useEffect(() => {
    if (!token) {
      setIsValidToken(false);
      setTokenError("No reset token found in URL");
    } else {
      setIsValidToken(true);
    }
    setCheckingToken(false);
  }, [token]);

  const passwordsMatch = password === confirmPassword;
  const isPasswordValid = password.length >= 6;
  const canSubmit =
    isPasswordValid &&
    passwordsMatch &&
    password &&
    confirmPassword &&
    isValidToken;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!canSubmit || !token) {
      toast.error("Please check your password requirements");
      return;
    }
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("token", token);
      formData.append("password", password);
      const result = await customUpdatePassword(formData);
      if (result?.error) {
        if (
          result.error.includes("Invalid") ||
          result.error.includes("expired")
        ) {
          setIsValidToken(false);
          setTokenError(result.error);
        } else {
          toast.error("Password update failed", { description: result.error });
        }
        setLoading(false);
      } else if (result?.success) {
        setSuccess(true);
        toast.success("Password updated!", {
          description:
            result.message || "Your password has been successfully updated.",
        });
        setTimeout(() => router.push("/login"), 2000);
      }
    } catch (error) {
      console.error(error);
      toast.error("An unexpected error occurred");
      setLoading(false);
    }
  }

  if (checkingToken) {
    return (
      <CardShell subtitle="Verifying reset link...">
        <div className="flex flex-col items-center gap-3 py-4">
          <Loader2 className="h-8 w-8 animate-spin text-cyan-500" />
          <p className="text-sm text-gray-500 dark:text-white/40">
            Please wait...
          </p>
        </div>
      </CardShell>
    );
  }

  if (!isValidToken) {
    return (
      <CardShell subtitle="Invalid reset link">
        <div className="space-y-4">
          <div className="flex flex-col items-center gap-3 py-2">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-500/10">
              <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
            </div>
            <p className="text-center text-sm text-gray-500 dark:text-white/40">
              {tokenError ||
                "This link is invalid or has expired. Please request a new one."}
            </p>
          </div>
          <button
            onClick={() => router.push("/forgot-password")}
            className={cn(
              "w-full rounded-xl py-2.5 text-sm font-semibold text-white",
              "bg-cyan-600 hover:bg-cyan-500 shadow-lg shadow-cyan-600/20",
              "dark:bg-cyan-500 dark:hover:bg-cyan-400 dark:shadow-cyan-900/40",
              "transition-all duration-200 flex items-center justify-center gap-2",
            )}
          >
            Request new reset link
          </button>
        </div>
      </CardShell>
    );
  }

  if (success) {
    return (
      <CardShell subtitle="Password updated">
        <div className="space-y-4">
          <div className="flex flex-col items-center gap-3 py-2">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-500/10">
              <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <div className="text-center space-y-1">
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                All done!
              </p>
              <p className="text-xs text-gray-500 dark:text-white/40">
                Your password has been updated. Redirecting you to sign in...
              </p>
            </div>
          </div>
          <div className="h-1 w-full rounded-full bg-gray-100 dark:bg-white/10 overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-blue-400"
              initial={{ width: "0%" }}
              animate={{ width: "100%" }}
              transition={{ duration: 2, ease: "linear" }}
            />
          </div>
        </div>
      </CardShell>
    );
  }

  return (
    <CardShell subtitle="Create a new password">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* New password */}
        <div className="space-y-1.5">
          <label
            htmlFor="password"
            className="text-xs font-medium text-gray-600 dark:text-white/50"
          >
            New password
          </label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="Enter new password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
              className={cn(
                inputCn,
                "pr-10",
                password &&
                  !isPasswordValid &&
                  "border-red-400 dark:border-red-500/50",
              )}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:text-white/25 dark:hover:text-white/50"
              tabIndex={-1}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        {/* Confirm password */}
        <div className="space-y-1.5">
          <label
            htmlFor="confirmPassword"
            className="text-xs font-medium text-gray-600 dark:text-white/50"
          >
            Confirm password
          </label>
          <div className="relative">
            <Input
              id="confirmPassword"
              type={showConfirmPassword ? "text" : "password"}
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              disabled={loading}
              className={cn(
                inputCn,
                "pr-10",
                confirmPassword &&
                  !passwordsMatch &&
                  "border-red-400 dark:border-red-500/50",
              )}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:text-white/25 dark:hover:text-white/50"
              tabIndex={-1}
            >
              {showConfirmPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        {/* Requirements */}
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-gray-500 dark:text-white/40">
            Requirements
          </p>
          <ul className="space-y-1">
            {[
              { label: "At least 6 characters", met: isPasswordValid },
              {
                label: "Passwords match",
                met: passwordsMatch && !!confirmPassword,
              },
            ].map((req) => (
              <li key={req.label} className="flex items-center gap-2">
                <div
                  className={`h-1.5 w-1.5 rounded-full transition-colors ${req.met ? "bg-cyan-400" : "bg-gray-300 dark:bg-white/20"}`}
                />
                <span
                  className={`text-xs transition-colors ${req.met ? "text-cyan-600 dark:text-cyan-400" : "text-gray-400 dark:text-white/30"}`}
                >
                  {req.label}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* Submit */}
        <div className="pt-1">
          <button
            type="submit"
            disabled={loading || !canSubmit}
            aria-busy={loading}
            className={cn(
              "group w-full rounded-xl py-2.5 text-sm font-semibold text-white",
              "bg-cyan-600 hover:bg-cyan-500 shadow-lg shadow-cyan-600/20",
              "dark:bg-cyan-500 dark:hover:bg-cyan-400 dark:shadow-cyan-900/40",
              "transition-all duration-200",
              "disabled:cursor-not-allowed disabled:opacity-50",
              "flex items-center justify-center gap-2",
            )}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Updating password...
              </>
            ) : (
              <>
                Update password
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </>
            )}
          </button>
        </div>
      </form>
    </CardShell>
  );
}
