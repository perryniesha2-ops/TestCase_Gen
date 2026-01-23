import Link from "next/link";
import React from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Logo } from "@/components/pagecomponents/brandlogo";
import { GuideMenu } from "@/components/pagecomponents/guide-menu";
import { SiteFooter } from "@/components/pagecomponents/site-footer";

type TocItem = {
  id: string;
  title: string;
};

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

export default function JiraIntegrationDocsPage() {
  const toc: TocItem[] = [
    { id: "overview", title: "Overview" },
    { id: "prerequisites", title: "Prerequisites" },
    { id: "create-api-token", title: "Create a Jira API token" },
    { id: "connect-in-synthqa", title: "Connect in SynthQA" },
    { id: "test-connection", title: "Test the connection" },
    { id: "sync-behavior", title: "Sync behavior" },
    { id: "troubleshooting", title: "Troubleshooting" },
    { id: "security", title: "Security notes" },
  ];

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="space-y-2">
          <Logo size="xl" />

          <h1 className="text-3xl font-semibold tracking-tight">
            Jira Integration
          </h1>
          <p className="text-sm text-muted-foreground">
            Connect Jira so you can validate connectivity, map projects, and
            enable future sync workflows.
          </p>

          <Badge variant="secondary">Guide</Badge>
          <Badge variant="outline">Integrations</Badge>
        </div>
        <GuideMenu />
      </div>
      <Separator className="my-8" />

      <div className="grid gap-8 lg:grid-cols-[260px_1fr]">
        {/* TOC */}
        <aside className="hidden lg:block">
          <div className="sticky top-20 rounded-lg border bg-card p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-medium">On this page</p>
              <Button asChild variant="ghost" size="sm" className="h-8 px-2">
                <Link href="/docs/guides">All docs</Link>
              </Button>
            </div>

            <nav className="space-y-1">
              {toc.map((item) => (
                <a
                  key={item.id}
                  href={`#${item.id}`}
                  className="block rounded-md px-2 py-1 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  {item.title}
                </a>
              ))}
            </nav>
          </div>
        </aside>

        {/* CONTENT */}
        <main className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Quick Start</CardTitle>
              <CardDescription>
                You’ll generate a Jira API token, then connect it in SynthQA.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <ol className="list-decimal pl-5 text-sm text-muted-foreground">
                <li>Confirm you have a Jira Cloud account and site URL.</li>
                <li>Create an API token in Atlassian.</li>
                <li>Paste credentials into SynthQA → Integrations → Jira.</li>
                <li>Run a test call to confirm connectivity.</li>
              </ol>
            </CardContent>
          </Card>

          <Section
            id="overview"
            title="Overview"
            kicker="What this integration does"
          >
            <p>
              The Jira integration is used to connect your SynthQA workspace to
              a Jira Cloud site so the app can validate access and prepare for
              issue creation / linking workflows.
            </p>
          </Section>

          <Section id="prerequisites" title="Prerequisites">
            <ul>
              <li>
                Jira Cloud site URL (example: https://your-domain.atlassian.net)
              </li>
              <li>Your Jira account email</li>
              <li>An Atlassian API token</li>
            </ul>
          </Section>

          <Section id="create-api-token" title="Create a Jira API token">
            <p>
              Create an API token in your Atlassian account settings, then copy
              it somewhere safe. You will paste it into SynthQA once.
            </p>
            <p>
              Note: Jira Server / Data Center uses different authentication than
              Jira Cloud. This page assumes Jira Cloud.
            </p>
          </Section>

          <Section id="connect-in-synthqa" title="Connect in SynthQA">
            <p>In the SynthQA app:</p>
            <ol>
              <li>
                Go to <strong>Integrations</strong> → <strong>Jira</strong>.
              </li>
              <li>Enter your Jira site URL, email, and API token.</li>
              <li>Save.</li>
            </ol>
          </Section>

          <Section id="test-connection" title="Test the connection">
            <p>
              Use the “Test” action to validate that SynthQA can reach your Jira
              site and authenticate correctly.
            </p>
          </Section>

          <Section id="sync-behavior" title="Sync behavior">
            <p>
              Current behavior is typically “connectivity + configuration”
              (depending on which features you’ve enabled). Issue creation and
              linking can be layered on once the connection is stable.
            </p>
          </Section>

          <Section id="troubleshooting" title="Troubleshooting">
            <ul>
              <li>
                <strong>Host URL parse error:</strong> Ensure your Jira URL
                starts with <code>https://</code>.
              </li>
              <li>
                <strong>401/403:</strong> Confirm the email/token pair is
                correct and the token has not been revoked.
              </li>
              <li>
                <strong>404:</strong> Validate the site URL (domain) is correct
                and reachable.
              </li>
            </ul>
          </Section>

          <Section id="security" title="Security notes">
            <p>
              Treat API tokens like passwords. Store them securely and rotate
              them if you suspect exposure.
            </p>
          </Section>

          <div className="text-xs text-muted-foreground">
            Last updated: {new Date().toISOString().slice(0, 10)}
          </div>
        </main>
        <div className="h-2" />
      </div>

      <SiteFooter />
    </div>
  );
}
