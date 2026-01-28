// components/generator/test-type-multiselect.tsx
"use client";

import * as React from "react";
import { Check, ChevronsUpDown, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";

/**
 * Keep this aligned with your backend TEST_TYPE_INSTRUCTIONS keys.
 */
export type CanonicalTestType =
  | "happy-path"
  | "negative"
  | "security"
  | "boundary"
  | "edge-case"
  | "performance"
  | "integration"
  | "regression"
  | "smoke";

export type PlatformId =
  | "web"
  | "mobile"
  | "api"
  | "accessibility"
  | "performance";

export type TestType = {
  value: CanonicalTestType;
  label: string;
  description: string;
  icon?: React.ReactNode;
  recommended?: boolean;
  platforms?: PlatformId[]; // optional filter
};

export const TEST_TYPES: TestType[] = [
  {
    value: "happy-path",
    label: "Happy Path",
    description: "Primary flows with valid inputs and expected behavior",
    recommended: true,
    platforms: ["web", "mobile", "api", "accessibility", "performance"],
  },
  {
    value: "negative",
    label: "Negative",
    description: "Invalid inputs, error handling, unhappy paths",
    recommended: true,
    platforms: ["web", "mobile", "api"],
  },
  {
    value: "boundary",
    label: "Boundary",
    description: "Min/max limits, constraints, length/value boundaries",
    recommended: true,
    platforms: ["web", "mobile", "api"],
  },
  {
    value: "edge-case",
    label: "Edge Case",
    description: "Unusual but valid scenarios, rare sequences, odd combos",
    recommended: true,
    platforms: ["web", "mobile", "api"],
  },
  {
    value: "security",
    label: "Security",
    description: "Auth/session, access control, injection/XSS basics",
    recommended: true,
    platforms: ["web", "api"],
  },
  {
    value: "integration",
    label: "Integration",
    description: "Cross-service interactions, third-party, data flow checks",
    recommended: false,
    platforms: ["web", "mobile", "api"],
  },
  {
    value: "regression",
    label: "Regression",
    description: "Core functionality still works after changes",
    recommended: true,
    platforms: ["web", "mobile", "api"],
  },
  {
    value: "smoke",
    label: "Smoke",
    description: "Critical path sanity checks to confirm build is testable",
    recommended: true,
    platforms: ["web", "mobile", "api"],
  },
  {
    value: "performance",
    label: "Performance",
    description: "Response time, load, throughput, basic SLAs",
    recommended: false,
    platforms: ["performance", "api", "web", "mobile"],
  },
];

function normalizeValue(v: string) {
  return String(v || "").trim();
}

function dedupe(values: string[]) {
  return Array.from(new Set(values.map(normalizeValue).filter(Boolean)));
}

function getVisibleTypes(platform?: PlatformId | null) {
  if (!platform) return TEST_TYPES;
  return TEST_TYPES.filter(
    (t) => !t.platforms || t.platforms.includes(platform),
  );
}

function isCanonicalTestType(v: unknown): v is CanonicalTestType {
  return (
    typeof v === "string" &&
    (
      [
        "happy-path",
        "negative",
        "security",
        "boundary",
        "edge-case",
        "performance",
        "integration",
        "regression",
        "smoke",
      ] as const
    ).includes(v as CanonicalTestType)
  );
}

interface TestTypeMultiselectProps {
  value: CanonicalTestType[]; // ✅ now strongly typed
  onChange: (value: CanonicalTestType[]) => void;
  disabled?: boolean;
  placeholder?: string;

  /** filter + recommended defaults based on platform */
  platform?: PlatformId | null;

  /** when platform changes, auto-apply recommended if empty */
  autoApplyRecommendedOnPlatformChange?: boolean;
}

export function TestTypeMultiselect({
  value,
  onChange,
  disabled = false,
  placeholder = "Select test types...",
  platform = null,
  autoApplyRecommendedOnPlatformChange = true,
}: TestTypeMultiselectProps) {
  const [open, setOpen] = React.useState(false);

  const visibleTypes = React.useMemo(
    () => getVisibleTypes(platform),
    [platform],
  );

  const selectedTypes = React.useMemo(
    () => visibleTypes.filter((type) => value.includes(type.value)),
    [visibleTypes, value],
  );

  // Auto default when platform changes (only if empty)
  React.useEffect(() => {
    if (!autoApplyRecommendedOnPlatformChange) return;
    if (!platform) return;
    if (value.length > 0) return;

    const recommended = visibleTypes
      .filter((t) => t.recommended)
      .map((t) => t.value);
    if (recommended.length > 0) onChange(recommended);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [platform]);

  const toggleType = (typeValue: CanonicalTestType) => {
    const next = value.includes(typeValue)
      ? value.filter((x) => x !== typeValue)
      : [...value, typeValue];

    // preserve order + uniqueness
    onChange(dedupe(next).filter(isCanonicalTestType));
  };

  const removeType = (typeValue: CanonicalTestType) => {
    onChange(value.filter((x) => x !== typeValue));
  };

  const selectRecommended = () => {
    const recommended = visibleTypes
      .filter((t) => t.recommended)
      .map((t) => t.value);
    onChange(recommended);
  };

  const clearAll = () => onChange([]);

  const platformLabel =
    platform === "web"
      ? "Web"
      : platform === "mobile"
        ? "Mobile"
        : platform === "api"
          ? "API"
          : platform === "accessibility"
            ? "Accessibility"
            : platform === "performance"
              ? "Performance"
              : null;

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between h-auto min-h-10 py-2"
            disabled={disabled}
          >
            <div className="flex flex-wrap gap-1 flex-1">
              {selectedTypes.length === 0 ? (
                <span className="text-muted-foreground">{placeholder}</span>
              ) : (
                selectedTypes.map((type) => (
                  <Badge
                    key={type.value}
                    variant="secondary"
                    className="mr-1"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeType(type.value);
                    }}
                  >
                    {type.icon} {type.label}
                    <X className="ml-1 h-3 w-3 hover:text-destructive" />
                  </Badge>
                ))
              )}
            </div>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>

        <PopoverContent
          className="w-[--radix-popover-trigger-width] p-0"
          align="start"
        >
          <Command>
            <CommandInput placeholder="Search test types..." className="h-9" />
            <CommandEmpty>No test type found.</CommandEmpty>

            <div className="flex items-center justify-between px-3 py-2 text-xs text-muted-foreground border-b bg-muted/30 sticky top-0 z-10">
              <span>
                {selectedTypes.length} of {visibleTypes.length} selected
                {platformLabel ? ` • ${platformLabel}` : ""}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={selectRecommended}
                  className="text-primary hover:underline font-medium"
                  type="button"
                >
                  Select Recommended
                </button>
                {selectedTypes.length > 0 && (
                  <button
                    onClick={clearAll}
                    className="text-destructive hover:underline font-medium"
                    type="button"
                  >
                    Clear All
                  </button>
                )}
              </div>
            </div>

            <CommandGroup className="max-h-[350px] overflow-y-auto p-2">
              {visibleTypes.map((type) => {
                const isSelected = value.includes(type.value);
                return (
                  <CommandItem
                    key={type.value}
                    onSelect={() => toggleType(type.value)}
                    className="cursor-pointer py-3"
                  >
                    <div className="flex items-start gap-3 flex-1">
                      <div
                        className={cn(
                          "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border border-primary",
                          isSelected
                            ? "bg-primary text-primary-foreground"
                            : "opacity-50 [&_svg]:invisible",
                        )}
                      >
                        <Check className="h-3 w-3" />
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">
                            {type.label}
                          </span>
                          {type.recommended && (
                            <Badge
                              variant="outline"
                              className="text-[10px] h-4 px-1"
                            >
                              Recommended
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground leading-snug">
                          {type.description}
                        </p>
                      </div>
                    </div>
                  </CommandItem>
                );
              })}
            </CommandGroup>

            {visibleTypes.length > 6 && (
              <div className="px-3 py-1.5 text-center text-[10px] text-muted-foreground border-t bg-muted/20">
                Scroll for more options
              </div>
            )}
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
