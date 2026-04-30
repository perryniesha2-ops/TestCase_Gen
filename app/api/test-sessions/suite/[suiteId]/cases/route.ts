// app/api/test-sessions/suite/[suiteId]/cases/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ─── GET /api/test-sessions/suite/[suiteId]/cases ────────────────────────────
// Returns all suite items with their test case data (regular + platform),
// normalised to a consistent shape the component can use directly.

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ suiteId: string }> },
) {
  const { suiteId } = await ctx.params;

  const supabase = await createClient();
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();
  if (authErr || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify suite belongs to user
  const { data: suite } = await supabase
    .from("suites")
    .select("id")
    .eq("id", suiteId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!suite) {
    return NextResponse.json({ error: "Suite not found" }, { status: 404 });
  }

  // Fetch suite item links
  const { data: suiteLinks, error: linksError } = await supabase
    .from("suite_items")
    .select(
      "id, test_case_id, platform_test_case_id, sequence_order, priority, estimated_duration_minutes",
    )
    .eq("suite_id", suiteId)
    .order("sequence_order");

  if (linksError) {
    return NextResponse.json({ error: linksError.message }, { status: 500 });
  }
  if (!suiteLinks || suiteLinks.length === 0) {
    return NextResponse.json({ cases: [] });
  }

  const regularIds = suiteLinks
    .filter((l) => l.test_case_id)
    .map((l) => l.test_case_id as string);

  const platformIds = suiteLinks
    .filter((l) => l.platform_test_case_id)
    .map((l) => l.platform_test_case_id as string);

  // Fetch both in parallel
  const [regularRes, platformRes] = await Promise.all([
    regularIds.length > 0
      ? supabase
          .from("test_cases")
          .select(
            "id, title, description, test_type, test_steps, expected_result",
          )
          .in("id", regularIds)
      : Promise.resolve({ data: [], error: null }),
    platformIds.length > 0
      ? supabase
          .from("platform_test_cases")
          .select("id, title, description, platform, steps, expected_results")
          .in("id", platformIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (regularRes.error) {
    return NextResponse.json(
      { error: regularRes.error.message },
      { status: 500 },
    );
  }
  if (platformRes.error) {
    return NextResponse.json(
      { error: platformRes.error.message },
      { status: 500 },
    );
  }

  // Build lookup map
  const testCaseMap = new Map<string, any>();
  for (const tc of regularRes.data ?? []) {
    testCaseMap.set(tc.id, { ...tc, _type: "regular" });
  }
  for (const tc of platformRes.data ?? []) {
    // Normalise platform test case to same shape as regular
    const steps: string[] = tc.steps ?? [];
    const expectedResults: string[] = Array.isArray(tc.expected_results)
      ? tc.expected_results
      : [];

    testCaseMap.set(tc.id, {
      id: tc.id,
      title: tc.title,
      description: tc.description,
      test_type: tc.platform || "cross-platform",
      test_steps: steps.map((step, idx) => ({
        step_number: idx + 1,
        action: step,
        expected: expectedResults[idx] ?? "",
      })),
      expected_result: expectedResults.join("\n") || "",
      _type: "cross-platform",
    });
  }

  // Build normalised suite case list
  const cases = suiteLinks
    .map((link) => {
      const testCaseId = link.test_case_id || link.platform_test_case_id;
      const testCase = testCaseMap.get(testCaseId);
      if (!testCase) return null;

      // Normalise test_steps in case it's stored as JSON string
      let normalizedSteps = testCase.test_steps ?? [];
      if (typeof normalizedSteps === "string") {
        try {
          normalizedSteps = JSON.parse(normalizedSteps);
        } catch {
          normalizedSteps = [];
        }
      } else if (!Array.isArray(normalizedSteps)) {
        normalizedSteps = Object.values(normalizedSteps);
      }

      return {
        id: link.id,
        test_case_id: link.test_case_id ?? null,
        platform_test_case_id: link.platform_test_case_id ?? null,
        sequence_order: link.sequence_order,
        priority: link.priority,
        estimated_duration_minutes: link.estimated_duration_minutes,
        test_cases: { ...testCase, test_steps: normalizedSteps },
      };
    })
    .filter(Boolean);

  return NextResponse.json({ cases });
}
