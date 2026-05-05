// app/api/cross-platform-testing/route.ts
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
} from "@/lib/ai-models/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

// ─── Types ────────────────────────────────────────────────────────────────────

type PlatformId = "web" | "mobile" | "api" | "accessibility" | "performance";
type Priority = "low" | "medium" | "high" | "critical";
type ApiMethod =
  | "GET"
  | "POST"
  | "PUT"
  | "PATCH"
  | "DELETE"
  | "HEAD"
  | "OPTIONS";
type ApiAuth =
  | "None"
  | "Basic"
  | "Bearer"
  | "OAuth2"
  | "API Key"
  | "mTLS"
  | "OAuth2 client_credentials";
type ApiFormat = "JSON" | "XML";
type ApiProtocol = "REST" | "SOAP" | "GraphQL" | "gRPC" | "WebSocket";

type ApiAuthOut =
  | { type: "none" }
  | { type: "bearer"; tokenVar?: string }
  | { type: "apiKey"; headerName?: string; apiKeyVar?: string }
  | { type: "basic"; usernameVar?: string; passwordVar?: string }
  | { type: "oauth2"; tokenVar?: string };

type ApiSpecOut = {
  method: ApiMethod;
  path: string;
  headers?: Record<string, string>;
  query?: Record<string, string>;
  body?: unknown;
  auth?: ApiAuthOut;
  expectedStatus?: number;
};

type PlatformConfig =
  | { platform: string; framework: string }
  | {
      platform: "api";
      framework: string;
      protocol?: string;
      auth?: string;
      format?: string;
      contract?: string;
      required_checks?: string[];
    };

type RequestBody = {
  requirement?: string;
  platforms?: PlatformConfig[];
  model?: string;
  testCaseCount?: number | string;
  template?: string;
  title?: string;
  description?: string | null;
  project_id?: string | null;
};

interface PlatformTestCase {
  title: string;
  description: string;
  preconditions: string[];
  steps: string[];
  expected_results: string[];
  automation_hints?: string[];
  priority: Priority;
  api?: ApiSpecOut;
}

// ─── Content quality validation ───────────────────────────────────────────────

function validateRequirementContent(text: string): string | null {
  const trimmed = text.trim();
  const words = trimmed.split(/\s+/).filter((w) => w.length > 1);
  if (words.length < 5) {
    return "Requirement must contain at least 5 words. Please describe what you want to test.";
  }
  const maxPatternLen = Math.min(20, Math.floor(trimmed.length / 3));
  for (let len = 1; len <= maxPatternLen; len++) {
    const pattern = trimmed.slice(0, len);
    const repeated = pattern
      .repeat(Math.ceil(trimmed.length / len))
      .slice(0, trimmed.length);
    const matches = [...trimmed].filter((c, i) => c === repeated[i]).length;
    if (matches / trimmed.length > 0.9) {
      return "Requirement appears to contain repeated or random characters. Please enter a meaningful description.";
    }
  }
  const uniqueChars = new Set(trimmed.toLowerCase().replace(/\s/g, "")).size;
  if (
    trimmed.length > 50 &&
    uniqueChars / Math.min(trimmed.length, 100) < 0.08
  ) {
    return "Requirement appears to contain random or repeated characters. Please enter a meaningful description.";
  }
  const alphaOnly = (trimmed.match(/[a-zA-Z]/g) ?? []).length;
  const spaceRatio = (trimmed.match(/\s/g) ?? []).length / trimmed.length;
  if (
    trimmed.length > 100 &&
    alphaOnly / trimmed.length > 0.97 &&
    spaceRatio < 0.05
  ) {
    return "Requirement must contain actual sentences. Random strings of letters are not valid input.";
  }
  return null;
}

// ─── Coverage areas + platform guidance ──────────────────────────────────────

