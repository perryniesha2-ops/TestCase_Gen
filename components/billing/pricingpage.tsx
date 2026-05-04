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
    "team",
  );
  const reduceMotion = useReducedMotion();

  const viewportOnce = { once: true, amount: 0.25 as const };

  const handleContactSales = (planType: "team" | "enterprise") => {
    setSelectedPlan(planType);
    setContactSheetOpen(true);
  };

  return (
    <div className="relative min-h-screen">
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
            animation: reduceMotion
              ? "none"
              : "auroraShift 8s ease-in-out infinite",
          }}
        />

        <div
          className="absolute -right-[15%] -top-[5%] h-[60vh] w-[55vw] rounded-full"
          style={{
            background:
              "radial-gradient(ellipse at 70% 20%, #0a1f3d 0%, #07152e 30%, transparent 70%)",
            filter: "blur(80px)",
            animation: reduceMotion
              ? "none"
              : "auroraShift2 10s ease-in-out infinite",
          }}
        />

        <div
          className="absolute left-[15%] -top-[5%] h-[55vh] w-[70vw] rounded-full"
          style={{
            background:
              "radial-gradient(ellipse at 50% 0%, #06b6d4 0%, #0284c7 18%, #034d8a 40%, transparent 68%)",
            filter: "blur(80px)",
            opacity: 0.35,
            animation: reduceMotion
              ? "none"
              : "auroraShift 6s ease-in-out infinite",
          }}
        />

        <div
          className="absolute left-[40%] -top-[15%] h-[40vh] w-[40vw] rounded-full"
          style={{
            background:
              "radial-gradient(ellipse at 50% 0%, #22d3ee 0%, #06b6d4 20%, #0369a1 45%, transparent 70%)",
            filter: "blur(60px)",
            opacity: 0.25,
            animation: reduceMotion
              ? "none"
              : "auroraShift2 7s ease-in-out infinite",
          }}
        />

        <div
          className="absolute left-[20%] top-[55vh] h-[60vh] w-[60vw] rounded-full"
          style={{
            background:
              "radial-gradient(ellipse at 50% 50%, #0d2a4a 0%, #0a1f3d 25%, #061428 50%, transparent 75%)",
            filter: "blur(80px)",
            opacity: 0.8,
            animation: reduceMotion
              ? "none"
              : "auroraShift2 9s ease-in-out infinite",
          }}
        />

        <div
          className="absolute left-[10%] top-[100vh] h-[60vh] w-[70vw] rounded-full"
          style={{
            background:
              "radial-gradient(ellipse at 40% 50%, #0d2a4a 0%, #061e3a 30%, transparent 70%)",
            filter: "blur(90px)",
            opacity: 0.7,
            animation: reduceMotion
              ? "none"
              : "auroraShift 11s ease-in-out infinite",
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

      {/* ── Page content ── */}
      <div className="mx-auto max-w-6xl px-4 py-10">
        {/* Page header */}
        <motion.div
          className="text-center mb-10"
          variants={headerStagger}
          initial={reduceMotion ? false : "hidden"}
          whileInView={reduceMotion ? undefined : "show"}
          viewport={viewportOnce}
        >
          <motion.h1
            variants={itemUp}
            className="text-3xl font-semibold tracking-tight text-gray-900 sm:text-4xl dark:text-white"
          >
            Start free. Scale as you grow.
          </motion.h1>

          <motion.p
            variants={itemUp}
            className="mt-2 text-gray-500 dark:text-white/40"
          >
            All plans include the core generator. Upgrade for higher limits,
            collaboration, and integrations.
          </motion.p>

          {/* Billing toggle */}
          <motion.div
            variants={itemUp}
            className="mt-5 inline-flex items-center gap-3 rounded-full border border-gray-200 bg-white/80 px-4 py-2 backdrop-blur-sm dark:border-white/10 dark:bg-white/5"
          >
            <span
              className={
                !yearly
                  ? "font-medium text-gray-900 dark:text-white"
                  : "text-gray-400 dark:text-white/40"
              }
            >
              Monthly
            </span>
            <Switch checked={yearly} onCheckedChange={setYearly} />
            <span
              className={
                yearly
                  ? "font-medium text-gray-900 dark:text-white"
                  : "text-gray-400 dark:text-white/40"
              }
            >
              Yearly
            </span>
            <Badge
              variant="outline"
              className="ml-1 inline-flex items-center gap-1 border-blue-200 bg-blue-50 text-blue-600 dark:border-cyan-400/30 dark:bg-cyan-400/10 dark:text-cyan-400"
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
              { text: "Limited time: 2x free test cases!", on: true },
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
          className="mt-12 grid gap-4 md:grid-cols-2"
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
          <div className="relative overflow-hidden rounded-2xl border border-gray-200 bg-white/80 p-12 text-center backdrop-blur-sm dark:border-white/10 dark:bg-white/4">
            {/* Inner aqua glow */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 -z-10"
              style={{
                background:
                  "radial-gradient(ellipse 80% 60% at 50% 100%, rgba(6,182,212,0.08), transparent 70%)",
              }}
            />
            {/* Rim light */}
            <div
              className="absolute top-0 left-[10%] right-[10%] h-[1px]"
              style={{
                background:
                  "linear-gradient(90deg, transparent, #06b6d4 40%, #38bdf8 50%, #06b6d4 60%, transparent)",
                opacity: 0.35,
              }}
            />

            <h3 className="text-2xl font-semibold text-gray-900 dark:text-white">
              Ready to generate your first test suite?
            </h3>
            <p className="mt-2 text-gray-500 dark:text-white/40">
              Create an account and start with 20 free AI-generated test cases
              per month.
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <Button
                asChild
                size="lg"
                className="rounded-full bg-blue-600 px-8 text-white shadow-lg shadow-blue-600/20 hover:bg-blue-500 dark:bg-cyan-500 dark:shadow-cyan-900/50 dark:hover:bg-cyan-400"
              >
                <Link href="/signup">Create account</Link>
              </Button>
            </div>
          </div>
        </motion.div>

        <motion.p
          className="mt-8 text-center text-xs text-gray-400 dark:text-white/25"
          variants={sectionVariants}
          initial={reduceMotion ? false : "hidden"}
          whileInView={reduceMotion ? undefined : "show"}
          viewport={{ once: true, amount: 0.4 }}
        />
      </div>

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
  },
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
      className="h-full pt-3"
    >
      <div
        className={`group relative flex h-full flex-col rounded-2xl border bg-white/80 backdrop-blur-sm transition-all duration-300 dark:bg-white/4 ${
          popular
            ? "border-blue-400 shadow-lg shadow-blue-500/10 dark:border-cyan-400/50 dark:shadow-cyan-500/10"
            : "border-gray-200 hover:border-gray-300 dark:border-white/8 dark:hover:border-white/15"
        }`}
      >
        {/* Popular top accent line */}
        {popular && (
          <div
            className="absolute top-0 left-0 right-0 h-[2px]"
            style={{
              background:
                "linear-gradient(90deg, transparent, #38bdf8 30%, #22d3ee 50%, #38bdf8 70%, transparent)",
            }}
          />
        )}

        {popular && (
          <div className="absolute -top-3 left-1/2 -translate-x-1/2">
            <Badge className="bg-blue-600 text-white dark:bg-cyan-500">
              Most Popular
            </Badge>
          </div>
        )}

        <div className="p-6 text-center">
          <div
            className={`mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full ${
              popular
                ? "bg-blue-100 text-blue-600 dark:bg-cyan-400/10 dark:text-cyan-400"
                : "bg-gray-100 text-gray-500 dark:bg-white/8 dark:text-white/40"
            }`}
          >
            {icon}
          </div>

          <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
            {title}
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-white/40">
            {description}
          </p>

          <div className="mt-4">
            {custom ? (
              <div>
                <span className="text-4xl font-bold text-gray-900 dark:text-white">
                  Custom
                </span>
                {contactSales && (
                  <div className="text-sm text-gray-400 mt-1 dark:text-white/30">
                    Contact us for pricing
                  </div>
                )}
              </div>
            ) : (
              <div>
                <span className="text-4xl font-bold text-gray-900 dark:text-white">
                  ${price}
                </span>
                <span className="text-gray-400 dark:text-white/30">/mo</span>
                {showSavings && (
                  <div className="text-sm text-green-600 dark:text-green-400">
                    Save ${savings}/yr
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-1 flex-col px-6 pb-6">
          {href ? (
            <Button
              asChild
              className={`mb-4 w-full rounded-full font-semibold ${
                popular
                  ? "bg-blue-600 text-white shadow-md shadow-blue-600/20 hover:bg-blue-500 dark:bg-cyan-500 dark:shadow-cyan-900/40 dark:hover:bg-cyan-400"
                  : "border border-gray-200 bg-transparent text-gray-700 hover:bg-gray-50 dark:border-white/10 dark:text-white/70 dark:hover:bg-white/8 dark:hover:text-white"
              }`}
              variant="ghost"
            >
              <Link href={href}>
                {contactSales && <Mail className="mr-2 h-4 w-4" />}
                {ctaText}
              </Link>
            </Button>
          ) : (
            <Button
              className={`mb-4 w-full rounded-full font-semibold ${
                popular
                  ? "bg-blue-600 text-white shadow-md shadow-blue-600/20 hover:bg-blue-500 dark:bg-cyan-500 dark:shadow-cyan-900/40 dark:hover:bg-cyan-400"
                  : "border border-gray-200 bg-transparent text-gray-700 hover:bg-gray-50 dark:border-white/10 dark:text-white/70 dark:hover:bg-white/8 dark:hover:text-white"
              }`}
              variant="ghost"
              onClick={onClick}
            >
              {contactSales && <Mail className="mr-2 h-4 w-4" />}
              {ctaText}
            </Button>
          )}

          {/* Divider */}
          <div className="mb-4 h-px w-full bg-gray-100 dark:bg-white/8" />

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
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-cyan-500 dark:text-cyan-400" />
                ) : (
                  <X className="mt-0.5 h-4 w-4 shrink-0 text-gray-300 dark:text-white/20" />
                )}
                <span
                  className={
                    f.on
                      ? "text-gray-700 dark:text-white/70"
                      : "text-gray-300 dark:text-white/20"
                  }
                >
                  {f.text}
                </span>
              </motion.li>
            ))}
          </motion.ul>
        </div>
      </div>
    </motion.div>
  );
}

