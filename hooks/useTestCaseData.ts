"use client";

import { useCallback, useEffect, useState } from "react";
import type {
  TestCase,
  CrossPlatformTestCase,
  Generation,
  CrossPlatformSuite,
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

  // Added
  executionByCaseId: ExecutionByCaseId;

  // Keep if you still use them elsewhere; otherwise you can remove later
  generations: Record<string, Generation>;
  crossPlatformSuites: Record<string, CrossPlatformSuite>;

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
    null
  );

  const [executionByCaseId, setExecutionByCaseId] = useState<ExecutionByCaseId>(
    {}
  );

  // Optional legacy state (keep for now)
  const [generations, setGenerations] = useState<Record<string, Generation>>(
    {}
  );
  const [crossPlatformSuites, setCrossPlatformSuites] = useState<
    Record<string, CrossPlatformSuite>
  >({});

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (generationId) qs.set("generation", generationId);
      if (sessionId) qs.set("session", sessionId);
      if (selectedProject) qs.set("project", selectedProject);

      // IMPORTANT: this path must match your route file location.
      // If your route is app/api/test-cases/overview/route.ts then this is correct:
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

      // If your overview route does NOT return these, they will remain empty (fine)
      setGenerations(payload.generations ?? {});
      setCrossPlatformSuites(payload.crossPlatformSuites ?? {});
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
    crossPlatformSuites,
    refresh,
  };
}
