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
  Layers,
  Zap,
  Lock,
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

// Pro-only routes — must match middleware
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

export function AppSidebar({
  className,
  initialCollapsed = false,
}: SidebarProps) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [userTier, setUserTier] = useState<"free" | "pro">("free");
  const [loading, setLoading] = useState(true);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

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

          // Fetch subscription tier
          const { data: profile } = await supabase
            .from("user_profiles")
            .select("subscription_tier, subscription_status")
            .eq("id", user.id)
            .single();

          const status = profile?.subscription_status ?? "inactive";
          const tier = profile?.subscription_tier ?? "free";
          const isActive = status === "active" || status === "trial";
          setUserTier(isActive && tier !== "free" ? "pro" : "free");
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [supabase]);

  useEffect(() => {
    localStorage.setItem("sidebar-collapsed", JSON.stringify(collapsed));
  }, [collapsed]);

  useEffect(() => {
    const handleKeyboard = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "b") {
        e.preventDefault();
        setCollapsed((c: boolean) => !c);
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

  const isPro = (href: string) =>
    PRO_ONLY_ROUTES.some((r) => href.startsWith(r));

  const isLocked = (href: string) => isPro(href) && userTier === "free";

  // Handles click — locked items go to billing instead
  const handleNavClick = (href: string) => {
    if (isLocked(href)) {
      router.push(
        `/billing?upgrade=required&feature=${href.split("/")[1]}&redirect=${href}`,
      );
    } else {
      router.push(href);
    }
    setIsMobileOpen(false);
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
    const locked = isLocked(href);

    const button = (
      <Button
        variant={isActive(href) ? "secondary" : "ghost"}
        className={cn(
          "w-full h-10 transition justify-start relative",
          collapsed ? "px-0 mx-auto w-10" : "gap-3 px-3",
          isActive(href) && "bg-secondary font-medium",
          locked && "opacity-60",
        )}
        onClick={() => handleNavClick(href)}
      >
        <Icon className="h-4 w-4 shrink-0" />
        {!collapsed && (
          <span className="truncate flex-1 text-left">{name}</span>
        )}
        {/* Lock badge — expanded sidebar */}
        {!collapsed && locked && (
          <Lock className="h-3 w-3 shrink-0 text-muted-foreground" />
        )}
        {/* Active indicator when collapsed */}
        {collapsed && isActive(href) && (
          <span className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary rounded-l" />
        )}
      </Button>
    );

    // Collapsed: tooltip shows name + Pro label if locked
    if (collapsed) {
      return (
        <Tooltip>
          <TooltipTrigger asChild>{button}</TooltipTrigger>
          <TooltipContent side="right">
            <span>{name}</span>
            {locked && (
              <span className="ml-1.5 text-[10px] font-semibold uppercase tracking-wide text-amber-400">
                Pro
              </span>
            )}
          </TooltipContent>
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
            collapsed ? "h-20 flex-col justify-center gap-1 px-0" : "h-16 px-4",
          )}
        >
          <Link href="/dashboard" className="flex items-center justify-center">
            {collapsed ? (
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

          <Button
            type="button"
            size="icon"
            variant="ghost"
            className={cn(
              "hidden lg:inline-flex h-6 w-6",
              collapsed ? "p-0" : "ml-auto",
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

            {/* Upgrade nudge for free users — expanded only */}
            {!collapsed && userTier === "free" && !loading && (
              <div className="mt-4 pt-4 border-t">
                <div className="mx-1 rounded-lg bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/20 p-3 space-y-2">
                  <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                    <Zap className="h-3 w-3" />
                    Upgrade to Pro
                  </p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Unlock automation, test suites, requirements, and more.
                  </p>
                  <Button
                    size="sm"
                    className="w-full h-7 text-xs bg-amber-500 hover:bg-amber-600 text-white"
                    onClick={() => router.push("/billing")}
                  >
                    View Plans
                  </Button>
                </div>
              </div>
            )}

            {/* Secondary nav */}
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
                collapsed ? "justify-center py-2" : "px-2 py-2",
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
                    collapsed
                      ? "justify-center p-2"
                      : "justify-start gap-3 p-2",
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
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-medium truncate">
                            {user.full_name || "User"}
                          </p>
                          {userTier !== "free" && (
                            <span className="text-[10px] font-bold uppercase tracking-wide text-amber-500 shrink-0">
                              Pro
                            </span>
                          )}
                        </div>
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
      {/* Desktop Sidebar */}
      <aside
        className={cn(
          "hidden md:block border-r bg-background transition-[width] duration-200 ease-in-out",
          collapsed ? "w-[56px]" : "w-64",
          className,
        )}
      >
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar */}
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
            userTier={userTier}
            loading={loading}
            handleSignOut={handleSignOut}
            setIsMobileOpen={setIsMobileOpen}
          />
        </SheetContent>
      </Sheet>
    </>
  );
}

function MobileSidebar({
  user,
  userTier,
  loading,
  handleSignOut,
  setIsMobileOpen,
}: {
  user: UserProfile | null;
  userTier: "free" | "pro";
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
    setIsMobileOpen(false);
  };

  return (
    <div className="flex h-full flex-col">
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
                <span className="flex-1 text-left truncate">{item.name}</span>
                {locked && (
                  <Lock className="h-3 w-3 shrink-0 text-muted-foreground" />
                )}
              </Button>
            );
          })}
        </nav>

        {/* Upgrade nudge */}
        {userTier === "free" && !loading && (
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
                setIsMobileOpen(false);
              }}
            >
              View Plans
            </Button>
          </div>
        )}
      </div>

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
