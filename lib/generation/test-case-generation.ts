// lib/generation/test-case-generation.ts

import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import {
  getModelId,
  isAnthropicModel,
  getFallbackModel,
  type ModelKey,
} from "@/lib/ai-models/config";

// ─── Types ────────────────────────────────────────────────────────────────────

export type Priority = "low" | "medium" | "high" | "critical";

export interface TestStep {
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

export interface GeneratedTestCase {
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

// ─── Constants ────────────────────────────────────────────────────────────────

// Batch size intentionally kept at 5 — larger batches increase token usage and
// truncation risk. Oversampling (requesting 6 when we need 5) handles partial returns.
export const BATCH_SIZE = 5;

// How many extra cases to request per batch to absorb partial returns.
// Requesting 6 when we need 5 means we still hit the target even if one is dropped.
const OVERSAMPLE = 1;

export const PRIORITY_VALUES = new Set<Priority>([
  "low",
  "medium",
  "high",
  "critical",
]);
export const PRIORITY_ALIASES: Record<string, Priority> = {
  p0: "critical",
  blocker: "critical",
  p1: "high",
  p2: "medium",
  p3: "low",
};

// ─── Coverage areas ───────────────────────────────────────────────────────────

export const COVERAGE_AREAS = [
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

export const RESPONSE_SCHEMA: Anthropic.Tool["input_schema"] = {
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

export function buildPrompt(params: {
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

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

async function callAnthropic(
  modelId: string,
  prompt: string,
  count: number,
): Promise<GeneratedTestCase[]> {
  const res = await anthropic.messages.create({
    model: modelId,
    // Generous token budget — verbose steps with selectors and assertions
    // consume more than the bare minimum. Truncation causes 0-case returns.
    max_tokens: Math.min(16000, Math.max(8000, count * 2000)),
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
    max_tokens: Math.min(16000, Math.max(8000, count * 2000)),
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

// callLLM tries the primary provider. If it fails OR returns 0 cases, it
// immediately tries the fallback. Both providers must fail for this to return [].
export async function callLLM(
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
    const cases = primaryIsAnthropic
      ? await callAnthropic(primaryId, prompt, count)
      : await callOpenAI(primaryId, prompt, count);
    if (cases.length > 0) return cases;
    console.warn(
      `[LLM] Primary ${primaryId} returned 0 cases — trying fallback`,
    );
  } catch (err) {
    console.error(
      `[LLM] Primary ${primaryId} failed:`,
      (err as Error)?.message ?? err,
    );
  }

  try {
    const cases = primaryIsAnthropic
      ? await callOpenAI(fallbackId, prompt, count)
      : await callAnthropic(fallbackId, prompt, count);
    if (cases.length > 0) return cases;
    console.warn(`[LLM] Fallback ${fallbackId} also returned 0 cases`);
  } catch (err) {
    console.error(
      `[LLM] Fallback ${fallbackId} failed:`,
      (err as Error)?.message ?? err,
    );
  }

  return [];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function normalizePriority(p: unknown): Priority {
  const s = (typeof p === "string" ? p : "").toLowerCase().trim();
  if (PRIORITY_ALIASES[s]) return PRIORITY_ALIASES[s];
  return PRIORITY_VALUES.has(s as Priority) ? (s as Priority) : "medium";
}

export interface BatchPlan {
  batchIndex: number;
  count: number; // cases to request from LLM (includes oversample buffer)
  targetCount: number; // cases we actually want to keep from this batch
  area: (typeof COVERAGE_AREAS)[number];
}

export function buildBatchPlan(totalCount: number): BatchPlan[] {
  const numBatches = Math.ceil(totalCount / BATCH_SIZE);
  const plans: BatchPlan[] = [];
  let remaining = totalCount;

  for (let i = 0; i < numBatches; i++) {
    const targetCount = Math.min(BATCH_SIZE, remaining);
    // Request slightly more than needed — absorbs partial returns from the LLM
    // without generating visible duplicates (we trim back to targetCount after)
    const count = Math.min(BATCH_SIZE + OVERSAMPLE, targetCount + OVERSAMPLE);
    plans.push({
      batchIndex: i,
      count,
      targetCount,
      area: COVERAGE_AREAS[i % COVERAGE_AREAS.length],
    });
    remaining -= targetCount;
  }

  return plans;
}
