// app/api/generate-test-cases/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import {
  checkUsageQuota,
  recordSuccessfulGeneration,
  UsageQuotaError,
} from "@/lib/usage-tracker";
import {
  getModelId,
  isAnthropicModel,
  getFallbackModel,
  getDefaultModel,
  isModelAllowed,
  migrateModelKey,
  type ModelKey,
  AI_MODELS,
} from "@/lib/ai-models/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ─── Types ────────────────────────────────────────────────────────────────────

type Priority = "low" | "medium" | "high" | "critical";

/**
 * Structured step — every field the Cypress/Playwright/Selenium exporters need.
 *
 * action_type drives code generation:
 *   navigate  → cy.visit() / page.goto()
 *   click     → cy.get().click()
 *   fill      → cy.get().type() / invoke('val')
 *   select    → cy.get().select()
 *   check     → cy.get().check()
 *   hover     → cy.get().trigger('mouseover')
 *   wait      → cy.get({ timeout }).should('be.visible')
 *   press     → cy.get().type('{key}')
 *
 * assertion drives the expect/should call after the action.
 */
interface TestStep {
  step_number: number;
  action: string; // Human-readable description (kept for readability)
  expected: string; // Human-readable expected outcome
  // ── Automation fields ──────────────────────────────────────────────────────
  action_type?:
    | "navigate"
    | "click"
    | "fill"
    | "select"
    | "check"
    | "uncheck"
    | "hover"
    | "wait"
    | "press";
  selector?: string; // CSS selector  e.g. "input[name='email']"
  input_value?: string; // Value to type/select/navigate to
  wait_time?: number; // ms — only when action_type is "wait" and no selector
  assertion?: {
    type:
      | "visible"
      | "hidden"
      | "text"
      | "exact-text"
      | "value"
      | "url"
      | "enabled"
      | "disabled"
      | "checked"
      | "attribute"
      | "count";
    target?: string; // CSS selector for the asserted element (defaults to selector)
    value?: string; // Expected text / url fragment / attribute value
    attribute?: string; // For type "attribute"
  };
}

interface GeneratedTestCase {
  title: string;
  description: string;
  test_type: string;
  priority: Priority;
  preconditions: string | null;
  test_steps: TestStep[];
  expected_result: string;
  is_edge_case: boolean;
  is_negative_test: boolean;
  is_security_test: boolean;
  is_boundary_test: boolean;
  tags?: string[];
}

interface RequestBody {
  requirements?: string;
  requirement_id?: string;
  project_id?: string | null;
  model?: string;
  testCaseCount?: number | string;
  testTypes?: string[];
  template?: string;
  title?: string;
  description?: string | null;
  application_url?: string;
}

// ─── Structured output schema ─────────────────────────────────────────────────
//
// The step schema now includes all automation fields so the AI populates them
// directly. The exporters (Cypress / Playwright / Selenium) read these fields
// instead of trying to parse human-readable action strings.

const STEP_SCHEMA: Anthropic.Tool["input_schema"] = {
  type: "object",
  required: ["step_number", "action", "expected"],
  additionalProperties: false,
  properties: {
    step_number: { type: "integer" },
    action: { type: "string" },
    expected: { type: "string" },
    action_type: {
      type: "string",
      enum: [
        "navigate",
        "click",
        "fill",
        "select",
        "check",
        "uncheck",
        "hover",
        "wait",
        "press",
      ],
    },
    selector: { type: "string" },
    input_value: { type: "string" },
    wait_time: { type: "integer" },
    assertion: {
      type: "object",
      required: ["type"],
      additionalProperties: false,
      properties: {
        type: {
          type: "string",
          enum: [
            "visible",
            "hidden",
            "text",
            "exact-text",
            "value",
            "url",
            "enabled",
            "disabled",
            "checked",
            "attribute",
            "count",
          ],
        },
        target: { type: "string" },
        value: { type: "string" },
        attribute: { type: "string" },
      },
    },
  },
};

