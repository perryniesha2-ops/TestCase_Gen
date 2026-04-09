import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "../providers";
import { ThemeProvider } from "@/components/theme-provider";
import { SessionTimeoutProvider } from "@/components/providers/session-timeout-provider";
import { Toaster } from "sonner";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    default: "SynthQA — AI-Powered Test Case Generation",
    template: "%s",
  },
  description:
    "Generate, manage, and automate test cases with AI. SynthQA helps QA teams move faster with intelligent test generation, requirement coverage, and automation export.",
  keywords: [
    "test case generation",
    "QA automation",
    "AI testing",
    "test management",
    "Playwright",
    "Cypress",
    "Selenium",
  ],
  authors: [{ name: "SynthQA" }],
  creator: "SynthQA",
  metadataBase: new URL("https://www.synthqa.app"),
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://www.synthqa.app",
    siteName: "SynthQA",
    title: "SynthQA — AI-Powered Test Case Generation",
    description:
      "Generate, manage, and automate test cases with AI. Built for QA teams who want to move faster.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "SynthQA — AI-Powered Test Case Generation",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "SynthQA — AI-Powered Test Case Generation",
    description:
      "Generate, manage, and automate test cases with AI. Built for QA teams who want to move faster.",
    images: ["/og-image.png"],
    creator: "@synthqa",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
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
            <SessionTimeoutProvider timeoutMinutes={60} warnMinutesBefore={2}>
              {children}
              <Toaster />
            </SessionTimeoutProvider>
          </Providers>
        </ThemeProvider>
      </body>
    </html>
  );
}
