"use client";

import Image from "next/image";
import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth/auth-context";
import { cn } from "@/lib/utils";
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
  ChartNoAxesColumn,
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

// ── Types ─────────────────────────────────────────────────────────────────────

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

// ── Nav config ────────────────────────────────────────────────────────────────

const PRO_ONLY_ROUTES = [
  "/automation",
  "/test-library",
  "/requirements",
  "/project-manager",
  "/template-manager",
  "/analytics",
  "/integrations",
  "/test-runs",
  "/reports",
];

const navGroups = [
  {
    label: "Workspace",
    items: [
      { name: "Dashboard", href: "/dashboard", icon: Home },
      { name: "Projects", href: "/project-manager", icon: Newspaper },
      { name: "Requirements", href: "/requirements", icon: BarChart3 },
    ],
  },
  {
    label: "Testing",
    items: [
      { name: "Generate Tests", href: "/generate", icon: FlaskConical },
      {
        name: "Cross-Platform Tests",
        href: "/cross-platform-cases",
        icon: Layers,
      },
      { name: "Test Cases", href: "/test-cases", icon: FileText },
      { name: "Test Suites", href: "/test-library", icon: Library },
      { name: "Automation", href: "/automation", icon: Zap },
      { name: "Templates", href: "/template-manager", icon: Layout },
      { name: "Reports", href: "/reports", icon: ChartNoAxesColumn },
    ],
  },
  {
    label: "Account",
    items: [
      { name: "Settings", href: "/settings", icon: Settings },
      { name: "Billing", href: "/billing", icon: CircleDollarSign },
      { name: "Help & Support", href: "/contact", icon: HelpCircle },
    ],
  },
];

// Flat list for mobile
const allNavItems = navGroups.flatMap((g) => g.items);

// ── Nav helpers ───────────────────────────────────────────────────────────────

function useNavHelpers(userTier: "free" | "pro") {
  const pathname = usePathname();
  const router = useRouter();

  const isActive = (href: string) =>
    href === "/dashboard"
      ? pathname === "/dashboard" || pathname === "/"
      : pathname.startsWith(href);

  const isLocked = (href: string) =>
    PRO_ONLY_ROUTES.some((r) => href.startsWith(r)) && userTier === "free";

  const handleNavClick = (href: string, closeSheet?: () => void) => {
    if (isLocked(href)) {
      router.push(
        `/billing?upgrade=required&feature=${href.split("/")[1]}&redirect=${href}`,
      );
    } else {
      router.push(href);
    }
    closeSheet?.();
  };

  return { isActive, isLocked, handleNavClick };
}

// ── Section label ─────────────────────────────────────────────────────────────

function SectionLabel({
  label,
  collapsed,
}: {
  label: string;
  collapsed: boolean;
}) {
  if (collapsed) {
    return (
      <div className="my-2 border-t border-slate-200 dark:border-slate-800" />
    );
  }
  return (
    <p className="mb-1 mt-4 px-3 text-[10px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-600 first:mt-0">
      {label}
    </p>
  );
}

// ── Nav item button ───────────────────────────────────────────────────────────

function NavItem({
  name,
  href,
  Icon,
  collapsed,
  isActive,
  isLocked,
  onClick,
}: {
  name: string;
  href: string;
  Icon: React.ElementType;
  collapsed: boolean;
  isActive: boolean;
  isLocked: boolean;
  onClick: () => void;
}) {
  const button = (
    <button
      onClick={onClick}
      className={cn(
        "group flex w-full items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors",
        collapsed && "justify-center px-0 w-9 mx-auto",
        isActive
          ? "bg-slate-100 text-slate-900 dark:bg-slate-800/70 dark:text-slate-100"
          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/40 dark:hover:text-slate-200",
        isLocked && "opacity-50",
      )}
    >
      <Icon
        className={cn(
          "h-4 w-4 shrink-0",
          isActive
            ? "text-cyan-600 dark:text-cyan-400"
            : "text-slate-400 dark:text-slate-600 group-hover:text-slate-600 dark:group-hover:text-slate-300",
        )}
      />
      {!collapsed && (
        <>
          <span className="flex-1 truncate text-left">{name}</span>
          {isLocked && (
            <Lock className="h-3 w-3 shrink-0 text-slate-300 dark:text-slate-600" />
          )}
        </>
      )}
      {collapsed && isActive && (
        <span className="absolute right-0 top-1/2 -translate-y-1/2 h-5 w-0.5 rounded-l bg-cyan-500" />
      )}
    </button>
  );

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="relative">{button}</div>
        </TooltipTrigger>
        <TooltipContent side="right" className="flex items-center gap-1.5">
          {name}
          {isLocked && (
            <span className="text-[9px] font-bold uppercase tracking-wide text-amber-400">
              Pro
            </span>
          )}
        </TooltipContent>
      </Tooltip>
    );
  }

  return <div className="relative">{button}</div>;
}

