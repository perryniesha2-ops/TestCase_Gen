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
  Camera,
  Wrench,
  HelpCircle,
  MonitorSmartphone,
  Play,
  Divide,
} from "lucide-react";
import { Logo } from "@/components/pagecomponents/brandlogo";
import { Footer } from "@/components/landingpage/footer";
import { GuideMenu } from "@/components/pagecomponents/guide-menu";
import { SiteFooter } from "@/components/pagecomponents/site-footer";

type TocItem = { id: string; title: string; icon?: React.ReactNode };

function CodeBlock({ code, label }: { code: string; label?: string }) {
  const [copied, setCopied] = React.useState(false);

  async function onCopy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      // ignore clipboard errors
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
      id: "using-capture",
      title: "Capture screenshots",
      icon: <Camera className="h-4 w-4" />,
    },
    {
      id: "in-synthqa",
      title: "Attach evidence in SynthQA",
      icon: <MonitorSmartphone className="h-4 w-4" />,
    },
    {
      id: "recording",
      title: "Video/tab recording (beta)",
      icon: <Play className="h-4 w-4" />,
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
            Evidence Capture Extension Guide
          </h1>
          <p className="max-w-2xl text-muted-foreground">
            Install the SynthQA Evidence Capture browser extension to capture
            screenshots and tab recordings on any website and attach them to
            your SynthQA test executions.
          </p>
          <Badge variant="secondary">Guide</Badge>
        </div>
        <GuideMenu />
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
                  Capture evidence on any website and attach it to a SynthQA
                  execution.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <ul className="list-disc pl-5 space-y-1">
                  <li>Capture screenshots from the active tab (any URL)</li>
                  <li>
                    Upload and attach screenshots to a test execution in SynthQA
                  </li>
                  <li>View evidence in the execution “Test Evidence” area</li>
                  <li>Video/tab recording is being added next (beta)</li>
                </ul>
              </CardContent>
            </Card>

            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>Important</AlertTitle>
              <AlertDescription>
                Screenshots are captured from the{" "}
                <span className="font-medium">extension popup</span> on the site
                you are testing. If you click “Capture” inside SynthQA while
                focused on the SynthQA tab, you will capture SynthQA—not your
                app-under-test.
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
                  <li>Developer Mode enabled (until store publishing)</li>
                </ul>
              </CardContent>
            </Card>

            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="download">
                <AccordionTrigger>1) Download the extension</AccordionTrigger>
                <AccordionContent className="space-y-2 text-sm text-muted-foreground">
                  <ol className="list-decimal pl-5 space-y-1">
                    <li>Go to the Extension download page in SynthQA</li>
                    <li>Download the ZIP</li>
                    <li>
                      Extract it to a folder you will keep (do not delete it
                      after install)
                    </li>
                    <Button asChild>
                      <a
                        href="/downloads/SynthQA-Evidence-Capture-v0.1.0.zip"
                        download
                      >
                        Download Extension (.zip)
                      </a>
                    </Button>
                  </ol>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="install">
                <AccordionTrigger>2) Install (Load unpacked)</AccordionTrigger>
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
                      You should see{" "}
                      <span className="font-medium">
                        SynthQA Evidence Capture
                      </span>{" "}
                      listed and enabled.
                    </AlertDescription>
                  </Alert>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="permissions">
                <AccordionTrigger>
                  3) Configure permissions (Site access)
                </AccordionTrigger>
                <AccordionContent className="space-y-2 text-sm text-muted-foreground">
                  <ol className="list-decimal pl-5 space-y-1">
                    <li>
                      Click <span className="font-medium">Details</span> on the
                      extension card
                    </li>
                    <li>
                      Find <span className="font-medium">Site access</span>
                    </li>
                    <li>
                      Select <span className="font-medium">On all sites</span>
                    </li>
                  </ol>
                  <div className="text-xs text-muted-foreground">
                    This allows the extension to capture screenshots on the
                    websites you test.
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="pin">
                <AccordionTrigger>
                  4) Pin the extension (recommended)
                </AccordionTrigger>
                <AccordionContent className="space-y-2 text-sm text-muted-foreground">
                  <ol className="list-decimal pl-5 space-y-1">
                    <li>Click the puzzle icon in the toolbar</li>
                    <li>
                      Find{" "}
                      <span className="font-medium">
                        SynthQA Evidence Capture
                      </span>
                    </li>
                    <li>Click the pin icon</li>
                  </ol>
                </AccordionContent>
              </AccordionItem>
            </Accordion>

            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Troubleshooting install</AlertTitle>
              <AlertDescription>
                If Capture is disabled in SynthQA, refresh the page and re-check
                that the extension is enabled. You can also reinstall by loading
                the unpacked folder again.
              </AlertDescription>
            </Alert>
          </Section>

          <Section
            id="using-capture"
            title="Capture screenshots"
            kicker="On any website"
          >
            <Card>
              <CardHeader>
                <CardTitle>Recommended workflow</CardTitle>
                <CardDescription>
                  Capture screenshots from the website you are testing using the
                  extension popup.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-muted-foreground">
                <ol className="list-decimal pl-5 space-y-2">
                  <li>Start your test session in SynthQA (Runner)</li>
                  <li>
                    Open your app-under-test in a new tab (your target URL)
                  </li>
                  <li>
                    Click the{" "}
                    <span className="font-medium">
                      SynthQA Evidence Capture
                    </span>{" "}
                    extension icon
                  </li>
                  <li>
                    Click{" "}
                    <span className="font-medium">Capture Screenshot</span>
                  </li>
                  <li>
                    Return to SynthQA to see the screenshot in{" "}
                    <span className="font-medium">Test Evidence</span>
                  </li>
                </ol>

                <CodeBlock
                  label="Example target URL"
                  code={`https://app.example.com/login`}
                />

                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertTitle>Where does the screenshot go?</AlertTitle>
                  <AlertDescription>
                    The extension uploads the screenshot and SynthQA shows it
                    under the current execution’s evidence list.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </Section>

          <Section
            id="in-synthqa"
            title="Attach evidence in SynthQA"
            kicker="Runner"
          >
            <Card>
              <CardHeader>
                <CardTitle>Using the Evidence area</CardTitle>
                <CardDescription>
                  Evidence is stored per execution and can be associated to
                  steps.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <ul className="list-disc pl-5 space-y-1">
                  <li>Open a test run session and select a test</li>
                  <li>
                    Use <span className="font-medium">Choose File</span> for
                    manual uploads
                  </li>
                  <li>
                    Use <span className="font-medium">Capture</span> when the
                    extension is installed (or capture via popup)
                  </li>
                  <li>
                    Preview / delete evidence directly in the Evidence section
                  </li>
                </ul>

                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Capture disabled?</AlertTitle>
                  <AlertDescription>
                    If the extension is not detected, SynthQA will disable
                    Capture and show install instructions.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </Section>

          <Section
            id="recording"
            title="Video/tab recording (beta)"
            kicker="Coming next"
          >
            <Card>
              <CardHeader>
                <CardTitle>Recording support</CardTitle>
                <CardDescription>
                  Tab recording is in progress and will be released as a beta
                  feature.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <ul className="list-disc pl-5 space-y-1">
                  <li>Record the active browser tab as video evidence</li>
                  <li>
                    Upload and attach to the execution similar to screenshots
                  </li>
                  <li>Recommended for reproducing intermittent UI bugs</li>
                </ul>

                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertTitle>Note</AlertTitle>
                  <AlertDescription>
                    Until recording is released, use screenshots plus execution
                    notes for failure evidence.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </Section>

          <Section id="best-practices" title="Best Practices" kicker="Quality">
            <Card>
              <CardHeader>
                <CardTitle>Creating useful evidence</CardTitle>
                <CardDescription>
                  Evidence should make failures fast to understand and
                  reproduce.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-6 md:grid-cols-2 text-sm text-muted-foreground">
                <div>
                  <div className="font-medium text-foreground mb-2">Do</div>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>
                      Capture the full page state (include headers/URL when
                      possible)
                    </li>
                    <li>
                      Capture after key transitions (submit, save, navigation)
                    </li>
                    <li>
                      Add a short note (“why this matters”) in the description
                    </li>
                    <li>Capture error toasts, validation messages, and logs</li>
                  </ul>
                </div>
                <div>
                  <div className="font-medium text-foreground mb-2">Avoid</div>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Screenshots with no context</li>
                    <li>Capturing sensitive data (PII, secrets)</li>
                    <li>Excessive duplicate screenshots</li>
                    <li>Blurry captures (zoom / scaling issues)</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </Section>

          <Section id="security" title="Security & Privacy" kicker="Trust">
            <Card>
              <CardHeader>
                <CardTitle>What is captured</CardTitle>
                <CardDescription>
                  Designed for evidence capture—minimize sensitive data
                  exposure.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-6 md:grid-cols-2 text-sm text-muted-foreground">
                <div>
                  <div className="font-medium text-foreground mb-2">
                    Captured
                  </div>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Screenshot image of the visible tab</li>
                    <li>Timestamp</li>
                    <li>Optional note/description</li>
                  </ul>
                </div>
                <div>
                  <div className="font-medium text-foreground mb-2">
                    Not captured
                  </div>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Browsing history (outside capture events)</li>
                    <li>Cookies/session tokens</li>
                    <li>Local storage contents</li>
                    <li>
                      Keystrokes (unless you choose to type them into a note)
                    </li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Permissions</CardTitle>
                <CardDescription>
                  Required for capture and upload.
                </CardDescription>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                <ul className="list-disc pl-5 space-y-1">
                  <li>Active Tab / Tabs</li>
                  <li>Storage</li>
                  <li>
                    Host permissions (all sites) for capture on your
                    app-under-test
                  </li>
                </ul>
                <div className="mt-3 rounded-lg border bg-muted/40 p-3 text-xs">
                  SynthQA does not track your browsing. The extension only acts
                  when you click Capture/Record.
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
                    <li>Download the latest ZIP from SynthQA</li>
                    <li>Extract it</li>
                    <li>
                      Open{" "}
                      <span className="font-medium">chrome://extensions/</span>
                    </li>
                    <li>
                      Remove the old version (recommended for unpacked installs)
                    </li>
                    <li>Load unpacked for the new folder</li>
                  </ol>
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
                      Find{" "}
                      <span className="font-medium">
                        SynthQA Evidence Capture
                      </span>
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
                      Removing the extension does not delete evidence already
                      uploaded to SynthQA.
                    </AlertDescription>
                  </Alert>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </Section>

          <Section id="faq" title="Frequently Asked Questions" kicker="FAQ">
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="anysite">
                <AccordionTrigger>
                  Can I capture on any website?
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">
                  Yes—set the extension Site access to “On all sites” and
                  capture from the extension popup on your app-under-test tab.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="why-disabled">
                <AccordionTrigger>
                  Why is Capture disabled in SynthQA?
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">
                  SynthQA disables Capture if it cannot detect the extension.
                  Install/enable the extension, refresh the page, and re-check
                  permissions.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="incognito">
                <AccordionTrigger>
                  Does it work in incognito mode?
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">
                  Yes, if you enable “Allow in Incognito” in the extension
                  settings.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="privacy">
                <AccordionTrigger>
                  Does the extension track my browsing?
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">
                  No. It only captures when you explicitly click Capture/Record.
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
                    <li>Screenshots / screen recordings</li>
                  </ul>
                </div>
                <Separator />
                <div className="text-xs text-muted-foreground">
                  Last updated: January 2026 · Guide version: 1.0
                </div>
              </CardContent>
            </Card>
          </Section>
        </main>
        <div className="pt-10"></div>
      </div>
      <SiteFooter />
    </div>
  );
}
