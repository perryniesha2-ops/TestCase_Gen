"use client";

import * as React from "react";
import Link from "next/link";
import { Check, X, Crown, Users, Building2, Zap, BadgePercent } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";


export default function PricingPage() {
  const [yearly, setYearly] = React.useState(false);
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      {/* Page header */}
      <div className="text-center mb-10">
        <Badge variant="secondary" className="mb-3">Pricing</Badge>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Start free. Scale as you grow.</h1>
        <p className="mt-2 text-muted-foreground">All plans include the core generator. Upgrade for higher limits, collaboration, and integrations.</p>

        {/* Billing toggle */}
        <div className="mt-5 inline-flex items-center gap-3 rounded-full border px-4 py-2">
          <span className={!yearly ? "font-medium" : "text-muted-foreground"}>Monthly</span>
          <Switch checked={yearly} onCheckedChange={setYearly} />
          <span className={yearly ? "font-medium" : "text-muted-foreground"}>Yearly</span>
          <Badge variant="outline" className="ml-1 inline-flex items-center gap-1">
            <BadgePercent className="h-3 w-3" /> Save 20%
          </Badge>
        </div>
      </div>

      {/* Plans */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <PlanCard
          title="Free"
          icon={<Zap className="h-6 w-6" />}
          priceMo={0}
          priceYr={0}
          yearly={yearly}
          description="Perfect for getting started"
          ctaText="Get started"
          onClick={() => window.location.assign("/pages/signup")}
          features={[
            { text: "20 AI‑generated test cases / mo", on: true },
            { text: "Unlimited manual test cases", on: true },
            { text: "Basic execution tracking", on: true },
            { text: "3 requirement templates", on: true },
            { text: "Export to CSV", on: true },
            { text: "Advanced AI models", on: false },
            { text: "Team collaboration", on: false },
            { text: "Integrations (Jira, Azure)", on: false },
          ]}
        />

        <PlanCard
          popular
          title="Pro"
          icon={<Crown className="h-6 w-6" />}
          priceMo={29}
          priceYr={25}
          yearly={yearly}
          description="For serious testers and small teams"
          ctaText="Start Pro trial"
          onClick={() => handleSubscribe("pro", yearly)}
          features={[
            { text: "500 AI‑generated test cases / mo", on: true },
            { text: "Unlimited manual test cases", on: true },
            { text: "Advanced execution tracking", on: true },
            { text: "Unlimited templates", on: true },
            { text: "All AI models (Claude, GPT‑4)", on: true },
            { text: "Cross‑platform generation", on: true },
            { text: "Export: CSV & more", on: true },
            { text: "API access", on: true },
            { text: "Team collab (up to 5)", on: true },
            { text: "Priority email support", on: true },
          ]}
        />

        <PlanCard
          title="Team"
          icon={<Users className="h-6 w-6" />}
          priceMo={79}
          priceYr={69}
          yearly={yearly}
          description="For growing teams and organizations"
          ctaText="Start Team trial"
          onClick={() => handleSubscribe("team", yearly)}
          features={[
            { text: "2,000 AI‑generated test cases / mo", on: true },
            { text: "Advanced analytics & reporting", on: true },
            { text: "Team management & permissions", on: true },
            { text: "Integrations (Jira, Azure)", on: true },
            { text: "Custom templates", on: true },
            { text: "Higher API limits", on: true },
            { text: "Up to 15 users", on: true },
            { text: "Priority support + Slack", on: true },
          ]}
        />

        <PlanCard
          title="Enterprise"
          icon={<Building2 className="h-6 w-6" />}
          custom
          yearly={yearly}
          description="Custom solutions for large orgs"
          ctaText="Contact sales"
          onClick={() => window.location.assign("mailto:sales@synthqa.app?subject=Enterprise%20Plan%20Inquiry")}
          features={[
            { text: "Unlimited AI‑generated test cases", on: true },
            { text: "On‑prem or private cloud", on: true },
            { text: "SSO & enterprise integrations", on: true },
            { text: "Dedicated API & SLA", on: true },
            { text: "Unlimited users", on: true },
            { text: "Success manager & onboarding", on: true },
            { text: "Custom contract & billing", on: true },
          ]}
        />
      </div>

      
      {/* FAQ */}
      <div className="mt-12 grid gap-6 md:grid-cols-2">
        <FaqItem q="Is there a free trial?" a="Yes. Pro and Team plans include a 14‑day free trial. No credit card required to start." />
        <FaqItem q="What counts as an AI‑generated test case?" a="Any test case produced by the generator counts toward your monthly limit. Manual test cases you add are unlimited." />
        <FaqItem q="Can I upgrade/downgrade anytime?" a="Absolutely. Changes take effect immediately and are prorated based on billing provider settings." />
        <FaqItem q="Do you offer discounts?" a="We offer 50% off for qualified nonprofits, education, and open‑source projects. Contact support to apply." />
      </div>

      {/* Bottom CTA */}
      <Card className="mt-12 border-primary/20 bg-gradient-to-r from-primary/10 to-primary/5 text-center">
        <CardContent className="py-10">
          <h3 className="text-2xl font-semibold">Ready to generate your first test suite?</h3>
          <p className="mt-2 text-muted-foreground">Create an account and generate up to 50 test cases on the free trial.</p>
          <div className="mt-6 flex justify-center gap-3">
            <Button asChild size="lg"><Link href="/pages/signup">Create account</Link></Button>
          </div>
        </CardContent>
      </Card>

      {/* Footer blurb */}
      <p className="mt-8 text-center text-xs text-muted-foreground">Powered by OpenAI • Anthropic • Supabase</p>
    </div>
  );
}

