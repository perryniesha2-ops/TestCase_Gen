"use client";

// components/MobileMenuButton.tsx
//
// Drop this into any page header to get a mobile menu trigger.
// Works independently — owns its own Sheet state.
//
// Usage:
//   import { MobileMenuButton } from "@/components/MobileMenuButton";
//   <MobileMenuButton />

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Home,
  FlaskConical,
  FileText,
  BarChart3,
  Settings,
  HelpCircle,
  LogOut,
  Menu,
  User,
  CircleDollarSign,
  Layout,
  Newspaper,
  Layers,
  Zap,
  Lock,
  Library,
} from "lucide-react";
import { toast } from "sonner";

const PRO_ONLY_ROUTES = [
  "/automation",
  "/test-library",
  "/requirements",
  "/project-manager",
  "/template-manager",
  "/analytics",
  "/integrations",
  "/test-runs",
];

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: Home },
  { name: "Projects", href: "/project-manager", icon: Newspaper },
  { name: "Requirements", href: "/requirements", icon: BarChart3 },
  { name: "Generate Tests", href: "/generate", icon: FlaskConical },
  { name: "Cross-Platform Tests", href: "/cross-platform-cases", icon: Layers },
  { name: "Test Cases", href: "/test-cases", icon: FileText },
  { name: "Test Suites", href: "/test-library", icon: Library },
  { name: "Automation", href: "/automation", icon: Zap },
  { name: "Templates", href: "/template-manager", icon: Layout },
];

const secondaryNavigation = [
  { name: "Settings", href: "/settings", icon: Settings },
  { name: "Billing", href: "/billing", icon: CircleDollarSign },
  { name: "Help & Support", href: "/contact", icon: HelpCircle },
];

interface MobileMenuButtonProps {
  userTier?: "free" | "pro";
  className?: string;
}

export function MobileMenuButton({
  userTier = "free",
  className,
}: MobileMenuButtonProps) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();

  const isActive = (href: string) =>
    href === "/dashboard"
      ? pathname === "/dashboard" || pathname === "/"
      : pathname.startsWith(href);

  const isLocked = (href: string) =>
    PRO_ONLY_ROUTES.some((r) => href.startsWith(r)) && userTier === "free";

  const handleNavClick = (href: string) => {
    if (isLocked(href)) {
      router.push(
        `/billing?upgrade=required&feature=${href.split("/")[1]}&redirect=${href}`,
      );
    } else {
      router.push(href);
    }
    setOpen(false);
  };

  async function handleSignOut() {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      router.push("/beta-login");
      toast.success("Signed out successfully");
    } catch {
      toast.error("Failed to sign out");
    }
    setOpen(false);
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn("h-9 w-9 md:hidden", className)}
          aria-label="Open navigation menu"
        >
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>

      <SheetContent side="left" className="p-0 w-64">
        <SheetHeader className="sr-only">
          <SheetTitle>Navigation Menu</SheetTitle>
        </SheetHeader>

        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-16 items-center px-4 border-b">
            <Link href="/dashboard" onClick={() => setOpen(false)}>
              <Image
                src="/logo-sq-dark.svg"
                alt="SynthQA"
                width={120}
                height={48}
                className="hidden dark:inline-block h-10 w-auto"
              />
              <Image
                src="/logo-sq-light.svg"
                alt="SynthQA"
                width={120}
                height={48}
                className="inline-block dark:hidden h-10 w-auto"
              />
            </Link>
          </div>

          {/* Nav */}
          <div className="flex-1 px-4 py-6 overflow-y-auto">
            <nav className="space-y-1">
              {[...navigation, ...secondaryNavigation].map((item) => {
                const Icon = item.icon;
                const locked = isLocked(item.href);
                return (
                  <Button
                    key={item.name}
                    variant={isActive(item.href) ? "secondary" : "ghost"}
                    className={cn(
                      "w-full justify-start gap-3 h-10",
                      isActive(item.href) && "bg-secondary font-medium",
                      locked && "opacity-60",
                    )}
                    onClick={() => handleNavClick(item.href)}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="flex-1 text-left truncate">
                      {item.name}
                    </span>
                    {locked && (
                      <Lock className="h-3 w-3 shrink-0 text-muted-foreground" />
                    )}
                  </Button>
                );
              })}
            </nav>

            {userTier === "free" && (
              <div className="mt-4 rounded-lg bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/20 p-3 space-y-2">
                <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                  <Zap className="h-3 w-3" />
                  Upgrade to Pro
                </p>
                <p className="text-xs text-muted-foreground">
                  Unlock automation, test suites, requirements, and more.
                </p>
                <Button
                  size="sm"
                  className="w-full h-7 text-xs bg-amber-500 hover:bg-amber-600 text-white"
                  onClick={() => {
                    router.push("/billing");
                    setOpen(false);
                  }}
                >
                  View Plans
                </Button>
              </div>
            )}
          </div>

          {/* Sign out */}
          <div className="border-t p-4">
            <Button
              variant="outline"
              className="w-full justify-start gap-3"
              onClick={handleSignOut}
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
