// app/api/requirements/analyze/route.ts - REQUIREMENT QUALITY ANALYSIS
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import OpenAI from "openai";

export const runtime = "nodejs";

interface AnalysisRequest {
  requirement_id?: string;
  title: string;
  description: string;
  acceptance_criteria: string[];
  requirement_type?: string;
}

interface QualityIssue {
  type: "ambiguity" | "missing_criteria" | "gap" | "incomplete" | "vague";
  severity: "critical" | "high" | "medium" | "low";
  category: string;
  message: string;
  suggestion: string;
  location?: string;
}

interface AnalysisResult {
  quality_score: number;
  completeness_score: number;
  clarity_score: number;
  testability_score: number;
  issues: QualityIssue[];
  suggestions: string[];
  missing_criteria: string[];
  ambiguous_terms: string[];
  recommended_actions: string[];
}

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as AnalysisRequest;

    // Auth
    const supabase = await createClient();
    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();
    if (userErr || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Validation
    if (!body.title || !body.description) {
      return NextResponse.json(
        { error: "Title and description are required" },
        { status: 400 },
      );
    }

    const systemPrompt = `You are a senior requirements analyst with expertise in requirements engineering, IEEE 830, and test-driven development.

Your task is to analyze requirements for quality, completeness, and testability.

CRITICAL ANALYSIS AREAS:

1. AMBIGUITY DETECTION:
   - Subjective terms: "fast", "user-friendly", "easy", "simple", "intuitive"
   - Vague quantifiers: "many", "few", "several", "most", "some"
   - Undefined acronyms or jargon
   - Multiple interpretations possible
   - Missing scope boundaries

2. COMPLETENESS CHECK:
   - Missing actors/roles
   - Missing preconditions
   - Missing postconditions
   - Missing error handling
   - Missing data validation rules
   - Missing non-functional requirements (performance, security, scalability)

3. TESTABILITY ISSUES:
   - Not measurable/verifiable
   - No clear pass/fail criteria
   - Missing specific values/thresholds
   - Cannot be objectively tested

4. MISSING CRITERIA:
   - Authentication/Authorization
   - Error scenarios
   - Edge cases
   - Data validation
   - Performance requirements
   - Security considerations
   - Accessibility requirements

Return your analysis as JSON only.`;

    const userPrompt = `Analyze this requirement:

TITLE: ${body.title}

DESCRIPTION:
${body.description}

TYPE: ${body.requirement_type || "unknown"}

ACCEPTANCE CRITERIA:
${body.acceptance_criteria.length > 0 ? body.acceptance_criteria.map((c, i) => `${i + 1}. ${c}`).join("\n") : "NONE PROVIDED"}

Provide a comprehensive analysis in this JSON format:
{
  "quality_score": number (0-100, overall quality),
  "completeness_score": number (0-100, how complete),
  "clarity_score": number (0-100, how clear/unambiguous),
  "testability_score": number (0-100, how testable),
  
  "issues": [
    {
      "type": "ambiguity" | "missing_criteria" | "gap" | "incomplete" | "vague",
      "severity": "critical" | "high" | "medium" | "low",
      "category": string (e.g., "Vague Terms", "Missing Error Handling"),
      "message": string (what's wrong),
      "suggestion": string (how to fix),
      "location": string (where in the requirement)
    }
  ],
  
  "suggestions": [string] (general improvements),
  
  "missing_criteria": [string] (specific missing acceptance criteria),
  
  "ambiguous_terms": [string] (terms that need clarification),
  
  "recommended_actions": [string] (prioritized actions to take)
}

IMPORTANT:
- Be strict but constructive
- Prioritize testability
- Flag ALL ambiguous terms
- Identify ALL missing error scenarios
- Score generously only if requirement is truly high quality
- Provide actionable suggestions`;

    const model = process.env.OPENAI_ANALYZE_MODEL || "gpt-4o";

    const completion = await client.chat.completions.create({
      model,
      temperature: 0.3,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
    });

    const text = completion.choices?.[0]?.message?.content || "{}";
    let analysis: AnalysisResult;

    try {
      analysis = JSON.parse(text);
    } catch {
      return NextResponse.json(
        { error: "Failed to parse analysis" },
        { status: 500 },
      );
    }

    // Store analysis if requirement_id provided
    if (body.requirement_id) {
      const { error: updateErr } = await supabase
        .from("requirements")
        .update({
          quality_score: analysis.quality_score,
          analysis_results: analysis,
          analyzed_at: new Date().toISOString(),
        })
        .eq("id", body.requirement_id)
        .eq("user_id", user.id);

      if (updateErr) {
        console.error("Failed to save analysis:", updateErr);
      }
    }

    return NextResponse.json({
      success: true,
      analysis,
    });
  } catch (e: any) {
    console.error("Requirement analysis error:", e);
    return NextResponse.json(
      { error: e?.message || "Server error" },
      { status: 500 },
    );
  }
}
