// components/generator/cross-platform-test-type-multiselect.tsx
"use client";

import * as React from "react";
import { Check, ChevronsUpDown, X, Sparkles } from "lucide-react";

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

export type CrossPlatformTestType = {
  value: string;
  label: string;
  description: string;
  recommended?: boolean;
};

const WEB_TYPES: CrossPlatformTestType[] = [
  {
    value: "functional",
    label: "Functional",
    description: "Primary user flows and core behavior",
    recommended: true,
  },
  {
    value: "negative",
    label: "Negative",
    description: "Invalid inputs and expected error handling",
    recommended: true,
  },
  {
    value: "edge-boundary",
    label: "Edge/Boundary",
    description: "Limits, min/max values, unusual but valid states",
    recommended: true,
  },
  {
    value: "validation",
    label: "Validation",
    description: "Field validation and rules enforcement",
    recommended: true,
  },
  {
    value: "regression-smoke",
    label: "Regression/Smoke",
    description: "Critical path checks; high-signal verification",
    recommended: true,
  },
  {
    value: "ui-ux-basic",
    label: "UI/UX (basic)",
    description: "Basic layout, affordances, error messaging, consistency",
    recommended: true,
  },
  {
    value: "security-basic",
    label: "Security (basic)",
    description: "Auth/session, access control, basic injection awareness",
    recommended: true,
  },
  {
    value: "accessibility-basic",
    label: "Accessibility (basic)",
    description: "Keyboard/focus, labels, contrast basics",
    recommended: true,
  },
];

const MOBILE_TYPES: CrossPlatformTestType[] = [
  {
    value: "functional",
    label: "Functional",
    description: "Primary mobile flows and core behavior",
    recommended: true,
  },
  {
    value: "negative",
    label: "Negative",
    description: "Invalid inputs and expected error handling",
    recommended: true,
  },
  {
    value: "edge-boundary",
    label: "Edge/Boundary",
    description: "Limits, rare states, lifecycle edge cases",
    recommended: true,
  },
  {
    value: "offline-network",
    label: "Offline/Network Loss",
    description: "Airplane mode, spotty network, retry behavior",
    recommended: true,
  },
  {
    value: "permissions",
    label: "Permissions",
    description: "Camera/location/notifications permission states",
    recommended: true,
  },
  {
    value: "device-os",
    label: "Device/OS Compatibility",
    description: "Different OS versions, devices, screen sizes",
    recommended: true,
  },
  {
    value: "regression-smoke",
    label: "Regression/Smoke",
    description: "High-signal, critical path verification",
    recommended: true,
  },
  {
    value: "performance-basic-mobile",
    label: "Performance (basic)",
    description: "Startup time, scrolling, perceived responsiveness",
    recommended: true,
  },
];

const API_TYPES: CrossPlatformTestType[] = [
  {
    value: "contract-schema",
    label: "Contract/Schema",
    description: "Schema validation, required fields, type/enums",
    recommended: true,
  },
  {
    value: "authn-authz",
    label: "AuthN/AuthZ",
    description: "Token validity, scopes/roles, permission enforcement",
    recommended: true,
  },
  {
    value: "negative",
    label: "Negative/Error Handling",
    description: "4xx/5xx handling, validation errors, fault responses",
    recommended: true,
  },
  {
    value: "edge-boundary",
    label: "Boundary",
    description: "Payload sizes, limits, boundary values",
    recommended: true,
  },
  {
    value: "idempotency-replay",
    label: "Idempotency/Replay",
    description: "Retries, idempotency keys, duplicate protection",
    recommended: true,
  },
  {
    value: "rate-limits",
    label: "Rate Limits/Throttling",
    description: "429 behavior, backoff, Retry-After",
    recommended: true,
  },
  {
    value: "paging-filter-sort",
    label: "Pagination/Filter/Sort",
    description: "Ordering stability, filters correctness, invalid params",
    recommended: true,
  },
  {
    value: "data-integrity",
    label: "Data Integrity",
    description: "CRUD consistency, concurrency, state transitions",
    recommended: true,
  },
];