// ---- Components ----

type Feature = { text: string; on: boolean };

function PlanCard({
  title,
  description,
  icon,
  priceMo,
  priceYr,
  yearly,
  custom,
  features,
  ctaText,
  popular,
  onClick,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  priceMo?: number | null;
  priceYr?: number | null;
  yearly: boolean;
  custom?: boolean;
  features: Feature[];
  ctaText: string;
  popular?: boolean;
  onClick?: () => void;
}) {
  const price = yearly ? priceYr : priceMo;
  const showSavings = !custom && typeof priceMo === "number" && typeof priceYr === "number" && yearly && priceMo !== priceYr;
  const savings = showSavings ? (priceMo! - priceYr!) * 12 : 0;

  return (
    <Card className={`relative flex flex-col ${popular ? "ring-2 ring-primary" : ""}`}>
      {popular && (
        <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">Most Popular</Badge>
      )}
      <CardHeader className="text-center pb-2">
        <div className={`mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full ${popular ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
          {icon}
        </div>
        <CardTitle className="text-2xl">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
        <div className="mt-4">
          {custom ? (
            <span className="text-4xl font-bold">Custom</span>
          ) : (
            <div>
              <span className="text-4xl font-bold">${price}</span>
              <span className="text-muted-foreground">/mo</span>
              {showSavings && <div className="text-sm text-green-600">Save ${savings}/yr</div>}
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col">
        <Button className="mb-4 w-full" variant={popular ? "default" : "outline"} onClick={onClick}>
          {ctaText}
        </Button>
        <ul className="space-y-3 text-sm">
          {features.map((f) => (
            <li key={f.text} className="flex items-start gap-3">
              {f.on ? (
                <Check className="mt-0.5 h-4 w-4 text-green-600" />
              ) : (
                <X className="mt-0.5 h-4 w-4 text-muted-foreground" />
              )}
              <span className={f.on ? "" : "text-muted-foreground"}>{f.text}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function MiniRow({ label, vals }: { label: string; vals: string[] }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 grid grid-cols-4 items-center gap-2 text-sm">
        {vals.map((v, i) => (
          <div key={i} className="rounded-md border bg-card px-2 py-1 text-center">
            {v}
          </div>
        ))}
      </div>
    </div>
  );
}

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = React.useState(false);
  return (
    <div className="rounded-xl border p-4">
      <button className="flex w-full items-center justify-between text-left" onClick={() => setOpen((o) => !o)}>
        <span className="font-medium">{q}</span>
        <span className={`text-xl transition-transform ${open ? "rotate-45" : ""}`}>+</span>
      </button>
      {open && <p className="mt-2 text-sm text-muted-foreground">{a}</p>}
    </div>
  );
}

// --- Replace with your real Stripe checkout call ---
async function handleSubscribe(planId: string, yearly: boolean) {
  // Example fetch to your API route
  try {
    const res = await fetch("/api/billing/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ planId, yearly }),
    });
    if (!res.ok) throw new Error("Subscription failed");
    const { checkoutUrl } = await res.json();
    window.location.href = checkoutUrl;
  } catch (e) {
    console.error(e);
    // optional: toast
  }
}
