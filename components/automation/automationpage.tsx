"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import type { SuiteTriageResponse } from "@/types/triage-types";
import { TriagePanel } from "../testcase-management/test_suites/triage-panel";
import { TestCaseQuickViewDialog } from "../testcase-management/test-cases/dialogs/test-case-view-dialog";

type Props = {
  suiteId?: string;
};

export function AutomationSuitePage(props: Props) {
  const params = useParams<{ suiteId?: string }>();
  const searchParams = useSearchParams();

  // Accept suiteId from ANY source (prop, dynamic route param, querystring)
  const suiteId = useMemo(() => {
    const fromProp = props.suiteId?.trim();
    const fromParam = (params?.suiteId ?? "").toString().trim();
    const fromQuery = (searchParams.get("suiteId") ?? "").trim();

    return fromProp || fromParam || fromQuery || "";
  }, [props.suiteId, params?.suiteId, searchParams]);

  const [openTestCase, setOpenTestCase] = useState(false);
  const [activeTestCaseId, setActiveTestCaseId] = useState<string | null>(null);

  useEffect(() => {
    // This must run if the component mounts
    console.log("[AutomationSuitePage] mounted. suiteId =", suiteId);
  }, [suiteId]);

  // HARD debug fetch (one-time sanity check)
  // This proves whether the API returns rows even if your UI doesn’t.
  useEffect(() => {
    let cancelled = false;

    async function sanityFetch() {
      if (!suiteId) return;

      const url = `/api/suites/${suiteId}/triage`;
      try {
        const res = await fetch(url, { method: "GET", cache: "no-store" });
        const raw = await res.text().catch(() => "");
        const preview = raw.slice(0, 400);

        if (cancelled) return;

        // optional: parse to validate shape
        if (res.ok) {
          const parsed = JSON.parse(raw) as SuiteTriageResponse;
          console.log(
            "[AutomationSuitePage] triage rows:",
            parsed.rows?.length ?? 0
          );
        } else {
          console.warn("[AutomationSuitePage] triage not ok:", res.status, raw);
        }
      } catch (e: any) {
        if (cancelled) return;
      }
    }

    void sanityFetch();
    return () => {
      cancelled = true;
    };
  }, [suiteId]);

  function handleOpenTestCase(testCaseId: string) {
    setActiveTestCaseId(testCaseId);
    setOpenTestCase(true);
  }

  async function handleImproveTestCase(testCaseId: string) {
    try {
      const res = await fetch(`/api/test-cases/${testCaseId}/improve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Optional: pass settings if you want
        body: JSON.stringify({
          style: "detailed",
          // application_url: "https://yourapp.com"
        }),
      });

      const payload = await res.json().catch(() => ({}));

      if (!res.ok) {
        toast.error(payload?.error ?? "Failed to improve test case");
        return;
      }

      toast.success("Test case improved");

      // Optional: open the test case immediately so user sees updates
      handleOpenTestCase(testCaseId);

      // Optional: if your quick view dialog fetches fresh data, you're done.
      // If triage scoring should refresh after improvement, you can trigger a refresh pattern (see note below).
    } catch (e) {
      toast.error("Failed to improve test case");
    }
  }

  return (
    <div className="space-y-6">
      {!suiteId ? (
        <div className="text-sm text-muted-foreground">
          Missing suiteId. Open Automation from a Suite.
        </div>
      ) : (
        <>
          <TriagePanel
            suiteId={suiteId}
            onOpenTestCase={handleOpenTestCase}
            onImproveTestCase={handleImproveTestCase}
          />
          <TestCaseQuickViewDialog
            open={openTestCase}
            onOpenChange={(v) => {
              setOpenTestCase(v);
              if (!v) setActiveTestCaseId(null);
            }}
            testCaseId={activeTestCaseId}
          />
        </>
      )}
    </div>
  );
}
