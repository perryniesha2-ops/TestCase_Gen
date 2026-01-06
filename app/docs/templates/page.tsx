// app/(dashboard)/guides/templates/page.tsx
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
  Star,
  HelpCircle,
  Sparkles,
  Shield,
  Zap,
  Globe,
  GitBranch,
  Eye,
  Settings,
  TrendingUp,
  Save,
  Filter,
  Layers,
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

function CategoryBadgeGuide() {
  return (
    <div className="grid md:grid-cols-2 gap-3">
      <div className="p-3 rounded-lg border">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="h-4 w-4 text-blue-500" />
          <span className="font-medium text-sm">Functional</span>
        </div>
        <p className="text-xs text-muted-foreground">
          Core features, user workflows, business logic testing
        </p>
      </div>

      <div className="p-3 rounded-lg border">
        <div className="flex items-center gap-2 mb-2">
          <Shield className="h-4 w-4 text-red-500" />
          <span className="font-medium text-sm">Security</span>
        </div>
        <p className="text-xs text-muted-foreground">
          Authentication, authorization, encryption, vulnerability testing
        </p>
      </div>

      <div className="p-3 rounded-lg border">
        <div className="flex items-center gap-2 mb-2">
          <Zap className="h-4 w-4 text-orange-500" />
          <span className="font-medium text-sm">Performance</span>
        </div>
        <p className="text-xs text-muted-foreground">
          Load testing, stress testing, response times, scalability
        </p>
      </div>

      <div className="p-3 rounded-lg border">
        <div className="flex items-center gap-2 mb-2">
          <Globe className="h-4 w-4 text-purple-500" />
          <span className="font-medium text-sm">Integration</span>
        </div>
        <p className="text-xs text-muted-foreground">
          API testing, third-party services, data exchange
        </p>
      </div>

      <div className="p-3 rounded-lg border">
        <div className="flex items-center gap-2 mb-2">
          <GitBranch className="h-4 w-4 text-green-500" />
          <span className="font-medium text-sm">Regression</span>
        </div>
        <p className="text-xs text-muted-foreground">
          Existing functionality validation, release verification
        </p>
      </div>

      <div className="p-3 rounded-lg border">
        <div className="flex items-center gap-2 mb-2">
          <Eye className="h-4 w-4 text-indigo-500" />
          <span className="font-medium text-sm">Accessibility</span>
        </div>
        <p className="text-xs text-muted-foreground">
          WCAG compliance, screen readers, keyboard navigation
        </p>
      </div>
    </div>
  );
}

