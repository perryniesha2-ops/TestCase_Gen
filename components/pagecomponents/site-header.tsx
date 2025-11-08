"use client";

import * as React from "react";
import Link from "next/link";
import { useTheme } from "next-themes";
import { usePathname } from "next/navigation";
import { Search, Sun, Moon, User, LogOut } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { LogoutButton } from "@/components/auth/logout-button"



export function SiteHeader({
  className,
  onSearch,
}: {
  className?: string;
  onSearch?: (q: string) => void;
}) {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const [q, setQ] = React.useState("");

  return (
    <header
      className={cn(
        "sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur",
        className
      )}
    >
      <div className="mx-auto flex h-14 max-w-screen-2xl items-center gap-2 px-3">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          
          <span className="hidden sm:block">SynthQA</span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
         
        </nav>

        <div className="ml-auto flex items-center gap-2">
          {/* search */}
          <div className="hidden sm:flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && onSearch) onSearch(q);
                }}
                placeholder="Search…"
                className="w-[220px] pl-8"
              />
            </div>
            <Button size="sm" variant="secondary" onClick={() => onSearch?.(q)}>
              Search
            </Button>
          </div>

          {/* theme toggle */}
          <Button
            size="icon"
            variant="ghost"
            aria-label="Toggle theme"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          >
            <Sun className="h-4 w-4 rotate-0 scale-100 dark:-rotate-90 dark:scale-0 transition" />
            <Moon className="absolute h-4 w-4 rotate-90 scale-0 dark:rotate-0 dark:scale-100 transition" />
          </Button>

          {/* user menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarFallback>U</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">User</p>
                  <p className="text-xs leading-none text-muted-foreground">
                    user@example.com
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/profile" className="flex items-center">
                  <User className="mr-2 h-4 w-4" />
                  Profile
                </Link>
              </DropdownMenuItem>
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
