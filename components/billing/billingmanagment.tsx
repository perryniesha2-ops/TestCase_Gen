"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth/auth-context";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import {
  FlaskConical,
  FileText,
  BarChart3,
  CreditCard,
  Crown,
  Building,
  Check,
  X,
  Loader2,
  Sparkles,
  Users,
  Mail,
  RefreshCw,
  AlertTriangle,
  Calendar,
} from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { PricingContactSheet } from "../billing/pricingcontact";
import { UpgradePrompt } from "@/components/billing/upgradePrompt";
import { CancelSubscriptionDialog } from "@/components/billing/cancelsubscriptiondialog";

type Tier = "free" | "pro" | "team" | "enterprise";

interface UserProfile {
  id: string;
  email: string;
  subscription_tier: Tier;
  subscription_status: "active" | "canceled" | "past_due" | "trial";
  trial_ends_at?: string;
  usage: {
    test_cases_generated: number;
    api_calls_used: number;
    monthly_limit: number;
  };
}

type PlanFeature = { name: string; included: boolean };

type Plan = {
  id: Tier;
  name: string;
  price: number | null;
  yearlyPrice: number | null;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  features: PlanFeature[];
  cta: string;
  popular: boolean;
  contactSales?: boolean;
};

// ------------------------- Data -------------------------

const plans: Plan[] = [
  {
    id: "free",
    name: "Free",
    price: 0,
    yearlyPrice: 0,
    description: "Perfect for getting started",
    icon: Sparkles,
    features: [
      { name: "20 AI-generated test cases/month", included: true },
      { name: "🎉 Limited time: 2x free test cases!", included: true },
      { name: "Unlimited manual test cases", included: true },
      { name: "Basic test execution tracking", included: true },
      { name: "3 requirement templates", included: true },
      { name: "Email support", included: true },
      { name: "Export to CSV", included: true },
      { name: "Advanced AI models", included: false },
      { name: "Custom integrations", included: false },
      { name: "Team collaboration", included: false },
      { name: "Priority support", included: false },
    ],
    cta: "Get Started",
    popular: false,
  },
  {
    id: "pro",
    name: "Pro",
    price: 15,
    yearlyPrice: 12,
    description: "For serious testers and small teams",
    icon: FlaskConical,
    features: [
      { name: "500 AI-generated test cases/month", included: true },
      { name: "Unlimited manual test cases", included: true },
      { name: "Advanced test execution tracking", included: true },
      { name: "Unlimited requirement templates", included: true },
      { name: "All AI models (Claude, GPT-4)", included: true },
      { name: "Cross-platform test generation", included: true },
      { name: "Export to multiple formats", included: true },
      { name: "API access", included: true },
      { name: "Team collaboration (up to 5 users)", included: true },
      { name: "Priority email support", included: true },
      { name: "Custom integrations", included: false },
    ],
    cta: "Start Pro Trial",
    popular: true,
  },
  {
    id: "team",
    name: "Team",
    price: null,
    yearlyPrice: null,
    description: "For growing teams and organizations",
    icon: Users,
    features: [
      { name: "2,000 AI-generated test cases/month", included: true },
      { name: "Unlimited manual test cases", included: true },
      { name: "Advanced analytics & reporting", included: true },
      { name: "Team management & permissions", included: true },
      { name: "All AI models + priority access", included: true },
      { name: "Advanced integrations (Jira, Azure)", included: true },
      { name: "Custom test case templates", included: true },
      { name: "API access with higher limits", included: true },
      { name: "Team collaboration (up to 15 users)", included: true },
      { name: "Priority support + Slack channel", included: true },
      { name: "Custom onboarding", included: true },
    ],
    cta: "Contact Sales",
    popular: false,
    contactSales: true,
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: null,
    yearlyPrice: null,
    description: "Custom solutions for large organizations",
    icon: Building,
    features: [
      { name: "Unlimited AI-generated test cases", included: true },
      { name: "Unlimited manual test cases", included: true },
      { name: "Advanced analytics & custom reports", included: true },
      { name: "Advanced team management", included: true },
      { name: "Custom AI model fine-tuning", included: true },
      { name: "Custom integrations & SSO", included: true },
      { name: "On-premise deployment option", included: true },
      { name: "Dedicated API & SLA", included: true },
      { name: "Unlimited users", included: true },
      { name: "Dedicated success manager", included: true },
      { name: "Custom contract & billing", included: true },
    ],
    cta: "Contact Sales",
    popular: false,
    contactSales: true,
  },
];