// ── Desktop sidebar content ───────────────────────────────────────────────────

function DesktopSidebarContent({
  collapsed,
  setCollapsed,
  user,
  userTier,
  loading,
  handleSignOut,
}: {
  collapsed: boolean;
  setCollapsed: (fn: (c: boolean) => boolean) => void;
  user: UserProfile | null;
  userTier: "free" | "pro";
  loading: boolean;
  handleSignOut: () => Promise<void>;
}) {
  const router = useRouter();
  const { isActive, isLocked, handleNavClick } = useNavHelpers(userTier);

  const initials = (name: string, email: string) =>
    name
      ? name
          .split(" ")
          .map((w) => w[0].toUpperCase())
          .slice(0, 2)
          .join("")
      : email[0].toUpperCase();

  return (
    <TooltipProvider>
      <div className="flex h-full flex-col">
        {/* Brand */}
        <div
          className={cn(
            "flex items-center border-b border-slate-100 dark:border-slate-800",
            collapsed ? "h-16 justify-center px-0" : "h-16 px-4",
          )}
        >
          <Link href="/dashboard" className="flex items-center">
            {collapsed ? (
              <>
                <Image
                  src="/logo-icon-dark.svg"
                  alt="SQ"
                  width={28}
                  height={28}
                  className="hidden dark:inline-block"
                />
                <Image
                  src="/logo-icon-light.svg"
                  alt="SQ"
                  width={28}
                  height={28}
                  className="inline-block dark:hidden"
                />
              </>
            ) : (
              <>
                <Image
                  src="/logo-sq-dark.svg"
                  alt="SynthQA"
                  width={300}
                  height={48}
                  className="hidden dark:inline-block h-10 w-auto"
                  priority
                />
                <Image
                  src="/logo-sq-light.svg"
                  alt="SynthQA"
                  width={120}
                  height={48}
                  className="inline-block dark:hidden h-10 w-auto"
                  priority
                />
              </>
            )}
          </Link>
          {!collapsed && (
            <button
              onClick={() => setCollapsed((c) => !c)}
              className="ml-auto flex h-6 w-6 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition dark:hover:bg-slate-800 dark:hover:text-slate-300"
              aria-label="Collapse sidebar"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
          )}
          {collapsed && (
            <button
              onClick={() => setCollapsed((c) => !c)}
              className="absolute -right-3 top-[72px] flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-400 shadow-sm hover:text-slate-600 transition dark:border-slate-700 dark:bg-slate-900 dark:hover:text-slate-300"
              aria-label="Expand sidebar"
            >
              <ChevronRight className="h-3 w-3" />
            </button>
          )}
        </div>

        {/* Nav */}
        <div
          className={cn(
            "flex-1 overflow-y-auto py-4",
            collapsed ? "px-2" : "px-3",
          )}
        >
          {navGroups.map((group) => (
            <div key={group.label}>
              <SectionLabel label={group.label} collapsed={collapsed} />
              <div className="space-y-0.5">
                {group.items.map((item) => (
                  <NavItem
                    key={item.name}
                    name={item.name}
                    href={item.href}
                    Icon={item.icon}
                    collapsed={collapsed}
                    isActive={isActive(item.href)}
                    isLocked={isLocked(item.href)}
                    onClick={() => handleNavClick(item.href)}
                  />
                ))}
              </div>
            </div>
          ))}

          {/* Upgrade banner */}
          {!collapsed && userTier === "free" && !loading && (
            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 space-y-2 dark:border-amber-500/20 dark:bg-amber-500/5">
              <p className="flex items-center gap-1.5 text-xs font-semibold text-amber-700 dark:text-amber-400">
                <Zap className="h-3 w-3" /> Upgrade to Pro
              </p>
              <p className="text-[11px] leading-relaxed text-amber-600/80 dark:text-amber-500/70">
                Unlock automation, test suites, requirements, and more.
              </p>
              <button
                onClick={() => router.push("/billing")}
                className="w-full rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-amber-600"
              >
                View Plans
              </button>
            </div>
          )}
        </div>

        {/* User block */}
        <div
          className={cn(
            "border-t border-slate-100 p-2 dark:border-slate-800",
            collapsed && "px-1",
          )}
        >
          {loading ? (
            <div className="flex items-center gap-3 px-2 py-2">
              <div className="h-8 w-8 rounded-full bg-slate-100 animate-pulse dark:bg-slate-800" />
              {!collapsed && (
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 rounded bg-slate-100 animate-pulse dark:bg-slate-800" />
                  <div className="h-2.5 w-2/3 rounded bg-slate-100 animate-pulse dark:bg-slate-800" />
                </div>
              )}
            </div>
          ) : user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg px-2 py-2 transition hover:bg-slate-100 dark:hover:bg-slate-800/50",
                    collapsed && "justify-center px-0",
                  )}
                >
                  <Avatar className="h-8 w-8 shrink-0">
                    <AvatarImage
                      src={user.avatar_url}
                      alt={user.full_name || user.email}
                    />
                    <AvatarFallback className="bg-slate-100 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                      {initials(user.full_name || "", user.email)}
                    </AvatarFallback>
                  </Avatar>
                  {!collapsed && (
                    <>
                      <div className="flex-1 min-w-0 text-left">
                        <div className="flex items-center gap-1.5">
                          <p className="truncate text-[13px] font-medium text-slate-700 dark:text-slate-200">
                            {user.full_name || "User"}
                          </p>
                          {userTier !== "free" && (
                            <span className="shrink-0 text-[9px] font-bold uppercase tracking-wide text-amber-500">
                              Pro
                            </span>
                          )}
                        </div>
                        <p className="truncate text-[11px] text-slate-400 dark:text-slate-600">
                          {user.email}
                        </p>
                      </div>
                      <ChevronDown className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                    </>
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="start"
                side="top"
                className="w-56 border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900"
              >
                <DropdownMenuLabel className="font-normal">
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-100">
                    {user.full_name || "User"}
                  </p>
                  <p className="text-xs text-slate-400 dark:text-slate-600">
                    {user.email}
                  </p>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-slate-100 dark:bg-slate-800" />
                <DropdownMenuItem
                  onClick={() => router.push("/settings")}
                  className="text-slate-700 focus:bg-slate-50 dark:text-slate-200 dark:focus:bg-slate-800"
                >
                  <User className="mr-2 h-4 w-4" /> Profile
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => router.push("/billing")}
                  className="text-slate-700 focus:bg-slate-50 dark:text-slate-200 dark:focus:bg-slate-800"
                >
                  <CreditCard className="mr-2 h-4 w-4" /> Billing
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => router.push("/settings?tab=notifications")}
                  className="text-slate-700 focus:bg-slate-50 dark:text-slate-200 dark:focus:bg-slate-800"
                >
                  <Bell className="mr-2 h-4 w-4" /> Notifications
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-slate-100 dark:bg-slate-800" />
                <DropdownMenuItem
                  onClick={handleSignOut}
                  className="text-rose-500 focus:bg-slate-50 dark:text-rose-400 dark:focus:bg-slate-800"
                >
                  <LogOut className="mr-2 h-4 w-4" /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <button
              onClick={() => router.push("/beta-login")}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800/50"
            >
              {collapsed ? <User className="mx-auto h-4 w-4" /> : "Sign In"}
            </button>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}

