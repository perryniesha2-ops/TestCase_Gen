// components/test-suites/UnifiedExportButton.tsx
"use client";

import { useState, useEffect } from "react";
import { Download, Loader2 } from "lucide-react";
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
  platforms?: PlatformType[];
  disabled?: boolean;
}

export function UnifiedExportButton({
  suiteId,
  suiteKind,
  platforms = [],
  disabled = false,
}: UnifiedExportButtonProps) {
  const [exporting, setExporting] = useState(false);
  const [open, setOpen] = useState(false);

  // Debug: Log props on mount and when they change
  useEffect(() => {
    console.log("🔍 UnifiedExportButton props:", {
      suiteId,
      suiteKind,
      platforms,
      regularFormatsCount: REGULAR_SUITE_FORMATS?.length || 0,
      platformOptionsKeys: Object.keys(PLATFORM_EXPORT_OPTIONS || {}),
    });
  }, [suiteId, suiteKind, platforms]);

  // components/test-suites/UnifiedExportButton.tsx

  const handleExport = async (
    format: ExportFormat,
    platform?: PlatformType,
  ) => {
    setExporting(true);
    try {
      const params = new URLSearchParams({ format });
      if (platform) params.set("platform", platform);

      console.log("🚀 Starting export:", { format, platform, suiteId });

      const response = await fetch(
        `/api/suites/${suiteId}/export?${params.toString()}`,
      );

      console.log("📡 Export response:", {
        status: response.status,
        ok: response.ok,
        statusText: response.statusText,
      });

      if (!response.ok) {
        // Get the error details
        let errorMessage = "Export failed";
        try {
          const errorData = await response.json();
          console.error("❌ Export error details:", errorData);
          errorMessage = errorData.error || errorData.details || errorMessage;

          // If there's a details field, append it
          if (errorData.details && errorData.error !== errorData.details) {
            errorMessage = `${errorData.error}: ${errorData.details}`;
          }
        } catch (parseError) {
          console.error("❌ Could not parse error response:", parseError);
          const text = await response.text();
          console.error("❌ Raw error response:", text);
          errorMessage = text || `Export failed with status ${response.status}`;
        }

        throw new Error(errorMessage);
      }

      // Download file
      const blob = await response.blob();
      console.log("📦 Received blob:", {
        size: blob.size,
        type: blob.type,
      });

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
      setOpen(false);
    } catch (error) {
      console.error("❌ Export failed:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Export failed - check console for details",
      );
    } finally {
      setExporting(false);
    }
  };

  // Check if we have any export options available
  const hasRegularOptions =
    REGULAR_SUITE_FORMATS && REGULAR_SUITE_FORMATS.length > 0;
  const hasCrossPlatformOptions =
    platforms &&
    platforms.length > 0 &&
    platforms.some((p) => PLATFORM_EXPORT_OPTIONS[p]?.length > 0);

  const hasAnyOptions =
    suiteKind === "regular" ? hasRegularOptions : hasCrossPlatformOptions;

  if (!hasAnyOptions) {
    console.warn("⚠️ No export options available", {
      suiteKind,
      platforms,
      hasRegularOptions,
      hasCrossPlatformOptions,
    });
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={exporting || disabled || !hasAnyOptions}
        >
          {exporting ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Download className="h-4 w-4 mr-2" />
          )}
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel>Export Test Cases</DropdownMenuLabel>
        <DropdownMenuSeparator />

        {suiteKind === "regular" ? (
          // Regular suite exports
          <>
            {!hasRegularOptions ? (
              <DropdownMenuItem disabled>
                No export formats available
              </DropdownMenuItem>
            ) : (
              REGULAR_SUITE_FORMATS.map((option) => (
                <DropdownMenuItem
                  key={option.format}
                  onClick={() => handleExport(option.format)}
                  disabled={exporting}
                >
                  {option.label}
                </DropdownMenuItem>
              ))
            )}
          </>
        ) : (
          // Cross-platform suite exports (grouped by platform)
          <>
            {!platforms || platforms.length === 0 ? (
              <DropdownMenuItem disabled>
                No platforms configured
              </DropdownMenuItem>
            ) : (
              platforms.map((platform) => {
                const options = PLATFORM_EXPORT_OPTIONS[platform];

                if (!options || options.length === 0) {
                  return (
                    <DropdownMenuItem key={platform} disabled>
                      {platform.charAt(0).toUpperCase() + platform.slice(1)} -
                      No formats
                    </DropdownMenuItem>
                  );
                }

                return (
                  <DropdownMenuSub key={platform}>
                    <DropdownMenuSubTrigger>
                      {platform.charAt(0).toUpperCase() + platform.slice(1)}{" "}
                      Tests
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent>
                      {options.map((option) => (
                        <DropdownMenuItem
                          key={option.format}
                          onClick={() => handleExport(option.format, platform)}
                          disabled={exporting}
                        >
                          {option.label}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>
                );
              })
            )}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
