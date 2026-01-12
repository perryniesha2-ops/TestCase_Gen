import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "../components/providers/toast-providers";
import { Providers } from "../providers";
import { ThemeProvider } from "@/components/theme-provider";
import { SessionTimeoutProvider } from "@/components/providers/session-timeout-provider";
import { AuthProvider } from "@/lib/auth/auth-context";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "SynthQA - Test Case Generator",
  description: "AI-powered test case generation tool",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={[
          inter.className,
          "min-h-dvh bg-background text-foreground antialiased",
        ].join(" ")}
      >
        <ThemeProvider>
          <Providers>
            <SessionTimeoutProvider timeoutMinutes={60} warnMinutesBefore={5}>
              <AuthProvider>{children}</AuthProvider>
              <ToastProvider />
            </SessionTimeoutProvider>
          </Providers>
        </ThemeProvider>
      </body>
    </html>
  );
}
