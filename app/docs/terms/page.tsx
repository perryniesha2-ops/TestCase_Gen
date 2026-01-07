// app/(dashboard)/terms/page.tsx
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
  FileText,
  Shield,
  CreditCard,
  Ban,
  Scale,
  AlertTriangle,
  Users,
  Lock,
  RefreshCw,
  Mail,
  Globe,
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

export default function TermsOfServicePage() {
  const toc: TocItem[] = [
    {
      id: "acceptance",
      title: "Acceptance of Terms",
      icon: <FileText className="h-4 w-4" />,
    },
    {
      id: "description",
      title: "Service Description",
      icon: <Globe className="h-4 w-4" />,
    },
    {
      id: "accounts",
      title: "User Accounts",
      icon: <Users className="h-4 w-4" />,
    },
    {
      id: "acceptable-use",
      title: "Acceptable Use",
      icon: <Shield className="h-4 w-4" />,
    },
    {
      id: "content",
      title: "Your Content",
      icon: <Lock className="h-4 w-4" />,
    },
    {
      id: "intellectual-property",
      title: "Intellectual Property",
      icon: <Scale className="h-4 w-4" />,
    },
    {
      id: "payment",
      title: "Payment Terms",
      icon: <CreditCard className="h-4 w-4" />,
    },
    {
      id: "termination",
      title: "Termination",
      icon: <Ban className="h-4 w-4" />,
    },
    {
      id: "warranties",
      title: "Warranties & Disclaimers",
      icon: <AlertTriangle className="h-4 w-4" />,
    },
    {
      id: "limitation",
      title: "Limitation of Liability",
      icon: <Scale className="h-4 w-4" />,
    },
    {
      id: "changes",
      title: "Changes to Terms",
      icon: <RefreshCw className="h-4 w-4" />,
    },
    {
      id: "contact",
      title: "Contact",
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
            Terms of Service
          </h1>
          <p className="max-w-2xl text-muted-foreground">
            Legal terms and conditions for using SynthQA services.
          </p>
          <div className="flex gap-2">
            <Badge variant="secondary">Legal</Badge>
            <Badge variant="outline">Last Updated: January 6, 2026</Badge>
          </div>
        </div>
      </div>

      <Separator className="my-8" />

      <main className="space-y-10">
        {/* Acceptance */}
        <Section id="acceptance" title="Acceptance of Terms" kicker="Agreement">
          <Card>
            <CardHeader>
              <CardTitle>Legal Agreement</CardTitle>
              <CardDescription>Effective Date: January 6, 2026</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>
                These Terms of Service ("Terms") constitute a legal agreement
                between you and SynthQA, Inc. ("SynthQA," "we," "our," or "us")
                governing your access to and use of the SynthQA platform,
                including our website, software, and services (collectively, the
                "Services").
              </p>
              <p>
                By creating an account, accessing, or using our Services, you
                agree to be bound by these Terms. If you do not agree to these
                Terms, you may not use our Services.
              </p>
              <Alert>
                <FileText className="h-4 w-4" />
                <AlertTitle>Important</AlertTitle>
                <AlertDescription>
                  Please read these Terms carefully before using SynthQA. They
                  contain important information about your rights and
                  obligations.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </Section>

        {/* Service Description */}
        <Section
          id="description"
          title="Service Description"
          kicker="What we provide"
        >
          <Card>
            <CardHeader>
              <CardTitle>The SynthQA Platform</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>
                SynthQA provides a cloud-based test case management platform
                that includes:
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li>AI-powered test case generation</li>
                <li>Requirements management</li>
                <li>Test suite organization and execution</li>
                <li>Test execution tracking and reporting</li>
                <li>Browser extension for evidence capture</li>
                <li>Project and template management</li>
              </ul>
              <p>
                We reserve the right to modify, suspend, or discontinue any
                feature or functionality with notice to users.
              </p>
            </CardContent>
          </Card>
        </Section>

        {/* User Accounts */}
        <Section id="accounts" title="User Accounts" kicker="Registration">
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="registration">
              <AccordionTrigger>Account Registration</AccordionTrigger>
              <AccordionContent className="space-y-3 text-sm text-muted-foreground">
                <p>To use SynthQA, you must create an account. You agree to:</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Provide accurate, current, and complete information</li>
                  <li>Maintain and update your information</li>
                  <li>Keep your password secure and confidential</li>
                  <li>Notify us immediately of any unauthorized access</li>
                  <li>Be responsible for all activity under your account</li>
                </ul>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="eligibility">
              <AccordionTrigger>Eligibility</AccordionTrigger>
              <AccordionContent className="space-y-3 text-sm text-muted-foreground">
                <p>You must meet the following requirements:</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>
                    Be at least 18 years old (or legal age in your jurisdiction)
                  </li>
                  <li>Have the legal capacity to enter into contracts</li>
                  <li>Not be prohibited from using the Services by law</li>
                  <li>Comply with all applicable laws and regulations</li>
                </ul>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="account-types">
              <AccordionTrigger>Account Types</AccordionTrigger>
              <AccordionContent className="space-y-3 text-sm text-muted-foreground">
                <div className="space-y-2">
                  <div className="p-3 rounded-lg border">
                    <div className="font-medium text-foreground mb-1">
                      Free Tier
                    </div>
                    <p className="text-xs">
                      Limited features and usage quotas for individual users
                    </p>
                  </div>
                  <div className="p-3 rounded-lg border">
                    <div className="font-medium text-foreground mb-1">
                      Pro Tier
                    </div>
                    <p className="text-xs">
                      Enhanced features and higher limits for professional use
                    </p>
                  </div>
                  <div className="p-3 rounded-lg border">
                    <div className="font-medium text-foreground mb-1">
                      Team/Enterprise
                    </div>
                    <p className="text-xs">
                      Full features, unlimited usage, and team collaboration
                    </p>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </Section>

        {/* Acceptable Use */}
        <Section
          id="acceptable-use"
          title="Acceptable Use Policy"
          kicker="Rules"
        >
          <Card>
            <CardHeader>
              <CardTitle>Prohibited Activities</CardTitle>
              <CardDescription>
                Activities that are not allowed when using SynthQA.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>You agree NOT to:</p>
              <div className="grid md:grid-cols-2 gap-3">
                <div className="p-3 rounded-lg border">
                  <div className="font-medium text-foreground mb-1 text-sm">
                    Illegal Activities
                  </div>
                  <ul className="list-disc pl-5 space-y-1 text-xs">
                    <li>Violate any laws or regulations</li>
                    <li>Infringe intellectual property rights</li>
                    <li>Engage in fraudulent activities</li>
                  </ul>
                </div>

                <div className="p-3 rounded-lg border">
                  <div className="font-medium text-foreground mb-1 text-sm">
                    Security Violations
                  </div>
                  <ul className="list-disc pl-5 space-y-1 text-xs">
                    <li>Attempt to breach security</li>
                    <li>Access accounts without authorization</li>
                    <li>Distribute malware or viruses</li>
                  </ul>
                </div>

                <div className="p-3 rounded-lg border">
                  <div className="font-medium text-foreground mb-1 text-sm">
                    Abuse & Harassment
                  </div>
                  <ul className="list-disc pl-5 space-y-1 text-xs">
                    <li>Harass, threaten, or harm others</li>
                    <li>Distribute harmful content</li>
                    <li>Impersonate others</li>
                  </ul>
                </div>

                <div className="p-3 rounded-lg border">
                  <div className="font-medium text-foreground mb-1 text-sm">
                    System Abuse
                  </div>
                  <ul className="list-disc pl-5 space-y-1 text-xs">
                    <li>Overload or disrupt our systems</li>
                    <li>Attempt to reverse engineer</li>
                    <li>Use automated scraping tools</li>
                  </ul>
                </div>
              </div>

              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Consequences</AlertTitle>
                <AlertDescription>
                  Violation of this policy may result in immediate suspension or
                  termination of your account, with or without notice.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </Section>

        {/* Your Content */}
        <Section id="content" title="Your Content" kicker="Ownership">
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="ownership">
              <AccordionTrigger>You Own Your Content</AccordionTrigger>
              <AccordionContent className="space-y-3 text-sm text-muted-foreground">
                <p>
                  You retain all ownership rights to the content you create,
                  upload, or store in SynthQA, including:
                </p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Test cases and test steps</li>
                  <li>Requirements and descriptions</li>
                  <li>Test suites and execution results</li>
                  <li>Projects, templates, and notes</li>
                  <li>Screenshots and attachments</li>
                </ul>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="license">
              <AccordionTrigger>License to SynthQA</AccordionTrigger>
              <AccordionContent className="space-y-3 text-sm text-muted-foreground">
                <p>
                  By using our Services, you grant SynthQA a limited,
                  non-exclusive, royalty-free license to:
                </p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Store and process your content</li>
                  <li>Display your content back to you</li>
                  <li>Make backups for disaster recovery</li>
                  <li>Use anonymized data to improve our AI models</li>
                </ul>
                <p className="text-xs mt-2">
                  This license terminates when you delete your content or close
                  your account.
                </p>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="responsibility">
              <AccordionTrigger>Content Responsibility</AccordionTrigger>
              <AccordionContent className="space-y-3 text-sm text-muted-foreground">
                <p>You are solely responsible for:</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>The accuracy and legality of your content</li>
                  <li>Backing up your own data</li>
                  <li>Ensuring you have rights to uploaded content</li>
                  <li>Compliance with data protection laws</li>
                </ul>
                <p>
                  We are not responsible for any loss, damage, or liability
                  arising from your content.
                </p>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="confidential">
              <AccordionTrigger>Confidential Information</AccordionTrigger>
              <AccordionContent className="space-y-3 text-sm text-muted-foreground">
                <p>
                  Do not upload highly sensitive or confidential information
                  unless:
                </p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>You have proper authorization</li>
                  <li>It complies with your organization's policies</li>
                  <li>You understand the security measures in place</li>
                </ul>
                <p>
                  While we use industry-standard security, no system is
                  perfectly secure. Use appropriate judgment.
                </p>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </Section>

        {/* Intellectual Property */}
        <Section
          id="intellectual-property"
          title="Intellectual Property Rights"
          kicker="Ownership"
        >
          <Card>
            <CardHeader>
              <CardTitle>SynthQA Intellectual Property</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>
                SynthQA and its original content, features, and functionality
                are owned by SynthQA, Inc. and are protected by international
                copyright, trademark, patent, trade secret, and other
                intellectual property laws.
              </p>
              <p>This includes but is not limited to:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Software code and architecture</li>
                <li>User interface and design</li>
                <li>AI models and algorithms</li>
                <li>Logos, trademarks, and branding</li>
                <li>Documentation and guides</li>
              </ul>
              <p>
                You may not copy, modify, distribute, sell, or lease any part of
                our Services without explicit written permission.
              </p>
            </CardContent>
          </Card>
        </Section>

        {/* Payment Terms */}
        <Section id="payment" title="Payment Terms" kicker="Billing">
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="pricing">
              <AccordionTrigger>Pricing & Plans</AccordionTrigger>
              <AccordionContent className="space-y-3 text-sm text-muted-foreground">
                <p>
                  Current pricing for paid plans is available on our website.
                  Prices are subject to change with 30 days notice to existing
                  subscribers.
                </p>
                <p>
                  All fees are exclusive of applicable taxes unless stated
                  otherwise.
                </p>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="billing">
              <AccordionTrigger>Billing & Payment</AccordionTrigger>
              <AccordionContent className="space-y-3 text-sm text-muted-foreground">
                <ul className="list-disc pl-5 space-y-1">
                  <li>
                    Subscriptions are billed monthly or annually in advance
                  </li>
                  <li>Payment is processed by Stripe on your behalf</li>
                  <li>You must provide valid payment information</li>
                  <li>Auto-renewal unless you cancel before renewal date</li>
                  <li>Failed payments may result in service suspension</li>
                </ul>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="refunds">
              <AccordionTrigger>Refunds & Cancellation</AccordionTrigger>
              <AccordionContent className="space-y-3 text-sm text-muted-foreground">
                <p>
                  <strong>Cancellation:</strong> You may cancel your
                  subscription at any time. Cancellation takes effect at the end
                  of your current billing period.
                </p>
                <p>
                  <strong>Refunds:</strong> We offer refunds on a case-by-case
                  basis within 14 days of purchase. No refunds for partial
                  months or unused features.
                </p>
                <p>
                  <strong>Downgrades:</strong> You may downgrade your plan at
                  any time, effective at the next billing cycle.
                </p>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="usage-limits">
              <AccordionTrigger>Usage Limits</AccordionTrigger>
              <AccordionContent className="space-y-3 text-sm text-muted-foreground">
                <p>Each plan includes specific usage limits for:</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Number of AI-generated test cases per month</li>
                  <li>Number of test executions</li>
                  <li>Storage capacity</li>
                  <li>Team member seats (Team/Enterprise plans)</li>
                </ul>
                <p>
                  Exceeding limits may result in overage charges or require plan
                  upgrade.
                </p>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </Section>

        {/* Termination */}
        <Section id="termination" title="Termination" kicker="Account closure">
          <Card>
            <CardHeader>
              <CardTitle>Account Termination</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-muted-foreground">
              <div>
                <div className="font-medium text-foreground mb-2">
                  Termination by You:
                </div>
                <p>
                  You may close your account at any time through account
                  settings or by contacting support. Your data will be deleted
                  within 30 days of account closure.
                </p>
              </div>

              <Separator />

              <div>
                <div className="font-medium text-foreground mb-2">
                  Termination by SynthQA:
                </div>
                <p>We may suspend or terminate your account if:</p>
                <ul className="list-disc pl-5 space-y-1 mt-2">
                  <li>You violate these Terms</li>
                  <li>You engage in fraudulent activity</li>
                  <li>Payment is repeatedly declined</li>
                  <li>We are required to do so by law</li>
                  <li>We discontinue the Services (with notice)</li>
                </ul>
              </div>

              <Separator />

              <div>
                <div className="font-medium text-foreground mb-2">
                  Effect of Termination:
                </div>
                <p>Upon termination:</p>
                <ul className="list-disc pl-5 space-y-1 mt-2">
                  <li>Your right to access the Services immediately ceases</li>
                  <li>Your data will be deleted per our retention policy</li>
                  <li>You remain liable for all charges incurred</li>
                  <li>Provisions that should survive will remain in effect</li>
                </ul>
              </div>

              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Export Your Data</AlertTitle>
                <AlertDescription>
                  Before closing your account, export any data you wish to
                  retain. We cannot recover data after account deletion.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </Section>

        {/* Warranties */}
        <Section
          id="warranties"
          title="Warranties & Disclaimers"
          kicker="Legal"
        >
          <Card>
            <CardHeader>
              <CardTitle>Service Warranties</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p className="uppercase font-bold">
                THE SERVICES ARE PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT
                WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED.
              </p>
              <p>
                TO THE FULLEST EXTENT PERMITTED BY LAW, SYNTHQA DISCLAIMS ALL
                WARRANTIES, INCLUDING BUT NOT LIMITED TO:
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li>MERCHANTABILITY</li>
                <li>FITNESS FOR A PARTICULAR PURPOSE</li>
                <li>NON-INFRINGEMENT</li>
                <li>ACCURACY, RELIABILITY, OR AVAILABILITY</li>
                <li>ERROR-FREE OR UNINTERRUPTED SERVICE</li>
              </ul>
              <p>
                We do not warrant that the Services will meet your requirements
                or that defects will be corrected.
              </p>

              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>No Guarantee</AlertTitle>
                <AlertDescription>
                  While we strive for high quality, AI-generated content may
                  contain errors. Always review generated test cases before use.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </Section>

        {/* Limitation of Liability */}
        <Section
          id="limitation"
          title="Limitation of Liability"
          kicker="Legal protection"
        >
          <Card>
            <CardHeader>
              <CardTitle>Liability Limits</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p className="uppercase font-bold">
                TO THE MAXIMUM EXTENT PERMITTED BY LAW, SYNTHQA SHALL NOT BE
                LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR
                PUNITIVE DAMAGES, INCLUDING BUT NOT LIMITED TO:
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li>LOSS OF PROFITS, DATA, OR USE</li>
                <li>BUSINESS INTERRUPTION</li>
                <li>COST OF SUBSTITUTE SERVICES</li>
                <li>LOSS OF GOODWILL OR REPUTATION</li>
              </ul>
              <p>
                OUR TOTAL LIABILITY SHALL NOT EXCEED THE AMOUNT YOU PAID TO
                SYNTHQA IN THE 12 MONTHS PRECEDING THE CLAIM, OR $100, WHICHEVER
                IS GREATER.
              </p>
              <p className="text-xs mt-4">
                Some jurisdictions do not allow limitation of liability, so
                these limitations may not apply to you.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Indemnification</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>
                You agree to indemnify and hold harmless SynthQA, its
                affiliates, and their respective officers, directors, employees,
                and agents from any claims, losses, damages, liabilities, and
                expenses arising from:
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Your use of the Services</li>
                <li>Your violation of these Terms</li>
                <li>Your violation of any rights of another</li>
                <li>Your content uploaded to the Services</li>
              </ul>
            </CardContent>
          </Card>
        </Section>

        {/* Additional Terms */}
        <Section id="changes" title="Changes to Terms" kicker="Updates">
          <Card>
            <CardHeader>
              <CardTitle>Modifications</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>
                We may revise these Terms at any time. Changes will be posted on
                this page with an updated "Last Updated" date.
              </p>
              <p>
                For material changes, we will provide at least 30 days notice
                via email or in-app notification before the changes take effect.
              </p>
              <p>
                Continued use of the Services after changes constitutes
                acceptance of the revised Terms. If you do not agree to the new
                Terms, you must stop using the Services.
              </p>
            </CardContent>
          </Card>

          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="governing-law">
              <AccordionTrigger>Governing Law</AccordionTrigger>
              <AccordionContent className="space-y-3 text-sm text-muted-foreground">
                <p>
                  These Terms are governed by the laws of the United States,
                  without regard to conflict of law principles. Any disputes
                  shall be resolved in the courts.
                </p>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="arbitration">
              <AccordionTrigger>Dispute Resolution</AccordionTrigger>
              <AccordionContent className="space-y-3 text-sm text-muted-foreground">
                <p>
                  Any disputes arising from these Terms or the Services shall
                  first be resolved through good-faith negotiation. If
                  unresolved within 30 days, disputes may proceed to binding
                  arbitration.
                </p>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="severability">
              <AccordionTrigger>Severability</AccordionTrigger>
              <AccordionContent className="space-y-3 text-sm text-muted-foreground">
                <p>
                  If any provision of these Terms is found to be unenforceable,
                  the remaining provisions will continue in full force and
                  effect.
                </p>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="entire-agreement">
              <AccordionTrigger>Entire Agreement</AccordionTrigger>
              <AccordionContent className="space-y-3 text-sm text-muted-foreground">
                <p>
                  These Terms, together with our Privacy Policy, constitute the
                  entire agreement between you and SynthQA regarding the
                  Services.
                </p>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </Section>

        {/* Contact */}
        <Section id="contact" title="Contact Us" kicker="Questions">
          <Card>
            <CardHeader>
              <CardTitle>Legal Inquiries</CardTitle>
              <CardDescription>
                Questions about these Terms of Service?
              </CardDescription>
              <p className="text-sm text-muted-foreground mt-2">
                Contact our legal team at{" "}
                <a
                  href="mailto:support@synthqa.app"
                  className="text-primary hover:underline"
                >
                  support@synthqa.app
                </a>
              </p>
            </CardHeader>
            <Separator />

            <div className="text-xs"></div>
          </Card>
        </Section>
      </main>
      <SiteFooter />
    </div>
  );
}
