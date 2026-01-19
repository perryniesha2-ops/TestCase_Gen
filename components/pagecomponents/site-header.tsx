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
import { createClient } from "@/lib/supabase/client";

type UserProfile = {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
};

type SiteHeaderProps = {
  className?: string;
  title?: string;
  subtitle?: string;
};

function initials(name?: string, email?: string) {
  const n = (name ?? "").trim();
  if (n)
    return (
      n
        .split(/\s+/)
        .slice(0, 2)
        .map((p) => p[0]?.toUpperCase() ?? "")
        .join("") || "U"
    );
  return (email?.[0] ?? "U").toUpperCase();
}

export function SiteHeader({ className, title, subtitle }: SiteHeaderProps) {
  const { theme, setTheme } = useTheme();
  const [user, setUser] = React.useState<UserProfile | null>(null);
  const [loading, setLoading] = React.useState(true);
  const supabase = React.useMemo(() => createClient(), []);

  React.useEffect(() => {
    let mounted = true;

    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!mounted) return;
      setUser(
        user
          ? {
              id: user.id,
              email: user.email || "",
              full_name: (user.user_metadata?.full_name as string) || "",
              avatar_url: (user.user_metadata?.avatar_url as string) || "",
            }
          : null,
      );
      setLoading(false);
    }

    load();

    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      load();
    });

    return () => {
      mounted = false;
      sub?.subscription?.unsubscribe();
    };
  }, [supabase]);

  const avatarText = initials(user?.full_name, user?.email);

  return (
    <header
      className={cn(
        "sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur",
        className,
      )}
    >
      <div className="mx-auto flex h-20 max-w-screen-2xl items-center gap-2 px-3">
        {title && (
          <div className="flex flex-col">
            <h1 className="text-lg font-semibold leading-tight">{title}</h1>
            {subtitle && (
              <p className="text-sm text-muted-foreground leading-tight">
                {subtitle}
              </p>
            )}
          </div>
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

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                <Avatar className="h-8 w-8">
                  {user?.avatar_url ? (
                    <AvatarImage
                      src={user.avatar_url}
                      alt={user.full_name || user.email || "User"}
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
                    {user?.full_name || user?.email || "User"}
                  </p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {loading ? "" : user?.email || ""}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <LogoutButton showConfirmation />
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