function MotionFaqItem(
  props: React.ComponentProps<typeof motion.div> & { q: string; a: string },
) {
  const { q, a, ...motionProps } = props;
  const [open, setOpen] = React.useState(false);
  const reduceMotion = useReducedMotion();

  return (
    <motion.div {...motionProps}>
      <div className="rounded-xl border border-gray-200 bg-white/80 p-4 backdrop-blur-sm dark:border-white/8 dark:bg-white/4">
        <button
          className="flex w-full items-center justify-between text-left"
          onClick={() => setOpen((o) => !o)}
        >
          <span className="font-medium text-gray-900 dark:text-white">{q}</span>
          <span
            className={`text-xl text-gray-400 transition-transform dark:text-white/40 ${
              open ? "rotate-45" : ""
            }`}
          >
            +
          </span>
        </button>

        <motion.div
          initial={false}
          animate={
            open
              ? { height: "auto", opacity: 1, marginTop: 8 }
              : { height: 0, opacity: 0, marginTop: 0 }
          }
          transition={
            reduceMotion ? { duration: 0 } : { duration: 0.22, ease: easeOut }
          }
          style={{ overflow: "hidden" }}
        >
          <p className="text-sm text-gray-500 dark:text-white/40">{a}</p>
        </motion.div>
      </div>
    </motion.div>
  );
}
