"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth/auth-context";
import type {
  ExecutionDetails,
  ExecutionStatus,
  TestExecution,
} from "@/types/test-cases";

type UseExecutionsArgs = {
  sessionId: string | null;
};

type HydrateArgs = {
  testCaseIds: string[];
  crossPlatformIds: string[];
};

type ExecutionRow = NonNullable<TestExecution[string]>;

const FINAL_STATUSES: ExecutionStatus[] = [
  "passed",
  "failed",
  "blocked",
  "skipped",
];

export function useExecutions({ sessionId }: UseExecutionsArgs) {
  //  USE AUTH CONTEXT
  const { user } = useAuth();

  // ALL useState
  const [execution, setExecution] = useState<TestExecution>({});

  //ALL useRef
  const executionRef = useRef<TestExecution>({});

  //  ALL useMemo
  const defaultRow = useMemo<ExecutionRow>(
    () => ({
      status: "not_run",
      completedSteps: [],
      failedSteps: [],
    }),
    []
  );

  // ALL useCallback
  const ensureRow = useCallback(
    (testCaseId: string): ExecutionRow => {
      const current = executionRef.current[testCaseId];
      if (current) return current as ExecutionRow;

      setExecution((prev) => ({
        ...prev,
        [testCaseId]: defaultRow,
      }));

      return defaultRow;
    },
    [defaultRow]
  );

  const hydrateExecutions = useCallback(
    async ({ testCaseIds, crossPlatformIds }: HydrateArgs) => {
      if (testCaseIds.length === 0 && crossPlatformIds.length === 0) return;

      const supabase = createClient();
      const ids = [...testCaseIds, ...crossPlatformIds];

      let query = supabase
        .from("test_executions")
        .select("*")
        .in("test_case_id", ids)
        .order("created_at", { ascending: false });

      if (sessionId) query = query.eq("session_id", sessionId);

      const { data, error } = await query;
      if (error) throw error;

      const executionMap: TestExecution = {};

      data?.forEach((row) => {
        if (!executionMap[row.test_case_id]) {
          executionMap[row.test_case_id] = {
            id: row.id,
            status: row.execution_status,
            completedSteps: row.completed_steps || [],
            failedSteps: row.failed_steps || [],
            notes: row.execution_notes,
            failure_reason: row.failure_reason,
            started_at: row.started_at,
            completed_at: row.completed_at,
            duration_minutes: row.duration_minutes,
            test_environment: row.test_environment,
            browser: row.browser,
            os_version: row.os_version,
            attachments: row.attachments || [],
          };
        }
      });

      ids.forEach((id) => {
        if (!executionMap[id]) {
          executionMap[id] = {
            status: "not_run",
            completedSteps: [],
            failedSteps: [],
          };
        }
      });

      setExecution(executionMap);
    },
    [sessionId]
  );

  const saveProgress = useCallback(
    async (testCaseId: string, updates: Partial<TestExecution[string]>) => {
      if (!user) return;

      const supabase = createClient();
      const current = ensureRow(testCaseId);

      const nextStatus: ExecutionStatus = (updates.status ??
        current.status) as ExecutionStatus;

      const startedAt =
        nextStatus === "not_run"
          ? null
          : current.started_at ??
            (nextStatus === "in_progress" ? new Date().toISOString() : null);

      const completedAt = FINAL_STATUSES.includes(nextStatus)
        ? new Date().toISOString()
        : null;

      const completedSteps =
        updates.completedSteps ?? current.completedSteps ?? [];
      const failedSteps = updates.failedSteps ?? current.failedSteps ?? [];

      const payload = {
        test_case_id: testCaseId,
        executed_by: user.id,
        session_id: sessionId || null,

        execution_status: nextStatus,
        completed_steps: completedSteps,
        failed_steps: failedSteps,

        execution_notes: updates.notes ?? current.notes ?? null,
        failure_reason:
          updates.failure_reason ?? current.failure_reason ?? null,

        test_environment:
          updates.test_environment ?? current.test_environment ?? "staging",
        browser: updates.browser ?? current.browser ?? null,
        os_version: updates.os_version ?? current.os_version ?? null,

        started_at: startedAt,
        completed_at: completedAt,

        duration_minutes:
          updates.duration_minutes ?? current.duration_minutes ?? null,
        attachments:
          (updates as any).attachments ?? (current as any).attachments ?? [],

        updated_at: new Date().toISOString(),
      };

      // Upsert
      if (current.id) {
        const { error } = await supabase
          .from("test_executions")
          .update(payload)
          .eq("id", current.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("test_executions")
          .insert(payload)
          .select("id")
          .single();

        if (error) throw error;

        setExecution((prev) => ({
          ...prev,
          [testCaseId]: {
            ...(prev[testCaseId] || current),
            id: data.id,
          },
        }));
      }

      // Update local state
      setExecution((prev) => ({
        ...prev,
        [testCaseId]: {
          ...(prev[testCaseId] || current),
          status: nextStatus,
          completedSteps,
          failedSteps,
          notes: payload.execution_notes ?? undefined,
          failure_reason: payload.failure_reason ?? undefined,
          test_environment: payload.test_environment ?? undefined,
          browser: payload.browser ?? undefined,
          os_version: payload.os_version ?? undefined,
          started_at: payload.started_at ?? undefined,
          completed_at: payload.completed_at ?? undefined,
          duration_minutes: payload.duration_minutes ?? undefined,
          attachments: payload.attachments ?? [],
        },
      }));
    },
    [ensureRow, sessionId, user]
  );

  const toggleStep = useCallback(
    async (testCaseId: string, stepNumber: number) => {
      const current = ensureRow(testCaseId);

      const isCompleted = (current.completedSteps || []).includes(stepNumber);
      const updatedSteps = isCompleted
        ? (current.completedSteps || []).filter((s) => s !== stepNumber)
        : [...(current.completedSteps || []), stepNumber];

      const nextStatus: ExecutionStatus =
        current.status === "not_run"
          ? "in_progress"
          : (current.status as ExecutionStatus);

      // Optimistic UI
      setExecution((prev) => ({
        ...prev,
        [testCaseId]: {
          ...(prev[testCaseId] || current),
          completedSteps: updatedSteps,
          status: nextStatus,
        },
      }));

      await saveProgress(testCaseId, {
        completedSteps: updatedSteps,
        status: nextStatus,
      });
    },
    [ensureRow, saveProgress]
  );

  const saveResult = useCallback(
    async (
      testCaseId: string,
      status: ExecutionStatus,
      details: ExecutionDetails = {}
    ) => {
      const current = ensureRow(testCaseId);

      const startTime = current.started_at;
      const duration = startTime
        ? Math.round((Date.now() - new Date(startTime).getTime()) / 60000)
        : undefined;

      await saveProgress(testCaseId, {
        status,
        duration_minutes: duration,

        notes: details.notes,
        failure_reason: details.failure_reason,

        test_environment:
          (details as any).environment ?? current.test_environment ?? "staging",
        browser: details.browser,
        os_version: details.os_version,
      });
    },
    [ensureRow, saveProgress]
  );

  const reset = useCallback(
    async (testCaseId: string) => {
      await saveProgress(testCaseId, {
        status: "not_run",
        completedSteps: [],
        failedSteps: [],
        notes: "",
        failure_reason: "",
        duration_minutes: undefined,
      });
    },
    [saveProgress]
  );

  // ALL useEffect
  useEffect(() => {
    executionRef.current = execution;
  }, [execution]);

  return {
    execution,
    setExecution,
    hydrateExecutions,
    toggleStep,
    saveProgress,
    saveResult,
    reset,
  };
}
