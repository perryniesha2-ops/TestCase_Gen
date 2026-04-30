// app/api/jobs/[jobId]/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ─── GET /api/jobs/[jobId] ────────────────────────────────────────────────────
// Polled by the client every 3 seconds after submitting a generation request.
// Returns the current job status, cases_saved count, and generation_id on completion.
// Also detects stuck jobs (processing > 5 min) and surfaces them as failed.

const STUCK_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ jobId: string }> },
) {
  const { jobId } = await ctx.params;

  const supabase = await createClient();
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();
  if (authErr || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: job, error } = await supabase
    .from("generation_jobs")
    .select(
      "id, status, cases_saved, cases_requested, generation_id, partial, error, updated_at, created_at, completed_areas, failed_areas, job_type",
    )
    .eq("id", jobId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  // Detect stuck jobs — if still "processing" after 5 minutes, treat as failed
  let status = job.status;
  if (status === "processing") {
    const updatedAt = new Date(job.updated_at).getTime();
    if (Date.now() - updatedAt > STUCK_THRESHOLD_MS) {
      status = "failed";
      // Update the row so future polls don't repeat this check
      await supabase
        .from("generation_jobs")
        .update({
          status: "failed",
          error: "Processing timed out. Please try again.",
          updated_at: new Date().toISOString(),
        })
        .eq("id", jobId);
    }
  }

  return NextResponse.json({
    job_id: job.id,
    status,
    cases_saved: job.cases_saved ?? 0,
    cases_requested: job.cases_requested,
    generation_id: job.generation_id,
    partial: job.partial ?? false,
    error: job.error ?? null,
    completed_areas: job.completed_areas ?? [],
    failed_areas: job.failed_areas ?? [],
    job_type: job.job_type ?? "regular",
  });
}