const faqs = [
  {
    q: "What counts as an AI-generated test case?",
    a: "Each test case generated using our AI models (Claude, GPT-4, etc.) counts toward your monthly limit. Manual test cases you create yourself are always unlimited.",
  },
  {
    q: "Can I upgrade or downgrade anytime?",
    a: "Yes. Upgrades take effect immediately; downgrades take effect at the end of your current billing cycle.",
  },
  {
    q: "What happens if I exceed my limit?",
    a: "We'll notify you as you approach your limit. If you exceed it, you can upgrade or wait until next month. Your existing test cases remain accessible.",
  },
  {
    q: "Is there a free trial?",
    a: "Yes. Pro plan includes a 14-day free trial. For Team and Enterprise plans, contact our sales team for a personalized demo and trial.",
  },
  {
    q: "Do you offer discounts for nonprofits or education?",
    a: "Yes. We offer 50% discounts for qualified nonprofits, educational institutions, and open-source projects. Contact support for details.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Absolutely. Cancel from the billing page; you keep access until the end of the period.",
  },
];

// ------------------------- Helpers -------------------------

function fmtUSD(n: number) {
  return n.toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

function priceFor(plan: Plan, isYearly: boolean): number | null {
  return isYearly ? plan.yearlyPrice : plan.price;
}

function yearlySavings(plan: Plan): number {
  if (plan.price == null || plan.yearlyPrice == null) return 0;
  const monthlyDiff = Math.max(0, plan.price - plan.yearlyPrice);
  return monthlyDiff * 12;
}

function usagePct(u?: UserProfile["usage"]): number {
  if (!u) return 0;
  if (u.monthly_limit <= 0) return 0;
  return Math.min(
    100,
    Math.round((u.test_cases_generated / u.monthly_limit) * 100),
  );
}

function SubscriptionManagementSection({
  user,
  onUpdate,
}: {
  user: UserProfile;
  onUpdate: () => void;
}) {
  const [cancelDialogOpen, setCancelDialogOpen] = React.useState(false);
  const [reactivating, setReactivating] = React.useState(false);
  const router = useRouter();

  const isCancelledButActive =
    (user as any).cancel_at_period_end && user.subscription_status === "active";

  const currentPeriodEnd = (user as any).current_period_end;
  const trialEndsAt = (user as any).trial_ends_at;

  const isOnTrial = user.subscription_status === "trial";
  const dateToShow = isOnTrial && trialEndsAt ? trialEndsAt : currentPeriodEnd;

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const handleReactivate = async () => {
    setReactivating(true);
    try {
      const response = await fetch("/api/billing/reactivate", {
        method: "POST",
      });

      if (!response.ok) throw new Error("Failed to reactivate");

      document.cookie = "user_tier=; Max-Age=0; path=/";
      document.cookie = "tier_cache_time=; Max-Age=0; path=/";

      toast.success("Subscription reactivated!");
      onUpdate();
    } catch (error) {
      toast.error("Failed to reactivate subscription");
    } finally {
      setReactivating(false);
    }
  };

  return (
    <>
      {/* Cancellation Alert - Compact */}
      {isCancelledButActive && (
        <Alert className="mb-6 border-orange-200 bg-orange-50">
          <AlertTriangle className="h-4 w-4 text-orange-600" />
          <AlertDescription>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <p className="font-medium text-orange-900">
                  Subscription ends {dateToShow && formatDate(dateToShow)}
                </p>
                <p className="text-sm text-orange-700 mt-0.5">
                  You'll keep Pro access until then, after which you'll move to
                  Free.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleReactivate}
                disabled={reactivating}
                className="shrink-0"
              >
                {reactivating ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                Reactivate
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Subscription Card - Super Compact */}
      <Card className="mb-10">
        <CardContent className="py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            {/* Left: Plan Info */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1.5">
                <h3 className="text-base font-semibold">
                  {user.subscription_tier.toUpperCase()} Plan
                </h3>
                <Badge
                  variant="secondary"
                  className={cn(
                    "text-xs",
                    user.subscription_status === "trial" &&
                      "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100",
                    user.subscription_status === "active" &&
                      "bg-green-50 text-green-700 border-green-200 hover:bg-green-100",
                  )}
                >
                  {user.subscription_status === "trial" ? (
                    <span className="flex items-center gap-1">
                      <Sparkles className="h-3 w-3" />
                      Free Trial
                    </span>
                  ) : (
                    <span className="flex items-center gap-1">
                      <Check className="h-3 w-3" />
                      Active
                    </span>
                  )}
                </Badge>
              </div>

              {dateToShow && (
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>
                    {isCancelledButActive
                      ? "Access until"
                      : isOnTrial
                        ? "Trial ends"
                        : "Renews"}{" "}
                    <span className="font-medium text-foreground">
                      {formatDate(dateToShow)}
                    </span>
                  </span>
                </div>
              )}
            </div>

            {/* Right: Cancel Button */}
            {!isCancelledButActive && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCancelDialogOpen(true)}
                className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0"
              >
                Cancel subscription
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Cancel Dialog */}
      <CancelSubscriptionDialog
        open={cancelDialogOpen}
        onOpenChange={setCancelDialogOpen}
        currentPeriodEnd={currentPeriodEnd}
        planName={user.subscription_tier}
      />
    </>
  );
}

// ------------------------- Page -------------------------

export default function BillingPage() {
  const [user, setUser] = React.useState<UserProfile | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [billingLoading, setBillingLoading] = React.useState(false);
  const [refetching, setRefetching] = React.useState(false);
  const [isYearly, setIsYearly] = React.useState(false);
  const [contactSheetOpen, setContactSheetOpen] = React.useState(false);
  const [selectedPlan, setSelectedPlan] = React.useState<"team" | "enterprise">(
    "team",
  );
  const router = useRouter();
  const { user: authUser } = useAuth();

  const searchParams = useSearchParams();
  const supabase = createClient();

  // Function to fetch user data
  const fetchUserData = React.useCallback(async () => {
    try {
      if (!authUser) {
        router.push("/login");
        return null;
      }

      // Fetch real user profile from database
      const { data: profile, error } = await supabase
        .from("user_profiles")
        .select(
          `
          *,
          user_usage(
            test_cases_generated,
            api_calls_used,
            monthly_limit_test_cases
          )
        `,
        )
        .eq("id", authUser.id)
        .single();

      if (error) {
        console.error("Error fetching profile:", error);
        // Fallback to mock data
        const mock: UserProfile = {
          id: authUser.id,
          email: authUser.email || "",
          subscription_tier: "free",
          subscription_status: "active",
          usage: {
            test_cases_generated: 3,
            api_calls_used: 15,
            monthly_limit: 20,
          },
        };
        return mock;
      } else {
        // Use real data from database with FALLBACK for limits
        const realProfile: UserProfile = {
          id: profile.id,
          email: profile.email,
          subscription_tier: profile.subscription_tier || "free",
          subscription_status: profile.subscription_status || "active",
          trial_ends_at: profile.trial_ends_at,
          usage: {
            test_cases_generated:
              profile.user_usage?.[0]?.test_cases_generated || 0,
            api_calls_used: profile.user_usage?.[0]?.api_calls_used || 0,
            monthly_limit:
              profile.user_usage?.[0]?.monthly_limit_test_cases ||
              (profile.subscription_tier === "pro"
                ? 500
                : profile.subscription_tier === "team"
                  ? 2000
                  : profile.subscription_tier === "enterprise"
                    ? -1
                    : 20),
          },
        };
        return realProfile;
      }
    } catch (e) {
      toast.error("Failed to load billing information");
      return null;
    }
  }, [authUser, router, supabase]);

  // Initial load
  React.useEffect(() => {
    if (authUser) {
      (async () => {
        setLoading(true);
        const userData = await fetchUserData();
        setUser(userData);
        setLoading(false);
      })();
    }
  }, [fetchUserData, authUser]);

  // ⭐ NEW: Check for successful checkout and handle redirect back to feature
  React.useEffect(() => {
    const success = searchParams.get("success");
    const sessionId = searchParams.get("session_id");
    const redirect = searchParams.get("redirect"); // ⭐ Get redirect param

    if (success === "true" && sessionId) {
      // Clear tier cache so middleware fetches fresh subscription status
      document.cookie = "user_tier=; Max-Age=0; path=/";
      document.cookie = "tier_cache_time=; Max-Age=0; path=/";

      // Show success message
      toast.success("🎉 Subscription activated! Updating your account...");

      // Refetch data after a short delay to allow webhook to process
      const refetchTimer = setTimeout(async () => {
        setRefetching(true);
        const userData = await fetchUserData();
        setUser(userData);
        setRefetching(false);

        if (userData) {
          toast.success(
            `Welcome to ${userData.subscription_tier.toUpperCase()} plan!`,
          );
        }

        // ⭐ NEW: Redirect back to the feature they wanted after upgrade
        if (redirect) {
          setTimeout(() => {
            router.push(redirect);
          }, 1000);
        } else {
          // Clean up URL if no redirect
          router.replace("/billing", { scroll: false });
        }
      }, 2000); // 2 second delay

      return () => clearTimeout(refetchTimer);
    }
  }, [searchParams, fetchUserData, router]);

  // Manual refresh function
  const handleRefresh = async () => {
    setRefetching(true);
    const userData = await fetchUserData();
    setUser(userData);
    setRefetching(false);
    toast.success("Data refreshed!");
  };

  async function handleSubscribe(planId: Tier) {
    if (!user) return;
    setBillingLoading(true);
    try {
      // Open ContactSheet for Team and Enterprise
      if (planId === "team" || planId === "enterprise") {
        setSelectedPlan(planId);
        setContactSheetOpen(true);
        setBillingLoading(false);
        return;
      }

      if (planId === "free") {
        toast.success("You're already on the free plan!");
        setBillingLoading(false);
        return;
      }

      // Only Pro plan goes through Stripe checkout
      const res = await fetch("/api/billing/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId, isYearly, userId: user.id }),
      });
      if (!res.ok) throw new Error("Failed to start subscription");
      const { checkoutUrl } = await res.json();
      window.location.href = checkoutUrl as string;
    } catch (e) {
      console.error(e);
      toast.error("Failed to start subscription. Please try again.");
    } finally {
      setBillingLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex items-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span className="text-muted-foreground">Loading billing…</span>
        </div>
      </div>
    );
  }

  const currentPlan =
    plans.find((p) => p.id === user?.subscription_tier) ?? plans[0];

  return (
    <div className="relative">
      {/* subtle bg gradient */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-[-15%] -z-10 h-[420px] bg-gradient-to-b from-primary/10 via-primary/5 to-transparent"
      />

      <div className="container mx-auto max-w-6xl px-4 py-10">
        {/* ⭐ NEW: Show upgrade prompt when redirected from Pro-only routes */}
        <UpgradePrompt />

        {/* Header */}
        <div className="mb-10 text-center">
          <div className="flex items-center justify-center gap-3 mb-3">
            <Badge variant="secondary">Pricing</Badge>
            {/* Refresh button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              disabled={refetching}
              className="h-7"
            >
              <RefreshCw
                className={cn("h-3 w-3", refetching && "animate-spin")}
              />
            </Button>
          </div>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Choose your plan
          </h1>
          <p className="mt-2 text-muted-foreground">
            Start free, upgrade as you grow.
          </p>

          {/* Billing toggle */}
          <div className="mt-6 flex items-center justify-center gap-3">
            <span
              className={cn(
                "text-sm",
                !isYearly ? "font-medium" : "text-muted-foreground",
              )}
            >
              Monthly
            </span>
            <Switch checked={isYearly} onCheckedChange={setIsYearly} />
            <span
              className={cn(
                "text-sm",
                isYearly ? "font-medium" : "text-muted-foreground",
              )}
            >
              Yearly
            </span>
            <Badge variant="outline" className="ml-2">
              Save up to 20%
            </Badge>
          </div>
        </div>

        {/* Show loading state during refetch */}
        {refetching && (
          <Card className="mb-6 border-primary/30 bg-primary/5">
            <CardContent className="py-4">
              <div className="flex items-center justify-center gap-3 text-sm">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                <span className="text-muted-foreground">
                  Updating your subscription details...
                </span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Usage */}
        {user && (
          <Card className="mb-10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Current usage
              </CardTitle>
              <CardDescription>
                Your usage this month on the {currentPlan.name} plan
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="mb-2 flex justify-between text-sm">
                  <span>AI-generated test cases</span>
                  <span>
                    {user.usage.test_cases_generated} /{" "}
                    {user.usage.monthly_limit === -1
                      ? "∞"
                      : user.usage.monthly_limit}
                  </span>
                </div>
                <Progress value={usagePct(user.usage)} />
              </div>

              <div className="grid gap-4 pt-4 sm:grid-cols-2 lg:grid-cols-4">
                <Stat
                  icon={FlaskConical}
                  label="Generated"
                  value={String(user.usage.test_cases_generated)}
                  iconClass="text-primary"
                />
                <Stat
                  icon={FileText}
                  label="Manual Tests"
                  value="∞"
                  iconClass="text-green-600"
                />
                <Stat
                  icon={CreditCard}
                  label="API Calls"
                  value={String(user.usage.api_calls_used)}
                  iconClass="text-blue-600"
                />
                <Stat
                  icon={Crown}
                  label="Plan"
                  value={user.subscription_tier.toUpperCase()}
                  iconClass="text-yellow-500"
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Subscription Management*/}

        {user && user.subscription_tier !== "free" && (
          <SubscriptionManagementSection user={user} onUpdate={handleRefresh} />
        )}

        {/* Plans */}
        <div className="mb-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {plans.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              isYearly={isYearly}
              isCurrent={user?.subscription_tier === plan.id}
              billingLoading={billingLoading}
              onSelect={() => handleSubscribe(plan.id)}
            />
          ))}
        </div>

        {/* FAQ */}
        <Card className="mb-10">
          <CardHeader>
            <CardTitle>Frequently asked questions</CardTitle>
            <CardDescription>
              Everything you need to know about our pricing and plans.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              {faqs.map((f, i) => (
                <AccordionItem key={i} value={`item-${i}`}>
                  <AccordionTrigger className="text-left">
                    {f.q}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    {f.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>

        {/* Team & Enterprise CTA */}
        <Card className="border-primary/30 bg-gradient-to-r from-primary/10 to-primary/5">
          <CardContent className="py-10 text-center">
            <div className="flex justify-center gap-4 mb-4">
              <Users className="h-12 w-12 text-primary" />
              <Building className="h-12 w-12 text-primary" />
            </div>
            <h2 className="text-2xl font-semibold tracking-tight">
              Need Team or Enterprise features?
            </h2>
            <p className="mx-auto mt-2 max-w-2xl text-muted-foreground">
              Get custom pricing, advanced integrations, dedicated support, and
              features tailored to your organization's needs.
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <Button size="lg" onClick={() => handleSubscribe("team")}>
                <Mail className="mr-2 h-4 w-4" />
                Contact Sales
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

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
        title="Contact Sales"
        description="Tell us about your needs and we'll get back to you with a custom quote."
      />
    </div>
  );
}

// ------------------------- Subcomponents -------------------------

function Stat({
  icon: Icon,
  label,
  value,
  iconClass,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  iconClass?: string;
}) {
  return (
    <div className="text-center">
      <Icon className={cn("mx-auto mb-2 h-8 w-8", iconClass)} />
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

function PlanCard({
  plan,
  isYearly,
  isCurrent,
  billingLoading,
  onSelect,
}: {
  plan: Plan;
  isYearly: boolean;
  isCurrent: boolean;
  billingLoading: boolean;
  onSelect: () => void;
}) {
  const Icon = plan.icon;
  const price = priceFor(plan, isYearly);
  const showSavings =
    isYearly &&
    plan.price != null &&
    plan.yearlyPrice != null &&
    plan.yearlyPrice < plan.price;
  const savings = showSavings ? yearlySavings(plan) : 0;

  return (
    <Card
      className={cn(
        "relative",
        plan.popular && "ring-2 ring-primary",
        isCurrent && "border-primary",
      )}
    >
      {plan.popular && (
        <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
          Most Popular
        </Badge>
      )}
      <CardHeader className="pb-4 text-center">
        <Icon
          className={cn(
            "mx-auto mb-4 h-12 w-12",
            plan.popular ? "text-primary" : "text-muted-foreground",
          )}
        />
        <CardTitle className="text-2xl">{plan.name}</CardTitle>
        <CardDescription>{plan.description}</CardDescription>
        <div className="mt-4">
          {price != null ? (
            <div>
              <span className="text-4xl font-bold">{fmtUSD(price)}</span>
              <span className="text-muted-foreground">/mo</span>
              {showSavings && (
                <div className="text-sm font-medium text-green-600">
                  Save {fmtUSD(savings)}/yr
                </div>
              )}
            </div>
          ) : (
            <div>
              <span className="text-4xl font-bold">Custom</span>
              {plan.contactSales && (
                <div className="text-sm text-muted-foreground mt-1">
                  Contact us for pricing
                </div>
              )}
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <Button
          className="mb-4 w-full"
          variant={isCurrent ? "outline" : plan.popular ? "default" : "outline"}
          disabled={billingLoading || isCurrent}
          onClick={onSelect}
        >
          {billingLoading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : plan.contactSales ? (
            <Mail className="mr-2 h-4 w-4" />
          ) : null}
          {isCurrent ? "Current Plan" : plan.cta}
        </Button>

        <ul className="space-y-3 text-sm">
          {plan.features.map((f, i) => (
            <li key={i} className="flex items-start gap-3">
              {f.included ? (
                <Check className="mt-0.5 h-4 w-4 text-green-600" />
              ) : (
                <X className="mt-0.5 h-4 w-4 text-muted-foreground" />
              )}
              <span className={cn(!f.included && "text-muted-foreground")}>
                {f.name}
              </span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function PromotionalBanner() {
  return (
    <Card className="mb-8 border-green-200 bg-gradient-to-r from-green-50 to-emerald-50">
      <CardContent className="py-6">
        <div className="flex items-center justify-center gap-3 text-center">
          <div className="flex items-center gap-2">
            <Badge className="bg-green-600 text-white px-3 py-1">
              🎉 Limited Time
            </Badge>
            <span className="text-lg font-semibold text-green-800">
              Pro Plan Now $15/month!
            </span>
          </div>
        </div>
        <p className="text-center text-green-700 mt-2">
          Get professional features at an incredible price. Plus{" "}
          <strong>20 free AI-generated test cases</strong> on the Free plan. No
          credit card required!
        </p>
      </CardContent>
    </Card>
  );
}
