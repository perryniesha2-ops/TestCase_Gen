"use client";

import * as React from "react";
import Link from "next/link";
import {
  Check,
  X,
  Crown,
  Users,
  Building2,
  Zap,
  BadgePercent,
  Mail,
} from "lucide-react";
import { motion, useReducedMotion, type Variants } from "framer-motion";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { PricingContactSheet } from "../billing/pricingcontact";

// ---- Motion helpers ----
const easeOut: [number, number, number, number] = [0.16, 1, 0.3, 1];

const sectionVariants: Variants = {
  hidden: { opacity: 0, y: 10 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: easeOut },
  },
};

const headerStagger: Variants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.08, delayChildren: 0.05 },
  },
};

const itemUp: Variants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: easeOut } },
};

const gridStagger: Variants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.08, delayChildren: 0.06 },
  },
};

const cardIn: Variants = {
  hidden: { opacity: 0, y: 14, scale: 0.98 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.45, ease: easeOut },
  },
};

const listStagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.03, delayChildren: 0.06 } },
};

const listItem: Variants = {
  hidden: { opacity: 0, x: -6 },
  show: { opacity: 1, x: 0, transition: { duration: 0.25, ease: easeOut } },
};

// ---- Page ----
export default function PricingPage() {
  const [yearly, setYearly] = React.useState(false);
  const [contactSheetOpen, setContactSheetOpen] = React.useState(false);
  const [selectedPlan, setSelectedPlan] = React.useState<"team" | "enterprise">(
    "team"
  );
  const reduceMotion = useReducedMotion();

  const viewportOnce = { once: true, amount: 0.25 as const };

  const handleContactSales = (planType: "team" | "enterprise") => {
    setSelectedPlan(planType);
    setContactSheetOpen(true);
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      {/* Page header */}
      <motion.div
        className="text-center mb-10"
        variants={headerStagger}
        initial={reduceMotion ? false : "hidden"}
        whileInView={reduceMotion ? undefined : "show"}
        viewport={viewportOnce}
      >
        <motion.div variants={itemUp}>
          <Badge variant="secondary" className="mb-3">
            Pricing
          </Badge>
        </motion.div>

        <motion.h1
          variants={itemUp}
          className="text-3xl font-semibold tracking-tight sm:text-4xl"
        >
          Start free. Scale as you grow.
        </motion.h1>

        <motion.p variants={itemUp} className="mt-2 text-muted-foreground">
          All plans include the core generator. Upgrade for higher limits,
          collaboration, and integrations.
        </motion.p>

        {/* Billing toggle */}
        <motion.div
          variants={itemUp}
          className="mt-5 inline-flex items-center gap-3 rounded-full border px-4 py-2"
        >
          <span className={!yearly ? "font-medium" : "text-muted-foreground"}>
            Monthly
          </span>
          <Switch checked={yearly} onCheckedChange={setYearly} />
          <span className={yearly ? "font-medium" : "text-muted-foreground"}>
            Yearly
          </span>
          <Badge
            variant="outline"
            className="ml-1 inline-flex items-center gap-1"
          >
            <BadgePercent className="h-3 w-3" /> Save 20%
          </Badge>
        </motion.div>
      </motion.div>

      {/* Plans */}
      <motion.div
        className="grid gap-6 md:grid-cols-2 lg:grid-cols-4"
        variants={gridStagger}
        initial={reduceMotion ? false : "hidden"}
        whileInView={reduceMotion ? undefined : "show"}
        viewport={viewportOnce}
      >
        <MotionPlanCard
          variants={cardIn}
          title="Free"
          icon={<Zap className="h-6 w-6" />}
          priceMo={0}
          priceYr={0}
          yearly={yearly}
          description="Perfect for getting started"
          ctaText="Get started"
          href="/signup"
          features={[
            { text: "20 AI-generated test cases/month", on: true },
            { text: "🎉 Limited time: 2x free test cases!", on: true },
            { text: "Unlimited manual test cases", on: true },
            { text: "Basic test execution tracking", on: true },
            { text: "3 requirement templates", on: true },
            { text: "Email support", on: true },
            { text: "Export to CSV", on: true },
            { text: "Advanced AI models", on: false },
            { text: "Custom integrations", on: false },
            { text: "Team collaboration", on: false },
            { text: "Priority support", on: false },
          ]}
        />

        <MotionPlanCard
          variants={cardIn}
          popular
          title="Pro"
          icon={<Crown className="h-6 w-6" />}
          priceMo={15}
          priceYr={12}
          yearly={yearly}
          description="For serious testers and small teams"
          ctaText="Start Pro trial"
          href={`/login?redirect=/billing&plan=pro&yearly=${yearly}`}
          features={[
            { text: "500 AI-generated test cases/month", on: true },
            { text: "Unlimited manual test cases", on: true },
            { text: "Advanced test execution tracking", on: true },
            { text: "Unlimited requirement templates", on: true },
            { text: "All AI models (Claude, GPT-4)", on: true },
            { text: "Cross-platform test generation", on: true },
            { text: "Export to multiple formats", on: true },
            { text: "API access", on: true },
            { text: "Team collaboration (up to 5 users)", on: true },
            { text: "Priority email support", on: true },
            { text: "Custom integrations", on: false },
          ]}
        />

        <MotionPlanCard
          variants={cardIn}
          title="Team"
          icon={<Users className="h-6 w-6" />}
          custom
          yearly={yearly}
          description="For growing teams and organizations"
          ctaText="Contact sales"
          contactSales
          onClick={() => handleContactSales("team")}
          features={[
            { text: "2,000 AI-generated test cases/month", on: true },
            { text: "Unlimited manual test cases", on: true },
            { text: "Advanced analytics & reporting", on: true },
            { text: "Team management & permissions", on: true },
            { text: "All AI models + priority access", on: true },
            { text: "Advanced integrations (Jira, Azure)", on: true },
            { text: "Custom test case templates", on: true },
            { text: "API access with higher limits", on: true },
            { text: "Team collaboration (up to 15 users)", on: true },
            { text: "Priority support + Slack channel", on: true },
            { text: "Custom onboarding", on: true },
          ]}
        />

        <MotionPlanCard
          variants={cardIn}
          title="Enterprise"
          icon={<Building2 className="h-6 w-6" />}
          custom
          yearly={yearly}
          description="Custom solutions for large orgs"
          ctaText="Contact sales"
          contactSales
          onClick={() => handleContactSales("enterprise")}
          features={[
            { text: "Unlimited AI-generated test cases", on: true },
            { text: "Unlimited manual test cases", on: true },
            { text: "Advanced analytics & custom reports", on: true },
            { text: "Advanced team management", on: true },
            { text: "Custom AI model fine-tuning", on: true },
            { text: "Custom integrations & SSO", on: true },
            { text: "On-premise deployment option", on: true },
            { text: "Dedicated API & SLA", on: true },
            { text: "Unlimited users", on: true },
            { text: "Dedicated success manager", on: true },
            { text: "Custom contract & billing", on: true },
          ]}
        />
      </motion.div>

      {/* FAQ */}
      <motion.div
        className="mt-12 grid gap-6 md:grid-cols-2"
        variants={gridStagger}
        initial={reduceMotion ? false : "hidden"}
        whileInView={reduceMotion ? undefined : "show"}
        viewport={{ once: true, amount: 0.2 }}
      >
        <MotionFaqItem
          variants={cardIn}
          q="Is there a free trial?"
          a="Yes. Pro plan includes a 14-day free trial. For Team and Enterprise plans, contact our sales team for a personalized demo and trial."
        />
        <MotionFaqItem
          variants={cardIn}
          q="What counts as an AI-generated test case?"
          a="Any test case produced by the generator counts toward your monthly limit. Manual test cases you add are unlimited."
        />
        <MotionFaqItem
          variants={cardIn}
          q="Can I upgrade/downgrade anytime?"
          a="Absolutely. Changes take effect immediately and are prorated based on billing provider settings."
        />
        <MotionFaqItem
          variants={cardIn}
          q="Do you offer discounts?"
          a="We offer 50% off for qualified nonprofits, education, and open-source projects. Contact support to apply."
        />
      </motion.div>

      {/* Bottom CTA */}
      <motion.div
        className="mt-12"
        variants={sectionVariants}
        initial={reduceMotion ? false : "hidden"}
        whileInView={reduceMotion ? undefined : "show"}
        viewport={{ once: true, amount: 0.25 }}
      >
        <Card className="border-primary/20 bg-gradient-to-r from-primary/10 to-primary/5 text-center">
          <CardContent className="py-10">
            <h3 className="text-2xl font-semibold">
              Ready to generate your first test suite?
            </h3>
            <p className="mt-2 text-muted-foreground">
              Create an account and start with 20 free AI-generated test cases
              per month.
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <Button asChild size="lg">
                <Link href="/signup">Create account</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Footer blurb */}
      <motion.p
        className="mt-8 text-center text-xs text-muted-foreground"
        variants={sectionVariants}
        initial={reduceMotion ? false : "hidden"}
        whileInView={reduceMotion ? undefined : "show"}
        viewport={{ once: true, amount: 0.4 }}
      >
        Powered by OpenAI • Anthropic • Supabase
      </motion.p>

      {/* Contact Sales Sheet */}
      <PricingContactSheet
        open={contactSheetOpen}
        onOpenChange={setContactSheetOpen}
        defaultSubject={
          selectedPlan === "team"
            ? "Team Plan Inquiry"
            : "Enterprise Plan Inquiry"
        }
        defaultMessage={`Hi, I'm interested in the ${
          selectedPlan === "team" ? "Team" : "Enterprise"
        } plan.\n\nName: \nCompany: \nCurrent team size: \n\nPlease contact me to discuss pricing and features.`}
      />
    </div>
  );
}