const RESPONSE_SCHEMA: Anthropic.Tool["input_schema"] = {
  type: "object",
  required: ["test_cases"],
  additionalProperties: false,
  properties: {
    test_cases: {
      type: "array",
      items: {
        type: "object",
        required: [
          "title",
          "description",
          "test_type",
          "priority",
          "preconditions",
          "test_steps",
          "expected_result",
          "is_edge_case",
          "is_negative_test",
          "is_security_test",
          "is_boundary_test",
          "tags",
        ],
        additionalProperties: false,
        properties: {
          title: { type: "string" },
          description: { type: "string" },
          test_type: {
            type: "string",
            enum: [
              "functional",
              "security",
              "performance",
              "integration",
              "regression",
              "smoke",
            ],
          },
          priority: {
            type: "string",
            enum: ["low", "medium", "high", "critical"],
          },
          preconditions: { type: ["string", "null"] },
          test_steps: {
            type: "array",
            items: STEP_SCHEMA,
          },
          expected_result: { type: "string" },
          is_edge_case: { type: "boolean" },
          is_negative_test: { type: "boolean" },
          is_security_test: { type: "boolean" },
          is_boundary_test: { type: "boolean" },
          tags: { type: "array", items: { type: "string" } },
        },
      },
    },
  },
};

// ─── AI clients ───────────────────────────────────────────────────────────────

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

// ─── Constants ────────────────────────────────────────────────────────────────

const PRIORITY_VALUES = new Set<Priority>([
  "low",
  "medium",
  "high",
  "critical",
]);
const PRIORITY_ALIASES: Record<string, Priority> = {
  p0: "critical",
  blocker: "critical",
  p1: "high",
  p2: "medium",
  p3: "low",
};

const TEST_TYPE_LABELS: Record<string, string> = {
  "happy-path": "Happy Path",
  negative: "Negative",
  security: "Security",
  boundary: "Boundary",
  "edge-case": "Edge Case",
  performance: "Performance",
  integration: "Integration",
  regression: "Regression",
  smoke: "Smoke",
};

// ─── Test type instructions ───────────────────────────────────────────────────

const TEST_TYPE_INSTRUCTIONS: Record<string, string> = {
  "happy-path": `
Generate tests that verify the system works correctly with valid inputs and expected user flows.
Focus on: valid user journeys, expected use cases, successful operations with proper data, normal workflow completion.`,

  negative: `
Generate tests that verify the system handles invalid inputs and error conditions correctly.
Focus on: empty/missing required fields, invalid data formats, data exceeding limits, wrong data types, unauthorized access attempts.
Set is_negative_test = true on every case.`,

  security: `
Generate tests that verify security controls. Cover:
- SQL injection: ' OR '1'='1
- XSS: <script>alert('XSS')</script>
- Path traversal: ../../etc/passwd
- Access restricted pages without login
- Changing user IDs in URLs to access other users' data
- Session timeout and concurrent sessions
Set is_security_test = true on every case.`,

  boundary: `
Generate tests that probe limits. Cover:
- Numeric: min value, min-1, max value, max+1
- String length: empty, single char, max length, max+1
- Dates: past when future required, leap year (Feb 29), invalid (Feb 30)
- File size: 0 bytes, just under limit, at limit, just over limit
Set is_boundary_test = true on every case.`,

  "edge-case": `
Generate tests for unusual but valid scenarios.
Focus on: rare user actions, uncommon data combinations, special characters in names/data (e.g. José O'Brien-Smith), concurrent operations.
Set is_edge_case = true on every case.`,

  performance: `
Generate tests that verify system performance and response times.
Focus on: page load times under stated SLAs, API response times, large data sets, concurrent users.`,

  integration: `
Generate tests that verify component interactions.
Focus on: data flow between systems, third-party API integrations, database transactions, email/webhook delivery.`,

  regression: `
Generate tests that verify existing functionality still works after changes.
Focus on: core user flows, previously fixed bugs, critical business logic.`,

  smoke: `
Generate critical path tests that verify basic functionality.
Focus on: application loads, core features are accessible, no JavaScript errors, no blocking errors.`,
};

