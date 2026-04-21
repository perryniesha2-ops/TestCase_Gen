// app/api/generate-test-cases/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkUsageQuota, UsageQuotaError } from "@/lib/usage-tracker";
import {
  getModelId,
  isAnthropicModel,
  getDefaultModel,
  isModelAllowed,
  migrateModelKey,
  type ModelKey,
  AI_MODELS,
} from "@/lib/ai-models/config";
import { buildBatchPlan } from "@/lib/generation/test-case-generation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface RequestBody {
  requirements?: string;
  requirement_id?: string;
  project_id?: string | null;
  model?: string;
  testCaseCount?: number | string;
  testTypes?: string[];
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
    30,
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

  // Check quota before creating the job
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

  // Create the generation record upfront so we have an ID to reference
  const batchPlan = buildBatchPlan(testCaseCount);
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
      { error: "Failed to create generation record" },
      { status: 500 },
    );
  }

  // Create the job row
  const { data: job, error: jobError } = await supabase
    .from("generation_jobs")
    .insert({
      user_id: user.id,
      status: "pending",
      title,
      description,
      requirements,
      model: modelKey,
      test_case_count: testCaseCount,
      cases_requested: testCaseCount,
      cases_saved: 0,
      project_id: project_id || null,
      requirement_id: requirement_id || null,
      application_url: application_url || null,
      template: template || null,
      generation_id: generation.id,
    })
    .select()
    .single();

  if (jobError || !job) {
    await supabase
      .from("test_case_generations")
      .delete()
      .eq("id", generation.id);
    return NextResponse.json(
      { error: "Failed to create job" },
      { status: 500 },
    );
  }

  // Fire-and-forget: trigger the process route without awaiting.
  // The job row tracks state independently so polling works regardless of whether
  // the background fetch gets cut off by Vercel's function lifecycle.
  const processUrl = new URL("/api/generate-test-cases/process", request.url);
  fetch(processUrl.toString(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: request.headers.get("cookie") ?? "",
      "x-internal-secret": process.env.INTERNAL_API_SECRET ?? "",
    },
    body: JSON.stringify({ job_id: job.id }),
  }).catch((err) => {
    console.error("[gen] Failed to trigger process route:", err);
    supabase
      .from("generation_jobs")
      .update({
        status: "failed",
        error: "Failed to start processing",
        updated_at: new Date().toISOString(),
      })
      .eq("id", job.id)
      .then(() => {});
  });

  return NextResponse.json(
    {
      job_id: job.id,
      generation_id: generation.id,
      status: "pending",
      cases_requested: testCaseCount,
    },
    { status: 202 },
  );
}

export async function GET() {
  return NextResponse.json({
    models: AI_MODELS,
    defaultModel: getDefaultModel(),
  });
}
