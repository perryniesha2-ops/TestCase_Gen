// components/test-suites/UnifiedExportButton.tsx
"use client";

import { useState, useEffect } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import {
  PLATFORM_EXPORT_OPTIONS,
  REGULAR_SUITE_FORMATS,
  type ExportFormat,
  type PlatformType,
} from "@/lib/exports/export-strategy";

interface UnifiedExportButtonProps {
  suiteId: string;
  suiteKind: "regular" | "cross-platform";
  platforms?: PlatformType[]; // Only for cross-platform suites
}

export function UnifiedExportButton({
  suiteId,
  suiteKind,
  platforms = [],
}: UnifiedExportButtonProps) {
  const [exporting, setExporting] = useState(false);

  const handleExport = async (
    format: ExportFormat,
    platform?: PlatformType,
  ) => {
    setExporting(true);
    try {
      const params = new URLSearchParams({ format });
      if (platform) params.set("platform", platform);

      const response = await fetch(
        `/api/suites/${suiteId}/export?${params.toString()}`,
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Export failed");
      }

      // Download file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download =
        response.headers
          .get("content-disposition")
          ?.split("filename=")[1]
          ?.replace(/"/g, "") || `export.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success(`Exported as ${format.toUpperCase()}`);
    } catch (error) {
      console.error("Export failed:", error);
      toast.error(error instanceof Error ? error.message : "Export failed");
    } finally {
      setExporting(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={exporting}>
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel>Export Test Cases</DropdownMenuLabel>
        <DropdownMenuSeparator />

        {suiteKind === "regular" ? (
          // Regular suite exports
          <>
            {REGULAR_SUITE_FORMATS.map((option) => (
              <DropdownMenuItem
                key={option.format}
                onClick={() => handleExport(option.format)}
              >
                {option.label}
              </DropdownMenuItem>
            ))}
          </>
        ) : (
          // Cross-platform suite exports (grouped by platform)
          <>
            {platforms.map((platform) => {
              const options = PLATFORM_EXPORT_OPTIONS[platform];
              return (
                <DropdownMenuSub key={platform}>
                  <DropdownMenuSubTrigger>
                    {platform.charAt(0).toUpperCase() + platform.slice(1)} Tests
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    {options.map((option) => (
                      <DropdownMenuItem
                        key={option.format}
                        onClick={() => handleExport(option.format, platform)}
                      >
                        {option.label}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
              );
            })}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
