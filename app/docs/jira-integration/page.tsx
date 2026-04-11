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

function StepBadge({ n }: { n: number }) {
  return (
    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground shrink-0">
      {n}
    </span>
  );
}

export default function JiraIntegrationDocsPage() {
  const toc: TocItem[] = [
    { id: "overview", title: "Overview" },
    { id: "prerequisites", title: "Prerequisites" },
    { id: "create-api-token", title: "Create a Jira API token" },
    { id: "connect-in-synthqa", title: "Connect in SynthQA" },
    { id: "webhook-setup", title: "Set up the webhook" },
    { id: "test-connection", title: "Test the connection" },
    { id: "issue-creation", title: "Creating issues from failures" },
    { id: "fix-verification", title: "Fix verification (re-run)" },
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
            Connect Jira to create issues from test failures, sync status
            changes, and automatically queue fix verification re-runs.
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
        <main className="space-y-10">
          {/* Quick start */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Start</CardTitle>
              <CardDescription>
                Five steps to get the full integration working end to end.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ol className="space-y-2 text-sm text-muted-foreground">
                {[
                  "Create an Atlassian API token.",
                  "Connect credentials in SynthQA → Integrations → Jira.",
                  "Register the SynthQA webhook URL in Jira admin settings.",
                  "Run a test suite and create Jira issues from the run review page.",
                  "When a Jira issue is resolved, SynthQA queues the linked test for re-run automatically.",
                ].map((step, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <StepBadge n={i + 1} />
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>

          <Section
            id="overview"
            title="Overview"
            kicker="What this integration does"
          >
            <p className="text-sm text-muted-foreground">
              The Jira integration connects your SynthQA workspace to a Jira
              Cloud site and enables a closed-loop QA workflow:
            </p>
            <ul className="space-y-2 text-sm text-muted-foreground list-none">
              {[
                "Create Jira issues directly from failed test executions on the run review page.",
                "Receive real-time status updates via webhook when a Jira issue is resolved or closed.",
                "Automatically flag the linked test case for fix verification.",
                "Surface flagged cases in the Fix Verification panel on your project dashboard.",
                "Launch a targeted re-run session with one click and confirm the fix is working.",
              ].map((point, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                  {point}
                </li>
              ))}
            </ul>
          </Section>

          <Section id="prerequisites" title="Prerequisites">
            <ul className="space-y-1 text-sm text-muted-foreground list-disc pl-5">
              <li>
                Jira Cloud site URL — e.g.{" "}
                <code className="text-xs bg-muted px-1 py-0.5 rounded">
                  https://your-domain.atlassian.net
                </code>
              </li>
              <li>Your Jira account email address</li>
              <li>An Atlassian API token (see next section)</li>
              <li>
                Jira project key — e.g.{" "}
                <code className="text-xs bg-muted px-1 py-0.5 rounded">
                  KAN
                </code>
              </li>
              <li>Admin access to Jira to register a webhook</li>
            </ul>
          </Section>

          <Section id="create-api-token" title="Create a Jira API token">
            <p className="text-sm text-muted-foreground">
              API tokens are used instead of your password. Create one in your
              Atlassian account settings:
            </p>
            <ol className="space-y-2 text-sm text-muted-foreground list-none">
              {[
                <>
                  Go to{" "}
                  <strong>id.atlassian.com → Security → API tokens</strong>.
                </>,
                <>
                  Click <strong>Create API token</strong>, give it a label like
                  "SynthQA".
                </>,
                "Copy the token immediately — it will not be shown again.",
                "Paste it into SynthQA when connecting the integration.",
              ].map((step, i) => (
                <li key={i} className="flex items-start gap-2">
                  <StepBadge n={i + 1} />
                  <span>{step}</span>
                </li>
              ))}
            </ol>
            <p className="text-xs text-muted-foreground">
              Note: This guide assumes Jira Cloud. Jira Server / Data Center
              uses different authentication.
            </p>
          </Section>

          <Section id="connect-in-synthqa" title="Connect in SynthQA">
            <ol className="space-y-2 text-sm text-muted-foreground list-none">
              {[
                <>
                  Navigate to your project →{" "}
                  <strong>Settings → Integrations → Jira</strong>.
                </>,
                "Enter your Jira site URL, account email, API token, and project key.",
                "Enable Auto Sync if you want SynthQA to poll Jira for status changes hourly as a fallback.",
                <>
                  Click <strong>Save</strong>. SynthQA will validate the
                  credentials immediately.
                </>,
              ].map((step, i) => (
                <li key={i} className="flex items-start gap-2">
                  <StepBadge n={i + 1} />
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </Section>

          <Section
            id="webhook-setup"
            title="Set up the webhook"
            kicker="Required for real-time sync"
          >
            <p className="text-sm text-muted-foreground">
              The webhook allows Jira to notify SynthQA instantly when an issue
              is resolved or closed, triggering the fix verification flow.
              Without it, SynthQA falls back to hourly polling.
            </p>

            <Card className="border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20">
              <CardContent className="pt-4 pb-4">
                <p className="text-sm font-medium text-amber-800 dark:text-amber-300 mb-1">
                  Your webhook URL
                </p>
                <p className="text-xs text-muted-foreground mb-2">
                  Found in SynthQA → Project Settings → Integrations → Jira →
                  Webhook URL. It looks like:
                </p>
                <code className="text-xs bg-muted px-2 py-1 rounded block break-all">
                  https://your-app.synthqa.app/api/integrations/jira/webhook?integration_id=YOUR_ID
                </code>
              </CardContent>
            </Card>

            <ol className="space-y-2 text-sm text-muted-foreground list-none">
              {[
                <>
                  In Jira, go to{" "}
                  <strong>Admin settings → System → WebHooks</strong>.
                </>,
                <>
                  Click <strong>Create a WebHook</strong>.
                </>,
                "Paste the SynthQA webhook URL into the URL field.",
                "Optionally paste your webhook secret from SynthQA into the Secret field.",
                <>
                  Under <strong>Issue related events</strong>, check{" "}
                  <strong>Issue: updated</strong>. The JQL filter can be left as{" "}
                  <code className="text-xs bg-muted px-1 py-0.5 rounded">
                    All issues
                  </code>
                  .
                </>,
                <>
                  Click <strong>Create</strong>. The webhook status should show{" "}
                  <strong>Enabled</strong>.
                </>,
              ].map((step, i) => (
                <li key={i} className="flex items-start gap-2">
                  <StepBadge n={i + 1} />
                  <span>{step}</span>
                </li>
              ))}
            </ol>

            <p className="text-xs text-muted-foreground">
              SynthQA listens for{" "}
              <code className="bg-muted px-1 py-0.5 rounded">
                jira:issue_updated
              </code>{" "}
              events. The webhook fires on every issue update — SynthQA ignores
              events for issues it is not tracking.
            </p>
          </Section>

          <Section id="test-connection" title="Test the connection">
            <p className="text-sm text-muted-foreground">
              After saving your credentials, use the <strong>Test</strong>{" "}
              button in the integration settings to verify SynthQA can reach
              your Jira site and authenticate correctly. A successful test
              confirms:
            </p>
            <ul className="space-y-1 text-sm text-muted-foreground list-disc pl-5">
              <li>The site URL is reachable</li>
              <li>The email and API token are valid</li>
              <li>The project key exists and is accessible</li>
            </ul>
          </Section>

          <Section
            id="issue-creation"
            title="Creating issues from failures"
            kicker="Step 1 of the loop"
          >
            <p className="text-sm text-muted-foreground">
              After completing a test run, go to the <strong>Run Review</strong>{" "}
              page. For each failed test case:
            </p>
            <ol className="space-y-2 text-sm text-muted-foreground list-none">
              {[
                "Check the Issue checkbox next to the failed test case.",
                "Optionally add a review note describing what went wrong.",
                <>
                  Select your Jira integration from the integration dropdown,
                  then click <strong>Create Issues</strong>.
                </>,
                "SynthQA creates a Jira bug with the test title, failure reason, and any attached screenshots as evidence.",
                "The Jira issue key (e.g. KAN-3) appears on the card and links directly to the Jira issue.",
              ].map((step, i) => (
                <li key={i} className="flex items-start gap-2">
                  <StepBadge n={i + 1} />
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </Section>

          <Section
            id="fix-verification"
            title="Fix verification (re-run)"
            kicker="Step 2 of the loop — closing the cycle"
          >
            <p className="text-sm text-muted-foreground">
              When a developer marks the Jira issue as <strong>Done</strong> (or
              any resolved status), SynthQA detects the change via webhook and
              automatically queues the linked test case for re-verification.
            </p>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">How it works</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  {
                    step: "Jira issue closed",
                    detail:
                      "Developer marks the issue Done. Jira fires a webhook to SynthQA within seconds.",
                  },
                  {
                    step: "SynthQA flags the test case",
                    detail:
                      "The linked test case is marked needs_rerun and the linked execution is marked pending_rerun.",
                  },
                  {
                    step: "Fix Verification panel appears",
                    detail:
                      "On your project dashboard, the Fix Verification panel surfaces all flagged cases with their Jira issue keys.",
                  },
                  {
                    step: "Launch re-run session",
                    detail:
                      "Select the cases, pick a suite, and click Start re-run. A new test session is created pre-populated with the flagged cases only.",
                  },
                  {
                    step: "Execute and confirm",
                    detail:
                      "Run the cases. Passed → test case returns to active and disappears from the panel. Failed → stays flagged so the cycle continues.",
                  },
                ].map(({ step, detail }, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <StepBadge n={i + 1} />
                    <div>
                      <p className="text-sm font-medium">{step}</p>
                      <p className="text-xs text-muted-foreground">{detail}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20">
              <CardContent className="pt-4 pb-4 space-y-2">
                <p className="text-sm font-medium text-blue-800 dark:text-blue-300">
                  Jira statuses that trigger re-verification
                </p>
                <p className="text-xs text-muted-foreground">
                  SynthQA maps Jira statuses to internal states using the status
                  category and resolution field:
                </p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {[
                    {
                      jira: "Done (any resolution)",
                      internal: "resolved → queues re-run",
                    },
                    {
                      jira: "Done (Won't Fix / Duplicate)",
                      internal: "wont_fix → blocked",
                    },
                    {
                      jira: "In Progress / In Review",
                      internal: "in_progress → no action",
                    },
                    { jira: "To Do / Open", internal: "open → no action" },
                  ].map(({ jira, internal }) => (
                    <div
                      key={jira}
                      className="rounded border bg-background p-2"
                    >
                      <p className="font-medium text-foreground">{jira}</p>
                      <p className="text-muted-foreground">{internal}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="border-muted">
              <CardContent className="pt-4 pb-4 space-y-2">
                <p className="text-sm font-medium">
                  If the user doesn't execute the re-run
                </p>
                <p className="text-xs text-muted-foreground">
                  The test case stays flagged in the panel indefinitely — it
                  will not disappear until the case is actually executed and
                  passes. If a re-run session was created but never started, the
                  panel shows a <strong>Session pending</strong> badge on the
                  case. Clicking it navigates directly to that session so you
                  don't create a duplicate.
                </p>
              </CardContent>
            </Card>
          </Section>

          <Section id="sync-behavior" title="Sync behavior">
            <p className="text-sm text-muted-foreground">
              SynthQA uses two complementary mechanisms to stay in sync with
              Jira:
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-green-500" />
                    Webhook (real-time)
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-xs text-muted-foreground">
                  Jira pushes status changes to SynthQA within seconds of a
                  transition. Requires the webhook to be registered in Jira
                  admin settings. Recommended.
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-amber-500" />
                    Polling (fallback)
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-xs text-muted-foreground">
                  When Auto Sync is enabled, SynthQA polls Jira hourly for
                  status changes on all tracked issues. Acts as a safety net if
                  the webhook misses an event.
                </CardContent>
              </Card>
            </div>
          </Section>

          <Section id="troubleshooting" title="Troubleshooting">
            <div className="space-y-3">
              {[
                {
                  problem: "Host URL parse error",
                  fix: (
                    <>
                      Ensure your Jira URL starts with{" "}
                      <code className="text-xs bg-muted px-1 py-0.5 rounded">
                        https://
                      </code>{" "}
                      and has no trailing slash.
                    </>
                  ),
                },
                {
                  problem: "401 / 403 on connection test",
                  fix: "Confirm the email and API token are correct. Check that the token has not been revoked in Atlassian account settings.",
                },
                {
                  problem: "404 on connection test",
                  fix: "Validate the site URL and project key. The project key is case-sensitive.",
                },
                {
                  problem: "Webhook fires but test case is not flagged",
                  fix: "Check that the Jira issue was created via SynthQA's Create Issues button. Issues created manually in Jira are not tracked.",
                },
                {
                  problem:
                    "Fix Verification panel shows nothing after Jira issue is closed",
                  fix: "The most common causes are: the webhook URL has the wrong integration_id, or the integration_issues row has no execution_id linked.",
                },
                {
                  problem: "Session pending badge not showing",
                  fix: "Refresh the panel using the refresh button. The badge appears when a planned or in_progress re-run session already exists for that case.",
                },
              ].map(({ problem, fix }) => (
                <div key={problem} className="rounded-lg border p-3 space-y-1">
                  <p className="text-sm font-medium">{problem}</p>
                  <p className="text-xs text-muted-foreground">{fix}</p>
                </div>
              ))}
            </div>
          </Section>

          <Section id="security" title="Security notes">
            <ul className="space-y-2 text-sm text-muted-foreground list-disc pl-5">
              <li>
                Treat API tokens like passwords — rotate them if you suspect
                exposure.
              </li>
              <li>
                The webhook secret is used to verify that requests to your
                webhook URL are genuinely from Jira. Set it in both Jira and
                SynthQA integration settings.
              </li>
              <li>
                SynthQA stores your API token encrypted at rest and never
                exposes it after saving.
              </li>
              <li>
                The webhook endpoint requires a valid{" "}
                <code className="text-xs bg-muted px-1 py-0.5 rounded">
                  integration_id
                </code>{" "}
                query param — requests without it are rejected with 400.
              </li>
            </ul>
          </Section>

          <div className="text-xs text-muted-foreground">
            Last updated: March 2026 · Guide version: 1.1
          </div>
        </main>
      </div>

      <SiteFooter />
    </div>
  );
}