const A11Y_TYPES: CrossPlatformTestType[] = [
  {
    value: "a11y-keyboard",
    label: "Keyboard-only",
    description: "Tab/shift-tab, no mouse required",
    recommended: true,
  },
  {
    value: "a11y-focus",
    label: "Focus Order/Visible Focus",
    description: "Logical focus order; visible focus indicator",
    recommended: true,
  },
  {
    value: "a11y-screenreader",
    label: "Screen Reader",
    description: "Labels/roles, name/role/value, announcements",
    recommended: true,
  },
  {
    value: "a11y-contrast",
    label: "Color Contrast",
    description: "Contrast thresholds for text and UI components",
    recommended: true,
  },
  {
    value: "a11y-forms-errors",
    label: "Forms/Errors",
    description: "aria-describedby, error association, messaging",
    recommended: true,
  },
  {
    value: "a11y-zoom-reflow",
    label: "Zoom/Reflow",
    description: "200% zoom, responsive reflow, no content loss",
    recommended: true,
  },
];

const PERF_TYPES: CrossPlatformTestType[] = [
  {
    value: "load",
    label: "Load",
    description: "Expected traffic volume and throughput",
    recommended: true,
  },
  {
    value: "stress",
    label: "Stress",
    description: "Beyond expected limits; breaking points",
    recommended: true,
  },
  {
    value: "spike",
    label: "Spike",
    description: "Sudden traffic spikes; autoscaling behavior",
    recommended: true,
  },
  {
    value: "soak",
    label: "Soak/Endurance",
    description: "Long duration; memory leaks, stability",
    recommended: true,
  },
  {
    value: "latency-sla",
    label: "Latency/SLAs",
    description: "p95/p99 latency targets and timeouts",
    recommended: true,
  },
  {
    value: "resources",
    label: "Resource Utilization",
    description: "CPU/memory/db connections; saturation",
    recommended: true,
  },
  {
    value: "reliability",
    label: "Reliability/Error Rates",
    description: "Error budgets, failure rates under load",
    recommended: true,
  },
];

function getTypesForPlatform(platform: PlatformId): CrossPlatformTestType[] {
  switch (platform) {
    case "web":
      return WEB_TYPES;
    case "mobile":
      return MOBILE_TYPES;
    case "api":
      return API_TYPES;
    case "accessibility":
      return A11Y_TYPES;
    case "performance":
      return PERF_TYPES;
    default:
      return [];
  }
}

function uniq(arr: string[]) {
  return Array.from(new Set(arr.filter(Boolean)));
}

type Props = {
  platform: PlatformId;
  value: string[];
  onChange: (value: string[]) => void;
  disabled?: boolean;
  placeholder?: string;
};

export function CrossPlatformTestTypeMultiselect({
  platform,
  value,
  onChange,
  disabled = false,
  placeholder = "Select test types...",
}: Props) {
  const [open, setOpen] = React.useState(false);

  const options = React.useMemo(
    () => getTypesForPlatform(platform),
    [platform],
  );
  const selected = React.useMemo(
    () => options.filter((t) => value.includes(t.value)),
    [options, value],
  );

  const toggle = (v: string) => {
    const next = value.includes(v)
      ? value.filter((x) => x !== v)
      : [...value, v];
    onChange(uniq(next));
  };

  const remove = (v: string) => onChange(value.filter((x) => x !== v));

  const applyRecommended = () => {
    const rec = options.filter((t) => t.recommended).map((t) => t.value);
    onChange(uniq(rec));
  };

  const clear = () => onChange([]);

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
              {selected.length === 0 ? (
                <span className="text-muted-foreground">{placeholder}</span>
              ) : (
                selected.map((t) => (
                  <Badge
                    key={t.value}
                    variant="secondary"
                    className="mr-1"
                    onClick={(e) => {
                      e.stopPropagation();
                      remove(t.value);
                    }}
                  >
                    {t.label}
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
                {selected.length} of {options.length} selected
              </span>
              <div className="flex gap-3">
                <button
                  onClick={applyRecommended}
                  className="text-primary hover:underline font-medium inline-flex items-center gap-1"
                  type="button"
                >
                  <Sparkles className="h-3 w-3" />
                  Recommended
                </button>
                {selected.length > 0 && (
                  <button
                    onClick={clear}
                    className="text-destructive hover:underline font-medium"
                    type="button"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            <CommandGroup className="max-h-[320px] overflow-y-auto p-2">
              {options.map((t) => {
                const isSelected = value.includes(t.value);
                return (
                  <CommandItem
                    key={t.value}
                    onSelect={() => toggle(t.value)}
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
                          <span className="font-medium text-sm">{t.label}</span>
                          {t.recommended && (
                            <Badge
                              variant="outline"
                              className="text-[10px] h-4 px-1"
                            >
                              Recommended
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground leading-snug">
                          {t.description}
                        </p>
                      </div>
                    </div>
                  </CommandItem>
                );
              })}
            </CommandGroup>

            {options.length > 6 && (
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
