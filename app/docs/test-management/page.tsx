// app/(dashboard)/guides/test-management/page.tsx
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
  FileText,
  Play,
  HelpCircle,
  Layers,
  FlaskConical,
  Clock,
  BarChart3,
  Target,
  Monitor,
  Smartphone,
  Globe,
  ListChecks,
  Zap,
  Upload,
  Settings,
  Sparkles,
} from "lucide-react";
import { Logo } from "@/components/pagecomponents/brandlogo";
import { Footer } from "@/components/landingpage/footer";
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

function TestTypeComparison() {
  return (
    <div className="grid md:grid-cols-2 gap-4">
      <div className="p-4 rounded-lg border bg-muted/30">
        <div className="flex items-center gap-2 mb-3">
          <FlaskConical className="h-5 w-5 text-blue-500" />
          <h3 className="font-semibold">Regular Test Cases</h3>
        </div>
        <div className="space-y-2 text-sm text-muted-foreground">
          <p>Traditional single-platform test cases with detailed steps.</p>
          <div className="text-xs space-y-1">
            <div>• Standard test execution flow</div>
            <div>• Detailed step-by-step instructions</div>
            <div>• Single platform/environment</div>
            <div>• Manual or automated execution</div>
          </div>
        </div>
      </div>

      <div className="p-4 rounded-lg border bg-muted/30">
        <div className="flex items-center gap-2 mb-3">
          <Layers className="h-5 w-5 text-purple-500" />
          <h3 className="font-semibold">Cross-Platform Tests</h3>
        </div>
        <div className="space-y-2 text-sm text-muted-foreground">
          <p>Tests designed for multiple platforms from one requirement.</p>
          <div className="text-xs space-y-1">
            <div>• Web, Mobile, API, Accessibility, Performance</div>
            <div>• Platform-specific adaptations</div>
            <div>• Approval workflow for generated tests</div>
            <div>• Framework-tagged for filtering</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SuiteTypeGuide() {
  return (
    <div className="grid md:grid-cols-2 gap-3">
      <div className="p-3 rounded-lg border">
        <div className="font-medium text-sm mb-1">Manual</div>
        <p className="text-xs text-muted-foreground">
          Interactive test execution with step-by-step tracking
        </p>
      </div>
      <div className="p-3 rounded-lg border">
        <div className="font-medium text-sm mb-1">Regression</div>
        <p className="text-xs text-muted-foreground">
          Validate existing functionality after changes
        </p>
      </div>
      <div className="p-3 rounded-lg border">
        <div className="font-medium text-sm mb-1">Smoke</div>
        <p className="text-xs text-muted-foreground">
          Quick validation of critical paths
        </p>
      </div>
      <div className="p-3 rounded-lg border">
        <div className="font-medium text-sm mb-1">Integration</div>
        <p className="text-xs text-muted-foreground">
          Test component interactions and data flow
        </p>
      </div>
    </div>
  );
}

function ExecutionStatusGuide() {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3 p-2 rounded border">
        <CheckCircle2 className="h-4 w-4 text-green-600" />
        <div className="flex-1">
          <div className="font-medium text-sm">Passed</div>
          <div className="text-xs text-muted-foreground">
            All steps completed successfully
          </div>
        </div>
        <kbd className="px-2 py-1 bg-muted rounded text-xs">P</kbd>
      </div>
      <div className="flex items-center gap-3 p-2 rounded border">
        <AlertTriangle className="h-4 w-4 text-red-600" />
        <div className="flex-1">
          <div className="font-medium text-sm">Failed</div>
          <div className="text-xs text-muted-foreground">
            Test did not meet expected results
          </div>
        </div>
        <kbd className="px-2 py-1 bg-muted rounded text-xs">F</kbd>
      </div>
      <div className="flex items-center gap-3 p-2 rounded border">
        <AlertTriangle className="h-4 w-4 text-orange-600" />
        <div className="flex-1">
          <div className="font-medium text-sm">Blocked</div>
          <div className="text-xs text-muted-foreground">
            Cannot execute due to blockers
          </div>
        </div>
        <kbd className="px-2 py-1 bg-muted rounded text-xs">B</kbd>
      </div>
      <div className="flex items-center gap-3 p-2 rounded border">
        <Clock className="h-4 w-4 text-gray-600" />
        <div className="flex-1">
          <div className="font-medium text-sm">Skipped</div>
          <div className="text-xs text-muted-foreground">
            Intentionally not executed
          </div>
        </div>
        <kbd className="px-2 py-1 bg-muted rounded text-xs">S</kbd>
      </div>
    </div>
  );
}

export default function TestManagementGuidePage() {
  const toc: TocItem[] = [
    {
      id: "overview",
      title: "Overview",
      icon: <BookOpen className="h-4 w-4" />,
    },
    {
      id: "test-cases",
      title: "Managing Test Cases",
      icon: <FileText className="h-4 w-4" />,
    },
    {
      id: "test-suites",
      title: "Test Suites",
      icon: <Layers className="h-4 w-4" />,
    },
    {
      id: "execution",
      title: "Running Tests",
      icon: <Play className="h-4 w-4" />,
    },
    {
      id: "sessions",
      title: "Test Sessions",
      icon: <Clock className="h-4 w-4" />,
    },
    {
      id: "evidence",
      title: "Test Evidence",
      icon: <Upload className="h-4 w-4" />,
    },
    {
      id: "reports",
      title: "Reports & Analytics",
      icon: <BarChart3 className="h-4 w-4" />,
    },
    {
      id: "best-practices",
      title: "Best Practices",
      icon: <CheckCircle2 className="h-4 w-4" />,
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
            Test Case Management Guide
          </h1>
          <p className="max-w-2xl text-muted-foreground">
            Comprehensive guide to managing test cases, organizing test suites,
            running test sessions, and tracking execution results.
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
          <Section id="overview" title="Overview" kicker="Getting started">
            <Card>
              <CardHeader>
                <CardTitle>What is Test Case Management?</CardTitle>
                <CardDescription>
                  A complete system for organizing, executing, and tracking your
                  testing activities.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <ul className="list-disc pl-5 space-y-1">
                  <li>
                    Create and manage test cases (regular and cross-platform)
                  </li>
                  <li>Organize tests into executable test suites</li>
                  <li>Run interactive test sessions with real-time tracking</li>
                  <li>Capture evidence with screenshots and notes</li>
                  <li>Generate execution reports and analytics</li>
                  <li>Track test history and trends over time</li>
                </ul>
              </CardContent>
            </Card>

            <TestTypeComparison />

            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>Complete workflow</AlertTitle>
              <AlertDescription>
                Generate test cases → Organize into suites → Execute in sessions
                → Review results → Generate reports. Each step builds on the
                previous one.
              </AlertDescription>
            </Alert>
          </Section>

          {/* Test Cases */}
          <Section
            id="test-cases"
            title="Managing Test Cases"
            kicker="Foundation"
          >
            <Card>
              <CardHeader>
                <CardTitle>Test case types</CardTitle>
                <CardDescription>
                  Understanding regular vs. cross-platform test cases.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Tabs defaultValue="regular" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="regular">Regular</TabsTrigger>
                    <TabsTrigger value="cross-platform">
                      Cross-Platform
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="regular" className="space-y-3 mt-4">
                    <div>
                      <div className="font-medium text-foreground mb-2">
                        Structure:
                      </div>
                      <ul className="list-disc pl-5 space-y-1 text-sm">
                        <li>Title and description</li>
                        <li>Test type (functional, security, etc.)</li>
                        <li>Priority (critical, high, medium, low)</li>
                        <li>
                          Detailed test steps with actions and expectations
                        </li>
                        <li>Expected result</li>
                        <li>Prerequisites and test data</li>
                      </ul>
                    </div>

                    <Alert>
                      <Info className="h-4 w-4" />
                      <AlertTitle>AI-generated</AlertTitle>
                      <AlertDescription>
                        Most regular test cases are generated from requirements
                        using the AI Generator, though you can create them
                        manually too.
                      </AlertDescription>
                    </Alert>
                  </TabsContent>

                  <TabsContent
                    value="cross-platform"
                    className="space-y-3 mt-4"
                  >
                    <div>
                      <div className="font-medium text-foreground mb-2">
                        Platforms supported:
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="flex items-center gap-2 p-2 rounded border">
                          <Monitor className="h-4 w-4" />
                          Web Application
                        </div>
                        <div className="flex items-center gap-2 p-2 rounded border">
                          <Smartphone className="h-4 w-4" />
                          Mobile App
                        </div>
                        <div className="flex items-center gap-2 p-2 rounded border">
                          <Globe className="h-4 w-4" />
                          API/Backend
                        </div>
                        <div className="flex items-center gap-2 p-2 rounded border">
                          <Target className="h-4 w-4" />
                          Accessibility
                        </div>
                      </div>
                    </div>

                    <div>
                      <div className="font-medium text-foreground mb-2">
                        Approval workflow:
                      </div>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2">
                          <Badge className="bg-amber-100 text-amber-800">
                            Pending
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            Awaiting review
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className="bg-green-100 text-green-800">
                            Approved
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            Ready for execution
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className="bg-red-100 text-red-800">
                            Rejected
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            Needs revision
                          </span>
                        </div>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>

            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="create">
                <AccordionTrigger>Creating test cases</AccordionTrigger>
                <AccordionContent className="space-y-3 text-sm text-muted-foreground">
                  <p>You can create test cases in two ways:</p>

                  <div className="space-y-3">
                    <div>
                      <div className="font-medium text-foreground mb-1">
                        Method 1: AI Generation (Recommended)
                      </div>
                      <ol className="list-decimal pl-5 space-y-1">
                        <li>Go to AI Test Generator</li>
                        <li>Enter or select requirements</li>
                        <li>Configure generation settings</li>
                        <li>Generate test cases</li>
                        <li>Review and approve generated tests</li>
                      </ol>
                    </div>

                    <div>
                      <div className="font-medium text-foreground mb-1">
                        Method 2: Manual Creation
                      </div>
                      <ol className="list-decimal pl-5 space-y-1">
                        <li>Go to Test Cases page</li>
                        <li>Click "New Test Case"</li>
                        <li>Fill in details and test steps</li>
                        <li>Save the test case</li>
                      </ol>
                    </div>
                  </div>

                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertTitle>AI vs. Manual</AlertTitle>
                    <AlertDescription>
                      AI generation is faster and creates comprehensive test
                      coverage. Use manual creation for unique scenarios or when
                      fine-tuning specific test cases.
                    </AlertDescription>
                  </Alert>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="organize">
                <AccordionTrigger>Organizing test cases</AccordionTrigger>
                <AccordionContent className="space-y-3 text-sm text-muted-foreground">
                  <div>
                    <div className="font-medium text-foreground mb-2">
                      Organization strategies:
                    </div>
                    <ul className="list-disc pl-5 space-y-1">
                      <li>
                        <strong>By Project:</strong> Filter and group by project
                      </li>
                      <li>
                        <strong>By Status:</strong> Draft, Active, or Archived
                      </li>
                      <li>
                        <strong>By Priority:</strong> Critical, High, Medium,
                        Low
                      </li>
                      <li>
                        <strong>By Type:</strong> Functional, Security,
                        Performance, etc.
                      </li>
                      <li>
                        <strong>In Suites:</strong> Add to test suites for
                        execution
                      </li>
                    </ul>
                  </div>

                  <div className="p-3 rounded-lg border bg-muted/20 text-xs">
                    <div className="font-medium text-foreground mb-2">
                      Best practices:
                    </div>
                    <ul className="list-disc pl-5 space-y-1">
                      <li>Set status to Active when ready for testing</li>
                      <li>
                        Use Critical/High priority for must-test scenarios
                      </li>
                      <li>Archive outdated tests instead of deleting</li>
                      <li>Link to requirements for traceability</li>
                    </ul>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="bulk">
                <AccordionTrigger>Bulk operations</AccordionTrigger>
                <AccordionContent className="space-y-3 text-sm text-muted-foreground">
                  <p>Perform actions on multiple test cases at once:</p>

                  <div className="space-y-2">
                    <div className="font-medium text-foreground">
                      Available bulk actions:
                    </div>
                    <ul className="list-disc pl-5 space-y-1">
                      <li>
                        <strong>Update Status:</strong> Change draft → active or
                        active → archived
                      </li>
                      <li>
                        <strong>Add to Suite:</strong> Bulk add to an existing
                        test suite
                      </li>
                      <li>
                        <strong>Delete:</strong> Remove multiple test cases
                      </li>
                      <li>
                        <strong>Export:</strong> Download selected tests (coming
                        soon)
                      </li>
                    </ul>
                  </div>

                  <div className="text-xs mt-2">
                    <strong>How to use:</strong> Select test cases using
                    checkboxes, then use the bulk actions toolbar that appears.
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </Section>

          {/* Test Suites */}
          <Section id="test-suites" title="Test Suites" kicker="Organization">
            <Card>
              <CardHeader>
                <CardTitle>What are test suites?</CardTitle>
                <CardDescription>
                  Collections of test cases grouped for execution and tracking.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <div>
                  <div className="font-medium text-foreground mb-2">
                    Key benefits:
                  </div>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Execute multiple related tests in one session</li>
                    <li>Track execution progress and results</li>
                    <li>Organize tests by testing phase or feature</li>
                    <li>Schedule and plan test execution</li>
                    <li>Generate suite-level reports</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            <SuiteTypeGuide />

            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="create-suite">
                <AccordionTrigger>Creating a test suite</AccordionTrigger>
                <AccordionContent className="space-y-3 text-sm text-muted-foreground">
                  <ol className="list-decimal pl-5 space-y-1">
                    <li>Navigate to Test Suites page</li>
                    <li>Click "New Test Suite"</li>
                    <li>Enter suite name and description</li>
                    <li>Select suite type (Manual, Regression, Smoke, etc.)</li>
                    <li>Assign to a project (optional)</li>
                    <li>Set planned start/end dates (optional)</li>
                    <li>Click "Create Suite"</li>
                  </ol>

                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertTitle>Empty suite</AlertTitle>
                    <AlertDescription>
                      Suites start empty. Add test cases after creation using
                      the "Manage Test Cases" button.
                    </AlertDescription>
                  </Alert>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="add-tests">
                <AccordionTrigger>Adding tests to suite</AccordionTrigger>
                <AccordionContent className="space-y-3 text-sm text-muted-foreground">
                  <Tabs defaultValue="manual" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="manual">Manual Add</TabsTrigger>
                      <TabsTrigger value="bulk">Bulk Add</TabsTrigger>
                    </TabsList>

                    <TabsContent value="manual" className="space-y-2 mt-3">
                      <ol className="list-decimal pl-5 space-y-1">
                        <li>Open the test suite</li>
                        <li>Click "Manage Test Cases"</li>
                        <li>Browse or search available test cases</li>
                        <li>Click "+" to add individual tests</li>
                        <li>Reorder using drag handles</li>
                        <li>Set priority and estimated duration</li>
                        <li>Save changes</li>
                      </ol>
                    </TabsContent>

                    <TabsContent value="bulk" className="space-y-2 mt-3">
                      <ol className="list-decimal pl-5 space-y-1">
                        <li>Go to Test Cases page</li>
                        <li>Select multiple test cases (checkboxes)</li>
                        <li>Click "Add to Suite" in bulk actions toolbar</li>
                        <li>Select the target suite</li>
                        <li>Confirm addition</li>
                      </ol>
                    </TabsContent>
                  </Tabs>

                  <div className="p-3 rounded-lg border bg-muted/20 text-xs">
                    <strong>Pro tip:</strong> Use bulk add when creating large
                    test suites. Add related tests all at once, then fine-tune
                    the order in suite management.
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="suite-status">
                <AccordionTrigger>Suite status lifecycle</AccordionTrigger>
                <AccordionContent className="space-y-3 text-sm text-muted-foreground">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 p-2 rounded border">
                      <Badge variant="outline">Draft</Badge>
                      <span className="text-xs">
                        Initial creation, not ready for execution
                      </span>
                    </div>
                    <div className="flex items-center gap-2 p-2 rounded border">
                      <Badge className="bg-green-500">Active</Badge>
                      <span className="text-xs">Ready for test execution</span>
                    </div>
                    <div className="flex items-center gap-2 p-2 rounded border">
                      <Badge variant="secondary">Completed</Badge>
                      <span className="text-xs">
                        All planned testing finished
                      </span>
                    </div>
                    <div className="flex items-center gap-2 p-2 rounded border">
                      <Badge variant="outline">Archived</Badge>
                      <span className="text-xs">No longer actively used</span>
                    </div>
                  </div>

                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertTitle>Status management</AlertTitle>
                    <AlertDescription>
                      Change status using the suite edit dialog or the three-dot
                      menu. Status doesn't block execution - it's for
                      organizational purposes.
                    </AlertDescription>
                  </Alert>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </Section>

          {/* Test Execution */}
          <Section id="execution" title="Running Tests" kicker="Execution">
            <Card>
              <CardHeader>
                <CardTitle>Test execution workflow</CardTitle>
                <CardDescription>
                  Interactive test execution with step-by-step tracking.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2 text-sm text-muted-foreground">
                  <div className="font-medium text-foreground">
                    The execution process:
                  </div>
                  <ol className="list-decimal pl-5 space-y-1">
                    <li>Start a test session from a suite</li>
                    <li>Execute tests one at a time</li>
                    <li>Mark steps as completed</li>
                    <li>Record Pass/Fail/Blocked/Skipped results</li>
                    <li>Add notes and capture evidence</li>
                    <li>Track overall session progress</li>
                    <li>Generate execution reports</li>
                  </ol>
                </div>

                <Alert>
                  <Play className="h-4 w-4" />
                  <AlertTitle>Session-based execution</AlertTitle>
                  <AlertDescription>
                    All test runs happen within a session. Sessions track
                    progress, timing, environment, and results for reporting.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>

            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="start-session">
                <AccordionTrigger>Starting a test session</AccordionTrigger>
                <AccordionContent className="space-y-3 text-sm text-muted-foreground">
                  <ol className="list-decimal pl-5 space-y-1">
                    <li>Go to Test Suites page</li>
                    <li>Find the suite you want to execute</li>
                    <li>Click "Run Suite" button</li>
                    <li>
                      Session starts with the first test case automatically
                    </li>
                  </ol>

                  <div className="p-3 rounded-lg border bg-muted/20">
                    <div className="font-medium text-foreground mb-2 text-xs">
                      What happens:
                    </div>
                    <ul className="list-disc pl-5 space-y-1 text-xs">
                      <li>New session record is created</li>
                      <li>Test queue is loaded</li>
                      <li>First test opens in execution dialog</li>
                      <li>Timer starts tracking session duration</li>
                    </ul>
                  </div>

                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertTitle>Session naming</AlertTitle>
                    <AlertDescription>
                      Sessions are auto-named: "{`<Suite Name> - <Timestamp>`}".
                      This helps identify sessions in execution history.
                    </AlertDescription>
                  </Alert>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="execute-test">
                <AccordionTrigger>Executing a test</AccordionTrigger>
                <AccordionContent className="space-y-3 text-sm text-muted-foreground">
                  <div className="space-y-3">
                    <div>
                      <div className="font-medium text-foreground mb-2">
                        Step-by-step execution:
                      </div>
                      <ol className="list-decimal pl-5 space-y-1">
                        <li>Read the test description and steps</li>
                        <li>Perform each action as described</li>
                        <li>Check the checkbox when step is complete</li>
                        <li>Verify expected results match actual results</li>
                        <li>Add execution notes (optional)</li>
                        <li>Mark overall test result (Pass/Fail/etc.)</li>
                        <li>Test auto-advances to next (if enabled)</li>
                      </ol>
                    </div>

                    <ExecutionStatusGuide />

                    <div className="p-3 rounded-lg border bg-blue-50 dark:bg-blue-950/20">
                      <div className="font-medium text-sm text-blue-900 dark:text-blue-100 mb-2">
                        Keyboard shortcuts
                      </div>
                      <div className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
                        <div>
                          Press{" "}
                          <kbd className="px-1.5 py-0.5 bg-white dark:bg-gray-800 rounded">
                            P
                          </kbd>{" "}
                          to mark as Passed
                        </div>
                        <div>
                          Press{" "}
                          <kbd className="px-1.5 py-0.5 bg-white dark:bg-gray-800 rounded">
                            F
                          </kbd>{" "}
                          to mark as Failed (requires failure reason)
                        </div>
                        <div>
                          Press{" "}
                          <kbd className="px-1.5 py-0.5 bg-white dark:bg-gray-800 rounded">
                            B
                          </kbd>{" "}
                          to mark as Blocked
                        </div>
                        <div>
                          Press{" "}
                          <kbd className="px-1.5 py-0.5 bg-white dark:bg-gray-800 rounded">
                            S
                          </kbd>{" "}
                          to Skip
                        </div>
                      </div>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="navigation">
                <AccordionTrigger>Navigating during execution</AccordionTrigger>
                <AccordionContent className="space-y-3 text-sm text-muted-foreground">
                  <div>
                    <div className="font-medium text-foreground mb-2">
                      Navigation options:
                    </div>
                    <ul className="list-disc pl-5 space-y-1">
                      <li>
                        <strong>Auto-advance:</strong> Automatically move to
                        next test after marking result
                      </li>
                      <li>
                        <strong>Previous button:</strong> Go back to earlier
                        tests in session
                      </li>
                      <li>
                        <strong>Next button:</strong> Manually advance to next
                        test
                      </li>
                      <li>
                        <strong>Test queue:</strong> Click any test in the queue
                        to jump to it
                      </li>
                    </ul>
                  </div>

                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Result locking</AlertTitle>
                    <AlertDescription>
                      Once you mark a test as Passed/Failed/Blocked/Skipped,
                      that result is locked. You can view it again, but can't
                      change the result to maintain audit trail.
                    </AlertDescription>
                  </Alert>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="pause-resume">
                <AccordionTrigger>Pausing and resuming</AccordionTrigger>
                <AccordionContent className="space-y-3 text-sm text-muted-foreground">
                  <div>
                    <div className="font-medium text-foreground mb-2">
                      To pause a session:
                    </div>
                    <ol className="list-decimal pl-5 space-y-1">
                      <li>Click "Pause Session" button</li>
                      <li>Confirm you want to pause</li>
                      <li>Session saves current progress</li>
                      <li>You can close the browser</li>
                    </ol>
                  </div>

                  <div>
                    <div className="font-medium text-foreground mb-2">
                      To resume a paused session:
                    </div>
                    <ol className="list-decimal pl-5 space-y-1">
                      <li>Go to Execution History tab</li>
                      <li>Find the paused session</li>
                      <li>Click "Resume" button</li>
                      <li>Continue where you left off</li>
                    </ol>
                  </div>

                  <div className="p-3 rounded-lg border bg-muted/20 text-xs">
                    <strong>What's saved:</strong> Completed test results, step
                    checkmarks, execution notes, failure reasons, and current
                    position in the queue.
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </Section>

          {/* Test Sessions */}
          <Section id="sessions" title="Test Sessions" kicker="Tracking">
            <Card>
              <CardHeader>
                <CardTitle>Understanding test sessions</CardTitle>
                <CardDescription>
                  Sessions are execution containers that track all testing
                  activity.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <div>
                  <div className="font-medium text-foreground mb-2">
                    What sessions capture:
                  </div>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Which test suite was executed</li>
                    <li>When execution started and ended</li>
                    <li>Who executed the tests</li>
                    <li>Environment tested (staging, production, etc.)</li>
                    <li>Individual test results</li>
                    <li>Overall pass/fail statistics</li>
                    <li>Notes and evidence captured</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="session-status">
                <AccordionTrigger>Session status types</AccordionTrigger>
                <AccordionContent className="space-y-2 text-sm text-muted-foreground">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 p-2 rounded border">
                      <Badge className="bg-blue-500">In Progress</Badge>
                      <span className="text-xs">Currently being executed</span>
                    </div>
                    <div className="flex items-center gap-2 p-2 rounded border">
                      <Badge className="bg-amber-500">Paused</Badge>
                      <span className="text-xs">
                        Temporarily stopped, can resume
                      </span>
                    </div>
                    <div className="flex items-center gap-2 p-2 rounded border">
                      <Badge className="bg-green-500">Completed</Badge>
                      <span className="text-xs">All tests executed</span>
                    </div>
                    <div className="flex items-center gap-2 p-2 rounded border">
                      <Badge variant="outline">Cancelled</Badge>
                      <span className="text-xs">Stopped before completion</span>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="progress">
                <AccordionTrigger>Tracking progress</AccordionTrigger>
                <AccordionContent className="space-y-3 text-sm text-muted-foreground">
                  <p>Sessions track progress in real-time:</p>

                  <div className="space-y-2">
                    <div className="font-medium text-foreground">
                      Progress indicators:
                    </div>
                    <ul className="list-disc pl-5 space-y-1">
                      <li>
                        <strong>Percentage:</strong> Overall completion (e.g.,
                        45%)
                      </li>
                      <li>
                        <strong>Test count:</strong> 9 of 20 tests complete
                      </li>
                      <li>
                        <strong>Pass/Fail breakdown:</strong> 7 passed, 2 failed
                      </li>
                      <li>
                        <strong>Duration:</strong> Time elapsed
                      </li>
                    </ul>
                  </div>

                  <div className="p-3 rounded-lg border bg-muted/20 text-xs">
                    Progress is displayed in the session header, execution
                    history, and suite reports. It updates automatically as you
                    mark test results.
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="history">
                <AccordionTrigger>Execution history</AccordionTrigger>
                <AccordionContent className="space-y-3 text-sm text-muted-foreground">
                  <p>
                    View all past and current sessions in the Execution History
                    tab.
                  </p>

                  <div>
                    <div className="font-medium text-foreground mb-2">
                      What you can do:
                    </div>
                    <ul className="list-disc pl-5 space-y-1">
                      <li>Resume paused sessions</li>
                      <li>View completed session details</li>
                      <li>See individual test results</li>
                      <li>Access captured evidence</li>
                      <li>Compare results across sessions</li>
                      <li>Export session data</li>
                    </ul>
                  </div>

                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertTitle>Permanent record</AlertTitle>
                    <AlertDescription>
                      Sessions are never deleted automatically. They provide a
                      complete audit trail of all testing activity.
                    </AlertDescription>
                  </Alert>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </Section>

          {/* Test Evidence */}
          <Section id="evidence" title="Test Evidence" kicker="Documentation">
            <Card>
              <CardHeader>
                <CardTitle>Capturing test evidence</CardTitle>
                <CardDescription>
                  Document test execution with screenshots and detailed notes.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <div>
                  <div className="font-medium text-foreground mb-2">
                    Why capture evidence:
                  </div>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Prove test was executed correctly</li>
                    <li>Document bugs visually for developers</li>
                    <li>Meet compliance and audit requirements</li>
                    <li>Help reproduce issues later</li>
                    <li>Improve defect reports</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="screenshots">
                <AccordionTrigger>Screenshots and attachments</AccordionTrigger>
                <AccordionContent className="space-y-3 text-sm text-muted-foreground">
                  <Tabs defaultValue="manual" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="manual">Manual Upload</TabsTrigger>
                      <TabsTrigger value="extension">
                        Browser Extension
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="manual" className="space-y-2 mt-3">
                      <ol className="list-decimal pl-5 space-y-1">
                        <li>Take screenshot using OS tools</li>
                        <li>
                          In execution dialog, go to "Test Evidence" section
                        </li>
                        <li>Click "Upload Screenshot"</li>
                        <li>Select file(s) from your computer</li>
                        <li>Add optional description</li>
                        <li>
                          Screenshot is attached to current test execution
                        </li>
                      </ol>
                    </TabsContent>

                    <TabsContent value="extension" className="space-y-2 mt-3">
                      <ol className="list-decimal pl-5 space-y-1">
                        <li>Install QA Test Recorder browser extension</li>
                        <li>Enter the URL you're testing</li>
                        <li>Click "Capture Screenshot" in extension</li>
                        <li>Screenshot uploads automatically</li>
                        <li>Appears immediately in evidence section</li>
                      </ol>

                      <Alert>
                        <Info className="h-4 w-4" />
                        <AlertTitle>Extension recommended</AlertTitle>
                        <AlertDescription>
                          The browser extension provides one-click screenshot
                          capture and automatic association with the current
                          test execution.
                        </AlertDescription>
                      </Alert>
                    </TabsContent>
                  </Tabs>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="notes">
                <AccordionTrigger>Execution notes</AccordionTrigger>
                <AccordionContent className="space-y-3 text-sm text-muted-foreground">
                  <div>
                    <div className="font-medium text-foreground mb-2">
                      Two types of notes:
                    </div>
                    <div className="space-y-2">
                      <div className="p-3 rounded border">
                        <div className="font-medium text-foreground text-sm mb-1">
                          Execution Notes
                        </div>
                        <div className="text-xs">
                          General observations, deviations from expected
                          behavior, performance notes, or any relevant context
                          about the test run.
                        </div>
                      </div>
                      <div className="p-3 rounded border">
                        <div className="font-medium text-foreground text-sm mb-1">
                          Failure Reason
                        </div>
                        <div className="text-xs">
                          Required when marking test as Failed. Specific
                          explanation of what went wrong and why the test didn't
                          pass.
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-3 rounded-lg border bg-muted/20 text-xs">
                    <strong>Best practice:</strong> Be specific in failure
                    reasons. Instead of "Button didn't work", write "Login
                    button didn't respond after clicking - no error message
                    shown, console shows CORS error".
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="view-evidence">
                <AccordionTrigger>Viewing evidence later</AccordionTrigger>
                <AccordionContent className="space-y-3 text-sm text-muted-foreground">
                  <ol className="list-decimal pl-5 space-y-1">
                    <li>Go to Execution History tab</li>
                    <li>Click on a session to view details</li>
                    <li>Expand individual test results</li>
                    <li>View attached screenshots and notes</li>
                    <li>Download screenshots if needed</li>
                  </ol>

                  <div className="text-xs mt-2">
                    Evidence is permanently stored with the execution record.
                    You can access it anytime for review, reporting, or
                    compliance.
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </Section>

          {/* Reports */}
          <Section id="reports" title="Reports & Analytics" kicker="Insights">
            <Card>
              <CardHeader>
                <CardTitle>Test execution analytics</CardTitle>
                <CardDescription>
                  Track testing progress, trends, and quality metrics.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <div>
                  <div className="font-medium text-foreground mb-2">
                    Available reports:
                  </div>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>
                      <strong>Suite Reports:</strong> Pass rate, trends, and
                      execution history per suite
                    </li>
                    <li>
                      <strong>Session Details:</strong> Individual session
                      results and statistics
                    </li>
                    <li>
                      <strong>Test Coverage:</strong> Which tests have been
                      executed
                    </li>
                    <li>
                      <strong>Failure Analysis:</strong> Common failure patterns
                      and reasons
                    </li>
                    <li>
                      <strong>Execution Trends:</strong> Pass rates over time
                    </li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="suite-reports">
                <AccordionTrigger>Suite reports</AccordionTrigger>
                <AccordionContent className="space-y-3 text-sm text-muted-foreground">
                  <p>
                    Access from Test Suites → Reports & Analytics tab or from
                    individual suite details.
                  </p>

                  <div>
                    <div className="font-medium text-foreground mb-2">
                      What you'll see:
                    </div>
                    <ul className="list-disc pl-5 space-y-1">
                      <li>Overall pass rate for the suite</li>
                      <li>Execution history graph</li>
                      <li>Recent session results</li>
                      <li>Test case success rates</li>
                      <li>Average execution time</li>
                      <li>Most common failures</li>
                    </ul>
                  </div>

                  <Alert>
                    <BarChart3 className="h-4 w-4" />
                    <AlertTitle>Trends over time</AlertTitle>
                    <AlertDescription>
                      Watch for declining pass rates - they may indicate
                      regression issues or insufficient test maintenance.
                    </AlertDescription>
                  </Alert>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="metrics">
                <AccordionTrigger>Key metrics explained</AccordionTrigger>
                <AccordionContent className="space-y-3 text-sm text-muted-foreground">
                  <div className="space-y-3">
                    <div className="p-3 rounded border">
                      <div className="font-medium text-foreground mb-1">
                        Pass Rate
                      </div>
                      <div className="text-xs">
                        Percentage of tests that passed in recent executions.
                        Target: {">"} 95% for regression suites.
                      </div>
                    </div>

                    <div className="p-3 rounded border">
                      <div className="font-medium text-foreground mb-1">
                        Execution Coverage
                      </div>
                      <div className="text-xs">
                        Percentage of test cases that have been executed at
                        least once. Helps identify untested areas.
                      </div>
                    </div>

                    <div className="p-3 rounded border">
                      <div className="font-medium text-foreground mb-1">
                        Flaky Tests
                      </div>
                      <div className="text-xs">
                        Tests that pass sometimes and fail other times.
                        Indicates test or environment instability.
                      </div>
                    </div>

                    <div className="p-3 rounded border">
                      <div className="font-medium text-foreground mb-1">
                        Average Duration
                      </div>
                      <div className="text-xs">
                        How long test execution takes. Use to plan testing
                        schedules and identify slow tests.
                      </div>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="export">
                <AccordionTrigger>
                  Exporting reports (coming soon)
                </AccordionTrigger>
                <AccordionContent className="space-y-3 text-sm text-muted-foreground">
                  <p>Planned export formats:</p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>PDF reports for stakeholders</li>
                    <li>CSV data for analysis</li>
                    <li>Excel format with charts</li>
                    <li>
                      Integration with reporting tools (Jira, TestRail, etc.)
                    </li>
                  </ul>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </Section>

          {/* Best Practices */}
          <Section id="best-practices" title="Best Practices" kicker="Quality">
            <Card>
              <CardHeader>
                <CardTitle>Effective test execution</CardTitle>
                <CardDescription>
                  Strategies for high-quality, efficient testing.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid md:grid-cols-2 gap-6 text-sm">
                <div className="space-y-3">
                  <div className="font-medium text-foreground">✅ Do</div>
                  <ul className="space-y-2 text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                      <span>Prepare test environment before starting</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                      <span>Capture screenshots for failures</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                      <span>Provide detailed failure reasons</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                      <span>Execute in clean environment</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                      <span>Follow test steps exactly</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                      <span>Use keyboard shortcuts for speed</span>
                    </li>
                  </ul>
                </div>

                <div className="space-y-3">
                  <div className="font-medium text-foreground">❌ Avoid</div>
                  <ul className="space-y-2 text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
                      <span>Marking tests without executing</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
                      <span>Vague failure reasons</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
                      <span>Testing in contaminated environments</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
                      <span>Deviating from test steps</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
                      <span>Skipping evidence capture</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
                      <span>Abandoning sessions without pausing</span>
                    </li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Test suite organization</CardTitle>
                <CardDescription>
                  Structure suites for maximum efficiency.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <div>
                  <div className="font-medium text-foreground mb-2">
                    Suite design principles:
                  </div>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>
                      <strong>Keep suites focused:</strong> 10-30 tests per
                      suite for manageable sessions
                    </li>
                    <li>
                      <strong>Order logically:</strong> Group related tests,
                      dependencies first
                    </li>
                    <li>
                      <strong>Set realistic estimates:</strong> Accurate
                      duration helps planning
                    </li>
                    <li>
                      <strong>Use priority:</strong> Mark critical tests as high
                      priority
                    </li>
                    <li>
                      <strong>Separate by type:</strong> Don't mix smoke and
                      regression in one suite
                    </li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Evidence capture guidelines</CardTitle>
                <CardDescription>
                  When and what to document during execution.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <div>
                  <div className="font-medium text-foreground mb-2">
                    Always capture for:
                  </div>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Failed tests (show what went wrong)</li>
                    <li>Blocked tests (prove the blocker exists)</li>
                    <li>Unexpected behavior (even if test passes)</li>
                    <li>Security testing (document vulnerabilities)</li>
                    <li>Compliance testing (audit requirements)</li>
                  </ul>
                </div>

                <div>
                  <div className="font-medium text-foreground mb-2">
                    Optional for:
                  </div>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Passed tests (unless required by policy)</li>
                    <li>Routine regression tests</li>
                    <li>Tests without UI (API tests)</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Session management</CardTitle>
                <CardDescription>
                  Optimize your test execution workflow.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <ul className="list-disc pl-5 space-y-1">
                  <li>Schedule dedicated testing time (avoid interruptions)</li>
                  <li>
                    Use auto-advance for smooth flow through similar tests
                  </li>
                  <li>Disable auto-advance for complex or critical tests</li>
                  <li>Pause sessions when blocking issues are found</li>
                  <li>
                    Complete sessions same day when possible (maintain context)
                  </li>
                  <li>Review session stats before closing</li>
                </ul>
              </CardContent>
            </Card>
          </Section>

          {/* FAQ */}
          <Section id="faq" title="Frequently Asked Questions" kicker="FAQ">
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="edit-result">
                <AccordionTrigger>
                  Can I change a test result after marking it?
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">
                  No. Once a test is marked Pass/Fail/Blocked/Skipped, the
                  result is locked to maintain audit integrity. If you need to
                  re-test, create a new session.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="suite-delete">
                <AccordionTrigger>
                  What happens to sessions if I delete a suite?
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">
                  Execution history is preserved. Sessions remain viewable even
                  if the suite is deleted, maintaining your historical testing
                  record.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="multi-session">
                <AccordionTrigger>
                  Can I run multiple sessions simultaneously?
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">
                  You can only have one active session at a time per user. Pause
                  the current session before starting another.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="test-order">
                <AccordionTrigger>
                  Can I change test order during execution?
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">
                  You can navigate to any test in the queue, but the queue order
                  itself is set when the session starts. Edit the suite to
                  change the order permanently.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="cross-platform-execution">
                <AccordionTrigger>
                  How do I execute cross-platform tests?
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">
                  Cross-platform tests can be added to suites and executed just
                  like regular tests. The execution interface is the same - the
                  platform context is shown in the test details.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="evidence-delete">
                <AccordionTrigger>Can I delete evidence?</AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">
                  Yes, during execution you can delete screenshots you've
                  uploaded. After session completion, evidence is locked for
                  audit purposes.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="bulk-execute">
                <AccordionTrigger>
                  Can I execute multiple suites at once?
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">
                  No, you execute one suite per session. However, you can create
                  a master suite that includes tests from multiple smaller
                  suites.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="automated">
                <AccordionTrigger>
                  Can I run automated tests through the UI?
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">
                  The current execution interface is for manual interactive
                  testing. Automated test execution is planned for a future
                  release.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="export-results">
                <AccordionTrigger>Can I export test results?</AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">
                  Export functionality is planned. You can currently view all
                  results in the Reports tab and Execution History.
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
                  Resources for test management assistance.
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
                    <li>Use the feedback button in your dashboard</li>
                    <li>Visit our knowledge base for detailed guides</li>
                  </ul>
                </div>

                <Separator />

                <div>
                  <div className="font-medium text-foreground mb-2">
                    When reporting execution issues:
                  </div>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Session ID (visible in URL or session details)</li>
                    <li>Suite name and test case title</li>
                    <li>What action you were trying to perform</li>
                    <li>Screenshots if UI is behaving unexpectedly</li>
                    <li>Browser console errors (F12)</li>
                  </ul>
                </div>

                <Separator />

                <div>
                  <div className="font-medium text-foreground mb-2">
                    Related guides:
                  </div>
                  <div className="space-y-1">
                    <Link
                      href="/guides/ai-generator"
                      className="flex items-center gap-2 text-primary hover:underline"
                    >
                      <Sparkles className="h-4 w-4" />
                      AI Test Case Generator Guide
                    </Link>
                    <Link
                      href="/guides/requirements"
                      className="flex items-center gap-2 text-primary hover:underline"
                    >
                      <FileText className="h-4 w-4" />
                      Requirements Management Guide
                    </Link>
                    <Link
                      href="/guides/browser-extension"
                      className="flex items-center gap-2 text-primary hover:underline"
                    >
                      <ExternalLink className="h-4 w-4" />
                      Browser Extension Guide
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
      </div>
      <SiteFooter />
    </div>
  );
}
