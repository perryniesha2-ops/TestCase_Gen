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

// Increase Vercel function timeout via config export (works on Pro plan)
export const maxDuration = 300;

// ─── Types ────────────────────────────────────────────────────────────────────

type Priority = "low" | "medium" | "high" | "critical";

interface TestStep {
  step_number: number;
  action: string;
  expected: string;
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
  selector?: string;
  input_value?: string;
  wait_time?: number;
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
    target?: string;
    value?: string;
    attribute?: string;
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

// ─── Constants ────────────────────────────────────────────────────────────────

const BATCH_SIZE = 5;

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

// ─── Coverage areas ───────────────────────────────────────────────────────────

const COVERAGE_AREAS = [
  {
    name: "happy-path",
    label: "Core Flows",
    instruction: `Focus on HAPPY PATH and CORE FLOW scenarios:
- Valid inputs producing expected outputs
- Standard user journeys from start to finish
- Successful CRUD operations with correct data
- Normal workflow completion including confirmation/success states
Set is_negative_test, is_boundary_test, is_edge_case, is_security_test = false on all cases.
Assign priority critical or high to the most important flows.`,
  },
  {
    name: "negative",
    label: "Error Handling",
    instruction: `Focus on NEGATIVE and ERROR HANDLING scenarios:
- Missing required fields (submit empty form, omit each required field individually)
- Invalid data formats (wrong email format, non-numeric where numeric expected)
- Data that exceeds limits (too long, too large, wrong type)
- Attempting actions without required permissions or in wrong state
- Meaningful error messages shown to the user
Set is_negative_test = true on every case.`,
  },
  {
    name: "boundary",
    label: "Boundary Values",
    instruction: `Focus on BOUNDARY VALUE scenarios:
- Numeric limits: minimum valid, minimum-1 (invalid), maximum valid, maximum+1 (invalid)
- String lengths: empty string, single character, exactly at max length, one over max length
- Date edges: today, yesterday, far future, invalid dates (Feb 30, Feb 29 non-leap year)
- File sizes: 0 bytes, just under limit, exactly at limit, one byte over limit
- Collection limits: empty list, single item, exactly at maximum items, one over maximum
Set is_boundary_test = true on every case.`,
  },
  {
    name: "edge-case",
    label: "Edge Cases",
    instruction: `Focus on EDGE CASE and UNUSUAL SCENARIO testing:
- Special characters in inputs: apostrophes, quotes, ampersands, unicode (José O'Brien-Smith)
- Whitespace: leading/trailing spaces, multiple spaces, tabs, newlines in fields
- Concurrent or rapid repeated actions (double-click submit, rapid navigation)
- Unexpected sequences: skip steps, go backwards, refresh mid-flow
- Empty states: no data in lists, first-time user experience
Set is_edge_case = true on every case.`,
  },
  {
    name: "security",
    label: "Security",
    instruction: `Focus on SECURITY scenarios:
- SQL injection attempts: ' OR '1'='1, '; DROP TABLE users;--
- XSS attempts: <script>alert('XSS')</script>, <img onerror="alert(1)" src=x>
- Accessing pages/resources without authentication (direct URL navigation)
- Horizontal privilege escalation: changing IDs in URLs to access other users' data
- Session management: session after logout, concurrent sessions
Set is_security_test = true on every case.`,
  },
  {
    name: "integration",
    label: "Integration & State",
    instruction: `Focus on INTEGRATION and STATE MANAGEMENT scenarios:
- Data persisting correctly after save and page refresh
- Changes in one area correctly reflected in related areas
- Multi-step workflows maintaining state between steps
- Actions triggering correct downstream effects (emails sent, counts updated)
- Undo/cancel operations correctly reverting state`,
  },
];

// ─── Schema ───────────────────────────────────────────────────────────────────

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
          test_steps: { type: "array", items: STEP_SCHEMA },
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

// ─── Prompt ───────────────────────────────────────────────────────────────────

const STEP_GUIDELINES = `
AUTOMATION FIELDS — every step must include:
  action_type  — one of: navigate, click, fill, select, check, uncheck, hover, wait, press
  selector     — CSS selector for the target element (required for all except navigate)
  input_value  — the value to type/select/navigate to (required for fill, select, navigate)

SELECTOR PRIORITY (use the first that applies):
  1. [data-testid="submit-button"]
  2. input[name="email"]
  3. input[type="password"]
  4. [aria-label="Close dialog"]
  5. button:has-text("Generate Test Cases")
  Never use: nth-child, positional selectors, or long class chains

STEP EXAMPLES:
  Navigate:  action_type="navigate"  input_value="/login"  selector="body"  assertion={type:"url",value:"/login"}
  Fill:      action_type="fill"      selector="input[name='email']"  input_value="user@example.com"  assertion={type:"value",target:"input[name='email']",value:"user@example.com"}
  Click:     action_type="click"     selector="[data-testid='submit-btn']"  assertion={type:"visible",target:"[data-testid='success-msg']"}
  Wait:      action_type="wait"      selector="[data-testid='result']"  wait_time=5000  assertion={type:"text",target:"[data-testid='result']",value:"Saved"}
  Select:    action_type="select"    selector="select[name='role']"  input_value="Admin"

RULES:
  - Use path-only input_value for navigate steps ("/dashboard" not "https://...")
  - Use realistic data throughout — not placeholders like "valid email" or "some text"
  - Every step that changes state should have an assertion verifying the outcome
`;

function buildPrompt(params: {
  requirements: string;
  count: number;
  area: (typeof COVERAGE_AREAS)[number];
  batchIndex: number;
  totalBatches: number;
  allAreaNames: string[];
  application_url?: string;
  template?: string;
}): string {
  const {
    requirements,
    count,
    area,
    batchIndex,
    totalBatches,
    allAreaNames,
    application_url,
    template,
  } = params;

  const urlCtx = application_url
    ? `\nApplication base URL (context only — use path-only in navigate steps): ${application_url}`
    : "";
  const tmplCtx = template ? `\nTemplate to follow:\n${template}` : "";
  const otherAreas = allAreaNames.filter((n) => n !== area.name);
  const dedupeCtx =
    otherAreas.length > 0
      ? `\nOther batches in this generation cover: ${otherAreas.join(", ")}. Do NOT duplicate those scenarios — stay focused on ${area.label}.`
      : "";

  return `You are a senior QA engineer creating production-ready test cases that will be executed by testers and exported to Cypress, Playwright, and Selenium.

Requirements to test:
${requirements}${urlCtx}${tmplCtx}

${STEP_GUIDELINES}

YOUR TASK — generate EXACTLY ${count} test case${count !== 1 ? "s" : ""} covering: ${area.label.toUpperCase()}

${area.instruction}
${dedupeCtx}

QUALITY RULES (apply to every case):
  ✓ Title is unique, specific, and self-explanatory
  ✓ Steps are sequential and complete — a tester can follow them without guessing
  ✓ Expected result clearly states what a PASS looks like
  ✓ Preconditions state any required setup (or null if none needed)
  ✓ Use realistic, specific test data (not "test@test.com" or placeholder text)
  ✓ Each case tests one distinct scenario — no duplicates

Call the generate_test_cases tool with a test_cases array containing EXACTLY ${count} objects.`;
}

// ─── LLM callers ─────────────────────────────────────────────────────────────

async function callAnthropic(
  modelId: string,
  prompt: string,
  count: number,
): Promise<GeneratedTestCase[]> {
  const res = await anthropic.messages.create({
    model: modelId,
    max_tokens: Math.min(16000, Math.max(4000, count * 1000)),
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
  if (!toolUse)
    throw new Error(
      `Anthropic returned no tool call (stop_reason: ${res.stop_reason})`,
    );
  const input = toolUse.input as { test_cases?: GeneratedTestCase[] };
  return input.test_cases ?? [];
}

async function callOpenAI(
  modelId: string,
  prompt: string,
  count: number,
): Promise<GeneratedTestCase[]> {
  const res = await openai.chat.completions.create({
    model: modelId,
    max_tokens: Math.min(16000, Math.max(4000, count * 1000)),
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

async function callLLM(
  modelKey: ModelKey,
  prompt: string,
  count: number,
): Promise<GeneratedTestCase[]> {
  const primaryIsAnthropic = isAnthropicModel(modelKey);
  const primaryId = getModelId(modelKey);
  const fallbackKey = getFallbackModel(
    primaryIsAnthropic ? "openai" : "anthropic",
  );
  const fallbackId = getModelId(fallbackKey);

  try {
    return primaryIsAnthropic
      ? await callAnthropic(primaryId, prompt, count)
      : await callOpenAI(primaryId, prompt, count);
  } catch (primaryErr) {
    console.error(
      `[LLM] Primary ${primaryId} failed, trying fallback:`,
      primaryErr,
    );
    return primaryIsAnthropic
      ? await callOpenAI(fallbackId, prompt, count)
      : await callAnthropic(fallbackId, prompt, count);
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function normalizePriority(p: unknown): Priority {
  const s = (typeof p === "string" ? p : "").toLowerCase().trim();
  if (PRIORITY_ALIASES[s]) return PRIORITY_ALIASES[s];
  return PRIORITY_VALUES.has(s as Priority) ? (s as Priority) : "medium";
}

interface BatchPlan {
  batchIndex: number;
  count: number;
  area: (typeof COVERAGE_AREAS)[number];
}

function buildBatchPlan(totalCount: number): BatchPlan[] {
  const numBatches = Math.ceil(totalCount / BATCH_SIZE);
  const plans: BatchPlan[] = [];
  let remaining = totalCount;
  for (let i = 0; i < numBatches; i++) {
    plans.push({
      batchIndex: i,
      count: Math.min(BATCH_SIZE, remaining),
      area: COVERAGE_AREAS[i % COVERAGE_AREAS.length],
    });
    remaining -= Math.min(BATCH_SIZE, remaining);
  }
  return plans;
}

// ─── POST handler ─────────────────────────────────────────────────────────────

export async function POST(request: Request) {
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
  const title = (body.title ?? "").trim();
  const description = body.description ?? null;
  const application_url = (body.application_url ?? "").trim();
  const template = body.template ?? "";

  if (!isModelAllowed(modelKey)) {
    return NextResponse.json(
      { error: "Unsupported AI model" },
      { status: 400 },
    );
  }
  if (!requirements) {
    return NextResponse.json(
      { error: "Requirements are required" },
      { status: 400 },
    );
  }
  if (!title) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }

  const testCaseCount = Math.min(
    30,
    Math.max(1, Number(body.testCaseCount ?? 10)),
  );

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
    return NextResponse.json(
      { error: "Usage check failed", upgradeRequired: true },
      { status: 429 },
    );
  }

  const batchPlan = buildBatchPlan(testCaseCount);
  const allAreaNames = [...new Set(batchPlan.map((b) => b.area.name))];

  // Run all batches in parallel — each is capped at BATCH_SIZE=5 cases
  // so max_tokens per call is 5000, well within timeout limits
  const batchResults = await Promise.allSettled(
    batchPlan.map(({ batchIndex, count, area }) =>
      callLLM(
        modelKey,
        buildPrompt({
          requirements,
          count,
          area,
          batchIndex,
          totalBatches: batchPlan.length,
          allAreaNames,
          application_url: application_url || undefined,
          template: template || undefined,
        }),
        count,
      )
        .then((cases) => ({ batchIndex, area: area.name, cases }))
        .catch((err) => {
          console.error(
            `[gen] Batch ${batchIndex + 1} (${area.name}) failed:`,
            err,
          );
          return {
            batchIndex,
            area: area.name,
            cases: [] as GeneratedTestCase[],
          };
        }),
    ),
  );

  // Flatten all cases from successful batches
  const allCases: GeneratedTestCase[] = [];
  for (const result of batchResults) {
    if (result.status === "fulfilled") {
      allCases.push(...result.value.cases);
    }
  }

  if (allCases.length === 0) {
    return NextResponse.json(
      { error: "Generation temporarily unavailable. Please try again." },
      { status: 503 },
    );
  }

  // Create generation record and save all cases using the same cookie client
  const { data: generation, error: genError } = await supabase
    .from("test_case_generations")
    .insert({
      user_id: user.id,
      title,
      description,
      ai_provider: isAnthropicModel(modelKey) ? "anthropic" : "openai",
      ai_model: getModelId(modelKey),
      prompt_used: `${testCaseCount} cases across ${batchPlan.length} coverage areas`,
    })
    .select()
    .single();

  if (genError || !generation) {
    return NextResponse.json(
      { error: "Failed to save generation" },
      { status: 500 },
    );
  }

  const rows = allCases.slice(0, testCaseCount).map((tc) => ({
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
    console.error("[gen] DB save failed:", tcError?.message);
    return NextResponse.json(
      { error: "Failed to save test cases" },
      { status: 500 },
    );
  }

  await recordSuccessfulGeneration(user.id, savedCases.length).catch(() => {});

  return NextResponse.json({
    success: true,
    generation_id: generation.id,
    test_cases: savedCases,
    count: savedCases.length,
    requested_count: testCaseCount,
    statistics: {
      total: savedCases.length,
      negative: savedCases.filter((tc) => tc.is_negative_test).length,
      security: savedCases.filter((tc) => tc.is_security_test).length,
      boundary: savedCases.filter((tc) => tc.is_boundary_test).length,
      edge: savedCases.filter((tc) => tc.is_edge_case).length,
    },
  });
}

export async function GET() {
  return NextResponse.json({
    models: AI_MODELS,
    defaultModel: getDefaultModel(),
  });
}
