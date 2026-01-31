"use client";

import { useCallback, useEffect, useState } from "react";
import type {
  TestCase,
  CrossPlatformTestCase,
  Generation,
  TestSuite, // Changed from CrossPlatformSuite
  TestSession,
  Project,
  ExecutionStatus,
} from "@/types/test-cases";

type UseTestCaseDataArgs = {
  generationId: string | null;
  sessionId: string | null;
  selectedProject: string;
};

export type ExecutionByCaseId = Record<
  string,
  { status: ExecutionStatus; executed_at?: string | null }
>;

type UseTestCaseDataResult = {
  loading: boolean;
  testCases: TestCase[];
  crossPlatformCases: CrossPlatformTestCase[];
  projects: Project[];
  currentSession: TestSession | null;
  executionByCaseId: ExecutionByCaseId;

  // Legacy - kept for backward compatibility, can be removed if not used
  generations: Generation[]; // Changed from Record to array

  refresh: () => Promise<void>;
};

export function useTestCaseData({
  generationId,
  sessionId,
  selectedProject,
}: UseTestCaseDataArgs): UseTestCaseDataResult {
  const [loading, setLoading] = useState(true);

  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [crossPlatformCases, setCrossPlatformCases] = useState<
    CrossPlatformTestCase[]
  >([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentSession, setCurrentSession] = useState<TestSession | null>(
    null,
  );

  const [executionByCaseId, setExecutionByCaseId] = useState<ExecutionByCaseId>(
    {},
  );

  // Legacy state - kept for backward compatibility
  const [generations, setGenerations] = useState<Generation[]>([]);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (generationId) qs.set("generation", generationId);
      if (sessionId) qs.set("session", sessionId);
      if (selectedProject) qs.set("project", selectedProject);

      const res = await fetch(`/api/test-cases/overview?${qs.toString()}`, {
        cache: "no-store",
      });

      if (!res.ok) {
        const msg = await res.text().catch(() => "");
        throw new Error(`Overview failed (${res.status}): ${msg}`);
      }

      const payload = await res.json();

      setProjects(payload.projects ?? []);
      setTestCases(payload.testCases ?? []);
      setCrossPlatformCases(payload.crossPlatformCases ?? []);
      setCurrentSession(payload.currentSession ?? null);
      setExecutionByCaseId(payload.executionByCaseId ?? {});

      // Legacy - generations are now returned as an array
      setGenerations(payload.generations ?? []);
    } catch (error) {
      console.error("Error fetching test case data:", error);
      // Reset to empty states on error
      setProjects([]);
      setTestCases([]);
      setCrossPlatformCases([]);
      setCurrentSession(null);
      setExecutionByCaseId({});
      setGenerations([]);
    } finally {
      setLoading(false);
    }
  }, [generationId, sessionId, selectedProject]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return {
    loading,
    testCases,
    crossPlatformCases,
    projects,
    currentSession,
    executionByCaseId,
    generations,
    refresh,
  };
}