function TemplateSettingsTable() {
  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50">
          <tr>
            <th className="p-3 text-left font-medium">Setting</th>
            <th className="p-3 text-left font-medium">Purpose</th>
            <th className="p-3 text-left font-medium">Options</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          <tr>
            <td className="p-3 font-medium">AI Model</td>
            <td className="p-3 text-muted-foreground">
              Which AI generates tests
            </td>
            <td className="p-3 text-xs text-muted-foreground">
              Claude Sonnet 4.5, Haiku 4.5, Opus 4.5, GPT-4o, GPT-5, etc.
            </td>
          </tr>
          <tr>
            <td className="p-3 font-medium">Test Case Count</td>
            <td className="p-3 text-muted-foreground">
              Number of tests to generate
            </td>
            <td className="p-3 text-xs text-muted-foreground">
              5, 10, 15, 20, 30, 50
            </td>
          </tr>
          <tr>
            <td className="p-3 font-medium">Coverage Level</td>
            <td className="p-3 text-muted-foreground">
              Depth of test coverage
            </td>
            <td className="p-3 text-xs text-muted-foreground">
              Standard, Comprehensive, Exhaustive
            </td>
          </tr>
          <tr>
            <td className="p-3 font-medium">Edge Cases</td>
            <td className="p-3 text-muted-foreground">
              Include boundary conditions
            </td>
            <td className="p-3 text-xs text-muted-foreground">On/Off toggle</td>
          </tr>
          <tr>
            <td className="p-3 font-medium">Negative Tests</td>
            <td className="p-3 text-muted-foreground">
              Include error scenarios
            </td>
            <td className="p-3 text-xs text-muted-foreground">On/Off toggle</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

export default function TemplatesGuidePage() {
  const toc: TocItem[] = [
    {
      id: "overview",
      title: "Overview",
      icon: <BookOpen className="h-4 w-4" />,
    },
    {
      id: "creating",
      title: "Creating Templates",
      icon: <FileText className="h-4 w-4" />,
    },
    {
      id: "categories",
      title: "Template Categories",
      icon: <Layers className="h-4 w-4" />,
    },
    {
      id: "settings",
      title: "Configuration Settings",
      icon: <Settings className="h-4 w-4" />,
    },
    {
      id: "managing",
      title: "Managing Templates",
      icon: <Star className="h-4 w-4" />,
    },
    {
      id: "using",
      title: "Using Templates",
      icon: <Sparkles className="h-4 w-4" />,
    },
    {
      id: "organization",
      title: "Organization & Search",
      icon: <Filter className="h-4 w-4" />,
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
            Templates Guide
          </h1>
          <p className="max-w-2xl text-muted-foreground">
            Save your preferred test generation settings as reusable templates.
            Speed up your workflow with consistent, one-click configuration.
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
                <CardTitle>What are Templates?</CardTitle>
                <CardDescription>
                  Templates save your preferred AI model, test count, coverage
                  level, and other settings for instant reuse.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <ul className="list-disc pl-5 space-y-1">
                  <li>
                    Save time by storing your favorite generation settings
                  </li>
                  <li>Ensure consistency across test generations</li>
                  <li>Create templates for different testing scenarios</li>
                  <li>Share templates with your team (coming soon)</li>
                  <li>
                    Track usage and identify your most-used configurations
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>Templates vs. Manual Configuration</AlertTitle>
              <AlertDescription>
                Without templates, you must configure model, count, and coverage
                for every generation. Templates apply all settings with one
                click, saving time and ensuring consistency.
              </AlertDescription>
            </Alert>

            <Card>
              <CardHeader>
                <CardTitle>Key benefits</CardTitle>
                <CardDescription>Why use the template system?</CardDescription>
              </CardHeader>
              <CardContent className="grid md:grid-cols-2 gap-4 text-sm">
                <div className="space-y-2">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="font-medium text-foreground">
                        Time Savings
                      </div>
                      <div className="text-xs text-muted-foreground">
                        One-click configuration instead of multiple selections
                      </div>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="font-medium text-foreground">
                        Consistency
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Same settings across similar test generations
                      </div>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="font-medium text-foreground">
                        Organization
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Categorize templates by testing type
                      </div>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="font-medium text-foreground">
                        Reusability
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Duplicate and modify existing templates
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Section>

          {/* Creating Templates */}
          <Section
            id="creating"
            title="Creating Templates"
            kicker="Step-by-step"
          >
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="create-new">
                <AccordionTrigger>Creating a new template</AccordionTrigger>
                <AccordionContent className="space-y-3 text-sm text-muted-foreground">
                  <ol className="list-decimal pl-5 space-y-2">
                    <li>
                      Navigate to the{" "}
                      <span className="font-medium">Templates</span> page
                    </li>
                    <li>
                      Click <span className="font-medium">+ New Template</span>
                    </li>
                    <li>
                      Fill in basic information (name, description, category)
                    </li>
                    <li>Configure generation settings</li>
                    <li>
                      Click <span className="font-medium">Create Template</span>
                    </li>
                  </ol>

                  <Alert>
                    <Sparkles className="h-4 w-4" />
                    <AlertTitle>Quick save from generator</AlertTitle>
                    <AlertDescription>
                      In the Test Generator, click "Save settings" to create a
                      template from your current configuration without manually
                      entering settings.
                    </AlertDescription>
                  </Alert>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="basic-info">
                <AccordionTrigger>Basic information fields</AccordionTrigger>
                <AccordionContent className="space-y-3 text-sm text-muted-foreground">
                  <div className="space-y-3">
                    <div>
                      <div className="font-medium text-foreground mb-1">
                        Template Name (Required)
                      </div>
                      <p className="text-xs mb-2">
                        Clear, descriptive name (max 100 characters)
                      </p>
                      <div className="p-2 rounded border bg-muted/20 text-xs font-mono">
                        Examples:
                        <div className="mt-1 space-y-1">
                          <div>✅ API Security Tests</div>
                          <div>✅ E2E User Flows - Comprehensive</div>
                          <div>✅ Performance Load Testing</div>
                        </div>
                      </div>
                    </div>

                    <div>
                      <div className="font-medium text-foreground mb-1">
                        Description (Optional)
                      </div>
                      <p className="text-xs mb-2">
                        When and how to use this template (max 500 characters)
                      </p>
                      <div className="p-2 rounded border bg-muted/20 text-xs">
                        Example: "Use for testing REST API endpoints with
                        comprehensive security coverage including
                        authentication, authorization, and input validation."
                      </div>
                    </div>

                    <div>
                      <div className="font-medium text-foreground mb-1">
                        Category (Required)
                      </div>
                      <p className="text-xs">
                        Organize by testing type - see Categories section for
                        details
                      </p>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="generation-settings">
                <AccordionTrigger>
                  Configuring generation settings
                </AccordionTrigger>
                <AccordionContent className="space-y-3 text-sm text-muted-foreground">
                  <p>
                    These settings determine how test cases are generated when
                    you use the template.
                  </p>

                  <TemplateSettingsTable />

                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertTitle>Settings can be adjusted</AlertTitle>
                    <AlertDescription>
                      When using a template in the generator, you can override
                      any setting before generating. The template provides
                      defaults, not restrictions.
                    </AlertDescription>
                  </Alert>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="from-generator">
                <AccordionTrigger>
                  Quick save from Test Generator
                </AccordionTrigger>
                <AccordionContent className="space-y-3 text-sm text-muted-foreground">
                  <p>
                    The fastest way to create a template from your current
                    settings:
                  </p>

                  <ol className="list-decimal pl-5 space-y-1">
                    <li>
                      Configure your preferred settings in the Test Generator
                    </li>
                    <li>
                      Click the{" "}
                      <span className="font-medium">Save settings</span> button
                    </li>
                    <li>Enter name, description, and category</li>
                    <li>
                      Click <span className="font-medium">Save Template</span>
                    </li>
                  </ol>

                  <div className="p-3 rounded-lg border bg-blue-50 dark:bg-blue-950/20">
                    <div className="font-medium text-sm text-blue-900 dark:text-blue-100 mb-1">
                      Perfect for experimentation
                    </div>
                    <div className="text-xs text-blue-700 dark:text-blue-300">
                      Try different model/coverage combinations in the
                      generator, then save successful configurations as
                      templates for reuse.
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </Section>

          {/* Categories */}
          <Section
            id="categories"
            title="Template Categories"
            kicker="Organization"
          >
            <Card>
              <CardHeader>
                <CardTitle>Understanding categories</CardTitle>
                <CardDescription>
                  Organize templates by testing type for easy filtering and
                  selection.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <CategoryBadgeGuide />

                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertTitle>Choosing the right category</AlertTitle>
                  <AlertDescription>
                    Select the category that best matches your primary testing
                    goal. Use "Other" for cross-cutting templates or unique
                    scenarios.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Category-specific recommendations</CardTitle>
                <CardDescription>
                  Suggested settings for each template category.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <Tabs defaultValue="functional" className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="functional">Functional</TabsTrigger>
                    <TabsTrigger value="security">Security</TabsTrigger>
                    <TabsTrigger value="performance">Performance</TabsTrigger>
                  </TabsList>

                  <TabsContent value="functional" className="space-y-2 mt-3">
                    <div className="p-3 rounded-lg border">
                      <div className="font-medium text-foreground mb-2">
                        Recommended Settings:
                      </div>
                      <div className="space-y-1 text-xs">
                        <div>
                          <strong>Model:</strong> Claude Sonnet 4.5 (balanced)
                        </div>
                        <div>
                          <strong>Count:</strong> 15-20 test cases
                        </div>
                        <div>
                          <strong>Coverage:</strong> Comprehensive
                        </div>
                        <div>
                          <strong>Edge Cases:</strong> On
                        </div>
                        <div>
                          <strong>Negative Tests:</strong> On
                        </div>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="security" className="space-y-2 mt-3">
                    <div className="p-3 rounded-lg border">
                      <div className="font-medium text-foreground mb-2">
                        Recommended Settings:
                      </div>
                      <div className="space-y-1 text-xs">
                        <div>
                          <strong>Model:</strong> Claude Opus 4.5 (maximum
                          quality)
                        </div>
                        <div>
                          <strong>Count:</strong> 30-50 test cases
                        </div>
                        <div>
                          <strong>Coverage:</strong> Exhaustive
                        </div>
                        <div>
                          <strong>Edge Cases:</strong> On
                        </div>
                        <div>
                          <strong>Negative Tests:</strong> On (critical)
                        </div>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="performance" className="space-y-2 mt-3">
                    <div className="p-3 rounded-lg border">
                      <div className="font-medium text-foreground mb-2">
                        Recommended Settings:
                      </div>
                      <div className="space-y-1 text-xs">
                        <div>
                          <strong>Model:</strong> Claude Sonnet 4.5
                        </div>
                        <div>
                          <strong>Count:</strong> 10-15 test cases
                        </div>
                        <div>
                          <strong>Coverage:</strong> Comprehensive
                        </div>
                        <div>
                          <strong>Edge Cases:</strong> On (load boundaries)
                        </div>
                        <div>
                          <strong>Negative Tests:</strong> Off
                        </div>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </Section>

          {/* Settings */}
          <Section
            id="settings"
            title="Configuration Settings"
            kicker="Deep dive"
          >
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="model">
                <AccordionTrigger>AI Model selection</AccordionTrigger>
                <AccordionContent className="space-y-3 text-sm text-muted-foreground">
                  <p>
                    Choose the AI model based on your quality, speed, and cost
                    requirements.
                  </p>

                  <div className="space-y-2">
                    <div className="p-3 rounded-lg border">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-foreground text-sm">
                          Claude Sonnet 4.5
                        </span>
                        <Badge variant="secondary">Recommended</Badge>
                      </div>
                      <div className="text-xs space-y-1">
                        <div>
                          <strong>Best for:</strong> 80% of use cases
                        </div>
                        <div>
                          <strong>Speed:</strong> Fast (10-15 seconds)
                        </div>
                        <div>
                          <strong>Quality:</strong> Excellent balance
                        </div>
                      </div>
                    </div>

                    <div className="p-3 rounded-lg border">
                      <span className="font-medium text-foreground text-sm">
                        Claude Haiku 4.5
                      </span>
                      <div className="text-xs space-y-1 mt-2">
                        <div>
                          <strong>Best for:</strong> Quick iterations, smoke
                          tests
                        </div>
                        <div>
                          <strong>Speed:</strong> Very fast (5-8 seconds)
                        </div>
                        <div>
                          <strong>Quality:</strong> Good for simple requirements
                        </div>
                      </div>
                    </div>

                    <div className="p-3 rounded-lg border">
                      <span className="font-medium text-foreground text-sm">
                        Claude Opus 4.5
                      </span>
                      <div className="text-xs space-y-1 mt-2">
                        <div>
                          <strong>Best for:</strong> Critical features, security
                          testing
                        </div>
                        <div>
                          <strong>Speed:</strong> Slower (20-30 seconds)
                        </div>
                        <div>
                          <strong>Quality:</strong> Highest depth and coverage
                        </div>
                      </div>
                    </div>
                  </div>

                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertTitle>Model recommendations per category</AlertTitle>
                    <AlertDescription>
                      Security templates → Opus 4.5. Functional templates →
                      Sonnet 4.5. Quick validation → Haiku 4.5.
                    </AlertDescription>
                  </Alert>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="count">
                <AccordionTrigger>Test case count</AccordionTrigger>
                <AccordionContent className="space-y-3 text-sm text-muted-foreground">
                  <p>
                    How many test cases to generate. Higher counts provide more
                    coverage but consume more quota.
                  </p>

                  <div className="grid md:grid-cols-3 gap-2">
                    <div className="p-3 rounded-lg border bg-muted/20">
                      <div className="font-medium text-foreground mb-1">
                        5-10 tests
                      </div>
                      <div className="text-xs">
                        Quick validation, smoke testing, simple features
                      </div>
                    </div>
                    <div className="p-3 rounded-lg border bg-muted/20">
                      <div className="font-medium text-foreground mb-1">
                        15-20 tests
                      </div>
                      <div className="text-xs">
                        Standard coverage, typical user stories, most features
                      </div>
                    </div>
                    <div className="p-3 rounded-lg border bg-muted/20">
                      <div className="font-medium text-foreground mb-1">
                        30-50 tests
                      </div>
                      <div className="text-xs">
                        Comprehensive coverage, critical paths, complex features
                      </div>
                    </div>
                  </div>

                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Quota consideration</AlertTitle>
                    <AlertDescription>
                      Each generated test case counts toward your monthly limit.
                      Balance thoroughness with quota management.
                    </AlertDescription>
                  </Alert>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="coverage">
                <AccordionTrigger>Coverage levels</AccordionTrigger>
                <AccordionContent className="space-y-3 text-sm text-muted-foreground">
                  <div className="space-y-3">
                    <div className="p-3 rounded-lg border">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-2 h-2 rounded-full bg-green-500"></div>
                        <span className="font-medium text-foreground">
                          Standard
                        </span>
                      </div>
                      <div className="text-xs space-y-1">
                        <div>
                          <strong>Includes:</strong> Happy path, core workflows
                        </div>
                        <div>
                          <strong>Best for:</strong> Smoke tests, quick
                          validation
                        </div>
                      </div>
                    </div>

                    <div className="p-3 rounded-lg border">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                        <span className="font-medium text-foreground">
                          Comprehensive
                        </span>
                        <Badge variant="secondary" className="text-xs">
                          Default
                        </Badge>
                      </div>
                      <div className="text-xs space-y-1">
                        <div>
                          <strong>Includes:</strong> Standard + edge cases +
                          negative tests
                        </div>
                        <div>
                          <strong>Best for:</strong> Production features,
                          regression
                        </div>
                      </div>
                    </div>

                    <div className="p-3 rounded-lg border">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                        <span className="font-medium text-foreground">
                          Exhaustive
                        </span>
                      </div>
                      <div className="text-xs space-y-1">
                        <div>
                          <strong>Includes:</strong> Comprehensive + all
                          boundary conditions + complex scenarios
                        </div>
                        <div>
                          <strong>Best for:</strong> Critical features,
                          security, compliance
                        </div>
                      </div>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="edge-cases">
                <AccordionTrigger>Edge cases toggle</AccordionTrigger>
                <AccordionContent className="space-y-3 text-sm text-muted-foreground">
                  <p>
                    Enable to generate tests for boundary conditions and unusual
                    inputs.
                  </p>

                  <div className="space-y-2">
                    <div className="font-medium text-foreground">
                      Examples of edge case tests:
                    </div>
                    <ul className="list-disc pl-5 space-y-1 text-xs">
                      <li>Empty string inputs</li>
                      <li>Maximum/minimum values</li>
                      <li>Special characters and Unicode</li>
                      <li>Very long inputs (beyond expected)</li>
                      <li>Null or undefined values</li>
                      <li>Concurrent operations</li>
                    </ul>
                  </div>

                  <Alert>
                    <CheckCircle2 className="h-4 w-4" />
                    <AlertTitle>Recommended: Always on</AlertTitle>
                    <AlertDescription>
                      Edge cases often reveal bugs that standard tests miss.
                      Leave enabled unless doing quick smoke tests.
                    </AlertDescription>
                  </Alert>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="negative-tests">
                <AccordionTrigger>Negative tests toggle</AccordionTrigger>
                <AccordionContent className="space-y-3 text-sm text-muted-foreground">
                  <p>
                    Enable to generate tests for error scenarios and failures.
                  </p>

                  <div className="space-y-2">
                    <div className="font-medium text-foreground">
                      Examples of negative tests:
                    </div>
                    <ul className="list-disc pl-5 space-y-1 text-xs">
                      <li>Invalid credentials</li>
                      <li>Expired tokens</li>
                      <li>Missing required fields</li>
                      <li>Incorrect data types</li>
                      <li>Permission violations</li>
                      <li>Network errors and timeouts</li>
                    </ul>
                  </div>

                  <Alert>
                    <Shield className="h-4 w-4" />
                    <AlertTitle>Critical for security templates</AlertTitle>
                    <AlertDescription>
                      Always enable for security testing. Negative tests verify
                      proper error handling and prevent vulnerabilities.
                    </AlertDescription>
                  </Alert>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </Section>

          {/* Managing Templates */}
          <Section id="managing" title="Managing Templates" kicker="Operations">
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="edit">
                <AccordionTrigger>Editing templates</AccordionTrigger>
                <AccordionContent className="space-y-3 text-sm text-muted-foreground">
                  <ol className="list-decimal pl-5 space-y-1">
                    <li>Find the template in your list</li>
                    <li>Click the three-dot menu (⋯)</li>
                    <li>
                      Select <strong>Edit</strong>
                    </li>
                    <li>Modify any settings</li>
                    <li>
                      Click <strong>Update Template</strong>
                    </li>
                  </ol>

                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertTitle>No impact on existing tests</AlertTitle>
                    <AlertDescription>
                      Editing a template doesn't affect test cases already
                      generated using the old settings.
                    </AlertDescription>
                  </Alert>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="duplicate">
                <AccordionTrigger>Duplicating templates</AccordionTrigger>
                <AccordionContent className="space-y-3 text-sm text-muted-foreground">
                  <p>
                    Create variations of existing templates quickly without
                    starting from scratch.
                  </p>

                  <ol className="list-decimal pl-5 space-y-1">
                    <li>Click the three-dot menu on any template</li>
                    <li>
                      Select <strong>Duplicate</strong>
                    </li>
                    <li>
                      A copy is created with " (Copy)" appended to the name
                    </li>
                    <li>Edit the duplicate to customize</li>
                  </ol>

                  <div className="p-3 rounded-lg border bg-muted/20 text-xs">
                    <div className="font-medium text-foreground mb-1">
                      Common use cases:
                    </div>
                    <ul className="list-disc pl-5 space-y-1">
                      <li>
                        Create "Quick" and "Thorough" versions of the same
                        template
                      </li>
                      <li>Adapt a template for different AI models</li>
                      <li>Build variations with different test counts</li>
                      <li>Copy public templates to customize for your needs</li>
                    </ul>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="favorite">
                <AccordionTrigger>Marking favorites</AccordionTrigger>
                <AccordionContent className="space-y-3 text-sm text-muted-foreground">
                  <p>
                    Star your most-used templates for quick access and
                    prioritization.
                  </p>

                  <ol className="list-decimal pl-5 space-y-1">
                    <li>Click the star icon on any template card</li>
                    <li>Favorited templates show a filled yellow star</li>
                    <li>Click again to unfavorite</li>
                  </ol>

                  <Alert>
                    <Star className="h-4 w-4 text-yellow-500" />
                    <AlertTitle>Quick identification</AlertTitle>
                    <AlertDescription>
                      Favorites appear at the top of your template list and are
                      highlighted in the generator template dropdown.
                    </AlertDescription>
                  </Alert>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="delete">
                <AccordionTrigger>Deleting templates</AccordionTrigger>
                <AccordionContent className="space-y-3 text-sm text-muted-foreground">
                  <ol className="list-decimal pl-5 space-y-1">
                    <li>Click the three-dot menu</li>
                    <li>
                      Select <strong>Delete</strong>
                    </li>
                    <li>Confirm the deletion</li>
                  </ol>

                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Permanent action</AlertTitle>
                    <AlertDescription>
                      Deleting a template cannot be undone. Test cases generated
                      from the template are not affected.
                    </AlertDescription>
                  </Alert>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="public">
                <AccordionTrigger>
                  Public templates (coming soon)
                </AccordionTrigger>
                <AccordionContent className="space-y-3 text-sm text-muted-foreground">
                  <p>
                    Share your templates with the community or use templates
                    created by others.
                  </p>

                  <div className="space-y-2">
                    <div className="font-medium text-foreground">
                      Planned features:
                    </div>
                    <ul className="list-disc pl-5 space-y-1">
                      <li>Make templates public to share with all users</li>
                      <li>Browse community templates by category</li>
                      <li>Copy public templates to your library</li>
                      <li>See usage statistics for public templates</li>
                    </ul>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </Section>

          {/* Using Templates */}
          <Section id="using" title="Using Templates" kicker="In practice">
            <Card>
              <CardHeader>
                <CardTitle>Applying templates in Test Generator</CardTitle>
                <CardDescription>
                  Use templates to speed up test case generation.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-muted-foreground">
                <div>
                  <div className="font-medium text-foreground mb-2">
                    Standard workflow:
                  </div>
                  <ol className="list-decimal pl-5 space-y-1">
                    <li>Go to the Test Generator page</li>
                    <li>Enter or select your requirements</li>
                    <li>
                      In the template section, click the template dropdown
                    </li>
                    <li>Select a template</li>
                    <li>Settings auto-populate</li>
                    <li>Adjust if needed (optional)</li>
                    <li>Generate test cases</li>
                  </ol>
                </div>

                <Separator />

                <div>
                  <div className="font-medium text-foreground mb-2">
                    What happens when you select a template:
                  </div>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>AI Model field is set automatically</li>
                    <li>Test Case Count is pre-filled</li>
                    <li>Coverage Level is selected</li>
                    <li>Edge Cases toggle is configured</li>
                    <li>Negative Tests toggle is configured</li>
                    <li>Usage count for that template increments</li>
                  </ul>
                </div>

                <Alert>
                  <Settings className="h-4 w-4" />
                  <AlertTitle>Settings remain adjustable</AlertTitle>
                  <AlertDescription>
                    Template application is non-destructive. You can override
                    any setting before generating without affecting the saved
                    template.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Template + Requirement workflow</CardTitle>
                <CardDescription>
                  Combine templates with saved requirements for maximum
                  efficiency.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <div className="p-4 rounded-lg border bg-blue-50 dark:bg-blue-950/20">
                  <div className="font-medium text-foreground mb-2">
                    Power user workflow:
                  </div>
                  <ol className="list-decimal pl-5 space-y-2 text-xs">
                    <li>
                      Create templates for different testing scenarios
                      (Functional - Standard, Security - Exhaustive, etc.)
                    </li>
                    <li>Save requirements for features you test repeatedly</li>
                    <li>
                      In Test Generator: Select requirement → Select matching
                      template → Generate
                    </li>
                    <li>
                      Complete generation in ~5 clicks instead of ~15 manual
                      selections
                    </li>
                  </ol>
                </div>

                <Alert>
                  <TrendingUp className="h-4 w-4" />
                  <AlertTitle>Efficiency multiplier</AlertTitle>
                  <AlertDescription>
                    Teams using templates + requirements report 70% faster test
                    generation setup times.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>

            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="cross-platform">
                <AccordionTrigger>
                  Templates in Cross-Platform mode
                </AccordionTrigger>
                <AccordionContent className="space-y-3 text-sm text-muted-foreground">
                  <p>
                    Templates work in both Regular and Cross-Platform generation
                    modes.
                  </p>

                  <div className="space-y-2">
                    <div className="font-medium text-foreground">
                      In Cross-Platform mode:
                    </div>
                    <ul className="list-disc pl-5 space-y-1">
                      <li>Template settings apply to all selected platforms</li>
                      <li>All platforms use the same model and coverage</li>
                      <li>
                        Test count is per-platform (3 platforms × 10 tests = 30
                        total)
                      </li>
                    </ul>
                  </div>

                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertTitle>Consistency across platforms</AlertTitle>
                    <AlertDescription>
                      Using templates in cross-platform mode ensures consistent
                      quality across Web, Mobile, API, and other test suites.
                    </AlertDescription>
                  </Alert>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="usage-tracking">
                <AccordionTrigger>Usage tracking</AccordionTrigger>
                <AccordionContent className="space-y-3 text-sm text-muted-foreground">
                  <p>
                    Templates track how many times they've been used and when
                    they were last used.
                  </p>

                  <div className="space-y-2">
                    <div className="font-medium text-foreground">
                      Tracked metrics:
                    </div>
                    <ul className="list-disc pl-5 space-y-1">
                      <li>
                        <strong>Usage Count:</strong> Total times template was
                        used for generation
                      </li>
                      <li>
                        <strong>Last Used:</strong> Timestamp of most recent use
                      </li>
                      <li>
                        <strong>Created:</strong> When template was created
                      </li>
                    </ul>
                  </div>

                  <div className="p-3 rounded-lg border bg-muted/20 text-xs">
                    <div className="font-medium text-foreground mb-1">
                      What you can learn:
                    </div>
                    <ul className="list-disc pl-5 space-y-1">
                      <li>
                        Your most-used template indicates your most common
                        testing pattern
                      </li>
                      <li>Unused templates can be deleted to reduce clutter</li>
                      <li>
                        Recent activity helps identify templates you're actively
                        using
                      </li>
                    </ul>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </Section>

          {/* Organization & Search */}
          <Section
            id="organization"
            title="Organization & Search"
            kicker="Finding templates"
          >
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="search">
                <AccordionTrigger>Searching templates</AccordionTrigger>
                <AccordionContent className="space-y-3 text-sm text-muted-foreground">
                  <p>
                    Use the search bar to find templates by name or description.
                  </p>

                  <div className="space-y-2">
                    <div className="font-medium text-foreground">
                      Search searches:
                    </div>
                    <ul className="list-disc pl-5 space-y-1">
                      <li>Template name</li>
                      <li>Template description</li>
                    </ul>
                  </div>

                  <div className="p-3 rounded-lg border bg-muted/20">
                    <div className="font-medium text-foreground mb-2 text-xs">
                      Example searches:
                    </div>
                    <div className="space-y-1 text-xs font-mono">
                      <div>"security" - All security-related templates</div>
                      <div>"API" - Templates for API testing</div>
                      <div>"quick" - Templates named with "quick"</div>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="filter-category">
                <AccordionTrigger>Filter by category</AccordionTrigger>
                <AccordionContent className="space-y-3 text-sm text-muted-foreground">
                  <ol className="list-decimal pl-5 space-y-1">
                    <li>Click the category filter dropdown</li>
                    <li>Select a specific category or "All Categories"</li>
                    <li>Only templates in that category will be shown</li>
                  </ol>

                  <div className="text-xs mt-2">
                    <strong>Use cases:</strong>
                    <ul className="list-disc pl-5 mt-1 space-y-1">
                      <li>Filter to Security when starting security testing</li>
                      <li>
                        Filter to Functional for standard feature development
                      </li>
                      <li>
                        Filter to Performance during performance testing sprints
                      </li>
                    </ul>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="tabs">
                <AccordionTrigger>My Templates vs. Public</AccordionTrigger>
                <AccordionContent className="space-y-3 text-sm text-muted-foreground">
                  <div className="space-y-3">
                    <div>
                      <div className="font-medium text-foreground mb-1">
                        My Templates tab
                      </div>
                      <p className="text-xs">
                        Shows templates you've created. These are private to you
                        and can be edited, deleted, or favorited.
                      </p>
                    </div>

                    <div>
                      <div className="font-medium text-foreground mb-1">
                        Public Templates tab (coming soon)
                      </div>
                      <p className="text-xs">
                        Will show community-shared templates. You can copy these
                        to your library but cannot edit the originals.
                      </p>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="stats">
                <AccordionTrigger>Understanding statistics</AccordionTrigger>
                <AccordionContent className="space-y-3 text-sm text-muted-foreground">
                  <div className="space-y-2">
                    <div>
                      <div className="font-medium text-foreground mb-1">
                        Total Templates
                      </div>
                      <p className="text-xs">
                        Count of all templates you've created, with favorite
                        count
                      </p>
                    </div>

                    <div>
                      <div className="font-medium text-foreground mb-1">
                        Most Used
                      </div>
                      <p className="text-xs">
                        Your most-applied template and its usage count
                      </p>
                    </div>

                    <div>
                      <div className="font-medium text-foreground mb-1">
                        Recent Activity
                      </div>
                      <p className="text-xs">
                        Templates created in the past 7 days
                      </p>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </Section>

          {/* Best Practices */}
          <Section id="best-practices" title="Best Practices" kicker="Quality">
            <Card>
              <CardHeader>
                <CardTitle>Effective template management</CardTitle>
                <CardDescription>
                  Strategies for building and maintaining a useful template
                  library.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid md:grid-cols-2 gap-6 text-sm">
                <div className="space-y-3">
                  <div className="font-medium text-foreground">✅ Do</div>
                  <ul className="space-y-2 text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                      <span>Use clear, descriptive template names</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                      <span>Add descriptions explaining when to use</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                      <span>Categorize accurately for easy filtering</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                      <span>Create templates for recurring patterns</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                      <span>Review and update templates periodically</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                      <span>Delete unused templates to reduce clutter</span>
                    </li>
                  </ul>
                </div>

                <div className="space-y-3">
                  <div className="font-medium text-foreground">❌ Avoid</div>
                  <ul className="space-y-2 text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
                      <span>Generic names like "Template 1"</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
                      <span>Creating too many similar templates</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
                      <span>Forgetting to categorize properly</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
                      <span>Using wrong coverage for security testing</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
                      <span>Keeping outdated model selections</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
                      <span>Creating one-off templates you'll never reuse</span>
                    </li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Naming conventions</CardTitle>
                <CardDescription>
                  Consistent naming makes templates easier to find and use.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <div>
                  <div className="font-medium text-foreground mb-2">
                    Suggested patterns:
                  </div>
                  <div className="space-y-2 text-xs">
                    <div>
                      <strong>[Category] - [Scope] - [Coverage]</strong>
                      <div className="text-muted-foreground mt-1">
                        Example: "Functional - E2E Flows - Comprehensive"
                      </div>
                    </div>
                    <div>
                      <strong>[Feature Type] - [Model] - [Count]</strong>
                      <div className="text-muted-foreground mt-1">
                        Example: "API Security - Opus - 50 tests"
                      </div>
                    </div>
                    <div>
                      <strong>[Use Case] - [Quick/Thorough]</strong>
                      <div className="text-muted-foreground mt-1">
                        Example: "Regression Testing - Quick"
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recommended template set</CardTitle>
                <CardDescription>
                  A starting set of templates that covers most needs.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <div className="p-2 rounded border bg-muted/20 text-xs">
                  <div className="font-medium text-foreground">
                    1. Quick Validation
                  </div>
                  <div>
                    Haiku 4.5, 5 tests, Standard coverage - for rapid smoke
                    tests
                  </div>
                </div>

                <div className="p-2 rounded border bg-muted/20 text-xs">
                  <div className="font-medium text-foreground">
                    2. Standard Functional
                  </div>
                  <div>
                    Sonnet 4.5, 15 tests, Comprehensive - for typical features
                  </div>
                </div>

                <div className="p-2 rounded border bg-muted/20 text-xs">
                  <div className="font-medium text-foreground">
                    3. Security Testing
                  </div>
                  <div>Opus 4.5, 30 tests, Exhaustive - for critical paths</div>
                </div>

                <div className="p-2 rounded border bg-muted/20 text-xs">
                  <div className="font-medium text-foreground">
                    4. Regression Suite
                  </div>
                  <div>
                    Sonnet 4.5, 20 tests, Comprehensive - for release testing
                  </div>
                </div>

                <div className="p-2 rounded border bg-muted/20 text-xs">
                  <div className="font-medium text-foreground">
                    5. Performance Baseline
                  </div>
                  <div>Sonnet 4.5, 10 tests, Standard - for load testing</div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Maintenance schedule</CardTitle>
                <CardDescription>
                  Keep your template library healthy and useful.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <div>
                  <div className="font-medium text-foreground mb-2">
                    Regular maintenance:
                  </div>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>
                      <strong>Monthly:</strong> Review unused templates (usage
                      count = 0)
                    </li>
                    <li>
                      <strong>Quarterly:</strong> Update model selections to
                      latest versions
                    </li>
                    <li>
                      <strong>When models update:</strong> Create new templates
                      with latest models
                    </li>
                    <li>
                      <strong>After project changes:</strong> Adjust test counts
                      based on quota usage
                    </li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </Section>

          {/* FAQ */}
          <Section id="faq" title="Frequently Asked Questions" kicker="FAQ">
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="limit">
                <AccordionTrigger>
                  How many templates can I create?
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">
                  There's no hard limit, but we recommend keeping 10-20
                  well-organized templates rather than creating dozens of
                  one-off templates.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="share">
                <AccordionTrigger>
                  Can I share templates with my team?
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">
                  Team template sharing is planned for a future release.
                  Currently, templates are private to each user.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="default">
                <AccordionTrigger>
                  Can I set a default template?
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">
                  Not yet, but you can favorite your most-used template for
                  quick access. Default template functionality is planned.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="export">
                <AccordionTrigger>
                  Can I export/import templates?
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">
                  Template export/import is planned for a future release. This
                  will allow you to backup templates and share them as JSON
                  files.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="modify-after">
                <AccordionTrigger>
                  Can I modify settings after selecting a template?
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">
                  Yes! Templates provide defaults, but you can override any
                  setting before generating. The template itself isn't changed.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="usage-tracking">
                <AccordionTrigger>
                  Does using a template count toward my quota?
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">
                  Templates themselves are free. Only the test cases generated
                  when you use the template count toward your monthly quota.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="cross-platform">
                <AccordionTrigger>
                  Do templates work in cross-platform mode?
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">
                  Yes! Templates apply their settings to all selected platforms
                  in cross-platform generation mode.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="recommend">
                <AccordionTrigger>
                  How does the system know which template to recommend?
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">
                  Currently, templates are manually selected. Smart template
                  recommendations based on requirement type are planned for a
                  future release.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="public-copy">
                <AccordionTrigger>
                  Can I modify public templates?
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">
                  You can't edit public templates directly, but you can
                  duplicate them to your library and then customize the copy.
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
                  Resources for template-related assistance.
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
                    <li>Visit our knowledge base for template examples</li>
                  </ul>
                </div>

                <Separator />

                <div>
                  <div className="font-medium text-foreground mb-2">
                    When requesting template support:
                  </div>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Describe what you're trying to achieve</li>
                    <li>Share your current template configuration</li>
                    <li>Explain what's not working as expected</li>
                    <li>Include template ID if reporting a bug</li>
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
                      href="/docs/requirements"
                      className="flex items-center gap-2 text-primary hover:underline"
                    >
                      <FileText className="h-4 w-4" />
                      Requirements Management Guide
                    </Link>
                    <Link
                      href="/docs/best-practices"
                      className="flex items-center gap-2 text-primary hover:underline"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      Testing Best Practices
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
