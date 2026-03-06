// app/(dashboard)/guides/automation/page.tsx
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import {
  CheckCircle2,
  Info,
  AlertTriangle,
  ExternalLink,
  BookOpen,
  Code2,
  Download,
  PlayCircle,
  Terminal,
  Settings,
  Zap,
  FileText,
  HelpCircle,
  Package,
  FolderOpen,
  Rocket,
  TrendingUp,
} from "lucide-react";
import { Logo } from "@/components/pagecomponents/brandlogo";
import { GuideMenu } from "@/components/pagecomponents/guide-menu";
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

function FrameworkComparisonTable() {
  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50">
          <tr>
            <th className="p-3 text-left font-medium">Framework</th>
            <th className="p-3 text-left font-medium">Language</th>
            <th className="p-3 text-left font-medium">Best For</th>
            <th className="p-3 text-left font-medium">SynthQA Support</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          <tr>
            <td className="p-3 font-medium">Playwright</td>
            <td className="p-3 text-muted-foreground">TypeScript / JS</td>
            <td className="p-3 text-muted-foreground">
              Modern web apps, cross-browser
            </td>
            <td className="p-3">
              <Badge className="bg-green-100 text-green-800 text-xs">
                Full export
              </Badge>
            </td>
          </tr>
          <tr>
            <td className="p-3 font-medium">Cypress</td>
            <td className="p-3 text-muted-foreground">JavaScript</td>
            <td className="p-3 text-muted-foreground">
              Frontend-heavy apps, E2E
            </td>
            <td className="p-3">
              <Badge className="bg-green-100 text-green-800 text-xs">
                Full export
              </Badge>
            </td>
          </tr>
          <tr>
            <td className="p-3 font-medium">Selenium</td>
            <td className="p-3 text-muted-foreground">Java / Python / JS</td>
            <td className="p-3 text-muted-foreground">
              Legacy apps, enterprise
            </td>
            <td className="p-3">
              <Badge className="bg-green-100 text-green-800 text-xs">
                Full export
              </Badge>
            </td>
          </tr>
          <tr>
            <td className="p-3 font-medium">Puppeteer</td>
            <td className="p-3 text-muted-foreground">JavaScript</td>
            <td className="p-3 text-muted-foreground">
              Chrome automation, scraping
            </td>
            <td className="p-3">
              <Badge className="bg-green-100 text-green-800 text-xs">
                Full export
              </Badge>
            </td>
          </tr>
          <tr>
            <td className="p-3 font-medium">TestCafe</td>
            <td className="p-3 text-muted-foreground">JavaScript</td>
            <td className="p-3 text-muted-foreground">
              No-driver cross-browser testing
            </td>
            <td className="p-3">
              <Badge className="bg-green-100 text-green-800 text-xs">
                Full export
              </Badge>
            </td>
          </tr>
          <tr>
            <td className="p-3 font-medium">WebDriverIO</td>
            <td className="p-3 text-muted-foreground">JavaScript</td>
            <td className="p-3 text-muted-foreground">
              Web + mobile, W3C WebDriver
            </td>
            <td className="p-3">
              <Badge className="bg-green-100 text-green-800 text-xs">
                Full export
              </Badge>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function ManualVsAutoTable() {
  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50">
          <tr>
            <th className="p-3 text-left font-medium">Feature</th>
            <th className="p-3 text-left font-medium">Manual Testing</th>
            <th className="p-3 text-left font-medium">Automation Export</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          <tr>
            <td className="p-3 font-medium">Execution time</td>
            <td className="p-3 text-muted-foreground">
              Minutes to hours per test
            </td>
            <td className="p-3 text-muted-foreground">Seconds per test</td>
          </tr>
          <tr>
            <td className="p-3 font-medium">Repeatability</td>
            <td className="p-3 text-muted-foreground">Varies by tester</td>
            <td className="p-3 text-muted-foreground">100% consistent</td>
          </tr>
          <tr>
            <td className="p-3 font-medium">Regression testing</td>
            <td className="p-3 text-muted-foreground">Time-intensive</td>
            <td className="p-3 text-muted-foreground">
              Run anytime, instantly
            </td>
          </tr>
          <tr>
            <td className="p-3 font-medium">CI/CD integration</td>
            <td className="p-3 text-muted-foreground">Not applicable</td>
            <td className="p-3 text-muted-foreground">✓ Full support</td>
          </tr>
          <tr>
            <td className="p-3 font-medium">Initial setup</td>
            <td className="p-3 text-muted-foreground">None</td>
            <td className="p-3 text-muted-foreground">~5 minutes (one-time)</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

export default function AutomationGuidePage() {
  const toc: TocItem[] = [
    {
      id: "overview",
      title: "Overview",
      icon: <BookOpen className="h-4 w-4" />,
    },
    {
      id: "frameworks",
      title: "Supported Frameworks",
      icon: <Code2 className="h-4 w-4" />,
    },
    {
      id: "getting-started",
      title: "Getting Started",
      icon: <Rocket className="h-4 w-4" />,
    },
    {
      id: "automation-hub",
      title: "Automation Hub",
      icon: <Code2 className="h-4 w-4" />,
    },
    {
      id: "exporting",
      title: "Exporting Tests",
      icon: <Download className="h-4 w-4" />,
    },
    {
      id: "project-structure",
      title: "Project Structure",
      icon: <FolderOpen className="h-4 w-4" />,
    },
    {
      id: "setup",
      title: "Setup & Installation",
      icon: <Package className="h-4 w-4" />,
    },
    {
      id: "running-tests",
      title: "Running Tests",
      icon: <PlayCircle className="h-4 w-4" />,
    },
    {
      id: "enhancement",
      title: "Enhancement Options",
      icon: <Zap className="h-4 w-4" />,
    },
    {
      id: "best-practices",
      title: "Best Practices",
      icon: <CheckCircle2 className="h-4 w-4" />,
    },
    {
      id: "troubleshooting",
      title: "Troubleshooting",
      icon: <Settings className="h-4 w-4" />,
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
            Automation Guide
          </h1>
          <p className="max-w-2xl text-muted-foreground">
            Export your test suites as complete, ready-to-run automation
            projects. Supports Playwright, Cypress, Selenium, Puppeteer,
            TestCafe, and WebDriverIO.
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
                    "flex items-center gap-2 rounded-lg px-2 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground",
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
          {/* Overview */}
          <Section id="overview" title="Overview" kicker="Introduction">
            <Card>
              <CardHeader>
                <CardTitle>What is Automation Export?</CardTitle>
                <CardDescription>
                  Transform your manual test cases into executable automation
                  projects across multiple frameworks.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <p>
                  The Automation Export feature converts your SynthQA test
                  suites into complete, production-ready test projects for your
                  preferred framework. Export once, run anywhere — locally or in
                  your CI/CD pipeline.
                </p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>One-click export of entire test suites</li>
                  <li>
                    Six supported frameworks: Playwright, Cypress, Selenium,
                    Puppeteer, TestCafe, WebDriverIO
                  </li>
                  <li>Complete project structure with all dependencies</li>
                  <li>Pre-configured settings and test files</li>
                  <li>Test data snapshots for reference and validation</li>
                  <li>
                    Ready for CI/CD integration (GitHub Actions, GitLab CI,
                    etc.)
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>Instant automation</AlertTitle>
              <AlertDescription>
                Export transforms your test cases into a working project in
                seconds — complete with project structure, dependencies,
                configuration, and test specs ready to run.
              </AlertDescription>
            </Alert>

            <ManualVsAutoTable />

            <Card>
              <CardHeader>
                <CardTitle>Prerequisites</CardTitle>
                <CardDescription>
                  What you need before exporting tests.
                </CardDescription>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                <ul className="list-disc pl-5 space-y-1">
                  <li>Active SynthQA account (Pro plan)</li>
                  <li>At least one test suite with test cases</li>
                  <li>
                    Node.js 18+ installed on your machine (for running tests)
                  </li>
                  <li>Basic understanding of command line operations</li>
                  <li>
                    Optional: Test cases with defined test steps for richer
                    automation
                  </li>
                </ul>
              </CardContent>
            </Card>
          </Section>

          {/* Supported Frameworks */}
          <Section
            id="frameworks"
            title="Supported Frameworks"
            kicker="Choose your stack"
          >
            <Card>
              <CardHeader>
                <CardTitle>All supported frameworks</CardTitle>
                <CardDescription>
                  SynthQA exports to all major web automation frameworks.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FrameworkComparisonTable />
              </CardContent>
            </Card>

            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="playwright">
                <AccordionTrigger>Playwright</AccordionTrigger>
                <AccordionContent className="space-y-3 text-sm text-muted-foreground">
                  <p>
                    Microsoft's modern end-to-end testing framework. The
                    recommended choice for new projects.
                  </p>
                  <div className="font-medium text-foreground mb-2">
                    Strengths:
                  </div>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Auto-waits for elements — fewer flaky tests</li>
                    <li>
                      Native support for Chromium, Firefox, and WebKit (Safari)
                    </li>
                    <li>Full TypeScript support out of the box</li>
                    <li>
                      Built-in trace viewer, screenshots, and video recording
                    </li>
                    <li>Excellent CI/CD integration</li>
                  </ul>
                  <div className="p-3 rounded-lg border bg-muted/20 font-mono text-xs">
                    <div className="text-foreground mb-1">Run command:</div>
                    <pre>npx playwright test</pre>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="cypress">
                <AccordionTrigger>Cypress</AccordionTrigger>
                <AccordionContent className="space-y-3 text-sm text-muted-foreground">
                  <p>
                    Developer-focused E2E testing with an interactive test
                    runner and real-time reloading.
                  </p>
                  <div className="font-medium text-foreground mb-2">
                    Strengths:
                  </div>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Interactive Test Runner with time-travel debugging</li>
                    <li>Automatic waiting without explicit waits</li>
                    <li>Real-time reloading during development</li>
                    <li>Excellent documentation and large community</li>
                    <li>Built-in dashboard for test recording (paid)</li>
                  </ul>
                  <div className="p-3 rounded-lg border bg-muted/20 font-mono text-xs">
                    <div className="text-foreground mb-1">Run command:</div>
                    <pre>npx cypress run</pre>
                  </div>
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertTitle>Chrome-first</AlertTitle>
                    <AlertDescription>
                      Cypress runs tests inside the browser. It supports Chrome,
                      Firefox, and Edge — but not Safari/WebKit.
                    </AlertDescription>
                  </Alert>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="selenium">
                <AccordionTrigger>Selenium</AccordionTrigger>
                <AccordionContent className="space-y-3 text-sm text-muted-foreground">
                  <p>
                    The original browser automation standard. Best for
                    enterprise environments and legacy app testing.
                  </p>
                  <div className="font-medium text-foreground mb-2">
                    Strengths:
                  </div>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Industry standard with the widest browser support</li>
                    <li>
                      Supports Java, Python, JavaScript, C#, Ruby, and Kotlin
                    </li>
                    <li>Deep integration with enterprise tooling</li>
                    <li>Selenium Grid for parallel distributed testing</li>
                    <li>Large ecosystem of extensions and tools</li>
                  </ul>
                  <div className="p-3 rounded-lg border bg-muted/20 font-mono text-xs">
                    <div className="text-foreground mb-1">
                      Run command (JS):
                    </div>
                    <pre>npm test</pre>
                  </div>
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertTitle>SynthQA exports JavaScript</AlertTitle>
                    <AlertDescription>
                      Exported Selenium projects use JavaScript (Node.js). If
                      your team uses Java or Python, use the export as a
                      structural reference and adapt accordingly.
                    </AlertDescription>
                  </Alert>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="puppeteer">
                <AccordionTrigger>Puppeteer</AccordionTrigger>
                <AccordionContent className="space-y-3 text-sm text-muted-foreground">
                  <p>
                    Google's Chrome DevTools Protocol library. Ideal for
                    Chrome-specific automation and headless workflows.
                  </p>
                  <div className="font-medium text-foreground mb-2">
                    Strengths:
                  </div>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Direct Chrome/Chromium DevTools Protocol access</li>
                    <li>Fastest for Chrome-only headless testing</li>
                    <li>
                      Great for PDF generation, screenshots, and performance
                      audits
                    </li>
                    <li>
                      First-class support for service workers and browser
                      internals
                    </li>
                  </ul>
                  <div className="p-3 rounded-lg border bg-muted/20 font-mono text-xs">
                    <div className="text-foreground mb-1">Run command:</div>
                    <pre>node tests/run.js</pre>
                  </div>
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Chrome only</AlertTitle>
                    <AlertDescription>
                      Puppeteer only supports Chrome and Chromium. If you need
                      cross-browser coverage, consider Playwright instead.
                    </AlertDescription>
                  </Alert>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="testcafe">
                <AccordionTrigger>TestCafe</AccordionTrigger>
                <AccordionContent className="space-y-3 text-sm text-muted-foreground">
                  <p>
                    No WebDriver required — TestCafe injects scripts directly
                    into pages for reliable cross-browser testing.
                  </p>
                  <div className="font-medium text-foreground mb-2">
                    Strengths:
                  </div>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>No WebDriver or browser plugins needed</li>
                    <li>Runs on any browser including mobile browsers</li>
                    <li>Built-in concurrency for parallel test runs</li>
                    <li>Smart assertion retry for stable tests</li>
                    <li>Simple setup — works out of the box</li>
                  </ul>
                  <div className="p-3 rounded-lg border bg-muted/20 font-mono text-xs">
                    <div className="text-foreground mb-1">Run command:</div>
                    <pre>npx testcafe chrome tests/</pre>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="webdriverio">
                <AccordionTrigger>WebDriverIO</AccordionTrigger>
                <AccordionContent className="space-y-3 text-sm text-muted-foreground">
                  <p>
                    W3C WebDriver-compliant framework with first-class support
                    for web and native mobile apps.
                  </p>
                  <div className="font-medium text-foreground mb-2">
                    Strengths:
                  </div>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Supports both web and mobile (Appium integration)</li>
                    <li>W3C WebDriver and DevTools protocol support</li>
                    <li>Rich plugin and reporter ecosystem</li>
                    <li>Works with any CI/CD system</li>
                    <li>
                      Powerful selector strategies including accessibility
                      selectors
                    </li>
                  </ul>
                  <div className="p-3 rounded-lg border bg-muted/20 font-mono text-xs">
                    <div className="text-foreground mb-1">Run command:</div>
                    <pre>npx wdio run wdio.conf.js</pre>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="which-to-choose">
                <AccordionTrigger>
                  Which framework should I choose?
                </AccordionTrigger>
                <AccordionContent className="space-y-3 text-sm text-muted-foreground">
                  <div className="space-y-2">
                    <div className="p-3 rounded-lg border">
                      <div className="font-medium text-foreground mb-1">
                        New project, no preference
                      </div>
                      <div className="text-xs">
                        → <strong>Playwright.</strong> Modern, fast, full
                        cross-browser, TypeScript-first.
                      </div>
                    </div>
                    <div className="p-3 rounded-lg border">
                      <div className="font-medium text-foreground mb-1">
                        Frontend-heavy app, developer team
                      </div>
                      <div className="text-xs">
                        → <strong>Cypress.</strong> Best interactive debugging
                        experience.
                      </div>
                    </div>
                    <div className="p-3 rounded-lg border">
                      <div className="font-medium text-foreground mb-1">
                        Enterprise / existing Selenium setup
                      </div>
                      <div className="text-xs">
                        → <strong>Selenium.</strong> Widest language support and
                        enterprise integrations.
                      </div>
                    </div>
                    <div className="p-3 rounded-lg border">
                      <div className="font-medium text-foreground mb-1">
                        Chrome-only, performance/screenshot needs
                      </div>
                      <div className="text-xs">
                        → <strong>Puppeteer.</strong> Direct Chrome DevTools
                        access.
                      </div>
                    </div>
                    <div className="p-3 rounded-lg border">
                      <div className="font-medium text-foreground mb-1">
                        No WebDriver setup, mobile browsers
                      </div>
                      <div className="text-xs">
                        → <strong>TestCafe.</strong> No driver needed, runs in
                        any browser.
                      </div>
                    </div>
                    <div className="p-3 rounded-lg border">
                      <div className="font-medium text-foreground mb-1">
                        Web + native mobile testing
                      </div>
                      <div className="text-xs">
                        → <strong>WebDriverIO.</strong> Best Appium integration
                        for mobile.
                      </div>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </Section>

          {/* Getting Started */}
          <Section
            id="getting-started"
            title="Getting Started"
            kicker="Quick start"
          >
            <Card>
              <CardHeader>
                <CardTitle>Three simple steps</CardTitle>
                <CardDescription>
                  From test suite to running automation in minutes.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="p-4 rounded-lg border bg-muted/30">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-bold">
                        1
                      </div>
                      <h3 className="font-semibold">Navigate</h3>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Go to your test suite and click the "Automation" button to
                      access the Automation Hub.
                    </p>
                  </div>
                  <div className="p-4 rounded-lg border bg-muted/30">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-bold">
                        2
                      </div>
                      <h3 className="font-semibold">Choose & Export</h3>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Select your framework, then click "Export" to download a
                      complete project as a ZIP file.
                    </p>
                  </div>
                  <div className="p-4 rounded-lg border bg-muted/30">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-bold">
                        3
                      </div>
                      <h3 className="font-semibold">Run</h3>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Extract the ZIP, install dependencies, configure your
                      environment, and run your tests.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Alert>
              <Rocket className="h-4 w-4" />
              <AlertTitle>Typical timeline</AlertTitle>
              <AlertDescription>
                First-time setup: 5–10 minutes. Subsequent exports: 2–3 minutes
                from export to running tests.
              </AlertDescription>
            </Alert>
          </Section>

          {/* Automation Hub */}
          <Section
            id="automation-hub"
            title="Automation Hub"
            kicker="Step-by-step"
          >
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="step1">
                <AccordionTrigger>
                  Step 1: Access the Automation Hub
                </AccordionTrigger>
                <AccordionContent className="space-y-3 text-sm text-muted-foreground">
                  <p>
                    The Automation Hub is your central location for managing
                    test automation for each test suite.
                  </p>
                  <div>
                    <div className="font-medium text-foreground mb-2">
                      To access:
                    </div>
                    <ol className="list-decimal pl-5 space-y-1">
                      <li>Navigate to the Test Suites page</li>
                      <li>Click on any test suite to open its detail page</li>
                      <li>Click the "Automation" tab</li>
                      <li>You're now in the Automation Hub for that suite</li>
                    </ol>
                  </div>
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertTitle>Direct URL access</AlertTitle>
                    <AlertDescription>
                      You can bookmark the Automation Hub URL for quick access:
                      <code className="ml-1 px-1.5 py-0.5 rounded bg-muted text-xs">
                        /automation/suites/[suite-id]
                      </code>
                    </AlertDescription>
                  </Alert>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="step2">
                <AccordionTrigger>
                  Step 2: Select your framework
                </AccordionTrigger>
                <AccordionContent className="space-y-3 text-sm text-muted-foreground">
                  <p>
                    The Automation Hub lets you choose which framework to export
                    before downloading.
                  </p>
                  <div className="grid md:grid-cols-2 gap-3 text-xs">
                    {[
                      "Playwright",
                      "Cypress",
                      "Selenium",
                      "Puppeteer",
                      "TestCafe",
                      "WebDriverIO",
                    ].map((fw) => (
                      <div
                        key={fw}
                        className="p-2 rounded-lg border flex items-center gap-2"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5 text-green-600 flex-shrink-0" />
                        <span>{fw}</span>
                      </div>
                    ))}
                  </div>
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertTitle>You can export multiple times</AlertTitle>
                    <AlertDescription>
                      There's no limit on exports. Export to Playwright for
                      CI/CD and Selenium for your enterprise setup — both from
                      the same suite.
                    </AlertDescription>
                  </Alert>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="step3">
                <AccordionTrigger>
                  Step 3: Review readiness stats
                </AccordionTrigger>
                <AccordionContent className="space-y-3 text-sm text-muted-foreground">
                  <p>
                    The hub shows key metrics about your suite's automation
                    readiness before you export.
                  </p>
                  <div className="grid md:grid-cols-2 gap-3">
                    <div className="p-3 rounded-lg border">
                      <div className="font-medium text-foreground text-sm mb-1">
                        Total Tests
                      </div>
                      <p className="text-xs">
                        Number of test cases in the suite
                      </p>
                    </div>
                    <div className="p-3 rounded-lg border">
                      <div className="font-medium text-foreground text-sm mb-1">
                        Automation Ready
                      </div>
                      <p className="text-xs">
                        Test cases with defined steps that will export fully
                      </p>
                    </div>
                    <div className="p-3 rounded-lg border">
                      <div className="font-medium text-foreground text-sm mb-1">
                        With Metadata
                      </div>
                      <p className="text-xs">
                        Tests enhanced with selectors and URLs for pre-filled
                        exports
                      </p>
                    </div>
                    <div className="p-3 rounded-lg border">
                      <div className="font-medium text-foreground text-sm mb-1">
                        Suite Type
                      </div>
                      <p className="text-xs">
                        Manual, regression, smoke, or integration
                      </p>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </Section>

          {/* Exporting */}
          <Section id="exporting" title="Exporting Tests" kicker="Download">
            <Card>
              <CardHeader>
                <CardTitle>Export process</CardTitle>
                <CardDescription>
                  How to export your suite as an automation project.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-muted-foreground">
                <div>
                  <div className="font-medium text-foreground mb-2">
                    What happens when you export:
                  </div>
                  <ol className="list-decimal pl-5 space-y-1">
                    <li>Select your framework in the Automation Hub</li>
                    <li>Click "Export to [Framework]"</li>
                    <li>System generates a complete project (5–10 seconds)</li>
                    <li>ZIP file downloads automatically</li>
                    <li>
                      File name:{" "}
                      <code className="px-1 py-0.5 rounded bg-muted text-xs">
                        synthqa-[framework]-[suite-name].zip
                      </code>
                    </li>
                  </ol>
                </div>
                <Alert>
                  <Download className="h-4 w-4" />
                  <AlertTitle>Download confirmation</AlertTitle>
                  <AlertDescription>
                    A success notification confirms the export. Check your
                    browser's downloads folder for the ZIP file.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>

            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="export-contents">
                <AccordionTrigger>
                  What's included in every export
                </AccordionTrigger>
                <AccordionContent className="space-y-3 text-sm text-muted-foreground">
                  <div className="space-y-2">
                    <div className="p-3 rounded-lg border bg-muted/20">
                      <div className="font-medium text-foreground mb-1 text-xs">
                        Project Configuration:
                      </div>
                      <ul className="text-xs space-y-1">
                        <li>
                          • <code>package.json</code> — dependencies and run
                          scripts
                        </li>
                        <li>
                          • Framework config file (e.g.{" "}
                          <code>playwright.config.ts</code>,{" "}
                          <code>cypress.config.js</code>,{" "}
                          <code>wdio.conf.js</code>)
                        </li>
                        <li>
                          • <code>tsconfig.json</code> — where applicable
                        </li>
                        <li>
                          • <code>.env.example</code> — environment variables
                          template
                        </li>
                        <li>
                          • <code>.gitignore</code>
                        </li>
                      </ul>
                    </div>
                    <div className="p-3 rounded-lg border bg-muted/20">
                      <div className="font-medium text-foreground mb-1 text-xs">
                        Test Files:
                      </div>
                      <ul className="text-xs space-y-1">
                        <li>
                          • <code>tests/</code> or <code>cypress/e2e/</code> —
                          test specifications per test case
                        </li>
                        <li>
                          • <code>synthqa/suite.json</code> — suite metadata
                        </li>
                        <li>
                          • <code>synthqa/cases/*.json</code> — test data
                          snapshots
                        </li>
                      </ul>
                    </div>
                    <div className="p-3 rounded-lg border bg-muted/20">
                      <div className="font-medium text-foreground mb-1 text-xs">
                        Documentation:
                      </div>
                      <ul className="text-xs space-y-1">
                        <li>
                          • <code>README.md</code> — setup, running, and
                          troubleshooting guide
                        </li>
                      </ul>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </Section>

          {/* Project Structure */}
          <Section
            id="project-structure"
            title="Project Structure"
            kicker="Understanding the export"
          >
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="playwright-structure">
                <AccordionTrigger>
                  Playwright project structure
                </AccordionTrigger>
                <AccordionContent className="space-y-3 text-sm text-muted-foreground">
                  <div className="p-3 rounded-lg border bg-muted/20 font-mono text-xs">
                    <pre className="whitespace-pre">{`synthqa-playwright-suite-name/
├── tests/cases/
│   ├── test-case-1.spec.ts
│   └── test-case-2.spec.ts
├── synthqa/
│   ├── suite.json
│   └── cases/
├── playwright.config.ts
├── package.json
├── tsconfig.json
├── .env.example
└── README.md`}</pre>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="cypress-structure">
                <AccordionTrigger>Cypress project structure</AccordionTrigger>
                <AccordionContent className="space-y-3 text-sm text-muted-foreground">
                  <div className="p-3 rounded-lg border bg-muted/20 font-mono text-xs">
                    <pre className="whitespace-pre">{`synthqa-cypress-suite-name/
├── cypress/
│   ├── e2e/
│   │   ├── test-case-1.cy.js
│   │   └── test-case-2.cy.js
│   └── support/
│       └── commands.js
├── synthqa/
│   ├── suite.json
│   └── cases/
├── cypress.config.js
├── package.json
├── .env.example
└── README.md`}</pre>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="other-structures">
                <AccordionTrigger>
                  Selenium, Puppeteer, TestCafe, WebDriverIO
                </AccordionTrigger>
                <AccordionContent className="space-y-3 text-sm text-muted-foreground">
                  <p>
                    All other frameworks follow the same pattern — a{" "}
                    <code>tests/</code> directory containing one file per test
                    case, a <code>synthqa/</code> directory for metadata, and
                    framework-specific config at the root.
                  </p>
                  <div className="space-y-2 text-xs">
                    <div className="p-2 rounded border flex items-center justify-between">
                      <span className="font-medium">Selenium</span>
                      <code className="text-muted-foreground">
                        tests/*.test.js + wdio-style runner
                      </code>
                    </div>
                    <div className="p-2 rounded border flex items-center justify-between">
                      <span className="font-medium">Puppeteer</span>
                      <code className="text-muted-foreground">
                        tests/*.test.js + Jest runner
                      </code>
                    </div>
                    <div className="p-2 rounded border flex items-center justify-between">
                      <span className="font-medium">TestCafe</span>
                      <code className="text-muted-foreground">
                        tests/*.test.js + .testcaferc.json
                      </code>
                    </div>
                    <div className="p-2 rounded border flex items-center justify-between">
                      <span className="font-medium">WebDriverIO</span>
                      <code className="text-muted-foreground">
                        test/specs/*.js + wdio.conf.js
                      </code>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </Section>

          {/* Setup */}
          <Section
            id="setup"
            title="Setup & Installation"
            kicker="Configuration"
          >
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="extract">
                <AccordionTrigger>
                  Step 1: Extract the ZIP file
                </AccordionTrigger>
                <AccordionContent className="space-y-3 text-sm text-muted-foreground">
                  <ol className="list-decimal pl-5 space-y-1">
                    <li>Locate the downloaded ZIP in your Downloads folder</li>
                    <li>Extract to your projects directory</li>
                    <li>Navigate to the extracted folder in your terminal</li>
                  </ol>
                  <div className="p-3 rounded-lg border bg-muted/20 font-mono text-xs">
                    <pre>cd ~/projects/synthqa-playwright-suite-name</pre>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="install">
                <AccordionTrigger>
                  Step 2: Install dependencies
                </AccordionTrigger>
                <AccordionContent className="space-y-3 text-sm text-muted-foreground">
                  <Tabs defaultValue="pnpm" className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value="pnpm">pnpm</TabsTrigger>
                      <TabsTrigger value="npm">npm</TabsTrigger>
                      <TabsTrigger value="yarn">yarn</TabsTrigger>
                    </TabsList>
                    <TabsContent value="pnpm" className="mt-3">
                      <div className="p-3 rounded-lg border bg-muted/20 font-mono text-xs">
                        <pre>{`pnpm install\n\n# Playwright only — install browsers\nnpx playwright install`}</pre>
                      </div>
                    </TabsContent>
                    <TabsContent value="npm" className="mt-3">
                      <div className="p-3 rounded-lg border bg-muted/20 font-mono text-xs">
                        <pre>{`npm install\n\n# Playwright only — install browsers\nnpx playwright install`}</pre>
                      </div>
                    </TabsContent>
                    <TabsContent value="yarn" className="mt-3">
                      <div className="p-3 rounded-lg border bg-muted/20 font-mono text-xs">
                        <pre>{`yarn install\n\n# Playwright only — install browsers\nnpx playwright install`}</pre>
                      </div>
                    </TabsContent>
                  </Tabs>
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertTitle>Playwright browser download</AlertTitle>
                    <AlertDescription>
                      <code>npx playwright install</code> downloads Chromium,
                      Firefox, and WebKit (~500MB, one-time only). Other
                      frameworks use your already-installed system browsers.
                    </AlertDescription>
                  </Alert>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="configure">
                <AccordionTrigger>
                  Step 3: Configure environment
                </AccordionTrigger>
                <AccordionContent className="space-y-3 text-sm text-muted-foreground">
                  <ol className="list-decimal pl-5 space-y-1">
                    <li>
                      Copy <code>.env.example</code> to <code>.env</code>
                    </li>
                    <li>
                      Set <code>BASE_URL</code> to your app's URL
                    </li>
                    <li>Add any other test credentials or settings</li>
                  </ol>
                  <div className="p-3 rounded-lg border bg-muted/20 font-mono text-xs">
                    <pre>{`BASE_URL=https://staging.myapp.com\nTEST_USERNAME=test@example.com\nTEST_PASSWORD=Test123!`}</pre>
                  </div>
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Security reminder</AlertTitle>
                    <AlertDescription>
                      Never commit the <code>.env</code> file. It's already in{" "}
                      <code>.gitignore</code>.
                    </AlertDescription>
                  </Alert>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </Section>

          {/* Running Tests */}
          <Section id="running-tests" title="Running Tests" kicker="Execution">
            <Card>
              <CardHeader>
                <CardTitle>Run commands by framework</CardTitle>
                <CardDescription>
                  Each framework has its own run command — all are
                  pre-configured in the exported <code>package.json</code>.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="playwright" className="w-full">
                  <TabsList className="grid w-full grid-cols-3 mb-2">
                    <TabsTrigger value="playwright">Playwright</TabsTrigger>
                    <TabsTrigger value="cypress">Cypress</TabsTrigger>
                    <TabsTrigger value="selenium">Selenium</TabsTrigger>
                  </TabsList>
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="puppeteer">Puppeteer</TabsTrigger>
                    <TabsTrigger value="testcafe">TestCafe</TabsTrigger>
                    <TabsTrigger value="webdriverio">WebDriverIO</TabsTrigger>
                  </TabsList>
                  <TabsContent value="playwright" className="mt-4">
                    <div className="p-3 rounded-lg border bg-muted/20 font-mono text-xs space-y-2">
                      <pre>{`pnpm test               # headless\npnpm test:headed        # with browser UI\npnpm test:debug         # Playwright Inspector`}</pre>
                    </div>
                  </TabsContent>
                  <TabsContent value="cypress" className="mt-4">
                    <div className="p-3 rounded-lg border bg-muted/20 font-mono text-xs space-y-2">
                      <pre>{`npx cypress run         # headless\nnpx cypress open        # interactive runner`}</pre>
                    </div>
                  </TabsContent>
                  <TabsContent value="selenium" className="mt-4">
                    <div className="p-3 rounded-lg border bg-muted/20 font-mono text-xs">
                      <pre>{`npm test                # run all specs`}</pre>
                    </div>
                  </TabsContent>
                  <TabsContent value="puppeteer" className="mt-4">
                    <div className="p-3 rounded-lg border bg-muted/20 font-mono text-xs">
                      <pre>{`npm test                # Jest + Puppeteer`}</pre>
                    </div>
                  </TabsContent>
                  <TabsContent value="testcafe" className="mt-4">
                    <div className="p-3 rounded-lg border bg-muted/20 font-mono text-xs">
                      <pre>{`npx testcafe chrome tests/     # Chrome\nnpx testcafe firefox tests/    # Firefox\nnpx testcafe all tests/        # All browsers`}</pre>
                    </div>
                  </TabsContent>
                  <TabsContent value="webdriverio" className="mt-4">
                    <div className="p-3 rounded-lg border bg-muted/20 font-mono text-xs">
                      <pre>{`npx wdio run wdio.conf.js`}</pre>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>

            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="ci-cd">
                <AccordionTrigger>CI/CD integration</AccordionTrigger>
                <AccordionContent className="space-y-3 text-sm text-muted-foreground">
                  <p>
                    All exported frameworks work with standard CI/CD pipelines.
                    Here's a GitHub Actions example for Playwright:
                  </p>
                  <div className="p-3 rounded-lg border bg-muted/20 font-mono text-xs">
                    <pre className="whitespace-pre-wrap">{`name: Playwright Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm install
      - run: npx playwright install --with-deps
      - run: npx playwright test
      - uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: playwright-report/`}</pre>
                  </div>
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertTitle>Other frameworks</AlertTitle>
                    <AlertDescription>
                      Replace the install and run commands with the
                      framework-specific ones above. The overall pipeline
                      structure is the same.
                    </AlertDescription>
                  </Alert>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </Section>

          {/* Enhancement */}
          <Section
            id="enhancement"
            title="Enhancement Options"
            kicker="Advanced"
          >
            <Card>
              <CardHeader>
                <CardTitle>Automation metadata</CardTitle>
                <CardDescription>
                  Pre-fill your tests with selectors, URLs, and test data across
                  any framework.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <p>
                  Instead of exporting tests with TODO placeholders, you can
                  enhance test cases with automation metadata to generate
                  pre-filled, near-ready tests regardless of which framework you
                  use.
                </p>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg border">
                    <div className="font-medium text-foreground mb-2 text-sm">
                      ❌ Without metadata
                    </div>
                    <div className="p-2 rounded bg-muted/50 font-mono text-xs">
                      <pre className="whitespace-pre-wrap text-muted-foreground">{`// TODO: Navigate to login page
await page.goto('???');

// TODO: Fill email field
await page.fill('???', '???');`}</pre>
                    </div>
                  </div>
                  <div className="p-4 rounded-lg border">
                    <div className="font-medium text-foreground mb-2 text-sm">
                      ✅ With metadata
                    </div>
                    <div className="p-2 rounded bg-muted/50 font-mono text-xs">
                      <pre className="whitespace-pre-wrap text-muted-foreground">{`// Navigate to login page
await page.goto('/login');

// Fill email field
await page.fill('#email',
  'test@example.com');`}</pre>
                    </div>
                  </div>
                </div>
                <Alert>
                  <Zap className="h-4 w-4" />
                  <AlertTitle>80% time savings</AlertTitle>
                  <AlertDescription>
                    With automation metadata, tests are 90% ready to run. You
                    only need to verify and fine-tune instead of implementing
                    from scratch.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </Section>

          {/* Best Practices */}
          <Section id="best-practices" title="Best Practices" kicker="Quality">
            <Card>
              <CardHeader>
                <CardTitle>Selector strategies</CardTitle>
                <CardDescription>
                  Choosing reliable selectors — applies to all frameworks.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <div className="grid md:grid-cols-3 gap-3 text-xs">
                  <div className="p-3 rounded-lg border">
                    <div className="font-medium text-foreground mb-2">
                      ✅ Best: Test IDs
                    </div>
                    <div className="p-2 rounded bg-muted font-mono mb-2">
                      [data-testid="login-btn"]
                    </div>
                    <div>Stable, explicit, purpose-built for testing</div>
                  </div>
                  <div className="p-3 rounded-lg border">
                    <div className="font-medium text-foreground mb-2">
                      ⚠️ OK: IDs / Names
                    </div>
                    <div className="p-2 rounded bg-muted font-mono mb-2">
                      #email-input
                    </div>
                    <div>Reasonable if they're stable and semantic</div>
                  </div>
                  <div className="p-3 rounded-lg border">
                    <div className="font-medium text-foreground mb-2">
                      ❌ Avoid: CSS Classes
                    </div>
                    <div className="p-2 rounded bg-muted font-mono mb-2">
                      .btn-primary
                    </div>
                    <div>Fragile — changes with styling updates</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Do's and Don'ts</CardTitle>
              </CardHeader>
              <CardContent className="grid md:grid-cols-2 gap-6 text-sm">
                <div className="space-y-3">
                  <div className="font-medium text-foreground">✅ Do</div>
                  <ul className="space-y-2 text-muted-foreground">
                    {[
                      "Define test steps before exporting",
                      "Use descriptive suite and test names",
                      "Keep tests independent and isolated",
                      "Use environment variables for test data",
                      "Re-export when test cases are updated",
                      "Commit your exported project to version control",
                    ].map((item) => (
                      <li key={item} className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="space-y-3">
                  <div className="font-medium text-foreground">❌ Avoid</div>
                  <ul className="space-y-2 text-muted-foreground">
                    {[
                      "Tests that depend on each other",
                      "Hardcoded URLs and credentials in tests",
                      "Exporting suites with no test steps defined",
                      "Ignoring failed tests without investigation",
                      "Committing .env files to version control",
                      "Mixing multiple features in one suite",
                    ].map((item) => (
                      <li key={item} className="flex items-start gap-2">
                        <AlertTriangle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>
          </Section>

          {/* Troubleshooting */}
          <Section
            id="troubleshooting"
            title="Troubleshooting"
            kicker="Common issues"
          >
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="export-fails">
                <AccordionTrigger>
                  Export button doesn't download anything
                </AccordionTrigger>
                <AccordionContent className="space-y-3 text-sm text-muted-foreground">
                  <ul className="list-disc pl-5 space-y-1">
                    <li>
                      Browser blocking downloads — check download permissions
                    </li>
                    <li>Ad blocker interfering — try disabling temporarily</li>
                    <li>Check browser console (F12) for error messages</li>
                    <li>Verify the export API route is responding</li>
                  </ul>
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="tests-fail">
                <AccordionTrigger>All tests fail immediately</AccordionTrigger>
                <AccordionContent className="space-y-3 text-sm text-muted-foreground">
                  <ul className="list-disc pl-5 space-y-1">
                    <li>
                      Is <code>BASE_URL</code> set correctly in{" "}
                      <code>.env</code>?
                    </li>
                    <li>Is the application running and accessible?</li>
                    <li>Are framework dependencies fully installed?</li>
                    <li>
                      For Playwright: did you run{" "}
                      <code>npx playwright install</code>?
                    </li>
                    <li>Are selectors correct for your application?</li>
                  </ul>
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertTitle>First run failures are normal</AlertTitle>
                    <AlertDescription>
                      Tests with TODO placeholders will fail until you implement
                      the missing selectors and assertions.
                    </AlertDescription>
                  </Alert>
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="hub-error">
                <AccordionTrigger>
                  "Suite not found" error in Automation Hub
                </AccordionTrigger>
                <AccordionContent className="space-y-3 text-sm text-muted-foreground">
                  <ul className="list-disc pl-5 space-y-1">
                    <li>The suite ID in the URL may be incorrect</li>
                    <li>
                      RLS policy may be blocking the query — check database
                      permissions
                    </li>
                    <li>
                      The <code>automation_metadata</code> column may be missing
                      — run the migration
                    </li>
                  </ul>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </Section>

          {/* FAQ */}
          <Section id="faq" title="Frequently Asked Questions" kicker="FAQ">
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="cost">
                <AccordionTrigger>
                  Is automation export included in my plan?
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">
                  Automation export is available on Pro and above. There are no
                  limits on the number of exports.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="all-frameworks">
                <AccordionTrigger>
                  Can I export the same suite to multiple frameworks?
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">
                  Yes. Export to as many frameworks as you need from the same
                  suite. Each export is independent.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="modify">
                <AccordionTrigger>
                  Can I modify the exported tests?
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">
                  Absolutely. The exported project is yours. Add helpers, change
                  structure, or extend tests as needed. Think of the export as a
                  well-structured starting point.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="re-export">
                <AccordionTrigger>
                  What happens if I update test cases and re-export?
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">
                  Each export creates a fresh project. If you've modified the
                  previous export, use version control to manage merging updates
                  from a new export.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="languages">
                <AccordionTrigger>
                  What languages are the exported projects in?
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">
                  Playwright exports use TypeScript. All other frameworks export
                  JavaScript. If your team uses Java, Python, or C#, use the
                  export as a structural reference and adapt accordingly.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </Section>

          {/* Support */}
          <Section id="support" title="Support" kicker="Help">
            <Card>
              <CardHeader>
                <CardTitle>Getting help</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-muted-foreground">
                <div>
                  <div className="font-medium text-foreground mb-2">
                    Contact options:
                  </div>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>
                      Email:{" "}
                      <span className="font-medium">support@synthqa.app</span>
                    </li>
                    <li>Use the feedback button in your dashboard</li>
                  </ul>
                </div>
                <Separator />
                <div>
                  <div className="font-medium text-foreground mb-2">
                    When reporting export issues, include:
                  </div>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Suite ID and name</li>
                    <li>Framework selected</li>
                    <li>Browser console errors (if any)</li>
                    <li>Whether download started or failed silently</li>
                  </ul>
                </div>
                <Separator />
                <div>
                  <div className="font-medium text-foreground mb-2">
                    Additional resources:
                  </div>
                  <div className="space-y-1">
                    {[
                      {
                        href: "https://playwright.dev/docs/intro",
                        label: "Playwright Documentation",
                      },
                      {
                        href: "https://docs.cypress.io",
                        label: "Cypress Documentation",
                      },
                      {
                        href: "https://www.selenium.dev/documentation/",
                        label: "Selenium Documentation",
                      },
                      {
                        href: "https://pptr.dev",
                        label: "Puppeteer Documentation",
                      },
                      {
                        href: "https://testcafe.io/documentation",
                        label: "TestCafe Documentation",
                      },
                      {
                        href: "https://webdriver.io/docs/gettingstarted",
                        label: "WebDriverIO Documentation",
                      },
                    ].map(({ href, label }) => (
                      <Link
                        key={href}
                        href={href}
                        className="flex items-center gap-2 text-primary hover:underline"
                        target="_blank"
                      >
                        <ExternalLink className="h-4 w-4" />
                        {label}
                      </Link>
                    ))}
                  </div>
                </div>
                <div className="text-xs text-muted-foreground pt-4 border-t">
                  Last updated: March 2026 · Guide version: 2.0
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
