// components/brand/logo.tsx
import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <picture>
      {/* Dark first so dark users hit the first match */}
      <source srcSet="/logo-sq-dark.svg" media="(prefers-color-scheme: dark)" />
      <source srcSet="/logo-sq-light.svg" media="(prefers-color-scheme: light)" />
      {/* Fallback if media isn't supported */}
      <img
        src="/logo-sq-dark.svg"
        alt="SynthQA"
        className={cn("h-8 w-auto md:h-9", className)}
        loading="eager"
        decoding="async"
      />
    </picture>
  );
}
