// app/api/cross-platform-testing/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkUsageQuota, UsageQuotaError } from "@/lib/usage-tracker";
import {
  getDefaultModel,
  isModelAllowed,
  migrateModelKey,
  type ModelKey,
} from "@/lib/ai-models/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type PlatformConfig =
  | { platform: string; framework: string }
  | {
      platform: "api";
      framework: string;
      protocol?: string;
      auth?: string;
      format?: string;
      contract?: string;
      required_checks?: string[];
    };

type RequestBody = {
  requirement?: string;
  platforms?: PlatformConfig[];
  model?: string;
  testCaseCount?: number | string;
  template?: string;
  title?: string;
  description?: string | null;
  project_id?: string | null;
};

function clampCount(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.floor(Number(n) || 0)));
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as RequestBody;
    const requirement = (body.requirement ?? "").trim();
    const platforms = Array.isArray(body.platforms) ? body.platforms : [];
    const rawModelKey = String(body.model ?? "").trim();
    const modelKey: ModelKey = rawModelKey
      ? migrateModelKey(rawModelKey)
      : getDefaultModel();
    const testCaseCount = clampCount(Number(body.testCaseCount ?? 10), 1, 20);
    const project_id = body.project_id || null;
    const template = (body.template ?? "").trim();
    const title = (body.title ?? "").trim();
    const description = body.description ?? null;

    if (!requirement) {
      return NextResponse.json(
        { error: "Requirement is required", field: "requirement" },
        { status: 400 },
      );
    }
    if (!platforms.length) {
      return NextResponse.json(
        { error: "At least one platform is required", field: "platforms" },
        { status: 400 },
      );
    }
    for (const p of platforms) {
      if (!p?.platform || !p?.framework) {
        return NextResponse.json(
          {
            error: "Each platform must have a framework specified",
            field: "platforms",
          },
          { status: 400 },
        );
      }
    }
    if (!isModelAllowed(modelKey)) {
      return NextResponse.json(
        { error: "Unsupported AI model", field: "model" },
        { status: 400 },
      );
    }

    const requestedTotal = testCaseCount * platforms.length;
    try {
      await checkUsageQuota(user.id, requestedTotal);
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
        {
          error: "Usage limit exceeded",
          upgradeRequired: true,
          remaining: 0,
          requested: requestedTotal,
        },
        { status: 429 },
      );
    }

    const { data: job, error: jobError } = await supabase
      .from("generation_jobs")
      .insert({
        user_id: user.id,
        status: "pending",
        job_type: "cross-platform",
        title:
          title ||
          `Cross-platform: ${platforms.map((p) => p.platform).join(", ")}`,
        description,
        requirements: requirement,
        model: modelKey,
        test_case_count: testCaseCount,
        cases_requested: requestedTotal,
        cases_saved: 0,
        project_id: project_id || null,
        template: template || null,
        platforms: JSON.stringify(platforms),
      })
      .select()
      .single();

    if (jobError || !job) {
      console.error("[cross-platform] Job insert failed:", jobError?.message);
      return NextResponse.json(
        { error: "Failed to create job" },
        { status: 500 },
      );
    }

    const processUrl = new URL(
      "/api/cross-platform-testing/process",
      request.url,
    );
    fetch(processUrl.toString(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: request.headers.get("cookie") ?? "",
        "x-internal-secret": process.env.INTERNAL_API_SECRET ?? "",
      },
      body: JSON.stringify({ job_id: job.id }),
    }).catch((err) => {
      console.error("[cross-platform] Failed to trigger process route:", err);
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
        status: "pending",
        cases_requested: requestedTotal,
      },
      { status: 202 },
    );
  } catch (error) {
    console.error("Cross-platform route error:", error);
    return NextResponse.json(
      {
        error: "Unexpected error. Please try again.",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
