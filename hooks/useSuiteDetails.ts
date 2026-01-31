// hooks/useSuiteDetails.ts
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import type { Project } from "@/types/test-cases";
import type { TestSuite } from "@/types/test-cases";

// ✅ Extended TestCase to support both types
export interface TestCase {
  id: string;
  title: string;
  description: string;
  test_type?: string;
  platform?: string; // NEW: for cross-platform cases
  framework?: string; // NEW: for cross-platform cases
  priority: string;
  status: string;
  execution_status?: string;
  test_steps?: Array<{
    step_number: number;
    action: string;
    expected: string;
    data?: string;
  }>;
  steps?: string[]; // NEW: for cross-platform cases
  expected_results?: string[]; // NEW: for cross-platform cases
  preconditions?: string | string[]; // Support both formats
  _caseType?: "regular" | "cross-platform"; // NEW: discriminator
}

// ✅ Updated to support both test_case_id and platform_test_case_id
export interface SuiteTestCase {
  id: string;
  test_case_id: string | null;
  platform_test_case_id: string | null; // NEW
  sequence_order: number;
  priority: string;
  estimated_duration_minutes: number;
  test_cases: TestCase | null;
}

type SuiteTestCaseRow = Omit<SuiteTestCase, "test_cases"> & {
  test_cases:
    | SuiteTestCase["test_cases"]
    | SuiteTestCase["test_cases"][]
    | null;
  platform_test_cases?: TestCase | TestCase[] | null; // NEW
};

type Options = { enabled?: boolean };

