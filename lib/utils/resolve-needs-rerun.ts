// lib/utils/resolve-needs-rerun.ts
//
// Shared utility — call this after any execution completes for a test case
// that might be flagged needs_rerun. Safely no-ops if the case isn't flagged.
//
// Status mapping:
//   pass   → active      (fix verified, disappears from NeedsRerunPanel)
//   fail   → needs_rerun (fix didn't work, stays in panel)
//   skip   → needs_rerun (still needs attention)
//   blocked→ needs_rerun (still needs attention)

import type { SupabaseClient } from "@supabase/supabase-js";

// Maps the RPC status values (pass/fail/skip) to DB execution_status values
// (passed/failed/skipped) — both formats are handled
const PASSING_STATUSES = new Set(["pass", "passed"]);

export async function resolveNeedsRerun(
  supabase: SupabaseClient,
  testCaseId: string,
  executionStatus: string,
): Promise<void> {
  if (!testCaseId || !executionStatus) return;

  const newStatus = PASSING_STATUSES.has(executionStatus)
    ? "active"
    : "needs_rerun";

  const { error } = await supabase
    .from("test_cases")
    .update({ status: newStatus })
    .eq("id", testCaseId)
    .eq("status", "needs_rerun"); // only touches cases that are flagged — safe no-op otherwise

  if (error) {
    // Non-fatal — log but don't surface to the user
    console.error(
      "[resolveNeedsRerun] Failed to update test_case status:",
      error,
    );
  } else {
    console.log(
      `[resolveNeedsRerun] test_case ${testCaseId}: needs_rerun → ${newStatus} (execution: ${executionStatus})`,
    );
  }
}
