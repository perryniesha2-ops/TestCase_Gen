import Link from "next/link";
import Image from "next/image";
import { ArrowRight, CheckCircle2, Shield, Zap, Layers, BarChart3, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {PrivacySheet} from "@/components/legal/PrivacySheet"
import {TermsSheet} from "@/components/legal/TermsSheet"
import {ContactSheet} from "@/components/pagecomponents/contactSheet"
import {Logo} from "@/components/pagecomponents/brandlogo"



export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteNav />
      <Hero />
      <LogosStrip />
      <Features />
      <ScreenshotShowcase />
      <CTA />
      <Footer />
    </div>
  );
}

function SiteNav() {
  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/70 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-0">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-2 md:gap-3 font-semibold">
          {/* Logo: increase size by changing h-12 / md:h-14 */}
          <img
            src="/logo-sq-dark.svg"
            alt="SynthQA Logo"
            className="hidden dark:block h-50 md:h-50 w-auto"
          />
          <img
            src="/logo-sq-light.svg"
            alt="SynthQA Logo"
            className="block dark:hidden h-40 md:h-40 w-auto"
          />
        
        </Link>

        {/* Nav */}
        <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
          <Link href="#features" className="hover:text-foreground">Features</Link>
          <Link href="#demo" className="hover:text-foreground">Demo</Link>
          <Link href="#pricing" className="hover:text-foreground">Pricing</Link>
        </nav>

        {/* CTAs */}
        <div className="flex items-center gap-2">
          <Button variant="ghost" asChild>
            <Link href="/pages/login">Log in</Link>
          </Button>
          <Button asChild>
            <Link href="/pages/signup">Get started</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-[-30%] h-[600px] w-[900px] -translate-x-1/2 rounded-full bg-gradient-to-tr from-primary/30 via-primary/10 to-transparent blur-3xl" />
      </div>
      <div className="mx-auto max-w-5xl px-4 py-20 sm:py-24 md:py-28">
        <div className="mx-auto max-w-3xl text-center">
          <Badge className="mb-4">AI Test Case Generation</Badge>
          <h1 className="text-balance text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
            Generate smarter. <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">Test faster.</span>
          </h1>
          <p className="mt-4 text-balance text-base text-muted-foreground sm:text-lg">
            SynthQA turns requirements into comprehensive, cross‑platform test suites using OpenAI & Anthropic—complete with steps, inputs, and assertions.
          </p>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
            <Button asChild size="lg">
              <Link href="/pages/signup" className="inline-flex items-center gap-2">
                Start free <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="#demo">Watch demo</Link>
            </Button>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">No credit card required • Cancel anytime</p>
        </div>
      </div>
    </section>
  );
}

function LogosStrip() {
  return (
    <section className="border-y bg-muted/30">
    
    </section>
  );
}

function Features() {
  const items = [
    { icon: <Zap className="h-5 w-5" />, title: "Instant generation", desc: "Turn requirements into mapped test suites with steps and assertions." },
    { icon: <Layers className="h-5 w-5" />, title: "Cross‑platform", desc: "API, web, and mobile coverage in one workspace." },
    { icon: <Shield className="h-5 w-5" />, title: "Edge & negatives", desc: "Dial coverage and automatically create negative paths." },
    { icon: <BarChart3 className="h-5 w-5" />, title: "Traceability", desc: "Link cases to requirements and track execution results." },
  ];

  return (
    <section id="features" className="mx-auto max-w-6xl px-4 py-16 sm:py-20">
      <div className="mx-auto mb-10 max-w-2xl text-center">
        <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">Everything you need to test faster</h2>
        <p className="mt-3 text-muted-foreground">Powered by OpenAI & Anthropic with guardrails and export‑ready formats.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((f) => (
          <Card key={f.title}>
            <CardHeader className="space-y-1">
              <Badge variant="secondary" className="w-fit">{f.icon}</Badge>
              <CardTitle className="text-base">{f.title}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">{f.desc}</CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}

function ScreenshotShowcase() {
  return (
    <section id="demo" className="mx-auto max-w-6xl px-4 py-16 sm:py-20">
      <div className="grid items-center gap-8 lg:grid-cols-2">
        <div>
          <h3 className="text-2xl font-semibold tracking-tight">From requirement → test suite</h3>
          <p className="mt-2 text-muted-foreground">Paste your requirement and generate reviewable, editable cases with steps and assertions. Export to CSV, Jira, or your runner.</p>
          <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
            <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary"/> Adjustable coverage & negatives</li>
            <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary"/> Templates for API/UI/mobile</li>
            <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary"/> Cost meter & model controls</li>
          </ul>
          <div className="mt-6 flex gap-3">
            <Button asChild>
              <Link href="/pages/signup">Try it free</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/pages/generate">Open generator</Link>
            </Button>
          </div>
        </div>
        <div>
          <div className="rounded-xl border bg-card p-4 shadow-sm">
            <div className="aspect-[16/10] w-full rounded-lg border bg-muted/40" />
          </div>
        </div>
      </div>
    </section>
  );
}

function CTA() {
  return (
    <section id="pricing" className="mx-auto max-w-4xl px-4 pb-24">
      <div className="rounded-2xl border bg-card p-8 text-center shadow-sm">
        <h3 className="text-2xl font-semibold tracking-tight">Start free. Upgrade when you’re ready.</h3>
        <p className="mt-2 text-muted-foreground">Generate up to 50 test cases on the free trial. No credit card required.</p>
        <div className="mt-6 flex justify-center gap-3">
          <Button asChild size="lg"><Link href="/pages/signup">Create account</Link></Button>
          <Button asChild size="lg" variant="outline"><Link href="/pages/pricing">See pricing</Link></Button>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 py-8 sm:flex-row">
        <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} SynthQA. All rights reserved.</p>
        <nav className="flex items-center gap-1 text-xs text-muted-foreground">
          <span>Powered by OpenAI • Anthropic • Supabase</span>
          <TermsSheet/>
          <PrivacySheet/>
          <ContactSheet/>
        </nav>
      </div>
    </footer>
  );
}
