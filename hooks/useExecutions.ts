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

type ExecutionRow = NonNullable<TestExecution[string]>;

type CaseType = "regular" | "cross-platform";

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
    [],
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
    [defaultRow],
  );

  // ✅ Updated to support both regular and cross-platform
  const hydrateOne = useCallback(
    async (testCaseId: string, caseType: CaseType = "regular") => {
      const supabase = createClient();

      // ✅ Select correct table based on case type
      const table =
        caseType === "regular" ? "test_executions" : "platform_test_executions";

      let query = supabase
        .from(table)
        .select("*")
        .eq("test_case_id", testCaseId)
        .order("created_at", { ascending: false })
        .limit(1);

      // Session ID only applies to regular test executions (suite sessions)
      if (sessionId && caseType === "regular") {
        query = query.eq("session_id", sessionId);
      }

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
          notes: row.notes || row.execution_notes, // ✅ Support both column names
          failure_reason: row.failure_reason,
          started_at: row.started_at,
          completed_at: row.completed_at,
          duration_minutes:
            row.duration_minutes || row.duration_seconds
              ? Math.round(row.duration_seconds / 60)
              : undefined,
          test_environment: row.test_environment,
          browser: row.browser,
          os_version: row.os_version,
          device_type: row.device_type, // ✅ Platform-specific field
          attachments: row.attachments || [],
        },
      }));
    },
    [sessionId],
  );

  // ✅ Updated to support both regular and cross-platform
  const saveProgress = useCallback(
    async (
      testCaseId: string,
      updates: Partial<TestExecution[string]>,
      caseType: CaseType = "regular",
    ) => {
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
          : (current.started_at ??
            (nextStatus === "in_progress" ? new Date().toISOString() : null));

      const completedAt = FINAL_STATUSES.includes(nextStatus)
        ? new Date().toISOString()
        : null;

      const completedSteps =
        updates.completedSteps ?? current.completedSteps ?? [];
      const failedSteps = updates.failedSteps ?? current.failedSteps ?? [];

      // ✅ Select correct table
      const table =
        caseType === "regular" ? "test_executions" : "platform_test_executions";

      // ✅ Build payload with fields common to both tables
      const commonPayload = {
        test_case_id: testCaseId,
        executed_by: user.id,
        execution_status: nextStatus,
        execution_type: "manual" as const,
        completed_steps: completedSteps,
        failed_steps: failedSteps,
        notes: updates.notes ?? current.notes ?? null,
        failure_reason:
          updates.failure_reason ?? current.failure_reason ?? null,
        test_environment:
          updates.test_environment ?? current.test_environment ?? "staging",
        browser: updates.browser ?? current.browser ?? null,
        os_version: updates.os_version ?? current.os_version ?? null,
        started_at: startedAt,
        completed_at: completedAt,
        updated_at: new Date().toISOString(),
      };

      // ✅ Add session_id only for regular tests
      const payload =
        caseType === "regular"
          ? { ...commonPayload, session_id: sessionId || null }
          : commonPayload;

      // ✅ Calculate duration if completed
      if (completedAt && startedAt) {
        const durationSeconds = Math.round(
          (new Date(completedAt).getTime() - new Date(startedAt).getTime()) /
            1000,
        );
        (payload as any).duration_seconds = durationSeconds;
      }

      // Upsert (update if id exists, else insert)
      if (current.id) {
        const { error } = await supabase
          .from(table)
          .update(payload)
          .eq("id", current.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from(table)
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

      // ✅ Update the test case's execution_status
      const testCaseTable =
        caseType === "regular" ? "test_cases" : "platform_test_cases";
      await supabase
        .from(testCaseTable)
        .update({ execution_status: nextStatus })
        .eq("id", testCaseId);

      // Reflect updates locally (single source for UI)
      setExecution((prev) => ({
        ...prev,
        [testCaseId]: {
          ...(prev[testCaseId] || current),
          status: nextStatus,
          completedSteps,
          failedSteps,
          notes: (payload as any).notes ?? undefined,
          failure_reason: (payload as any).failure_reason ?? undefined,
          test_environment: (payload as any).test_environment ?? undefined,
          browser: (payload as any).browser ?? undefined,
          os_version: (payload as any).os_version ?? undefined,
          started_at: (payload as any).started_at ?? undefined,
          completed_at: (payload as any).completed_at ?? undefined,
          duration_minutes: (payload as any).duration_seconds
            ? Math.round((payload as any).duration_seconds / 60)
            : undefined,
          attachments: (payload as any).attachments ?? [],
        },
      }));
    },
    [ensureRow, sessionId],
  );

  // ✅ Updated to support both regular and cross-platform
  const toggleStep = useCallback(
    async (
      testCaseId: string,
      stepNumber: number,
      caseType: CaseType = "regular",
    ) => {
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

      await saveProgress(
        testCaseId,
        {
          completedSteps: updatedSteps,
          status: nextStatus,
        },
        caseType,
      );
    },
    [ensureRow, saveProgress],
  );

  // ✅ Updated to support both regular and cross-platform
  const saveResult = useCallback(
    async (
      testCaseId: string,
      status: ExecutionStatus,
      details: ExecutionDetails = {},
      caseType: CaseType = "regular",
    ) => {
      const current = ensureRow(testCaseId);

      const startTime = current.started_at;
      const duration = startTime
        ? Math.round((Date.now() - new Date(startTime).getTime()) / 60000)
        : undefined;

      await saveProgress(
        testCaseId,
        {
          status,
          duration_minutes: duration,
          notes: details.notes,
          failure_reason: details.failure_reason,
          // your dialog uses "environment"; DB uses test_environment
          test_environment:
            (details as any).environment ??
            current.test_environment ??
            "staging",
          browser: details.browser,
          os_version: details.os_version,
        },
        caseType,
      );
    },
    [ensureRow, saveProgress],
  );

  // ✅ Updated to support both regular and cross-platform
  const reset = useCallback(
    async (testCaseId: string, caseType: CaseType = "regular") => {
      await saveProgress(
        testCaseId,
        {
          status: "not_run",
          completedSteps: [],
          failedSteps: [],
          notes: "",
          failure_reason: "",
          duration_minutes: undefined,
        },
        caseType,
      );
    },
    [saveProgress],
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
