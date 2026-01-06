// components/brand/logo.tsx
"use client";

import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";
import { useMounted } from "@/hooks/use-mounted";
import Link from "next/link";

type LogoProps = {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
};

const sizeClasses: Record<NonNullable<LogoProps["size"]>, string> = {
  sm: "h-8 md:h-9",
  md: "h-10 md:h-11",
  lg: "h-14 md:h-16",
  xl: "h-20 md:h-20", // matches what you said is perfect
};

export function Logo({ className, size = "sm" }: LogoProps) {
  const { resolvedTheme } = useTheme();
  const mounted = useMounted();

  const src =
    mounted && resolvedTheme === "light"
      ? "/logo-sq-light.svg"
      : "/logo-sq-dark.svg";

  return (
    <Link href="/dashboard">
      <img
        src={src}
        alt="SynthQA"
        className={cn(sizeClasses[size], "w-auto", className)}
        loading="eager"
        decoding="async"
      />
    </Link>
  );
}
