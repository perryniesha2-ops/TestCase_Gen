// app/(dashboard)/guides/best-practices/page.tsx
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
  Target,
  Sparkles,
  FileText,
  Layers,
  Users,
  Zap,
  TrendingUp,
  Shield,
  Clock,
  Brain,
  Code2,
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

export default function BestPracticesGuidePage() {
  const toc: TocItem[] = [
    {
      id: "overview",
      title: "Overview",
      icon: <BookOpen className="h-4 w-4" />,
    },
    {
      id: "test-cases",
      title: "Writing Test Cases",
      icon: <FileText className="h-4 w-4" />,
    },
    {
      id: "requirements",
      title: "Requirements Management",
      icon: <Target className="h-4 w-4" />,
    },
    {
      id: "ai-generation",
      title: "AI Generation Tips",
      icon: <Sparkles className="h-4 w-4" />,
    },
    {
      id: "test-execution",
      title: "Test Execution",
      icon: <Layers className="h-4 w-4" />,
    },
    {
      id: "organization",
      title: "Organization",
      icon: <Users className="h-4 w-4" />,
    },
    {
      id: "efficiency",
      title: "Efficiency Tips",
      icon: <Zap className="h-4 w-4" />,
    },
    {
      id: "quality",
      title: "Quality Assurance",
      icon: <Shield className="h-4 w-4" />,
    },
    {
      id: "maintenance",
      title: "Maintenance",
      icon: <TrendingUp className="h-4 w-4" />,
    },
    {
      id: "common-pitfalls",
      title: "Common Pitfalls",
      icon: <AlertTriangle className="h-4 w-4" />,
    },
  ];

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10">
      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="space-y-2">
          <Logo size="xl" />
          <h1 className="text-3xl font-semibold tracking-tight">
            Best Practices Guide
          </h1>
          <p className="max-w-2xl text-muted-foreground">
            Expert strategies and proven techniques for effective test case
            management with SynthQA.
          </p>
          <Badge variant="secondary">Recommended Reading</Badge>
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
                <CardTitle>Why Best Practices Matter</CardTitle>
                <CardDescription>
                  Maximize the value of your testing efforts.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <p>
                  Following best practices helps you create higher-quality test
                  cases, execute tests more efficiently, and maintain your
                  testing assets over time. This guide compiles proven
                  strategies from experienced QA teams.
                </p>
                <div className="grid md:grid-cols-2 gap-3 mt-4">
                  <div className="p-3 rounded-lg border">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      <div className="font-medium text-foreground">
                        Better Coverage
                      </div>
                    </div>
                    <p className="text-xs">
                      Comprehensive testing that catches more issues
                    </p>
                  </div>
                  <div className="p-3 rounded-lg border">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      <div className="font-medium text-foreground">
                        Time Savings
                      </div>
                    </div>
                    <p className="text-xs">
                      Efficient workflows that reduce redundant work
                    </p>
                  </div>
                  <div className="p-3 rounded-lg border">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      <div className="font-medium text-foreground">
                        Consistency
                      </div>
                    </div>
                    <p className="text-xs">
                      Standardized approach across your team
                    </p>
                  </div>
                  <div className="p-3 rounded-lg border">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      <div className="font-medium text-foreground">
                        Maintainability
                      </div>
                    </div>
                    <p className="text-xs">
                      Test cases that remain useful over time
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Section>

          {/* Writing Test Cases */}
          <Section
            id="test-cases"
            title="Writing Effective Test Cases"
            kicker="Quality"
          >
            <Card>
              <CardHeader>
                <CardTitle>Test Case Anatomy</CardTitle>
                <CardDescription>
                  Key elements of a well-written test case.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-muted-foreground">
                <Tabs defaultValue="components" className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="components">Components</TabsTrigger>
                    <TabsTrigger value="clarity">Clarity</TabsTrigger>
                    <TabsTrigger value="coverage">Coverage</TabsTrigger>
                  </TabsList>

                  <TabsContent value="components" className="space-y-3 mt-3">
                    <div className="space-y-2">
                      <div className="font-medium text-foreground">
                        Essential elements:
                      </div>
                      <div className="space-y-2 text-xs">
                        <div className="p-2 rounded border bg-muted/20">
                          <strong>Clear title:</strong> Concise summary of
                          what's being tested
                        </div>
                        <div className="p-2 rounded border bg-muted/20">
                          <strong>Description:</strong> Context and purpose of
                          the test
                        </div>
                        <div className="p-2 rounded border bg-muted/20">
                          <strong>Preconditions:</strong> Setup requirements and
                          assumptions
                        </div>
                        <div className="p-2 rounded border bg-muted/20">
                          <strong>Test steps:</strong> Clear, numbered actions
                        </div>
                        <div className="p-2 rounded border bg-muted/20">
                          <strong>Expected results:</strong> Specific,
                          measurable outcomes
                        </div>
                        <div className="p-2 rounded border bg-muted/20">
                          <strong>Test data:</strong> Input values when needed
                        </div>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="clarity" className="space-y-3 mt-3">
                    <div>
                      <div className="font-medium text-foreground mb-2">
                        Writing clear steps:
                      </div>
                      <ul className="list-disc pl-5 space-y-1 text-xs">
                        <li>
                          Use action verbs: Click, Enter, Verify, Navigate
                        </li>
                        <li>Be specific about what and where</li>
                        <li>One action per step</li>
                        <li>Avoid ambiguous terms like "check" or "test"</li>
                        <li>Include exact values and locations</li>
                      </ul>
                    </div>

                    <div className="p-3 rounded-lg border bg-green-50 dark:bg-green-950/20">
                      <div className="font-medium text-sm text-green-900 dark:text-green-100 mb-1">
                        ✅ Good Example
                      </div>
                      <div className="text-xs text-green-700 dark:text-green-300">
                        "Click the 'Add to Cart' button next to Product A"
                      </div>
                    </div>

                    <div className="p-3 rounded-lg border bg-red-50 dark:bg-red-950/20">
                      <div className="font-medium text-sm text-red-900 dark:text-red-100 mb-1">
                        ❌ Bad Example
                      </div>
                      <div className="text-xs text-red-700 dark:text-red-300">
                        "Add something to cart"
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="coverage" className="space-y-3 mt-3">
                    <div>
                      <div className="font-medium text-foreground mb-2">
                        Coverage types to include:
                      </div>
                      <div className="space-y-2 text-xs">
                        <div className="p-2 rounded border">
                          <strong>Happy path:</strong> Standard successful flow
                        </div>
                        <div className="p-2 rounded border">
                          <strong>Edge cases:</strong> Boundary values, empty
                          states
                        </div>
                        <div className="p-2 rounded border">
                          <strong>Negative tests:</strong> Invalid inputs, error
                          conditions
                        </div>
                        <div className="p-2 rounded border">
                          <strong>Integration:</strong> Interaction between
                          components
                        </div>
                        <div className="p-2 rounded border">
                          <strong>Security:</strong> Authentication,
                          authorization
                        </div>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>

            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="naming">
                <AccordionTrigger>Naming Conventions</AccordionTrigger>
                <AccordionContent className="space-y-3 text-sm text-muted-foreground">
                  <p>
                    Consistent naming makes test cases easier to find and
                    understand:
                  </p>
                  <div className="space-y-2 text-xs">
                    <div className="p-3 rounded border bg-muted/20">
                      <strong>Format:</strong> [Feature] - [Action] - [Expected
                      Result]
                    </div>
                    <div className="p-3 rounded border bg-muted/20">
                      <strong>Example:</strong> Login - Valid Credentials -
                      Successful Authentication
                    </div>
                    <div className="p-3 rounded border bg-muted/20">
                      <strong>Example:</strong> Checkout - Empty Cart - Display
                      Error Message
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="independence">
                <AccordionTrigger>Test Independence</AccordionTrigger>
                <AccordionContent className="space-y-3 text-sm text-muted-foreground">
                  <p>Each test case should be self-contained:</p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Don't depend on other tests running first</li>
                    <li>Include all necessary setup in preconditions</li>
                    <li>Clean up after the test if needed</li>
                    <li>Can be executed in any order</li>
                    <li>Failures don't cascade to other tests</li>
                  </ul>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="maintainability">
                <AccordionTrigger>Maintainable Test Cases</AccordionTrigger>
                <AccordionContent className="space-y-3 text-sm text-muted-foreground">
                  <div>
                    <div className="font-medium text-foreground mb-2">
                      Design for longevity:
                    </div>
                    <ul className="list-disc pl-5 space-y-1">
                      <li>Use generic references, not hardcoded data</li>
                      <li>Keep steps at appropriate abstraction level</li>
                      <li>Update promptly when features change</li>
                      <li>Tag with relevant metadata for filtering</li>
                      <li>Link to requirements for traceability</li>
                    </ul>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </Section>

          {/* Requirements Management */}
          <Section
            id="requirements"
            title="Requirements Management"
            kicker="Foundation"
          >
            <Card>
              <CardHeader>
                <CardTitle>Effective Requirements</CardTitle>
                <CardDescription>
                  The foundation of good test coverage.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-muted-foreground">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="font-medium text-foreground">✅ Do</div>
                    <ul className="space-y-1 text-xs">
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="h-3 w-3 text-green-600 flex-shrink-0 mt-0.5" />
                        <span>Write clear, testable requirements</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="h-3 w-3 text-green-600 flex-shrink-0 mt-0.5" />
                        <span>Include acceptance criteria</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="h-3 w-3 text-green-600 flex-shrink-0 mt-0.5" />
                        <span>Break down complex features</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="h-3 w-3 text-green-600 flex-shrink-0 mt-0.5" />
                        <span>Tag by feature and priority</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="h-3 w-3 text-green-600 flex-shrink-0 mt-0.5" />
                        <span>Link to design documents</span>
                      </li>
                    </ul>
                  </div>

                  <div className="space-y-2">
                    <div className="font-medium text-foreground">❌ Avoid</div>
                    <ul className="space-y-1 text-xs">
                      <li className="flex items-start gap-2">
                        <AlertTriangle className="h-3 w-3 text-red-600 flex-shrink-0 mt-0.5" />
                        <span>Vague or ambiguous language</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <AlertTriangle className="h-3 w-3 text-red-600 flex-shrink-0 mt-0.5" />
                        <span>Overly broad requirements</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <AlertTriangle className="h-3 w-3 text-red-600 flex-shrink-0 mt-0.5" />
                        <span>Missing success criteria</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <AlertTriangle className="h-3 w-3 text-red-600 flex-shrink-0 mt-0.5" />
                        <span>Untestable requirements</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <AlertTriangle className="h-3 w-3 text-red-600 flex-shrink-0 mt-0.5" />
                        <span>No version tracking</span>
                      </li>
                    </ul>
                  </div>
                </div>

                <Alert>
                  <Target className="h-4 w-4" />
                  <AlertTitle>SMART Requirements</AlertTitle>
                  <AlertDescription>
                    Make requirements Specific, Measurable, Achievable,
                    Relevant, and Testable for best results with AI generation.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Requirement Structure</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <div className="p-3 rounded-lg border bg-muted/20">
                  <div className="font-medium text-foreground mb-2 text-xs">
                    Good requirement example:
                  </div>
                  <div className="space-y-2 text-xs">
                    <div>
                      <strong>Title:</strong> User Login with Email
                    </div>
                    <div>
                      <strong>Description:</strong> Users should be able to log
                      in using their email address and password
                    </div>
                    <div>
                      <strong>Acceptance Criteria:</strong>
                      <ul className="list-disc pl-5 mt-1">
                        <li>Email field validates email format</li>
                        <li>Password must be 8+ characters</li>
                        <li>Successful login redirects to dashboard</li>
                        <li>Failed login shows error message</li>
                        <li>Account locks after 5 failed attempts</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Section>

          {/* AI Generation Tips */}
          <Section
            id="ai-generation"
            title="AI Generation Best Practices"
            kicker="Optimization"
          >
            <Card>
              <CardHeader>
                <CardTitle>Getting the Best AI Results</CardTitle>
                <CardDescription>
                  Tips for optimal test case generation.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-muted-foreground">
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="input-quality">
                    <AccordionTrigger>Input Quality</AccordionTrigger>
                    <AccordionContent className="space-y-3 text-sm text-muted-foreground">
                      <p>The quality of AI output depends on input quality:</p>
                      <ul className="list-disc pl-5 space-y-1">
                        <li>
                          <strong>Be specific:</strong> Include details about
                          features, flows, and expected behavior
                        </li>
                        <li>
                          <strong>Provide context:</strong> Mention the platform
                          (web, mobile, API)
                        </li>
                        <li>
                          <strong>List constraints:</strong> Technical
                          limitations, user roles, permissions
                        </li>
                        <li>
                          <strong>Include examples:</strong> Sample data, user
                          scenarios
                        </li>
                        <li>
                          <strong>Define scope:</strong> What to include/exclude
                        </li>
                      </ul>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="templates">
                    <AccordionTrigger>
                      Using Templates Effectively
                    </AccordionTrigger>
                    <AccordionContent className="space-y-3 text-sm text-muted-foreground">
                      <p>
                        Templates speed up generation and ensure consistency:
                      </p>
                      <ul className="list-disc pl-5 space-y-1">
                        <li>Create templates for common test types</li>
                        <li>Configure model and settings per template</li>
                        <li>Use higher coverage for critical features</li>
                        <li>Enable edge cases for input validation</li>
                        <li>Include negative tests for error handling</li>
                      </ul>

                      <div className="p-3 rounded-lg border bg-blue-50 dark:bg-blue-950/20 mt-3">
                        <div className="font-medium text-sm text-blue-900 dark:text-blue-100 mb-1">
                          Recommended template set
                        </div>
                        <div className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
                          <div>
                            • Standard Testing (Sonnet, 10 cases, high coverage)
                          </div>
                          <div>
                            • Quick Smoke Test (Haiku, 5 cases, basic coverage)
                          </div>
                          <div>
                            • Security Testing (Opus, 15 cases, edge + negative)
                          </div>
                          <div>
                            • API Testing (Sonnet, 12 cases, all test types)
                          </div>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="review">
                    <AccordionTrigger>Post-Generation Review</AccordionTrigger>
                    <AccordionContent className="space-y-3 text-sm text-muted-foreground">
                      <p>Always review and refine AI-generated test cases:</p>
                      <ul className="list-disc pl-5 space-y-1">
                        <li>Verify steps match actual application flow</li>
                        <li>Check for duplicate or redundant tests</li>
                        <li>Ensure data values are realistic</li>
                        <li>Validate expected results are correct</li>
                        <li>Add missing preconditions or test data</li>
                        <li>Adjust steps for clarity and precision</li>
                      </ul>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="iteration">
                    <AccordionTrigger>Iterative Improvement</AccordionTrigger>
                    <AccordionContent className="space-y-3 text-sm text-muted-foreground">
                      <p>Refine your approach based on results:</p>
                      <ul className="list-disc pl-5 space-y-1">
                        <li>
                          If tests are too generic, add more specifics to
                          requirements
                        </li>
                        <li>
                          If tests miss edge cases, enable edge case generation
                        </li>
                        <li>
                          If getting too many tests, reduce test case count
                        </li>
                        <li>If tests lack detail, switch to Opus model</li>
                        <li>Save successful configurations as templates</li>
                      </ul>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </CardContent>
            </Card>

            <Alert>
              <Brain className="h-4 w-4" />
              <AlertTitle>AI is a Starting Point</AlertTitle>
              <AlertDescription>
                AI-generated test cases are designed to give you a strong
                foundation. Always review, customize, and enhance them based on
                your domain expertise and specific testing needs.
              </AlertDescription>
            </Alert>
          </Section>

          {/* Test Execution */}
          <Section
            id="test-execution"
            title="Test Execution Strategy"
            kicker="Execution"
          >
            <Card>
              <CardHeader>
                <CardTitle>Effective Test Execution</CardTitle>
                <CardDescription>
                  Strategies for running tests efficiently.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-muted-foreground">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="p-3 rounded-lg border">
                    <div className="font-medium text-foreground mb-2">
                      Before Execution
                    </div>
                    <ul className="list-disc pl-5 space-y-1 text-xs">
                      <li>Review test cases for accuracy</li>
                      <li>Prepare test environment</li>
                      <li>Gather required test data</li>
                      <li>Check preconditions are met</li>
                      <li>Have browser extension ready</li>
                    </ul>
                  </div>

                  <div className="p-3 rounded-lg border">
                    <div className="font-medium text-foreground mb-2">
                      During Execution
                    </div>
                    <ul className="list-disc pl-5 space-y-1 text-xs">
                      <li>Follow steps exactly as written</li>
                      <li>Capture screenshots of failures</li>
                      <li>Document deviations or blockers</li>
                      <li>Use keyboard shortcuts (P/F/B/S)</li>
                      <li>Add notes for clarity</li>
                    </ul>
                  </div>

                  <div className="p-3 rounded-lg border">
                    <div className="font-medium text-foreground mb-2">
                      After Execution
                    </div>
                    <ul className="list-disc pl-5 space-y-1 text-xs">
                      <li>Review session statistics</li>
                      <li>File bugs for failures</li>
                      <li>Update test cases if needed</li>
                      <li>Share results with team</li>
                      <li>Archive session for records</li>
                    </ul>
                  </div>

                  <div className="p-3 rounded-lg border">
                    <div className="font-medium text-foreground mb-2">
                      Evidence Capture
                    </div>
                    <ul className="list-disc pl-5 space-y-1 text-xs">
                      <li>Screenshot every failure</li>
                      <li>Include error messages</li>
                      <li>Capture network/console errors</li>
                      <li>Note exact failure step</li>
                      <li>Record reproduction steps</li>
                    </ul>
                  </div>
                </div>

                <Alert>
                  <Clock className="h-4 w-4" />
                  <AlertTitle>Execution Time Management</AlertTitle>
                  <AlertDescription>
                    Use the pause/resume feature for long test sessions. Take
                    breaks to maintain focus and accuracy.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Test Suite Organization</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <div>
                  <div className="font-medium text-foreground mb-2">
                    Suite types and when to use them:
                  </div>
                  <div className="space-y-2 text-xs">
                    <div className="p-2 rounded border">
                      <strong>Smoke Test:</strong> Quick validation after
                      deployment (5-10 critical tests)
                    </div>
                    <div className="p-2 rounded border">
                      <strong>Regression Test:</strong> Full verification before
                      release (all core functionality)
                    </div>
                    <div className="p-2 rounded border">
                      <strong>Feature Test:</strong> In-depth testing of new
                      features
                    </div>
                    <div className="p-2 rounded border">
                      <strong>Integration Test:</strong> Testing between system
                      components
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Section>

          {/* Organization */}
          <Section
            id="organization"
            title="Organization & Structure"
            kicker="System"
          >
            <Card>
              <CardHeader>
                <CardTitle>Organizing Your Testing Work</CardTitle>
                <CardDescription>
                  Structure for scale and maintainability.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-muted-foreground">
                <Tabs defaultValue="projects" className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="projects">Projects</TabsTrigger>
                    <TabsTrigger value="tagging">Tagging</TabsTrigger>
                    <TabsTrigger value="naming">Naming</TabsTrigger>
                  </TabsList>

                  <TabsContent value="projects" className="space-y-3 mt-3">
                    <p className="text-xs">Use projects to separate:</p>
                    <ul className="list-disc pl-5 space-y-1 text-xs">
                      <li>Different products or applications</li>
                      <li>Major features or initiatives</li>
                      <li>Client or customer work</li>
                      <li>Development vs. production testing</li>
                    </ul>
                    <div className="p-3 rounded-lg border bg-blue-50 dark:bg-blue-950/20 mt-3">
                      <div className="font-medium text-sm text-blue-900 dark:text-blue-100 mb-1">
                        Pro tip
                      </div>
                      <div className="text-xs text-blue-700 dark:text-blue-300">
                        Start with 3-5 core projects. Add more as needed.
                        Archive completed projects to reduce clutter.
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="tagging" className="space-y-3 mt-3">
                    <p className="text-xs">
                      Use tags for cross-cutting concerns:
                    </p>
                    <ul className="list-disc pl-5 space-y-1 text-xs">
                      <li>
                        Priority: P0 (Critical), P1 (High), P2 (Medium), P3
                        (Low)
                      </li>
                      <li>Type: Functional, Security, Performance, UI/UX</li>
                      <li>Platform: Web, iOS, Android, API</li>
                      <li>Status: Draft, Ready, Deprecated</li>
                      <li>Area: Login, Checkout, Dashboard, Admin</li>
                    </ul>
                    <div className="p-3 rounded-lg border bg-blue-50 dark:bg-blue-950/20 mt-3">
                      <div className="font-medium text-sm text-blue-900 dark:text-blue-100 mb-1">
                        Consistency is key
                      </div>
                      <div className="text-xs text-blue-700 dark:text-blue-300">
                        Define your tagging system upfront and document it for
                        the team to ensure everyone uses the same conventions.
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="naming" className="space-y-3 mt-3">
                    <div>
                      <div className="font-medium text-foreground mb-2 text-xs">
                        Naming conventions to follow:
                      </div>
                      <div className="space-y-2 text-xs">
                        <div className="p-2 rounded border bg-green-50 dark:bg-green-950/20">
                          <strong>Test Cases:</strong> [Feature] - [Scenario] -
                          [Outcome]
                        </div>
                        <div className="p-2 rounded border bg-green-50 dark:bg-green-950/20">
                          <strong>Suites:</strong> [Type] - [Area/Feature]
                        </div>
                        <div className="p-2 rounded border bg-green-50 dark:bg-green-950/20">
                          <strong>Requirements:</strong> [Feature] - [User
                          Story]
                        </div>
                        <div className="p-2 rounded border bg-green-50 dark:bg-green-950/20">
                          <strong>Templates:</strong> [Platform] - [Test Type]
                        </div>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </Section>

          {/* Efficiency */}
          <Section
            id="efficiency"
            title="Efficiency Tips"
            kicker="Productivity"
          >
            <Card>
              <CardHeader>
                <CardTitle>Work Smarter, Not Harder</CardTitle>
                <CardDescription>
                  Time-saving strategies for common tasks.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <div className="grid md:grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg border">
                    <div className="font-medium text-foreground mb-2 flex items-center gap-2">
                      <Zap className="h-4 w-4 text-yellow-500" />
                      <span>Use Templates</span>
                    </div>
                    <p className="text-xs">
                      Save commonly used generation settings. One-click test
                      creation for standard scenarios.
                    </p>
                  </div>

                  <div className="p-3 rounded-lg border">
                    <div className="font-medium text-foreground mb-2 flex items-center gap-2">
                      <Zap className="h-4 w-4 text-yellow-500" />
                      <span>Bulk Operations</span>
                    </div>
                    <p className="text-xs">
                      Select multiple test cases to tag, move, or update at
                      once. Saves time on repetitive tasks.
                    </p>
                  </div>

                  <div className="p-3 rounded-lg border">
                    <div className="font-medium text-foreground mb-2 flex items-center gap-2">
                      <Zap className="h-4 w-4 text-yellow-500" />
                      <span>Keyboard Shortcuts</span>
                    </div>
                    <p className="text-xs">
                      During execution: P (Pass), F (Fail), B (Block), S (Skip).
                      Faster than clicking buttons.
                    </p>
                  </div>

                  <div className="p-3 rounded-lg border">
                    <div className="font-medium text-foreground mb-2 flex items-center gap-2">
                      <Zap className="h-4 w-4 text-yellow-500" />
                      <span>Browser Extension</span>
                    </div>
                    <p className="text-xs">
                      Capture screenshots directly from the page you're testing.
                      Automatic upload to test sessions.
                    </p>
                  </div>

                  <div className="p-3 rounded-lg border">
                    <div className="font-medium text-foreground mb-2 flex items-center gap-2">
                      <Zap className="h-4 w-4 text-yellow-500" />
                      <span>Filters & Search</span>
                    </div>
                    <p className="text-xs">
                      Use project and tag filters to quickly find relevant test
                      cases. Save time scrolling.
                    </p>
                  </div>

                  <div className="p-3 rounded-lg border">
                    <div className="font-medium text-foreground mb-2 flex items-center gap-2">
                      <Zap className="h-4 w-4 text-yellow-500" />
                      <span>Copy & Adapt</span>
                    </div>
                    <p className="text-xs">
                      Duplicate similar test cases and modify. Faster than
                      creating from scratch.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Section>

          {/* Quality Assurance */}
          <Section id="quality" title="Quality Assurance" kicker="Standards">
            <Card>
              <CardHeader>
                <CardTitle>Maintaining High Quality</CardTitle>
                <CardDescription>
                  Standards and checks for test quality.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-muted-foreground">
                <div>
                  <div className="font-medium text-foreground mb-2">
                    Quality checklist for test cases:
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-start gap-2 p-2 rounded border">
                      <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                      <div className="text-xs">
                        <strong>Complete:</strong> All steps and expected
                        results included
                      </div>
                    </div>
                    <div className="flex items-start gap-2 p-2 rounded border">
                      <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                      <div className="text-xs">
                        <strong>Clear:</strong> Anyone can execute without
                        confusion
                      </div>
                    </div>
                    <div className="flex items-start gap-2 p-2 rounded border">
                      <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                      <div className="text-xs">
                        <strong>Specific:</strong> Exact values, locations, and
                        actions
                      </div>
                    </div>
                    <div className="flex items-start gap-2 p-2 rounded border">
                      <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                      <div className="text-xs">
                        <strong>Independent:</strong> Doesn't rely on other
                        tests
                      </div>
                    </div>
                    <div className="flex items-start gap-2 p-2 rounded border">
                      <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                      <div className="text-xs">
                        <strong>Repeatable:</strong> Same results every time
                      </div>
                    </div>
                    <div className="flex items-start gap-2 p-2 rounded border">
                      <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                      <div className="text-xs">
                        <strong>Valuable:</strong> Tests important functionality
                      </div>
                    </div>
                  </div>
                </div>

                <Separator />

                <div>
                  <div className="font-medium text-foreground mb-2">
                    Review process:
                  </div>
                  <ol className="list-decimal pl-5 space-y-1 text-xs">
                    <li>Self-review before marking as ready</li>
                    <li>Peer review for critical test cases</li>
                    <li>Execute test once to validate steps</li>
                    <li>Update based on feedback</li>
                    <li>Mark as approved/ready for use</li>
                  </ol>
                </div>
              </CardContent>
            </Card>
          </Section>

          {/* Maintenance */}
          <Section
            id="maintenance"
            title="Maintenance & Updates"
            kicker="Longevity"
          >
            <Card>
              <CardHeader>
                <CardTitle>Keeping Tests Current</CardTitle>
                <CardDescription>
                  Strategies for long-term test maintenance.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-muted-foreground">
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="schedule">
                    <AccordionTrigger>Maintenance Schedule</AccordionTrigger>
                    <AccordionContent className="space-y-3 text-sm text-muted-foreground">
                      <div>
                        <div className="font-medium text-foreground mb-2">
                          Regular maintenance tasks:
                        </div>
                        <ul className="list-disc pl-5 space-y-1 text-xs">
                          <li>
                            <strong>Weekly:</strong> Review and update test
                            cases affected by recent changes
                          </li>
                          <li>
                            <strong>Monthly:</strong> Archive obsolete tests,
                            audit tag usage
                          </li>
                          <li>
                            <strong>Quarterly:</strong> Review all test suites,
                            consolidate duplicates
                          </li>
                          <li>
                            <strong>After releases:</strong> Update test cases
                            for new features
                          </li>
                        </ul>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="updates">
                    <AccordionTrigger>When to Update</AccordionTrigger>
                    <AccordionContent className="space-y-3 text-sm text-muted-foreground">
                      <p>Update test cases when:</p>
                      <ul className="list-disc pl-5 space-y-1 text-xs">
                        <li>UI or workflow changes</li>
                        <li>Requirements are modified</li>
                        <li>Test repeatedly fails due to app changes</li>
                        <li>Steps become unclear or outdated</li>
                        <li>New edge cases are discovered</li>
                        <li>Test data needs refresh</li>
                      </ul>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="deprecation">
                    <AccordionTrigger>Deprecating Tests</AccordionTrigger>
                    <AccordionContent className="space-y-3 text-sm text-muted-foreground">
                      <p>Instead of deleting, deprecate tests that:</p>
                      <ul className="list-disc pl-5 space-y-1 text-xs">
                        <li>Test removed features</li>
                        <li>Are superseded by better tests</li>
                        <li>No longer align with product direction</li>
                      </ul>
                      <p className="text-xs mt-2">
                        Tag as "deprecated" and archive after 3-6 months to
                        preserve history.
                      </p>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="version-control">
                    <AccordionTrigger>Version Control</AccordionTrigger>
                    <AccordionContent className="space-y-3 text-sm text-muted-foreground">
                      <p>Track changes to maintain quality:</p>
                      <ul className="list-disc pl-5 space-y-1 text-xs">
                        <li>Note major changes in test case description</li>
                        <li>Use updated_at timestamps</li>
                        <li>Link to relevant tickets or PRs</li>
                        <li>Document breaking changes</li>
                      </ul>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </CardContent>
            </Card>
          </Section>

          {/* Common Pitfalls */}
          <Section
            id="common-pitfalls"
            title="Common Pitfalls to Avoid"
            kicker="Learn from mistakes"
          >
            <Card>
              <CardHeader>
                <CardTitle>Mistakes to Avoid</CardTitle>
                <CardDescription>
                  Learn from common testing antipatterns.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-muted-foreground">
                <div className="space-y-3">
                  <div className="p-3 rounded-lg border bg-red-50 dark:bg-red-950/20">
                    <div className="flex items-start gap-2 mb-2">
                      <AlertTriangle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
                      <div className="font-medium text-red-900 dark:text-red-100 text-sm">
                        Over-reliance on AI
                      </div>
                    </div>
                    <p className="text-xs text-red-700 dark:text-red-300">
                      <strong>Problem:</strong> Using AI-generated tests without
                      review or customization.
                      <br />
                      <strong>Solution:</strong> Always review and enhance
                      AI-generated tests with domain knowledge.
                    </p>
                  </div>

                  <div className="p-3 rounded-lg border bg-red-50 dark:bg-red-950/20">
                    <div className="flex items-start gap-2 mb-2">
                      <AlertTriangle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
                      <div className="font-medium text-red-900 dark:text-red-100 text-sm">
                        Testing too much at once
                      </div>
                    </div>
                    <p className="text-xs text-red-700 dark:text-red-300">
                      <strong>Problem:</strong> Single test case covering too
                      many scenarios.
                      <br />
                      <strong>Solution:</strong> Break into smaller, focused
                      test cases. One scenario per test.
                    </p>
                  </div>

                  <div className="p-3 rounded-lg border bg-red-50 dark:bg-red-950/20">
                    <div className="flex items-start gap-2 mb-2">
                      <AlertTriangle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
                      <div className="font-medium text-red-900 dark:text-red-100 text-sm">
                        Vague expected results
                      </div>
                    </div>
                    <p className="text-xs text-red-700 dark:text-red-300">
                      <strong>Problem:</strong> "System should work correctly"
                      or "Data is saved."
                      <br />
                      <strong>Solution:</strong> Be specific: "User redirected
                      to /dashboard" or "Success message displays 'Profile
                      updated.'"
                    </p>
                  </div>

                  <div className="p-3 rounded-lg border bg-red-50 dark:bg-red-950/20">
                    <div className="flex items-start gap-2 mb-2">
                      <AlertTriangle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
                      <div className="font-medium text-red-900 dark:text-red-100 text-sm">
                        No test data management
                      </div>
                    </div>
                    <p className="text-xs text-red-700 dark:text-red-300">
                      <strong>Problem:</strong> Hardcoded data that becomes
                      outdated or conflicts.
                      <br />
                      <strong>Solution:</strong> Use test data variables or
                      create fresh data per test run.
                    </p>
                  </div>

                  <div className="p-3 rounded-lg border bg-red-50 dark:bg-red-950/20">
                    <div className="flex items-start gap-2 mb-2">
                      <AlertTriangle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
                      <div className="font-medium text-red-900 dark:text-red-100 text-sm">
                        Ignoring failed tests
                      </div>
                    </div>
                    <p className="text-xs text-red-700 dark:text-red-300">
                      <strong>Problem:</strong> Marking tests as "known
                      failures" without investigation.
                      <br />
                      <strong>Solution:</strong> Every failure needs a bug
                      report or test update. No exceptions.
                    </p>
                  </div>

                  <div className="p-3 rounded-lg border bg-red-50 dark:bg-red-950/20">
                    <div className="flex items-start gap-2 mb-2">
                      <AlertTriangle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
                      <div className="font-medium text-red-900 dark:text-red-100 text-sm">
                        Poor organization
                      </div>
                    </div>
                    <p className="text-xs text-red-700 dark:text-red-300">
                      <strong>Problem:</strong> No projects, inconsistent
                      naming, no tags.
                      <br />
                      <strong>Solution:</strong> Establish structure early. Use
                      projects and consistent naming conventions.
                    </p>
                  </div>

                  <div className="p-3 rounded-lg border bg-red-50 dark:bg-red-950/20">
                    <div className="flex items-start gap-2 mb-2">
                      <AlertTriangle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
                      <div className="font-medium text-red-900 dark:text-red-100 text-sm">
                        Missing evidence
                      </div>
                    </div>
                    <p className="text-xs text-red-700 dark:text-red-300">
                      <strong>Problem:</strong> Reporting bugs without
                      screenshots or reproduction steps.
                      <br />
                      <strong>Solution:</strong> Always capture evidence.
                      Screenshots + notes = actionable bugs.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>Learn and Iterate</AlertTitle>
              <AlertDescription>
                Everyone makes mistakes. The key is learning from them and
                continuously improving your testing process. Review what worked
                and what didn't after each release cycle.
              </AlertDescription>
            </Alert>
          </Section>

          {/* Quick Reference */}
          <Section
            id="quick-reference"
            title="Quick Reference"
            kicker="Cheat sheet"
          >
            <Card>
              <CardHeader>
                <CardTitle>Essential Best Practices Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="font-medium text-foreground text-sm">
                      Test Cases
                    </div>
                    <ul className="list-disc pl-5 space-y-1 text-xs">
                      <li>Clear titles and descriptions</li>
                      <li>Specific, actionable steps</li>
                      <li>Measurable expected results</li>
                      <li>One scenario per test</li>
                      <li>Independent and repeatable</li>
                    </ul>
                  </div>

                  <div className="space-y-2">
                    <div className="font-medium text-foreground text-sm">
                      Requirements
                    </div>
                    <ul className="list-disc pl-5 space-y-1 text-xs">
                      <li>SMART criteria (Specific, Measurable, etc.)</li>
                      <li>Include acceptance criteria</li>
                      <li>Break down complex features</li>
                      <li>Tag by priority and type</li>
                      <li>Link to documentation</li>
                    </ul>
                  </div>

                  <div className="space-y-2">
                    <div className="font-medium text-foreground text-sm">
                      Execution
                    </div>
                    <ul className="list-disc pl-5 space-y-1 text-xs">
                      <li>Review tests before running</li>
                      <li>Follow steps exactly</li>
                      <li>Capture evidence for failures</li>
                      <li>Use keyboard shortcuts (P/F/B/S)</li>
                      <li>Document all deviations</li>
                    </ul>
                  </div>

                  <div className="space-y-2">
                    <div className="font-medium text-foreground text-sm">
                      Organization
                    </div>
                    <ul className="list-disc pl-5 space-y-1 text-xs">
                      <li>Use projects for major separations</li>
                      <li>Consistent naming conventions</li>
                      <li>Tag for cross-cutting concerns</li>
                      <li>Archive completed work</li>
                      <li>Regular maintenance schedule</li>
                    </ul>
                  </div>
                </div>

                <Separator />

                <div className="text-xs text-center">
                  <strong>Remember:</strong> Quality `&gt;` Quantity. Better to
                  have 50 excellent test cases than 500 mediocre ones.
                </div>
              </CardContent>
            </Card>
          </Section>

          {/* Related Resources */}
          <Section id="resources" title="Related Resources" kicker="Learn more">
            <Card>
              <CardHeader>
                <CardTitle>Additional Guides</CardTitle>
                <CardDescription>
                  Dive deeper into specific topics.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <Link
                  href="/docs/generator"
                  className="flex items-center gap-2 text-primary hover:underline"
                >
                  <Sparkles className="h-4 w-4" />
                  AI Test Case Generator Guide
                </Link>
                <Link
                  href="/docs/templates"
                  className="flex items-center gap-2 text-primary hover:underline"
                >
                  <FileText className="h-4 w-4" />
                  Templates Guide
                </Link>
                <Link
                  href="/docs/requirements"
                  className="flex items-center gap-2 text-primary hover:underline"
                >
                  <Target className="h-4 w-4" />
                  Requirements Management Guide
                </Link>
                <Link
                  href="/docs/test-management"
                  className="flex items-center gap-2 text-primary hover:underline"
                >
                  <Layers className="h-4 w-4" />
                  Test Case Management Guide
                </Link>
                <Link
                  href="/docs/projects"
                  className="flex items-center gap-2 text-primary hover:underline"
                >
                  <Users className="h-4 w-4" />
                  Projects Guide
                </Link>

                <Link
                  href="/docs/playwright-automation"
                  className="flex items-center gap-2 text-primary hover:underline"
                >
                  <Code2 className="h-4 w-4" />
                  Playwright Automation Guide
                </Link>
                <Separator className="my-4" />

                <div className="text-xs text-muted-foreground pt-4 border-t">
                  Last updated: January 2026 · Guide version: 1.0
                </div>
              </CardContent>
            </Card>
          </Section>
        </main>
        <div className="w-0.5 bg-border md:block hidden"></div>
      </div>
      <SiteFooter />
    </div>
  );
}
