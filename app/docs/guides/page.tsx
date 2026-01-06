// app/(dashboard)/guides/page.tsx
"use client";

import Link from "next/link";
import { GuideMenu } from "@/components/pagecomponents/guide-menu";
import { Logo } from "@/components/pagecomponents/brandlogo";
import { SiteFooter } from "@/components/pagecomponents/site-footer";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Sparkles,
  FileText,
  Layers,
  FolderOpen,
  Settings,
  Chrome,
  CheckCircle2,
} from "lucide-react";
import { Footer } from "react-day-picker";

export default function GuidesIndexPage() {
  const guides = [
    {
      title: "Best Practices",
      description: "Optimize your test case management with proven strategies",
      href: "/docs/best-practices",
      icon: CheckCircle2,
      color: "text-teal-500",
    },
    {
      title: "AI Test Case Generator",
      description:
        "Generate comprehensive test cases from requirements using AI",
      href: "/docs/generator",
      icon: Sparkles,
      color: "text-purple-500",
    },
    {
      title: "Templates",
      description: "Save and reuse test generation settings",
      href: "/docs/templates",
      icon: Settings,
      color: "text-blue-500",
    },
    {
      title: "Requirements",
      description: "Manage and organize test requirements",
      href: "/docs/requirements",
      icon: FileText,
      color: "text-green-500",
    },
    {
      title: "Test Management",
      description: "Execute tests, track results, and manage test suites",
      href: "/docs/test-management",
      icon: Layers,
      color: "text-orange-500",
    },
    {
      title: "Projects",
      description: "Organize your testing work with projects",
      href: "/docs/projects",
      icon: FolderOpen,
      color: "text-indigo-500",
    },
    {
      title: "Browser Extension",
      description: "Capture evidence and automate testing",
      href: "/docs/extension-guide",
      icon: Chrome,
      color: "text-red-500",
    },
  ];

  return (
    <>
      <div className="mx-auto w-full max-w-6xl px-4 py-10">
        <div className="space-y-6">
          <Logo size="xl" />
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Getting Started with SynthQA
            </h1>
            <p className="text-muted-foreground mt-2">
              Comprehensive guides to help you master test case management
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {guides.map((guide) => {
              const Icon = guide.icon;
              return (
                <Link key={guide.href} href={guide.href}>
                  <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer">
                    <CardHeader>
                      <Icon className={`h-8 w-8 mb-2 ${guide.color}`} />
                      <CardTitle>{guide.title}</CardTitle>
                      <CardDescription>{guide.description}</CardDescription>
                    </CardHeader>
                  </Card>
                </Link>
              );
            })}
          </div>
          <div className="pt-10">
            <SiteFooter />
          </div>
        </div>
      </div>
    </>
  );
}
