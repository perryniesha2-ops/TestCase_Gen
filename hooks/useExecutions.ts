"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
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
  const [execution, setExecution] = useState<TestExecution>({});

  // Always read the latest execution state inside async callbacks
  const executionRef = useRef<TestExecution>({});
  useEffect(() => {
    executionRef.current = execution;
  }, [execution]);

  const defaultRow = useMemo<ExecutionRow>(
    () => ({
      status: "not_run",
      completedSteps: [],
      failedSteps: [],
    }),
    []
  );

  const ensureRow = useCallback(
    (testCaseId: string): ExecutionRow => {
      const current = executionRef.current[testCaseId];
      if (current) return current as ExecutionRow;

      // Seed local state so UI reads are safe immediately
      setExecution((prev) => ({
        ...prev,
        [testCaseId]: defaultRow,
      }));

      return defaultRow;
    },
    [defaultRow]
  );

  const hydrateOne = useCallback(
    async (testCaseId: string) => {
      const supabase = createClient();

      let query = supabase
        .from("test_executions")
        .select("*")
        .eq("test_case_id", testCaseId)
        .order("created_at", { ascending: false })
        .limit(1);

      if (sessionId) query = query.eq("session_id", sessionId);

      const { data, error } = await query;
      if (error) throw error;

      const row = data?.[0];
      if (!row) {
        // ensure row exists in local state
        setExecution((prev) => ({
          ...prev,
          [testCaseId]: prev[testCaseId] ?? {
            status: "not_run",
            completedSteps: [],
            failedSteps: [],
          },
        }));
        return;
      }

      setExecution((prev) => ({
        ...prev,
        [testCaseId]: {
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
        },
      }));
    },
    [sessionId]
  );

  const saveProgress = useCallback(
    async (testCaseId: string, updates: Partial<TestExecution[string]>) => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const current = ensureRow(testCaseId);

      const nextStatus: ExecutionStatus = (updates.status ??
        current.status) as ExecutionStatus;

      // timestamps: normalize based on status
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

        // allow caller to persist duration/attachments
        duration_minutes:
          updates.duration_minutes ?? current.duration_minutes ?? null,
        attachments:
          (updates as any).attachments ?? (current as any).attachments ?? [],

        updated_at: new Date().toISOString(),
      };

      // Upsert (update if id exists, else insert)
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

      // Reflect updates locally (single source for UI)
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
    [ensureRow, sessionId]
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

      // optimistic UI
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

        // your dialog uses "environment"; DB uses test_environment
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

  return {
    execution,
    setExecution,
    hydrateOne,
    toggleStep,
    saveProgress,
    saveResult,
    reset,
  };
}
