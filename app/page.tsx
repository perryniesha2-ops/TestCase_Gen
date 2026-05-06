import { Hero } from "@/components/landingpage/hero";
import { Features } from "@/components/landingpage/features";
import { CTA } from "@/components/landingpage/cta";
import { Footer } from "@/components/landingpage/footer";
import { SiteNav } from "@/components/landingpage/sitenav";
import { Carousel } from "@/components/landingpage/carousel";
import { NavSeparator } from "@/components/landingpage/nav-separator";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "SynthQA — AI-Powered Test Case Generator for QA Teams",
  description:
    "Generate structured, execution-ready test cases from requirements using AI. SynthQA supports web, mobile, API, accessibility, and performance testing — with Playwright, Cypress, Selenium, and Puppeteer export.",

  keywords: [
    "AI test case generator",
    "QA automation",
    "test case generation",
    "software testing AI",
    "Playwright test generator",
    "Cypress test generator",
    "Selenium automation",
    "cross-platform testing",
    "QA tools",
    "SDET tools",
    "test management",
    "requirements to test cases",
    "automated testing",
    "test suite management",
    "AI QA platform",
  ],

  authors: [{ name: "SynthQA", url: "https://synthqa.app" }],
  creator: "SynthQA",
  publisher: "SynthQA",

  metadataBase: new URL("https://synthqa.app"),

  alternates: {
    canonical: "/",
  },

  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://synthqa.app",
    siteName: "SynthQA",
    title: "SynthQA — AI-Powered Test Case Generator for QA Teams",
    description:
      "Turn requirements into production-ready test cases with AI. Generate structured test suites for web, mobile, and API — then export to Playwright, Cypress, Selenium, or Puppeteer.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "SynthQA — AI-Powered Test Case Generator",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: "SynthQA — AI-Powered Test Case Generator for QA Teams",
    description:
      "Turn requirements into production-ready test cases with AI. Generate structured test suites for web, mobile, and API — then export to Playwright, Cypress, Selenium, or Puppeteer.",
    images: ["/og-image.png"],
    creator: "@synthqa",
    site: "@synthqa",
  },

  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },

  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png" }],
    other: [
      { rel: "mask-icon", url: "/safari-pinned-tab.svg", color: "#06b6d4" },
    ],
  },

  manifest: "/site.webmanifest",

  category: "technology",
};

export default function LandingPage() {
  return (
    <div className="relative">
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
          className="absolute -left-20 top-1/3 h-[400px] w-[400px] rounded-full opacity-10"
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
          className="absolute left-[40%] -top-[15%] h-[40vh] w-[40vw] rounded-full"
          style={{
            background:
              "radial-gradient(ellipse at 50% 0%, #22d3ee 0%, #06b6d4 20%, #0369a1 45%, transparent 70%)",
            filter: "blur(60px)",
            opacity: 0.25,
            animation: "auroraShift2 7s ease-in-out infinite",
          }}
        />
        <div
          className="absolute left-[20%] top-[55vh] h-[60vh] w-[60vw] rounded-full"
          style={{
            background:
              "radial-gradient(ellipse at 50% 50%, #0d2a4a 0%, #0a1f3d 25%, #061428 50%, transparent 75%)",
            filter: "blur(80px)",
            opacity: 0.8,
            animation: "auroraShift2 9s ease-in-out infinite",
          }}
        />
        <div
          className="absolute left-[10%] top-[100vh] h-[60vh] w-[70vw] rounded-full"
          style={{
            background:
              "radial-gradient(ellipse at 40% 50%, #0d2a4a 0%, #061e3a 30%, transparent 70%)",
            filter: "blur(90px)",
            opacity: 0.7,
            animation: "auroraShift 11s ease-in-out infinite",
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

      <SiteNav />
      <NavSeparator />

      <div className="h-[calc(100vh-5rem)] w-full">
        <Carousel
          slides={[
            <Hero key="hero" />,
            <Features key="features" />,
            <CTA key="cta" />,
          ]}
        />
      </div>

      <Footer />

      {/* JSON-LD structured data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            name: "SynthQA",
            url: "https://synthqa.com",
            description:
              "AI-powered test case generator for QA engineers and SDETs. Generate structured, execution-ready test suites from requirements — with export to Playwright, Cypress, Selenium, and Puppeteer.",
            applicationCategory: "DeveloperApplication",
            operatingSystem: "Web",
            offers: {
              "@type": "Offer",
              price: "0",
              priceCurrency: "USD",
              description:
                "Free tier available. Paid plans for higher volume and team features.",
            },
            featureList: [
              "AI test case generation from requirements",
              "Cross-platform test coverage (web, mobile, API, accessibility)",
              "Test suite management with pass rate tracking",
              "Playwright, Cypress, Selenium, Puppeteer export",
              "Jira integration for failed test review",
              "Custom reporting with configurable metrics",
            ],
            screenshot: "https://synthqa.com/og-image.png",
            creator: {
              "@type": "Organization",
              name: "SynthQA",
              url: "https://synthqa.com",
            },
          }),
        }}
      />
    </div>
  );
}
