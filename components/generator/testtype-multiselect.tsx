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

export type PlatformId =
  | "web"
  | "mobile"
  | "api"
  | "accessibility"
  | "performance";

export type TestType = {
  value: string;
  label: string;
  description: string;
  icon?: React.ReactNode;
  recommended?: boolean;
  platforms?: PlatformId[]; // optional filter
};

export const TEST_TYPES: TestType[] = [
  // Web / Mobile shared
  {
    value: "functional",
    label: "Functional",
    description: "Primary flows with valid inputs and expected behavior",
    recommended: true,
    platforms: ["web", "mobile"],
  },
  {
    value: "negative",
    label: "Negative",
    description: "Invalid inputs, error handling, unhappy paths",
    recommended: true,
    platforms: ["web", "mobile", "api"],
  },
  {
    value: "edge-boundary",
    label: "Edge/Boundary",
    description: "Limits, min/max values, edge conditions",
    recommended: true,
    platforms: ["web", "mobile", "api"],
  },
  {
    value: "validation",
    label: "Validation",
    description: "Required fields, formats, business rules, error messages",
    recommended: true,
    platforms: ["web"],
  },
  {
    value: "regression-smoke",
    label: "Regression/Smoke",
    description: "Critical path and core workflow confidence",
    recommended: true,
    platforms: ["web", "mobile"],
  },
  {
    value: "ui-ux-basic",
    label: "UI/UX (Basic)",
    description: "Layout, responsiveness, basic usability checks",
    recommended: true,
    platforms: ["web"],
  },
  {
    value: "security-basic",
    label: "Security (Basic)",
    description: "Auth/session, basic access control, logout/session expiry",
    recommended: true,
    platforms: ["web"],
  },
  {
    value: "accessibility-basic",
    label: "Accessibility (Basic)",
    description: "Keyboard and focus basics for core flows",
    recommended: true,
    platforms: ["web"],
  },

  // Mobile specific
  {
    value: "offline-network",
    label: "Offline/Network Loss",
    description: "Airplane mode, flaky networks, retry and recovery behavior",
    recommended: true,
    platforms: ["mobile"],
  },
  {
    value: "permissions",
    label: "Permissions",
    description: "Camera/location/notifications flows and denial handling",
    recommended: true,
    platforms: ["mobile"],
  },
  {
    value: "device-os",
    label: "Device/OS Compatibility",
    description: "Screen sizes, OS versions, orientation, device constraints",
    recommended: true,
    platforms: ["mobile"],
  },
  {
    value: "performance-basic-mobile",
    label: "Performance (Basic)",
    description: "Startup time, scrolling responsiveness, jank detection",
    recommended: true,
    platforms: ["mobile"],
  },

  // API specific
  {
    value: "contract-schema",
    label: "Contract/Schema Validation",
    description: "OpenAPI/WSDL/schema validation, required fields, types",
    recommended: true,
    platforms: ["api"],
  },
  {
    value: "authn-authz",
    label: "AuthN/AuthZ",
    description: "Token validity, scopes/roles, access enforcement",
    recommended: true,
    platforms: ["api"],
  },
  {
    value: "idempotency-replay",
    label: "Idempotency/Replay",
    description: "Retry safety, idempotency keys, duplicate requests",
    recommended: true,
    platforms: ["api"],
  },
  {
    value: "rate-limits",
    label: "Rate Limits/Throttling",
    description: "429 behavior, backoff, retry headers, client handling",
    recommended: true,
    platforms: ["api"],
  },
  {
    value: "paging-filter-sort",
    label: "Pagination/Filtering/Sorting",
    description: "Paging correctness, stable sorting, edge paging cases",
    recommended: true,
    platforms: ["api"],
  },
  {
    value: "data-integrity",
    label: "Data Integrity (CRUD)",
    description: "CRUD consistency, concurrency, referential rules",
    recommended: true,
    platforms: ["api"],
  },

  // Accessibility platform
  {
    value: "a11y-keyboard",
    label: "Keyboard-only Navigation",
    description: "Tab order, trapped focus, keyboard operability",
    recommended: true,
    platforms: ["accessibility"],
  },
  {
    value: "a11y-focus",
    label: "Focus Order/Visible Focus",
    description: "Predictable focus order and visible focus styles",
    recommended: true,
    platforms: ["accessibility"],
  },
  {
    value: "a11y-screenreader",
    label: "Screen Reader Labels/Roles",
    description: "ARIA labels, roles, announcements for key components",
    recommended: true,
    platforms: ["accessibility"],
  },
  {
    value: "a11y-contrast",
    label: "Color Contrast",
    description: "Minimum contrast thresholds for text and controls",
    recommended: true,
    platforms: ["accessibility"],
  },
  {
    value: "a11y-forms-errors",
    label: "Forms/Errors (ARIA)",
    description: "aria-describedby, error association, announcements",
    recommended: true,
    platforms: ["accessibility"],
  },
  {
    value: "a11y-zoom-reflow",
    label: "Zoom/Reflow",
    description: "200%+ zoom and reflow without loss of content/controls",
    recommended: true,
    platforms: ["accessibility"],
  },

  // Performance platform
  {
    value: "load",
    label: "Load",
    description: "Expected traffic and throughput",
    recommended: true,
    platforms: ["performance"],
  },
  {
    value: "stress",
    label: "Stress",
    description: "Beyond expected load to find limits",
    recommended: true,
    platforms: ["performance"],
  },
  {
    value: "spike",
    label: "Spike",
    description: "Sudden bursts and recovery",
    recommended: true,
    platforms: ["performance"],
  },
  {
    value: "soak",
    label: "Soak/Endurance",
    description: "Long-run stability and degradation",
    recommended: true,
    platforms: ["performance"],
  },
  {
    value: "latency-sla",
    label: "Latency/SLAs",
    description: "Response times against thresholds",
    recommended: true,
    platforms: ["performance"],
  },
  {
    value: "resources",
    label: "Resource Utilization",
    description: "CPU/memory and bottlenecks",
    recommended: true,
    platforms: ["performance"],
  },
  {
    value: "reliability",
    label: "Reliability/Error Rates",
    description: "Timeouts, error rates, resilience",
    recommended: true,
    platforms: ["performance"],
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

interface TestTypeMultiselectProps {
  value: string[];
  onChange: (value: string[]) => void;
  disabled?: boolean;
  placeholder?: string;

  /** NEW: filter + recommended defaults based on platform */
  platform?: PlatformId | null;

  /** Optional: when platform changes, auto-apply recommended if empty */
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

  // Optional auto default when platform changes (only if empty)
  React.useEffect(() => {
    if (!autoApplyRecommendedOnPlatformChange) return;
    if (!platform) return;
    if (value.length > 0) return;

    const recommended = visibleTypes
      .filter((t) => t.recommended)
      .map((t) => t.value);
    if (recommended.length > 0) onChange(dedupe(recommended));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [platform]);

  const toggleType = (typeValue: string) => {
    const v = normalizeValue(typeValue);
    const next = value.includes(v)
      ? value.filter((x) => x !== v)
      : [...value, v];
    onChange(dedupe(next));
  };

  const removeType = (typeValue: string) => {
    const v = normalizeValue(typeValue);
    onChange(value.filter((x) => x !== v));
  };

  const selectRecommended = () => {
    const recommended = visibleTypes
      .filter((t) => t.recommended)
      .map((t) => t.value);
    onChange(dedupe(recommended));
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