// ── AppSidebar ────────────────────────────────────────────────────────────────

export function AppSidebar({
  className,
  initialCollapsed = false,
}: SidebarProps) {
  const { user: authUser, loading, signOut } = useAuth();
  const router = useRouter();

  const user = authUser
    ? {
        id: authUser.id,
        email: authUser.email ?? "",
        full_name:
          authUser.full_name ?? authUser.user_metadata?.full_name ?? "",
        avatar_url:
          authUser.avatar_url ?? authUser.user_metadata?.avatar_url ?? "",
      }
    : null;

  const userTier: "free" | "pro" =
    authUser?.subscription_tier === "pro" ? "pro" : "free";

  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("sidebar-collapsed");
      return saved ? JSON.parse(saved) : initialCollapsed;
    }
    return initialCollapsed;
  });

  useEffect(() => {
    localStorage.setItem("sidebar-collapsed", JSON.stringify(collapsed));
  }, [collapsed]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "b") {
        e.preventDefault();
        setCollapsed((c: boolean) => !c);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  async function handleSignOut() {
    try {
      await signOut();
      toast.success("Signed out successfully");
    } catch {
      toast.error("Failed to sign out");
    }
  }

  return (
    <aside
      className={cn(
        "relative hidden md:block border-r border-slate-100 bg-white transition-[width] duration-200 ease-in-out dark:border-slate-800 dark:bg-slate-900",
        collapsed ? "w-[56px]" : "w-60",
        className,
      )}
    >
      <DesktopSidebarContent
        collapsed={collapsed}
        setCollapsed={setCollapsed}
        user={user}
        userTier={userTier}
        loading={loading}
        handleSignOut={handleSignOut}
      />
    </aside>
  );
}

