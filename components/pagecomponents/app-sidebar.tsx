"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
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
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
} from "lucide-react";
import { toast } from "sonner";

interface UserProfile {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
}

interface SidebarProps {
  className?: string;
  /** start collapsed on desktop */
  initialCollapsed?: boolean;
}

const navigation = [
  { name: "Dashboard", href: "/pages/dashboard", icon: Home },
  { name: "Generate Tests", href: "/pages/generate", icon: FlaskConical },
  { name: "Test Cases", href: "/pages/test-cases", icon: FileText },
  { name: "Requirements", href: "/pages/requirements", icon: BarChart3 },
];

const secondaryNavigation = [
  { name: "Settings", href: "/pages/settings", icon: Settings },
  { name: "Billing", href: "/pages/billing", icon: CircleDollarSign },
  { name: "Help & Support", href: "/pages/contact", icon: HelpCircle },
];

export function AppSidebar({ className, initialCollapsed = false }: SidebarProps) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(initialCollapsed); 
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();

  useEffect(() => {
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
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

  async function handleSignOut() {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      router.push("/sign-in");
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
    if (href === "/pages/dashboard") return pathname === "/pages/dashboard" || pathname === "/";
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
  }) => (
    <Button
      variant={isActive(href) ? "secondary" : "ghost"}
      className={cn(
        "w-full h-10 transition justify-start",
        collapsed ? "px-0 mx-auto w-10" : "gap-3 px-3",
        isActive(href) && "bg-secondary font-medium"
      )}
      onClick={() => {
        router.push(href);
        setIsMobileOpen(false);
      }}
      aria-label={name}
      title={collapsed ? name : undefined}
    >
      <Icon className="h-4 w-4 shrink-0" />
      {!collapsed && <span className="truncate">{name}</span>}
    </Button>
  );

  const SidebarContent = () => (
    <div className="flex h-full flex-col">
      {/* Brand / Collapse toggle */}
      <div className={cn("flex h-16 items-center border-b", collapsed ? "px-2" : "px-4")}>
        <div className={cn("flex items-center gap-2", collapsed && "w-full justify-center")}>
          <FlaskConical className="h-6 w-6 text-primary" />
          {!collapsed && <span className="text-xl font-bold">SynthQA</span>}
        </div>
        {/* collapse/expand button (desktop only) */}
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className={cn("ml-auto hidden lg:inline-flex", collapsed && "mx-auto")}
          onClick={() => setCollapsed((c) => !c)}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>

      {/* Primary nav */}
      <div className={cn("flex-1 px-2 py-4", collapsed && "px-1")}>
        <nav className={cn("space-y-2")}>
          <div className="space-y-1">
            {navigation.map((item) => (
              <NavButton key={item.name} name={item.name} href={item.href} Icon={item.icon} />
            ))}
          </div>

        {/* Secondary */}
          <div className={cn("pt-4 mt-4 border-t", collapsed ? "mx-1" : "")} />
          <div className="space-y-1">
            {secondaryNavigation.map((item) => (
              <NavButton key={item.name} name={item.name} href={item.href} Icon={item.icon} />
            ))}
          </div>
        </nav>
      </div>

      {/* User block */}
      <div className={cn("border-t p-2", collapsed && "px-1")}>
        {loading ? (
          <div className={cn("flex items-center gap-3", collapsed ? "justify-center py-2" : "px-2 py-2")}>
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
                title={collapsed ? `${user.full_name || "User"} — Account` : undefined}
              >
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user.avatar_url} alt={user.full_name || user.email} />
                  <AvatarFallback className="text-sm">
                    {getUserInitials(user.full_name || "", user.email)}
                  </AvatarFallback>
                </Avatar>
                {!collapsed && (
                  <>
                    <div className="flex-1 text-left">
                      <p className="text-sm font-medium truncate">{user.full_name || "User"}</p>
                      <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                    </div>
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  </>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{user.full_name || "User"}</p>
                  <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => router.push("/pages/settings")}>
                <User className="mr-2 h-4 w-4" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push("/pages/billing")}>
                <CreditCard className="mr-2 h-4 w-4" />
                Billing
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push("/pages/settings?tab=notifications")}>
                <Bell className="mr-2 h-4 w-4" />
                Notifications
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut} className="text-red-600">
                <LogOut className="mr-2 h-4 w-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Button variant="outline" className={cn("w-full", collapsed && "w-10 px-0")} onClick={() => router.push("/sign-in")} title={collapsed ? "Sign in" : undefined}>
            {collapsed ? <User className="h-4 w-4" /> : "Sign In"}
          </Button>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar (collapsible width) */}
      <aside
        className={cn(
          "hidden lg:block border-r bg-background transition-[width] duration-200 ease-in-out",
          collapsed ? "w-[56px]" : "w-64",
          className
        )}
      >
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar (Sheet) */}
      <Sheet open={isMobileOpen} onOpenChange={setIsMobileOpen}>
        <SheetTrigger asChild>
          <Button variant="outline" size="icon" className="lg:hidden fixed top-4 left-4 z-50">
            <Menu className="h-4 w-4" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="p-0 w-64">
          {/* Always expanded in mobile for usability */}
          <div className="flex h-full flex-col">
            {/* simple header with close lives in SheetContent already */}
            <div className="flex-1">
              {/* Render expanded variant inside mobile */}
              {/** reuse component but force expanded by temporarily overriding collapsed */}
              <AppSidebarInnerExpandedForMobile user={user} loading={loading} handleSignOut={handleSignOut} />
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

/** Helper to keep mobile sheet expanded UX without duplicating business logic */
function AppSidebarInnerExpandedForMobile({
  user,
  loading,
  handleSignOut,
}: {
  user: UserProfile | null;
  loading: boolean;
  handleSignOut: () => Promise<void>;
}) {

  const router = useRouter();
  const pathname = usePathname();
  const isActive = (href: string) => (href === "/pages/dashboard" ? pathname === "/pages/dashboard" || pathname === "/" : pathname.startsWith(href));

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center px-4 border-b">
        <div className="flex items-center gap-2">
          <FlaskConical className="h-6 w-6 text-primary" />
          <span className="text-xl font-bold">SynthQA</span>
        </div>
      </div>
      <div className="flex-1 px-4 py-6">
        <nav className="space-y-2">
          {[...navigation, ...secondaryNavigation].map((item) => {
            const Icon = item.icon;
            return (
              <Button
                key={item.name}
                variant={isActive(item.href) ? "secondary" : "ghost"}
                className={cn("w-full justify-start gap-3 h-10", isActive(item.href) && "bg-secondary font-medium")}
                onClick={() => router.push(item.href)}
              >
                <Icon className="h-4 w-4" />
                {item.name}
              </Button>
            );
          })}
        </nav>
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
          <Button variant="outline" className="w-full justify-start gap-3" onClick={handleSignOut}>
            <LogOut className="h-4 w-4" />
            Sign out
          </Button>
        ) : (
          <Button variant="outline" className="w-full" onClick={() => router.push("/sign-in")}>
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