// ---- Components ----

type Feature = { text: string; on: boolean };

function MotionPlanCard(
  props: React.ComponentProps<typeof motion.div> & {
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
    contactSales?: boolean;
    href?: string;
    onClick?: () => void;
  }
) {
  const {
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
    contactSales,
    href,
    onClick,
    ...motionProps
  } = props;

  const reduceMotion = useReducedMotion();
  const price = yearly ? priceYr : priceMo;
  const showSavings =
    !custom &&
    typeof priceMo === "number" &&
    typeof priceYr === "number" &&
    yearly &&
    priceMo !== priceYr;
  const savings = showSavings ? (priceMo! - priceYr!) * 12 : 0;

  return (
    <motion.div
      {...motionProps}
      whileHover={reduceMotion ? undefined : { y: -4 }}
      transition={{ type: "spring", stiffness: 260, damping: 22 }}
      className="h-full"
    >
      <Card
        className={`relative flex h-full flex-col ${
          popular ? "ring-2 ring-primary" : ""
        }`}
      >
        {popular && (
          <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
            Most Popular
          </Badge>
        )}

        <CardHeader className="text-center pb-2">
          <div
            className={`mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full ${
              popular
                ? "bg-primary/10 text-primary"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {icon}
          </div>

          <CardTitle className="text-2xl">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>

          <div className="mt-4">
            {custom ? (
              <div>
                <span className="text-4xl font-bold">Custom</span>
                {contactSales && (
                  <div className="text-sm text-muted-foreground mt-1">
                    Contact us for pricing
                  </div>
                )}
              </div>
            ) : (
              <div>
                <span className="text-4xl font-bold">${price}</span>
                <span className="text-muted-foreground">/mo</span>
                {showSavings && (
                  <div className="text-sm text-green-600">
                    Save ${savings}/yr
                  </div>
                )}
              </div>
            )}
          </div>
        </CardHeader>

        <CardContent className="flex flex-1 flex-col">
          {/* Use Link for login redirects, Button for contact sales */}
          {href ? (
            <Button
              asChild
              className="mb-4 w-full"
              variant={popular ? "default" : "outline"}
            >
              <Link href={href}>
                {contactSales && <Mail className="mr-2 h-4 w-4" />}
                {ctaText}
              </Link>
            </Button>
          ) : (
            <Button
              className="mb-4 w-full"
              variant={popular ? "default" : "outline"}
              onClick={onClick}
            >
              {contactSales && <Mail className="mr-2 h-4 w-4" />}
              {ctaText}
            </Button>
          )}

          <motion.ul
            className="space-y-3 text-sm"
            variants={listStagger}
            initial={reduceMotion ? false : "hidden"}
            whileInView={reduceMotion ? undefined : "show"}
            viewport={{ once: true, amount: 0.35 }}
          >
            {features.map((f) => (
              <motion.li
                key={f.text}
                variants={listItem}
                className="flex items-start gap-3"
              >
                {f.on ? (
                  <Check className="mt-0.5 h-4 w-4 text-green-600" />
                ) : (
                  <X className="mt-0.5 h-4 w-4 text-muted-foreground" />
                )}
                <span className={f.on ? "" : "text-muted-foreground"}>
                  {f.text}
                </span>
              </motion.li>
            ))}
          </motion.ul>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function MotionFaqItem(
  props: React.ComponentProps<typeof motion.div> & { q: string; a: string }
) {
  const { q, a, ...motionProps } = props;
  const [open, setOpen] = React.useState(false);
  const reduceMotion = useReducedMotion();

  return (
    <motion.div {...motionProps}>
      <div className="rounded-xl border p-4">
        <button
          className="flex w-full items-center justify-between text-left"
          onClick={() => setOpen((o) => !o)}
        >
          <span className="font-medium">{q}</span>
          <span
            className={`text-xl transition-transform ${
              open ? "rotate-45" : ""
            }`}
          >
            +
          </span>
        </button>

        {/* Animate open/close */}
        <motion.div
          initial={false}
          animate={
            open && !reduceMotion
              ? { height: "auto", opacity: 1, marginTop: 8 }
              : open
              ? { height: "auto", opacity: 1, marginTop: 8 }
              : { height: 0, opacity: 0, marginTop: 0 }
          }
          transition={
            reduceMotion ? { duration: 0 } : { duration: 0.22, ease: easeOut }
          }
          style={{ overflow: "hidden" }}
        >
          <p className="text-sm text-muted-foreground">{a}</p>
        </motion.div>
      </div>
    </motion.div>
  );
}