const COVERAGE_AREAS = [
  {
    name: "happy-path",
    label: "Core Flows",
    instruction: `Focus on HAPPY PATH and CORE FLOW scenarios:
- Valid inputs producing expected outputs
- Standard user journeys from start to finish
- Successful operations with correct data
- Normal workflow completion including confirmation/success states`,
  },
  {
    name: "negative",
    label: "Error Handling",
    instruction: `Focus on NEGATIVE and ERROR HANDLING scenarios:
- Missing or empty required fields
- Invalid data formats and wrong types
- Data exceeding limits (too long, too large)
- Attempting actions without required permissions or in wrong state
- Meaningful error messages shown to the user`,
  },
  {
    name: "boundary",
    label: "Boundary Values",
    instruction: `Focus on BOUNDARY VALUE scenarios:
- Numeric limits: min valid, min-1 (invalid), max valid, max+1 (invalid)
- String lengths: empty, single character, exactly at max, one over max
- Date edges: today, yesterday, far future, invalid dates (Feb 30, Feb 29 non-leap)
- File sizes: 0 bytes, just under limit, at limit, one byte over
- Collection limits: empty list, single item, exactly at max, one over`,
  },
  {
    name: "edge-case",
    label: "Edge Cases",
    instruction: `Focus on EDGE CASE and UNUSUAL SCENARIO testing:
- Special characters: apostrophes, quotes, ampersands, unicode (José O'Brien-Smith)
- Whitespace: leading/trailing spaces, multiple spaces, tabs, newlines
- Concurrent or rapid repeated actions (double-click, rapid navigation)
- Unexpected sequences: skip steps, go backwards, refresh mid-flow
- Empty states: no data in lists, first-time user experience`,
  },
  {
    name: "security",
    label: "Security",
    instruction: `Focus on SECURITY scenarios:
- SQL injection: ' OR '1'='1, '; DROP TABLE users;--
- XSS: <script>alert('XSS')</script>, <img onerror="alert(1)" src=x>
- Accessing resources without authentication (direct URL navigation)
- Horizontal privilege escalation: changing IDs in URLs to access other users' data
- Session management: session after logout, concurrent sessions`,
  },
  {
    name: "integration",
    label: "Integration & State",
    instruction: `Focus on INTEGRATION and STATE MANAGEMENT scenarios:
- Data persisting correctly after save and page refresh
- Changes in one area reflected correctly in related areas
- Multi-step workflows maintaining state between steps
- Actions triggering correct downstream effects (emails sent, counts updated)
- Undo/cancel operations correctly reverting state`,
  },
];

const PLATFORM_GUIDANCE: Record<string, string> = {
  web: `Platform context — WEB APPLICATION:
- URL navigation and page load verification
- DOM interactions (clicks, form fills, selects)
- Cross-browser considerations where relevant
- Responsive/viewport behaviour where relevant`,
  mobile: `Platform context — MOBILE APP:
- Touch interactions (tap, swipe, pinch)
- Device orientation changes where relevant
- OS-level permissions (camera, location, notifications)
- Network state changes (online/offline, slow connection)
- Background/foreground app lifecycle where relevant`,
  api: `Platform context — API / BACKEND:
Every case MUST include the "api" object with method and path.
- Correct HTTP status codes for success and error conditions
- Request/response schema validation
- Authentication and authorization checks
- Idempotency and replay safety
- Rate limiting and pagination where relevant`,
  accessibility: `Platform context — ACCESSIBILITY (WCAG):
- Keyboard navigation (Tab, Enter, Escape, arrow keys)
- Focus management and focus trapping in modals/dialogs
- Screen reader compatibility (ARIA roles, labels, live regions)
- Colour contrast ratios (4.5:1 for normal text, 3:1 for large)
- Form labels, error messages, and field associations
- Zoom and reflow at 400% magnification`,
  performance: `Platform context — PERFORMANCE:
- Response time SLAs (e.g. page loads < 2s, API calls < 500ms)
- Load testing: expected concurrent user counts
- Stress testing: behaviour at 150% of expected load
- Spike testing: sudden traffic surges
- Resource usage: memory, CPU, connection pool limits
- Graceful degradation under load`,
};

