"use client";

import * as React from "react";
import Link from "next/link";
import { useTheme } from "next-themes";
import { Sun, Moon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { LogoutButton } from "@/components/auth/logout-button";
import { useAuth } from "@/lib/auth/auth-context";
import { MobileMenuButton } from "@/components/pagecomponents/mobilemenubutton";

type SiteHeaderProps = {
  className?: string;
  title?: string;
  subtitle?: string;
  userTier?: "free" | "pro";
};

function initials(name?: string, email?: string) {
  const n = (name ?? "").trim();
  if (n) {
    return (
      n
        .split(/\s+/)
        .slice(0, 2)
        .map((p) => p[0]?.toUpperCase() ?? "")
        .join("") || "U"
    );
  }
  return (email?.[0] ?? "U").toUpperCase();
}

export function SiteHeader({
  className,
  title,
  subtitle,
  userTier = "free",
}: SiteHeaderProps) {
  const { theme, setTheme } = useTheme();
  const { user, loading } = useAuth();

  const fullName = (user?.user_metadata?.full_name as string) || "";
  const avatarUrl = (user?.user_metadata?.avatar_url as string) || "";
  const email = user?.email || "";

  const avatarText = initials(fullName, email);
  const displayName = fullName || email || "User";
  const showAuthUI = Boolean(user);

  return (
    <header
      className={cn(
        "sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur",
        className,
      )}
    >
      <div className="mx-auto flex h-16 max-w-screen-2xl items-center gap-3 px-3">
        {/* Mobile menu trigger — hidden on md+ where the sidebar is visible */}
        <MobileMenuButton userTier={userTier} />

        {/* Title / logo */}
        {title ? (
          <div className="flex flex-col min-w-0">
            <h1 className="text-lg font-semibold leading-tight truncate">
              {title}
            </h1>
            {subtitle && (
              <p className="text-sm text-muted-foreground leading-tight truncate">
                {subtitle}
              </p>
            )}
          </div>
        ) : (
          <Link href="/dashboard" className="text-lg font-semibold shrink-0">
            SynthQA
          </Link>
        )}

        {/* Right side actions */}
        <div className="ml-auto flex items-center gap-2">
          <Button
            size="icon"
            variant="ghost"
            aria-label="Toggle theme"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          >
            <Sun className="h-4 w-4 rotate-0 scale-100 transition dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition dark:rotate-0 dark:scale-100" />
          </Button>

          {showAuthUI ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="relative h-8 w-8 rounded-full"
                  aria-label="Account menu"
                >
                  <Avatar className="h-8 w-8">
                    {avatarUrl && (
                      <AvatarImage
                        src={avatarUrl}
                        alt={displayName}
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).style.display =
                            "none";
                        }}
                      />
                    )}
                    <AvatarFallback>{avatarText}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>

              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {displayName}
                    </p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {loading ? "" : email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <LogoutButton showConfirmation />
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button asChild variant="outline" size="sm">
              <Link href="/login">Log in</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
