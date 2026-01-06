// app/(dashboard)/guides/projects/page.tsx
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
  FolderOpen,
  Plus,
  HelpCircle,
  Layers,
  Settings,
  Archive,
  Clock,
  Target,
  Palette,
  Filter,
  Search,
  Smartphone,
  Code,
  Shield,
  Globe,
  Database,
  Cloud,
  Rocket,
  Package,
  Terminal,
  FileText,
  Sparkles,
} from "lucide-react";
import { Logo } from "@/components/pagecomponents/brandlogo";
import { Footer } from "@/components/landingpage/footer";
import { GuideMenu } from "@/components/pagecomponents/guide-menu";

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

function ProjectIconsGuide() {
  const icons = [
    { Icon: FolderOpen, name: "Folder", use: "General projects" },
    { Icon: Smartphone, name: "Smartphone", use: "Mobile apps" },
    { Icon: Code, name: "Code", use: "Development projects" },
    { Icon: Shield, name: "Shield", use: "Security projects" },
    { Icon: Globe, name: "Globe", use: "Web applications" },
    { Icon: Database, name: "Database", use: "Backend/data projects" },
    { Icon: Cloud, name: "Cloud", use: "Cloud infrastructure" },
    { Icon: Rocket, name: "Rocket", use: "Launch/release projects" },
    { Icon: Package, name: "Package", use: "Product releases" },
    { Icon: Terminal, name: "Terminal", use: "CLI/dev tools" },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
      {icons.map(({ Icon, name, use }) => (
        <div key={name} className="p-3 rounded-lg border text-center">
          <Icon className="h-6 w-6 mx-auto mb-2 text-primary" />
          <div className="font-medium text-sm">{name}</div>
          <div className="text-xs text-muted-foreground mt-1">{use}</div>
        </div>
      ))}
    </div>
  );
}

function ColorPalette() {
  const colors = [
    { name: "Blue", class: "bg-blue-500", use: "General purpose" },
    { name: "Green", class: "bg-green-500", use: "Active development" },
    { name: "Purple", class: "bg-purple-500", use: "Planning phase" },
    { name: "Orange", class: "bg-orange-500", use: "In progress" },
    { name: "Red", class: "bg-red-500", use: "Critical/urgent" },
    { name: "Pink", class: "bg-pink-500", use: "Design/UX" },
    { name: "Indigo", class: "bg-indigo-500", use: "Research" },
    { name: "Yellow", class: "bg-yellow-500", use: "Testing phase" },
    { name: "Gray", class: "bg-gray-500", use: "On hold" },
  ];

  return (
    <div className="grid grid-cols-3 md:grid-cols-9 gap-2">
      {colors.map(({ name, class: colorClass, use }) => (
        <div key={name} className="text-center">
          <div className={`w-full h-12 rounded ${colorClass} mb-1`} />
          <div className="text-xs font-medium">{name}</div>
          <div className="text-xs text-muted-foreground">{use}</div>
        </div>
      ))}
    </div>
  );
}

