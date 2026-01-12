import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import OpenAI from "openai";

export const runtime = "nodejs";

type ParseReq = {
  raw_text: string;
  requirement_type?: string;
  priority?: string;
  source?: string;
  project_id?: string | null;
};

type ParseResp = {
  title?: string;
  description?: string;
  acceptance_criteria: string[];
  metadata?: Record<string, string | number | boolean>;
};

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as ParseReq;
    const raw = String(body?.raw_text || "").trim();
    if (!raw) {
      return NextResponse.json(
        { error: "raw_text is required" },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();
    if (userErr || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const system = `
You are a senior QA analyst. Convert a raw requirement into structured, testable acceptance criteria.
Rules:
- Acceptance criteria must be atomic, testable, unambiguous.
- Use "Given/When/Then" only if it increases clarity; otherwise short imperative statements are fine.
- If the input includes multiple features, group criteria logically but still return a flat list.
- Do not invent scope beyond the requirement; if something is unclear, write a clarifying criterion as "Clarify: ...".
Return strictly valid JSON only.
`;

    const userPrompt = `
Requirement type: ${body.requirement_type ?? "unknown"}
Priority: ${body.priority ?? "unknown"}
Source: ${body.source ?? "unknown"}

RAW REQUIREMENT:
${raw}

Return JSON with:
{
  "title": string (optional),
  "description": string (optional cleaned summary),
  "acceptance_criteria": string[],
  "metadata": {
    "actors"?: string,
    "systems"?: string,
    "assumptions"?: string,
    "dependencies"?: string,
    "out_of_scope"?: string,
    "risks"?: string
  }
}
`;

    // If you have gpt-4.1 / gpt-5 available, use that. Otherwise pick your configured model.
    const model = process.env.OPENAI_PARSE_MODEL || "gpt-4o-mini";

    const completion = await client.chat.completions.create({
      model,
      temperature: 0.2,
      messages: [
        { role: "system", content: system },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
    });

    const text = completion.choices?.[0]?.message?.content || "{}";

    let parsed: ParseResp;
    try {
      parsed = JSON.parse(text);
    } catch {
      return NextResponse.json(
        { error: "Model returned invalid JSON" },
        { status: 500 }
      );
    }

    // Hardening: ensure acceptance_criteria is always array of strings
    const ac = Array.isArray(parsed.acceptance_criteria)
      ? parsed.acceptance_criteria.map((s) => String(s).trim()).filter(Boolean)
      : [];

    return NextResponse.json({
      title: parsed.title ? String(parsed.title).trim() : undefined,
      description: parsed.description
        ? String(parsed.description).trim()
        : undefined,
      acceptance_criteria: ac,
      metadata:
        parsed.metadata && typeof parsed.metadata === "object"
          ? parsed.metadata
          : undefined,
    });
  } catch (e: any) {
    console.error("parse requirement error:", e);
    return NextResponse.json(
      { error: e?.message || "Server error" },
      { status: 500 }
    );
  }
}
