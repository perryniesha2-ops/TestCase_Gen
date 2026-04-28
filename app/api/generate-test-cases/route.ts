// app/api/generate-test-cases/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  checkUsageQuota,
  recordSuccessfulGeneration,
  UsageQuotaError,
} from "@/lib/usage-tracker";
import {
  getModelId,
  isAnthropicModel,
  getDefaultModel,
  isModelAllowed,
  migrateModelKey,
  type ModelKey,
  AI_MODELS,
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

interface RequestBody {
  requirements?: string;
  requirement_id?: string;
  project_id?: string | null;
  model?: string;
  testCaseCount?: number | string;
  template?: string;
  title?: string;
  description?: string | null;
  application_url?: string;
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as RequestBody;
  const requirements = (body.requirements ?? "").trim();
  const requirement_id = body.requirement_id || null;
  const project_id = body.project_id || null;
  const rawModelKey = String(body.model ?? "").trim();
  const modelKey: ModelKey = rawModelKey
    ? migrateModelKey(rawModelKey)
    : getDefaultModel();
  const title = (body.title ?? "").trim();
  const description = body.description ?? null;
  const application_url = (body.application_url ?? "").trim();
  const template = body.template ?? "";
  const testCaseCount = Math.min(
    20,
    Math.max(1, Number(body.testCaseCount ?? 10)),
  );

  if (!isModelAllowed(modelKey)) {
    return NextResponse.json(
      { error: "Unsupported AI model" },
      { status: 400 },
    );
  }
  if (!requirements) {
    return NextResponse.json(
      { error: "Requirements are required" },
      { status: 400 },
    );
  }
  if (!title) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }

  try {
    await checkUsageQuota(user.id, testCaseCount);
  } catch (e) {
    if (e instanceof UsageQuotaError) {
      return NextResponse.json(
        {
          error: e.message,
          remaining: e.remaining,
          requested: e.requested,
          used: e.used,
          limit: e.limit,
          upgradeRequired: true,
        },
        { status: 429 },
      );
    }
    return NextResponse.json(
      { error: "Usage check failed", upgradeRequired: true },
      { status: 429 },
    );
  }

  const batchPlan = buildBatchPlan(testCaseCount);
  const allAreaNames = [...new Set(batchPlan.map((b) => b.area.name))];

  // ── Wave 1: all batches in parallel ───────────────────────────────────────
  // Fastest path — all batches fire simultaneously. Each is capped at 6 cases
  // with a generous token budget so truncation is extremely unlikely.
  const wave1 = await Promise.allSettled(
    batchPlan.map(async (batch) => {
      const cases = await callLLM(
        modelKey,
        buildPrompt({
          requirements,
          count: batch.count, // oversampled count
          area: batch.area,
          batchIndex: batch.batchIndex,
          totalBatches: batchPlan.length,
          allAreaNames,
          application_url: application_url || undefined,
          template: template || undefined,
        }),
        batch.count,
      );
      return { batch, cases };
    }),
  );

  // Collect results — separate successes from failures
  const allCases: GeneratedTestCase[] = [];
  const failedBatches: typeof batchPlan = [];

  for (let i = 0; i < wave1.length; i++) {
    const result = wave1[i];
    const batch = batchPlan[i];

    if (result.status === "fulfilled" && result.value.cases.length > 0) {
      // Trim back to targetCount — we asked for extra, keep only what we need
      allCases.push(...result.value.cases.slice(0, batch.targetCount));
    } else {
      console.warn(
        `[gen] Wave 1 batch ${batch.batchIndex + 1} (${batch.area.name}) failed — scheduling retry`,
      );
      failedBatches.push(batch);
    }
  }

  // ── Wave 2: sequential retry of only the batches that failed ──────────────
  // By the time wave 1 finishes (~25s), any rate limiting has had time to
  // recover. Retrying only failed batches keeps total time reasonable.
  for (const batch of failedBatches) {
    console.log(
      `[gen] Retrying batch ${batch.batchIndex + 1} (${batch.area.name})…`,
    );
    try {
      const cases = await callLLM(
        modelKey,
        buildPrompt({
          requirements,
          count: batch.count,
          area: batch.area,
          batchIndex: batch.batchIndex,
          totalBatches: batchPlan.length,
          allAreaNames,
          application_url: application_url || undefined,
          template: template || undefined,
        }),
        batch.count,
      );
      if (cases.length > 0) {
        allCases.push(...cases.slice(0, batch.targetCount));
        console.log(
          `[gen] Retry succeeded for ${batch.area.name} — got ${cases.length} cases`,
        );
      } else {
        console.error(`[gen] Retry also failed for ${batch.area.name}`);
      }
    } catch (err) {
      console.error(
        `[gen] Retry threw for ${batch.area.name}:`,
        (err as Error)?.message,
      );
    }
  }

  if (allCases.length === 0) {
    return NextResponse.json(
      {
        error:
          "Generation failed — the AI provider may be busy. Please try again in a moment.",
      },
      { status: 503 },
    );
  }

  // ── Save ──────────────────────────────────────────────────────────────────
  const { data: generation, error: genError } = await supabase
    .from("test_case_generations")
    .insert({
      user_id: user.id,
      title,
      description,
      ai_provider: isAnthropicModel(modelKey) ? "anthropic" : "openai",
      ai_model: getModelId(modelKey),
      prompt_used: `${testCaseCount} cases across ${batchPlan.length} coverage areas`,
    })
    .select()
    .single();

  if (genError || !generation) {
    return NextResponse.json(
      { error: "Failed to save generation" },
      { status: 500 },
    );
  }

  const rows = allCases.slice(0, testCaseCount).map((tc) => ({
    generation_id: generation.id,
    requirement_id,
    project_id,
    user_id: user.id,
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

  const { data: savedCases, error: tcError } = await supabase
    .from("test_cases")
    .insert(rows)
    .select();

  if (tcError || !savedCases) {
    console.error("[gen] DB save failed:", tcError?.message);
    return NextResponse.json(
      { error: "Failed to save test cases" },
      { status: 500 },
    );
  }

  await recordSuccessfulGeneration(user.id, savedCases.length).catch(() => {});

  return NextResponse.json({
    success: true,
    generation_id: generation.id,
    count: savedCases.length,
    requested_count: testCaseCount,
    statistics: {
      total: savedCases.length,
      negative: savedCases.filter((tc) => tc.is_negative_test).length,
      security: savedCases.filter((tc) => tc.is_security_test).length,
      boundary: savedCases.filter((tc) => tc.is_boundary_test).length,
      edge: savedCases.filter((tc) => tc.is_edge_case).length,
    },
  });
}

export async function GET() {
  return NextResponse.json({
    models: AI_MODELS,
    defaultModel: getDefaultModel(),
  });
}
