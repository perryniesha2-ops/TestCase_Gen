// app/api/reports/[reportId]/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function getReportId(context: {
  params: Promise<{ reportId: string }> | { reportId: string };
}) {
  const resolved =
    typeof (context.params as any)?.then === "function"
      ? await (context.params as Promise<{ reportId: string }>)
      : (context.params as { reportId: string });
  return resolved.reportId;
}

export async function GET(
  req: Request,
  context: { params: Promise<{ reportId: string }> | { reportId: string } },
) {
  const supabase = await createClient();
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();
  if (userErr || !user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const reportId = await getReportId(context);

  const { data, error } = await supabase
    .from("reports")
    .select("id, name, config, updated_at")
    .eq("id", reportId)
    .eq("user_id", user.id)
    .single();

  if (error || !data)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  // ← wrap in { report } so ReportViewer can do payload.report
  return NextResponse.json({ report: data });
}

export async function PATCH(
  req: Request,
  context: { params: Promise<{ reportId: string }> | { reportId: string } },
) {
  const supabase = await createClient();
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();
  if (userErr || !user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const reportId = await getReportId(context);
  const body = await req.json();

  const { data, error } = await supabase
    .from("reports")
    .update({ ...body, updated_at: new Date().toISOString() })
    .eq("id", reportId)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ report: data });
}

export async function DELETE(
  req: Request,
  context: { params: Promise<{ reportId: string }> | { reportId: string } },
) {
  const supabase = await createClient();
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();
  if (userErr || !user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const reportId = await getReportId(context);

  const { error } = await supabase
    .from("reports")
    .delete()
    .eq("id", reportId)
    .eq("user_id", user.id);

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