// ─── Automation guidelines ────────────────────────────────────────────────────
//
// This is the most important prompt section for export quality.
// Every field described here maps directly to the step schema above.
// The more specific and consistent the examples, the better the output.

const AUTOMATION_GUIDELINES = `
You are generating test cases that will be automatically converted to runnable Cypress, Playwright, and Selenium scripts.

Each step MUST include both human-readable fields AND structured automation fields:

REQUIRED automation fields per step:
  action_type  — one of: navigate, click, fill, select, check, uncheck, hover, wait, press
  selector     — CSS selector for the target element (required for all except navigate)
  input_value  — the value to type/select/navigate to (required for fill, select, navigate)

OPTIONAL automation fields:
  assertion    — what to verify after the action (type + target + value)
  wait_time    — milliseconds, only when action_type is "wait" and there's no selector

SELECTOR RULES — prefer in this order:
  1. data-testid:  [data-testid="submit-button"]
  2. name attr:    input[name="email"]
  3. type attr:    input[type="password"]
  4. aria-label:   [aria-label="Close dialog"]
  5. text-based:   button:has-text("Generate Test Cases")   ← Cypress/Playwright only
  Never use: nth-child, positional selectors, or long class chains

STEP EXAMPLES:

Navigate:
  action: "Navigate to /generate"
  action_type: "navigate"
  input_value: "/generate"          ← path only, never full URL
  selector: "body"
  assertion: { type: "url", value: "/generate" }

Fill a text field:
  action: "Type 'test@example.com' in the email field"
  action_type: "fill"
  selector: "input[name='email']"
  input_value: "test@example.com"
  assertion: { type: "value", target: "input[name='email']", value: "test@example.com" }

Fill with a long generated string (boundary test):
  action: "Type a string of exactly 5001 characters in the requirements textarea"
  action_type: "fill"
  selector: "textarea[name='requirements']"
  input_value: ""                   ← leave empty; the exporter generates 'a'.repeat(5001)
  assertion: { type: "value", target: "textarea[name='requirements']", value: "" }

Click:
  action: "Click the Generate Test Cases button"
  action_type: "click"
  selector: "button[data-testid='generate-button']"
  assertion: { type: "visible", target: "[data-testid='loading-indicator']" }

Wait for element:
  action: "Wait for success message to appear"
  action_type: "wait"
  selector: "[data-testid='success-message']"
  wait_time: 10000
  assertion: { type: "text", target: "[data-testid='success-message']", value: "Test cases generated successfully" }

Select dropdown:
  action: "Select 'Monthly' from the billing period dropdown"
  action_type: "select"
  selector: "select[name='billing_period']"
  input_value: "Monthly"

IMPORTANT RULES:
- Use path-only input_value for navigate steps (e.g. "/dashboard" not "https://app.example.com/dashboard")
- For boundary tests that require N characters, set input_value to "" and describe the count in the action text
- For special characters (accents, quotes, symbols), put the exact value in input_value — the exporter handles escaping
- Every step that changes state should have an assertion verifying the outcome
- Use realistic test data — not placeholders like "valid email" or "some text"
`;

// ─── Utilities ────────────────────────────────────────────────────────────────

function normalizePriority(p: unknown): Priority {
  const s = (typeof p === "string" ? p : "").toLowerCase().trim();
  if (PRIORITY_ALIASES[s]) return PRIORITY_ALIASES[s];
  return PRIORITY_VALUES.has(s as Priority) ? (s as Priority) : "medium";
}

/** Distribute N cases across types as evenly as possible, remainder front-loaded. */
function distributeCount(
  total: number,
  types: string[],
): Record<string, number> {
  const perType = Math.floor(total / types.length);
  const remainder = total % types.length;
  return Object.fromEntries(
    types.map((t, i) => [t, perType + (i < remainder ? 1 : 0)]),
  );
}

// ─── Prompt builder (per-type) ────────────────────────────────────────────────

