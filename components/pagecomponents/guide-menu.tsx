// components/guides/GuideMenu.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarSeparator,
  MenubarTrigger,
} from "@/components/ui/menubar";
import {
  BookOpen,
  Sparkles,
  FileText,
  Layers,
  FolderOpen,
  Play,
  Chrome,
  Settings,
  BarChart3,
  Home,
  Code2,
} from "lucide-react";
import { cn } from "@/lib/utils";

export function GuideMenu() {
  const pathname = usePathname();

  const isActive = (path: string) => pathname === path;

  return (
    <Menubar className="w-full h-10 bg-transparent">
      {/* Getting Started */}
      <MenubarMenu>
        <MenubarTrigger className="cursor-pointer">
          <BookOpen className="h-10 w-4 mr-5" />
          Getting Started
        </MenubarTrigger>
        <MenubarContent>
          <MenubarItem asChild>
            <Link
              href="/docs/guides"
              className={cn(
                "cursor-pointer",
                isActive("/docs/guides") && "bg-accent"
              )}
            >
              <BookOpen className="h-4 w-4 mr-2" />
              All Guides
            </Link>
          </MenubarItem>
        </MenubarContent>
      </MenubarMenu>

      {/* Test Generation */}
      <MenubarMenu>
        <MenubarTrigger className="cursor-pointer">
          <Sparkles className="h-4 w-4 mr-2" />
          Test Generation
        </MenubarTrigger>
        <MenubarContent>
          <MenubarItem asChild>
            <Link
              href="/docs/generator"
              className={cn(
                "cursor-pointer",
                isActive("/docs/generator") && "bg-accent"
              )}
            >
              <Sparkles className="h-4 w-4 mr-2" />
              AI Test Case Generator
            </Link>
          </MenubarItem>
          <MenubarItem asChild>
            <Link
              href="/docs/templates"
              className={cn(
                "cursor-pointer",
                isActive("/docs/templates") && "bg-accent"
              )}
            >
              <Settings className="h-4 w-4 mr-2" />
              Templates
            </Link>
          </MenubarItem>
        </MenubarContent>
      </MenubarMenu>

      {/* Test Management */}
      <MenubarMenu>
        <MenubarTrigger className="cursor-pointer">
          <Layers className="h-4 w-4 mr-2" />
          Test Management
        </MenubarTrigger>
        <MenubarContent>
          <MenubarItem asChild>
            <Link
              href="/docs/test-management"
              className={cn(
                "cursor-pointer",
                isActive("/docs/test-management") && "bg-accent"
              )}
            >
              <Layers className="h-4 w-4 mr-2" />
              Test Cases & Execution
            </Link>
          </MenubarItem>
          <MenubarSeparator />
          <MenubarItem asChild disabled>
            <span className="text-xs text-muted-foreground px-2">
              Quick Links:
            </span>
          </MenubarItem>
          <MenubarItem asChild>
            <Link
              href="/docs/test-management#test-cases"
              className="cursor-pointer pl-6 text-sm"
            >
              Managing Test Cases
            </Link>
          </MenubarItem>
          <MenubarItem asChild>
            <Link
              href="/guides/test-management#test-suites"
              className="cursor-pointer pl-6 text-sm"
            >
              Test Suites
            </Link>
          </MenubarItem>
          <MenubarItem asChild>
            <Link
              href="/docs/test-management#execution"
              className="cursor-pointer pl-6 text-sm"
            >
              Running Tests
            </Link>
          </MenubarItem>
          <MenubarItem asChild>
            <Link
              href="/guides/test-management#evidence"
              className="cursor-pointer pl-6 text-sm"
            >
              Test Evidence
            </Link>
          </MenubarItem>
        </MenubarContent>
      </MenubarMenu>

      {/* Organization */}
      <MenubarMenu>
        <MenubarTrigger className="cursor-pointer">
          <FolderOpen className="h-4 w-4 mr-2" />
          Organization
        </MenubarTrigger>
        <MenubarContent>
          <MenubarItem asChild>
            <Link
              href="/docs/requirements"
              className={cn(
                "cursor-pointer",
                isActive("/docs/requirements") && "bg-accent"
              )}
            >
              <FileText className="h-4 w-4 mr-2" />
              Requirements
            </Link>
          </MenubarItem>
          <MenubarItem asChild>
            <Link
              href="/docs/projects"
              className={cn(
                "cursor-pointer",
                isActive("/docs/projects") && "bg-accent"
              )}
            >
              <FolderOpen className="h-4 w-4 mr-2" />
              Projects
            </Link>
          </MenubarItem>
        </MenubarContent>
      </MenubarMenu>

      {/* Tools & Extensions */}
      <MenubarMenu>
        <MenubarTrigger className="cursor-pointer">
          <Chrome className="h-4 w-4 mr-2" />
          Tools
        </MenubarTrigger>
        <MenubarContent>
          <MenubarItem asChild>
            <Link
              href="/docs/extension-guide"
              className={cn(
                "cursor-pointer",
                isActive("/docs/extension-guide") && "bg-accent"
              )}
            >
              <Chrome className="h-4 w-4 mr-2" />
              Browser Extension
            </Link>
          </MenubarItem>
          <MenubarItem asChild>
            <Link
              href="/docs/playwright-automation"
              className={cn(
                "cursor-pointer",
                isActive("/docs/playwright-automation") && "bg-accent"
              )}
            >
              <Code2 className="h-4 w-4 mr-2" />
              Playwright Automation
            </Link>
          </MenubarItem>
          <MenubarSeparator />
          <MenubarItem asChild disabled>
            <span className="text-xs text-muted-foreground">Coming Soon</span>
          </MenubarItem>
          <MenubarItem disabled>
            <BarChart3 className="h-4 w-4 mr-2" />
            Reports & Analytics
          </MenubarItem>
        </MenubarContent>
      </MenubarMenu>
    </Menubar>
  );
}
