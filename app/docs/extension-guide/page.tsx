// app/(dashboard)/guides/browser-extension/page.tsx
"use client";

import * as React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import {
  CheckCircle2,
  Info,
  AlertTriangle,
  ExternalLink,
  Copy,
  BookOpen,
  Puzzle,
  Shield,
  Play,
  Code2,
  Wrench,
  HelpCircle,
} from "lucide-react";
import { Logo } from "@/components/pagecomponents/brandlogo";
import { Footer } from "@/components/landingpage/footer";

type TocItem = { id: string; title: string; icon?: React.ReactNode };

function CodeBlock({ code, label }: { code: string; label?: string }) {
  const [copied, setCopied] = React.useState(false);

  async function onCopy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      // ignore clipboard errors (some browsers / permissions)
    }
  }

  return (
    <div className="rounded-xl border bg-muted/40">
      <div className="flex items-center justify-between px-3 py-2 border-b">
        <div className="text-xs text-muted-foreground">{label ?? "Code"}</div>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 gap-2"
          onClick={onCopy}
        >
          <Copy className="h-4 w-4" />
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
      <pre className="overflow-x-auto p-3 text-sm leading-relaxed">
        <code>{code}</code>
      </pre>
    </div>
  );
}

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

export default function BrowserExtensionGuidePage() {
  const toc: TocItem[] = [
    {
      id: "overview",
      title: "Overview",
      icon: <BookOpen className="h-4 w-4" />,
    },
    {
      id: "installation",
      title: "Installation",
      icon: <Puzzle className="h-4 w-4" />,
    },
    {
      id: "recording",
      title: "Record Your First Test",
      icon: <Play className="h-4 w-4" />,
    },
    {
      id: "manage",
      title: "View & Manage Recordings",
      icon: <Wrench className="h-4 w-4" />,
    },
    {
      id: "running",
      title: "Run Tests & Export",
      icon: <Code2 className="h-4 w-4" />,
    },
    {
      id: "advanced",
      title: "Advanced Features",
      icon: <Info className="h-4 w-4" />,
    },
    {
      id: "best-practices",
      title: "Best Practices",
      icon: <CheckCircle2 className="h-4 w-4" />,
    },
    {
      id: "security",
      title: "Security & Privacy",
      icon: <Shield className="h-4 w-4" />,
    },
    {
      id: "updates",
      title: "Updating & Uninstalling",
      icon: <Wrench className="h-4 w-4" />,
    },
    { id: "faq", title: "FAQ", icon: <HelpCircle className="h-4 w-4" /> },
    {
      id: "support",
      title: "Support",
      icon: <ExternalLink className="h-4 w-4" />,
    },
  ];

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10">
      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="space-y-2">
          <Logo size="xl" />
          <h1 className="text-3xl font-semibold tracking-tight">
            Browser Extension Guide
          </h1>
          <p className="max-w-2xl text-muted-foreground">
            Install the QA Test Recorder extension, record browser tests without
            code, run them live, or export to Playwright for CI.
          </p>
          <Badge variant="secondary">Guide</Badge>
        </div>

        <div className="flex gap-2">
          <Button asChild variant="secondary">
            <Link href="/browserextensions">Go to Install</Link>
          </Button>
          <Button asChild>
            <Link href="#recording">Start Recording</Link>
          </Button>
        </div>
      </div>

      <Separator className="my-8" />

      <div className="grid gap-8 lg:grid-cols-[260px_1fr]">
        {/* Sticky TOC */}
        <aside className="hidden lg:block">
          <div className="sticky top-20 rounded-2xl border bg-card p-4">
            <div className="mb-3 text-sm font-medium">On this page</div>
            <nav className="space-y-1">
              {toc.map((item) => (
                <a
                  key={item.id}
                  href={`#${item.id}`}
                  className={cn(
                    "flex items-center gap-2 rounded-lg px-2 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  {item.icon}
                  <span>{item.title}</span>
                </a>
              ))}
            </nav>
          </div>
        </aside>

        {/* Content */}
        <main className="space-y-10">
          <Section id="overview" title="Overview" kicker="Getting started">
            <Card>
              <CardHeader>
                <CardTitle>What the extension does</CardTitle>
                <CardDescription>
                  Record clicks, typing, and navigation in your browser and save
                  as a replayable recording tied to a test case.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <ul className="list-disc pl-5 space-y-1">
                  <li>Record browser interactions without writing code</li>
                  <li>Replay tests live in the browser</li>
                  <li>Export recordings to Playwright test code</li>
                  <li>Manage recordings per test case in SynthQA</li>
                </ul>
              </CardContent>
            </Card>

            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>Tip</AlertTitle>
              <AlertDescription>
                If you want the best selector stability, add{" "}
                <span className="font-medium">data-testid</span> attributes to
                key UI elements in your app under test.
              </AlertDescription>
            </Alert>
          </Section>

          <Section
            id="installation"
            title="Installation"
            kicker="Chrome / Edge"
          >
            <Card>
              <CardHeader>
                <CardTitle>Prerequisites</CardTitle>
                <CardDescription>
                  Confirm these before installing.
                </CardDescription>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                <ul className="list-disc pl-5 space-y-1">
                  <li>Google Chrome 88+ or Microsoft Edge 88+</li>
                  <li>Active SynthQA account</li>
                  <li>Developer Mode enabled in Chrome/Edge</li>
                </ul>
              </CardContent>
            </Card>

            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="download">
                <AccordionTrigger>1) Download the extension</AccordionTrigger>
                <AccordionContent className="space-y-2 text-sm text-muted-foreground">
                  <ol className="list-decimal pl-5 space-y-1">
                    <li>
                      Navigate to the Extension page in your SynthQA dashboard
                    </li>
                    <li>
                      Click{" "}
                      <span className="font-medium">Download for Chrome</span>
                    </li>
                    <li>Save the ZIP file to your Downloads folder</li>
                  </ol>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="extract">
                <AccordionTrigger>2) Extract the ZIP file</AccordionTrigger>
                <AccordionContent className="space-y-3 text-sm text-muted-foreground">
                  <Tabs defaultValue="windows" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="windows">Windows</TabsTrigger>
                      <TabsTrigger value="mac">Mac</TabsTrigger>
                    </TabsList>
                    <TabsContent value="windows" className="mt-3">
                      <ol className="list-decimal pl-5 space-y-1">
                        <li>Right-click the downloaded ZIP file</li>
                        <li>
                          Select{" "}
                          <span className="font-medium">Extract All…</span>
                        </li>
                        <li>Choose a destination folder</li>
                        <li>
                          Click <span className="font-medium">Extract</span>
                        </li>
                      </ol>
                    </TabsContent>
                    <TabsContent value="mac" className="mt-3">
                      <ol className="list-decimal pl-5 space-y-1">
                        <li>Double-click the ZIP file</li>
                        <li>Files extract automatically into a new folder</li>
                      </ol>
                    </TabsContent>
                  </Tabs>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="install">
                <AccordionTrigger>
                  3) Install in Chrome / Edge (Load unpacked)
                </AccordionTrigger>
                <AccordionContent className="space-y-3 text-sm text-muted-foreground">
                  <ol className="list-decimal pl-5 space-y-1">
                    <li>
                      Open{" "}
                      <span className="font-medium">chrome://extensions/</span>{" "}
                      (or Edge extensions page)
                    </li>
                    <li>
                      Enable <span className="font-medium">Developer mode</span>{" "}
                      (top-right)
                    </li>
                    <li>
                      Click <span className="font-medium">Load unpacked</span>
                    </li>
                    <li>
                      Select the extracted folder containing{" "}
                      <span className="font-medium">manifest.json</span>
                    </li>
                  </ol>

                  <Alert>
                    <CheckCircle2 className="h-4 w-4" />
                    <AlertTitle>Expected result</AlertTitle>
                    <AlertDescription>
                      The extension card appears with name{" "}
                      <span className="font-medium">
                        QA Test Recorder v1.0.0
                      </span>{" "}
                      and status enabled.
                    </AlertDescription>
                  </Alert>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="permissions">
                <AccordionTrigger>
                  4) Configure permissions (Site access)
                </AccordionTrigger>
                <AccordionContent className="space-y-2 text-sm text-muted-foreground">
                  <ol className="list-decimal pl-5 space-y-1">
                    <li>
                      Click <span className="font-medium">Details</span> on the
                      extension card
                    </li>
                    <li>
                      Scroll to <span className="font-medium">Site access</span>
                    </li>
                    <li>
                      Select <span className="font-medium">On all sites</span>
                    </li>
                  </ol>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="pin">
                <AccordionTrigger>
                  5) Pin the extension (recommended)
                </AccordionTrigger>
                <AccordionContent className="space-y-2 text-sm text-muted-foreground">
                  <ol className="list-decimal pl-5 space-y-1">
                    <li>Click the puzzle icon (🧩) in the toolbar</li>
                    <li>
                      Find <span className="font-medium">QA Test Recorder</span>
                    </li>
                    <li>Click the pin icon</li>
                  </ol>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="verify">
                <AccordionTrigger>Verify installation</AccordionTrigger>
                <AccordionContent className="space-y-3 text-sm text-muted-foreground">
                  <ol className="list-decimal pl-5 space-y-1">
                    <li>Refresh your SynthQA dashboard</li>
                    <li>
                      Confirm the status indicates the extension is installed
                    </li>
                    <li>
                      Open DevTools (F12) and confirm the console shows
                      readiness
                    </li>
                  </ol>

                  <div className="space-y-2">
                    <CodeBlock
                      label="Expected console log"
                      code={`✅ QA Test Recorder ready`}
                    />
                    <CodeBlock
                      label="Verify flag"
                      code={`window.__QA_EXTENSION_INSTALLED`}
                    />
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </Section>

          <Section
            id="recording"
            title="Record Your First Test"
            kicker="No-code recording"
          >
            <Card>
              <CardHeader>
                <CardTitle>Recording workflow</CardTitle>
                <CardDescription>
                  Recording captures your interactions and stores them as a
                  recording tied to the selected test case.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-muted-foreground">
                <ol className="list-decimal pl-5 space-y-2">
                  <li>
                    Go to <span className="font-medium">Test Cases</span> and
                    open a test case
                  </li>
                  <li>
                    Open the{" "}
                    <span className="font-medium">Browser Extension</span> tab
                  </li>
                  <li>
                    Choose <span className="font-medium">Record New Test</span>
                  </li>
                  <li>
                    Enter a starting URL, then click{" "}
                    <span className="font-medium">
                      Open URL & Start Recording
                    </span>
                  </li>
                </ol>

                <CodeBlock
                  label="Example starting URL"
                  code={`https://app.example.com/login`}
                />

                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertTitle>What gets captured</AlertTitle>
                  <AlertDescription>
                    Clicks, text input, navigation, and related metadata.
                    Screenshot capture is planned for a future release.
                  </AlertDescription>
                </Alert>

                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Recording best practices</AlertTitle>
                  <AlertDescription>
                    Perform actions slowly, wait for page loads, keep flows
                    focused (5–15 steps), and avoid switching tabs during
                    recording.
                  </AlertDescription>
                </Alert>

                <div className="text-sm">
                  <div className="font-medium text-foreground mb-1">
                    Stopping a recording
                  </div>
                  <ol className="list-decimal pl-5 space-y-1">
                    <li>Return to the SynthQA dashboard tab</li>
                    <li>
                      Click <span className="font-medium">Stop Recording</span>
                    </li>
                    <li>
                      Confirm the success message indicates the number of
                      actions captured
                    </li>
                  </ol>
                </div>
              </CardContent>
            </Card>
          </Section>

          <Section
            id="manage"
            title="View & Manage Recordings"
            kicker="Recordings"
          >
            <Card>
              <CardHeader>
                <CardTitle>Manage recordings for a test case</CardTitle>
                <CardDescription>
                  View details, validate steps, or delete recordings you no
                  longer need.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <ol className="list-decimal pl-5 space-y-1">
                  <li>Open test case details</li>
                  <li>
                    Go to{" "}
                    <span className="font-medium">
                      Browser Extension → View Recordings
                    </span>
                  </li>
                  <li>Select a recording to view the step-by-step breakdown</li>
                </ol>

                <div>
                  <div className="font-medium text-foreground mb-1">
                    What you’ll see
                  </div>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Action count and duration</li>
                    <li>Timestamp and starting URL</li>
                    <li>Action breakdown (clicks, typing, navigation)</li>
                    <li>Viewport and browser metadata</li>
                  </ul>
                </div>

                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Deleting is permanent</AlertTitle>
                  <AlertDescription>
                    Deleting a recording removes it permanently. Use this after
                    major UI changes or when a flow becomes obsolete.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </Section>

          <Section id="running" title="Run Tests & Export" kicker="Execution">
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="run">
                <AccordionTrigger>Run a test in the browser</AccordionTrigger>
                <AccordionContent className="space-y-2 text-sm text-muted-foreground">
                  <ol className="list-decimal pl-5 space-y-1">
                    <li>Select a recording</li>
                    <li>
                      Click{" "}
                      <span className="font-medium">Run This Recording</span>
                    </li>
                    <li>
                      Click <span className="font-medium">Run Test</span>
                    </li>
                  </ol>
                  <div className="mt-2">
                    <div className="font-medium text-foreground mb-1">
                      What you’ll see
                    </div>
                    <ul className="list-disc pl-5 space-y-1">
                      <li>Live execution progress</li>
                      <li>Step-by-step logs and pass/fail states</li>
                      <li>Error message on failure</li>
                    </ul>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="export">
                <AccordionTrigger>Export to Playwright</AccordionTrigger>
                <AccordionContent className="space-y-3 text-sm text-muted-foreground">
                  <ol className="list-decimal pl-5 space-y-1">
                    <li>Select a recording</li>
                    <li>
                      Click{" "}
                      <span className="font-medium">Export to Playwright</span>
                    </li>
                    <li>
                      Download <span className="font-medium">test.spec.ts</span>
                    </li>
                  </ol>

                  <CodeBlock
                    label="Generated code example"
                    code={`import { test, expect } from '@playwright/test'

test('Recorded test', async ({ page }) => {
  await page.goto('https://app.example.com/login')
  await page.click('#login-btn')
  await page.fill('[name="email"]', 'user@example.com')
  await page.click('.submit-btn')
  await expect(page).toHaveURL(/.+/)
})`}
                  />

                  <div>
                    <div className="font-medium text-foreground mb-1">
                      Common use cases
                    </div>
                    <ul className="list-disc pl-5 space-y-1">
                      <li>CI/CD execution</li>
                      <li>Adding assertions and custom logic</li>
                      <li>Version control and review</li>
                      <li>Integration into existing suites</li>
                    </ul>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </Section>

          <Section
            id="advanced"
            title="Advanced Features"
            kicker="Under the hood"
          >
            <Card>
              <CardHeader>
                <CardTitle>Smart selectors</CardTitle>
                <CardDescription>
                  Multiple fallback strategies reduce brittleness when UIs
                  change.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <div className="font-medium text-foreground">
                  Selector priority
                </div>
                <ol className="list-decimal pl-5 space-y-1">
                  <li>
                    <span className="font-medium">data-testid</span> (most
                    reliable)
                  </li>
                  <li>
                    Element <span className="font-medium">id</span>
                  </li>
                  <li>
                    <span className="font-medium">name</span> attribute
                  </li>
                  <li>Unique CSS selector</li>
                  <li>XPath</li>
                </ol>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Cross-tab recording</CardTitle>
                <CardDescription>
                  Recording state syncs across tabs so you can launch a new tab
                  and keep recording.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <ul className="list-disc pl-5 space-y-1">
                  <li>
                    Recording state stored via{" "}
                    <span className="font-medium">chrome.storage.local</span>
                  </li>
                  <li>Action counter syncs regularly</li>
                  <li>Works across windows and survives refreshes</li>
                </ul>
              </CardContent>
            </Card>

            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>Coming soon</AlertTitle>
              <AlertDescription>
                Screenshot capture, element highlighting, assertions, and
                additional execution telemetry are planned for the next
                versions.
              </AlertDescription>
            </Alert>
          </Section>

          <Section id="best-practices" title="Best Practices" kicker="Quality">
            <Card>
              <CardHeader>
                <CardTitle>Creating reliable tests</CardTitle>
                <CardDescription>
                  Keep recordings stable, short, and deterministic.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-6 md:grid-cols-2 text-sm text-muted-foreground">
                <div>
                  <div className="font-medium text-foreground mb-2">Do</div>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Start from a clean state</li>
                    <li>Use stable test data</li>
                    <li>Record complete user flows</li>
                    <li>Keep tests focused (one feature per recording)</li>
                    <li>Prefer pages with stable content</li>
                  </ul>
                </div>
                <div>
                  <div className="font-medium text-foreground mb-2">Avoid</div>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Time-sensitive pages</li>
                    <li>Personal or sensitive data</li>
                    <li>Overly long flows (&gt; 30 steps)</li>
                    <li>Rapid clicking or typing</li>
                    <li>Switching tabs mid-recording</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Performance tips</CardTitle>
                <CardDescription>
                  Reduce noise and improve recording fidelity.
                </CardDescription>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                <ul className="list-disc pl-5 space-y-1">
                  <li>Close unnecessary tabs and apps</li>
                  <li>Disable other extensions during recording</li>
                  <li>Use incognito for isolated testing (if enabled)</li>
                  <li>Clear cache before critical recordings</li>
                </ul>
              </CardContent>
            </Card>
          </Section>

          <Section id="security" title="Security & Privacy" kicker="Trust">
            <Card>
              <CardHeader>
                <CardTitle>What gets recorded (and what does not)</CardTitle>
                <CardDescription>
                  Designed to avoid capturing secrets.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-6 md:grid-cols-2 text-sm text-muted-foreground">
                <div>
                  <div className="font-medium text-foreground mb-2">
                    Captured
                  </div>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Selectors (CSS/XPath)</li>
                    <li>Click actions and targets</li>
                    <li>Text typed into forms</li>
                    <li>URLs visited</li>
                    <li>Viewport dimensions</li>
                  </ul>
                </div>
                <div>
                  <div className="font-medium text-foreground mb-2">
                    Not captured
                  </div>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Passwords (masked)</li>
                    <li>Credit card numbers</li>
                    <li>Session tokens</li>
                    <li>Cookies</li>
                    <li>Local storage data</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Permissions</CardTitle>
                <CardDescription>
                  Required for recording and playback.
                </CardDescription>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                <ul className="list-disc pl-5 space-y-1">
                  <li>Active Tab</li>
                  <li>Storage</li>
                  <li>Scripting</li>
                  <li>Host permissions (all sites)</li>
                </ul>
                <div className="mt-3 rounded-lg border bg-muted/40 p-3 text-xs">
                  We do not collect browsing history, track behavior outside
                  recording, or sell/share user data.
                </div>
              </CardContent>
            </Card>
          </Section>

          <Section
            id="updates"
            title="Updating & Uninstalling"
            kicker="Maintenance"
          >
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="updates">
                <AccordionTrigger>Updating the extension</AccordionTrigger>
                <AccordionContent className="space-y-2 text-sm text-muted-foreground">
                  <ol className="list-decimal pl-5 space-y-1">
                    <li>Download the latest ZIP from the dashboard</li>
                    <li>Extract the ZIP</li>
                    <li>
                      Go to{" "}
                      <span className="font-medium">chrome://extensions/</span>
                    </li>
                    <li>Remove the old version</li>
                    <li>Load unpacked for the new version</li>
                  </ol>
                  <div className="mt-2 text-xs">
                    <span className="font-medium text-foreground">
                      Current:
                    </span>{" "}
                    v1.0.0 — Initial release (record, run, export)
                    <br />
                    <span className="font-medium text-foreground">
                      Planned:
                    </span>{" "}
                    v1.1.0 — screenshots, highlighting, assertions, metrics
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="uninstall">
                <AccordionTrigger>Uninstalling or disabling</AccordionTrigger>
                <AccordionContent className="space-y-2 text-sm text-muted-foreground">
                  <div className="font-medium text-foreground">Remove</div>
                  <ol className="list-decimal pl-5 space-y-1">
                    <li>
                      Go to{" "}
                      <span className="font-medium">chrome://extensions/</span>
                    </li>
                    <li>
                      Find <span className="font-medium">QA Test Recorder</span>
                    </li>
                    <li>
                      Click <span className="font-medium">Remove</span> and
                      confirm
                    </li>
                  </ol>

                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertTitle>Note</AlertTitle>
                    <AlertDescription>
                      Removing the extension does not delete your recordings
                      from SynthQA.
                    </AlertDescription>
                  </Alert>

                  <div className="font-medium text-foreground mt-3">
                    Disable
                  </div>
                  <ol className="list-decimal pl-5 space-y-1">
                    <li>
                      Go to{" "}
                      <span className="font-medium">chrome://extensions/</span>
                    </li>
                    <li>
                      Toggle the extension{" "}
                      <span className="font-medium">Off</span>
                    </li>
                  </ol>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </Section>

          <Section id="faq" title="Frequently Asked Questions" kicker="FAQ">
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="edit">
                <AccordionTrigger>
                  Can I edit recordings after they’re saved?
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">
                  Not currently. Editing support is planned.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="limit">
                <AccordionTrigger>
                  How many recordings can I save?
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">
                  Unlimited recordings per test case.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="team">
                <AccordionTrigger>
                  Can I share recordings with my team?
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">
                  Yes. Team members can access recordings for shared test cases.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="incognito">
                <AccordionTrigger>
                  Does it work in incognito mode?
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">
                  Yes, if you enable “Allow in Incognito” in extension settings.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="iframes">
                <AccordionTrigger>Can I record iframes?</AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">
                  Some iframe content may not be captured due to browser
                  security restrictions.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="fail">
                <AccordionTrigger>What if my test fails?</AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">
                  Check the execution log for the failing step. Common issues
                  include selector changes and timing.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="batch">
                <AccordionTrigger>
                  Can I run multiple tests at once?
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">
                  Not currently. Batch execution is planned.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </Section>

          <Section id="support" title="Support" kicker="Help">
            <Card>
              <CardHeader>
                <CardTitle>Getting help</CardTitle>
                <CardDescription>
                  Contact support or report an issue with the details we need to
                  debug quickly.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <ul className="list-disc pl-5 space-y-1">
                  <li>
                    Email:{" "}
                    <span className="font-medium">support@synthqa.app</span>
                  </li>
                  <li>
                    Feature requests: use the feedback button in the dashboard
                  </li>
                </ul>

                <Separator />

                <div>
                  <div className="font-medium text-foreground mb-1">
                    When reporting bugs, include
                  </div>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Browser and version</li>
                    <li>Extension version</li>
                    <li>Steps to reproduce</li>
                    <li>Console errors (F12)</li>
                    <li>Screenshots (if applicable)</li>
                  </ul>
                </div>

                <div className="text-xs text-muted-foreground">
                  Last updated: December 2025 · Extension version: 1.0.0
                </div>
              </CardContent>
            </Card>
          </Section>
        </main>
      </div>
      <Footer />
    </div>
  );
}
