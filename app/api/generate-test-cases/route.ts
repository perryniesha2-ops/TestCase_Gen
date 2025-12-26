// app/api/generate-test-cases/route.ts - ENHANCED FOR AUTOMATION
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

// ----- AI Model Configuration -----
const AI_MODELS = {
  "claude-sonnet-4-5": "claude-sonnet-4-5-20250514",
  "claude-haiku-4-5": "claude-haiku-4-5-20250514",
  "claude-opus-4-5": "claude-opus-4-5-20250514",
  "gpt-5-mini": "gpt-5-mini",
  "gpt-5.2": "gpt-5.2",
  "gpt-4o": "gpt-4o-2024-11-20",
  "gpt-4o-mini": "gpt-4o-mini-2024-07-18",
} as const;

const MODEL_INFO = {
  "claude-sonnet-4-5": {
    name: "Claude Sonnet 4.5",
    provider: "Anthropic",
    description: "Latest Sonnet - Best balance of speed & quality",
    hint: "Recommended",
    recommended: true,
    contextWindow: 200000,
  },
  "claude-haiku-4-5": {
    name: "Claude Haiku 4.5",
    provider: "Anthropic",
    description: "Fastest Claude model",
    hint: "Fast",
    recommended: false,
    contextWindow: 200000,
  },
  "claude-opus-4-5": {
    name: "Claude Opus 4.5",
    provider: "Anthropic",
    description: "Most capable Claude model",
    hint: "Max quality",
    recommended: false,
    contextWindow: 200000,
  },
  "gpt-5-mini": {
    name: "GPT-5 Mini",
    provider: "OpenAI",
    description: "Balanced performance and cost",
    hint: "Balanced",
    recommended: false,
    contextWindow: 128000,
  },
  "gpt-5.2": {
    name: "GPT-5.2",
    provider: "OpenAI",
    description: "Premium GPT model",
    hint: "Premium",
    recommended: false,
    contextWindow: 128000,
  },
  "gpt-4o": {
    name: "GPT-4o",
    provider: "OpenAI",
    description: "Latest GPT-4o - Multimodal",
    hint: "",
    recommended: false,
    contextWindow: 128000,
  },
  "gpt-4o-mini": {
    name: "GPT-4o Mini",
    provider: "OpenAI",
    description: "Cost-effective GPT-4o",
    hint: "",
    recommended: false,
    contextWindow: 128000,
  },
} as const;

const DEFAULT_MODEL = "claude-sonnet-4-5";
const FALLBACK_CLAUDE = "claude-sonnet-4-5";
const FALLBACK_GPT = "gpt-4o";

// ----- Clients -----
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