function StatusLifecycle() {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3 p-3 rounded border">
        <div className="w-3 h-3 rounded-full bg-blue-500" />
        <div className="flex-1">
          <div className="font-medium text-sm">Active</div>
          <div className="text-xs text-muted-foreground">
            Currently being worked on
          </div>
        </div>
      </div>
      <div className="flex items-center gap-3 p-3 rounded border">
        <div className="w-3 h-3 rounded-full bg-amber-500" />
        <div className="flex-1">
          <div className="font-medium text-sm">On Hold</div>
          <div className="text-xs text-muted-foreground">
            Temporarily paused
          </div>
        </div>
      </div>
      <div className="flex items-center gap-3 p-3 rounded border">
        <div className="w-3 h-3 rounded-full bg-green-500" />
        <div className="flex-1">
          <div className="font-medium text-sm">Completed</div>
          <div className="text-xs text-muted-foreground">
            Finished and delivered
          </div>
        </div>
      </div>
      <div className="flex items-center gap-3 p-3 rounded border">
        <div className="w-3 h-3 rounded-full bg-gray-500" />
        <div className="flex-1">
          <div className="font-medium text-sm">Archived</div>
          <div className="text-xs text-muted-foreground">
            No longer active, hidden from main view
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ProjectsGuidePage() {
  const toc: TocItem[] = [
    {
      id: "overview",
      title: "Overview",
      icon: <BookOpen className="h-4 w-4" />,
    },
    {
      id: "creating",
      title: "Creating Projects",
      icon: <Plus className="h-4 w-4" />,
    },
    {
      id: "customization",
      title: "Customization",
      icon: <Palette className="h-4 w-4" />,
    },
    {
      id: "organization",
      title: "Organization",
      icon: <Layers className="h-4 w-4" />,
    },
    {
      id: "lifecycle",
      title: "Project Lifecycle",
      icon: <Target className="h-4 w-4" />,
    },
    {
      id: "filtering",
      title: "Filtering & Search",
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
            Projects Guide
          </h1>
          <p className="max-w-2xl text-muted-foreground">
            Organize your testing work with projects. Group test cases,
            requirements, suites, and templates for better structure and
            visibility.
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
                <CardTitle>What are Projects?</CardTitle>
                <CardDescription>
                  Organizational containers that group related testing work
                  together.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <ul className="list-disc pl-5 space-y-1">
                  <li>Group test cases, requirements, suites, and templates</li>
                  <li>Filter and view work by project across the platform</li>
                  <li>Track project-level statistics and progress</li>
                  <li>
                    Customize with colors and icons for visual identification
                  </li>
                  <li>Manage project lifecycle from planning to completion</li>
                  <li>Archive old projects while preserving historical data</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Key benefits</CardTitle>
                <CardDescription>
                  Why use projects to organize your work?
                </CardDescription>
              </CardHeader>
              <CardContent className="grid md:grid-cols-2 gap-4 text-sm">
                <div className="space-y-2">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="font-medium text-foreground">Clarity</div>
                      <div className="text-xs text-muted-foreground">
                        See all work related to a specific product or feature
                      </div>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="font-medium text-foreground">
                        Filtering
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Quickly filter views to show only one project's items
                      </div>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="font-medium text-foreground">Context</div>
                      <div className="text-xs text-muted-foreground">
                        Understand what each test case or requirement belongs to
                      </div>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="font-medium text-foreground">
                        Reporting
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Generate project-specific reports and metrics
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>Optional but recommended</AlertTitle>
              <AlertDescription>
                Projects are optional. You can work without them, but they
                provide valuable organization as your testing grows. Start using
                projects when you have multiple products or features to test.
              </AlertDescription>
            </Alert>
          </Section>

          {/* Creating */}
          <Section
            id="creating"
            title="Creating Projects"
            kicker="Step-by-step"
          >
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="create-new">
                <AccordionTrigger>Creating a new project</AccordionTrigger>
                <AccordionContent className="space-y-3 text-sm text-muted-foreground">
                  <ol className="list-decimal pl-5 space-y-2">
                    <li>Navigate to the Projects page</li>
                    <li>
                      Click <span className="font-medium">+ New Project</span>
                    </li>
                    <li>Enter a project name (required, max 100 characters)</li>
                    <li>Add a description (optional, max 500 characters)</li>
                    <li>Select status (default: Active)</li>
                    <li>Choose an icon and color</li>
                    <li>Set start and target end dates (optional)</li>
                    <li>
                      Click <span className="font-medium">Create Project</span>
                    </li>
                  </ol>

                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertTitle>Start simple</AlertTitle>
                    <AlertDescription>
                      Only the project name is required. You can add details
                      later by editing the project.
                    </AlertDescription>
                  </Alert>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="naming">
                <AccordionTrigger>Naming conventions</AccordionTrigger>
                <AccordionContent className="space-y-3 text-sm text-muted-foreground">
                  <div>
                    <div className="font-medium text-foreground mb-2">
                      Effective project names:
                    </div>
                    <div className="space-y-2 text-xs">
                      <div className="p-2 rounded border bg-muted/20 font-mono">
                        ✅ Mobile App v2.0
                      </div>
                      <div className="p-2 rounded border bg-muted/20 font-mono">
                        ✅ Payment Gateway Integration
                      </div>
                      <div className="p-2 rounded border bg-muted/20 font-mono">
                        ✅ Q1 2026 Security Testing
                      </div>
                      <div className="p-2 rounded border bg-muted/20 font-mono">
                        ✅ Customer Portal Redesign
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="font-medium text-foreground mb-2">
                      Avoid:
                    </div>
                    <div className="space-y-2 text-xs">
                      <div className="p-2 rounded border bg-red-50 dark:bg-red-950/20 font-mono">
                        ❌ Project 1
                      </div>
                      <div className="p-2 rounded border bg-red-50 dark:bg-red-950/20 font-mono">
                        ❌ Test
                      </div>
                      <div className="p-2 rounded border bg-red-50 dark:bg-red-950/20 font-mono">
                        ❌ Stuff to test
                      </div>
                    </div>
                  </div>

                  <div className="p-3 rounded-lg border bg-blue-50 dark:bg-blue-950/20">
                    <div className="font-medium text-sm text-blue-900 dark:text-blue-100 mb-1">
                      Best practice
                    </div>
                    <div className="text-xs text-blue-700 dark:text-blue-300">
                      Use names that identify the product, feature, or
                      initiative. Include version numbers or time periods when
                      relevant.
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="descriptions">
                <AccordionTrigger>Writing descriptions</AccordionTrigger>
                <AccordionContent className="space-y-3 text-sm text-muted-foreground">
                  <p>
                    Good descriptions help team members understand the project
                    scope and purpose.
                  </p>

                  <div>
                    <div className="font-medium text-foreground mb-2">
                      What to include:
                    </div>
                    <ul className="list-disc pl-5 space-y-1">
                      <li>What is being tested</li>
                      <li>Key goals or objectives</li>
                      <li>Target platforms or environments</li>
                      <li>Important context or constraints</li>
                    </ul>
                  </div>

                  <div className="p-3 rounded-lg border bg-muted/20">
                    <div className="font-medium text-foreground mb-2 text-xs">
                      Example:
                    </div>
                    <div className="text-xs">
                      "Complete testing of the mobile app redesign including new
                      checkout flow, updated navigation, and dark mode support.
                      Focus on iOS 16+ and Android 12+. Target launch: March
                      15."
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="dates">
                <AccordionTrigger>Setting project dates</AccordionTrigger>
                <AccordionContent className="space-y-3 text-sm text-muted-foreground">
                  <div>
                    <div className="font-medium text-foreground mb-2">
                      Start Date:
                    </div>
                    <ul className="list-disc pl-5 space-y-1">
                      <li>When testing begins or began</li>
                      <li>Helps track project duration</li>
                      <li>Optional - can be added later</li>
                    </ul>
                  </div>

                  <div>
                    <div className="font-medium text-foreground mb-2">
                      Target End Date:
                    </div>
                    <ul className="list-disc pl-5 space-y-1">
                      <li>When testing should be completed</li>
                      <li>Used for planning and deadline tracking</li>
                      <li>Can be updated as project evolves</li>
                    </ul>
                  </div>

                  <Alert>
                    <Clock className="h-4 w-4" />
                    <AlertTitle>Dates are informational</AlertTitle>
                    <AlertDescription>
                      Dates don't trigger any automated actions. They're for
                      reference and planning purposes only.
                    </AlertDescription>
                  </Alert>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </Section>

          {/* Customization */}
          <Section
            id="customization"
            title="Customization"
            kicker="Visual identity"
          >
            <Card>
              <CardHeader>
                <CardTitle>Colors and icons</CardTitle>
                <CardDescription>
                  Personalize projects for quick visual identification.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="font-medium text-foreground mb-3">
                    Available icons:
                  </div>
                  <ProjectIconsGuide />
                </div>

                <Separator />

                <div>
                  <div className="font-medium text-foreground mb-3">
                    Color palette:
                  </div>
                  <ColorPalette />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Color coding strategies</CardTitle>
                <CardDescription>
                  How to use colors effectively across your projects.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <Tabs defaultValue="by-status" className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="by-status">By Status</TabsTrigger>
                    <TabsTrigger value="by-type">By Type</TabsTrigger>
                    <TabsTrigger value="by-team">By Team</TabsTrigger>
                  </TabsList>

                  <TabsContent value="by-status" className="space-y-2 mt-3">
                    <div className="space-y-1 text-xs">
                      <div>🟢 Green = Active development</div>
                      <div>🔵 Blue = Planning phase</div>
                      <div>🟡 Yellow = Testing in progress</div>
                      <div>🟣 Purple = Awaiting release</div>
                      <div>⚪ Gray = On hold</div>
                    </div>
                  </TabsContent>

                  <TabsContent value="by-type" className="space-y-2 mt-3">
                    <div className="space-y-1 text-xs">
                      <div>🔵 Blue = Web applications</div>
                      <div>🟣 Purple = Mobile apps</div>
                      <div>🟠 Orange = API/Backend</div>
                      <div>🔴 Red = Security projects</div>
                      <div>🟢 Green = Integration projects</div>
                    </div>
                  </TabsContent>

                  <TabsContent value="by-team" className="space-y-2 mt-3">
                    <div className="space-y-1 text-xs">
                      <div>🔵 Blue = Team A projects</div>
                      <div>🟢 Green = Team B projects</div>
                      <div>🟣 Purple = Team C projects</div>
                      <div>🟠 Orange = Cross-team projects</div>
                    </div>
                  </TabsContent>
                </Tabs>

                <Alert>
                  <Palette className="h-4 w-4" />
                  <AlertTitle>Choose a system</AlertTitle>
                  <AlertDescription>
                    Pick one color coding strategy and stick with it across all
                    projects for consistency.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>

            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="icon-selection">
                <AccordionTrigger>Choosing the right icon</AccordionTrigger>
                <AccordionContent className="space-y-3 text-sm text-muted-foreground">
                  <div>
                    <div className="font-medium text-foreground mb-2">
                      Guidelines:
                    </div>
                    <ul className="list-disc pl-5 space-y-1">
                      <li>
                        <strong>Smartphone:</strong> Mobile app projects (iOS,
                        Android)
                      </li>
                      <li>
                        <strong>Globe:</strong> Web applications, websites
                      </li>
                      <li>
                        <strong>Database:</strong> Backend, data layer, API
                        projects
                      </li>
                      <li>
                        <strong>Shield:</strong> Security testing, penetration
                        tests
                      </li>
                      <li>
                        <strong>Rocket:</strong> Launch preparation, go-live
                        testing
                      </li>
                      <li>
                        <strong>Package:</strong> Product releases, feature
                        packages
                      </li>
                      <li>
                        <strong>Cloud:</strong> Cloud infrastructure, DevOps
                      </li>
                      <li>
                        <strong>Code:</strong> Developer tools, libraries, SDKs
                      </li>
                      <li>
                        <strong>Terminal:</strong> CLI tools, scripts,
                        automation
                      </li>
                      <li>
                        <strong>Folder:</strong> General purpose, mixed content
                      </li>
                    </ul>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </Section>

          {/* Organization */}
          <Section
            id="organization"
            title="Organization"
            kicker="Using projects"
          >
            <Card>
              <CardHeader>
                <CardTitle>Assigning items to projects</CardTitle>
                <CardDescription>
                  How to link test cases, requirements, suites, and templates to
                  projects.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4 text-sm">
                  <div className="p-3 rounded-lg border">
                    <div className="font-medium text-foreground mb-2">
                      Test Cases
                    </div>
                    <div className="text-xs text-muted-foreground space-y-1">
                      <div>• During test case creation</div>
                      <div>• When editing test cases</div>
                      <div>• Via bulk update operations</div>
                    </div>
                  </div>

                  <div className="p-3 rounded-lg border">
                    <div className="font-medium text-foreground mb-2">
                      Requirements
                    </div>
                    <div className="text-xs text-muted-foreground space-y-1">
                      <div>• During requirement creation</div>
                      <div>• When editing requirements</div>
                      <div>• Automatically links to generated test cases</div>
                    </div>
                  </div>

                  <div className="p-3 rounded-lg border">
                    <div className="font-medium text-foreground mb-2">
                      Test Suites
                    </div>
                    <div className="text-xs text-muted-foreground space-y-1">
                      <div>• During suite creation</div>
                      <div>• When editing suite details</div>
                      <div>• Optional assignment</div>
                    </div>
                  </div>

                  <div className="p-3 rounded-lg border">
                    <div className="font-medium text-foreground mb-2">
                      Templates
                    </div>
                    <div className="text-xs text-muted-foreground space-y-1">
                      <div>• Coming soon</div>
                      <div>• Will support project assignment</div>
                      <div>• For project-specific settings</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="filtering">
                <AccordionTrigger>
                  Filtering by project across views
                </AccordionTrigger>
                <AccordionContent className="space-y-3 text-sm text-muted-foreground">
                  <p>
                    Once items are assigned to projects, you can filter views to
                    see only items from a specific project.
                  </p>

                  <div>
                    <div className="font-medium text-foreground mb-2">
                      Where filtering is available:
                    </div>
                    <ul className="list-disc pl-5 space-y-1">
                      <li>
                        <strong>Test Cases page:</strong> Project filter
                        dropdown
                      </li>
                      <li>
                        <strong>Requirements page:</strong> Project filter
                        dropdown
                      </li>
                      <li>
                        <strong>Test Suites page:</strong> Project filter
                        dropdown
                      </li>
                      <li>
                        <strong>Reports:</strong> Project-specific analytics
                      </li>
                    </ul>
                  </div>

                  <div className="p-3 rounded-lg border bg-muted/20 text-xs">
                    <strong>How to filter:</strong> Look for the project filter
                    dropdown in the toolbar. Select a project to view only items
                    assigned to it, or select "All Projects" to see everything.
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="statistics">
                <AccordionTrigger>Project statistics</AccordionTrigger>
                <AccordionContent className="space-y-3 text-sm text-muted-foreground">
                  <p>Each project card displays key statistics:</p>

                  <div className="space-y-2">
                    <div className="p-2 rounded border">
                      <div className="font-medium text-foreground text-sm">
                        Test Suites Count
                      </div>
                      <div className="text-xs">
                        Number of test suites assigned to this project
                      </div>
                    </div>
                    <div className="p-2 rounded border">
                      <div className="font-medium text-foreground text-sm">
                        Requirements Count
                      </div>
                      <div className="text-xs">
                        Number of requirements assigned to this project
                      </div>
                    </div>
                    <div className="p-2 rounded border">
                      <div className="font-medium text-foreground text-sm">
                        Templates Count
                      </div>
                      <div className="text-xs">
                        Number of templates assigned to this project
                      </div>
                    </div>
                  </div>

                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertTitle>Live updates</AlertTitle>
                    <AlertDescription>
                      Statistics update automatically as you assign or remove
                      items from projects.
                    </AlertDescription>
                  </Alert>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="unassigned">
                <AccordionTrigger>Working without projects</AccordionTrigger>
                <AccordionContent className="space-y-3 text-sm text-muted-foreground">
                  <p>Items don't need to be assigned to a project.</p>

                  <div>
                    <div className="font-medium text-foreground mb-2">
                      Unassigned items:
                    </div>
                    <ul className="list-disc pl-5 space-y-1">
                      <li>Remain fully functional</li>
                      <li>Appear in "All Projects" view</li>
                      <li>Can be filtered to show "No Project" items</li>
                      <li>Can be assigned to a project later</li>
                    </ul>
                  </div>

                  <div className="p-3 rounded-lg border bg-muted/20 text-xs">
                    <strong>Workflow:</strong> Many teams start without projects
                    and add them later as testing grows. This is perfectly fine
                    - projects are organizational tools, not requirements.
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </Section>

          {/* Lifecycle */}
          <Section
            id="lifecycle"
            title="Project Lifecycle"
            kicker="Status management"
          >
            <Card>
              <CardHeader>
                <CardTitle>Project statuses</CardTitle>
                <CardDescription>
                  Track project progress through different phases.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <StatusLifecycle />

                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertTitle>Status changes</AlertTitle>
                  <AlertDescription>
                    Change status by editing the project. Status doesn't affect
                    functionality - it's purely for organization and tracking.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>

            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="editing">
                <AccordionTrigger>Editing projects</AccordionTrigger>
                <AccordionContent className="space-y-3 text-sm text-muted-foreground">
                  <ol className="list-decimal pl-5 space-y-1">
                    <li>Find the project card</li>
                    <li>Click the three-dot menu (⋯)</li>
                    <li>
                      Select <strong>Edit</strong>
                    </li>
                    <li>Modify any fields</li>
                    <li>
                      Click <strong>Update Project</strong>
                    </li>
                  </ol>

                  <div>
                    <div className="font-medium text-foreground mb-2">
                      What you can edit:
                    </div>
                    <ul className="list-disc pl-5 space-y-1">
                      <li>Project name and description</li>
                      <li>Status</li>
                      <li>Color and icon</li>
                      <li>Start and target end dates</li>
                    </ul>
                  </div>

                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertTitle>No impact on assigned items</AlertTitle>
                    <AlertDescription>
                      Editing project details doesn't affect test cases,
                      requirements, or other items assigned to it.
                    </AlertDescription>
                  </Alert>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="archiving">
                <AccordionTrigger>Archiving projects</AccordionTrigger>
                <AccordionContent className="space-y-3 text-sm text-muted-foreground">
                  <p>
                    Archive projects when they're no longer actively used but
                    you want to preserve historical data.
                  </p>

                  <div>
                    <div className="font-medium text-foreground mb-2">
                      To archive:
                    </div>
                    <ol className="list-decimal pl-5 space-y-1">
                      <li>Click the three-dot menu on the project card</li>
                      <li>
                        Select <strong>Archive</strong>
                      </li>
                      <li>Project moves to the "Archived" tab</li>
                    </ol>
                  </div>

                  <div>
                    <div className="font-medium text-foreground mb-2">
                      What happens:
                    </div>
                    <ul className="list-disc pl-5 space-y-1">
                      <li>Project hidden from main Active view</li>
                      <li>Still appears in project filter dropdowns</li>
                      <li>Assigned items remain accessible</li>
                      <li>Can be unarchived anytime</li>
                    </ul>
                  </div>

                  <Alert>
                    <Archive className="h-4 w-4" />
                    <AlertTitle>Archive vs. Delete</AlertTitle>
                    <AlertDescription>
                      Archiving hides projects from active view while preserving
                      all data. Deleting permanently removes the project (but
                      assigned items remain, just unassigned).
                    </AlertDescription>
                  </Alert>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="unarchiving">
                <AccordionTrigger>Unarchiving projects</AccordionTrigger>
                <AccordionContent className="space-y-3 text-sm text-muted-foreground">
                  <ol className="list-decimal pl-5 space-y-1">
                    <li>Go to the "Archived" tab</li>
                    <li>Find the archived project</li>
                    <li>
                      Click <strong>Restore</strong>
                    </li>
                    <li>Project returns to active state</li>
                  </ol>

                  <p className="text-xs">
                    Unarchiving makes the project visible in the Active tab
                    again with all its original settings and assigned items.
                  </p>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="deleting">
                <AccordionTrigger>Deleting projects</AccordionTrigger>
                <AccordionContent className="space-y-3 text-sm text-muted-foreground">
                  <ol className="list-decimal pl-5 space-y-1">
                    <li>Click the three-dot menu on the project card</li>
                    <li>
                      Select <strong>Delete</strong>
                    </li>
                    <li>Confirm deletion</li>
                  </ol>

                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Permanent action</AlertTitle>
                    <AlertDescription>
                      Deleting a project is permanent. Test cases, requirements,
                      and other items assigned to it will become unassigned but
                      are not deleted. Consider archiving instead.
                    </AlertDescription>
                  </Alert>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </Section>

          {/* Filtering */}
          <Section
            id="filtering"
            title="Filtering & Search"
            kicker="Finding projects"
          >
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="search">
                <AccordionTrigger>Searching projects</AccordionTrigger>
                <AccordionContent className="space-y-3 text-sm text-muted-foreground">
                  <p>
                    Use the search bar to find projects by name or description.
                  </p>

                  <div>
                    <div className="font-medium text-foreground mb-2">
                      Search includes:
                    </div>
                    <ul className="list-disc pl-5 space-y-1">
                      <li>Project name</li>
                      <li>Project description</li>
                    </ul>
                  </div>

                  <div className="p-3 rounded-lg border bg-muted/20">
                    <div className="font-medium text-foreground mb-2 text-xs">
                      Example searches:
                    </div>
                    <div className="space-y-1 text-xs font-mono">
                      <div>
                        "mobile" - All projects with "mobile" in
                        name/description
                      </div>
                      <div>"2026" - Projects with year in name</div>
                      <div>"payment" - Payment-related projects</div>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="status-filter">
                <AccordionTrigger>Filter by status</AccordionTrigger>
                <AccordionContent className="space-y-3 text-sm text-muted-foreground">
                  <ol className="list-decimal pl-5 space-y-1">
                    <li>Click the status filter dropdown</li>
                    <li>Select a status or "All Status"</li>
                    <li>Only projects with that status will be shown</li>
                  </ol>

                  <div className="text-xs mt-2">
                    <strong>Available filters:</strong>
                    <ul className="list-disc pl-5 mt-1 space-y-1">
                      <li>All Status</li>
                      <li>Active</li>
                      <li>Completed</li>
                      <li>On Hold</li>
                      <li>Archived</li>
                    </ul>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="tabs">
                <AccordionTrigger>Active vs. Archived tabs</AccordionTrigger>
                <AccordionContent className="space-y-3 text-sm text-muted-foreground">
                  <div>
                    <div className="font-medium text-foreground mb-1">
                      Active Projects tab
                    </div>
                    <p className="text-xs mb-2">
                      Shows all projects except those with Archived status. This
                      is your main working view.
                    </p>
                  </div>

                  <div>
                    <div className="font-medium text-foreground mb-1">
                      Archived tab
                    </div>
                    <p className="text-xs">
                      Shows only projects with Archived status. Use this to find
                      old projects when you need to reference historical data.
                    </p>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="combining">
                <AccordionTrigger>
                  Combining search and filters
                </AccordionTrigger>
                <AccordionContent className="space-y-3 text-sm text-muted-foreground">
                  <p>You can use search and status filter together:</p>

                  <div className="p-3 rounded-lg border bg-muted/20 text-xs">
                    <strong>Example:</strong> Search for "mobile" and filter by
                    "Active" to see only active mobile projects.
                  </div>

                  <div className="text-xs">
                    Both filters apply simultaneously. Clear search or reset
                    status filter to "All Status" to see more results.
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </Section>

          {/* Best Practices */}
          <Section id="best-practices" title="Best Practices" kicker="Quality">
            <Card>
              <CardHeader>
                <CardTitle>Effective project organization</CardTitle>
                <CardDescription>
                  Strategies for structuring your projects.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid md:grid-cols-2 gap-6 text-sm">
                <div className="space-y-3">
                  <div className="font-medium text-foreground">✅ Do</div>
                  <ul className="space-y-2 text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                      <span>
                        Create projects for distinct products/features
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                      <span>Use clear, descriptive names</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                      <span>Choose consistent color/icon schemes</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                      <span>Archive completed projects regularly</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                      <span>Update status as projects progress</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                      <span>Add meaningful descriptions</span>
                    </li>
                  </ul>
                </div>

                <div className="space-y-3">
                  <div className="font-medium text-foreground">❌ Avoid</div>
                  <ul className="space-y-2 text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
                      <span>Too many small, granular projects</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
                      <span>Generic names like "Project 1"</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
                      <span>Random color choices without system</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
                      <span>Leaving all projects as "Active" forever</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
                      <span>Creating projects for temporary work</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
                      <span>Forgetting to archive old projects</span>
                    </li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Project structure patterns</CardTitle>
                <CardDescription>
                  Common ways to organize projects.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-muted-foreground">
                <Tabs defaultValue="by-product" className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="by-product">By Product</TabsTrigger>
                    <TabsTrigger value="by-release">By Release</TabsTrigger>
                    <TabsTrigger value="by-type">By Type</TabsTrigger>
                  </TabsList>

                  <TabsContent value="by-product" className="space-y-2 mt-3">
                    <p className="text-xs mb-2">
                      One project per product or application:
                    </p>
                    <div className="space-y-1 text-xs font-mono bg-muted/20 p-3 rounded">
                      <div>• Mobile App iOS</div>
                      <div>• Mobile App Android</div>
                      <div>• Web Application</div>
                      <div>• Admin Dashboard</div>
                      <div>• Public API</div>
                    </div>
                    <p className="text-xs mt-2">
                      <strong>Best for:</strong> Teams with multiple distinct
                      products
                    </p>
                  </TabsContent>

                  <TabsContent value="by-release" className="space-y-2 mt-3">
                    <p className="text-xs mb-2">
                      One project per major release or version:
                    </p>
                    <div className="space-y-1 text-xs font-mono bg-muted/20 p-3 rounded">
                      <div>• Product v2.0 Release</div>
                      <div>• Product v2.1 Release</div>
                      <div>• Q1 2026 Features</div>
                      <div>• Q2 2026 Features</div>
                    </div>
                    <p className="text-xs mt-2">
                      <strong>Best for:</strong> Time-based release cycles
                    </p>
                  </TabsContent>

                  <TabsContent value="by-type" className="space-y-2 mt-3">
                    <p className="text-xs mb-2">
                      One project per testing type or initiative:
                    </p>
                    <div className="space-y-1 text-xs font-mono bg-muted/20 p-3 rounded">
                      <div>• Security Testing 2026</div>
                      <div>• Performance Testing</div>
                      <div>• Accessibility Compliance</div>
                      <div>• Integration Testing</div>
                    </div>
                    <p className="text-xs mt-2">
                      <strong>Best for:</strong> Specialized testing teams
                    </p>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>When to create a project</CardTitle>
                <CardDescription>
                  Deciding if you need a new project.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <div>
                  <div className="font-medium text-foreground mb-2">
                    Create a project when:
                  </div>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>
                      Testing a new product or major feature that will have
                      ongoing work
                    </li>
                    <li>
                      Starting a distinct testing initiative (e.g., security
                      audit)
                    </li>
                    <li>
                      Managing work that spans multiple sprints or releases
                    </li>
                    <li>
                      Needing to separate reporting and metrics by product/area
                    </li>
                  </ul>
                </div>

                <div>
                  <div className="font-medium text-foreground mb-2">
                    Don't create a project when:
                  </div>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>
                      Testing a small bug fix or minor feature (use existing
                      project)
                    </li>
                    <li>
                      Work is temporary or one-time (doesn't need long-term
                      organization)
                    </li>
                    <li>You're just starting and have only a few test cases</li>
                    <li>The work fits well within an existing project</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Maintenance schedule</CardTitle>
                <CardDescription>
                  Keep your projects organized over time.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <div>
                  <div className="font-medium text-foreground mb-2">
                    Regular maintenance:
                  </div>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>
                      <strong>Monthly:</strong> Review project statuses, update
                      to reflect current state
                    </li>
                    <li>
                      <strong>Quarterly:</strong> Archive completed projects,
                      review if all projects are still needed
                    </li>
                    <li>
                      <strong>After releases:</strong> Mark projects as
                      completed or archived
                    </li>
                    <li>
                      <strong>As needed:</strong> Update descriptions when
                      project scope changes
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
                  How many projects can I create?
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">
                  There's no hard limit. However, we recommend keeping it
                  manageable - typically 5-20 active projects for most teams.
                  Archive completed projects to reduce clutter.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="required">
                <AccordionTrigger>
                  Are projects required for testing?
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">
                  No, projects are optional. You can create and use test cases,
                  requirements, suites, and templates without assigning them to
                  projects. Projects are organizational tools for when you need
                  them.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="reassign">
                <AccordionTrigger>
                  Can I move items between projects?
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">
                  Yes. Edit the test case, requirement, or suite and change its
                  project assignment. Items can also be unassigned from projects
                  entirely.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="delete-impact">
                <AccordionTrigger>
                  What happens to items when I delete a project?
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">
                  The project is deleted, but all test cases, requirements,
                  suites, and templates remain intact - they just become
                  unassigned. You can reassign them to another project or leave
                  them unassigned.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="sharing">
                <AccordionTrigger>
                  Can I share projects with team members?
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">
                  Currently, all data in your account is private to you. Team
                  collaboration features including shared projects are planned
                  for a future release.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="color-change">
                <AccordionTrigger>
                  Can I change project colors and icons?
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">
                  Yes, anytime. Edit the project and select new color/icon. The
                  change applies immediately across all views where the project
                  appears.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="export">
                <AccordionTrigger>Can I export project data?</AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">
                  Direct project export is planned for a future release. You can
                  currently export test cases and other items that belong to a
                  project by filtering to that project first.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="reporting">
                <AccordionTrigger>
                  Are there project-specific reports?
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">
                  Yes, when viewing reports you can filter by project to see
                  metrics and analytics specific to that project's test cases
                  and suites.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="templates">
                <AccordionTrigger>
                  Can I create project templates?
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">
                  Not yet. Currently each project is created individually.
                  Project templates or duplication features are planned for
                  future releases.
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
                  Resources for project management assistance.
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
                    <li>Visit our knowledge base for examples</li>
                  </ul>
                </div>

                <Separator />

                <div>
                  <div className="font-medium text-foreground mb-2">
                    When requesting project support:
                  </div>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Describe your team structure and testing needs</li>
                    <li>Share your current project organization challenges</li>
                    <li>Explain what you're trying to achieve</li>
                    <li>Include screenshots if reporting UI issues</li>
                  </ul>
                </div>

                <Separator />

                <div>
                  <div className="font-medium text-foreground mb-2">
                    Related guides:
                  </div>
                  <div className="space-y-1">
                    <Link
                      href="/guides/test-management"
                      className="flex items-center gap-2 text-primary hover:underline"
                    >
                      <Layers className="h-4 w-4" />
                      Test Case Management Guide
                    </Link>
                    <Link
                      href="/guides/requirements"
                      className="flex items-center gap-2 text-primary hover:underline"
                    >
                      <FileText className="h-4 w-4" />
                      Requirements Management Guide
                    </Link>
                    <Link
                      href="/guides/ai-generator"
                      className="flex items-center gap-2 text-primary hover:underline"
                    >
                      <Sparkles className="h-4 w-4" />
                      AI Test Generator Guide
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
      <Footer />
    </div>
  );
}
