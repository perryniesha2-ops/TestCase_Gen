// app/api/pdf/route.ts
// Single generic PDF generation endpoint.
// To add a new document type:
//   1. Add its data type + union member to types/pdf.ts
//   2. Create components/pdf/<Type>PDF.tsx
//   3. Import it here and add a case to the switch

import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import React, { type ReactElement } from "react";
import type { DocumentProps } from "@react-pdf/renderer";

import { ReportPDF } from "@/components/reports/reportpdf";
// import { RequirementsPDF } from "@/components/requirements/RequirementsPDF";
// import { AutomationRunPDF } from "@/components/automation/AutomationRunPDF";

import type { PDFRequest } from "@/types/pdf";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  let body: PDFRequest;

  try {
    body = (await req.json()) as PDFRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body?.type || !body?.data || !body?.filename) {
    return NextResponse.json(
      { error: "Missing required fields: type, data, filename" },
      { status: 400 },
    );
  }

  try {
    let element: ReactElement<DocumentProps>;

    switch (body.type) {
      case "report":
        element = React.createElement(ReportPDF, {
          d: body.data,
        }) as ReactElement<DocumentProps>;
        break;

      // case "requirements":
      //   element = React.createElement(RequirementsPDF, { d: body.data }) as ReactElement<DocumentProps>;
      //   break;

      // case "automation_run":
      //   element = React.createElement(AutomationRunPDF, { d: body.data }) as ReactElement<DocumentProps>;
      //   break;

      default:
        return NextResponse.json(
          { error: `Unknown PDF type: ${(body as any).type}` },
          { status: 400 },
        );
    }

    const buffer = await renderToBuffer(element);
    const safeFilename = body.filename.replace(/[^a-z0-9._-]/gi, "-");

    // Convert Node Buffer → ArrayBuffer so NextResponse accepts it
    const arrayBuffer = buffer.buffer.slice(
      buffer.byteOffset,
      buffer.byteOffset + buffer.byteLength,
    ) as ArrayBuffer;

    return new NextResponse(arrayBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${safeFilename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err: any) {
    console.error(`[PDF route] type=${body.type} error:`, err);
    return NextResponse.json(
      { error: err?.message ?? "PDF generation failed" },
      { status: 500 },
    );
  }
}
