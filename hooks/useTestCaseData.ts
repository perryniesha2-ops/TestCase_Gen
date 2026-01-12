"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth/auth-context";
import type {
  TestCase,
  CrossPlatformTestCase,
  Generation,
  CrossPlatformSuite,
  TestSession,
  Project,
} from "@/types/test-cases";

type UseTestCaseDataArgs = {
  generationId: string | null;
  sessionId: string | null;
  selectedProject: string;
};

type UseTestCaseDataResult = {
  loading: boolean;
  testCases: TestCase[];
  crossPlatformCases: CrossPlatformTestCase[];
  projects: Project[];
  currentSession: TestSession | null;
  generations: Record<string, Generation>;
  crossPlatformSuites: Record<string, CrossPlatformSuite>;
  refresh: () => Promise<void>;
};

export function useTestCaseData({
  generationId,
  sessionId,
  selectedProject,
}: UseTestCaseDataArgs): UseTestCaseDataResult {
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [crossPlatformCases, setCrossPlatformCases] = useState<
    CrossPlatformTestCase[]
  >([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentSession, setCurrentSession] = useState<TestSession | null>(
    null
  );
  const [generations, setGenerations] = useState<Record<string, Generation>>(
    {}
  );
  const [crossPlatformSuites, setCrossPlatformSuites] = useState<
    Record<string, CrossPlatformSuite>
  >({});

  const refresh = useCallback(async () => {
    if (!user) {
      setTestCases([]);
      setCrossPlatformCases([]);
      setProjects([]);
      setCurrentSession(null);
      setGenerations({});
      setCrossPlatformSuites({});
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();

      // Build test cases query
      let testCaseQuery = supabase
        .from("test_cases")
        .select(`*, projects:project_id(id, name, color, icon)`)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (generationId)
        testCaseQuery = testCaseQuery.eq("generation_id", generationId);
      if (selectedProject)
        testCaseQuery = testCaseQuery.eq("project_id", selectedProject);

      const [
        testCasesResult,
        crossPlatformResult,
        projectsResult,
        generationsResult,
        suitesResult,
        sessionResult,
      ] = await Promise.all([
        testCaseQuery,
        supabase
          .from("platform_test_cases")
          .select(
            `
            *,
            cross_platform_test_suites!inner(
              id,
              requirement,
              user_id,
              platforms,
              generated_at
            )
          `
          )
          .eq("cross_platform_test_suites.user_id", user.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("projects")
          .select("id, name, color, icon")
          .eq("user_id", user.id)
          .order("name"),
        supabase
          .from("test_case_generations")
          .select("id, title")
          .eq("user_id", user.id),
        supabase
          .from("cross_platform_test_suites")
          .select("*")
          .eq("user_id", user.id),
        sessionId
          ? supabase
              .from("test_run_sessions")
              .select("*")
              .eq("id", sessionId)
              .single()
          : Promise.resolve({ data: null, error: null }),
      ]);

      if (testCasesResult.error) throw testCasesResult.error;
      if (crossPlatformResult.error) throw crossPlatformResult.error;
      if (projectsResult.error) throw projectsResult.error;
      if (generationsResult.error) throw generationsResult.error;
      if (suitesResult.error) throw suitesResult.error;
      if (sessionResult.error && sessionId) throw sessionResult.error;

      setTestCases(testCasesResult.data || []);
      setCrossPlatformCases(crossPlatformResult.data || []);
      setProjects(projectsResult.data || []);
      setCurrentSession(sessionResult.data);

      // Transform generations
      const generationsMap: Record<string, Generation> = {};
      generationsResult.data?.forEach((gen) => {
        generationsMap[gen.id] = gen;
      });
      setGenerations(generationsMap);

      // Transform suites
      const suitesMap: Record<string, CrossPlatformSuite> = {};
      suitesResult.data?.forEach((suite) => {
        suitesMap[suite.id] = suite;
      });
      setCrossPlatformSuites(suitesMap);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  }, [user, generationId, selectedProject, sessionId]);

  useEffect(() => {
    if (user) {
      void refresh();
    }
  }, [refresh, user]);

  return {
    loading,
    testCases,
    crossPlatformCases,
    projects,
    currentSession,
    generations,
    crossPlatformSuites,
    refresh,
  };
}
