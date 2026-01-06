"use client";

import Image from "next/image";
import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  CreditCard,
  Bell,
  ChevronDown,
  Library,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Layout,
  Newspaper,
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

interface UserProfile {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
}

interface SidebarProps {
  className?: string;
  initialCollapsed?: boolean;
}

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: Home },
  { name: "Requirements", href: "/requirements", icon: BarChart3 },
  { name: "Generate Tests", href: "/generate", icon: FlaskConical },
  { name: "Test Cases", href: "/test-cases", icon: FileText },
  { name: "Test Suites", href: "/test-library", icon: Library },
  { name: "Templates", href: "/template-manager", icon: Layout },
  { name: "Projects", href: "/project-manager", icon: Newspaper },
];

const secondaryNavigation = [
  { name: "Settings", href: "/settings", icon: Settings },
  { name: "Billing", href: "/billing", icon: CircleDollarSign },
  { name: "Help & Support", href: "/contact", icon: HelpCircle },
];

export function AppSidebar({
  className,
  initialCollapsed = false,
}: SidebarProps) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Persist collapsed state in localStorage
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("sidebar-collapsed");
      return saved ? JSON.parse(saved) : initialCollapsed;
    }
    return initialCollapsed;
  });

  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();

  useEffect(() => {
    (async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          setUser({
            id: user.id,
            email: user.email || "",
            full_name: user.user_metadata?.full_name || "",
            avatar_url: user.user_metadata?.avatar_url || "",
          });
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [supabase]);

  // Save collapsed state to localStorage
  useEffect(() => {
    localStorage.setItem("sidebar-collapsed", JSON.stringify(collapsed));
  }, [collapsed]);

  // Keyboard shortcut: Ctrl/Cmd + B to toggle sidebar
  useEffect(() => {
    const handleKeyboard = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "b") {
        e.preventDefault();
        setCollapsed((c: boolean) => !c); // Add type here
      }
    };

    window.addEventListener("keydown", handleKeyboard);
    return () => window.removeEventListener("keydown", handleKeyboard);
  }, []);

  async function handleSignOut() {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      router.push("/beta-login");
      toast.success("Signed out successfully");
    } catch (error) {
      console.error("Error signing out:", error);
      toast.error("Failed to sign out");
    }
  }

  const getUserInitials = (name: string, email: string) => {
    if (name) {
      return name
        .split(" ")
        .map((w) => w.charAt(0).toUpperCase())
        .slice(0, 2)
        .join("");
    }
    return email.charAt(0).toUpperCase();
  };

  const isActive = (href: string) => {
    if (href === "/dashboard")
      return pathname === "/dashboard" || pathname === "/";
    return pathname.startsWith(href);
  };

  const NavButton = ({
    name,
    href,
    Icon,
  }: {
    name: string;
    href: string;
    Icon: React.ElementType;
  }) => {
    const button = (
      <Button
        variant={isActive(href) ? "secondary" : "ghost"}
        className={cn(
          "w-full h-10 transition justify-start relative",
          collapsed ? "px-0 mx-auto w-10" : "gap-3 px-3",
          isActive(href) && "bg-secondary font-medium"
        )}
        onClick={() => {
          router.push(href);
          setIsMobileOpen(false);
        }}
      >
        <Icon className="h-4 w-4 shrink-0" />
        {!collapsed && <span className="truncate">{name}</span>}
        {/* Active indicator when collapsed */}
        {collapsed && isActive(href) && (
          <span className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary rounded-l" />
        )}
      </Button>
    );

    // Show tooltip when collapsed
    if (collapsed) {
      return (
        <Tooltip>
          <TooltipTrigger asChild>{button}</TooltipTrigger>
          <TooltipContent side="right">{name}</TooltipContent>
        </Tooltip>
      );
    }

    return button;
  };

  const SidebarContent = () => (
    <TooltipProvider>
      <div className="flex h-full flex-col">
        {/* Brand / Collapse toggle */}
        <div
          className={cn(
            "flex items-center border-b",
            collapsed ? "h-20 flex-col justify-center gap-1 px-0" : "h-16 px-4"
          )}
        >
          <Link href="/dashboard" className="flex items-center justify-center">
            {collapsed ? (
              // Collapsed icon - centered and larger
              <div className="h-10 w-10 rounded-lg flex items-center justify-center">
                <Image
                  src="/logo-icon-dark.svg"
                  alt="SQ"
                  width={32}
                  height={32}
                  className="hidden dark:inline-block h-15 w-15"
                />
                <Image
                  src="/logo-icon-light.svg"
                  alt="SQ"
                  width={32}
                  height={32}
                  className="inline-block dark:hidden h-15 w-15"
                />
              </div>
            ) : (
              <>
                <Image
                  src="/logo-sq-dark.svg"
                  alt="SynthQA Logo"
                  width={300}
                  height={48}
                  className="hidden dark:inline-block h-15 w-auto"
                  loading="eager"
                  priority
                />
                <Image
                  src="/logo-sq-light.svg"
                  alt="SynthQA Logo"
                  width={120}
                  height={48}
                  className="inline-block dark:hidden h-15 w-auto"
                  loading="eager"
                  priority
                />
              </>
            )}
          </Link>

          {/* Collapse button */}
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className={cn(
              "hidden lg:inline-flex h-6 w-6",
              collapsed ? "p-0" : "ml-auto"
            )}
            onClick={() => setCollapsed((c: boolean) => !c)}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={collapsed ? "Expand (Ctrl+B)" : "Collapse (Ctrl+B)"}
          >
            {collapsed ? (
              <ChevronRight className="h-3 w-3" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </Button>
        </div>
        {/* Primary nav */}
        <div className={cn("flex-1 px-2 py-4", collapsed && "px-1")}>
          <nav className="space-y-2">
            <div className="space-y-1">
              {navigation.map((item) => (
                <NavButton
                  key={item.name}
                  name={item.name}
                  href={item.href}
                  Icon={item.icon}
                />
              ))}
            </div>

            {/* Secondary */}
            <div
              className={cn("pt-4 mt-4 border-t", collapsed ? "mx-1" : "")}
            />
            <div className="space-y-1">
              {secondaryNavigation.map((item) => (
                <NavButton
                  key={item.name}
                  name={item.name}
                  href={item.href}
                  Icon={item.icon}
                />
              ))}
            </div>
          </nav>
        </div>

        {/* User block */}
        <div className={cn("border-t p-2", collapsed && "px-1")}>
          {loading ? (
            <div
              className={cn(
                "flex items-center gap-3",
                collapsed ? "justify-center py-2" : "px-2 py-2"
              )}
            >
              <div className="h-8 w-8 rounded-full bg-muted animate-pulse" />
              {!collapsed && (
                <div className="flex-1 space-y-1">
                  <div className="h-4 bg-muted rounded animate-pulse" />
                  <div className="h-3 bg-muted rounded w-2/3 animate-pulse" />
                </div>
              )}
            </div>
          ) : user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className={cn(
                    "w-full h-auto hover:bg-muted",
                    collapsed ? "justify-center p-2" : "justify-start gap-3 p-2"
                  )}
                >
                  <Avatar className="h-8 w-8 shrink-0">
                    <AvatarImage
                      src={user.avatar_url}
                      alt={user.full_name || user.email}
                    />
                    <AvatarFallback className="text-xs">
                      {getUserInitials(user.full_name || "", user.email)}
                    </AvatarFallback>
                  </Avatar>
                  {!collapsed && (
                    <>
                      <div className="flex-1 text-left min-w-0">
                        <p className="text-sm font-medium truncate">
                          {user.full_name || "User"}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {user.email}
                        </p>
                      </div>
                      <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
                    </>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {user.full_name || "User"}
                    </p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {user.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => router.push("/settings")}>
                  <User className="mr-2 h-4 w-4" />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push("/billing")}>
                  <CreditCard className="mr-2 h-4 w-4" />
                  Billing
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => router.push("/settings?tab=notifications")}
                >
                  <Bell className="mr-2 h-4 w-4" />
                  Notifications
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleSignOut}
                  className="text-red-600"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button
              variant="outline"
              className={cn("w-full", collapsed && "w-10 px-0")}
              onClick={() => router.push("/beta-login")}
              title={collapsed ? "Sign in" : undefined}
            >
              {collapsed ? <User className="h-4 w-4" /> : "Sign In"}
            </Button>
          )}
        </div>
      </div>
    </TooltipProvider>
  );

  return (
    <>
      {/* Desktop Sidebar (collapsible width) */}
      <aside
        className={cn(
          "hidden md:block border-r bg-background transition-[width] duration-200 ease-in-out",
          collapsed ? "w-[56px]" : "w-64",
          className
        )}
      >
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar (Sheet) */}
      <Sheet open={isMobileOpen} onOpenChange={setIsMobileOpen}>
        <SheetTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className="md:hidden fixed top-4 left-4 z-50"
          >
            <Menu className="h-4 w-4" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="p-0 w-64">
          <SheetHeader className="sr-only">
            <SheetTitle>Navigation Menu</SheetTitle>
          </SheetHeader>
          <MobileSidebar
            user={user}
            loading={loading}
            handleSignOut={handleSignOut}
            setIsMobileOpen={setIsMobileOpen}
          />
        </SheetContent>
      </Sheet>
    </>
  );
}

