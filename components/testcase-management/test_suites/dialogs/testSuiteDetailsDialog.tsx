// components/test-suites/TestSuiteDetailsDialog.tsx
"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth/auth-context";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";
import type { TestSuite } from "@/types/test-cases";
import { useSuiteDetails } from "@/hooks/useSuiteDetails";
import { SuiteDetailsTabs } from "@/components/testcase-management/test_suites/testsuitedetails";

type Props = {
  suite: TestSuite; // can be "lite" but must include id/name at minimum
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuiteUpdated?: () => void;
  defaultTab?: "details" | "assigned" | "available";
};

export function TestSuiteDetailsDialog({
  suite,
  open,
  onOpenChange,
  onSuiteUpdated,
  defaultTab = "assigned",
}: Props) {
  const { user, loading: authLoading } = useAuth();

  // Only fetch when dialog is open
  const details = useSuiteDetails(suite?.id, user?.id, { enabled: open });

  // If you want to refresh after external updates, you can do it here
  useEffect(() => {
    if (!open) return;
    void details.reloadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, suite?.id]);

  const effectiveSuite = details.suite ?? suite;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-5xl md:max-w-6xl h-[80vh] max-h-[90vh] overflow-hidden flex flex-col p-6">
        <DialogHeader className="mb-2">
          <DialogTitle className="truncate">Manage Test Suite</DialogTitle>
        </DialogHeader>

        {authLoading || details.initialLoading || !effectiveSuite ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              Loading suite...
            </div>
          </div>
        ) : (
          <SuiteDetailsTabs
            suite={effectiveSuite}
            suiteTestCases={details.suiteTestCases}
            availableTestCases={details.availableTestCases}
            projects={details.projects}
            initialLoading={details.initialLoading}
            busy={details.loading}
            defaultTab={defaultTab}
            showOpenFullPageButton
            onSaveSuite={async (patch) => {
              await details.saveSuiteDetails(patch);
              onSuiteUpdated?.();
            }}
            onAddTestCase={async (testCaseId) => {
              await details.addTestCaseToSuite(testCaseId);
              onSuiteUpdated?.();
            }}
            onRemoveTestCase={async (suiteTestCaseId) => {
              await details.removeTestCaseFromSuite(suiteTestCaseId);
              onSuiteUpdated?.();
            }}
            onUpdatePriority={details.updateTestCasePriority}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
