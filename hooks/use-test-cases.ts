// hooks/use-test-cases.ts
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { TestCase, CrossPlatformTestCase } from "@/types/test-cases";

export function useTestCases(generationId?: string | null) {
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [crossPlatformCases, setCrossPlatformCases] = useState<
    CrossPlatformTestCase[]
  >([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchData();
  }, [generationId]);

  async function fetchData() {
    try {
      setLoading(true);
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      // Fetch regular test cases
      let testCaseQuery = supabase
        .from("test_cases")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (generationId) {
        testCaseQuery = testCaseQuery.eq("generation_id", generationId);
      }

      const { data: testCasesData, error: testCasesError } =
        await testCaseQuery;

      if (testCasesError) throw testCasesError;
      setTestCases(testCasesData || []);

      // Fetch cross-platform test cases (including status field)
      const { data: crossPlatformData, error: crossPlatformError } =
        await supabase
          .from("platform_test_cases")
          .select("*")
          .eq("cross_platform_test_suites.user_id", user.id)
          .order("created_at", { ascending: false });

      if (crossPlatformError) throw crossPlatformError;
      setCrossPlatformCases(crossPlatformData || []);
    } catch (error) {
      console.error("Error fetching test cases:", error);
    } finally {
      setLoading(false);
    }
  }

  return {
    testCases,
    crossPlatformCases,
    loading,
    fetchData,
    setTestCases,
    setCrossPlatformCases,
  };
}
