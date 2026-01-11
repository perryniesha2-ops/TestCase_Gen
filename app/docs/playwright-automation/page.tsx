// app/(dashboard)/guides/playwright-automation/page.tsx
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

function ComparisonTable() {
  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50">
          <tr>
            <th className="p-3 text-left font-medium">Feature</th>
            <th className="p-3 text-left font-medium">Manual Testing</th>
            <th className="p-3 text-left font-medium">Playwright Automation</th>
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

export default function PlaywrightAutomationGuidePage() {
  const toc: TocItem[] = [
    {
      id: "overview",
      title: "Overview",
      icon: <BookOpen className="h-4 w-4" />,
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
            Playwright Automation Guide
          </h1>
          <p className="max-w-2xl text-muted-foreground">
            Export your test suites as complete, ready-to-run Playwright
            automation projects. Turn manual test cases into executable
            automation in minutes.
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
          {/* Overview */}
          <Section id="overview" title="Overview" kicker="Introduction">
            <Card>
              <CardHeader>
                <CardTitle>What is Playwright Automation Export?</CardTitle>
                <CardDescription>
                  Transform your manual test cases into executable Playwright
                  automation.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <p>
                  The Playwright Automation Export feature converts your SynthQA
                  test suites into complete, production-ready Playwright test
                  projects that you can run locally or integrate with your CI/CD
                  pipeline.
                </p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>One-click export of entire test suites</li>
                  <li>Complete TypeScript project with all dependencies</li>
                  <li>Pre-configured Playwright settings and test structure</li>
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
                Export transforms your test cases into a working Playwright
                project in seconds. You'll get a complete project structure,
                dependencies, configuration, and test specifications - ready to
                run immediately.
              </AlertDescription>
            </Alert>

            <ComparisonTable />

            <Card>
              <CardHeader>
                <CardTitle>Prerequisites</CardTitle>
                <CardDescription>
                  What you need before exporting tests.
                </CardDescription>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                <ul className="list-disc pl-5 space-y-1">
                  <li>Active SynthQA account</li>
                  <li>At least one test suite with test cases</li>
                  <li>
                    Node.js 18+ installed on your machine (for running tests)
                  </li>
                  <li>Basic understanding of command line operations</li>
                  <li>
                    Optional: Test cases with defined test steps for better
                    automation
                  </li>
                </ul>
              </CardContent>
            </Card>
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
                      <h3 className="font-semibold">Export</h3>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Click "Export to Playwright" to download a complete test
                      automation project as a ZIP file.
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
                First-time setup: 5-10 minutes. Subsequent exports: 2-3 minutes
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
                      <li>
                        Click on any test suite row to open the suite drawer
                      </li>
                      <li>Click the "Automation" button in the drawer</li>
                      <li>
                        You'll be redirected to the Automation Hub for that
                        suite
                      </li>
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
                  Step 2: Review Automation Stats
                </AccordionTrigger>
                <AccordionContent className="space-y-3 text-sm text-muted-foreground">
                  <p>
                    The Automation Hub displays key metrics about your suite's
                    readiness for automation.
                  </p>

                  <div className="grid md:grid-cols-2 gap-3">
                    <div className="p-3 rounded-lg border">
                      <div className="font-medium text-foreground text-sm mb-2">
                        Total Tests
                      </div>
                      <p className="text-xs">
                        Number of test cases in this suite
                      </p>
                    </div>

                    <div className="p-3 rounded-lg border">
                      <div className="font-medium text-foreground text-sm mb-2">
                        Automation Ready
                      </div>
                      <p className="text-xs">
                        Test cases that have defined test steps and can be
                        exported
                      </p>
                    </div>

                    <div className="p-3 rounded-lg border">
                      <div className="font-medium text-foreground text-sm mb-2">
                        With Metadata
                      </div>
                      <p className="text-xs">
                        Test cases enhanced with automation metadata (selectors,
                        URLs)
                      </p>
                    </div>

                    <div className="p-3 rounded-lg border">
                      <div className="font-medium text-foreground text-sm mb-2">
                        Suite Type
                      </div>
                      <p className="text-xs">
                        Manual, regression, smoke, or integration testing
                      </p>
                    </div>
                  </div>

                  <Alert>
                    <CheckCircle2 className="h-4 w-4" />
                    <AlertTitle>Ready indicator</AlertTitle>
                    <AlertDescription>
                      Test cases with defined steps are ready for export. The
                      more steps you define, the more complete your exported
                      tests will be.
                    </AlertDescription>
                  </Alert>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="step3">
                <AccordionTrigger>Step 3: Review Test Cases</AccordionTrigger>
                <AccordionContent className="space-y-3 text-sm text-muted-foreground">
                  <p>
                    The Automation Hub shows all test cases in your suite with
                    readiness badges.
                  </p>

                  <div>
                    <div className="font-medium text-foreground mb-2">
                      Badge indicators:
                    </div>
                    <div className="space-y-2 text-xs">
                      <div className="flex items-center gap-2">
                        <Badge variant="default" className="text-xs">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Ready
                        </Badge>
                        <span>Test case has steps and can be exported</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          Needs Steps
                        </Badge>
                        <span>Test case needs test steps defined</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          <Zap className="h-3 w-3 mr-1" />
                          Enhanced
                        </Badge>
                        <span>
                          Test case has automation metadata for pre-filled tests
                        </span>
                      </div>
                    </div>
                  </div>

                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertTitle>Incomplete tests</AlertTitle>
                    <AlertDescription>
                      Test cases without steps will still be exported but will
                      contain TODO placeholders that you'll need to implement
                      manually.
                    </AlertDescription>
                  </Alert>
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
                  How to export your test suite as a Playwright project.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-muted-foreground">
                <div>
                  <div className="font-medium text-foreground mb-2">
                    Export locations:
                  </div>
                  <p className="mb-2">
                    The "Export to Playwright" button appears in three places:
                  </p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Automation Hub header (top-right)</li>
                    <li>Overview tab - in the "Ready to Automate?" card</li>
                    <li>
                      Export & Setup tab - centered with detailed instructions
                    </li>
                  </ul>
                </div>

                <Separator />

                <div>
                  <div className="font-medium text-foreground mb-2">
                    What happens when you export:
                  </div>
                  <ol className="list-decimal pl-5 space-y-1">
                    <li>Click "Export to Playwright"</li>
                    <li>
                      System generates a complete Playwright project (5-10
                      seconds)
                    </li>
                    <li>
                      ZIP file downloads automatically to your Downloads folder
                    </li>
                    <li>
                      File name format:{" "}
                      <code className="px-1 py-0.5 rounded bg-muted text-xs">
                        synthqa-playwright-[suite-name].zip
                      </code>
                    </li>
                  </ol>
                </div>

                <Alert>
                  <Download className="h-4 w-4" />
                  <AlertTitle>Download confirmation</AlertTitle>
                  <AlertDescription>
                    You'll see a success notification showing the export was
                    successful. Check your browser's download folder for the ZIP
                    file.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>

            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="export-contents">
                <AccordionTrigger>
                  What's included in the export
                </AccordionTrigger>
                <AccordionContent className="space-y-3 text-sm text-muted-foreground">
                  <p>
                    Every export includes a complete, ready-to-run Playwright
                    project:
                  </p>

                  <div className="space-y-2">
                    <div className="p-3 rounded-lg border bg-muted/20">
                      <div className="font-medium text-foreground mb-1 text-xs">
                        Project Configuration:
                      </div>
                      <ul className="text-xs space-y-1">
                        <li>
                          • <code>package.json</code> - Dependencies and scripts
                        </li>
                        <li>
                          • <code>playwright.config.ts</code> - Playwright
                          settings
                        </li>
                        <li>
                          • <code>tsconfig.json</code> - TypeScript
                          configuration
                        </li>
                        <li>
                          • <code>.env.example</code> - Environment variables
                          template
                        </li>
                        <li>
                          • <code>.gitignore</code> - Git ignore rules
                        </li>
                      </ul>
                    </div>

                    <div className="p-3 rounded-lg border bg-muted/20">
                      <div className="font-medium text-foreground mb-1 text-xs">
                        Test Files:
                      </div>
                      <ul className="text-xs space-y-1">
                        <li>
                          • <code>tests/cases/*.spec.ts</code> - TypeScript test
                          specifications
                        </li>
                        <li>
                          • <code>synthqa/suite.json</code> - Suite metadata
                        </li>
                        <li>
                          • <code>synthqa/cases/*.json</code> - Test data
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
                          • <code>README.md</code> - Setup and usage
                          instructions
                        </li>
                        <li>• Installation guide</li>
                        <li>• Running tests guide</li>
                        <li>• Troubleshooting tips</li>
                      </ul>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="export-tips">
                <AccordionTrigger>Export best practices</AccordionTrigger>
                <AccordionContent className="space-y-3 text-sm text-muted-foreground">
                  <ul className="list-disc pl-5 space-y-1">
                    <li>
                      Export from the Automation Hub for better context and
                      stats
                    </li>
                    <li>
                      Review your test cases before exporting to ensure they
                      have steps
                    </li>
                    <li>
                      Use descriptive suite names - they become your project
                      folder names
                    </li>
                    <li>
                      Export regularly as you update test cases to keep
                      automation in sync
                    </li>
                    <li>
                      Consider adding automation metadata for pre-filled
                      selectors (see Enhancement section)
                    </li>
                  </ul>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </Section>

          {/* Project Structure */}
          <Section
            id="project-structure"
            title="Project Structure"
            kicker="Understanding"
          >
            <Card>
              <CardHeader>
                <CardTitle>Exported project layout</CardTitle>
                <CardDescription>
                  Understanding the structure of your downloaded Playwright
                  project.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <div className="p-3 rounded-lg border bg-muted/20 font-mono text-xs">
                  <pre className="text-muted-foreground whitespace-pre">
                    {`synthqa-playwright-suite-name/
├── tests/
│   └── cases/
│       ├── test-case-1.spec.ts
│       ├── test-case-2.spec.ts
│       └── test-case-3.spec.ts
├── synthqa/
│   ├── suite.json
│   └── cases/
│       ├── test-case-1.json
│       ├── test-case-2.json
│       └── test-case-3.json
├── package.json
├── playwright.config.ts
├── tsconfig.json
├── .env.example
├── .gitignore
└── README.md`}
                  </pre>
                </div>
              </CardContent>
            </Card>

            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="tests-folder">
                <AccordionTrigger>tests/cases/ directory</AccordionTrigger>
                <AccordionContent className="space-y-3 text-sm text-muted-foreground">
                  <p>
                    Contains executable TypeScript test specifications. Each
                    test case from your suite becomes a separate{" "}
                    <code>.spec.ts</code> file.
                  </p>

                  <div className="p-3 rounded-lg border bg-muted/20 font-mono text-xs">
                    <div className="text-foreground mb-2">
                      Example test file structure:
                    </div>
                    <pre className="text-muted-foreground whitespace-pre-wrap">
                      {`import { test, expect } from '@playwright/test';

test.describe('User Login Test', () => {
  test('should successfully log in', async ({ page }) => {
    // Step 1: Navigate to login page
    await page.goto('/login');
    
    // Step 2: Enter credentials
    await page.fill('#email', 'user@example.com');
    await page.fill('#password', 'password123');
    
    // Step 3: Click login button
    await page.click('button[type="submit"]');
    
    // Assertion: Verify successful login
    await expect(page).toHaveURL('/dashboard');
  });
});`}
                    </pre>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="synthqa-folder">
                <AccordionTrigger>synthqa/ directory</AccordionTrigger>
                <AccordionContent className="space-y-3 text-sm text-muted-foreground">
                  <p>
                    Contains JSON snapshots of your test data for reference and
                    potential data-driven testing.
                  </p>

                  <div>
                    <div className="font-medium text-foreground mb-2">
                      Files:
                    </div>
                    <ul className="list-disc pl-5 space-y-1">
                      <li>
                        <code>suite.json</code> - Suite metadata (name,
                        description, type)
                      </li>
                      <li>
                        <code>cases/*.json</code> - Individual test case data
                        with steps
                      </li>
                    </ul>
                  </div>

                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertTitle>Reference data</AlertTitle>
                    <AlertDescription>
                      These JSON files serve as reference material. You can use
                      them to build data-driven tests or simply as
                      documentation.
                    </AlertDescription>
                  </Alert>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="config-files">
                <AccordionTrigger>Configuration files</AccordionTrigger>
                <AccordionContent className="space-y-3 text-sm text-muted-foreground">
                  <div className="space-y-3">
                    <div>
                      <div className="font-medium text-foreground mb-1">
                        playwright.config.ts
                      </div>
                      <p className="text-xs">
                        Pre-configured with sensible defaults: headless mode,
                        screenshots on failure, videos on first retry, HTML
                        reporter.
                      </p>
                    </div>

                    <div>
                      <div className="font-medium text-foreground mb-1">
                        package.json
                      </div>
                      <p className="text-xs">
                        Includes Playwright dependencies and helpful npm
                        scripts:
                        <code className="mx-1 px-1 py-0.5 rounded bg-muted">
                          test
                        </code>
                        ,
                        <code className="mx-1 px-1 py-0.5 rounded bg-muted">
                          test:headed
                        </code>
                        ,
                        <code className="mx-1 px-1 py-0.5 rounded bg-muted">
                          test:debug
                        </code>
                      </p>
                    </div>

                    <div>
                      <div className="font-medium text-foreground mb-1">
                        .env.example
                      </div>
                      <p className="text-xs">
                        Template for environment variables. Copy to{" "}
                        <code>.env</code> and configure BASE_URL and other
                        settings.
                      </p>
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
                    <li>
                      Locate the downloaded ZIP file in your Downloads folder
                    </li>
                    <li>
                      Extract to your desired location (e.g.,{" "}
                      <code>~/projects/</code>)
                    </li>
                    <li>Navigate to the extracted folder in your terminal</li>
                  </ol>

                  <div className="p-3 rounded-lg border bg-muted/20 font-mono text-xs">
                    <pre className="text-muted-foreground">
                      {`cd ~/projects/synthqa-playwright-suite-name`}
                    </pre>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="install">
                <AccordionTrigger>
                  Step 2: Install dependencies
                </AccordionTrigger>
                <AccordionContent className="space-y-3 text-sm text-muted-foreground">
                  <p>Install Node.js dependencies and Playwright browsers.</p>

                  <Tabs defaultValue="pnpm" className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value="pnpm">pnpm</TabsTrigger>
                      <TabsTrigger value="npm">npm</TabsTrigger>
                      <TabsTrigger value="yarn">yarn</TabsTrigger>
                    </TabsList>

                    <TabsContent value="pnpm" className="space-y-3 mt-3">
                      <div className="p-3 rounded-lg border bg-muted/20 font-mono text-xs">
                        <pre className="text-muted-foreground">
                          {`# Install dependencies
pnpm install

# Install Playwright browsers
npx playwright install`}
                        </pre>
                      </div>
                    </TabsContent>

                    <TabsContent value="npm" className="space-y-3 mt-3">
                      <div className="p-3 rounded-lg border bg-muted/20 font-mono text-xs">
                        <pre className="text-muted-foreground">
                          {`# Install dependencies
npm install

# Install Playwright browsers
npx playwright install`}
                        </pre>
                      </div>
                    </TabsContent>

                    <TabsContent value="yarn" className="space-y-3 mt-3">
                      <div className="p-3 rounded-lg border bg-muted/20 font-mono text-xs">
                        <pre className="text-muted-foreground">
                          {`# Install dependencies
yarn install

# Install Playwright browsers
npx playwright install`}
                        </pre>
                      </div>
                    </TabsContent>
                  </Tabs>

                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertTitle>First-time Playwright setup</AlertTitle>
                    <AlertDescription>
                      <code className="mr-1">npx playwright install</code>{" "}
                      downloads browser binaries (Chromium, Firefox, WebKit).
                      This is a one-time download of ~500MB.
                    </AlertDescription>
                  </Alert>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="configure">
                <AccordionTrigger>
                  Step 3: Configure environment
                </AccordionTrigger>
                <AccordionContent className="space-y-3 text-sm text-muted-foreground">
                  <p>
                    Set up your environment variables for the application under
                    test.
                  </p>

                  <ol className="list-decimal pl-5 space-y-1">
                    <li>
                      Copy <code>.env.example</code> to <code>.env</code>
                    </li>
                    <li>
                      Edit <code>.env</code> and set your BASE_URL
                    </li>
                    <li>Add any other environment-specific variables</li>
                  </ol>

                  <div className="p-3 rounded-lg border bg-muted/20 font-mono text-xs">
                    <div className="text-foreground mb-2">
                      Example .env file:
                    </div>
                    <pre className="text-muted-foreground">
                      {`BASE_URL=https://staging.myapp.com
API_URL=https://api.staging.myapp.com
TEST_USERNAME=test@example.com
TEST_PASSWORD=Test123!`}
                    </pre>
                  </div>

                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Security reminder</AlertTitle>
                    <AlertDescription>
                      Never commit the <code>.env</code> file to version
                      control. It's already in <code>.gitignore</code>.
                    </AlertDescription>
                  </Alert>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="implement">
                <AccordionTrigger>
                  Step 4: Implement test details
                </AccordionTrigger>
                <AccordionContent className="space-y-3 text-sm text-muted-foreground">
                  <p>
                    Review and complete any TODO placeholders in your test
                    files.
                  </p>

                  <div>
                    <div className="font-medium text-foreground mb-2">
                      What to implement:
                    </div>
                    <ul className="list-disc pl-5 space-y-1">
                      <li>Element selectors (IDs, CSS selectors, test IDs)</li>
                      <li>Specific assertions and expected values</li>
                      <li>Wait conditions for dynamic content</li>
                      <li>Test data and input values</li>
                    </ul>
                  </div>

                  <Alert>
                    <Zap className="h-4 w-4" />
                    <AlertTitle>Pre-filled tests</AlertTitle>
                    <AlertDescription>
                      If your test cases have automation metadata (selectors,
                      URLs), many TODOs will already be filled in. See the
                      Enhancement section to learn about automation metadata.
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
                <CardTitle>Running your Playwright tests</CardTitle>
                <CardDescription>
                  Different ways to execute your automated tests.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-3 gap-3">
                  <div className="p-3 rounded-lg border">
                    <div className="flex items-center gap-2 mb-2">
                      <Terminal className="h-4 w-4 text-primary" />
                      <div className="font-medium text-foreground text-sm">
                        Headless Mode
                      </div>
                    </div>
                    <p className="text-xs mb-2 text-muted-foreground">
                      Fast execution without browser UI. Best for CI/CD.
                    </p>
                    <div className="p-2 rounded bg-muted font-mono text-xs">
                      pnpm test
                    </div>
                  </div>

                  <div className="p-3 rounded-lg border">
                    <div className="flex items-center gap-2 mb-2">
                      <PlayCircle className="h-4 w-4 text-primary" />
                      <div className="font-medium text-foreground text-sm">
                        Headed Mode
                      </div>
                    </div>
                    <p className="text-xs mb-2 text-muted-foreground">
                      See browser UI during test execution.
                    </p>
                    <div className="p-2 rounded bg-muted font-mono text-xs">
                      pnpm test:headed
                    </div>
                  </div>

                  <div className="p-3 rounded-lg border">
                    <div className="flex items-center gap-2 mb-2">
                      <Settings className="h-4 w-4 text-primary" />
                      <div className="font-medium text-foreground text-sm">
                        Debug Mode
                      </div>
                    </div>
                    <p className="text-xs mb-2 text-muted-foreground">
                      Step through tests with Playwright Inspector.
                    </p>
                    <div className="p-2 rounded bg-muted font-mono text-xs">
                      pnpm test:debug
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="run-all">
                <AccordionTrigger>Running all tests</AccordionTrigger>
                <AccordionContent className="space-y-3 text-sm text-muted-foreground">
                  <p>Run the entire test suite:</p>

                  <div className="p-3 rounded-lg border bg-muted/20 font-mono text-xs">
                    <pre className="text-muted-foreground">
                      {`# Run all tests in headless mode
pnpm test

# Run all tests and show browser
pnpm test:headed`}
                    </pre>
                  </div>

                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertTitle>Test results</AlertTitle>
                    <AlertDescription>
                      After tests complete, an HTML report opens automatically
                      showing pass/fail status, screenshots, and videos for
                      failed tests.
                    </AlertDescription>
                  </Alert>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="run-specific">
                <AccordionTrigger>Running specific tests</AccordionTrigger>
                <AccordionContent className="space-y-3 text-sm text-muted-foreground">
                  <p>Run a single test file or filter by name:</p>

                  <div className="p-3 rounded-lg border bg-muted/20 font-mono text-xs">
                    <pre className="text-muted-foreground whitespace-pre-wrap">
                      {`# Run a specific test file
npx playwright test tests/cases/login.spec.ts

# Run tests matching a pattern
npx playwright test --grep "login"

# Run tests in a specific browser
npx playwright test --project=chromium`}
                    </pre>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="debugging">
                <AccordionTrigger>Debugging failed tests</AccordionTrigger>
                <AccordionContent className="space-y-3 text-sm text-muted-foreground">
                  <div>
                    <div className="font-medium text-foreground mb-2">
                      Debugging strategies:
                    </div>
                    <ul className="list-disc pl-5 space-y-1">
                      <li>
                        Use <code>pnpm test:debug</code> to step through tests
                      </li>
                      <li>
                        Check screenshots automatically captured for failed
                        tests
                      </li>
                      <li>Watch videos of failed test executions</li>
                      <li>
                        Use Playwright Inspector to pause and inspect elements
                      </li>
                      <li>
                        Add <code>await page.pause()</code> to stop at specific
                        points
                      </li>
                    </ul>
                  </div>

                  <div className="p-3 rounded-lg border bg-muted/20 font-mono text-xs">
                    <pre className="text-muted-foreground">
                      {`# Debug a specific test
npx playwright test login.spec.ts --debug

# Show trace viewer for last run
npx playwright show-trace`}
                    </pre>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="ci-cd">
                <AccordionTrigger>CI/CD integration</AccordionTrigger>
                <AccordionContent className="space-y-3 text-sm text-muted-foreground">
                  <p>Integrate your tests into your CI/CD pipeline:</p>

                  <div className="p-3 rounded-lg border bg-muted/20 font-mono text-xs">
                    <div className="text-foreground mb-2">
                      GitHub Actions example:
                    </div>
                    <pre className="text-muted-foreground whitespace-pre-wrap">
                      {`name: Playwright Tests
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
          path: playwright-report/`}
                    </pre>
                  </div>

                  <Alert>
                    <Rocket className="h-4 w-4" />
                    <AlertTitle>Automated testing</AlertTitle>
                    <AlertDescription>
                      Run tests on every commit, pull request, or deployment to
                      catch issues early and maintain quality.
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
                  Pre-fill your tests with selectors, URLs, and test data.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <p>
                  Instead of exporting tests with TODO placeholders, you can
                  enhance your test cases with automation metadata to generate
                  pre-filled, ready-to-run tests.
                </p>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg border">
                    <div className="font-medium text-foreground mb-2 text-sm">
                      ❌ Without metadata
                    </div>
                    <div className="p-2 rounded bg-muted/50 font-mono text-xs">
                      <pre className="whitespace-pre-wrap text-muted-foreground">
                        {`// TODO: Navigate to login page
await page.goto('???');

// TODO: Fill email field
await page.fill('???', '???');`}
                      </pre>
                    </div>
                  </div>

                  <div className="p-4 rounded-lg border">
                    <div className="font-medium text-foreground mb-2 text-sm">
                      ✅ With metadata
                    </div>
                    <div className="p-2 rounded bg-muted/50 font-mono text-xs">
                      <pre className="whitespace-pre-wrap text-muted-foreground">
                        {`// Navigate to login page
await page.goto('/login');

// Fill email field
await page.fill('#email', 
  'test@example.com');`}
                      </pre>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="what-is-metadata">
                <AccordionTrigger>
                  What is automation metadata?
                </AccordionTrigger>
                <AccordionContent className="space-y-3 text-sm text-muted-foreground">
                  <p>
                    Automation metadata is additional data you can add to test
                    cases:
                  </p>

                  <ul className="list-disc pl-5 space-y-1">
                    <li>Base URLs and navigation paths</li>
                    <li>Element selectors (CSS, XPath, test IDs)</li>
                    <li>Test credentials (username/password)</li>
                    <li>Input values and test data</li>
                    <li>Wait conditions and timeouts</li>
                  </ul>

                  <Alert>
                    <Zap className="h-4 w-4" />
                    <AlertTitle>80% time savings</AlertTitle>
                    <AlertDescription>
                      With automation metadata, tests are 90% ready to run. You
                      only need to verify and fine-tune instead of implementing
                      from scratch.
                    </AlertDescription>
                  </Alert>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="add-metadata">
                <AccordionTrigger>
                  How to add automation metadata
                </AccordionTrigger>
                <AccordionContent className="space-y-3 text-sm text-muted-foreground">
                  <p>Adding metadata requires a database update first:</p>

                  <ol className="list-decimal pl-5 space-y-1">
                    <li>
                      Add the <code>automation_metadata</code> column to your
                      database (one-time setup)
                    </li>
                    <li>
                      When creating/editing test cases, toggle on "Automation
                      mode"
                    </li>
                    <li>
                      Fill in selectors, URLs, and test data for each step
                    </li>
                    <li>See live preview of generated Playwright code</li>
                    <li>
                      Export tests - they'll be pre-filled with your metadata
                    </li>
                  </ol>

                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertTitle>Optional enhancement</AlertTitle>
                    <AlertDescription>
                      Automation metadata is completely optional. Tests work
                      fine without it - you'll just have more TODOs to fill in
                      manually.
                    </AlertDescription>
                  </Alert>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="execution-tracking">
                <AccordionTrigger>Execution history tracking</AccordionTrigger>
                <AccordionContent className="space-y-3 text-sm text-muted-foreground">
                  <p>Track test execution results over time:</p>

                  <ul className="list-disc pl-5 space-y-1">
                    <li>See pass/fail history for each suite</li>
                    <li>Identify flaky tests that sometimes fail</li>
                    <li>Track execution duration trends</li>
                    <li>View screenshots and logs for failed tests</li>
                    <li>Compare results across environments</li>
                  </ul>

                  <div>
                    <div className="font-medium text-foreground mb-2">
                      Setup required:
                    </div>
                    <ol className="list-decimal pl-5 space-y-1 text-xs">
                      <li>Add execution tracking tables to database</li>
                      <li>Include custom Playwright reporter in exports</li>
                      <li>Configure webhook endpoint for results</li>
                      <li>View execution history in Automation Hub</li>
                    </ol>
                  </div>

                  <Alert>
                    <TrendingUp className="h-4 w-4" />
                    <AlertTitle>Continuous improvement</AlertTitle>
                    <AlertDescription>
                      Execution tracking helps identify problematic tests and
                      track quality trends over time. Great for data-driven
                      decision making.
                    </AlertDescription>
                  </Alert>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </Section>

          {/* Best Practices */}
          <Section id="best-practices" title="Best Practices" kicker="Quality">
            <Card>
              <CardHeader>
                <CardTitle>Test organization</CardTitle>
                <CardDescription>
                  Structuring tests for maintainability and clarity.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid md:grid-cols-2 gap-6">
                <div className="space-y-3 text-sm">
                  <div className="font-medium text-foreground">✅ Do</div>
                  <ul className="space-y-2 text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                      <span>One test suite per feature or user flow</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                      <span>Define clear test steps before exporting</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                      <span>Use descriptive test and suite names</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                      <span>Keep tests independent and isolated</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                      <span>Use test data from environment variables</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                      <span>Re-export when test cases are updated</span>
                    </li>
                  </ul>
                </div>

                <div className="space-y-3 text-sm">
                  <div className="font-medium text-foreground">❌ Avoid</div>
                  <ul className="space-y-2 text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
                      <span>Tests that depend on each other</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
                      <span>Hardcoded URLs and credentials in tests</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
                      <span>Exporting without defined test steps</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
                      <span>Mixing multiple features in one suite</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
                      <span>Ignoring failed tests without investigation</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
                      <span>Committing .env files to version control</span>
                    </li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Selector strategies</CardTitle>
                <CardDescription>
                  Choosing the right selectors for reliable tests.
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
                      ⚠️ OK: IDs/Names
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
                    <div>Fragile, changes frequently with styling</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Version control</CardTitle>
                <CardDescription>
                  Managing your test automation in Git.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <ul className="list-disc pl-5 space-y-1">
                  <li>Initialize Git in your exported project directory</li>
                  <li>
                    Commit the entire project (the .gitignore is pre-configured)
                  </li>
                  <li>Create branches for test updates</li>
                  <li>Use pull requests for test review</li>
                  <li>Tag releases that match your application versions</li>
                </ul>

                <div className="p-3 rounded-lg border bg-muted/20 font-mono text-xs">
                  <pre className="text-muted-foreground">
                    {`git init
git add .
git commit -m "Initial Playwright tests export"
git remote add origin <your-repo-url>
git push -u origin main`}
                  </pre>
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
                  <div>
                    <div className="font-medium text-foreground mb-2">
                      Possible causes:
                    </div>
                    <ul className="list-disc pl-5 space-y-1">
                      <li>
                        Browser blocking downloads - check download permissions
                      </li>
                      <li>
                        Ad blocker interfering - try disabling temporarily
                      </li>
                      <li>Network issue - check console for errors</li>
                      <li>
                        API route not configured - verify export route exists
                      </li>
                    </ul>
                  </div>

                  <div>
                    <div className="font-medium text-foreground mb-2">
                      Solutions:
                    </div>
                    <ol className="list-decimal pl-5 space-y-1">
                      <li>Check browser console (F12) for error messages</li>
                      <li>Try a different browser</li>
                      <li>
                        Verify the API route at{" "}
                        <code>/api/automation/export/playwright</code>
                      </li>
                      <li>Check network tab for failed requests</li>
                    </ol>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="install-fails">
                <AccordionTrigger>Installation fails or hangs</AccordionTrigger>
                <AccordionContent className="space-y-3 text-sm text-muted-foreground">
                  <div>
                    <div className="font-medium text-foreground mb-2">
                      Common solutions:
                    </div>
                    <ul className="list-disc pl-5 space-y-1">
                      <li>
                        Ensure Node.js 18+ is installed:{" "}
                        <code>node --version</code>
                      </li>
                      <li>
                        Clear npm cache: <code>npm cache clean --force</code>
                      </li>
                      <li>
                        Delete <code>node_modules</code> and reinstall
                      </li>
                      <li>Try a different package manager (pnpm, npm, yarn)</li>
                      <li>
                        Check internet connection for downloading Playwright
                        browsers
                      </li>
                    </ul>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="tests-fail">
                <AccordionTrigger>All tests fail immediately</AccordionTrigger>
                <AccordionContent className="space-y-3 text-sm text-muted-foreground">
                  <div>
                    <div className="font-medium text-foreground mb-2">
                      Check these:
                    </div>
                    <ul className="list-disc pl-5 space-y-1">
                      <li>
                        Is BASE_URL set correctly in <code>.env</code>?
                      </li>
                      <li>
                        Is the application actually running and accessible?
                      </li>
                      <li>
                        Are Playwright browsers installed? Run{" "}
                        <code>npx playwright install</code>
                      </li>
                      <li>Are selectors correct for your application?</li>
                      <li>
                        Check screenshots in <code>test-results/</code> folder
                      </li>
                    </ul>
                  </div>

                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertTitle>First run failures</AlertTitle>
                    <AlertDescription>
                      It's normal for tests to fail on first run if they contain
                      TODOs or if selectors need adjustment for your specific
                      application.
                    </AlertDescription>
                  </Alert>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="slow-tests">
                <AccordionTrigger>Tests run very slowly</AccordionTrigger>
                <AccordionContent className="space-y-3 text-sm text-muted-foreground">
                  <div>
                    <div className="font-medium text-foreground mb-2">
                      Optimization strategies:
                    </div>
                    <ul className="list-disc pl-5 space-y-1">
                      <li>Run in headless mode (default): faster execution</li>
                      <li>
                        Reduce wait times - remove unnecessary{" "}
                        <code>page.waitForTimeout()</code>
                      </li>
                      <li>
                        Use parallel execution: configure <code>workers</code>{" "}
                        in playwright.config.ts
                      </li>
                      <li>Optimize selectors - use fast, specific selectors</li>
                      <li>Disable video recording for passing tests</li>
                    </ul>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="automation-hub-error">
                <AccordionTrigger>
                  "Suite not found" error in Automation Hub
                </AccordionTrigger>
                <AccordionContent className="space-y-3 text-sm text-muted-foreground">
                  <div>
                    <div className="font-medium text-foreground mb-2">
                      This error occurs when:
                    </div>
                    <ul className="list-disc pl-5 space-y-1">
                      <li>
                        Database query is missing <code>user_id</code> filter
                        (RLS issue)
                      </li>
                      <li>
                        The <code>automation_metadata</code> column doesn't
                        exist
                      </li>
                      <li>Suite ID in URL is incorrect</li>
                    </ul>
                  </div>

                  <div>
                    <div className="font-medium text-foreground mb-2">
                      Solutions:
                    </div>
                    <ol className="list-decimal pl-5 space-y-1">
                      <li>
                        Run the database migration to add{" "}
                        <code>automation_metadata</code> column
                      </li>
                      <li>Check browser console for specific error messages</li>
                      <li>Verify suite exists in database</li>
                      <li>Check RLS policies allow reading test_suites</li>
                    </ol>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </Section>

          {/* FAQ */}
          <Section id="faq" title="Frequently Asked Questions" kicker="FAQ">
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="cost">
                <AccordionTrigger>
                  Is Playwright export included in my plan?
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">
                  Yes! Playwright export is available on all plans including
                  free. There are no additional charges or limits for exporting
                  test suites.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="languages">
                <AccordionTrigger>
                  Can I export tests in other languages?
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">
                  Currently, exports are TypeScript only. Support for
                  JavaScript, Python, and C# is planned for future releases.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="modify">
                <AccordionTrigger>
                  Can I modify the exported tests?
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">
                  Absolutely! The exported project is yours to modify. Add
                  custom helpers, change test structure, add more tests -
                  whatever you need. Think of the export as a starting point.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="re-export">
                <AccordionTrigger>
                  What happens if I update test cases and re-export?
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">
                  Each export creates a fresh project. If you've modified the
                  previously exported tests, you'll need to manually merge your
                  changes or use version control to manage updates.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="frameworks">
                <AccordionTrigger>
                  Why Playwright instead of Selenium or Cypress?
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">
                  Playwright offers modern features: auto-waiting, multiple
                  browsers, mobile emulation, network interception, and
                  excellent debugging tools. It's also faster and more reliable
                  for modern web apps. Support for other frameworks may be added
                  in the future.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="browsers">
                <AccordionTrigger>
                  Which browsers are supported?
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">
                  Exported projects are configured for Chromium, Firefox, and
                  WebKit (Safari). You can run tests in all three browsers or
                  configure specific browsers in
                  <code className="ml-1">playwright.config.ts</code>.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="metadata-required">
                <AccordionTrigger>
                  Do I need to add automation metadata?
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">
                  No, it's optional. Tests export fine without it - they'll just
                  have more TODO placeholders to fill in. Metadata saves time by
                  pre-filling selectors, URLs, and test data.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="empty-suite">
                <AccordionTrigger>
                  Can I export a suite with no test cases?
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">
                  Yes, but it's not useful. The export will contain the project
                  structure but no test files. Add test cases to your suite
                  before exporting.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </Section>

          {/* Support */}
          <Section id="support" title="Support" kicker="Help">
            <Card>
              <CardHeader>
                <CardTitle>Getting help</CardTitle>
                <CardDescription>
                  Resources and contact information for assistance.
                </CardDescription>
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
                    <li>Use the feedback button in the dashboard</li>
                    <li>Check our knowledge base for common issues</li>
                  </ul>
                </div>

                <Separator />

                <div>
                  <div className="font-medium text-foreground mb-2">
                    When reporting export issues, include:
                  </div>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Suite ID and name</li>
                    <li>Number of test cases in the suite</li>
                    <li>Browser console errors (if any)</li>
                    <li>Whether download started or failed silently</li>
                  </ul>
                </div>

                <Separator />

                <div>
                  <div className="font-medium text-foreground mb-2">
                    When reporting test execution issues, include:
                  </div>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>
                      Playwright version: <code>npx playwright --version</code>
                    </li>
                    <li>
                      Node version: <code>node --version</code>
                    </li>
                    <li>Operating system</li>
                    <li>Error messages and stack traces</li>
                    <li>Screenshots or videos if available</li>
                  </ul>
                </div>

                <Separator />

                <div>
                  <div className="font-medium text-foreground mb-2">
                    Additional resources:
                  </div>
                  <div className="space-y-1">
                    <Link
                      href="https://playwright.dev/docs/intro"
                      className="flex items-center gap-2 text-primary hover:underline"
                      target="_blank"
                    >
                      <ExternalLink className="h-4 w-4" />
                      Official Playwright Documentation
                    </Link>
                    <Link
                      href="https://playwright.dev/docs/best-practices"
                      className="flex items-center gap-2 text-primary hover:underline"
                      target="_blank"
                    >
                      <ExternalLink className="h-4 w-4" />
                      Playwright Best Practices
                    </Link>
                    <Link
                      href="/docs/requirements"
                      className="flex items-center gap-2 text-primary hover:underline"
                    >
                      <FileText className="h-4 w-4" />
                      Requirements Management Guide
                    </Link>
                  </div>
                </div>

                <div className="text-xs text-muted-foreground pt-4 border-t">
                  Last updated: January 2026 · Guide version: 1.0
                </div>
              </CardContent>
            </Card>
          </Section>
        </main>
        <div className="h-2" />
      </div>
      <SiteFooter />
    </div>
  );
}