// ✅ ENHANCED: Automation-focused coverage prompts
const COVERAGE_PROMPTS = {
  standard: `Generate standard test cases with AUTOMATION-READY steps. Each test case should:
- Include specific, actionable UI steps (click button X, type Y in field Z)
- Specify exact URLs where applicable
- Include realistic test data (emails, names, values)
- Define clear, verifiable expected results
- Be executable by Playwright automation`,

  comprehensive: `Generate comprehensive, AUTOMATION-READY test cases covering:
- Main functionality with specific UI interactions
- Edge cases with exact boundary values
- Error handling with specific invalid inputs
- Validation scenarios with precise test data

Each step must be:
- Actionable (Navigate to URL, Click element, Type value, Verify result)
- Specific (exact button text, field names, URLs, test data)
- Verifiable (what should be visible, what URL should load, what text should appear)`,

  exhaustive: `Generate exhaustive, AUTOMATION-READY test cases covering:
- All functionality paths with complete UI workflows
- All edge cases with specific boundary conditions
- Error handling with exact error scenarios
- Security considerations (authentication, authorization, XSS, CSRF)
- Performance scenarios with measurable criteria
- Negative tests with specific invalid inputs

CRITICAL: Every test step must be:
1. SPECIFIC: "Click the 'Sign In' button" not "Click login"
2. ACTIONABLE: "Type 'test@example.com' in input[name='email']" not "Enter credentials"
3. VERIFIABLE: "Verify URL is /dashboard and 'Welcome' heading is visible" not "Check if logged in"
4. COMPLETE: Include URLs, element selectors, test data, expected results`
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

// ✅ ENHANCED: Automation-specific prompt template
const AUTOMATION_GUIDELINES = `
AUTOMATION REQUIREMENTS:
You are creating test cases that will be AUTOMATICALLY CONVERTED to Playwright automation scripts.
Follow these rules strictly:

1. NAVIGATION STEPS:
   ✅ GOOD: "Navigate to https://app.example.com/login"
   ❌ BAD: "Go to the login page"

2. CLICKING STEPS:
   ✅ GOOD: "Click the button with text 'Sign In'" or "Click button[type='submit']"
   ❌ BAD: "Click login" or "Submit the form"

3. TYPING STEPS:
   ✅ GOOD: "Type 'test@example.com' in the email input field (input[name='email'])"
   ❌ BAD: "Enter email" or "Fill in credentials"

4. VERIFICATION STEPS:
   ✅ GOOD: "Verify the page URL contains '/dashboard'" or "Verify text 'Welcome, User' is visible"
   ❌ BAD: "Check if login successful" or "Verify authentication"

5. TEST DATA:
   - Use realistic, specific test data
   - Examples: "test@company.com", "John Doe", "123 Main Street", "4242424242424242"
   - NOT: "valid email", "user name", "address", "credit card"

6. ELEMENT SELECTORS:
   - Provide hints for finding elements: button text, input names, CSS selectors
   - Example: "Click the blue 'Add to Cart' button" or "input[name='username']"

7. EXPECTED RESULTS:
   - Be specific about what should appear/change
   - Example: "URL changes to /checkout" not "Navigation occurs"
   - Example: "Success message 'Order placed!' appears" not "Confirmation shown"

STEP FORMAT EXAMPLES:

Login Test:
1. Navigate to https://app.example.com/login
2. Locate the email input field (input[name="email"] or input[type="email"])
3. Click the email input field
4. Type "test@example.com" in the email field
5. Locate the password input field (input[name="password"])
6. Click the password input field  
7. Type "SecurePass123" in the password field
8. Locate and click the "Sign In" button (button with text "Sign In" or button[type="submit"])
9. Wait for page redirect
10. Verify the URL contains "/dashboard"
11. Verify a heading with text "Dashboard" or "Welcome" is visible

Form Submission Test:
1. Navigate to https://app.example.com/contact
2. Type "John Doe" in the name field (input[name="name"])
3. Type "john@example.com" in the email field (input[name="email"])
4. Type "Hello, I have a question" in the message textarea (textarea[name="message"])
5. Click the "Send Message" button
6. Verify success message "Message sent successfully!" appears
7. Verify form fields are cleared

E-commerce Test:
1. Navigate to https://shop.example.com/products
2. Click on the first product card
3. Verify product detail page loads
4. Click the "Add to Cart" button
5. Verify cart icon shows quantity "1"
6. Click the cart icon
7. Verify product appears in cart list
8. Click "Proceed to Checkout" button
9. Verify checkout page loads (/checkout URL)
`;

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
      application_url?: string; // ✅ NEW: Base URL for the application
    };

    const requirements = (body.requirements ?? "").trim();
    const requirement_id = body.requirement_id || null;
    const modelKey = (body.model as ModelKey) || DEFAULT_MODEL;
    const testCaseCount = Number(body.testCaseCount ?? 10);
    const coverage = body.coverage as CoverageKey;
    const template = body.template ?? "";
    const title = (body.title ?? "").trim();
    const description = body.description ?? null;
    const application_url = (body.application_url ?? "").trim(); // ✅ NEW

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
    if (!(modelKey in AI_MODELS)) {
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

    // Quota check
    try {
      await checkAndRecordUsage(user.id, testCaseCount);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Usage limit exceeded";
      return NextResponse.json({ error: msg, upgradeRequired: true }, { status: 429 });
    }

    const model = AI_MODELS[modelKey];

    // ✅ ENHANCED: Build automation-focused prompt
    const coverageInstruction = COVERAGE_PROMPTS[coverage];
    const templateInstruction = template ? `\n\nUse this template structure:\n${template}` : "";
    const urlContext = application_url 
      ? `\n\nAPPLICATION BASE URL: ${application_url}\nUse this as the base URL for all navigation steps.` 
      : "";

    const promptUsed = `${AUTOMATION_GUIDELINES}

${coverageInstruction}${urlContext}

Generate exactly ${testCaseCount} AUTOMATION-READY test cases for the following requirements:

${requirements}${templateInstruction}

For each test case, provide:
1. A clear, specific title describing what is being tested
2. Detailed description of the test scenario
3. Test type (functional, integration, e2e, security, performance, etc.)
4. Priority level (critical, high, medium, low)
5. Preconditions - Include:
   - Required authentication (with test credentials if needed)
   - Required setup data
   - Required application state
6. Step-by-step test steps with:
   - SPECIFIC actions (exact URLs, button text, field names, test data)
   - CLEAR expected results (what should be visible, URL changes, text appearing)
   - Element identifiers where possible (CSS selectors, button text, field names)
7. Overall expected result - Be specific about the final state
8. Whether this is an edge case (true/false)

CRITICAL REQUIREMENTS:
- Every step must be ACTIONABLE by Playwright automation
- Include EXACT test data (emails, passwords, names, values)
- Specify EXACT element selectors or button text
- Define CLEAR, VERIFIABLE expected results
- Use FULL URLs for navigation steps${application_url ? ` based on ${application_url}` : ''}
- Break complex actions into individual steps
- Each step should map to a single Playwright command

Make the test cases executable, unambiguous, and automation-ready.`;

    // ---- Call LLM (primary, then fallback) ----
    const isAnthropicModel = model.startsWith("claude");
    const primary: "anthropic" | "openai" = isAnthropicModel ? "anthropic" : "openai";
    const fallback: "anthropic" | "openai" = isAnthropicModel ? "openai" : "anthropic";

    let rawText = "";
    let usedProvider = "";
    let usedModel = "";

    try {
      if (primary === "anthropic") {
        const res = await anthropic.messages.create({
          model: model,
          max_tokens: 8000,
          messages: [{ role: "user", content: promptUsed }],
        });
        rawText = anthropicTextFromContent(res.content);
        usedProvider = "anthropic";
        usedModel = model;
      } else {
        const res = await openai.chat.completions.create({
          model: model,
          messages: [{ role: "user", content: promptUsed }],
          max_tokens: 8000,
        });
        rawText = res.choices?.[0]?.message?.content ?? "";
        usedProvider = "openai";
        usedModel = model;
      }
    } catch (primaryError) {
      try {
        if (fallback === "anthropic") {
          const res = await anthropic.messages.create({
            model: FALLBACK_CLAUDE,
            max_tokens: 8000,
            messages: [{ role: "user", content: promptUsed }],
          });
          rawText = anthropicTextFromContent(res.content);
          usedProvider = "anthropic";
          usedModel = FALLBACK_CLAUDE;
        } else {
          const res = await openai.chat.completions.create({
            model: FALLBACK_GPT,
            messages: [{ role: "user", content: promptUsed }],
            max_tokens: 8000,
          });
          rawText = res.choices?.[0]?.message?.content ?? "";
          usedProvider = "openai";
          usedModel = FALLBACK_GPT;
        }
      } catch (fallbackError) {
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
        model: "gpt-4o-mini-2024-07-18",
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
        ai_model: usedModel,
        prompt_used: promptUsed,
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
      test_steps: tc.test_steps, 
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
      model_used: usedModel,
    });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Unexpected error. Please try again." },
      { status: 500 }
    );
  }
}

// ----- Export model info for frontend -----
export async function GET() {
  return NextResponse.json({
    models: MODEL_INFO,
    defaultModel: DEFAULT_MODEL,
  });
}