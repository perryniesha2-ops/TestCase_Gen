// hooks/use-requirements.ts
"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth/auth-context";
import type { Requirement } from "@/types/requirements";

export function useRequirements(projectFilter?: string) {
  const { user } = useAuth();

  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRequirements = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const supabase = createClient();

      let query = supabase
        .from("requirements")
        .select(
          `
          *,
          projects:project_id(id, name, color, icon)
        `
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      // Apply project filter if provided
      if (projectFilter) {
        query = query.eq("project_id", projectFilter);
      }

      const { data: reqData, error: reqError } = await query;

      if (reqError) {
        console.error("Requirements query error:", reqError);
        toast.error(`Failed to load requirements: ${reqError.message}`);
        return;
      }

      if (!reqData || reqData.length === 0) {
        setRequirements([]);
        return;
      }

      const requirementIds = reqData.map((r) => r.id);
      const coverageMap = await calculateCoverageBatch(requirementIds);

      // Map coverage to requirements
      const requirementsWithCoverage = reqData.map((req) => ({
        ...req,
        test_case_count: coverageMap[req.id]?.testCaseCount ?? 0,
        coverage_percentage: coverageMap[req.id]?.percentage ?? 0,
      }));

      setRequirements(requirementsWithCoverage);
    } catch (error) {
      console.error("Error fetching requirements:", error);
      toast.error("Failed to load requirements");
    } finally {
      setLoading(false);
    }
  }, [projectFilter, user]);

  useEffect(() => {
    fetchRequirements();
  }, [fetchRequirements]);

  async function calculateCoverageBatch(
    requirementIds: string[]
  ): Promise<Record<string, { testCaseCount: number; percentage: number }>> {
    if (requirementIds.length === 0) return {};

    try {
      const supabase = createClient();

      const { data: linkData, error: linkError } = await supabase
        .from("requirement_test_cases")
        .select("requirement_id, test_case_id")
        .in("requirement_id", requirementIds);

      if (linkError) {
        console.error("Coverage link error:", linkError);
        return {};
      }

      // Group by requirement
      const linksByRequirement: Record<string, string[]> = {};
      (linkData || []).forEach((link) => {
        if (!linksByRequirement[link.requirement_id]) {
          linksByRequirement[link.requirement_id] = [];
        }
        linksByRequirement[link.requirement_id].push(link.test_case_id);
      });

      // Get all unique test case IDs
      const allTestCaseIds = Array.from(
        new Set(Object.values(linksByRequirement).flat())
      );

      if (allTestCaseIds.length === 0) {
        // No test cases linked to any requirement
        return requirementIds.reduce((acc, id) => {
          acc[id] = { testCaseCount: 0, percentage: 0 };
          return acc;
        }, {} as Record<string, { testCaseCount: number; percentage: number }>);
      }

      const { data: execData, error: execError } = await supabase
        .from("test_executions")
        .select("test_case_id, execution_status, created_at")
        .in("test_case_id", allTestCaseIds)
        .order("created_at", { ascending: false });

      if (execError) {
        console.error("Coverage execution error:", execError);
      }

      // Get latest execution per test case
      const latestExecutions: Record<string, string> = {};
      (execData || []).forEach((exec) => {
        if (!latestExecutions[exec.test_case_id]) {
          latestExecutions[exec.test_case_id] = exec.execution_status;
        }
      });

      // Calculate coverage for each requirement
      const coverageMap: Record<
        string,
        { testCaseCount: number; percentage: number }
      > = {};

      requirementIds.forEach((reqId) => {
        const testCaseIds = linksByRequirement[reqId] || [];
        const testCaseCount = testCaseIds.length;

        if (testCaseCount === 0) {
          coverageMap[reqId] = { testCaseCount: 0, percentage: 0 };
          return;
        }

        const passedCount = testCaseIds.filter(
          (tcId) => latestExecutions[tcId] === "passed"
        ).length;

        const percentage = Math.round((passedCount / testCaseCount) * 100);

        coverageMap[reqId] = { testCaseCount, percentage };
      });

      return coverageMap;
    } catch (error) {
      console.error("Error calculating coverage batch:", error);
      return {};
    }
  }

  async function deleteRequirement(id: string): Promise<boolean> {
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("requirements")
        .delete()
        .eq("id", id);

      if (error) {
        console.error("Delete error:", error);
        throw error;
      }
      return true;
    } catch (error) {
      console.error("Error deleting requirement:", error);
      toast.error("Failed to delete requirement");
      return false;
    }
  }

  return {
    requirements,
    loading,
    fetchRequirements,
    deleteRequirement,
  };
}
