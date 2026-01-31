// app/api/suites/[suiteId]/metadata/route.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ suiteId: string }> },
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ✅ CRITICAL: Await params in Next.js 15+
    const params = await context.params;
    const suiteId = params.suiteId;

    console.log("📋 Metadata request for suite:", suiteId, "by user:", user.id);

    // 1. Get suite kind
    const { data: suite, error: suiteError } = await supabase
      .from("suites")
      .select("id, kind, user_id")
      .eq("id", suiteId)
      .eq("user_id", user.id)
      .single();

    console.log("📊 Suite query result:", {
      found: !!suite,
      error: suiteError?.message,
      kind: suite?.kind,
    });

    if (suiteError || !suite) {
      console.error("❌ Suite not found:", {
        suiteId,
        userId: user.id,
        error: suiteError?.message,
      });
      return NextResponse.json({ error: "Suite not found" }, { status: 404 });
    }

    // 2. If cross-platform, get platforms from platform_test_cases
    let platforms: string[] = [];

    if (suite.kind === "cross-platform") {
      const { data: platformCases, error: platformError } = await supabase
        .from("suite_items")
        .select(
          `
          platform_test_case_id,
          platform_test_cases:platform_test_case_id(platform)
        `,
        )
        .eq("suite_id", suiteId)
        .not("platform_test_case_id", "is", null);

      console.log("📊 Platform cases query result:", {
        count: platformCases?.length || 0,
        error: platformError?.message,
        sample: platformCases?.[0],
      });

      if (platformError) {
        console.error("❌ Error fetching platforms:", platformError);
      } else if (platformCases && platformCases.length > 0) {
        const platformSet = new Set<string>();

        platformCases.forEach((item: any) => {
          // Handle both array and object responses
          const platformData = Array.isArray(item.platform_test_cases)
            ? item.platform_test_cases[0]
            : item.platform_test_cases;

          if (platformData?.platform) {
            platformSet.add(platformData.platform);
          }
        });

        platforms = Array.from(platformSet);
        console.log("✅ Unique platforms detected:", platforms);
      }
    }

    console.log("✅ Returning metadata:", {
      kind: suite.kind,
      platforms,
    });

    return NextResponse.json({
      kind: suite.kind || "regular",
      platforms,
    });
  } catch (error) {
    console.error("❌ Metadata endpoint error:", error);
    return NextResponse.json(
      { error: "Failed to fetch metadata" },
      { status: 500 },
    );
  }
}
