// app/api/generate-test-cases/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";

export const runtime = "nodejs";

// ----- Types -----
interface TestStep {
  step_number: number;
  action: string;
  expected: string;
}
interface GeneratedTestCase {
  title: string;
  description: string;
  test_type: string;
  priority: "low" | "medium" | "high" | "critical";
  preconditions: string | null;
  test_steps: TestStep[];
  expected_result: string;
  is_edge_case: boolean;
}

// ----- Helpers -----
function isAnthropicTextBlock(b: unknown): b is { type: "text"; text: string } {
  if (typeof b !== "object" || b === null) return false;
  const t = (b as { type?: unknown }).type;
  const txt = (b as { text?: unknown }).text;
  return t === "text" && typeof txt === "string";
}
function anthropicTextFromContent(blocks: unknown): string {
  if (!Array.isArray(blocks)) return "";
  return blocks.filter(isAnthropicTextBlock).map(b => b.text).join("\n\n").trim();
}

// ----- Clients -----
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

// ----- Config (FIXED TO MATCH FRONTEND) -----
const AI_MODELS = {
  "claude-3-5-sonnet-20241022": "claude-3-5-sonnet-20241022",
  "claude-3-5-haiku-20241022": "claude-3-5-haiku-20241022", 
  "gpt-4o": "gpt-4o",
  "gpt-4o-mini": "gpt-4o-mini",
} as const;

const COVERAGE_PROMPTS = {
  standard:
    "Generate standard test cases covering the main functionality and common scenarios.",
  comprehensive:
    "Generate comprehensive test cases covering main functionality, edge cases, error handling, and validation scenarios.",
  exhaustive:
    "Generate exhaustive test cases covering all possible scenarios including main functionality, all edge cases, boundary conditions, error handling, security considerations, performance scenarios, and negative test cases.",
} as const;

type CoverageKey = keyof typeof COVERAGE_PROMPTS;
type ModelKey = keyof typeof AI_MODELS;

const ALLOWED = new Set(["low","medium","high","critical"] as const);
type Priority = "low" | "medium" | "high" | "critical";

function normalizePriority(p: unknown): Priority {
  const s = (typeof p === "string" ? p : "").toLowerCase().trim();

  if (["p0","blocker"].includes(s)) return "critical";
  if (["p1"].includes(s)) return "high";
  if (["p2"].includes(s)) return "medium";
  if (["p3"].includes(s)) return "low";

  return (ALLOWED.has(s as Priority) ? (s as Priority) : "medium");
}

