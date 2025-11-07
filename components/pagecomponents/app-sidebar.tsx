"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  LayoutDashboard,
  ListChecks,
  FileText,
  Sparkles,
  Settings,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

type NavItem = { href: string; label: string; icon: React.ElementType };

const NAV: NavItem[] = [
  { href: "/pages/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/pages/test-cases", label: "Test Cases", icon: ListChecks },
  { href: "/pages/requirements", label: "Requirements", icon: FileText },
  { href: "/pages/generate", label: "Generate", icon: Sparkles },
  { href: "/pages/settings", label: "Settings", icon: Settings },
];

function SidebarLink({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      className={cn(
        "group flex items-center gap-3 rounded-md px-3 py-2 text-sm transition",
        active
          ? "bg-primary/10 text-primary"
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span className="truncate">{item.label}</span>
    </Link>
  );
}

export function AppSidebar({
  className,
  initialCollapsed = false,
}: {
  className?: string;
  initialCollapsed?: boolean;
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = React.useState<boolean>(initialCollapsed);

  // Desktop sidebar
  const SidebarBody = (
    <div
      className={cn(
        "flex h-full flex-col border-r bg-background",
        collapsed ? "w-[64px]" : "w-64",
        className
      )}
    >
      <div className="flex h-14 items-center justify-between px-3">
        <Link
          href="/"
          className={cn(
            "flex items-center gap-2 font-semibold",
            collapsed && "justify-center"
          )}
        >
          <Sparkles className="h-4 w-4" />
          {!collapsed && <span className="truncate">SynthQA</span>}
        </Link>
        <Button
          size="icon"
          variant="ghost"
          className={cn("ml-auto", collapsed && "mx-auto")}
          onClick={() => setCollapsed((c) => !c)}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>

      <Separator />

      <ScrollArea className="flex-1 px-2 py-3">
        <nav className={cn("grid", collapsed ? "gap-1" : "gap-1.5")}>
          {NAV.map((n) => (
            <SidebarLink key={n.href} item={n} active={pathname === n.href} />
          ))}
        </nav>
      </ScrollArea>

      <div className="p-2 text-xs text-muted-foreground">
        <AnimatePresence initial={false}>
          {!collapsed && (
            <motion.div
              key="tip"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6 }}
              transition={{ duration: 0.15 }}
              className="rounded-md border p-3"
            >
              Pro tip: Press <kbd className="rounded border px-1">/</kbd> to search.
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );

  // Mobile uses Sheet
  return (
    <div className="flex">
      <div className="hidden md:block">{SidebarBody}</div>

      <div className="md:hidden">
        <Sheet>
          <SheetTrigger asChild>
            <Button size="sm" variant="outline" className="m-2">
              Menu
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0">
            {SidebarBody}
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
}
