// app/(dashboard)/guides/requirements/page.tsx
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
  FileText,
  FolderOpen,
  Link2,
  Filter,
  HelpCircle,
  Sparkles,
  Search,
  Tag,
  Star,
  Target,
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

function StatusBadgeGuide() {
  return (
    <div className="grid md:grid-cols-3 gap-3">
      <div className="p-3 rounded-lg border">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
          <span className="font-medium text-sm">Draft</span>
        </div>
        <p className="text-xs text-muted-foreground">
          Work in progress, not ready for test generation
        </p>
      </div>
      <div className="p-3 rounded-lg border">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-2 h-2 rounded-full bg-green-500"></div>
          <span className="font-medium text-sm">Active</span>
        </div>
        <p className="text-xs text-muted-foreground">
          Ready for use, available in test generation
        </p>
      </div>
      <div className="p-3 rounded-lg border">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-2 h-2 rounded-full bg-gray-500"></div>
          <span className="font-medium text-sm">Archived</span>
        </div>
        <p className="text-xs text-muted-foreground">
          Historical record, hidden from active lists
        </p>
      </div>
    </div>
  );
}

function PriorityBadgeGuide() {
  return (
    <div className="grid md:grid-cols-4 gap-2">
      <div className="p-2 rounded border bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900">
        <div className="font-medium text-xs text-red-900 dark:text-red-100">
          Critical
        </div>
      </div>
      <div className="p-2 rounded border bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-900">
        <div className="font-medium text-xs text-orange-900 dark:text-orange-100">
          High
        </div>
      </div>
      <div className="p-2 rounded border bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900">
        <div className="font-medium text-xs text-blue-900 dark:text-blue-100">
          Medium
        </div>
      </div>
      <div className="p-2 rounded border bg-gray-50 dark:bg-gray-950/20 border-gray-200 dark:border-gray-900">
        <div className="font-medium text-xs text-gray-900 dark:text-gray-100">
          Low
        </div>
      </div>
    </div>
  );
}

