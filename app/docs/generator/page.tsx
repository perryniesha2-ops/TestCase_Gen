// app/(dashboard)/guides/ai-generator/page.tsx
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
  Sparkles,
  FlaskConical,
  Layers,
  Settings,
  Zap,
  FileText,
  HelpCircle,
  Target,
  TrendingUp,
  Save,
  Monitor,
  Smartphone,
  Globe,
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

function ComparisonTable() {
  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50">
          <tr>
            <th className="p-3 text-left font-medium">Feature</th>
            <th className="p-3 text-left font-medium">Regular Generation</th>
            <th className="p-3 text-left font-medium">Cross-Platform</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          <tr>
            <td className="p-3 font-medium">Best for</td>
            <td className="p-3 text-muted-foreground">
              Single feature testing
            </td>
            <td className="p-3 text-muted-foreground">
              Multi-platform consistency
            </td>
          </tr>
          <tr>
            <td className="p-3 font-medium">Output</td>
            <td className="p-3 text-muted-foreground">One test suite</td>
            <td className="p-3 text-muted-foreground">Suite per platform</td>
          </tr>
          <tr>
            <td className="p-3 font-medium">Setup complexity</td>
            <td className="p-3 text-muted-foreground">Simple</td>
            <td className="p-3 text-muted-foreground">
              Moderate (platform selection)
            </td>
          </tr>
          <tr>
            <td className="p-3 font-medium">Use templates</td>
            <td className="p-3 text-muted-foreground">✓ Supported</td>
            <td className="p-3 text-muted-foreground">✓ Supported</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

export default function AIGeneratorGuidePage() {
  const toc: TocItem[] = [
    {
      id: "overview",
      title: "Overview",
      icon: <BookOpen className="h-4 w-4" />,
    },
    {
      id: "generation-types",
      title: "Generation Types",
      icon: <Layers className="h-4 w-4" />,
    },
    {
      id: "regular-generation",
      title: "Regular Test Cases",
      icon: <FlaskConical className="h-4 w-4" />,
    },
    {
      id: "cross-platform",
      title: "Cross-Platform Testing",
      icon: <Layers className="h-4 w-4" />,
    },
    {
      id: "templates",
      title: "Using Templates",
      icon: <Save className="h-4 w-4" />,
    },
    {
      id: "models",
      title: "AI Models",
      icon: <Sparkles className="h-4 w-4" />,
    },
    {
      id: "coverage",
      title: "Coverage Levels",
      icon: <Target className="h-4 w-4" />,
    },
    {
      id: "best-practices",
      title: "Best Practices",
      icon: <CheckCircle2 className="h-4 w-4" />,
    },
    {
      id: "optimization",
      title: "Optimization Tips",
      icon: <TrendingUp className="h-4 w-4" />,
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
            AI Test Case Generator Guide
          </h1>
          <p className="max-w-2xl text-muted-foreground">
            Generate comprehensive, AI-powered test cases from requirements.
            Choose between regular generation or cross-platform testing for
            multi-device consistency.
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
                <CardTitle>What the AI Generator does</CardTitle>
                <CardDescription>
                  Transform requirements into production-ready test cases using
                  advanced AI models.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <ul className="list-disc pl-5 space-y-1">
                  <li>
                    Generate test cases from natural language requirements
                  </li>
                  <li>Choose from multiple AI models (Claude, GPT)</li>
                  <li>Customize test count and coverage depth</li>
                  <li>
                    Save templates for consistent generation across projects
                  </li>
                  <li>
                    Generate platform-specific tests (Web, Mobile, API,
                    Accessibility, Performance)
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>AI-powered intelligence</AlertTitle>
              <AlertDescription>
                The generator analyzes your requirements and automatically
                creates positive tests, negative tests, edge cases, and boundary
                conditions based on your selected coverage level.
              </AlertDescription>
            </Alert>

            <Card>
              <CardHeader>
                <CardTitle>Prerequisites</CardTitle>
                <CardDescription>
                  What you need before generating test cases.
                </CardDescription>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                <ul className="list-disc pl-5 space-y-1">
                  <li>Active SynthQA account</li>
                  <li>
                    Clear requirements (quick entry or saved requirements)
                  </li>
                  <li>Understanding of your test coverage needs</li>
                </ul>
              </CardContent>
            </Card>
          </Section>

          {/* Generation Types */}
          <Section
            id="generation-types"
            title="Generation Types"
            kicker="Choose your approach"
          >
            <Card>
              <CardHeader>
                <CardTitle>Regular vs. Cross-Platform</CardTitle>
                <CardDescription>
                  Two generation modes for different testing needs.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg border bg-muted/30">
                    <div className="flex items-center gap-2 mb-2">
                      <FlaskConical className="h-5 w-5 text-primary" />
                      <h3 className="font-semibold">Regular Test Cases</h3>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">
                      Generate traditional test cases for specific requirements
                      or features.
                    </p>
                    <ul className="text-xs text-muted-foreground space-y-1">
                      <li>• Focused on single feature/requirement</li>
                      <li>• Quick setup and generation</li>
                      <li>• Flexible requirements input</li>
                      <li>• Save and reuse requirements</li>
                    </ul>
                  </div>

                  <div className="p-4 rounded-lg border bg-muted/30">
                    <div className="flex items-center gap-2 mb-2">
                      <Layers className="h-5 w-5 text-primary" />
                      <h3 className="font-semibold">Cross-Platform Testing</h3>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">
                      Generate platform-optimized tests for Web, Mobile, API,
                      and more.
                    </p>
                    <ul className="text-xs text-muted-foreground space-y-1">
                      <li>• Test across multiple platforms</li>
                      <li>• Framework-specific test cases</li>
                      <li>• Ensure cross-platform consistency</li>
                      <li>• Separate suites per platform</li>
                    </ul>
                  </div>
                </div>

                <ComparisonTable />
              </CardContent>
            </Card>

            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>Which should I use?</AlertTitle>
              <AlertDescription>
                Use <strong>Regular</strong> for feature-specific testing. Use{" "}
                <strong>Cross-Platform</strong> when you need to verify that
                functionality works consistently across web, mobile apps, APIs,
                or accessibility standards.
              </AlertDescription>
            </Alert>
          </Section>

          {/* Regular Generation */}
          <Section
            id="regular-generation"
            title="Regular Test Case Generation"
            kicker="Step-by-step"
          >
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="step1">
                <AccordionTrigger>
                  Step 1: Add Title & Description
                </AccordionTrigger>
                <AccordionContent className="space-y-3 text-sm text-muted-foreground">
                  <p>
                    Give your test generation a clear, descriptive title and
                    optional description.
                  </p>

                  <div className="p-3 rounded-lg border bg-muted/20">
                    <div className="font-medium text-foreground mb-2">
                      Example:
                    </div>
                    <div className="space-y-1 text-xs">
                      <div>
                        <span className="font-medium">Title:</span> User Login
                        Test Cases
                      </div>
                      <div>
                        <span className="font-medium">Description:</span>{" "}
                        Comprehensive test suite for authentication flow
                      </div>
                    </div>
                  </div>

                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertTitle>Auto-population</AlertTitle>
                    <AlertDescription>
                      When using saved requirements, the title and description
                      are automatically populated from the requirement details.
                    </AlertDescription>
                  </Alert>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="step2">
                <AccordionTrigger>Step 2: Define Requirements</AccordionTrigger>
                <AccordionContent className="space-y-3 text-sm text-muted-foreground">
                  <p>Choose between Quick Entry or Saved Requirements:</p>

                  <Tabs defaultValue="quick" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="quick">Quick Entry</TabsTrigger>
                      <TabsTrigger value="saved">
                        Saved Requirements
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="quick" className="space-y-3 mt-3">
                      <p>
                        Type or paste your requirements directly. Be detailed
                        and specific.
                      </p>

                      <div className="p-3 rounded-lg border bg-muted/20 font-mono text-xs">
                        <div className="text-foreground mb-2">
                          Example format:
                        </div>
                        <pre className="text-muted-foreground whitespace-pre-wrap">
                          {`User Login Functionality:
- Email and password authentication
- Password must be at least 8 characters
- Must contain 1 number and 1 special character
- Show specific error messages for invalid credentials
- "Remember me" checkbox for persistent sessions
- Account lockout after 5 failed login attempts
- Password reset via email link
- Session timeout after 30 minutes of inactivity`}
                        </pre>
                      </div>

                      <Alert>
                        <Sparkles className="h-4 w-4" />
                        <AlertTitle>Pro tip</AlertTitle>
                        <AlertDescription>
                          Write 50+ characters of detailed requirements and
                          you'll see a prompt to save them for future reuse.
                        </AlertDescription>
                      </Alert>
                    </TabsContent>

                    <TabsContent value="saved" className="space-y-3 mt-3">
                      <p>
                        Select from your saved requirements library or example
                        templates.
                      </p>

                      <div className="space-y-2">
                        <div className="font-medium text-foreground">
                          Benefits:
                        </div>
                        <ul className="list-disc pl-5 space-y-1">
                          <li>Reuse requirements across projects</li>
                          <li>Build a centralized requirement library</li>
                          <li>Maintain consistent testing standards</li>
                          <li>Quick access to common scenarios</li>
                        </ul>
                      </div>

                      <Alert>
                        <Info className="h-4 w-4" />
                        <AlertTitle>Customization option</AlertTitle>
                        <AlertDescription>
                          Click "Customize" to switch to Quick Entry mode with
                          the selected requirement pre-filled for editing.
                        </AlertDescription>
                      </Alert>
                    </TabsContent>
                  </Tabs>

                  <div className="flex items-start gap-2 p-3 rounded-lg border bg-blue-50 dark:bg-blue-950/20">
                    <FileText className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div className="text-xs">
                      <div className="font-medium text-blue-900 dark:text-blue-100 mb-1">
                        Manage your requirements
                      </div>
                      <div className="text-blue-700 dark:text-blue-300">
                        Visit the Requirements page to create, edit, and
                        organize your requirement library.
                      </div>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="step3">
                <AccordionTrigger>
                  Step 3: Apply Template (Optional)
                </AccordionTrigger>
                <AccordionContent className="space-y-3 text-sm text-muted-foreground">
                  <p>
                    Templates save your preferred AI model, test count, and
                    coverage settings for quick reuse.
                  </p>

                  <div className="space-y-2">
                    <div className="font-medium text-foreground">
                      How to use templates:
                    </div>
                    <ol className="list-decimal pl-5 space-y-1">
                      <li>Click the template dropdown</li>
                      <li>Select an existing template</li>
                      <li>
                        Settings are automatically applied (model, count,
                        coverage)
                      </li>
                      <li>Adjust settings if needed before generating</li>
                    </ol>
                  </div>

                  <div className="space-y-2">
                    <div className="font-medium text-foreground">
                      Creating new templates:
                    </div>
                    <ol className="list-decimal pl-5 space-y-1">
                      <li>Configure your preferred settings</li>
                      <li>Click "Save settings" button</li>
                      <li>Give your template a name and description</li>
                      <li>Select a category</li>
                    </ol>
                  </div>

                  <Alert>
                    <Save className="h-4 w-4" />
                    <AlertTitle>Template categories</AlertTitle>
                    <AlertDescription>
                      Organize templates by type: Functional, Security,
                      Performance, Integration, Regression, Accessibility, or
                      Other.
                    </AlertDescription>
                  </Alert>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="step4">
                <AccordionTrigger>
                  Step 4: Configure Generation Settings
                </AccordionTrigger>
                <AccordionContent className="space-y-4 text-sm text-muted-foreground">
                  <p>
                    Configure three key settings unless you're using a template:
                  </p>

                  <div className="grid md:grid-cols-3 gap-3">
                    <div className="p-3 rounded-lg border">
                      <div className="flex items-center gap-2 mb-2">
                        <Sparkles className="h-4 w-4 text-primary" />
                        <div className="font-medium text-foreground text-sm">
                          AI Model
                        </div>
                      </div>
                      <p className="text-xs mb-2">
                        Choose the AI model for generation.
                      </p>
                      <div className="text-xs space-y-1">
                        <div>• Sonnet 4.5: Best balance</div>
                        <div>• Haiku 4.5: Fastest</div>
                        <div>• Opus 4.5: Maximum quality</div>
                      </div>
                    </div>

                    <div className="p-3 rounded-lg border">
                      <div className="flex items-center gap-2 mb-2">
                        <Target className="h-4 w-4 text-primary" />
                        <div className="font-medium text-foreground text-sm">
                          Test Case Count
                        </div>
                      </div>
                      <p className="text-xs mb-2">
                        Number of test cases to generate.
                      </p>
                      <div className="text-xs space-y-1">
                        <div>• 5-10: Quick validation</div>
                        <div>• 15-20: Standard coverage</div>
                        <div>• 30-50: Comprehensive</div>
                      </div>
                    </div>

                    <div className="p-3 rounded-lg border">
                      <div className="flex items-center gap-2 mb-2">
                        <Settings className="h-4 w-4 text-primary" />
                        <div className="font-medium text-foreground text-sm">
                          Coverage Level
                        </div>
                      </div>
                      <p className="text-xs mb-2">Depth of test coverage.</p>
                      <div className="text-xs space-y-1">
                        <div>• Standard: Core scenarios</div>
                        <div>• Comprehensive: + Edge cases</div>
                        <div>• Exhaustive: + Boundary tests</div>
                      </div>
                    </div>
                  </div>

                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertTitle>Template override</AlertTitle>
                    <AlertDescription>
                      When a template is applied, settings are pre-filled but
                      you can still adjust them before generating.
                    </AlertDescription>
                  </Alert>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="step5">
                <AccordionTrigger>Step 5: Generate</AccordionTrigger>
                <AccordionContent className="space-y-3 text-sm text-muted-foreground">
                  <ol className="list-decimal pl-5 space-y-1">
                    <li>Review all settings</li>
                    <li>Click "Generate Test Cases"</li>
                    <li>Wait for AI processing (typically 10-30 seconds)</li>
                    <li>
                      You'll be redirected to the generated test cases page
                    </li>
                  </ol>

                  <Alert>
                    <CheckCircle2 className="h-4 w-4" />
                    <AlertTitle>Success indicators</AlertTitle>
                    <AlertDescription>
                      You'll see a success message showing the number of test
                      cases created and which AI provider was used.
                    </AlertDescription>
                  </Alert>

                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Usage limits</AlertTitle>
                    <AlertDescription>
                      Free plans have monthly limits. If you hit your limit,
                      you'll see remaining quota and upgrade options.
                    </AlertDescription>
                  </Alert>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </Section>

          {/* Cross-Platform Testing */}
          <Section
            id="cross-platform"
            title="Cross-Platform Testing"
            kicker="Multi-device"
          >
            <Card>
              <CardHeader>
                <CardTitle>Cross-platform workflow</CardTitle>
                <CardDescription>
                  Generate platform-specific test suites in one operation.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-muted-foreground">
                <p>
                  Cross-platform testing generates separate test suites
                  optimized for each selected platform and framework.
                </p>

                <div className="grid md:grid-cols-5 gap-3">
                  <div className="p-3 rounded-lg border text-center">
                    <Monitor className="h-6 w-6 mx-auto mb-2 text-primary" />
                    <div className="font-medium text-xs text-foreground">
                      Web Application
                    </div>
                    <div className="text-xs mt-1">Browser testing</div>
                  </div>
                  <div className="p-3 rounded-lg border text-center">
                    <Smartphone className="h-6 w-6 mx-auto mb-2 text-primary" />
                    <div className="font-medium text-xs text-foreground">
                      Mobile App
                    </div>
                    <div className="text-xs mt-1">iOS/Android</div>
                  </div>
                  <div className="p-3 rounded-lg border text-center">
                    <Globe className="h-6 w-6 mx-auto mb-2 text-primary" />
                    <div className="font-medium text-xs text-foreground">
                      API/Backend
                    </div>
                    <div className="text-xs mt-1">REST/GraphQL</div>
                  </div>
                  <div className="p-3 rounded-lg border text-center">
                    <Info className="h-6 w-6 mx-auto mb-2 text-primary" />
                    <div className="font-medium text-xs text-foreground">
                      Accessibility
                    </div>
                    <div className="text-xs mt-1">WCAG compliance</div>
                  </div>
                  <div className="p-3 rounded-lg border text-center">
                    <Zap className="h-6 w-6 mx-auto mb-2 text-primary" />
                    <div className="font-medium text-xs text-foreground">
                      Performance
                    </div>
                    <div className="text-xs mt-1">Load testing</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="xp-step1">
                <AccordionTrigger>
                  Step 1: Describe the Requirement
                </AccordionTrigger>
                <AccordionContent className="space-y-3 text-sm text-muted-foreground">
                  <p>
                    Provide a clear description of the functionality you want to
                    test across platforms.
                  </p>

                  <div className="p-3 rounded-lg border bg-muted/20 font-mono text-xs">
                    <div className="text-foreground mb-2">Example:</div>
                    <pre className="text-muted-foreground whitespace-pre-wrap">
                      {`User authentication functionality that works consistently 
across web and mobile platforms, including:
- Login with email/password
- Logout functionality
- Password reset flow
- Session management
- Biometric authentication (mobile only)`}
                    </pre>
                  </div>

                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertTitle>Platform-aware descriptions</AlertTitle>
                    <AlertDescription>
                      You can include platform-specific notes in parentheses.
                      The AI will adapt tests accordingly.
                    </AlertDescription>
                  </Alert>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="xp-step2">
                <AccordionTrigger>
                  Step 2: Apply Template (Optional)
                </AccordionTrigger>
                <AccordionContent className="space-y-3 text-sm text-muted-foreground">
                  <p>
                    Templates work the same way in cross-platform mode, applying
                    settings to all platforms.
                  </p>

                  <ul className="list-disc pl-5 space-y-1">
                    <li>Select a template from the dropdown</li>
                    <li>
                      Settings (model, count, coverage) apply to all platforms
                    </li>
                    <li>
                      Save current settings as a new cross-platform template
                    </li>
                  </ul>

                  <Alert>
                    <Save className="h-4 w-4" />
                    <AlertTitle>Template application</AlertTitle>
                    <AlertDescription>
                      When you select a template, all platforms use the same AI
                      model, test count, and coverage level. This ensures
                      consistency across platforms.
                    </AlertDescription>
                  </Alert>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="xp-step3">
                <AccordionTrigger>
                  Step 3: Configure Global Settings
                </AccordionTrigger>
                <AccordionContent className="space-y-3 text-sm text-muted-foreground">
                  <p>Set the same three settings, applied to all platforms:</p>

                  <ul className="list-disc pl-5 space-y-1">
                    <li>
                      <strong>AI Model:</strong> Which model to use for
                      generation
                    </li>
                    <li>
                      <strong>Test Cases per Platform:</strong> How many tests
                      for EACH platform
                    </li>
                    <li>
                      <strong>Coverage Level:</strong> Depth of testing for all
                      platforms
                    </li>
                  </ul>

                  <div className="p-3 rounded-lg border bg-muted/20">
                    <div className="font-medium text-foreground mb-2 text-xs">
                      Example calculation:
                    </div>
                    <div className="text-xs space-y-1">
                      <div>• 3 platforms selected</div>
                      <div>• 10 test cases per platform</div>
                      <div>
                        • <strong>Total: 30 test cases generated</strong>
                      </div>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="xp-step4">
                <AccordionTrigger>
                  Step 4: Select Platforms & Frameworks
                </AccordionTrigger>
                <AccordionContent className="space-y-3 text-sm text-muted-foreground">
                  <p>
                    Choose which platforms to test and select the specific
                    framework for each.
                  </p>

                  <div className="space-y-2">
                    <div className="font-medium text-foreground">
                      For each platform:
                    </div>
                    <ol className="list-decimal pl-5 space-y-1">
                      <li>Check the platform checkbox</li>
                      <li>A framework dropdown appears</li>
                      <li>Select the specific framework/technology</li>
                      <li>Repeat for all desired platforms</li>
                    </ol>
                  </div>

                  <div className="space-y-2">
                    <div className="font-medium text-foreground">
                      Available frameworks by platform:
                    </div>
                    <div className="space-y-1 text-xs">
                      <div>
                        <strong>Web:</strong> React, Vue, Angular, Next.js,
                        Vanilla JS
                      </div>
                      <div>
                        <strong>Mobile:</strong> React Native, Flutter, Native
                        iOS/Android
                      </div>
                      <div>
                        <strong>API:</strong> REST, GraphQL, SOAP, gRPC,
                        WebSocket
                      </div>
                      <div>
                        <strong>Accessibility:</strong> WCAG 2.1 AA/AAA, Section
                        508
                      </div>
                      <div>
                        <strong>Performance:</strong> Load, Stress, Volume,
                        Spike Testing
                      </div>
                    </div>
                  </div>

                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Framework required</AlertTitle>
                    <AlertDescription>
                      You must select a framework for each checked platform
                      before generating. The AI uses this to create
                      framework-appropriate test cases.
                    </AlertDescription>
                  </Alert>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="xp-step5">
                <AccordionTrigger>
                  Step 5: Generate Cross-Platform Tests
                </AccordionTrigger>
                <AccordionContent className="space-y-3 text-sm text-muted-foreground">
                  <ol className="list-decimal pl-5 space-y-1">
                    <li>Review all platforms and settings</li>
                    <li>Verify estimated total test case count</li>
                    <li>Click "Generate Cross-Platform Tests"</li>
                    <li>
                      Wait for processing (30-90 seconds for multiple platforms)
                    </li>
                  </ol>

                  <Alert>
                    <CheckCircle2 className="h-4 w-4" />
                    <AlertTitle>What gets created</AlertTitle>
                    <AlertDescription>
                      A separate test suite for each platform, tagged with the
                      platform and framework for easy filtering.
                    </AlertDescription>
                  </Alert>

                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Partial success handling</AlertTitle>
                    <AlertDescription>
                      If some platforms fail but others succeed, you'll see
                      which platforms completed successfully. Failed platforms
                      can be regenerated individually.
                    </AlertDescription>
                  </Alert>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </Section>

          {/* Templates */}
          <Section id="templates" title="Using Templates" kicker="Efficiency">
            <Card>
              <CardHeader>
                <CardTitle>Template system</CardTitle>
                <CardDescription>
                  Save and reuse your preferred generation settings.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-muted-foreground">
                <div>
                  <div className="font-medium text-foreground mb-2">
                    What templates save:
                  </div>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>AI model selection</li>
                    <li>Test case count</li>
                    <li>Coverage level</li>
                    <li>Optional: edge cases and negative test preferences</li>
                  </ul>
                </div>

                <div>
                  <div className="font-medium text-foreground mb-2">
                    Template categories:
                  </div>
                  <div className="grid md:grid-cols-2 gap-2 text-xs">
                    <div className="p-2 rounded border">
                      <strong>Functional:</strong> Standard feature testing
                    </div>
                    <div className="p-2 rounded border">
                      <strong>Security:</strong> Auth, permissions, encryption
                    </div>
                    <div className="p-2 rounded border">
                      <strong>Performance:</strong> Load, stress, response times
                    </div>
                    <div className="p-2 rounded border">
                      <strong>Integration:</strong> API, third-party services
                    </div>
                    <div className="p-2 rounded border">
                      <strong>Regression:</strong> Existing feature validation
                    </div>
                    <div className="p-2 rounded border">
                      <strong>Accessibility:</strong> WCAG, screen readers
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="create-template">
                <AccordionTrigger>Creating a template</AccordionTrigger>
                <AccordionContent className="space-y-3 text-sm text-muted-foreground">
                  <ol className="list-decimal pl-5 space-y-1">
                    <li>Configure your desired settings in the generator</li>
                    <li>Click the "Save settings" button</li>
                    <li>Provide a name and description</li>
                    <li>Select a category</li>
                    <li>Click "Save Template"</li>
                  </ol>

                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertTitle>Template visibility</AlertTitle>
                    <AlertDescription>
                      Templates are personal by default. Team templates are
                      coming in a future release.
                    </AlertDescription>
                  </Alert>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="use-template">
                <AccordionTrigger>Using a template</AccordionTrigger>
                <AccordionContent className="space-y-3 text-sm text-muted-foreground">
                  <ol className="list-decimal pl-5 space-y-1">
                    <li>Click the template dropdown</li>
                    <li>Browse by category or search by name</li>
                    <li>Click a template to apply it</li>
                    <li>Settings populate automatically</li>
                    <li>Adjust if needed, then generate</li>
                  </ol>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="manage-templates">
                <AccordionTrigger>Managing templates</AccordionTrigger>
                <AccordionContent className="space-y-3 text-sm text-muted-foreground">
                  <p>
                    Visit the Templates page to view all your saved templates.
                  </p>

                  <div>
                    <div className="font-medium text-foreground mb-1">
                      Available actions:
                    </div>
                    <ul className="list-disc pl-5 space-y-1">
                      <li>Edit template name and description</li>
                      <li>Update template settings</li>
                      <li>Change category</li>
                      <li>Delete unused templates</li>
                      <li>Duplicate templates for variations</li>
                    </ul>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </Section>

          {/* AI Models */}
          <Section id="models" title="AI Models" kicker="Options">
            <Card>
              <CardHeader>
                <CardTitle>Choosing the right model</CardTitle>
                <CardDescription>
                  Different models offer different tradeoffs in speed, cost, and
                  quality.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="p-3 rounded-lg border">
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-semibold text-sm">
                        Claude Sonnet 4.5
                      </div>
                      <Badge variant="secondary">Recommended</Badge>
                    </div>
                    <div className="text-xs text-muted-foreground space-y-1">
                      <div>
                        <strong>Best for:</strong> Most test generation tasks
                      </div>
                      <div>
                        <strong>Speed:</strong> Fast (10-15 seconds)
                      </div>
                      <div>
                        <strong>Quality:</strong> Excellent balance
                      </div>
                      <div>
                        <strong>Use when:</strong> You need reliable, thorough
                        test cases quickly
                      </div>
                    </div>
                  </div>

                  <div className="p-3 rounded-lg border">
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-semibold text-sm">
                        Claude Haiku 4.5
                      </div>
                      <Badge variant="outline">Fastest</Badge>
                    </div>
                    <div className="text-xs text-muted-foreground space-y-1">
                      <div>
                        <strong>Best for:</strong> Quick iterations, drafts
                      </div>
                      <div>
                        <strong>Speed:</strong> Very fast (5-8 seconds)
                      </div>
                      <div>
                        <strong>Quality:</strong> Good for simple requirements
                      </div>
                      <div>
                        <strong>Use when:</strong> You need rapid generation for
                        straightforward tests
                      </div>
                    </div>
                  </div>

                  <div className="p-3 rounded-lg border">
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-semibold text-sm">
                        Claude Opus 4.5
                      </div>
                      <Badge variant="default">Maximum Quality</Badge>
                    </div>
                    <div className="text-xs text-muted-foreground space-y-1">
                      <div>
                        <strong>Best for:</strong> Complex, critical features
                      </div>
                      <div>
                        <strong>Speed:</strong> Slower (20-30 seconds)
                      </div>
                      <div>
                        <strong>Quality:</strong> Highest depth and creativity
                      </div>
                      <div>
                        <strong>Use when:</strong> Testing complex business
                        logic or security-critical flows
                      </div>
                    </div>
                  </div>

                  <div className="p-3 rounded-lg border">
                    <div className="font-semibold text-sm mb-2">
                      GPT Models (4o, 4o-mini, 5, 5.2)
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Alternative models with different strengths. GPT-4o offers
                      fast, reliable results; GPT-5 series provides cutting-edge
                      reasoning for complex scenarios.
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>Model recommendations</AlertTitle>
              <AlertDescription>
                Start with <strong>Claude Sonnet 4.5</strong> for most use
                cases. Use <strong>Haiku</strong> for rapid iterations. Reserve{" "}
                <strong>Opus</strong> for your most critical or complex
                requirements.
              </AlertDescription>
            </Alert>
          </Section>

          {/* Coverage Levels */}
          <Section id="coverage" title="Coverage Levels" kicker="Depth">
            <Card>
              <CardHeader>
                <CardTitle>Understanding coverage levels</CardTitle>
                <CardDescription>
                  Coverage determines how thorough and comprehensive your test
                  cases will be.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="p-4 rounded-lg border">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-2 h-2 rounded-full bg-green-500"></div>
                      <div className="font-semibold">Standard Coverage</div>
                    </div>
                    <div className="text-sm text-muted-foreground space-y-2">
                      <div>
                        <strong>Includes:</strong>
                      </div>
                      <ul className="list-disc pl-5 space-y-1 text-xs">
                        <li>Happy path scenarios</li>
                        <li>Basic positive test cases</li>
                        <li>Core functionality validation</li>
                        <li>Common user workflows</li>
                      </ul>
                      <div className="pt-2 text-xs">
                        <strong>Best for:</strong> Quick validation, smoke
                        testing, initial feature checks
                      </div>
                    </div>
                  </div>

                  <div className="p-4 rounded-lg border">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                      <div className="font-semibold">
                        Comprehensive Coverage
                      </div>
                      <Badge variant="secondary">Default</Badge>
                    </div>
                    <div className="text-sm text-muted-foreground space-y-2">
                      <div>
                        <strong>Includes:</strong>
                      </div>
                      <ul className="list-disc pl-5 space-y-1 text-xs">
                        <li>All standard coverage</li>
                        <li>Edge cases and boundary conditions</li>
                        <li>Negative test cases</li>
                        <li>Input validation scenarios</li>
                        <li>Error handling paths</li>
                      </ul>
                      <div className="pt-2 text-xs">
                        <strong>Best for:</strong> Production features,
                        regression testing, standard QA cycles
                      </div>
                    </div>
                  </div>

                  <div className="p-4 rounded-lg border">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                      <div className="font-semibold">Exhaustive Coverage</div>
                    </div>
                    <div className="text-sm text-muted-foreground space-y-2">
                      <div>
                        <strong>Includes:</strong>
                      </div>
                      <ul className="list-disc pl-5 space-y-1 text-xs">
                        <li>All comprehensive coverage</li>
                        <li>Extensive boundary testing</li>
                        <li>Complex interaction scenarios</li>
                        <li>State transition coverage</li>
                        <li>Security and permission tests</li>
                        <li>Performance edge cases</li>
                        <li>Rare but critical scenarios</li>
                      </ul>
                      <div className="pt-2 text-xs">
                        <strong>Best for:</strong> Critical features,
                        security-sensitive flows, compliance requirements
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Consider test maintenance</AlertTitle>
              <AlertDescription>
                Higher coverage means more test cases to maintain. Balance
                thoroughness with practicality based on feature criticality.
              </AlertDescription>
            </Alert>
          </Section>

          {/* Best Practices */}
          <Section id="best-practices" title="Best Practices" kicker="Quality">
            <Card>
              <CardHeader>
                <CardTitle>Writing effective requirements</CardTitle>
                <CardDescription>
                  The quality of your test cases depends on the clarity of your
                  requirements.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid md:grid-cols-2 gap-6">
                <div className="space-y-3 text-sm">
                  <div className="font-medium text-foreground">✅ Do</div>
                  <ul className="space-y-2 text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                      <span>Be specific about expected behavior</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                      <span>Include validation rules and constraints</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                      <span>Mention error states and messages</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                      <span>Specify data types and formats</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                      <span>List user actions step-by-step</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                      <span>Include boundary values (min/max)</span>
                    </li>
                  </ul>
                </div>

                <div className="space-y-3 text-sm">
                  <div className="font-medium text-foreground">❌ Avoid</div>
                  <ul className="space-y-2 text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
                      <span>Vague or ambiguous descriptions</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
                      <span>Missing validation criteria</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
                      <span>Assuming implicit behavior</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
                      <span>Overly technical jargon without context</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
                      <span>Single-line requirements</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
                      <span>Mixing multiple features in one requirement</span>
                    </li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Test case organization</CardTitle>
                <CardDescription>
                  Structure your generations for maintainability.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <ul className="list-disc pl-5 space-y-1">
                  <li>One requirement or feature per generation</li>
                  <li>Use descriptive titles that indicate scope</li>
                  <li>Tag test cases with relevant labels after generation</li>
                  <li>Group related generations by feature area</li>
                  <li>Use projects to organize by sprint or release</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Model selection strategy</CardTitle>
                <CardDescription>
                  Choose models based on requirement complexity.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <div className="grid md:grid-cols-3 gap-3 text-xs">
                  <div className="p-3 rounded-lg border">
                    <div className="font-medium text-foreground mb-1">
                      Haiku 4.5
                    </div>
                    <div>• Simple CRUD operations</div>
                    <div>• Basic form validation</div>
                    <div>• Straightforward UI flows</div>
                  </div>
                  <div className="p-3 rounded-lg border">
                    <div className="font-medium text-foreground mb-1">
                      Sonnet 4.5
                    </div>
                    <div>• Most features (80% of cases)</div>
                    <div>• Multi-step workflows</div>
                    <div>• Standard business logic</div>
                  </div>
                  <div className="p-3 rounded-lg border">
                    <div className="font-medium text-foreground mb-1">
                      Opus 4.5
                    </div>
                    <div>• Complex algorithms</div>
                    <div>• Security-critical features</div>
                    <div>• State management systems</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Section>

          {/* Optimization Tips */}
          <Section
            id="optimization"
            title="Optimization Tips"
            kicker="Performance"
          >
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="count">
                <AccordionTrigger>
                  Choosing the right test count
                </AccordionTrigger>
                <AccordionContent className="space-y-3 text-sm text-muted-foreground">
                  <div>
                    <div className="font-medium text-foreground mb-2">
                      Guidelines:
                    </div>
                    <ul className="list-disc pl-5 space-y-1">
                      <li>
                        <strong>5-10 tests:</strong> Small features, simple
                        validation, smoke tests
                      </li>
                      <li>
                        <strong>15-20 tests:</strong> Standard features, most
                        user stories
                      </li>
                      <li>
                        <strong>30-50 tests:</strong> Complex features, critical
                        paths, comprehensive suites
                      </li>
                    </ul>
                  </div>

                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertTitle>Quality over quantity</AlertTitle>
                    <AlertDescription>
                      More tests aren't always better. Focus on meaningful
                      coverage rather than arbitrary numbers.
                    </AlertDescription>
                  </Alert>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="iterations">
                <AccordionTrigger>Iterative refinement</AccordionTrigger>
                <AccordionContent className="space-y-3 text-sm text-muted-foreground">
                  <ol className="list-decimal pl-5 space-y-1">
                    <li>
                      Start with standard coverage and moderate test count
                    </li>
                    <li>Review generated test cases for relevance</li>
                    <li>Identify gaps or areas needing more depth</li>
                    <li>
                      Regenerate with adjusted settings or refined requirements
                    </li>
                    <li>Combine multiple generations if needed</li>
                  </ol>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="usage">
                <AccordionTrigger>Managing usage limits</AccordionTrigger>
                <AccordionContent className="space-y-3 text-sm text-muted-foreground">
                  <div>
                    <div className="font-medium text-foreground mb-2">
                      Free plan strategies:
                    </div>
                    <ul className="list-disc pl-5 space-y-1">
                      <li>Use Haiku for drafts, then Sonnet for finals</li>
                      <li>Start with lower test counts, then scale up</li>
                      <li>Focus on critical features first</li>
                      <li>Use standard coverage initially</li>
                      <li>Save templates to avoid reconfiguration</li>
                    </ul>
                  </div>

                  <Alert>
                    <TrendingUp className="h-4 w-4" />
                    <AlertTitle>Pro plan benefits</AlertTitle>
                    <AlertDescription>
                      Upgrade for 500 test cases per month, priority access to
                      new models, and faster generation speeds.
                    </AlertDescription>
                  </Alert>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="quality">
                <AccordionTrigger>
                  Improving generation quality
                </AccordionTrigger>
                <AccordionContent className="space-y-3 text-sm text-muted-foreground">
                  <div>
                    <div className="font-medium text-foreground mb-2">
                      Techniques:
                    </div>
                    <ul className="list-disc pl-5 space-y-1">
                      <li>Provide concrete examples in requirements</li>
                      <li>Specify exact validation rules</li>
                      <li>Include sample data formats</li>
                      <li>Mention common error scenarios</li>
                      <li>Reference UI states (enabled/disabled/loading)</li>
                      <li>
                        Call out platform-specific behaviors (cross-platform
                        mode)
                      </li>
                    </ul>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </Section>

          {/* FAQ */}
          <Section id="faq" title="Frequently Asked Questions" kicker="FAQ">
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="regenerate">
                <AccordionTrigger>
                  Can I regenerate if I don't like the results?
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">
                  Yes. You can adjust your settings and regenerate as many times
                  as needed (within usage limits). Each generation is separate,
                  so previous results aren't overwritten.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="edit">
                <AccordionTrigger>
                  Can I edit test cases after generation?
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">
                  Yes. All generated test cases can be edited, updated, or
                  customized after generation. Think of AI generation as a
                  starting point.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="combine">
                <AccordionTrigger>
                  Can I combine multiple requirements in one generation?
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">
                  While possible, it's not recommended. Better results come from
                  focused, single-feature requirements. Generate separately and
                  organize with tags or projects.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="limit">
                <AccordionTrigger>
                  What counts toward my monthly limit?
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">
                  Every test case generated counts toward your limit. In
                  cross-platform mode, if you select 3 platforms with 10 tests
                  each, that's 30 test cases total.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="save">
                <AccordionTrigger>
                  How do I save requirements for reuse?
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">
                  In Quick Entry mode, type 50+ characters and you'll see a save
                  prompt. Or visit the Requirements page to create and manage
                  requirements formally.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="team">
                <AccordionTrigger>
                  Can my team access my templates?
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">
                  Currently, templates are personal. Team template sharing is
                  planned for a future release.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="languages">
                <AccordionTrigger>
                  Can I generate tests in different languages?
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">
                  The AI can understand requirements in multiple languages, but
                  test cases are generated in English by default. Localized
                  output is on the roadmap.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="automation">
                <AccordionTrigger>
                  Can I use these tests for automation?
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">
                  Yes. Test cases include detailed steps that can be translated
                  into automated test scripts. Use the Browser Extension feature
                  to record and export automation code.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="api">
                <AccordionTrigger>
                  Is there an API for programmatic generation?
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">
                  API access is available for Pro and Enterprise plans. Contact
                  support for API documentation and credentials.
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
                    When reporting generation issues, include:
                  </div>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Your requirement description</li>
                    <li>Selected model and settings</li>
                    <li>What you expected vs. what was generated</li>
                    <li>Generation ID (if available)</li>
                  </ul>
                </div>

                <Separator />

                <div>
                  <div className="font-medium text-foreground mb-2">
                    Related guides:
                  </div>
                  <div className="space-y-1">
                    <Link
                      href="/docs/requirements"
                      className="flex items-center gap-2 text-primary hover:underline"
                    >
                      <FileText className="h-4 w-4" />
                      Requirements Management Guide
                    </Link>
                    <Link
                      href="/docs/templates"
                      className="flex items-center gap-2 text-primary hover:underline"
                    >
                      <Save className="h-4 w-4" />
                      Template System Guide
                    </Link>
                    <Link
                      href="/docs/extension-guide"
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
        <div className="h-2" />
      </div>
      <SiteFooter />
    </div>
  );
}
