import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "../providers";
import { ThemeProvider } from "@/components/theme-provider";
import { SessionTimeoutProvider } from "@/components/providers/session-timeout-provider";
import { Toaster } from "sonner";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Test Case Generator",
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
              {children}
              <Toaster />
            </SessionTimeoutProvider>
          </Providers>
        </ThemeProvider>
      </body>
    </html>
  );
}