// ─── Schema ───────────────────────────────────────────────────────────────────

const BASE_SCHEMA = {
  type: "object",
  required: [
    "title",
    "description",
    "preconditions",
    "steps",
    "expected_results",
    "automation_hints",
    "priority",
  ],
  additionalProperties: false,
  properties: {
    title: { type: "string" },
    description: { type: "string" },
    preconditions: { type: "array", items: { type: "string" } },
    steps: { type: "array", items: { type: "string" } },
    expected_results: { type: "array", items: { type: "string" } },
    automation_hints: { type: "array", items: { type: "string" } },
    priority: { type: "string", enum: ["low", "medium", "high", "critical"] },
  },
};

const API_SCHEMA = {
  ...BASE_SCHEMA,
  required: [...BASE_SCHEMA.required, "api"],
  properties: {
    ...BASE_SCHEMA.properties,
    api: {
      type: "object",
      required: ["method", "path"],
      additionalProperties: false,
      properties: {
        method: {
          type: "string",
          enum: ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"],
        },
        path: { type: "string" },
        headers: { type: "object", additionalProperties: { type: "string" } },
        query: { type: "object", additionalProperties: { type: "string" } },
        body: { type: "object", additionalProperties: true },
        expectedStatus: { type: "integer" },
        auth: {
          type: "object",
          required: ["type"],
          additionalProperties: false,
          properties: {
            type: {
              type: "string",
              enum: ["none", "bearer", "apiKey", "basic", "oauth2"],
            },
            tokenVar: { type: "string" },
            headerName: { type: "string" },
            apiKeyVar: { type: "string" },
            usernameVar: { type: "string" },
            passwordVar: { type: "string" },
          },
        },
      },
    },
  },
};

function buildResponseSchema(isApi: boolean): Anthropic.Tool["input_schema"] {
  return {
    type: "object",
    required: ["test_cases"],
    additionalProperties: false,
    properties: {
      test_cases: { type: "array", items: isApi ? API_SCHEMA : BASE_SCHEMA },
    },
  };
}

// ─── Utilities ────────────────────────────────────────────────────────────────

const ALLOWED_METHODS = new Set<ApiMethod>([
  "GET",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
  "HEAD",
  "OPTIONS",
]);
const ALLOWED_PRIORITIES = new Set<Priority>([
  "low",
  "medium",
  "high",
  "critical",
]);

