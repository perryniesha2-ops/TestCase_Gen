// app/api/reports/[reportId]/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  req: Request,
  context: { params: Promise<{ reportId: string }> | { reportId: string } },
) {
  const supabase = await createClient();
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  if (userErr || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const resolvedParams =
    typeof (context.params as any)?.then === "function"
      ? await (context.params as Promise<{ reportId: string }>)
      : (context.params as { reportId: string });

  const reportId = resolvedParams.reportId;

  const { data, error } = await supabase
    .from("reports")
    .select("id, name, config")
    .eq("id", reportId)
    .eq("user_id", user.id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(data);
}