// ── Mobile nav ────────────────────────────────────────────────────────────────

function MobileNav() {
  const [open, setOpen] = useState(false);
  const { user: authUser, loading, signOut } = useAuth();
  const router = useRouter();

  const userTier: "free" | "pro" =
    authUser?.subscription_tier === "pro" ? "pro" : "free";
  const { isActive, isLocked, handleNavClick } = useNavHelpers(userTier);

  async function handleSignOut() {
    try {
      await signOut();
      toast.success("Signed out successfully");
    } catch {
      toast.error("Failed to sign out");
    }
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 transition dark:hover:bg-slate-800/50">
          <Menu className="h-5 w-5" />
          <span className="sr-only">Open navigation</span>
        </button>
      </SheetTrigger>
      <SheetContent
        side="left"
        className="w-60 p-0 border-slate-100 bg-white dark:border-slate-800 dark:bg-slate-900"
      >
        <SheetHeader className="sr-only">
          <SheetTitle>Navigation</SheetTitle>
        </SheetHeader>

        <div className="flex h-full flex-col">
          <div className="flex h-16 items-center border-b border-slate-100 px-4 dark:border-slate-800">
            <Link href="/dashboard" onClick={() => setOpen(false)}>
              <Image
                src="/logo-sq-dark.svg"
                alt="SynthQA"
                width={120}
                height={48}
                className="hidden dark:inline-block h-9 w-auto"
              />
              <Image
                src="/logo-sq-light.svg"
                alt="SynthQA"
                width={120}
                height={48}
                className="inline-block dark:hidden h-9 w-auto"
              />
            </Link>
          </div>

          <div className="flex-1 overflow-y-auto px-3 py-4">
            {navGroups.map((group) => (
              <div key={group.label}>
                <p className="mb-1 mt-4 px-3 text-[10px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-600 first:mt-0">
                  {group.label}
                </p>
                <div className="space-y-0.5">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const locked = isLocked(item.href);
                    const active = isActive(item.href);
                    return (
                      <button
                        key={item.name}
                        onClick={() =>
                          handleNavClick(item.href, () => setOpen(false))
                        }
                        className={cn(
                          "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors",
                          active
                            ? "bg-slate-100 text-slate-900 dark:bg-slate-800/70 dark:text-slate-100"
                            : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/40 dark:hover:text-slate-200",
                          locked && "opacity-50",
                        )}
                      >
                        <Icon
                          className={cn(
                            "h-4 w-4 shrink-0",
                            active
                              ? "text-cyan-600 dark:text-cyan-400"
                              : "text-slate-400 dark:text-slate-600",
                          )}
                        />
                        <span className="flex-1 text-left truncate">
                          {item.name}
                        </span>
                        {locked && (
                          <Lock className="h-3 w-3 shrink-0 text-slate-300 dark:text-slate-600" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}

            {userTier === "free" && !loading && (
              <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 space-y-2 dark:border-amber-500/20 dark:bg-amber-500/5">
                <p className="flex items-center gap-1.5 text-xs font-semibold text-amber-700 dark:text-amber-400">
                  <Zap className="h-3 w-3" /> Upgrade to Pro
                </p>
                <p className="text-[11px] text-amber-600/80 dark:text-amber-500/70">
                  Unlock automation, suites, requirements, and more.
                </p>
                <button
                  onClick={() => {
                    router.push("/billing");
                    setOpen(false);
                  }}
                  className="w-full rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-600 transition"
                >
                  View Plans
                </button>
              </div>
            )}
          </div>

          <div className="border-t border-slate-100 p-3 dark:border-slate-800">
            <button
              onClick={handleSignOut}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium text-slate-600 transition hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800/50"
            >
              <LogOut className="h-4 w-4 text-slate-400 dark:text-slate-600" />
              Sign out
            </button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ── AppLayout ─────────────────────────────────────────────────────────────────

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-white dark:bg-slate-900">
      <AppSidebar />
      <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
        <header className="md:hidden flex h-14 shrink-0 items-center gap-3 border-b border-slate-100 bg-white px-4 dark:border-slate-800 dark:bg-slate-900">
          <MobileNav />
          <Link href="/dashboard">
            <Image
              src="/logo-sq-dark.svg"
              alt="SynthQA"
              width={100}
              height={36}
              className="hidden dark:inline-block h-8 w-auto"
            />
            <Image
              src="/logo-sq-light.svg"
              alt="SynthQA"
              width={100}
              height={36}
              className="inline-block dark:hidden h-8 w-auto"
            />
          </Link>
        </header>
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