/** Mobile sidebar content */
function MobileSidebar({
  user,
  loading,
  handleSignOut,
  setIsMobileOpen,
}: {
  user: UserProfile | null;
  loading: boolean;
  handleSignOut: () => Promise<void>;
  setIsMobileOpen: (open: boolean) => void;
}) {
  const router = useRouter();
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === "/dashboard"
      ? pathname === "/dashboard" || pathname === "/"
      : pathname.startsWith(href);

  return (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className="flex h-16 items-center px-4 border-b">
        <Link href="/dashboard" className="flex items-center gap-2">
          <Image
            src="/logo-sq-dark.svg"
            alt="SynthQA Logo"
            width={120}
            height={48}
            className="hidden dark:inline-block h-10 w-auto"
          />
          <Image
            src="/logo-sq-light.svg"
            alt="SynthQA Logo"
            width={120}
            height={48}
            className="inline-block dark:hidden h-10 w-auto"
          />
        </Link>
      </div>

      {/* Navigation */}
      <div className="flex-1 px-4 py-6">
        <nav className="space-y-2">
          {[...navigation, ...secondaryNavigation].map((item) => {
            const Icon = item.icon;
            return (
              <Button
                key={item.name}
                variant={isActive(item.href) ? "secondary" : "ghost"}
                className={cn(
                  "w-full justify-start gap-3 h-10",
                  isActive(item.href) && "bg-secondary font-medium"
                )}
                onClick={() => {
                  router.push(item.href);
                  setIsMobileOpen(false);
                }}
              >
                <Icon className="h-4 w-4" />
                {item.name}
              </Button>
            );
          })}
        </nav>
      </div>

      {/* User section */}
      <div className="border-t p-4">
        {loading ? (
          <div className="flex items-center gap-3 px-2 py-2">
            <div className="h-8 w-8 rounded-full bg-muted animate-pulse" />
            <div className="flex-1 space-y-1">
              <div className="h-4 bg-muted rounded animate-pulse" />
              <div className="h-3 bg-muted rounded w-2/3 animate-pulse" />
            </div>
          </div>
        ) : user ? (
          <Button
            variant="outline"
            className="w-full justify-start gap-3"
            onClick={handleSignOut}
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </Button>
        ) : (
          <Button
            variant="outline"
            className="w-full"
            onClick={() => router.push("/beta-login")}
          >
            Sign In
          </Button>
        )}
      </div>
    </div>
  );
}

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-background">
      <AppSidebar />
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
