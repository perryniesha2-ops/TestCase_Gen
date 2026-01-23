"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

export type SuiteExecutionStats = {
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  blocked: number;
};

export type TestSuiteListItem = {
  id: string;
  name: string;
  description: string | null;
  status: string;
  suite_type: string | null;
  created_at: string;

  project_id: string | null;
  projects: {
    id: string;
    name: string;
    color: string;
    icon: string | null;
  } | null;

  test_case_count: number;
  execution_stats: SuiteExecutionStats;
};

export function useTestSuites() {
  const [suites, setSuites] = useState<TestSuiteListItem[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/suites", {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
      });

      if (res.status === 401) {
        // Let your app’s auth middleware/router handle redirect if you have it
        setSuites([]);
        return;
      }

      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Failed to load suites");

      setSuites(json.suites ?? []);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message ?? "Failed to load suites");
      setSuites([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { suites, loading, refresh };
}