function normalizePriority(p: unknown): Priority {
  const s = (typeof p === "string" ? p : "").toLowerCase().trim();
  return ALLOWED_PRIORITIES.has(s as Priority) ? (s as Priority) : "medium";
}
function normalizeMethod(v: unknown): ApiMethod {
  const up = String(v ?? "")
    .trim()
    .toUpperCase();
  return ALLOWED_METHODS.has(up as ApiMethod) ? (up as ApiMethod) : "GET";
}
function normalizePath(v: unknown): string {
  const s = String(v ?? "").trim();
  if (!s) return "/";
  return s.startsWith("/") ? s : `/${s}`;
}
function safeRecord(v: unknown): Record<string, string> | undefined {
  if (!v || typeof v !== "object" || Array.isArray(v)) return undefined;
  const out: Record<string, string> = {};
  for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
    if (!k || val == null) continue;
    out[k] = String(val);
  }
  return Object.keys(out).length ? out : undefined;
}
function normalizeAuthOut(raw: unknown): ApiAuthOut | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const o = raw as Record<string, unknown>;
  const t = String(o.type ?? "bearer").toLowerCase();
  if (t === "none") return { type: "none" };
  if (t === "apikey")
    return {
      type: "apiKey",
      headerName: o.headerName ? String(o.headerName) : undefined,
      apiKeyVar: o.apiKeyVar ? String(o.apiKeyVar) : "apiKey",
    };
  if (t === "basic")
    return {
      type: "basic",
      usernameVar: o.usernameVar ? String(o.usernameVar) : "username",
      passwordVar: o.passwordVar ? String(o.passwordVar) : "password",
    };
  if (t === "oauth2")
    return {
      type: "oauth2",
      tokenVar: o.tokenVar ? String(o.tokenVar) : "token",
    };
  return {
    type: "bearer",
    tokenVar: o.tokenVar ? String(o.tokenVar) : "token",
  };
}
function normalizeApiSpec(v: unknown): ApiSpecOut | undefined {
  if (!v || typeof v !== "object") return undefined;
  const o = v as Record<string, unknown>;
  const method = normalizeMethod(o.method);
  const path = normalizePath(o.path);
  if (!path) return undefined;
  return {
    method,
    path,
    headers: safeRecord(o.headers),
    query: safeRecord(o.query),
    body: o.body,
    auth: normalizeAuthOut(o.auth),
    expectedStatus:
      typeof o.expectedStatus === "number" && Number.isFinite(o.expectedStatus)
        ? o.expectedStatus
        : undefined,
  };
}
function normalizeApiProtocol(v: unknown): ApiProtocol {
  const s = String(v ?? "")
    .trim()
    .toLowerCase();
  if (s === "soap") return "SOAP";
  if (s === "graphql") return "GraphQL";
  if (s === "grpc") return "gRPC";
  if (s === "websocket") return "WebSocket";
  return "REST";
}
function normalizeApiAuth(v: unknown): ApiAuth {
  const s = String(v ?? "")
    .trim()
    .toLowerCase();
  if (s === "none") return "None";
  if (s === "basic") return "Basic";
  if (s === "bearer") return "Bearer";
  if (s === "oauth2") return "OAuth2";
  if (s === "api key" || s === "apikey") return "API Key";
  if (s === "mtls") return "mTLS";
  if (s === "oauth2 client_credentials" || s === "client_credentials")
    return "OAuth2 client_credentials";
  return "Bearer";
}
function normalizeApiFormat(v: unknown): ApiFormat {
  return String(v ?? "")
    .trim()
    .toLowerCase() === "xml"
    ? "XML"
    : "JSON";
}

// ─── AI clients ───────────────────────────────────────────────────────────────

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

