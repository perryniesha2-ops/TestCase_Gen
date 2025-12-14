import Link from "next/link"
import Image from "next/image"
import {
  ArrowRight,
  CheckCircle2,
  Shield,
  Zap,
  Layers,
  BarChart3,
  Sparkles,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { PrivacySheet } from "@/components/legal/PrivacySheet"
import { TermsSheet } from "@/components/legal/TermsSheet"
import { ContactSheet } from "@/components/pagecomponents/contactSheet"
import { Logo } from "@/components/pagecomponents/brandlogo"

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Background aura */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_rgba(129,140,248,0.15),_transparent_55%),radial-gradient(ellipse_at_bottom,_rgba(56,189,248,0.12),_transparent_55%)]"
      />
      <SiteNav />
      <main>
        <Hero />
        <LogosStrip />
        <Features />
        <ScreenshotShowcase />
        <CTA />
      </main>
      <Footer />
    </div>
  )
}

function SiteNav() {
  return (
     <div className="mx-auto flex h-30 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
  {/* Brand */}
  <Link href="/" className="flex items-center gap-2 md:gap-3 font-semibold">
    {/* Dark-mode logo */}
    <Image
      src="/logo-sq-dark.svg"
      alt="SynthQA Logo"
      width={5000      }
      height={2000}
      className="hidden dark:inline-block h-20 w-auto sm:h-20"
      loading="eager"
      priority
    />
    {/* Light-mode logo */}
    <Image
      src="/logo-sq-light.svg"
      alt="SynthQA Logo"
      width={1000}
      height={100}
      className="inline-block dark:hidden h-20 w-auto sm:h-20"
      loading="eager"
      priority
    />
  </Link>
         
        {/* Nav */}
        <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
          <Link href="#features" className="transition hover:text-foreground">
            Features
          </Link>
          <Link href="#demo" className="transition hover:text-foreground">
            Demo
          </Link>
          <Link href="#pricing" className="transition hover:text-foreground">
            Pricing
          </Link>
          <Link href="/pages/pricing" className="transition hover:text-foreground">
            For teams
          </Link>
        </nav>

        {/* CTAs */}
        <div className="flex items-center gap-2">
          <Button variant="ghost" asChild size="sm">
            <Link href="/pages/login">Log in</Link>
          </Button>
          <Button asChild size="sm" className="gap-1">
            <Link href="/pages/signup">
              Start free
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      </div>
  )
}

function Hero() {
  return (
    <section className="border-b">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-10 px-4 py-16 sm:py-20 lg:flex-row lg:items-start lg:py-24">
        {/* Left column */}
        <div className="max-w-xl space-y-6 text-center lg:text-left">
          <div className="inline-flex items-center gap-2 rounded-full border bg-background/80 px-3 py-1 text-xs text-muted-foreground shadow-sm">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            <span>AI-powered test design for QA teams</span>
          </div>

          <div className="space-y-4">
            <h1 className="text-balance text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
              Turn requirements into{" "}
              <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                production-ready tests
              </span>{" "}
              in minutes.
            </h1>
            <p className="text-balance text-base text-muted-foreground sm:text-lg">
              SynthQA combines OpenAI & Anthropic to generate structured, cross-platform test
              suites—with steps, inputs, and assertions you can actually run and maintain.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 lg:justify-start">
            <Button asChild size="lg" className="gap-2">
              <Link href="/pages/signup">
                Start free
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="#demo">Watch product overview</Link>
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">
            No credit card required · Designed for QA engineers, SDETs & teams
          </p>

          <div className="mt-4 grid gap-4 text-sm text-muted-foreground sm:grid-cols-3">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 text-primary" />
              <span>Web, mobile & API coverage in one place</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 text-primary" />
              <span>Edge cases, negatives & regression suites</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 text-primary" />
              <span>Traceability from requirement → execution</span>
            </div>
          </div>
        </div>

        {/* Right column – hero preview */}
        <div className="w-full max-w-md lg:max-w-lg">
          <Card className="relative overflow-hidden border bg-card/80 shadow-lg">
            <div className="absolute inset-x-0 top-0 h-10 bg-gradient-to-r from-primary/10 via-primary/0 to-primary/10" />
            <CardHeader className="relative z-10 pb-3">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-xs font-medium uppercase tracking-[0.16em] text-primary">
                    Test Case Generator
                  </p>
                  <CardTitle className="text-base font-semibold">
                    User Login – Cross-platform suite
                  </CardTitle>
                </div>
                <Badge variant="outline" className="text-xs">
                  Beta
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="relative z-10 space-y-4 text-xs text-muted-foreground">
              <div className="rounded-md border bg-muted/40 p-3 font-mono text-[11px] leading-relaxed">
                <div className="mb-2 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                  Requirement
                </div>
                <p>
                  “As a user, I want to log in with email and password so that I can access my
                  dashboard.”
                </p>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-md border bg-muted/40 p-3 font-mono text-[11px]">
                  <div className="mb-2 flex items-center justify-between text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                    <span>Generated cases</span>
                    <span>Web · API</span>
                  </div>
                  <ul className="space-y-1">
                    <li>✓ Valid login – happy path</li>
                    <li>✓ Invalid password – lockout</li>
                    <li>✓ Empty fields validation</li>
                    <li>✓ API 500 fallback</li>
                  </ul>
                </div>

                <div className="rounded-md border bg-muted/40 p-3 font-mono text-[11px]">
                  <div className="mb-2 flex items-center justify-between text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                    <span>Execution status</span>
                    <span>Suite: Release 2025.3</span>
                  </div>
                  <ul className="space-y-1">
                    <li>• 12 passed</li>
                    <li>• 2 failed</li>
                    <li>• 3 not run</li>
                    <li className="mt-2 text-[10px] text-emerald-500">
                      86% pass rate · 100% requirement coverage
                    </li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  )
}

