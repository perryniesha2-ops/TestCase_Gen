import { LoginForm } from "@/components/auth/login-form";
import { Logo } from "@/components/pagecomponents/brandlogo";
import { SiteFooter } from "@/components/pagecomponents/site-footer";
import Link from "next/link";

export default function LoginPage() {
  return (
    <div className="landing-bg relative flex min-h-svh flex-col">
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

      {/* Form */}
      <LoginForm />

      {/* Legal + footer */}
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

export const metadata = { title: "SynthQA - Login" };
