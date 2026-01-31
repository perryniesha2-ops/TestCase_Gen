import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { normalizeApiSpec, isValidApiSpec } from "@/lib/exports/api-normalize";

export const runtime = "nodejs";

function looksLikeUuid(s: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    s,
  );
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ suiteId: string }> },
) {
  const { suiteId } = await params;

  if (!suiteId) {
    return NextResponse.json(
      { error: "Invalid suiteId", suiteId: suiteId ?? null },
      { status: 400 },
    );
  }

  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get the suite with its kind
  const { data: suite, error: suiteError } = await supabase
    .from("suites")
    .select("id, kind, user_id")
    .eq("id", suiteId)
    .single();

  if (suiteError || !suite) {
    return NextResponse.json({ error: "Suite not found" }, { status: 404 });
  }

  // Check authorization
  if (suite.user_id !== user.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ---- REGULAR SUITE ----
  if (suite.kind === "regular") {
    const { data: items, error } = await supabase
      .from("suite_items")
      .select(
        `
        id,
        test_case_id,
        test_cases (
          id,
          title,
          test_type,
          automation_metadata
        )
      `,
      )
      .eq("suite_id", suiteId);

    if (error) {
      return NextResponse.json(
        { error: "Failed to load suite items", details: error.message },
        { status: 500 },
      );
    }

    const cases = (items ?? [])
      .map((item: any) =>
        Array.isArray(item.test_cases) ? item.test_cases[0] : item.test_cases,
      )
      .filter(Boolean) as Array<{
      id: string;
      title: string;
      test_type?: string | null;
      automation_metadata?: any;
    }>;

    const apiCases = cases.filter((tc) => {
      const t = String(tc.test_type ?? "").toLowerCase();
      return t === "api" || !!tc.automation_metadata?.api;
    });

    const apiCasesFound = apiCases.length;
    const apiCasesMissingMetadata = apiCases.filter((tc) => {
      const api = normalizeApiSpec(tc.automation_metadata?.api);
      return !isValidApiSpec(api);
    }).length;

    return NextResponse.json({
      suiteId,
      suiteKind: "regular",
      apiCasesFound,
      apiCasesMissingMetadata,
      readyForPostmanExport: apiCasesFound > 0 && apiCasesMissingMetadata === 0,
    });
  }

  // ---- CROSS-PLATFORM SUITE ----
  if (suite.kind === "cross-platform") {
    const { data: items, error: itemsError } = await supabase
      .from("suite_items")
      .select(
        `
        id,
        platform_test_case_id,
        platform_test_cases (
          id,
          title,
          automation_metadata,
          platform
        )
      `,
      )
      .eq("suite_id", suiteId);

    if (itemsError) {
      return NextResponse.json(
        { error: "Failed to load suite items", details: itemsError.message },
        { status: 500 },
      );
    }

    // Filter for API platform cases
    const apiCases = (items ?? [])
      .map((item: any) =>
        Array.isArray(item.platform_test_cases)
          ? item.platform_test_cases[0]
          : item.platform_test_cases,
      )
      .filter((tc: any) => tc && tc.platform === "api");

    const apiCasesFound = apiCases.length;
    const apiCasesMissingMetadata = apiCases.filter((tc: any) => {
      const api = normalizeApiSpec(tc?.automation_metadata?.api);
      return !isValidApiSpec(api);
    }).length;

    return NextResponse.json({
      suiteId,
      suiteKind: "cross-platform",
      apiCasesFound,
      apiCasesMissingMetadata,
      readyForPostmanExport: apiCasesFound > 0 && apiCasesMissingMetadata === 0,
    });
  }

  // Unknown suite kind
  return NextResponse.json(
    { error: "Unknown suite kind", kind: suite.kind },
    { status: 400 },
  );
}