export default function RequirementsGuidePage() {
  const toc: TocItem[] = [
    {
      id: "overview",
      title: "Overview",
      icon: <BookOpen className="h-4 w-4" />,
    },
    {
      id: "creating",
      title: "Creating Requirements",
      icon: <FileText className="h-4 w-4" />,
    },
    {
      id: "organization",
      title: "Organization & Classification",
      icon: <FolderOpen className="h-4 w-4" />,
    },
    {
      id: "searching",
      title: "Searching & Filtering",
      icon: <Search className="h-4 w-4" />,
    },
    {
      id: "linking",
      title: "Linking Test Cases",
      icon: <Link2 className="h-4 w-4" />,
    },
    {
      id: "management",
      title: "Editing & Managing",
      icon: <Target className="h-4 w-4" />,
    },
    {
      id: "integration",
      title: "Test Generation Integration",
      icon: <Sparkles className="h-4 w-4" />,
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
            Requirements Management Guide
          </h1>
          <p className="max-w-2xl text-muted-foreground">
            Create, organize, and manage requirements as a central library for
            test case generation. Link requirements to test cases for full
            traceability.
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
                <CardTitle>What are Requirements?</CardTitle>
                <CardDescription>
                  Requirements are reusable descriptions of features,
                  functionality, or user stories that serve as the foundation
                  for test case generation.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <ul className="list-disc pl-5 space-y-1">
                  <li>Create a centralized library of requirements</li>
                  <li>Reuse requirements across multiple test generations</li>
                  <li>Track which requirements have associated test cases</li>
                  <li>Organize by project, priority, and status</li>
                  <li>Maintain traceability between requirements and tests</li>
                </ul>
              </CardContent>
            </Card>

            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>Requirements vs. Quick Entry</AlertTitle>
              <AlertDescription>
                In the Test Generator, you can either select a saved requirement
                or use Quick Entry for one-time generation. Save requirements
                you'll use repeatedly.
              </AlertDescription>
            </Alert>

            <Card>
              <CardHeader>
                <CardTitle>Key benefits</CardTitle>
                <CardDescription>
                  Why use the requirements system?
                </CardDescription>
              </CardHeader>
              <CardContent className="grid md:grid-cols-2 gap-4 text-sm">
                <div className="space-y-2">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="font-medium text-foreground">
                        Reusability
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Write once, generate tests multiple times as features
                        evolve
                      </div>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="font-medium text-foreground">
                        Traceability
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Track which requirements have test coverage
                      </div>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="font-medium text-foreground">
                        Consistency
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Maintain standard descriptions across your team
                      </div>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="font-medium text-foreground">
                        Organization
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Group by projects, filter by priority and status
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Section>

          {/* Creating Requirements */}
          <Section
            id="creating"
            title="Creating Requirements"
            kicker="Step-by-step"
          >
            <Card>
              <CardHeader>
                <CardTitle>Requirement structure</CardTitle>
                <CardDescription>
                  Every requirement consists of core fields and optional
                  metadata.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <div className="space-y-2">
                  <div className="font-medium text-foreground">
                    Required fields:
                  </div>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>
                      <strong>Title:</strong> Short, descriptive name
                    </li>
                    <li>
                      <strong>Description:</strong> Detailed requirement
                      specification
                    </li>
                    <li>
                      <strong>Type:</strong> Category of requirement
                      (functional, security, performance, etc.)
                    </li>
                    <li>
                      <strong>Priority:</strong> Critical, High, Medium, or Low
                    </li>
                  </ul>
                </div>

                <div className="space-y-2">
                  <div className="font-medium text-foreground">
                    Optional fields:
                  </div>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>
                      <strong>External ID:</strong> Reference to external
                      systems (Jira, Azure DevOps)
                    </li>
                    <li>
                      <strong>Project:</strong> Associate with a specific
                      project
                    </li>
                    <li>
                      <strong>Tags:</strong> Custom labels for additional
                      organization
                    </li>
                    <li>
                      <strong>Status:</strong> Draft, Active, or Archived
                    </li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="create-new">
                <AccordionTrigger>Creating a new requirement</AccordionTrigger>
                <AccordionContent className="space-y-3 text-sm text-muted-foreground">
                  <ol className="list-decimal pl-5 space-y-2">
                    <li>
                      Navigate to the{" "}
                      <span className="font-medium">Requirements</span> page
                    </li>
                    <li>
                      Click{" "}
                      <span className="font-medium">+ New Requirement</span>
                    </li>
                    <li>Fill in the requirement details in the dialog</li>
                    <li>Select type, priority, and status</li>
                    <li>(Optional) Assign to a project or add external ID</li>
                    <li>
                      Click <span className="font-medium">Create</span>
                    </li>
                  </ol>

                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertTitle>Quick save from generator</AlertTitle>
                    <AlertDescription>
                      When using Quick Entry in the Test Generator, you'll see a
                      prompt to save your requirements after typing 50+
                      characters. This creates a new requirement automatically.
                    </AlertDescription>
                  </Alert>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="title-description">
                <AccordionTrigger>
                  Writing effective titles and descriptions
                </AccordionTrigger>
                <AccordionContent className="space-y-3 text-sm text-muted-foreground">
                  <Tabs defaultValue="title" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="title">Title</TabsTrigger>
                      <TabsTrigger value="description">Description</TabsTrigger>
                    </TabsList>

                    <TabsContent value="title" className="space-y-3 mt-3">
                      <div>
                        <div className="font-medium text-foreground mb-2">
                          Best practices:
                        </div>
                        <ul className="list-disc pl-5 space-y-1">
                          <li>Keep it concise (5-10 words)</li>
                          <li>Use action verbs when appropriate</li>
                          <li>Make it searchable and recognizable</li>
                          <li>Avoid technical jargon in titles</li>
                        </ul>
                      </div>

                      <div className="p-3 rounded-lg border bg-muted/20">
                        <div className="font-medium text-foreground mb-2 text-xs">
                          Examples:
                        </div>
                        <div className="space-y-1 text-xs">
                          <div>✅ User Authentication System</div>
                          <div>✅ Shopping Cart Checkout Flow</div>
                          <div>✅ Email Notification Service</div>
                          <div className="pt-2 border-t mt-2">
                            <div>❌ Login</div>
                            <div>❌ Thing for Cart</div>
                            <div>❌ Email Stuff</div>
                          </div>
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="description" className="space-y-3 mt-3">
                      <div>
                        <div className="font-medium text-foreground mb-2">
                          Best practices:
                        </div>
                        <ul className="list-disc pl-5 space-y-1">
                          <li>Be specific and detailed</li>
                          <li>Include acceptance criteria</li>
                          <li>Specify validation rules</li>
                          <li>Mention error conditions</li>
                          <li>List step-by-step flows when applicable</li>
                        </ul>
                      </div>

                      <CodeBlock
                        label="Good description example"
                        code={`User Login Functionality:
- Email and password authentication
- Password must be at least 8 characters with 1 number and 1 special character
- Show specific error messages for invalid credentials
- "Remember me" checkbox for persistent sessions (30-day token)
- Account lockout after 5 failed login attempts (15-minute cooldown)
- Password reset via email link (expires after 1 hour)
- Session timeout after 30 minutes of inactivity
- Redirect to dashboard after successful login`}
                      />
                    </TabsContent>
                  </Tabs>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="types">
                <AccordionTrigger>Requirement types explained</AccordionTrigger>
                <AccordionContent className="space-y-3 text-sm text-muted-foreground">
                  <div className="grid md:grid-cols-2 gap-3">
                    <div className="p-3 rounded-lg border">
                      <div className="font-medium text-foreground mb-1">
                        Functional
                      </div>
                      <div className="text-xs">
                        Core features and business logic. User workflows,
                        calculations, data processing.
                      </div>
                    </div>

                    <div className="p-3 rounded-lg border">
                      <div className="font-medium text-foreground mb-1">
                        Security
                      </div>
                      <div className="text-xs">
                        Authentication, authorization, encryption, data
                        protection, compliance.
                      </div>
                    </div>

                    <div className="p-3 rounded-lg border">
                      <div className="font-medium text-foreground mb-1">
                        Performance
                      </div>
                      <div className="text-xs">
                        Load times, response times, scalability, resource usage,
                        optimization.
                      </div>
                    </div>

                    <div className="p-3 rounded-lg border">
                      <div className="font-medium text-foreground mb-1">
                        Integration
                      </div>
                      <div className="text-xs">
                        Third-party APIs, external services, webhooks, data
                        exchange.
                      </div>
                    </div>

                    <div className="p-3 rounded-lg border">
                      <div className="font-medium text-foreground mb-1">
                        UI/UX
                      </div>
                      <div className="text-xs">
                        User interface, interactions, responsiveness,
                        accessibility, design.
                      </div>
                    </div>

                    <div className="p-3 rounded-lg border">
                      <div className="font-medium text-foreground mb-1">
                        Other
                      </div>
                      <div className="text-xs">
                        Requirements that don't fit standard categories or
                        cross-cutting concerns.
                      </div>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="external-id">
                <AccordionTrigger>Using external IDs</AccordionTrigger>
                <AccordionContent className="space-y-3 text-sm text-muted-foreground">
                  <p>
                    External IDs link requirements to your project management
                    tools.
                  </p>

                  <div>
                    <div className="font-medium text-foreground mb-2">
                      Common formats:
                    </div>
                    <div className="space-y-1 text-xs">
                      <div>
                        <strong>Jira:</strong> PROJ-123, FEATURE-456
                      </div>
                      <div>
                        <strong>Azure DevOps:</strong> AB#12345
                      </div>
                      <div>
                        <strong>GitHub:</strong> #789, GH-789
                      </div>
                      <div>
                        <strong>Linear:</strong> LIN-123
                      </div>
                      <div>
                        <strong>Custom:</strong> Any format your team uses
                      </div>
                    </div>
                  </div>

                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertTitle>Searchable</AlertTitle>
                    <AlertDescription>
                      External IDs are searchable, making it easy to find
                      requirements by your ticket system reference.
                    </AlertDescription>
                  </Alert>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </Section>

          {/* Organization */}
          <Section
            id="organization"
            title="Organization & Classification"
            kicker="Structure"
          >
            <Card>
              <CardHeader>
                <CardTitle>Status lifecycle</CardTitle>
                <CardDescription>
                  Requirements move through different statuses as they progress.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <StatusBadgeGuide />

                <div className="text-sm text-muted-foreground space-y-2">
                  <div className="font-medium text-foreground">
                    Typical workflow:
                  </div>
                  <ol className="list-decimal pl-5 space-y-1">
                    <li>
                      Create requirement in <strong>Draft</strong> status while
                      gathering details
                    </li>
                    <li>
                      Move to <strong>Active</strong> when ready for test
                      generation
                    </li>
                    <li>Archive when requirement is deprecated or replaced</li>
                  </ol>
                </div>

                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertTitle>Visibility in test generator</AlertTitle>
                  <AlertDescription>
                    Only <strong>Active</strong> requirements appear in the test
                    generator dropdown. Draft and Archived requirements are
                    hidden from selection but remain accessible in the
                    Requirements page.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Priority levels</CardTitle>
                <CardDescription>
                  Prioritize requirements to focus testing efforts.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <PriorityBadgeGuide />

                <div className="text-sm text-muted-foreground">
                  <div className="font-medium text-foreground mb-2">
                    When to use each priority:
                  </div>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>
                      <strong>Critical:</strong> Security vulnerabilities, data
                      loss risks, payment systems
                    </li>
                    <li>
                      <strong>High:</strong> Core user workflows,
                      authentication, key features
                    </li>
                    <li>
                      <strong>Medium:</strong> Standard features, secondary
                      workflows, integrations
                    </li>
                    <li>
                      <strong>Low:</strong> Nice-to-have features, cosmetic
                      improvements, edge cases
                    </li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Project organization</CardTitle>
                <CardDescription>
                  Group requirements by project for better organization.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <div>
                  <div className="font-medium text-foreground mb-2">
                    Benefits of using projects:
                  </div>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>
                      Filter requirements by project in the Requirements page
                    </li>
                    <li>
                      When creating from a project context, auto-assigns project
                    </li>
                    <li>Track requirements across different initiatives</li>
                    <li>Isolate requirements for different teams or sprints</li>
                  </ul>
                </div>

                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertTitle>Optional assignment</AlertTitle>
                  <AlertDescription>
                    Requirements don't need a project. Unassigned requirements
                    are accessible from all contexts.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>

            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="tags">
                <AccordionTrigger>Using tags (coming soon)</AccordionTrigger>
                <AccordionContent className="space-y-2 text-sm text-muted-foreground">
                  <p>
                    Tags provide additional categorization beyond type and
                    priority.
                  </p>

                  <div className="p-3 rounded-lg border bg-muted/20 text-xs">
                    <div className="font-medium text-foreground mb-2">
                      Example tag usage:
                    </div>
                    <div className="space-y-1">
                      <div>• "mobile-only" - Mobile-specific requirements</div>
                      <div>• "v2.0" - Features for version 2.0 release</div>
                      <div>• "compliance" - Regulatory requirements</div>
                      <div>• "regression" - Regression testing targets</div>
                      <div>• "automation-ready" - Ready for automation</div>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </Section>

          {/* Searching & Filtering */}
          <Section
            id="searching"
            title="Searching & Filtering"
            kicker="Finding requirements"
          >
            <Card>
              <CardHeader>
                <CardTitle>Search functionality</CardTitle>
                <CardDescription>
                  Find requirements quickly using the search bar.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <div>
                  <div className="font-medium text-foreground mb-2">
                    Search searches across:
                  </div>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Requirement title</li>
                    <li>Description content</li>
                    <li>External ID</li>
                  </ul>
                </div>

                <div className="p-3 rounded-lg border bg-muted/20">
                  <div className="font-medium text-foreground mb-2 text-xs">
                    Example searches:
                  </div>
                  <div className="space-y-1 text-xs font-mono">
                    <div>"login" - Finds all login-related requirements</div>
                    <div>
                      "PROJ-123" - Finds requirement with that external ID
                    </div>
                    <div>
                      "email validation" - Finds requirements mentioning email
                      validation
                    </div>
                  </div>
                </div>

                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertTitle>Real-time search</AlertTitle>
                  <AlertDescription>
                    Results update as you type, with no need to press Enter.
                    Search is case-insensitive.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>

            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="filter-project">
                <AccordionTrigger>Filter by project</AccordionTrigger>
                <AccordionContent className="space-y-3 text-sm text-muted-foreground">
                  <ol className="list-decimal pl-5 space-y-1">
                    <li>
                      Click the <strong>All Projects</strong> dropdown
                    </li>
                    <li>Select a specific project</li>
                    <li>
                      Only requirements assigned to that project will be shown
                    </li>
                    <li>
                      Select <strong>All Projects</strong> to clear the filter
                    </li>
                  </ol>

                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertTitle>Visual indicator</AlertTitle>
                    <AlertDescription>
                      The dropdown shows the selected project name when
                      filtered. Projects appear with their assigned color icon.
                    </AlertDescription>
                  </Alert>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="filter-status">
                <AccordionTrigger>Filter by status</AccordionTrigger>
                <AccordionContent className="space-y-3 text-sm text-muted-foreground">
                  <ol className="list-decimal pl-5 space-y-1">
                    <li>
                      Click the <strong>Status</strong> dropdown
                    </li>
                    <li>Select Draft, Active, or Archived</li>
                    <li>Or select All Status to see everything</li>
                  </ol>

                  <div className="text-xs mt-2">
                    <strong>Common uses:</strong>
                    <ul className="list-disc pl-5 mt-1 space-y-1">
                      <li>
                        Filter to Active to see production-ready requirements
                      </li>
                      <li>Filter to Draft to find work-in-progress items</li>
                      <li>
                        Filter to Archived to review deprecated requirements
                      </li>
                    </ul>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="filter-priority">
                <AccordionTrigger>Filter by priority</AccordionTrigger>
                <AccordionContent className="space-y-3 text-sm text-muted-foreground">
                  <ol className="list-decimal pl-5 space-y-1">
                    <li>
                      Click the <strong>Priority</strong> dropdown
                    </li>
                    <li>Select Critical, High, Medium, or Low</li>
                    <li>Or select All Priority to see everything</li>
                  </ol>

                  <div className="text-xs mt-2">
                    <strong>Strategy tip:</strong> Focus testing efforts by
                    filtering to Critical and High priority requirements first.
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="combine-filters">
                <AccordionTrigger>Combining filters</AccordionTrigger>
                <AccordionContent className="space-y-3 text-sm text-muted-foreground">
                  <p>All filters work together to narrow down your results.</p>

                  <div className="p-3 rounded-lg border bg-muted/20">
                    <div className="font-medium text-foreground mb-2 text-xs">
                      Example combinations:
                    </div>
                    <div className="space-y-2 text-xs">
                      <div>
                        <strong>Project:</strong> "Mobile App" +{" "}
                        <strong>Status:</strong> Active +{" "}
                        <strong>Priority:</strong> High
                        <div className="text-muted-foreground mt-1">
                          Shows all high-priority active requirements for the
                          mobile app
                        </div>
                      </div>

                      <div className="pt-2 border-t">
                        <strong>Search:</strong> "authentication" +{" "}
                        <strong>Status:</strong> Active
                        <div className="text-muted-foreground mt-1">
                          Shows active requirements mentioning authentication
                        </div>
                      </div>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </Section>

          {/* Linking Test Cases */}
          <Section
            id="linking"
            title="Linking Test Cases"
            kicker="Traceability"
          >
            <Card>
              <CardHeader>
                <CardTitle>Requirements-to-test-cases linking</CardTitle>
                <CardDescription>
                  Track which test cases validate each requirement.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <div>
                  <div className="font-medium text-foreground mb-2">
                    Why link test cases?
                  </div>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Verify requirements have test coverage</li>
                    <li>Track testing progress per requirement</li>
                    <li>Maintain traceability for compliance</li>
                    <li>Quickly access tests from requirements</li>
                    <li>Identify untested or under-tested requirements</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="link-tests">
                <AccordionTrigger>Linking test cases manually</AccordionTrigger>
                <AccordionContent className="space-y-3 text-sm text-muted-foreground">
                  <ol className="list-decimal pl-5 space-y-1">
                    <li>Open a requirement (click on it in the table)</li>
                    <li>
                      In the details dialog, click{" "}
                      <strong>Link Test Cases</strong>
                    </li>
                    <li>Search or browse available test cases</li>
                    <li>Select test cases to link</li>
                    <li>
                      Click <strong>Link Selected</strong>
                    </li>
                  </ol>

                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertTitle>Multi-select</AlertTitle>
                    <AlertDescription>
                      You can link multiple test cases at once using checkboxes.
                    </AlertDescription>
                  </Alert>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="auto-link">
                <AccordionTrigger>
                  Automatic linking from generation
                </AccordionTrigger>
                <AccordionContent className="space-y-3 text-sm text-muted-foreground">
                  <p>
                    When you generate test cases from a saved requirement, they
                    are automatically linked.
                  </p>

                  <div className="space-y-2">
                    <div className="font-medium text-foreground">
                      Automatic linking happens when:
                    </div>
                    <ul className="list-disc pl-5 space-y-1">
                      <li>
                        You select a requirement in the Test Generator (Saved
                        Requirements mode)
                      </li>
                      <li>You complete the generation successfully</li>
                      <li>
                        All generated test cases are linked to that requirement
                      </li>
                    </ul>
                  </div>

                  <Alert>
                    <CheckCircle2 className="h-4 w-4" />
                    <AlertTitle>Best practice</AlertTitle>
                    <AlertDescription>
                      Use saved requirements instead of Quick Entry to
                      automatically maintain requirement-to-test-case
                      traceability.
                    </AlertDescription>
                  </Alert>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="view-linked">
                <AccordionTrigger>Viewing linked test cases</AccordionTrigger>
                <AccordionContent className="space-y-3 text-sm text-muted-foreground">
                  <ol className="list-decimal pl-5 space-y-1">
                    <li>Click on a requirement to open the details dialog</li>
                    <li>
                      Scroll to the <strong>Linked Test Cases</strong> section
                    </li>
                    <li>See all linked test cases with their status</li>
                    <li>Click on a test case to view its details</li>
                  </ol>

                  <div className="p-3 rounded-lg border bg-muted/20 text-xs">
                    <div className="font-medium text-foreground mb-1">
                      Coverage badge
                    </div>
                    <div>
                      Requirements show a badge with the count of linked test
                      cases (e.g., "15 tests"). This provides at-a-glance
                      coverage visibility.
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="unlink">
                <AccordionTrigger>Unlinking test cases</AccordionTrigger>
                <AccordionContent className="space-y-3 text-sm text-muted-foreground">
                  <ol className="list-decimal pl-5 space-y-1">
                    <li>Open the requirement details</li>
                    <li>
                      In the <strong>Linked Test Cases</strong> section, find
                      the test to unlink
                    </li>
                    <li>Click the unlink/remove icon next to the test case</li>
                    <li>Confirm the unlinking action</li>
                  </ol>

                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Note</AlertTitle>
                    <AlertDescription>
                      Unlinking does not delete the test case, only removes the
                      association with the requirement.
                    </AlertDescription>
                  </Alert>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </Section>

          {/* Management */}
          <Section
            id="management"
            title="Editing & Managing Requirements"
            kicker="Maintenance"
          >
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="edit">
                <AccordionTrigger>Editing requirements</AccordionTrigger>
                <AccordionContent className="space-y-3 text-sm text-muted-foreground">
                  <ol className="list-decimal pl-5 space-y-1">
                    <li>Find the requirement in the table</li>
                    <li>Click the three-dot menu (⋯) in the Actions column</li>
                    <li>
                      Select <strong>Edit</strong>
                    </li>
                    <li>Update any fields in the dialog</li>
                    <li>
                      Click <strong>Save Changes</strong>
                    </li>
                  </ol>

                  <div className="space-y-2 mt-3">
                    <div className="font-medium text-foreground">
                      What you can edit:
                    </div>
                    <ul className="list-disc pl-5 space-y-1">
                      <li>Title and description</li>
                      <li>Type, priority, and status</li>
                      <li>Project assignment</li>
                      <li>External ID</li>
                      <li>Tags (when available)</li>
                    </ul>
                  </div>

                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertTitle>Impact on linked tests</AlertTitle>
                    <AlertDescription>
                      Editing a requirement does not affect already-generated
                      test cases. They remain linked but aren't regenerated.
                    </AlertDescription>
                  </Alert>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="delete">
                <AccordionTrigger>Deleting requirements</AccordionTrigger>
                <AccordionContent className="space-y-3 text-sm text-muted-foreground">
                  <ol className="list-decimal pl-5 space-y-1">
                    <li>Find the requirement to delete</li>
                    <li>Click the three-dot menu (⋯)</li>
                    <li>
                      Select <strong>Delete</strong>
                    </li>
                    <li>Confirm the deletion</li>
                  </ol>

                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Permanent action</AlertTitle>
                    <AlertDescription>
                      Deleting a requirement is permanent. Linked test cases are
                      not deleted but lose their requirement association.
                      Consider archiving instead.
                    </AlertDescription>
                  </Alert>

                  <div className="p-3 rounded-lg border bg-blue-50 dark:bg-blue-950/20 mt-3">
                    <div className="font-medium text-sm text-blue-900 dark:text-blue-100 mb-1">
                      Alternative: Archive instead
                    </div>
                    <div className="text-xs text-blue-700 dark:text-blue-300">
                      Instead of deleting, edit the requirement and change its
                      status to Archived. This preserves the record and
                      maintains traceability.
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="duplicate">
                <AccordionTrigger>
                  Duplicating requirements (coming soon)
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">
                  <p>
                    Clone existing requirements to create variations quickly.
                    Useful for similar features across different platforms or
                    versions.
                  </p>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="export">
                <AccordionTrigger>Exporting requirements</AccordionTrigger>
                <AccordionContent className="space-y-3 text-sm text-muted-foreground">
                  <ol className="list-decimal pl-5 space-y-1">
                    <li>
                      Apply any filters to show only the requirements you want
                    </li>
                    <li>
                      Click the <strong>Export</strong> button
                    </li>
                    <li>Choose export format (CSV, PDF - coming soon)</li>
                    <li>Download the exported file</li>
                  </ol>

                  <div className="p-3 rounded-lg border bg-muted/20 text-xs">
                    <div className="font-medium text-foreground mb-1">
                      What's included in exports:
                    </div>
                    <div className="space-y-1">
                      <div>• Title and description</div>
                      <div>• Type, priority, status</div>
                      <div>• External ID</div>
                      <div>• Project name</div>
                      <div>• Linked test case count</div>
                      <div>• Creation and update dates</div>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="bulk">
                <AccordionTrigger>
                  Bulk operations (coming soon)
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">
                  <p>Planned features for managing multiple requirements:</p>
                  <ul className="list-disc pl-5 space-y-1 mt-2">
                    <li>Bulk status updates (e.g., mark multiple as Active)</li>
                    <li>Bulk project assignment</li>
                    <li>Bulk delete or archive</li>
                    <li>Bulk tag application</li>
                  </ul>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </Section>

          {/* Integration with Test Generation */}
          <Section
            id="integration"
            title="Test Generation Integration"
            kicker="Workflow"
          >
            <Card>
              <CardHeader>
                <CardTitle>Requirements in the test generator</CardTitle>
                <CardDescription>
                  How requirements connect to test case generation.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-muted-foreground">
                <div>
                  <div className="font-medium text-foreground mb-2">
                    Complete workflow:
                  </div>
                  <ol className="list-decimal pl-5 space-y-2">
                    <li>
                      <strong>Create requirement</strong> in the Requirements
                      page with detailed description
                    </li>
                    <li>
                      <strong>Set to Active status</strong> when ready for
                      testing
                    </li>
                    <li>
                      <strong>Go to Test Generator</strong> and select "Saved
                      Requirements" mode
                    </li>
                    <li>
                      <strong>Select your requirement</strong> from the dropdown
                    </li>
                    <li>
                      <strong>Configure generation settings</strong> (model,
                      count, coverage)
                    </li>
                    <li>
                      <strong>Generate test cases</strong> - they auto-link to
                      the requirement
                    </li>
                    <li>
                      <strong>Return to Requirements</strong> to see linked test
                      count
                    </li>
                  </ol>
                </div>

                <Separator />

                <div>
                  <div className="font-medium text-foreground mb-2">
                    Benefits of this workflow:
                  </div>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Automatic traceability without manual linking</li>
                    <li>Reuse requirements for multiple test generations</li>
                    <li>Track coverage over time</li>
                    <li>Consistent requirement descriptions</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            <Alert>
              <Sparkles className="h-4 w-4" />
              <AlertTitle>Pro tip: Template + Requirement combo</AlertTitle>
              <AlertDescription>
                Save a template with your preferred settings, then select a
                requirement. This combines reusable requirements with reusable
                generation settings for maximum efficiency.
              </AlertDescription>
            </Alert>

            <Card>
              <CardHeader>
                <CardTitle>Regenerating from requirements</CardTitle>
                <CardDescription>
                  Update test cases as requirements evolve.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <p>
                  When requirements change, regenerate test cases to reflect
                  updates:
                </p>

                <ol className="list-decimal pl-5 space-y-1">
                  <li>Edit the requirement with new details</li>
                  <li>Go to the Test Generator</li>
                  <li>Select the updated requirement</li>
                  <li>Generate new test cases</li>
                  <li>Review both old and new linked test cases</li>
                  <li>Archive or delete outdated tests if needed</li>
                </ol>

                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertTitle>Multiple generations preserved</AlertTitle>
                  <AlertDescription>
                    Each generation creates new test cases. All remain linked,
                    allowing you to compare iterations or maintain historical
                    versions.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </Section>

          {/* Best Practices */}
          <Section id="best-practices" title="Best Practices" kicker="Quality">
            <Card>
              <CardHeader>
                <CardTitle>Effective requirements management</CardTitle>
                <CardDescription>
                  Strategies for maintaining a high-quality requirements
                  library.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid md:grid-cols-2 gap-6 text-sm">
                <div className="space-y-3">
                  <div className="font-medium text-foreground">✅ Do</div>
                  <ul className="space-y-2 text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                      <span>Write detailed, specific descriptions</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                      <span>Include acceptance criteria</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                      <span>Keep requirements focused on one feature</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                      <span>Use consistent naming conventions</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                      <span>Archive instead of deleting when possible</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                      <span>Review and update regularly</span>
                    </li>
                  </ul>
                </div>

                <div className="space-y-3">
                  <div className="font-medium text-foreground">❌ Avoid</div>
                  <ul className="space-y-2 text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
                      <span>Vague or ambiguous language</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
                      <span>
                        Combining multiple features in one requirement
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
                      <span>Leaving requirements in Draft indefinitely</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
                      <span>Duplicate or near-duplicate requirements</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
                      <span>Missing priority or type classification</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
                      <span>Ignoring linked test case coverage</span>
                    </li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Naming conventions</CardTitle>
                <CardDescription>
                  Consistent naming improves searchability and organization.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <div>
                  <div className="font-medium text-foreground mb-2">
                    Suggested patterns:
                  </div>
                  <div className="space-y-2 text-xs">
                    <div>
                      <strong>[Feature Area] - [Specific Function]</strong>
                      <div className="text-muted-foreground mt-1">
                        Example: "Authentication - Password Reset Flow"
                      </div>
                    </div>
                    <div>
                      <strong>[Component] - [Action]</strong>
                      <div className="text-muted-foreground mt-1">
                        Example: "Shopping Cart - Add Item"
                      </div>
                    </div>
                    <div>
                      <strong>[User Role] - [Capability]</strong>
                      <div className="text-muted-foreground mt-1">
                        Example: "Admin - User Management Dashboard"
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Maintenance schedule</CardTitle>
                <CardDescription>
                  Keep your requirements library healthy.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <div>
                  <div className="font-medium text-foreground mb-2">
                    Regular reviews:
                  </div>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>
                      <strong>Weekly:</strong> Convert Draft requirements to
                      Active when ready
                    </li>
                    <li>
                      <strong>Monthly:</strong> Review Active requirements for
                      accuracy
                    </li>
                    <li>
                      <strong>Quarterly:</strong> Archive deprecated
                      requirements
                    </li>
                    <li>
                      <strong>As needed:</strong> Update requirements when
                      features change
                    </li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Team collaboration tips</CardTitle>
                <CardDescription>
                  Working with requirements in a team environment.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <ul className="list-disc pl-5 space-y-1">
                  <li>
                    Establish naming conventions before creating requirements
                  </li>
                  <li>
                    Use External IDs to link to your team's project management
                    system
                  </li>
                  <li>
                    Agree on when to use Draft vs. Active status as a team
                  </li>
                  <li>Review requirements together during sprint planning</li>
                  <li>Assign requirements to projects to divide ownership</li>
                </ul>
              </CardContent>
            </Card>
          </Section>

          {/* FAQ */}
          <Section id="faq" title="Frequently Asked Questions" kicker="FAQ">
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="limit">
                <AccordionTrigger>
                  How many requirements can I create?
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">
                  There's no limit on the number of requirements you can create.
                  However, keeping your library focused and well-organized will
                  make it more useful.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="vs-quick">
                <AccordionTrigger>
                  When should I use requirements vs. Quick Entry?
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">
                  Use saved requirements for features you'll test multiple times
                  or need traceability for. Use Quick Entry for one-off
                  explorations or experiments you won't repeat.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="edit-linked">
                <AccordionTrigger>
                  What happens to linked tests if I edit a requirement?
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">
                  Linked test cases remain unchanged. They stay linked to the
                  requirement but aren't regenerated. You can generate new tests
                  from the updated requirement - both old and new tests will be
                  linked.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="import">
                <AccordionTrigger>
                  Can I import requirements from other tools?
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">
                  CSV import is planned for a future release. Currently, you can
                  copy-paste requirement text and use External IDs to maintain
                  references to your source system.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="templates">
                <AccordionTrigger>
                  Can I create requirement templates?
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">
                  While there's no formal template system for requirements, you
                  can duplicate existing requirements (coming soon) or maintain
                  a "template" requirement that you copy and modify.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="coverage">
                <AccordionTrigger>
                  How do I see overall test coverage?
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">
                  Each requirement shows a badge with the count of linked test
                  cases. Filter by Status: Active to see your production
                  requirements and check which have 0 linked tests to identify
                  gaps.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="archive-delete">
                <AccordionTrigger>
                  Should I archive or delete old requirements?
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">
                  Archive when possible. Archiving preserves the requirement and
                  its linked tests for historical reference while hiding it from
                  active lists. Only delete if the requirement was created in
                  error.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="unlink-all">
                <AccordionTrigger>
                  Can I unlink all test cases at once?
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">
                  Currently, test cases must be unlinked individually. Bulk
                  unlinking is planned for a future release.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="api">
                <AccordionTrigger>
                  Is there an API for requirements management?
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">
                  API access for requirements CRUD operations is available for
                  Enterprise plans. Contact support for API documentation.
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
                  Resources for requirements management assistance.
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
                    <li>Visit our knowledge base for detailed articles</li>
                  </ul>
                </div>

                <Separator />

                <div>
                  <div className="font-medium text-foreground mb-2">
                    When requesting support, include:
                  </div>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Description of the issue</li>
                    <li>Steps you've already tried</li>
                    <li>Screenshots if relevant</li>
                    <li>Requirement ID if specific to one requirement</li>
                  </ul>
                </div>

                <Separator />

                <div>
                  <div className="font-medium text-foreground mb-2">
                    Related guides:
                  </div>
                  <div className="space-y-1">
                    <Link
                      href="/docs/generator"
                      className="flex items-center gap-2 text-primary hover:underline"
                    >
                      <Sparkles className="h-4 w-4" />
                      AI Test Case Generator Guide
                    </Link>
                    <Link
                      href="/docs/test-management"
                      className="flex items-center gap-2 text-primary hover:underline"
                    >
                      <Target className="h-4 w-4" />
                      Test Cases Management Guide
                    </Link>
                    <Link
                      href="/guides/projects"
                      className="flex items-center gap-2 text-primary hover:underline"
                    >
                      <FolderOpen className="h-4 w-4" />
                      Projects Organization Guide
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