function buildTypePrompt(params: {
  requirements: string;
  testType: string;
  count: number;
  application_url?: string;
  template?: string;
}): string {
  const { requirements, testType, count, application_url, template } = params;
  const label = TEST_TYPE_LABELS[testType] ?? testType;
  const typeGuide = TEST_TYPE_INSTRUCTIONS[testType] ?? "";
  const urlCtx = application_url
    ? `\nApplication base URL (for context only — use path-only in navigate steps): ${application_url}`
    : "";
  const tmplCtx = template ? `\nTemplate structure:\n${template}` : "";

  return `${AUTOMATION_GUIDELINES}

Generate EXACTLY ${count} ${label} test case${count !== 1 ? "s" : ""} for the following requirements:
${requirements}${urlCtx}${tmplCtx}

Test type guidance:
${typeGuide}

Return your response by calling the generate_test_cases tool with a test_cases array containing EXACTLY ${count} objects.
Every step MUST include action_type, selector (where applicable), and input_value (where applicable).`;
}

// ─── Structured LLM calls ─────────────────────────────────────────────────────

interface BatchResult {
  cases: GeneratedTestCase[];
  provider: "anthropic" | "openai";
  model: string;
}

async function callAnthropic(
  modelId: string,
  prompt: string,
  expectedCount: number,
): Promise<GeneratedTestCase[]> {
  const res = await anthropic.messages.create({
    model: modelId,
    max_tokens: Math.min(64000, Math.max(4000, expectedCount * 800)),
    tools: [
      {
        name: "generate_test_cases",
        description: "Output the generated test cases as structured data.",
        input_schema: RESPONSE_SCHEMA,
      },
    ],
    tool_choice: { type: "any" },
    messages: [{ role: "user", content: prompt }],
  });

  const toolUse = res.content.find(
    (b): b is Anthropic.ToolUseBlock => b.type === "tool_use",
  );
  if (!toolUse) throw new Error("Anthropic did not call the tool");

  const input = toolUse.input as { test_cases?: GeneratedTestCase[] };
  return input.test_cases ?? [];
}

async function callOpenAI(
  modelId: string,
  prompt: string,
  expectedCount: number,
): Promise<GeneratedTestCase[]> {
  const res = await openai.chat.completions.create({
    model: modelId,
    max_tokens: Math.min(16384, Math.max(4000, expectedCount * 800)),
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "generate_test_cases",
        strict: true,
        schema: RESPONSE_SCHEMA as unknown as Record<string, unknown>,
      },
    },
    messages: [{ role: "user", content: prompt }],
  });

  const raw = res.choices?.[0]?.message?.content ?? "{}";
  const parsed = JSON.parse(raw) as { test_cases?: GeneratedTestCase[] };
  return parsed.test_cases ?? [];
}

async function callWithFallback(
  modelKey: ModelKey,
  prompt: string,
  expectedCount: number,
): Promise<BatchResult> {
  const primaryIsAnthropic = isAnthropicModel(modelKey);
  const primaryModelId = getModelId(modelKey);
  const fallbackKey = getFallbackModel(
    primaryIsAnthropic ? "openai" : "anthropic",
  );
  const fallbackModelId = getModelId(fallbackKey);

  try {
    if (primaryIsAnthropic) {
      const cases = await callAnthropic(primaryModelId, prompt, expectedCount);
      return { cases, provider: "anthropic", model: primaryModelId };
    } else {
      const cases = await callOpenAI(primaryModelId, prompt, expectedCount);
      return { cases, provider: "openai", model: primaryModelId };
    }
  } catch (err) {
    console.error(`[LLM] Primary (${primaryModelId}) failed:`, err);
  }

  try {
    if (primaryIsAnthropic) {
      const cases = await callOpenAI(fallbackModelId, prompt, expectedCount);
      return { cases, provider: "openai", model: fallbackModelId };
    } else {
      const cases = await callAnthropic(fallbackModelId, prompt, expectedCount);
      return { cases, provider: "anthropic", model: fallbackModelId };
    }
  } catch (err) {
    console.error(`[LLM] Fallback (${fallbackModelId}) failed:`, err);
  }

  throw new Error("All LLM providers failed");
}

