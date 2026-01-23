"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "sonner";

interface ExportPlaywrightButtonProps {
  suiteId: string;
  suiteName?: string;
  variant?: "default" | "outline" | "ghost" | "secondary";
  size?: "default" | "sm" | "lg" | "icon";
  showLabel?: boolean;
  className?: string;
}

export function ExportPlaywrightButton({
  suiteId,
  suiteName,
  variant = "outline",
  size = "default",
  showLabel = true,
  className,
}: ExportPlaywrightButtonProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    try {
      setIsExporting(true);

      const response = await fetch("/api/automation/export/playwright", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ suiteId }),
      });

      if (!response.ok) {
        const error = await response
          .json()
          .catch(() => ({ error: "Export failed" }));
        throw new Error(error.error || `Export failed: ${response.statusText}`);
      }

      // Get filename from Content-Disposition header
      const contentDisposition = response.headers.get("Content-Disposition");
      const filenameMatch = contentDisposition?.match(/filename="(.+)"/);
      const filename = filenameMatch?.[1] || `playwright-export-${suiteId}.zip`;

      // Download the file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success("Export Successful", {
        description: `${
          suiteName || "Test suite"
        } exported as Playwright project`,
      });
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Export Failed", {
        description:
          error instanceof Error
            ? error.message
            : "Failed to export test suite",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const buttonContent = (
    <>
      {isExporting ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Download className="h-4 w-4" />
      )}
      {showLabel && size !== "icon" && (
        <span className="ml-2">
          {isExporting ? "Exporting..." : "Export to Playwright"}
        </span>
      )}
    </>
  );

  if (size === "icon" && !showLabel) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              onClick={handleExport}
              disabled={isExporting}
              variant={variant}
              size={size}
              className={className}
            >
              {buttonContent}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Export to Playwright</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <Button
      onClick={handleExport}
      disabled={isExporting}
      variant={variant}
      size={size}
      className={className}
    >
      {buttonContent}
    </Button>
  );
}
