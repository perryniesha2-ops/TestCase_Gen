import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { resolveSuiteKind } from "@/lib/suites/resolve-suite";
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

  const resolved = await resolveSuiteKind(supabase, suiteId, user.id);
  if (!resolved.kind) {
    return NextResponse.json({ error: "Suite not found" }, { status: 404 });
  }

  // ---- REGULAR SUITE: test_suites -> test_suite_cases -> test_cases ----
  if (resolved.kind === "regular") {
    const { data: rows, error } = await supabase
      .from("test_suite_cases")
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
        { error: "Failed to load suite cases", details: error.message },
        { status: 500 },
      );
    }

    const cases = (rows ?? [])
      .map((r: any) =>
        Array.isArray(r.test_cases) ? r.test_cases[0] : r.test_cases,
      )
      .filter(Boolean) as Array<{
      id: string;
      title: string;
      test_type?: string | null;
      automation_metadata?: any;
    }>;

    // Define "API case" for regular suites:
    // - either test_type === "api"
    // - or automation_metadata.api exists
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

  // ---- CROSS-PLATFORM SUITE: platform_test_cases ----
  const { data: apiRows, error: apiErr } = await supabase
    .from("platform_test_cases")
    .select("id, title, automation_metadata")
    .eq("suite_id", suiteId)
    .eq("platform", "api");

  if (apiErr) {
    return NextResponse.json(
      { error: "Failed to load platform cases", details: apiErr.message },
      { status: 500 },
    );
  }

  const apiCasesFound = apiRows?.length ?? 0;
  const apiCasesMissingMetadata = (apiRows ?? []).filter((row: any) => {
    const api = normalizeApiSpec(row?.automation_metadata?.api);
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