// ─── Per-type batch orchestration ─────────────────────────────────────────────

interface TypeBatchResult {
  testType: string;
  cases: GeneratedTestCase[];
  provider: "anthropic" | "openai";
  model: string;
  error?: string;
}

async function generateAllTypes(params: {
  requirements: string;
  testTypes: string[];
  countPerType: Record<string, number>;
  modelKey: ModelKey;
  application_url?: string;
  template?: string;
}): Promise<TypeBatchResult[]> {
  const {
    requirements,
    testTypes,
    countPerType,
    modelKey,
    application_url,
    template,
  } = params;

  const runBatch = async (testType: string): Promise<TypeBatchResult> => {
    const count = countPerType[testType] ?? 1;
    const prompt = buildTypePrompt({
      requirements,
      testType,
      count,
      application_url,
      template,
    });

    try {
      const result = await callWithFallback(modelKey, prompt, count);
      console.log(
        `[batch] ${testType}: got ${result.cases.length}/${count} via ${result.provider}`,
      );
      return { testType, ...result };
    } catch (err) {
      console.error(`[batch] ${testType} failed:`, err);
      return {
        testType,
        cases: [],
        provider: "anthropic",
        model: "",
        error: String(err),
      };
    }
  };

  const firstWave = await Promise.allSettled(testTypes.map(runBatch));

  const results: TypeBatchResult[] = [];
  const retryTypes: string[] = [];

  for (let i = 0; i < firstWave.length; i++) {
    const r = firstWave[i];
    if (r.status === "rejected") {
      retryTypes.push(testTypes[i]);
      continue;
    }
    const expected = countPerType[r.value.testType] ?? 1;
    if (r.value.cases.length < Math.ceil(expected * 0.8)) {
      retryTypes.push(r.value.testType);
    } else {
      results.push(r.value);
    }
  }

  if (retryTypes.length > 0) {
    console.warn(`[batch] Retrying types: ${retryTypes.join(", ")}`);
    for (const testType of retryTypes) {
      const retried = await runBatch(testType);
      results.push(retried);
    }
  }

  return results;
}

