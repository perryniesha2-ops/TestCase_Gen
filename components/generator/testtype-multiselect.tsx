// components/generator/test-type-multiselect.tsx - IMPROVED WITH SCROLLING
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

export type TestType = {
  value: string;
  label: string;
  description: string;
  icon?: string;
  recommended?: boolean;
};

const TEST_TYPES: TestType[] = [
  {
    value: "happy-path",
    label: "Happy Path",
    description: "Positive scenarios with valid inputs and expected flows",
  },
  {
    value: "negative",
    label: "Negative Tests",
    description: "Invalid inputs, error handling, and unhappy paths",
  },
  {
    value: "boundary",
    label: "Boundary Tests",
    description: "Min/max values, limits, and edge conditions",
  },
  {
    value: "security",
    label: "Security Tests",
    description: "Authentication, authorization, XSS, injection attacks",
  },
  {
    value: "edge-case",
    label: "Edge Cases",
    description: "Unusual but valid scenarios and rare conditions",
  },
  {
    value: "performance",
    label: "Performance Tests",
    description: "Load, stress, and response time scenarios",
  },
  {
    value: "integration",
    label: "Integration Tests",
    description: "Component interactions and data flow between systems",
  },
  {
    value: "regression",
    label: "Regression Tests",
    description: "Verify existing functionality after changes",
  },
  {
    value: "smoke",
    label: "Smoke Tests",
    description: "Critical path validation and basic functionality",
  },
];

interface TestTypeMultiselectProps {
  value: string[];
  onChange: (value: string[]) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function TestTypeMultiselect({
  value,
  onChange,
  disabled = false,
  placeholder = "Select test types...",
}: TestTypeMultiselectProps) {
  const [open, setOpen] = React.useState(false);

  const selectedTypes = TEST_TYPES.filter((type) => value.includes(type.value));

  const toggleType = (typeValue: string) => {
    const newValue = value.includes(typeValue)
      ? value.filter((v) => v !== typeValue)
      : [...value, typeValue];
    onChange(newValue);
  };

  const removeType = (typeValue: string) => {
    onChange(value.filter((v) => v !== typeValue));
  };

  const selectRecommended = () => {
    const recommended = TEST_TYPES.filter((t) => t.recommended).map(
      (t) => t.value
    );
    onChange(recommended);
  };

  const clearAll = () => {
    onChange([]);
  };

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

            {/* Header with actions - Fixed at top */}
            <div className="flex items-center justify-between px-3 py-2 text-xs text-muted-foreground border-b bg-muted/30 sticky top-0 z-10">
              <span>
                {selectedTypes.length} of {TEST_TYPES.length} selected
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

            {/* Scrollable list */}
            <CommandGroup className="max-h-[350px] overflow-y-auto p-2">
              {TEST_TYPES.map((type) => {
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
                            : "opacity-50 [&_svg]:invisible"
                        )}
                      >
                        <Check className="h-3 w-3" />
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-base">{type.icon}</span>
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

            {/* Scroll indicator hint at bottom */}
            {TEST_TYPES.length > 6 && (
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
