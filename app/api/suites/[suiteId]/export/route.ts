// app/api/suites/[suiteId]/export/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { resolveSuiteKind } from "@/lib/suites/resolve-suite";
import type { ExportFormat } from "@/lib/exports/export-strategy";

// Import exporters
import { exportToPostman } from "@/lib/exports/api/postman";
import { exportToKarate } from "@/lib/exports/api/karate";
import { exportToSelenium } from "@/lib/exports/web/selenium";
import { exportToPlaywright } from "@/lib/exports/web/playwright";
import { exportToJMeter } from "@/lib/exports/performance/jmeter";
import { exportToK6 } from "@/lib/exports/performance/k6";
import { exportToOpenAPI } from "@/lib/exports/api/openapi";
import { exportToInsomnia } from "@/lib/exports/api/insomnia";
import { exportToCypress } from "@/lib/exports/web/cypress";
import { exportToAppium } from "@/lib/exports/mobile/appium";
import { exportToMaestro } from "@/lib/exports/mobile/maestro";
import { exportToXCUITest } from "@/lib/exports/mobile/xcuitest";
import { exportToEspresso } from "@/lib/exports/mobile/espresso";
import { exportToAxe } from "@/lib/exports/accessibility/axe";
import { exportToPa11y } from "@/lib/exports/accessibility/pa11y";
import { exportToWAVE } from "@/lib/exports/accessibility/wave";
import { exportToGatling } from "@/lib/exports/performance/gatling";
import { exportToLocust } from "@/lib/exports/performance/locust";

export const runtime = "nodejs";

function safeSlug(input: string) {
  return String(input || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80);
}

type ExportResult = { content: string; filename: string; mimeType: string };

