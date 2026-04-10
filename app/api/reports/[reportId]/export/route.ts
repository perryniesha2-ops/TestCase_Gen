import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import puppeteer from "puppeteer";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(
  req: Request,
  context: { params: Promise<{ reportId: string }> | { reportId: string } },
) {
  const resolvedParams =
    typeof (context.params as any)?.then === "function"
      ? await (context.params as Promise<{ reportId: string }>)
      : (context.params as { reportId: string });

  const reportId = resolvedParams.reportId;
  console.log("[export] reportId:", reportId);
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify the report belongs to the user
    const { data: report, error: reportErr } = await supabase
      .from("reports")
      .select("id, name")
      .eq("id", reportId)
      .eq("user_id", user.id)
      .single();

    if (reportErr || !report) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    // Get the app URL — the print page needs auth cookies passed through
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    // Extract auth cookie from incoming request to pass to Puppeteer
    const cookieHeader = req.headers.get("cookie") ?? "";

    const browser = await puppeteer.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
      ],
    });

    try {
      const page = await browser.newPage();

      // Forward auth cookies so the print page can authenticate
      if (cookieHeader) {
        const cookies = cookieHeader.split(";").map((c) => {
          const [name, ...rest] = c.trim().split("=");
          return {
            name: name.trim(),
            value: rest.join("=").trim(),
            domain: new URL(appUrl).hostname,
          };
        });
        await page.setCookie(...(cookies as any[]));
      }

      await page.setViewport({ width: 1200, height: 900 });

      // Navigate to the print-optimised report page
      await page.goto(`${appUrl}/reports/${reportId}/print`, {
        waitUntil: "networkidle0",
        timeout: 45_000,
      });

      // Wait for charts to finish rendering (waitForTimeout removed in newer Puppeteer)
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const pdf = await page.pdf({
        format: "A4",
        printBackground: true,
        margin: { top: "16mm", bottom: "16mm", left: "16mm", right: "16mm" },
      });

      // Convert to Uint8Array — Buffer is not assignable to Response BodyInit
      const pdfUint8 = new Uint8Array(
        Buffer.isBuffer(pdf) ? pdf : Buffer.from(pdf),
      );

      return new Response(pdfUint8, {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${report.name.replace(/\s+/g, "-")}.pdf"`,
          "Cache-Control": "no-store",
        },
      });
    } finally {
      await browser.close();
    }
  } catch (e: any) {
    console.error("[reports/export]", e);
    return NextResponse.json(
      { error: e?.message || "Export failed" },
      { status: 500 },
    );
  }
}
