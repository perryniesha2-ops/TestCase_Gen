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

type SiteHeaderProps = {
  className?: string;
  title?: string;
  subtitle?: string;
};

function initials(name?: string, email?: string) {
  const n = (name ?? "").trim();
  if (n) {
    const chars =
      n
        .split(/\s+/)
        .slice(0, 2)
        .map((p) => p[0]?.toUpperCase() ?? "")
        .join("") || "U";
    return chars;
  }
  return (email?.[0] ?? "U").toUpperCase();
}

export function SiteHeader({ className, title, subtitle }: SiteHeaderProps) {
  const { theme, setTheme } = useTheme();
  const { user, loading } = useAuth();

  const fullName = (user?.user_metadata?.full_name as string) || "";
  const avatarUrl = (user?.user_metadata?.avatar_url as string) || "";
  const email = user?.email || "";

  const avatarText = initials(fullName, email);

  const displayName = fullName || email || "User";
  const showAuthUI = Boolean(user); // if you want header always, but auth menu only when logged in

  return (
    <header
      className={cn(
        "sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur",
        className,
      )}
    >
      <div className="mx-auto flex h-20 max-w-screen-2xl items-center gap-2 px-3">
        {title ? (
          <div className="flex flex-col">
            <h1 className="text-lg font-semibold leading-tight">{title}</h1>
            {subtitle ? (
              <p className="text-sm text-muted-foreground leading-tight">
                {subtitle}
              </p>
            ) : null}
          </div>
        ) : (
          // Optional: if you always want *something* on the left
          <Link href="/dashboard" className="text-lg font-semibold">
            SynthQA
          </Link>
        )}

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
                    {avatarUrl ? (
                      <AvatarImage
                        src={avatarUrl}
                        alt={displayName}
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).style.display =
                            "none";
                        }}
                      />
                    ) : null}
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
            // Optional: if not logged in, show a login button instead of avatar
            <Button asChild variant="outline" size="sm">
              <Link href="/login">Log in</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