// ─── Route handlers ───────────────────────────────────────────────────────────

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as RequestBody;

    const requirements = (body.requirements ?? "").trim();
    const requirement_id = body.requirement_id || null;
    const project_id = body.project_id || null;
    const rawModelKey = String(body.model ?? "").trim();
    const modelKey: ModelKey = rawModelKey
      ? migrateModelKey(rawModelKey)
      : getDefaultModel();

    if (!isModelAllowed(modelKey)) {
      return NextResponse.json(
        { error: "Unsupported AI model", field: "model" },
        { status: 400 },
      );
    }

    const testCaseCount = Number(body.testCaseCount ?? 10);
    const testTypes =
      Array.isArray(body.testTypes) && body.testTypes.length > 0
        ? body.testTypes
        : ["happy-path"];
    const template = body.template ?? "";
    const title = (body.title ?? "").trim();
    const description = body.description ?? null;
    const application_url = (body.application_url ?? "").trim();

    if (!requirements) {
      return NextResponse.json(
        { error: "Requirements are required", field: "requirements" },
        { status: 400 },
      );
    }
    if (!title) {
      return NextResponse.json(
        { error: "Generation title is required", field: "title" },
        { status: 400 },
      );
    }
    if (testCaseCount < 1 || testCaseCount > 50) {
      return NextResponse.json(
        {
          error: "Test case count must be between 1 and 50",
          field: "testCaseCount",
        },
        { status: 400 },
      );
    }

    try {
      await checkUsageQuota(user.id, testCaseCount);
    } catch (e) {
      if (e instanceof UsageQuotaError) {
        return NextResponse.json(
          {
            error: e.message,
            remaining: e.remaining,
            requested: e.requested,
            used: e.used,
            limit: e.limit,
            upgradeRequired: true,
          },
          { status: 429 },
        );
      }
      let remaining = 0;
      try {
        const { data: usage } = await supabase
          .from("user_usage_tracking")
          .select("test_cases_generated, test_case_limit")
          .eq("user_id", user.id)
          .single();
        if (usage) {
          const limit = usage.test_case_limit || 50;
          remaining = Math.max(0, limit - (usage.test_cases_generated || 0));
        }
      } catch {
        /* ignore */
      }
      return NextResponse.json(
        {
          error: e instanceof Error ? e.message : "Usage limit exceeded",
          upgradeRequired: true,
          remaining,
          requested: testCaseCount,
        },
        { status: 429 },
      );
    }

    const countPerType = distributeCount(testCaseCount, testTypes);
    console.log("[generate] countPerType:", countPerType);

    const batchResults = await generateAllTypes({
      requirements,
      testTypes,
      countPerType,
      modelKey,
      application_url: application_url || undefined,
      template: template || undefined,
    });

    const allCases = batchResults
      .flatMap((r) => r.cases)
      .slice(0, testCaseCount);

    if (allCases.length === 0) {
      return NextResponse.json(
        {
          error: "Generation temporarily unavailable. Please try again later.",
        },
        { status: 503 },
      );
    }

    const lastSuccessful = batchResults.findLast((r) => r.cases.length > 0);
    const providerUsed = lastSuccessful?.provider ?? "anthropic";
    const modelUsed = lastSuccessful?.model ?? getModelId(modelKey);

    const samplePrompt = buildTypePrompt({
      requirements,
      testType: testTypes[0],
      count: countPerType[testTypes[0]],
      application_url: application_url || undefined,
      template: template || undefined,
    });

    const { data: generation, error: genError } = await supabase
      .from("test_case_generations")
      .insert({
        user_id: user.id,
        title,
        description,
        ai_provider: providerUsed,
        ai_model: modelUsed,
        prompt_used: samplePrompt,
      })
      .select()
      .single();

    if (genError || !generation) {
      return NextResponse.json(
        { error: "Failed to save generation" },
        { status: 500 },
      );
    }

    const rows = allCases.map((tc) => ({
      generation_id: generation.id,
      requirement_id,
      project_id,
      user_id: user.id,
      title: tc.title,
      description: tc.description,
      test_type: tc.test_type || "functional",
      priority: normalizePriority(tc.priority),
      preconditions: tc.preconditions ?? null,
      test_steps: tc.test_steps,
      expected_result: tc.expected_result,
      is_edge_case: Boolean(tc.is_edge_case),
      is_negative_test: Boolean(tc.is_negative_test),
      is_security_test: Boolean(tc.is_security_test),
      is_boundary_test: Boolean(tc.is_boundary_test),
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
        { status: 500 },
      );
    }

    await recordSuccessfulGeneration(user.id, savedCases.length).catch(
      () => {},
    );

    const failedTypes = batchResults
      .filter((r) => r.error || r.cases.length === 0)
      .map((r) => r.testType);

    return NextResponse.json({
      success: true,
      generation_id: generation.id,
      test_cases: savedCases,
      count: savedCases.length,
      requested_count: testCaseCount,
      provider_used: providerUsed,
      model_used: modelUsed,
      ...(failedTypes.length > 0 && {
        partial: true,
        failed_types: failedTypes,
      }),
      statistics: {
        total: savedCases.length,
        negative: savedCases.filter((tc) => tc.is_negative_test).length,
        security: savedCases.filter((tc) => tc.is_security_test).length,
        boundary: savedCases.filter((tc) => tc.is_boundary_test).length,
        edge: savedCases.filter((tc) => tc.is_edge_case).length,
        by_type: Object.fromEntries(
          batchResults.map((r) => [r.testType, r.cases.length]),
        ),
      },
    });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Unexpected error. Please try again." },
      { status: 500 },
    );
  }
}

export async function GET() {
  return NextResponse.json({
    models: AI_MODELS,
    defaultModel: getDefaultModel(),
  });
}
