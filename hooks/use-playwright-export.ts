"use client";

import { useState } from "react";
import { toast } from "sonner";

export interface UsePlaywrightExportOptions {
  onSuccess?: (filename: string) => void;
  onError?: (error: Error) => void;
}

export function usePlaywrightExport(options: UsePlaywrightExportOptions = {}) {
  const [isExporting, setIsExporting] = useState(false);

  const exportSuite = async (suiteId: string, suiteName?: string) => {
    try {
      setIsExporting(true);

      const response = await fetch("/api/automation/export/playwright", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ suiteId }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({
          error: "Export failed",
        }));
        throw new Error(
          errorData.error || `Export failed: ${response.statusText}`
        );
      }

      // Extract filename from Content-Disposition header
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

      // Cleanup
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      // Success notification
      toast.success("Export Successful", {
        description: suiteName
          ? `${suiteName} exported as Playwright project`
          : "Test suite exported successfully",
      });

      // Call success callback
      options.onSuccess?.(filename);

      return { success: true, filename };
    } catch (error) {
      console.error("Export error:", error);

      const errorMessage =
        error instanceof Error ? error.message : "Failed to export test suite";

      // Error notification
      toast.error("Export Failed", {
        description: errorMessage,
      });

      // Call error callback
      if (error instanceof Error) {
        options.onError?.(error);
      }

      return { success: false, error: errorMessage };
    } finally {
      setIsExporting(false);
    }
  };

  return {
    exportSuite,
    isExporting,
  };
}

// Batch export hook
export function useBatchPlaywrightExport(
  options: UsePlaywrightExportOptions = {}
) {
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  const exportSuites = async (suites: Array<{ id: string; name?: string }>) => {
    try {
      setIsExporting(true);
      setProgress({ current: 0, total: suites.length });

      const results: Array<{ id: string; success: boolean; error?: string }> =
        [];

      for (let i = 0; i < suites.length; i++) {
        const suite = suites[i];
        setProgress({ current: i + 1, total: suites.length });

        try {
          const response = await fetch("/api/automation/export/playwright", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ suiteId: suite.id }),
          });

          if (!response.ok) {
            throw new Error(`Failed to export ${suite.name || suite.id}`);
          }

          const blob = await response.blob();
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `playwright-export-${suite.id}.zip`;
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);

          results.push({ id: suite.id, success: true });

          // Small delay between downloads to avoid overwhelming the browser
          if (i < suites.length - 1) {
            await new Promise((resolve) => setTimeout(resolve, 500));
          }
        } catch (error) {
          results.push({
            id: suite.id,
            success: false,
            error: error instanceof Error ? error.message : "Export failed",
          });
        }
      }

      const successCount = results.filter((r) => r.success).length;
      const failCount = results.filter((r) => !r.success).length;

      // Success notification
      if (failCount === 0) {
        toast.success("Batch Export Complete", {
          description: `Successfully exported all ${suites.length} suites`,
        });
      } else {
        toast.warning("Batch Export Complete", {
          description: `Exported ${successCount} of ${suites.length} suites. ${failCount} failed.`,
        });
      }

      return { results, successCount, failCount };
    } catch (error) {
      console.error("Batch export error:", error);

      toast.error("Batch Export Failed", {
        description:
          error instanceof Error ? error.message : "Failed to export suites",
      });

      return { results: [], successCount: 0, failCount: suites.length };
    } finally {
      setIsExporting(false);
      setProgress({ current: 0, total: 0 });
    }
  };

  return {
    exportSuites,
    isExporting,
    progress,
  };
}
