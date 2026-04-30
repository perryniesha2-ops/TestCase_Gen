// app/api/generate-test-cases/process/route.ts
// Internal route — called fire-and-forget by the main generate route.
// Protected by x-internal-secret. Uses service role client for all DB writes.
//
// Key design: save each batch to the DB immediately after it succeeds.
// This means partial results are always persisted — if later batches fail,
// the user still has whatever was saved from earlier batches.

import { NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { recordSuccessfulGeneration } from "@/lib/usage-tracker";
import {
  getDefaultModel,
  migrateModelKey,
  type ModelKey,
} from "@/lib/ai-models/config";
import {
  buildBatchPlan,
  buildPrompt,
  callLLM,
  normalizePriority,
  type GeneratedTestCase,
  type BatchPlan,
} from "@/lib/generation/test-case-generation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

function getServiceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

// ─── Run a single batch with one retry ───────────────────────────────────────

async function runBatch(
  modelKey: ModelKey,
  batch: BatchPlan,
  jobParams: {
    requirements: string;
    allAreaNames: string[];
    application_url?: string;
    template?: string;
  },
): Promise<{ cases: GeneratedTestCase[]; succeeded: boolean }> {
  const prompt = buildPrompt({
    requirements: jobParams.requirements,
    count: batch.count,
    area: batch.area,
    batchIndex: batch.batchIndex,
    totalBatches: batch.count,
    allAreaNames: jobParams.allAreaNames,
    application_url: jobParams.application_url,
    template: jobParams.template,
  });

  // Attempt 1
  try {
    const cases = await callLLM(modelKey, prompt, batch.count);
    if (cases.length > 0) return { cases, succeeded: true };
    console.warn(
      `[process] Batch ${batch.batchIndex + 1} (${batch.area.name}) returned 0 cases, retrying in 5s…`,
    );
  } catch (err) {
    console.error(
      `[process] Batch ${batch.batchIndex + 1} (${batch.area.name}) attempt 1 failed:`,
      (err as Error)?.message,
    );
  }

  // Wait longer before retry — gives Anthropic rate limits time to recover
  await new Promise((r) => setTimeout(r, 5000));

  // Attempt 2
  try {
    const cases = await callLLM(modelKey, prompt, batch.count);
    if (cases.length > 0) {
      console.log(
        `[process] Batch ${batch.batchIndex + 1} (${batch.area.name}) succeeded on retry`,
      );
      return { cases, succeeded: true };
    }
    console.error(
      `[process] Batch ${batch.batchIndex + 1} (${batch.area.name}) retry also returned 0`,
    );
  } catch (err) {
    console.error(
      `[process] Batch ${batch.batchIndex + 1} (${batch.area.name}) retry failed:`,
      (err as Error)?.message,
    );
  }

  return { cases: [], succeeded: false };
}

// ─── Save a batch of cases to the DB immediately ─────────────────────────────

async function saveBatch(
  db: ReturnType<typeof getServiceClient>,
  cases: GeneratedTestCase[],
  job: Record<string, unknown>,
): Promise<number> {
  if (cases.length === 0) return 0;

  const rows = cases.map((tc) => ({
    generation_id: job.generation_id,
    requirement_id: (job.requirement_id as string) || null,
    project_id: (job.project_id as string) || null,
    user_id: job.user_id,
    title: tc.title,
    description: tc.description,
    test_type: tc.test_type || "functional",
    priority: normalizePriority(tc.priority),
    preconditions: tc.preconditions ?? null,
    test_steps: tc.test_steps,
    expected_result: tc.expected_result,
    is_edge_case: Boolean(tc.is_edge_case),
    is_negative_test: Boolean(tc.is_negative_test),
    is_security_test: Boolean(tc.is_security_test),
    is_boundary_test: Boolean(tc.is_boundary_test),
    is_manual: false,
    status: "draft",
  }));

  const { data, error } = await db.from("test_cases").insert(rows).select("id");

  if (error || !data) {
    console.error("[process] DB batch save failed:", error?.message);
    return 0;
  }

  return data.length;
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(request: Request) {
  const secret = request.headers.get("x-internal-secret");
  if (
    !process.env.INTERNAL_API_SECRET ||
    secret !== process.env.INTERNAL_API_SECRET
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { job_id } = (await request.json()) as { job_id: string };
  if (!job_id)
    return NextResponse.json({ error: "job_id required" }, { status: 400 });

  const db = getServiceClient();

  const { data: job, error: jobErr } = await db
    .from("generation_jobs")
    .select("*")
    .eq("id", job_id)
    .single();

  if (jobErr || !job) {
    console.error("[process] Job not found:", job_id);
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  await db
    .from("generation_jobs")
    .update({ status: "processing", updated_at: new Date().toISOString() })
    .eq("id", job_id);

  const modelKey: ModelKey = job.model
    ? migrateModelKey(job.model)
    : getDefaultModel();

  const skipAreas: string[] = job.skip_areas ?? [];
  const fullBatchPlan = buildBatchPlan(job.test_case_count);
  const batchPlan =
    skipAreas.length > 0
      ? fullBatchPlan.filter((b) => !skipAreas.includes(b.area.name))
      : fullBatchPlan;

  const allAreaNames = [...new Set(fullBatchPlan.map((b) => b.area.name))];
  const jobParams = {
    requirements: job.requirements,
    allAreaNames,
    application_url: job.application_url ?? undefined,
    template: job.template ?? undefined,
  };

  const completedAreas: string[] = [];
  const failedAreas: string[] = [];
  let totalSaved = 0;

  try {
    // Run batches sequentially, saving each one immediately on success.
    // This ensures partial results are always persisted — if batch 3 of 4 fails,
    // the 3 successful batches are already in the DB and the job completes as partial.
    for (const batch of batchPlan) {
      console.log(
        `[process] Batch ${batch.batchIndex + 1}/${batchPlan.length}: ${batch.area.name}`,
      );

      const { cases, succeeded } = await runBatch(modelKey, batch, jobParams);

      if (succeeded && cases.length > 0) {
        // Save this batch immediately — don't wait for all batches to finish
        const saved = await saveBatch(db, cases, job);
        if (saved > 0) {
          totalSaved += saved;
          completedAreas.push(batch.area.name);
          console.log(
            `[process] Batch ${batch.batchIndex + 1} saved ${saved} cases (total: ${totalSaved})`,
          );
        } else {
          // LLM succeeded but DB write failed — treat as failed area
          failedAreas.push(batch.area.name);
        }
      } else {
        failedAreas.push(batch.area.name);
        console.warn(
          `[process] Batch ${batch.batchIndex + 1} (${batch.area.name}) failed both attempts`,
        );
      }

      // Update job progress after every batch
      await db
        .from("generation_jobs")
        .update({
          cases_saved: totalSaved,
          completed_areas: completedAreas,
          failed_areas: failedAreas,
          updated_at: new Date().toISOString(),
        })
        .eq("id", job_id);
    }

    // Mark complete — even if some batches failed, we have partial results
    const partial = failedAreas.length > 0;

    if (totalSaved === 0) {
      // Every single batch failed — mark as failed so the UI shows an error
      await db
        .from("generation_jobs")
        .update({
          status: "failed",
          completed_areas: completedAreas,
          failed_areas: failedAreas,
          error:
            "All batches failed. The AI provider may be experiencing high load — please try again in a few minutes.",
          updated_at: new Date().toISOString(),
        })
        .eq("id", job_id);
      return NextResponse.json({ success: false, error: "No cases generated" });
    }

    // At least some cases saved — always mark complete so the UI can show results
    await db
      .from("generation_jobs")
      .update({
        status: "complete",
        cases_saved: totalSaved,
        completed_areas: completedAreas,
        failed_areas: failedAreas,
        partial,
        error: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", job_id);

    await recordSuccessfulGeneration(job.user_id, totalSaved).catch(() => {});

    return NextResponse.json({
      success: true,
      cases_saved: totalSaved,
      partial,
      completed_areas: completedAreas,
      failed_areas: failedAreas,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error";
    console.error("[process] Unexpected error:", message);

    // Even on unexpected error, if we saved some cases, mark complete not failed
    if (totalSaved > 0) {
      await db
        .from("generation_jobs")
        .update({
          status: "complete",
          cases_saved: totalSaved,
          completed_areas: completedAreas,
          failed_areas: [...failedAreas, "unexpected-error"],
          partial: true,
          error: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", job_id);
      return NextResponse.json({
        success: true,
        cases_saved: totalSaved,
        partial: true,
      });
    }

    await db
      .from("generation_jobs")
      .update({
        status: "failed",
        error: message,
        updated_at: new Date().toISOString(),
      })
      .eq("id", job_id);
    return NextResponse.json({ success: false, error: message });
  }
}
