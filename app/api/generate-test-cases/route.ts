// app/api/generate-test-cases/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { checkAndRecordUsage } from "@/lib/usage-tracker";

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
  return (
    typeof b === "object" &&
    b !== null &&
    "type" in b &&
    "text" in b &&
    (b as Record<string, unknown>).type === "text" &&
    typeof (b as Record<string, unknown>).text === "string"
  );
}

function anthropicTextFromContent(blocks: unknown): string {
  if (!Array.isArray(blocks)) return "";
  return blocks.filter(isAnthropicTextBlock).map((b) => b.text).join("\n\n").trim();
}

// ----- Clients -----
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

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

const ALLOWED = new Set(["low", "medium", "high", "critical"] as const);
type Priority = "low" | "medium" | "high" | "critical";

function normalizePriority(p: unknown): Priority {
  const s = (typeof p === "string" ? p : "").toLowerCase().trim();
  if (["p0", "blocker"].includes(s)) return "critical";
  if (["p1"].includes(s)) return "high";
  if (["p2"].includes(s)) return "medium";
  if (["p3"].includes(s)) return "low";
  return ALLOWED.has(s as Priority) ? (s as Priority) : "medium";
}

// ----- Handler -----
export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    // Auth
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
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

    const requirements = (body.requirements ?? "").trim();
    const requirement_id = body.requirement_id || null;
    const model = body.model as ModelKey;
    const testCaseCount = Number(body.testCaseCount ?? 10);
    const coverage = body.coverage as CoverageKey;
    const template = body.template ?? "";
    const title = (body.title ?? "").trim();
    const description = body.description ?? null;

    // Validation
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
    if (!Number.isFinite(testCaseCount)) {
      return NextResponse.json(
        { error: "Test case count must be a number between 1 and 50", field: "testCaseCount" },
        { status: 400 }
      );
    }
    if (testCaseCount <= 0) {
      return NextResponse.json(
        { error: "Test case count must be greater than 0", field: "testCaseCount" },
        { status: 400 }
      );
    }
    if (testCaseCount > 50) {
      return NextResponse.json(
        { error: "Cannot generate more than 50 test cases at once", field: "testCaseCount" },
        { status: 400 }
      );
    }
    if (!(model in AI_MODELS)) {
      return NextResponse.json(
        { error: "Unsupported AI model", field: "model" },
        { status: 400 }
      );
    }
    if (!(coverage in COVERAGE_PROMPTS)) {
      return NextResponse.json(
        { error: "Invalid coverage level", field: "coverage" },
        { status: 400 }
      );
    }

    // Quota check (no logging)
    try {
      await checkAndRecordUsage(user.id, testCaseCount);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Usage limit exceeded";
      return NextResponse.json({ error: msg, upgradeRequired: true }, { status: 429 });
    }

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
    const isAnthropicModel = (model as string).startsWith("claude");
    const primary: "anthropic" | "openai" = isAnthropicModel ? "anthropic" : "openai";
    const fallback: "anthropic" | "openai" = isAnthropicModel ? "openai" : "anthropic";

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
    } catch {
      try {
        if (fallback === "anthropic") {
          const res = await anthropic.messages.create({
            model: "claude-3-5-sonnet-20241022",
            max_tokens: 8000,
            messages: [{ role: "user", content: promptUsed }],
          });
          rawText = anthropicTextFromContent(res.content);
          usedProvider = "anthropic";
        } else {
          const res = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [{ role: "user", content: promptUsed }],
            max_tokens: 8000,
          });
          rawText = res.choices?.[0]?.message?.content ?? "";
          usedProvider = "openai";
        }
      } catch {
        return NextResponse.json(
          { error: "Generation temporarily unavailable. Please try again later." },
          { status: 503 }
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
    } catch {
      // naive fallback: try to recover an array if present
      const match = rawText.match(/\[[\s\S]*\]/);
      if (!match) {
        return NextResponse.json(
          { error: "Failed to structure test cases. Please regenerate." },
          { status: 500 }
        );
      }
      testCases = JSON.parse(match[0]) as GeneratedTestCase[];
    }

    if (!Array.isArray(testCases)) testCases = [];

    // ---- Persist generation ----
    const { data: generation, error: genError } = await supabase
      .from("test_case_generations")
      .insert({
        user_id: user.id,
        title,
        description,
        ai_provider: usedProvider === "anthropic" ? "anthropic" : "openai",
        prompt_used: promptUsed, // stored server-side; not exposed in response
      })
      .select()
      .single();

    if (genError || !generation) {
      return NextResponse.json(
        { error: "Failed to save generation" },
        { status: 500 }
      );
    }

    // ---- Persist cases ----
    const rows = testCases.map((tc) => ({
      generation_id: generation.id,
      requirement_id,
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

    if (tcError || !savedCases) {
      return NextResponse.json(
        { error: "Failed to save test cases" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      generation_id: generation.id,
      test_cases: savedCases,
      count: savedCases.length,
      provider_used: usedProvider,
    });
  } catch {
    return NextResponse.json(
      { error: "Unexpected error. Please try again." },
      { status: 500 }
    );
  }
}