// ----- Handler -----
export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    // Auth
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Input
    const body = (await request.json()) as {
      requirements?: string;
      requirement_id?: string;
      model?: string;
      testCaseCount?: number | string;
      coverage?: string;
      template?: string;
      title?: string;
      description?: string | null;
    };

    console.log('🔍 API Request received:', {
      requirements: (body.requirements ?? "").substring(0, 100) + '...',
      model: body.model,
      testCaseCount: body.testCaseCount,
      coverage: body.coverage,
      title: body.title,
      description: body.description,
      requirement_id: body.requirement_id
    });

    const requirements = (body.requirements ?? "").trim();
    const requirement_id = body.requirement_id || null;
    const model = body.model as ModelKey;
    const testCaseCount = Number(body.testCaseCount ?? 0);
    const coverage = body.coverage as CoverageKey;
    const template = body.template ?? "";
    const title = (body.title ?? "").trim();
    const description = body.description ?? null;

    // ENHANCED VALIDATION WITH SPECIFIC ERROR MESSAGES
    if (!requirements) {
      return NextResponse.json(
        { error: "Requirements are required", field: "requirements" },
        { status: 400 }
      );
    }

    if (!title) {
      return NextResponse.json(
        { error: "Generation title is required", field: "title" },
        { status: 400 }
      );
    }

    if (!Number.isFinite(testCaseCount) || testCaseCount <= 0 || testCaseCount > 100) {
      return NextResponse.json(
        { 
          error: "Test case count must be a number between 1 and 100", 
          field: "testCaseCount",
          received: body.testCaseCount,
          type: typeof body.testCaseCount
        },
        { status: 400 }
      );
    }

    if (!(model in AI_MODELS)) {
      return NextResponse.json(
        { 
          error: "Unsupported AI model", 
          field: "model",
          received: model,
          supported: Object.keys(AI_MODELS)
        },
        { status: 400 }
      );
    }

    if (!(coverage in COVERAGE_PROMPTS)) {
      return NextResponse.json(
        { 
          error: "Invalid coverage level", 
          field: "coverage",
          received: coverage,
          valid: Object.keys(COVERAGE_PROMPTS)
        },
        { status: 400 }
      );
    }

    // Provider selection
    const isAnthropicModel = model.startsWith("claude");
    const primary: "anthropic" | "openai" = isAnthropicModel ? "anthropic" : "openai";
    const fallback: "anthropic" | "openai" = isAnthropicModel ? "openai" : "anthropic";

    // Prompt
    const coverageInstruction = COVERAGE_PROMPTS[coverage];
    const templateInstruction = template ? `\n\nUse this template structure:\n${template}` : "";
    const promptUsed = `${coverageInstruction}

Generate exactly ${testCaseCount} test cases for the following requirements:

${requirements}${templateInstruction}

For each test case, provide:
1. A clear, specific title
2. Detailed description
3. Test type (functional, integration, unit, e2e, security, performance, etc.)
4. Priority level (critical, high, medium, low)
5. Preconditions (if any)
6. Step-by-step test steps with specific actions and expected results
7. Overall expected result
8. Whether this is an edge case (true/false)

Make the test cases practical, executable, and specific to the requirements.
Include positive tests, negative tests, boundary conditions, and error handling scenarios as appropriate for the coverage level.`;

    // ---- Call LLM (primary, then fallback) ----
    let rawText = "";
    let usedProvider = "";

    try {
      if (primary === "anthropic") {
        const res = await anthropic.messages.create({
          model: AI_MODELS[model],
          max_tokens: 8000,
          messages: [{ role: "user", content: promptUsed }],
        });
        rawText = anthropicTextFromContent(res.content); 
        usedProvider = "anthropic";                      
      } else {
        const res = await openai.chat.completions.create({
          model: AI_MODELS[model],
          messages: [{ role: "user", content: promptUsed }],
          max_tokens: 8000,
        });
        rawText = res.choices?.[0]?.message?.content ?? "";
        usedProvider = "openai";
      }
    } catch (e) {
      console.error(`Primary provider (${primary}) failed:`, e);

      try {
        if (fallback === "anthropic") {
          const res = await anthropic.messages.create({
            model: "claude-3-5-sonnet-20241022", // Use correct Claude model for fallback
            max_tokens: 8000,
            messages: [{ role: "user", content: promptUsed }],
          });
          rawText = anthropicTextFromContent(res.content);
          usedProvider = "anthropic (fallback)";
        } else {
          const res = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [{ role: "user", content: promptUsed }],
            max_tokens: 8000,
          });
          rawText = res.choices?.[0]?.message?.content ?? "";
          usedProvider = "openai (fallback)";
        }
      } catch (fallbackError) {
        console.error(`Fallback provider (${fallback}) also failed:`, fallbackError);
        return NextResponse.json(
          { error: "Both AI providers failed. Please try again later." },
          { status: 500 }
        );
      }
    }

    // ---- Structure into JSON via OpenAI ----
    const structurePrompt = `Convert the following test cases into a structured JSON array. Each test case should have this exact format:

{
  "title": "string",
  "description": "string",
  "test_type": "string (functional, integration, unit, etc.)",
  "priority": "string (low, medium, high, critical)",
  "preconditions": "string or null",
  "test_steps": [
    {"step_number": 1, "action": "string", "expected": "string"},
    {"step_number": 2, "action": "string", "expected": "string"}
  ],
  "expected_result": "string",
  "is_edge_case": boolean
}

Return a JSON object with a "test_cases" key containing the array, e.g. {"test_cases": [...]}

Test Cases to Convert:
${rawText}

Return ONLY valid JSON, no markdown, no explanation.`;

    let testCases: GeneratedTestCase[] = [];
    try {
      const structured = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: structurePrompt }],
        response_format: { type: "json_object" },
        max_tokens: 8000,
      });
      const content = structured.choices?.[0]?.message?.content ?? "{}";
      const parsed = JSON.parse(content) as {
        test_cases?: GeneratedTestCase[];
        testCases?: GeneratedTestCase[];
      };
      testCases = Array.isArray(parsed.test_cases)
        ? parsed.test_cases
        : Array.isArray(parsed.testCases)
        ? parsed.testCases
        : [];
    } catch (err) {
      console.error("Structuring failed; attempting manual array extraction:", err);
      const match = rawText.match(/\[[\s\S]*\]/);
      if (!match) {
        return NextResponse.json(
          { error: "Failed to structure test cases. Please try regenerating." },
          { status: 500 }
        );
      }
      testCases = JSON.parse(match[0]) as GeneratedTestCase[];
    }

    if (!Array.isArray(testCases)) testCases = [];
    if (testCases.length < Math.floor(testCaseCount * 0.8)) {
      console.warn(`Generated ${testCases.length} test cases, requested ${testCaseCount}`);
    }

    // ---- Persist generation ----
    const { data: generation, error: genError } = await supabase
      .from("test_case_generations")
      .insert({
        user_id: user.id,
        title,
        description,
        ai_provider: usedProvider.includes('anthropic') ? 'anthropic' : 'openai', // FIXED: Normalize provider name
        prompt_used: promptUsed,
      })
      .select()
      .single();

    if (genError || !generation) {
      console.error("GENERATION INSERT ERROR", {
        code: genError?.code,
        message: genError?.message,
        details: genError?.details,
        hint: genError?.hint,
      });
      return NextResponse.json(
        {
          error: "Failed to save generation",
          debug: {
            code: genError?.code,
            message: genError?.message,
            details: genError?.details,
            hint: genError?.hint,
          },
        },
        { status: 500 }
      );
    }

    // ---- Persist cases ----
    const rows = testCases.map((tc) => ({
      generation_id: generation.id,
      requirement_id: requirement_id,
      user_id: user.id,
      title: tc.title,
      description: tc.description,
      test_type: tc.test_type || "functional",
      priority: normalizePriority(tc.priority),  
      preconditions: tc.preconditions ?? null,
      test_steps: tc.test_steps, // JSONB
      expected_result: tc.expected_result,
      is_edge_case: Boolean(tc.is_edge_case),
      is_manual: false,
      status: "draft",
    }));

    const { data: savedCases, error: tcError } = await supabase
      .from("test_cases")
      .insert(rows)
      .select();

    if (tcError) {
      console.error("TEST CASES INSERT ERROR", {
        code: tcError.code,
        message: tcError.message,
        details: tcError.details,
        hint: tcError.hint,
      });
      return NextResponse.json(
        {
          error: "Failed to save test cases",
          debug: {
            code: tcError.code,
            message: tcError.message,
            details: tcError.details,
            hint: tcError.hint,
          },
        },
        { status: 500 }
      );
    }

    console.log('✅ Success! Generated and saved test cases:', {
      generation_id: generation.id,
      count: savedCases.length,
      provider_used: usedProvider
    });

    return NextResponse.json({
      success: true,
      generation_id: generation.id,
      test_cases: savedCases,
      count: savedCases.length,
      provider_used: usedProvider,
    });
  } catch (error) {
    console.error("Error generating test cases:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate test cases" },
      { status: 500 }
    );
  }
}