async function callAnthropic(
  modelId: string,
  prompt: string,
  isApi: boolean,
  count: number,
): Promise<PlatformTestCase[]> {
  const res = await anthropic.messages.create({
    model: modelId,
    max_tokens: Math.min(16000, Math.max(8000, count * 1600)),
    tools: [
      {
        name: "generate_test_cases",
        description: "Output the generated test cases as structured data.",
        input_schema: buildResponseSchema(isApi),
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
  return (
    (toolUse.input as { test_cases?: PlatformTestCase[] }).test_cases ?? []
  );
}

async function callOpenAI(
  modelId: string,
  prompt: string,
  isApi: boolean,
  count: number,
): Promise<PlatformTestCase[]> {
  const res = await openai.chat.completions.create({
    model: modelId,
    max_tokens: Math.min(16000, Math.max(8000, count * 1600)),
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "generate_test_cases",
        strict: true,
        schema: buildResponseSchema(isApi) as unknown as Record<
          string,
          unknown
        >,
      },
    },
    messages: [{ role: "user", content: prompt }],
  });
  const raw = res.choices?.[0]?.message?.content ?? "{}";
  return (
    (JSON.parse(raw) as { test_cases?: PlatformTestCase[] }).test_cases ?? []
  );
}

async function callLLM(
  modelKey: ModelKey,
  prompt: string,
  isApi: boolean,
  count: number,
): Promise<PlatformTestCase[]> {
  const primaryIsAnthropic = isAnthropicModel(modelKey);
  const primaryId = getModelId(modelKey);
  const fallbackKey = getFallbackModel(
    primaryIsAnthropic ? "openai" : "anthropic",
  );
  const fallbackId = getModelId(fallbackKey);

  try {
    const cases = primaryIsAnthropic
      ? await callAnthropic(primaryId, prompt, isApi, count)
      : await callOpenAI(primaryId, prompt, isApi, count);
    if (cases.length > 0) return cases;
    console.warn(
      `[LLM] Primary ${primaryId} returned 0 cases — trying fallback`,
    );
  } catch (err) {
    console.error(
      `[LLM] Primary ${primaryId} failed:`,
      (err as Error)?.message,
    );
  }

  try {
    const cases = primaryIsAnthropic
      ? await callOpenAI(fallbackId, prompt, isApi, count)
      : await callAnthropic(fallbackId, prompt, isApi, count);
    if (cases.length > 0) return cases;
    console.warn(`[LLM] Fallback ${fallbackId} also returned 0 cases`);
  } catch (err) {
    console.error(
      `[LLM] Fallback ${fallbackId} failed:`,
      (err as Error)?.message,
    );
  }

  return [];
}

// ─── Prompt builder ───────────────────────────────────────────────────────────

function buildApiContextBlock(cfg: PlatformConfig): string {
  const c = cfg as any;
  const lines = [
    "API CONTEXT:",
    `- Protocol: ${normalizeApiProtocol(c.protocol)}`,
    `- Auth: ${normalizeApiAuth(c.auth)}`,
    `- Payload format: ${normalizeApiFormat(c.format)}`,
  ];
  if (c.contract && String(c.contract).trim())
    lines.push("- Contract: provided");
  if (Array.isArray(c.required_checks) && c.required_checks.length) {
    lines.push(`- Required checks: ${c.required_checks.join(", ")}`);
  }
  return lines.join("\n");
}

function buildPrompt(params: {
  requirement: string;
  platformId: string;
  framework: string;
  count: number;
  isApi: boolean;
  apiContext?: string;
  templateText?: string;
}): string {
  const {
    requirement,
    platformId,
    framework,
    count,
    isApi,
    apiContext,
    templateText,
  } = params;

  const platformGuidance =
    PLATFORM_GUIDANCE[platformId] ??
    `Platform context — ${platformId.toUpperCase()}`;
  const apiCtx = apiContext ? `\n\n${apiContext}` : "";
  const tmplCtx = templateText
    ? `\n\nTemplate structure:\n${templateText}`
    : "";

  // Coverage distribution — same approach as regular generator
  const coverageInstructions = `
Distribute the ${count} test cases across these coverage areas:
  • HAPPY PATH (≈25%): Valid inputs, successful flows, correct operations
  • ERROR HANDLING (≈20%): Missing fields, invalid formats, permission errors
  • BOUNDARY VALUES (≈20%): Min/max limits, empty strings, date edges
  • EDGE CASES (≈20%): Special characters, whitespace, concurrent actions
  • SECURITY (≈15%): SQL injection, XSS, auth bypass, privilege escalation

Each test case must be unique — no duplicate scenarios.`;

  return `You are a senior QA engineer creating production-ready cross-platform test cases.

Requirement to test:
${requirement}${apiCtx}${tmplCtx}

${platformGuidance}

${coverageInstructions}

QUALITY RULES (apply to every case):
  ✓ Title is unique, specific, and self-explanatory
  ✓ Steps are sequential and complete — a tester can execute them without guessing
  ✓ Expected results clearly state what a PASS looks like
  ✓ Preconditions state any required setup
  ✓ Automation hints give framework-specific implementation guidance for ${framework}
  ✓ Use realistic, specific test data — not "valid input" or placeholder text${isApi ? '\n  ✓ Every case MUST include a valid "api" object with method and path' : ""}

Generate EXACTLY ${count} test cases for the ${platformId.toUpperCase()} platform (${framework}).
Call the generate_test_cases tool with a test_cases array of exactly ${count} objects.`;
}

// ─── Route handler ────────────────────────────────────────────────────────────

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
    const requirement = (body.requirement ?? "").trim();
    const platforms = Array.isArray(body.platforms) ? body.platforms : [];
    const rawModelKey = String(body.model ?? "").trim();
    const modelKey: ModelKey = rawModelKey
      ? migrateModelKey(rawModelKey)
      : getDefaultModel();
    const project_id = body.project_id || null;
    const template = (body.template ?? "").trim();
    const title = (body.title ?? "").trim();
    const description = body.description ?? null;

    // Strict count validation — reject anything not in the allowed set
    const rawCount = Number(body.testCaseCount ?? 10);
    if (
      !Number.isFinite(rawCount) ||
      !Number.isInteger(rawCount) ||
      rawCount < 1 ||
      rawCount > 20
    ) {
      return NextResponse.json(
        { error: "testCaseCount must be an integer between 1 and 20" },
        { status: 400 },
      );
    }
    const testCaseCount = rawCount;

    // Validation
    if (!requirement) {
      return NextResponse.json(
        { error: "Requirement is required", field: "requirement" },
        { status: 400 },
      );
    }
    const reqError = validateRequirementContent(requirement);
    if (reqError) {
      return NextResponse.json(
        { error: reqError, field: "requirement" },
        { status: 400 },
      );
    }
    if (!platforms.length) {
      return NextResponse.json(
        { error: "At least one platform is required", field: "platforms" },
        { status: 400 },
      );
    }
    for (const p of platforms) {
      if (!p?.platform || !p?.framework) {
        return NextResponse.json(
          {
            error: "Each platform must have a framework specified",
            field: "platforms",
          },
          { status: 400 },
        );
      }
    }
    if (!isModelAllowed(modelKey)) {
      return NextResponse.json(
        { error: "Unsupported AI model", field: "model" },
        { status: 400 },
      );
    }

    // Quota check
    const requestedTotal = testCaseCount * platforms.length;
    try {
      await checkUsageQuota(user.id, requestedTotal);
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
        {
          error: "Usage limit exceeded",
          upgradeRequired: true,
          remaining: 0,
          requested: requestedTotal,
        },
        { status: 429 },
      );
    }

    // Resolve template
    let templateText = "";
    if (template) {
      const isUuid =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
          template,
        );
      if (isUuid) {
        const { data } = await supabase
          .from("test_case_templates")
          .select("template_content")
          .eq("id", template)
          .eq("user_id", user.id)
          .maybeSingle();
        templateText = data?.template_content
          ? JSON.stringify(data.template_content, null, 2)
          : "";
      } else {
        templateText = template;
      }
    }

    // ── Wave 1: all platforms in parallel ─────────────────────────────────────
    type PlatformResult = {
      platformId: string;
      framework: string;
      isApi: boolean;
      cases: PlatformTestCase[];
    };

    const wave1 = await Promise.allSettled(
      platforms.map(async (platformData): Promise<PlatformResult> => {
        const platformId = platformData.platform;
        const framework = String(platformData.framework ?? "").trim();
        const isApi = platformId === "api";
        const apiContext = isApi
          ? buildApiContextBlock(platformData)
          : undefined;

        const prompt = buildPrompt({
          requirement,
          platformId,
          framework,
          count: testCaseCount,
          isApi,
          apiContext,
          templateText: templateText || undefined,
        });

        const cases = await callLLM(modelKey, prompt, isApi, testCaseCount);
        return { platformId, framework, isApi, cases };
      }),
    );

    // Separate successes from failures
    const successes: PlatformResult[] = [];
    const failedPlatforms: PlatformConfig[] = [];

    for (let i = 0; i < wave1.length; i++) {
      const result = wave1[i];
      if (result.status === "fulfilled" && result.value.cases.length > 0) {
        successes.push(result.value);
      } else {
        console.warn(
          `[cross-platform] Wave 1 failed for ${platforms[i].platform} — scheduling retry`,
        );
        failedPlatforms.push(platforms[i]);
      }
    }

    // ── Wave 2: retry only failed platforms ───────────────────────────────────
    for (const platformData of failedPlatforms) {
      const platformId = platformData.platform;
      const framework = String(platformData.framework ?? "").trim();
      const isApi = platformId === "api";
      const apiContext = isApi ? buildApiContextBlock(platformData) : undefined;

      console.log(`[cross-platform] Retrying ${platformId}…`);
      try {
        const cases = await callLLM(
          modelKey,
          buildPrompt({
            requirement,
            platformId,
            framework,
            count: testCaseCount,
            isApi,
            apiContext,
            templateText: templateText || undefined,
          }),
          isApi,
          testCaseCount,
        );
        if (cases.length > 0) {
          successes.push({ platformId, framework, isApi, cases });
          console.log(`[cross-platform] Retry succeeded for ${platformId}`);
        } else {
          console.error(
            `[cross-platform] Retry also returned 0 for ${platformId}`,
          );
        }
      } catch (err) {
        console.error(
          `[cross-platform] Retry threw for ${platformId}:`,
          (err as Error)?.message,
        );
      }
    }

    if (successes.length === 0) {
      return NextResponse.json(
        {
          error:
            "Generation failed — the AI provider may be busy. Please try again in a moment.",
        },
        { status: 503 },
      );
    }

    // ── Save all platforms ────────────────────────────────────────────────────
    const generationResults: Array<{
      platform: string;
      framework: string;
      count: number;
      error?: string;
    }> = [];
    let totalInserted = 0;
    const allInsertedCases: unknown[] = [];

    for (const { platformId, framework, isApi, cases } of successes) {
      // Normalize API spec on all cases
      const normalized = isApi
        ? cases
            .map((tc) => ({ ...tc, api: normalizeApiSpec((tc as any).api) }))
            .filter((tc) => (tc as any).api?.method && (tc as any).api?.path)
        : cases;

      if (!normalized.length) {
        generationResults.push({
          platform: platformId,
          framework,
          count: 0,
          error: "All cases failed API spec validation",
        });
        continue;
      }

      const rows = normalized.slice(0, testCaseCount).map((tc) => ({
        platform: platformId,
        framework,
        title: tc.title || "Untitled Test",
        description: tc.description || "",
        preconditions: Array.isArray(tc.preconditions) ? tc.preconditions : [],
        steps: Array.isArray(tc.steps) ? tc.steps : [],
        expected_results: Array.isArray(tc.expected_results)
          ? tc.expected_results
          : [],
        automation_hints: Array.isArray(tc.automation_hints)
          ? tc.automation_hints
          : [],
        priority: normalizePriority(tc.priority),
        status: "draft",
        automation_metadata: isApi ? { api: (tc as any).api } : {},
        user_id: user.id,
        project_id,
      }));

      const { data: inserted, error: insertError } = await supabase
        .from("platform_test_cases")
        .insert(rows)
        .select("id, title, platform, framework");

      if (insertError || !inserted) {
        console.error(
          `[cross-platform] DB insert failed for ${platformId}/${framework}:`,
          insertError?.message,
        );
        generationResults.push({
          platform: platformId,
          framework,
          count: 0,
          error: insertError?.message ?? "Insert failed",
        });
        continue;
      }

      totalInserted += inserted.length;
      allInsertedCases.push(...inserted);
      generationResults.push({
        platform: platformId,
        framework,
        count: inserted.length,
      });
    }

    if (totalInserted === 0) {
      return NextResponse.json(
        {
          error: "Failed to save any test cases",
          generation_results: generationResults,
        },
        { status: 500 },
      );
    }

    await recordSuccessfulGeneration(user.id, totalInserted).catch(() => {});

    const successfulPlatforms = generationResults.filter(
      (r) => r.count > 0,
    ).length;

    return NextResponse.json({
      success: true,
      total_test_cases: totalInserted,
      test_cases: allInsertedCases,
      generation_results: generationResults,
      message: `Successfully generated ${totalInserted} cross-platform test cases across ${successfulPlatforms} platform(s)`,
    });
  } catch (error) {
    console.error("Cross-platform generation error:", error);
    return NextResponse.json(
      {
        error: "Unexpected error. Please try again.",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