export function useSuiteDetails(
  suiteId: string | undefined,
  userId: string | undefined,
  opts: Options = {},
) {
  const enabled = opts.enabled ?? true;

  const [suite, setSuite] = useState<TestSuite | null>(null);
  const [suiteTestCases, setSuiteTestCases] = useState<SuiteTestCase[]>([]);
  const [availableTestCases, setAvailableTestCases] = useState<TestCase[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);

  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(false);

  const abortRef = useRef<AbortController | null>(null);

  const supabase = useMemo(() => createClient(), []);

  const fetchProjects = useCallback(async () => {
    if (!userId) return;
    const { data, error } = await supabase
      .from("projects")
      .select("id, name, color, icon")
      .eq("user_id", userId)
      .order("name");

    if (error) throw error;
    setProjects((data as Project[]) || []);
  }, [supabase, userId]);

  // ✅ UPDATED: Fetch from unified suites table with kind field
  const fetchSuite = useCallback(async () => {
    if (!userId || !suiteId) return;

    const { data, error } = await supabase
      .from("suites")
      .select(
        `
        id,
        name,
        description,
        kind,
        suite_type,
        status,
        created_at,
        project_id,
        projects (
          id, name, color, icon
        )
      `,
      )
      .eq("id", suiteId)
      .eq("user_id", userId)
      .single();

    if (error) throw error;
    setSuite((data as unknown as TestSuite) ?? null);
  }, [supabase, suiteId, userId]);

  // ✅ UPDATED: Fetch BOTH regular and cross-platform test cases
  const fetchSuiteTestCases = useCallback(async () => {
    if (!userId || !suiteId) return;

    const { data, error } = await supabase
      .from("suite_items")
      .select(
        `
        id,
        test_case_id,
        platform_test_case_id,
        sequence_order,
        priority,
        estimated_duration_minutes,
        test_cases (
          id,
          title,
          description,
          test_type,
          priority,
          status,
          execution_status
        ),
        platform_test_cases (
          id,
          title,
          description,
          platform,
          framework,
          priority,
          status
        )
      `,
      )
      .eq("suite_id", suiteId)
      .order("sequence_order", { ascending: true });

    if (error) throw error;

    const rows = (data ?? []) as SuiteTestCaseRow[];
    const transformed: SuiteTestCase[] = rows.map((item) => {
      // Handle regular test case
      if (item.test_cases) {
        const tc = Array.isArray(item.test_cases)
          ? item.test_cases[0]
          : item.test_cases;

        return {
          id: item.id,
          test_case_id: item.test_case_id,
          platform_test_case_id: null,
          sequence_order: item.sequence_order,
          priority: item.priority,
          estimated_duration_minutes: item.estimated_duration_minutes,
          test_cases: tc ? { ...tc, _caseType: "regular" as const } : null,
        };
      }

      // Handle cross-platform test case
      if (item.platform_test_cases) {
        const tc = Array.isArray(item.platform_test_cases)
          ? item.platform_test_cases[0]
          : item.platform_test_cases;

        return {
          id: item.id,
          test_case_id: null,
          platform_test_case_id: item.platform_test_case_id,
          sequence_order: item.sequence_order,
          priority: item.priority,
          estimated_duration_minutes: item.estimated_duration_minutes,
          test_cases: tc
            ? { ...tc, _caseType: "cross-platform" as const }
            : null,
        };
      }

      // Fallback
      return {
        id: item.id,
        test_case_id: item.test_case_id,
        platform_test_case_id: item.platform_test_case_id,
        sequence_order: item.sequence_order,
        priority: item.priority,
        estimated_duration_minutes: item.estimated_duration_minutes,
        test_cases: null,
      };
    });

    setSuiteTestCases(transformed);
  }, [supabase, suiteId, userId]);

  // ✅ UPDATED: Filter available test cases based on suite kind
  const fetchAvailableTestCases = useCallback(async () => {
    if (!userId || !suiteId) return;

    // First, get the suite's kind to determine which test cases to show
    const { data: suiteData } = await supabase
      .from("suites")
      .select("kind")
      .eq("id", suiteId)
      .single();

    const suiteKind = suiteData?.kind || "regular";

    // Get IDs of cases already in this suite
    const { data: suiteCases } = await supabase
      .from("suite_items")
      .select("test_case_id, platform_test_case_id")
      .eq("suite_id", suiteId);

    const assignedRegularIds = (suiteCases || [])
      .map((sc) => sc.test_case_id)
      .filter(Boolean);

    const assignedPlatformIds = (suiteCases || [])
      .map((sc) => sc.platform_test_case_id)
      .filter(Boolean);

    let combined: TestCase[] = [];

    // ✅ ONLY fetch test cases matching the suite's kind
    if (suiteKind === "regular") {
      // Fetch regular test cases only
      const regularQuery = supabase
        .from("test_cases")
        .select(
          "id, title, description, test_type, priority, status, execution_status",
        )
        .eq("status", "active")
        .eq("user_id", userId)
        .order("title", { ascending: true });

      if (assignedRegularIds.length > 0) {
        regularQuery.not("id", "in", `(${assignedRegularIds.join(",")})`);
      }

      const { data: regularData, error: regularError } = await regularQuery;

      if (regularError) {
        console.error("Error fetching regular test cases:", regularError);
      }

      combined = (regularData || []).map((tc) => ({
        ...tc,
        _caseType: "regular" as const,
      }));
    } else if (suiteKind === "cross-platform") {
      // Fetch cross-platform test cases only
      const platformQuery = supabase
        .from("platform_test_cases")
        .select("id, title, description, platform, framework, priority, status")
        .eq("status", "active")
        .eq("user_id", userId)
        .order("title", { ascending: true });

      if (assignedPlatformIds.length > 0) {
        platformQuery.not("id", "in", `(${assignedPlatformIds.join(",")})`);
      }

      const { data: platformData, error: platformError } = await platformQuery;

      if (platformError) {
        console.error("Error fetching platform test cases:", platformError);
      }

      combined = (platformData || []).map((tc) => ({
        ...tc,
        test_type: tc.platform, // Map platform to test_type for consistency
        _caseType: "cross-platform" as const,
      }));
    }

    setAvailableTestCases(combined);
  }, [supabase, userId, suiteId]);

  const reloadAll = useCallback(async () => {
    if (!enabled || !suiteId || !userId) return;

    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;

    setInitialLoading(true);
    try {
      await Promise.all([
        fetchProjects(),
        fetchSuite(),
        fetchSuiteTestCases(),
        fetchAvailableTestCases(),
      ]);
    } catch (err) {
      if ((err as any)?.name === "AbortError") return;
      console.error("[useSuiteDetails] load error", err);
      toast.error("Failed to load suite details");
    } finally {
      setInitialLoading(false);
    }
  }, [
    enabled,
    suiteId,
    userId,
    fetchProjects,
    fetchSuite,
    fetchSuiteTestCases,
    fetchAvailableTestCases,
  ]);

  useEffect(() => {
    void reloadAll();
    return () => abortRef.current?.abort();
  }, [reloadAll]);

  // ✅ UPDATED: Save to unified suites table
  const saveSuiteDetails = useCallback(
    async (patch: {
      name: string;
      description: string;
      status: string;
      suite_type: string;
      project_id: string;
    }) => {
      if (!suiteId) return;

      setLoading(true);
      try {
        const { error } = await supabase
          .from("suites")
          .update({
            name: patch.name.trim(),
            description: patch.description?.trim() || null,
            status: patch.status,
            suite_type: patch.suite_type,
            project_id: patch.project_id ? patch.project_id : null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", suiteId);

        if (error) throw error;

        toast.success("Suite updated");
        await fetchSuite();
      } catch (err) {
        console.error("[useSuiteDetails] saveSuiteDetails error", err);
        toast.error("Failed to update suite");
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [supabase, suiteId, fetchSuite],
  );

  const addTestCaseToSuite = useCallback(
    async (input: string | TestCase) => {
      if (!suiteId) return;

      setLoading(true);
      try {
        const maxOrder =
          suiteTestCases.length > 0
            ? Math.max(...suiteTestCases.map((stc) => stc.sequence_order))
            : 0;

        let testCaseId: string;
        let caseType: "regular" | "cross-platform";

        if (typeof input === "string") {
          const [maybeType, maybeId] = input.split(":");
          if (
            maybeId &&
            (maybeType === "regular" || maybeType === "cross-platform")
          ) {
            caseType = maybeType;
            testCaseId = maybeId;
          } else {
            // fallback for older callers that pass raw UUID (treat as regular)
            caseType = "regular";
            testCaseId = input;
          }
        } else {
          testCaseId = input.id;
          caseType = input._caseType || "regular";
        }

        const insertData = {
          suite_id: suiteId,
          test_case_id: caseType === "regular" ? testCaseId : null,
          platform_test_case_id:
            caseType === "cross-platform" ? testCaseId : null,
          sequence_order: maxOrder + 1,
          priority: "medium",
          estimated_duration_minutes: 30,
        };

        const { error } = await supabase.from("suite_items").insert(insertData);

        if (error) {
          if ((error as any).code === "23505") {
            toast.error("Test case is already in this suite");
            return;
          }
          throw error;
        }

        toast.success("Test case added to suite");
        await Promise.all([fetchSuiteTestCases(), fetchAvailableTestCases()]);
      } catch (err) {
        console.error("[useSuiteDetails] addTestCaseToSuite error", err);
        toast.error("Failed to add test case to suite");
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [
      supabase,
      suiteId,
      suiteTestCases,
      fetchSuiteTestCases,
      fetchAvailableTestCases,
    ],
  );

  const removeTestCaseFromSuite = useCallback(
    async (suiteTestCaseId: string) => {
      setLoading(true);
      try {
        const { error } = await supabase
          .from("suite_items")
          .delete()
          .eq("id", suiteTestCaseId);

        if (error) throw error;

        toast.success("Test case removed from suite");
        await Promise.all([fetchSuiteTestCases(), fetchAvailableTestCases()]);
      } catch (err) {
        console.error("[useSuiteDetails] removeTestCaseFromSuite error", err);
        toast.error("Failed to remove test case from suite");
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [supabase, fetchSuiteTestCases, fetchAvailableTestCases],
  );

  const updateTestCasePriority = useCallback(
    async (suiteTestCaseId: string, priority: string) => {
      try {
        const { error } = await supabase
          .from("suite_items")
          .update({ priority })
          .eq("id", suiteTestCaseId);

        if (error) throw error;
        await fetchSuiteTestCases();
      } catch (err) {
        console.error("[useSuiteDetails] updateTestCasePriority error", err);
        toast.error("Failed to update priority");
        throw err;
      }
    },
    [supabase, fetchSuiteTestCases],
  );

  return {
    // data
    suite,
    suiteTestCases,
    availableTestCases,
    projects,

    // state
    loading,
    initialLoading,

    // actions
    reloadAll,
    saveSuiteDetails,
    addTestCaseToSuite,
    removeTestCaseFromSuite,
    updateTestCasePriority,
  };
}
