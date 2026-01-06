// app/(dashboard)/privacy/page.tsx
"use client";

import * as React from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import {
  Shield,
  Lock,
  Eye,
  Database,
  Cookie,
  Mail,
  Users,
  FileText,
  Globe,
  AlertTriangle,
} from "lucide-react";
import { Logo } from "@/components/pagecomponents/brandlogo";
import { Footer } from "@/components/landingpage/footer";
import { SiteFooter } from "@/components/pagecomponents/site-footer";

type TocItem = { id: string; title: string; icon?: React.ReactNode };

function Section({
  id,
  title,
  kicker,
  children,
}: {
  id: string;
  title: string;
  kicker?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24">
      <div className="mb-4">
        {kicker ? (
          <div className="text-xs uppercase tracking-wide text-muted-foreground">
            {kicker}
          </div>
        ) : null}
        <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

export default function PrivacyPolicyPage() {
  const toc: TocItem[] = [
    {
      id: "overview",
      title: "Overview",
      icon: <Shield className="h-4 w-4" />,
    },
    {
      id: "information-collection",
      title: "Information We Collect",
      icon: <Database className="h-4 w-4" />,
    },
    {
      id: "information-use",
      title: "How We Use Information",
      icon: <Eye className="h-4 w-4" />,
    },
    {
      id: "data-storage",
      title: "Data Storage & Security",
      icon: <Lock className="h-4 w-4" />,
    },
    {
      id: "sharing",
      title: "Information Sharing",
      icon: <Users className="h-4 w-4" />,
    },
    {
      id: "cookies",
      title: "Cookies & Tracking",
      icon: <Cookie className="h-4 w-4" />,
    },
    {
      id: "rights",
      title: "Your Rights",
      icon: <FileText className="h-4 w-4" />,
    },
    {
      id: "children",
      title: "Children's Privacy",
      icon: <AlertTriangle className="h-4 w-4" />,
    },
    {
      id: "international",
      title: "International Users",
      icon: <Globe className="h-4 w-4" />,
    },
    {
      id: "changes",
      title: "Policy Changes",
      icon: <FileText className="h-4 w-4" />,
    },
    {
      id: "contact",
      title: "Contact Us",
      icon: <Mail className="h-4 w-4" />,
    },
  ];

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10">
      {/* Header */}
      <div className="flex flex-col gap-3">
        <div className="space-y-2">
          <Logo size="xl" />
          <h1 className="text-3xl font-semibold tracking-tight">
            Privacy Policy
          </h1>
          <p className="max-w-2xl text-muted-foreground">
            How we collect, use, and protect your personal information.
          </p>
          <div className="flex gap-2">
            <Badge variant="secondary">Legal</Badge>
            <Badge variant="outline">Last Updated: January 6, 2026</Badge>
          </div>
        </div>
      </div>

      <Separator className="my-8" />

      <div className="md:flex md:gap-10">
        <main className="space-y-10">
          {/* Overview */}
          <Section id="overview" title="Overview" kicker="Introduction">
            <Card>
              <CardHeader>
                <CardTitle>Our Commitment to Privacy</CardTitle>
                <CardDescription>
                  Effective Date: January 6, 2026
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <p>
                  SynthQA ("we," "our," or "us") is committed to protecting your
                  privacy. This Privacy Policy explains how we collect, use,
                  disclose, and safeguard your information when you use our test
                  case management platform and services.
                </p>
                <p>
                  By using SynthQA, you agree to the collection and use of
                  information in accordance with this policy. If you do not
                  agree with our policies and practices, please do not use our
                  services.
                </p>
                <Alert>
                  <Shield className="h-4 w-4" />
                  <AlertTitle>Your Privacy Matters</AlertTitle>
                  <AlertDescription>
                    We believe in transparency. This policy explains exactly
                    what data we collect, why we collect it, and how you can
                    control your information.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </Section>

          {/* Information Collection */}
          <Section
            id="information-collection"
            title="Information We Collect"
            kicker="Data Collection"
          >
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="account-info">
                <AccordionTrigger>Account Information</AccordionTrigger>
                <AccordionContent className="space-y-3 text-sm text-muted-foreground">
                  <p>When you create an account, we collect:</p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>
                      <strong>Email address:</strong> Used for authentication
                      and communication
                    </li>
                    <li>
                      <strong>Name:</strong> Optional, for personalization
                    </li>
                    <li>
                      <strong>Password:</strong> Encrypted and securely stored
                    </li>
                    <li>
                      <strong>Profile information:</strong> Any additional
                      details you choose to provide
                    </li>
                  </ul>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="usage-data">
                <AccordionTrigger>Usage Data</AccordionTrigger>
                <AccordionContent className="space-y-3 text-sm text-muted-foreground">
                  <p>
                    We automatically collect certain information when you use
                    SynthQA:
                  </p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>
                      <strong>Log data:</strong> IP address, browser type,
                      device information
                    </li>
                    <li>
                      <strong>Usage patterns:</strong> Features used, pages
                      visited, time spent
                    </li>
                    <li>
                      <strong>Performance data:</strong> Error reports, loading
                      times
                    </li>
                    <li>
                      <strong>Session data:</strong> Login times, activity
                      patterns
                    </li>
                  </ul>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="content-data">
                <AccordionTrigger>Content You Create</AccordionTrigger>
                <AccordionContent className="space-y-3 text-sm text-muted-foreground">
                  <p>We store the content you create and manage in SynthQA:</p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Test cases and test steps</li>
                    <li>Requirements and descriptions</li>
                    <li>Test suites and execution results</li>
                    <li>Projects and templates</li>
                    <li>Comments, notes, and attachments</li>
                    <li>Screenshots and test evidence</li>
                  </ul>
                  <p className="text-xs mt-2">
                    This content is stored securely and is only accessible by
                    you and authorized users of your account.
                  </p>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="payment-data">
                <AccordionTrigger>Payment Information</AccordionTrigger>
                <AccordionContent className="space-y-3 text-sm text-muted-foreground">
                  <p>
                    If you purchase a paid plan, payment processing is handled
                    by third-party processors (Stripe). We do not store your
                    full credit card information. We may store:
                  </p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Last 4 digits of your card</li>
                    <li>Billing address</li>
                    <li>Payment history and invoices</li>
                  </ul>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="communications">
                <AccordionTrigger>Communications</AccordionTrigger>
                <AccordionContent className="space-y-3 text-sm text-muted-foreground">
                  <p>
                    When you communicate with us, we collect the contents of
                    your messages:
                  </p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Support requests and tickets</li>
                    <li>Feedback and feature requests</li>
                    <li>Email correspondence</li>
                  </ul>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </Section>

          {/* Information Use */}
          <Section
            id="information-use"
            title="How We Use Your Information"
            kicker="Data Usage"
          >
            <Card>
              <CardHeader>
                <CardTitle>Purposes of Data Processing</CardTitle>
                <CardDescription>
                  We use your information for the following purposes:
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-muted-foreground">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="p-3 rounded-lg border">
                    <div className="font-medium text-foreground mb-2">
                      Service Delivery
                    </div>
                    <ul className="list-disc pl-5 space-y-1 text-xs">
                      <li>Provide and maintain our services</li>
                      <li>Process your requests and transactions</li>
                      <li>Generate test cases using AI</li>
                      <li>Store and sync your data</li>
                    </ul>
                  </div>

                  <div className="p-3 rounded-lg border">
                    <div className="font-medium text-foreground mb-2">
                      Communication
                    </div>
                    <ul className="list-disc pl-5 space-y-1 text-xs">
                      <li>Send service updates and announcements</li>
                      <li>Respond to support requests</li>
                      <li>Send security alerts</li>
                      <li>Provide product updates (if opted in)</li>
                    </ul>
                  </div>

                  <div className="p-3 rounded-lg border">
                    <div className="font-medium text-foreground mb-2">
                      Improvement
                    </div>
                    <ul className="list-disc pl-5 space-y-1 text-xs">
                      <li>Analyze usage patterns</li>
                      <li>Improve our AI models</li>
                      <li>Debug and fix issues</li>
                      <li>Develop new features</li>
                    </ul>
                  </div>

                  <div className="p-3 rounded-lg border">
                    <div className="font-medium text-foreground mb-2">
                      Security
                    </div>
                    <ul className="list-disc pl-5 space-y-1 text-xs">
                      <li>Prevent fraud and abuse</li>
                      <li>Protect against security threats</li>
                      <li>Enforce our terms of service</li>
                      <li>Comply with legal obligations</li>
                    </ul>
                  </div>
                </div>

                <Alert>
                  <Shield className="h-4 w-4" />
                  <AlertTitle>Legal Basis for Processing</AlertTitle>
                  <AlertDescription>
                    We process your data based on: (1) your consent, (2)
                    contract performance, (3) legal obligations, and (4)
                    legitimate interests in providing and improving our
                    services.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </Section>

          {/* Data Storage */}
          <Section
            id="data-storage"
            title="Data Storage & Security"
            kicker="Protection"
          >
            <Card>
              <CardHeader>
                <CardTitle>How We Protect Your Data</CardTitle>
                <CardDescription>
                  Security measures we implement to protect your information.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-muted-foreground">
                <div>
                  <div className="font-medium text-foreground mb-2">
                    Security Measures:
                  </div>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>
                      <strong>Encryption:</strong> Data encrypted in transit
                      (TLS) and at rest (AES-256)
                    </li>
                    <li>
                      <strong>Access controls:</strong> Role-based access and
                      authentication
                    </li>
                    <li>
                      <strong>Infrastructure:</strong> Secure cloud hosting with
                      leading providers
                    </li>
                    <li>
                      <strong>Monitoring:</strong> 24/7 security monitoring and
                      incident response
                    </li>
                    <li>
                      <strong>Backups:</strong> Regular automated backups with
                      encryption
                    </li>
                    <li>
                      <strong>Audits:</strong> Regular security assessments and
                      updates
                    </li>
                  </ul>
                </div>

                <Separator />

                <div>
                  <div className="font-medium text-foreground mb-2">
                    Data Retention:
                  </div>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>
                      We retain your data for as long as your account is active
                    </li>
                    <li>
                      Deleted data is permanently removed within 30 days unless
                      legally required to retain
                    </li>
                    <li>
                      You can request data deletion at any time by contacting
                      support
                    </li>
                    <li>
                      Backups are retained for disaster recovery for up to 90
                      days
                    </li>
                  </ul>
                </div>

                <Alert>
                  <Lock className="h-4 w-4" />
                  <AlertTitle>No Security is Perfect</AlertTitle>
                  <AlertDescription>
                    While we implement industry-standard security measures, no
                    system is 100% secure. Please use strong passwords and
                    enable two-factor authentication when available.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </Section>

          {/* Information Sharing */}
          <Section
            id="sharing"
            title="Information Sharing"
            kicker="Third Parties"
          >
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="no-selling">
                <AccordionTrigger>We Do Not Sell Your Data</AccordionTrigger>
                <AccordionContent className="space-y-3 text-sm text-muted-foreground">
                  <p>
                    <strong>
                      We do not sell, rent, or trade your personal information
                      to third parties for marketing purposes.
                    </strong>
                  </p>
                  <p>
                    Your test cases, requirements, and other content remain
                    private and are not shared with anyone outside your
                    organization.
                  </p>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="service-providers">
                <AccordionTrigger>Service Providers</AccordionTrigger>
                <AccordionContent className="space-y-3 text-sm text-muted-foreground">
                  <p>
                    We share information with trusted service providers who help
                    us operate SynthQA:
                  </p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>
                      <strong>Hosting providers:</strong> Cloud infrastructure
                      (AWS, Supabase)
                    </li>
                    <li>
                      <strong>Payment processors:</strong> Stripe for billing
                    </li>
                    <li>
                      <strong>AI providers:</strong> Anthropic (Claude), OpenAI
                      for test generation
                    </li>
                    <li>
                      <strong>Email services:</strong> Transactional email
                      delivery
                    </li>
                    <li>
                      <strong>Analytics:</strong> Usage analytics (anonymized
                      where possible)
                    </li>
                  </ul>
                  <p className="text-xs mt-2">
                    These providers are contractually obligated to protect your
                    data and use it only for the services they provide to us.
                  </p>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="legal">
                <AccordionTrigger>Legal Requirements</AccordionTrigger>
                <AccordionContent className="space-y-3 text-sm text-muted-foreground">
                  <p>
                    We may disclose your information if required by law or in
                    response to:
                  </p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Valid legal requests (subpoenas, court orders)</li>
                    <li>Protection of our legal rights</li>
                    <li>Investigation of potential violations</li>
                    <li>Protection of safety and security</li>
                  </ul>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="business-transfer">
                <AccordionTrigger>Business Transfers</AccordionTrigger>
                <AccordionContent className="space-y-3 text-sm text-muted-foreground">
                  <p>
                    If SynthQA is involved in a merger, acquisition, or sale of
                    assets, your information may be transferred. We will provide
                    notice before your information is transferred and becomes
                    subject to a different privacy policy.
                  </p>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </Section>

          {/* Cookies */}
          <Section
            id="cookies"
            title="Cookies & Tracking Technologies"
            kicker="Tracking"
          >
            <Card>
              <CardHeader>
                <CardTitle>How We Use Cookies</CardTitle>
                <CardDescription>
                  Cookies help us provide and improve our services.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-muted-foreground">
                <div>
                  <div className="font-medium text-foreground mb-2">
                    Types of cookies we use:
                  </div>
                  <div className="space-y-3">
                    <div className="p-3 rounded-lg border">
                      <div className="font-medium text-foreground text-sm mb-1">
                        Essential Cookies
                      </div>
                      <p className="text-xs">
                        Required for authentication and basic functionality.
                        Cannot be disabled.
                      </p>
                    </div>
                    <div className="p-3 rounded-lg border">
                      <div className="font-medium text-foreground text-sm mb-1">
                        Functional Cookies
                      </div>
                      <p className="text-xs">
                        Remember your preferences and settings.
                      </p>
                    </div>
                    <div className="p-3 rounded-lg border">
                      <div className="font-medium text-foreground text-sm mb-1">
                        Analytics Cookies
                      </div>
                      <p className="text-xs">
                        Help us understand how you use our service to improve
                        it.
                      </p>
                    </div>
                  </div>
                </div>

                <Separator />

                <div>
                  <div className="font-medium text-foreground mb-2">
                    Managing cookies:
                  </div>
                  <p>
                    You can control cookies through your browser settings. Note
                    that disabling certain cookies may limit functionality.
                  </p>
                </div>
              </CardContent>
            </Card>
          </Section>

          {/* Your Rights */}
          <Section id="rights" title="Your Privacy Rights" kicker="Control">
            <Card>
              <CardHeader>
                <CardTitle>Your Rights and Choices</CardTitle>
                <CardDescription>
                  You have control over your personal information.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <div className="grid md:grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg border">
                    <div className="font-medium text-foreground mb-1">
                      Access
                    </div>
                    <p className="text-xs">
                      Request a copy of your personal data
                    </p>
                  </div>
                  <div className="p-3 rounded-lg border">
                    <div className="font-medium text-foreground mb-1">
                      Correction
                    </div>
                    <p className="text-xs">
                      Update incorrect or incomplete information
                    </p>
                  </div>
                  <div className="p-3 rounded-lg border">
                    <div className="font-medium text-foreground mb-1">
                      Deletion
                    </div>
                    <p className="text-xs">
                      Request deletion of your account and data
                    </p>
                  </div>
                  <div className="p-3 rounded-lg border">
                    <div className="font-medium text-foreground mb-1">
                      Export
                    </div>
                    <p className="text-xs">
                      Download your data in a portable format
                    </p>
                  </div>
                  <div className="p-3 rounded-lg border">
                    <div className="font-medium text-foreground mb-1">
                      Restriction
                    </div>
                    <p className="text-xs">Limit how we use your information</p>
                  </div>
                  <div className="p-3 rounded-lg border">
                    <div className="font-medium text-foreground mb-1">
                      Objection
                    </div>
                    <p className="text-xs">
                      Object to certain processing activities
                    </p>
                  </div>
                </div>

                <Separator />

                <div>
                  <div className="font-medium text-foreground mb-2">
                    To exercise your rights:
                  </div>
                  <p>
                    Contact us at href="mailto:privacy@synthqa.app"
                    className="text-primary hover:underline"
                  </p>
                  privacy@synthqa.app or use the account settings in your
                  dashboard. We will respond within 30 days.
                </div>

                <Alert>
                  <FileText className="h-4 w-4" />
                  <AlertTitle>GDPR & CCPA Compliance</AlertTitle>
                  <AlertDescription>
                    We comply with GDPR (EU) and CCPA (California) privacy
                    regulations. Users in these jurisdictions have additional
                    rights as outlined in their respective laws.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </Section>

          {/* Children's Privacy */}
          <Section id="children" title="Children's Privacy" kicker="Protection">
            <Card>
              <CardHeader>
                <CardTitle>Age Restrictions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <p>
                  SynthQA is not intended for children under 13 years of age (or
                  16 in the EU). We do not knowingly collect personal
                  information from children.
                </p>
                <p>
                  If we learn that we have collected information from a child
                  without proper consent, we will delete it immediately. If you
                  believe we have information about a child, please contact us.
                </p>
              </CardContent>
            </Card>
          </Section>

          {/* International */}
          <Section
            id="international"
            title="International Data Transfers"
            kicker="Global"
          >
            <Card>
              <CardHeader>
                <CardTitle>Cross-Border Data Transfers</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <p>
                  SynthQA is based in the United States. If you access our
                  services from outside the US, your information may be
                  transferred to, stored, and processed in the US or other
                  countries.
                </p>
                <p>
                  We ensure appropriate safeguards are in place for
                  international data transfers, including:
                </p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>
                    Standard contractual clauses approved by the EU Commission
                  </li>
                  <li>Compliance with applicable data protection laws</li>
                  <li>Security measures equivalent to those in your country</li>
                </ul>
              </CardContent>
            </Card>
          </Section>

          {/* Changes */}
          <Section id="changes" title="Changes to This Policy" kicker="Updates">
            <Card>
              <CardHeader>
                <CardTitle>Policy Updates</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <p>
                  We may update this Privacy Policy from time to time. Changes
                  will be posted on this page with an updated "Last Updated"
                  date.
                </p>
                <p>
                  For material changes, we will provide prominent notice or send
                  an email notification. Continued use of SynthQA after changes
                  constitutes acceptance of the updated policy.
                </p>
                <Alert>
                  <FileText className="h-4 w-4" />
                  <AlertTitle>Stay Informed</AlertTitle>
                  <AlertDescription>
                    We recommend reviewing this policy periodically. You can
                    subscribe to policy updates in your account settings.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </Section>

          {/* Contact */}
          <Section id="contact" title="Contact Us" kicker="Questions">
            <Card>
              <CardHeader>
                <CardTitle>Get in Touch</CardTitle>
                <CardDescription>
                  Questions about this Privacy Policy or your data?
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-muted-foreground">
                <div>
                  <div className="font-medium text-foreground mb-2">
                    Contact Information:
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground mt-2">
                      Contact our legal team at{" "}
                      <a
                        href="mailto:support@synthqa.app"
                        className="text-primary hover:underline"
                      >
                        support@synthqa.app
                      </a>
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Section>
        </main>
      </div>
      <SiteFooter />
    </div>
  );
}
