// components/automation/export-automation-button.tsx
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

interface ExportAutomationButtonProps {
  suiteId: string;
  suiteName?: string;
  framework?: string; // ✅ NEW: Framework prop
  variant?: "default" | "outline" | "ghost" | "secondary";
  size?: "default" | "sm" | "lg" | "icon";
  showLabel?: boolean;
  className?: string;
}

export function ExportAutomationButton({
  suiteId,
  suiteName,
  framework = "playwright", // ✅ Default to playwright
  variant = "outline",
  size = "default",
  showLabel = true,
  className,
}: ExportAutomationButtonProps) {
  const [isExporting, setIsExporting] = useState(false);

  // ✅ Format framework name for display
  const getFrameworkDisplayName = () => {
    const names: Record<string, string> = {
      playwright: "Playwright",
      cypress: "Cypress",
      selenium: "Selenium",
      puppeteer: "Puppeteer",
      testcafe: "TestCafe",
      webdriverio: "WebdriverIO",
    };
    return names[framework.toLowerCase()] || "Playwright";
  };

  // ✅ Get correct export endpoint
  const getExportEndpoint = () => {
    const endpoints: Record<string, string> = {
      playwright: "/api/automation/export/playwright",
      cypress: "/api/automation/export/cypress",
      selenium: "/api/automation/export/selenium",
      puppeteer: "/api/automation/export/puppeteer",
      testcafe: "/api/automation/export/testcafe",
      webdriverio: "/api/automation/export/webdriverio",
    };
    // Default to playwright if endpoint not found
    return (
      endpoints[framework.toLowerCase()] || "/api/automation/export/playwright"
    );
  };

  // ✅ Check if framework is supported
  const isFrameworkSupported = () => {
    const supported = [
      "playwright",
      "cypress",
      "selenium",
      // "puppeteer",  // Coming soon
      // "testcafe",   // Coming soon
      // "webdriverio" // Coming soon
    ];
    return supported.includes(framework.toLowerCase());
  };

  const handleExport = async () => {
    // ✅ Check if framework is supported
    if (!isFrameworkSupported()) {
      toast.error("Export Not Available", {
        description: `${getFrameworkDisplayName()} export is coming soon.`,
      });
      return;
    }

    try {
      setIsExporting(true);

      const response = await fetch(getExportEndpoint(), {
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
      const filename =
        filenameMatch?.[1] || `${framework}-export-${suiteId}.zip`;

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
        description: `${suiteName || "Test suite"} exported as ${getFrameworkDisplayName()} project`,
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

  const frameworkName = getFrameworkDisplayName();
  const supported = isFrameworkSupported();

  const buttonContent = (
    <>
      {isExporting ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Download className="h-4 w-4" />
      )}
      {showLabel && size !== "icon" && (
        <span className="ml-2">
          {isExporting ? "Exporting..." : `Export to ${frameworkName}`}
        </span>
      )}
    </>
  );

  const tooltipText = supported
    ? `Export to ${frameworkName}`
    : `${frameworkName} export coming soon`;

  if (size === "icon" && !showLabel) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              onClick={handleExport}
              disabled={isExporting || !supported}
              variant={variant}
              size={size}
              className={className}
            >
              {buttonContent}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{tooltipText}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <Button
      onClick={handleExport}
      disabled={isExporting || !supported}
      variant={variant}
      size={size}
      className={className}
      title={!supported ? tooltipText : undefined}
    >
      {buttonContent}
    </Button>
  );
}

// ✅ Keep the old name as an alias for backwards compatibility
export const ExportPlaywrightButton = ExportAutomationButton;
