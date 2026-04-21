// app/api/generate-test-cases/process/route.ts
// Internal route — called fire-and-forget by the main generate route.
// Has its own maxDuration so it can run the full LLM batches without timing out.
// Protected by x-internal-secret header to prevent external calls.

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
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
} from "@/lib/generation/test-case-generation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

// ─── Service role client ──────────────────────────────────────────────────────
// The process route runs after the original request has been responded to,
// so the cookie-based client may no longer have a valid session context.
// We use the service role client for all DB writes here.

function getServiceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

export async function POST(request: Request) {
  // Verify this is an internal call
  const secret = request.headers.get("x-internal-secret");
  if (
    !process.env.INTERNAL_API_SECRET ||
    secret !== process.env.INTERNAL_API_SECRET
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { job_id } = (await request.json()) as { job_id: string };
  if (!job_id) {
    return NextResponse.json({ error: "job_id required" }, { status: 400 });
  }

  const db = getServiceClient();

  // Fetch the job
  const { data: job, error: jobErr } = await db
    .from("generation_jobs")
    .select("*")
    .eq("id", job_id)
    .single();

  if (jobErr || !job) {
    console.error("[process] Job not found:", job_id);
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  // Mark as processing
  await db
    .from("generation_jobs")
    .update({ status: "processing", updated_at: new Date().toISOString() })
    .eq("id", job_id);

  const modelKey: ModelKey = job.model
    ? migrateModelKey(job.model)
    : getDefaultModel();
  const batchPlan = buildBatchPlan(job.test_case_count);
  const allAreaNames = [...new Set(batchPlan.map((b) => b.area.name))];

  try {
    // Run batches with a small stagger to avoid hitting Anthropic's
    // tokens-per-minute limit when all requests fire simultaneously.
    const STAGGER_MS = 500;
    const batchResults = await Promise.allSettled(
      batchPlan.map(({ batchIndex, count, area }) =>
        new Promise<GeneratedTestCase[]>((resolve) =>
          setTimeout(
            () =>
              resolve(
                callLLM(
                  modelKey,
                  buildPrompt({
                    requirements: job.requirements,
                    count,
                    area,
                    batchIndex,
                    totalBatches: batchPlan.length,
                    allAreaNames,
                    application_url: job.application_url ?? undefined,
                    template: job.template ?? undefined,
                  }),
                  count,
                ),
              ),
            batchIndex * STAGGER_MS,
          ),
        )
          .then((cases) => ({ batchIndex, area: area.name, cases }))
          .catch((err) => {
            console.error(
              `[process] Batch ${batchIndex + 1} (${area.name}) failed:`,
              err,
            );
            return {
              batchIndex,
              area: area.name,
              cases: [] as GeneratedTestCase[],
            };
          }),
      ),
    );

    // Flatten results
    const allCases: GeneratedTestCase[] = [];
    let failedBatches = 0;
    for (const result of batchResults) {
      if (result.status === "fulfilled") {
        if (result.value.cases.length === 0) failedBatches++;
        allCases.push(...result.value.cases);
      } else {
        failedBatches++;
      }
    }

    if (allCases.length === 0) {
      await db
        .from("generation_jobs")
        .update({
          status: "failed",
          error:
            "All LLM batches returned empty. This is usually caused by rate limiting or a provider outage.",
          updated_at: new Date().toISOString(),
        })
        .eq("id", job_id);

      return NextResponse.json({ success: false, error: "No cases generated" });
    }

    // Save test cases
    const rows = allCases.slice(0, job.test_case_count).map((tc) => ({
      generation_id: job.generation_id,
      requirement_id: job.requirement_id || null,
      project_id: job.project_id || null,
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

    const { data: savedCases, error: tcError } = await db
      .from("test_cases")
      .insert(rows)
      .select("id");

    if (tcError || !savedCases) {
      console.error("[process] DB save failed:", tcError?.message);
      await db
        .from("generation_jobs")
        .update({
          status: "failed",
          error: `Failed to save test cases: ${tcError?.message ?? "unknown error"}`,
          updated_at: new Date().toISOString(),
        })
        .eq("id", job_id);

      return NextResponse.json({ success: false, error: "DB save failed" });
    }

    // Mark job complete
    const partial = failedBatches > 0;
    await db
      .from("generation_jobs")
      .update({
        status: "complete",
        cases_saved: savedCases.length,
        partial,
        error: partial
          ? `${failedBatches} of ${batchPlan.length} batches failed — ${savedCases.length} of ${job.test_case_count} cases generated.`
          : null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", job_id);

    await recordSuccessfulGeneration(job.user_id, savedCases.length).catch(
      () => {},
    );

    return NextResponse.json({
      success: true,
      cases_saved: savedCases.length,
      partial,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error";
    console.error("[process] Unexpected error:", message);

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