function LogosStrip() {
  return (
    <section className="border-b bg-muted/40">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:py-8">
        <div className="flex flex-col items-center justify-between gap-4 text-xs text-muted-foreground sm:flex-row">
          <p className="flex items-center gap-2 text-center sm:text-left">
            <span className="h-1 w-6 rounded-full bg-primary/60" />
            <span>Built for modern QA & engineering teams</span>
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4 opacity-80">
            <span className="text-[11px] uppercase tracking-[0.22em]">
              Web · Mobile · API · Accessibility
            </span>
          </div>
        </div>
      </div>
    </section>
  )
}

function Features() {
  const items = [
    {
      icon: <Zap className="h-4 w-4" />,
      title: "Instant structured generation",
      desc: "Turn user stories and specs into mapped test suites with steps, inputs, and assertions.",
    },
    {
      icon: <Layers className="h-4 w-4" />,
      title: "Cross-platform by design",
      desc: "Generate web, mobile, API/backend, accessibility, and performance cases from a single requirement.",
    },
    {
      icon: <Shield className="h-4 w-4" />,
      title: "Guardrails & negatives",
      desc: "Dial coverage, add negative and edge-case paths, and keep tests aligned to risk.",
    },
    {
      icon: <BarChart3 className="h-4 w-4" />,
      title: "Traceability & reporting",
      desc: "Link tests to requirements, suites, and runs—then track health over time.",
    },
  ]

  return (
    <section id="features" className="mx-auto max-w-6xl px-4 py-16 sm:py-20">
      <div className="mx-auto mb-10 max-w-2xl text-center">
        <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Everything you need to test faster
        </h2>
        <p className="mt-3 text-sm text-muted-foreground sm:text-base">
          SynthQA combines AI generation with practical controls, so you can ship coverage you
          trust—not just pretty text.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((f) => (
          <Card
            key={f.title}
            className="border-muted/70 bg-background/80 shadow-sm transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
          >
            <CardHeader className="space-y-2">
              <Badge variant="outline" className="flex h-8 w-8 items-center justify-center rounded-full">
                {f.icon}
              </Badge>
              <CardTitle className="text-sm font-semibold">{f.title}</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground sm:text-sm">{f.desc}</CardContent>
          </Card>
        ))}
      </div>
    </section>
  )
}

function ScreenshotShowcase() {
  return (
    <section id="demo" className="mx-auto max-w-6xl px-4 py-16 sm:py-20">
      <div className="grid items-center gap-10 lg:grid-cols-2">
        <div className="order-2 space-y-4 lg:order-1">
          <h3 className="text-2xl font-semibold tracking-tight">
            From requirement → suite → execution
          </h3>
          <p className="text-sm text-muted-foreground sm:text-base">
            Paste a requirement, pick coverage and platforms, and generate reviewable test cases.
            Save them into suites, run them continuously, and report on health across releases.
          </p>
          <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 text-primary" />
              <span>Adjust coverage and negative paths by story, epic, or suite.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 text-primary" />
              <span>Templates for API, UI, mobile, accessibility and performance testing.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 text-primary" />
              <span>Cost meter, model controls and export-ready formats (CSV, Jira, and more).</span>
            </li>
          </ul>
          <div className="mt-5 flex flex-wrap gap-3">
            <Button asChild>
              <Link href="/pages/signup">Try SynthQA free</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/pages/generate">Open generator</Link>
            </Button>
          </div>
        </div>

        <div className="order-1 lg:order-2">
          <div className="overflow-hidden rounded-xl border bg-card shadow-lg">
            <div className="flex items-center gap-1 border-b bg-muted/60 px-4 py-2">
              <span className="h-2 w-2 rounded-full bg-red-400" />
              <span className="h-2 w-2 rounded-full bg-amber-300" />
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              <span className="ml-3 text-xs text-muted-foreground">synthqa.app · Test suites</span>
            </div>
            <div className="aspect-[16/10] w-full bg-muted/40" />
          </div>
        </div>
      </div>
    </section>
  )
}

function CTA() {
  return (
    <section id="pricing" className="mx-auto max-w-5xl px-4 pb-20">
      <div className="overflow-hidden rounded-2xl border bg-card/90 p-8 text-center shadow-sm sm:p-10">
        <div className="mx-auto max-w-2xl space-y-4">
          <h3 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Start free. Upgrade when your team is ready.
          </h3>
          <p className="text-sm text-muted-foreground sm:text-base">
            Generate up to 50 test cases on the free tier. Move to paid when you need higher
            volume, team workspaces, and advanced reporting.
          </p>
        </div>

        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button asChild size="lg">
            <Link href="/pages/signup">Create account</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/pages/pricing">View pricing & limits</Link>
          </Button>
        </div>

        <p className="mt-4 text-xs text-muted-foreground">
          Monthly & annual plans available · Cancel anytime
        </p>
      </div>
    </section>
  )
}

function Footer() {
  return (
    <footer className="border-t bg-background/80">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
          </div>
          <p>© {new Date().getFullYear()} SynthQA. All rights reserved.</p>
          <p className="text-[11px]">
            Powered by OpenAI · Anthropic · Supabase
          </p>
        </div>

        <nav className="flex flex-wrap items-center gap-3">
          <Link href="#features" className="hover:text-foreground">
            Features
          </Link>
          <Link href="#demo" className="hover:text-foreground">
            Demo
          </Link>
          <Link href="#pricing" className="hover:text-foreground">
            Pricing
          </Link>
          <TermsSheet />
          <PrivacySheet />
          <ContactSheet />
        </nav>
      </div>
    </footer>
  )
}
