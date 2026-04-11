import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(
  req: Request,
  context: { params: Promise<{ reportId: string }> | { reportId: string } },
) {
  try {
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

    const { data: report, error: reportErr } = await supabase
      .from("reports")
      .select("id, name")
      .eq("id", reportId)
      .eq("user_id", user.id)
      .single();

    if (reportErr || !report) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const cookieHeader = req.headers.get("cookie") ?? "";
    const isLocal = process.env.NODE_ENV === "development";

    let browser;

    if (isLocal) {
      // Local: use full puppeteer with bundled Chrome
      const puppeteer = await import("puppeteer");
      browser = await puppeteer.default.launch({
        headless: true,
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
        ],
      });
    } else {
      // Production/Vercel: use sparticuz chromium
      const chromium = await import("@sparticuz/chromium");
      const puppeteer = await import("puppeteer-core");
      browser = await puppeteer.default.launch({
        args: chromium.default.args,
        executablePath: await chromium.default.executablePath(),
        headless: true,
      });
    }

    try {
      const page = await browser.newPage();

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
      await page.goto(`${appUrl}/reports/${reportId}/print`, {
        waitUntil: "networkidle0",
        timeout: 45_000,
      });

      await new Promise((resolve) => setTimeout(resolve, 2000));

      const pdf = await page.pdf({
        format: "A4",
        printBackground: true,
        margin: { top: "16mm", bottom: "16mm", left: "16mm", right: "16mm" },
      });

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
