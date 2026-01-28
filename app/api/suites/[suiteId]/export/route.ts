// app/api/suites/[suiteId]/export/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { resolveSuiteKind } from "@/lib/suites/resolve-suite";
import type { ExportFormat } from "@/lib/exports/export-strategy";

// Import all exporters
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

export async function GET(
  req: Request,
  { params }: { params: Promise<{ suiteId: string }> },
) {
  const { suiteId } = await params;
  const url = new URL(req.url);
  const format = url.searchParams.get("format") as ExportFormat;
  const platform = url.searchParams.get("platform"); // For cross-platform suites

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
    let result: { content: string; filename: string; mimeType: string };

    // Route to appropriate exporter
    if (resolved.kind === "regular") {
      result = await exportRegularSuite(supabase, suiteId, format);
    } else {
      // Cross-platform suite
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
      );
    }

    return new NextResponse(result.content, {
      status: 200,
      headers: {
        "Content-Type": result.mimeType,
        "Content-Disposition": `attachment; filename="${result.filename}"`,
      },
    });
  } catch (error) {
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
) {
  // Load regular suite data
  const { data: suite } = await supabase
    .from("test_suites")
    .select("name")
    .eq("id", suiteId)
    .single();

  const { data: rows } = await supabase
    .from("test_suite_cases")
    .select(
      `
      test_cases (
        id, title, description, test_type, priority,
        preconditions, test_steps, expected_result,
        is_edge_case, is_negative_test, is_security_test,
        is_boundary_test, tags
      )
    `,
    )
    .eq("suite_id", suiteId)
    .order("sequence_order", { ascending: true });

  const testCases = rows?.map((r: any) => r.test_cases).filter(Boolean);

  // Use existing conversion logic (from your ExportButton component)
  // Return { content, filename, mimeType }

  // For now, just return a placeholder
  return {
    content: JSON.stringify(testCases, null, 2),
    filename: `${suite?.name || "suite"}-${format}.json`,
    mimeType: "application/json",
  };
}

async function exportCrossPlatformSuite(
  supabase: any,
  suiteId: string,
  platform: string,
  format: ExportFormat,
) {
  const { data: suite } = await supabase
    .from("cross_platform_test_suites")
    .select("requirement")
    .eq("id", suiteId)
    .single();

  const { data: testCases } = await supabase
    .from("platform_test_cases")
    .select("*")
    .eq("suite_id", suiteId)
    .eq("platform", platform)
    .order("created_at", { ascending: true });

  if (!testCases || testCases.length === 0) {
    throw new Error(`No test cases found for platform: ${platform}`);
  }

  const suiteName = suite?.requirement?.slice(0, 80) || `Suite ${suiteId}`;

  // Route to platform-specific exporter
  switch (platform) {
    case "api":
      return exportApiCases(testCases, suiteName, format);
    case "web":
      return exportWebCases(testCases, suiteName, format);
    case "mobile":
      return exportMobileCases(testCases, suiteName, format);
    case "performance":
      return exportPerformanceCases(testCases, suiteName, format);
    case "accessibility":
      return exportAccessibilityCases(testCases, suiteName, format);
    default:
      throw new Error(`Unsupported platform: ${platform}`);
  }
}

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

// Add to your main export route
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
