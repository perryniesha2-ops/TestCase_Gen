// app/api/suites/[suiteId]/metadata/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ suiteId: string }> },
) {
  const { suiteId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check cross-platform suites first
  const { data: crossPlatformSuite } = await supabase
    .from("cross_platform_test_suites")
    .select("id, platforms")
    .eq("id", suiteId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (crossPlatformSuite) {
    console.log("✅ Found cross-platform suite:", {
      id: crossPlatformSuite.id,
      platforms: crossPlatformSuite.platforms,
    });

    return NextResponse.json({
      kind: "cross-platform",
      platforms: crossPlatformSuite.platforms || [],
    });
  }

  // Check regular suites
  const { data: regularSuite } = await supabase
    .from("test_suites")
    .select("id")
    .eq("id", suiteId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (regularSuite) {
    console.log("✅ Found regular suite:", regularSuite.id);

    return NextResponse.json({
      kind: "regular",
      platforms: [],
    });
  }

  console.log("❌ Suite not found:", suiteId);
  return NextResponse.json({ error: "Suite not found" }, { status: 404 });
}