export async function GET(
  req: Request,
  context: { params: Promise<{ suiteId: string }> },
) {
  const params = await context.params;
  const suiteId = params.suiteId;
  const url = new URL(req.url);

  const format = url.searchParams.get("format") as ExportFormat | null;
  const platform = url.searchParams.get("platform")?.trim() || null;

  if (!format) {
    return NextResponse.json(
      { error: "Format parameter required" },
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

  try {
    let result: ExportResult;

    if (resolved.kind === "regular") {
      result = await exportRegularSuite(supabase, suiteId, format, user.id);
    } else {
      if (!platform) {
        return NextResponse.json(
          { error: "Platform parameter required for cross-platform suites" },
          { status: 400 },
        );
      }
      result = await exportCrossPlatformSuite(
        supabase,
        suiteId,
        platform,
        format,
        user.id,
      );
    }

    return new NextResponse(result.content, {
      status: 200,
      headers: {
        "Content-Type": result.mimeType,
        "Content-Disposition": `attachment; filename="${result.filename}"`,
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("❌ Export failed:", error);
    return NextResponse.json(
      {
        error: "Export failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

async function exportRegularSuite(
  supabase: any,
  suiteId: string,
  format: ExportFormat,
  userId: string,
): Promise<ExportResult> {
  // Get suite info
  const { data: suite, error: suiteErr } = await supabase
    .from("suites")
    .select("id, name, user_id")
    .eq("id", suiteId)
    .eq("user_id", userId)
    .single();

  if (suiteErr || !suite) {
    throw new Error(suiteErr?.message || "Suite not found");
  }

  // Get test cases via suite_items
  const { data: rows, error: rowsErr } = await supabase
    .from("suite_items")
    .select(
      `
      sequence_order,
      test_cases (
        id, title, description, test_type, priority,
        preconditions, test_steps, expected_result,
        is_edge_case, is_negative_test, is_security_test,
        is_boundary_test
      )
    `,
    )
    .eq("suite_id", suiteId)
    .not("test_case_id", "is", null)
    .order("sequence_order", { ascending: true });

  if (rowsErr) throw new Error(rowsErr.message);

  const ordered = (rows ?? [])
    .map((r: any) => {
      const tc = Array.isArray(r.test_cases) ? r.test_cases[0] : r.test_cases;
      if (!tc) return null;
      return { seq: r.sequence_order ?? 0, tc };
    })
    .filter(Boolean)
    .sort((a: any, b: any) => (a.seq ?? 0) - (b.seq ?? 0))
    .map((x: any) => x.tc);

  const suiteName = safeSlug(suite.name || "suite");

  return {
    content: JSON.stringify(ordered, null, 2),
    filename: `${suiteName}-${format}.json`,
    mimeType: "application/json",
  };
}

async function exportCrossPlatformSuite(
  supabase: any,
  suiteId: string,
  platform: string,
  format: ExportFormat,
  userId: string,
): Promise<ExportResult> {
  // Get suite info
  const { data: suite, error: suiteErr } = await supabase
    .from("suites")
    .select("id, name, user_id, kind")
    .eq("id", suiteId)
    .eq("user_id", userId)
    .single();

  if (suiteErr || !suite) {
    throw new Error(suiteErr?.message || "Suite not found");
  }

  const { data: rows, error: fetchError } = await supabase
    .from("suite_items")
    .select(
      `
      sequence_order,
      platform_test_case_id,
      platform_test_cases:platform_test_case_id (
        id,
        title,
        description,
        platform,
        framework,
        priority,
        preconditions,
        steps,
        expected_results,
        automation_hints,
        automation_metadata,
        status,
        created_at
      )
    `,
    )
    .eq("suite_id", suiteId)
    .not("platform_test_case_id", "is", null)
    .order("sequence_order", { ascending: true });

  if (fetchError) {
    console.error("❌ Database fetch error:", fetchError);
    throw new Error(`Failed to fetch test cases: ${fetchError.message}`);
  }

  // Extract and filter by platform
  const allCases = (rows ?? [])
    .map((r: any, index: number) => {
      const tc = Array.isArray(r.platform_test_cases)
        ? r.platform_test_cases[0]
        : r.platform_test_cases;

      if (!tc) return null;
      return { seq: r.sequence_order ?? 0, tc };
    })
    .filter(Boolean);

  // Filter by platform
  const platformCases = allCases
    .filter((item: any) => {
      const matches = item.tc.platform === platform;

      return matches;
    })
    .sort((a: any, b: any) => (a.seq ?? 0) - (b.seq ?? 0))
    .map((x: any) => x.tc);

  if (platformCases.length === 0) {
    console.error("❌ No test cases found after filtering:", {
      suiteId,
      platform,
      allCasesCount: allCases.length,
      availablePlatforms: [...new Set(allCases.map((c: any) => c.tc.platform))],
    });
    throw new Error(
      `No test cases found for platform: ${platform}. ` +
        `Available platforms: ${[...new Set(allCases.map((c: any) => c.tc.platform))].join(", ")}`,
    );
  }

  const suiteName = safeSlug(suite.name || `suite-${suiteId.slice(0, 8)}`);

  switch (platform) {
    case "api":
      return exportApiCases(platformCases, suiteName, format);
    case "web":
      return exportWebCases(platformCases, suiteName, format);
    case "mobile":
      return exportMobileCases(platformCases, suiteName, format);
    case "performance":
      return exportPerformanceCases(platformCases, suiteName, format);
    case "accessibility":
      return exportAccessibilityCases(platformCases, suiteName, format);
    default:
      throw new Error(`Unsupported platform: ${platform}`);
  }
}
// Keep all your existing export helper functions
function exportApiCases(
  testCases: any[],
  suiteName: string,
  format: ExportFormat,
) {
  switch (format) {
    case "postman":
      return exportToPostman(testCases, suiteName);
    case "karate":
      return exportToKarate(testCases, suiteName);
    case "openapi":
      return exportToOpenAPI(testCases, suiteName);
    case "insomnia":
      return exportToInsomnia(testCases, suiteName);
    default:
      throw new Error(`Unsupported API format: ${format}`);
  }
}

function exportWebCases(
  testCases: any[],
  suiteName: string,
  format: ExportFormat,
) {
  switch (format) {
    case "selenium":
      return exportToSelenium(testCases, suiteName);
    case "playwright":
      return exportToPlaywright(testCases, suiteName);
    case "cypress":
      return exportToCypress(testCases, suiteName);
    default:
      throw new Error(`Unsupported web format: ${format}`);
  }
}

function exportMobileCases(
  testCases: any[],
  suiteName: string,
  format: ExportFormat,
) {
  switch (format) {
    case "appium":
      return exportToAppium(testCases, suiteName);
    case "maestro":
      return exportToMaestro(testCases, suiteName);
    case "xcuitest":
      return exportToXCUITest(testCases, suiteName);
    case "espresso":
      return exportToEspresso(testCases, suiteName);
    default:
      throw new Error(`Unsupported mobile format: ${format}`);
  }
}

function exportAccessibilityCases(
  testCases: any[],
  suiteName: string,
  format: ExportFormat,
) {
  switch (format) {
    case "axe":
      return exportToAxe(testCases, suiteName);
    case "pa11y":
      return exportToPa11y(testCases, suiteName);
    case "wave-config":
      return exportToWAVE(testCases, suiteName);
    default:
      throw new Error(`Unsupported accessibility format: ${format}`);
  }
}

function exportPerformanceCases(
  testCases: any[],
  suiteName: string,
  format: ExportFormat,
) {
  switch (format) {
    case "jmeter":
      return exportToJMeter(testCases, suiteName);
    case "k6":
      return exportToK6(testCases, suiteName);
    case "gatling":
      return exportToGatling(testCases, suiteName);
    case "locust":
      return exportToLocust(testCases, suiteName);
    default:
      throw new Error(`Unsupported performance format: ${format}`);
  }
}
