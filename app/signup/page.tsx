import { SignupForm } from "@/components/auth/signup-form";
import Link from "next/link";

export default function SignupPage() {
  return (
    <div className="landing-bg relative flex min-h-svh flex-col">
      <SignupForm />

      <div className="relative z-10 flex flex-col items-center gap-4 pb-8">
        <p className="px-6 text-center text-xs text-gray-400 dark:text-white/20">
          By proceeding, you agree to our{" "}
          <span className="cursor-pointer text-gray-600 transition-colors hover:text-gray-800 dark:text-white/40 dark:hover:text-white/60">
            <Link href="/docs/terms">Terms of Service </Link>
          </span>{" "}
          and{" "}
          <span className="cursor-pointer text-gray-600 transition-colors hover:text-gray-800 dark:text-white/40 dark:hover:text-white/60">
            <Link href="/docs/privacy">Privacy Policy</Link>
          </span>
          .
        </p>
      </div>
    </div>
  );
}

export const metadata = {
  title: "SynthQA - Sign Up",
};
