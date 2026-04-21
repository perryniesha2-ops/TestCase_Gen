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
type ApiProtocol = "REST" | "SOAP" | "GraphQL" | "gRPC" | "WebSocket";
type ApiAuth =
  | "None"
  | "Basic"
  | "Bearer"
  | "OAuth2"
  | "API Key"
  | "mTLS"
  | "OAuth2 client_credentials";
type ApiFormat = "JSON" | "XML";

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

// test_types removed — coverage is AI-determined via area batching
type PlatformConfig =
  | { platform: Exclude<PlatformId, "api">; framework: string }
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

// ─── Coverage areas ───────────────────────────────────────────────────────────
//
// Mirrors generate-test-cases/route.ts — each batch gets a focus area so
// coverage is balanced without the user selecting test types.
// Areas are platform-aware: the prompt adds platform-specific guidance on top.

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

// Platform-specific guidance injected into every prompt for that platform
const PLATFORM_GUIDANCE: Record<PlatformId, string> = {
  web: `Platform context — WEB APPLICATION:
Generate browser-based test steps. Include:
- URL navigation and page load verification
- DOM interactions (clicks, form fills, selects)
- Cross-browser considerations where relevant
- Responsive/viewport behaviour where relevant`,

  mobile: `Platform context — MOBILE APP:
Generate mobile-specific test steps. Include:
- Touch interactions (tap, swipe, pinch)
- Device orientation changes where relevant
- OS-level permissions (camera, location, notifications)
- Network state changes (online/offline, slow connection)
- Background/foreground app lifecycle where relevant`,

  api: `Platform context — API / BACKEND:
Generate API-level test cases. Every case MUST include the "api" object with method and path.
Cover:
- Correct HTTP status codes for success and error conditions
- Request/response schema validation
- Authentication and authorization checks
- Idempotency and replay safety
- Rate limiting and pagination where relevant`,

  accessibility: `Platform context — ACCESSIBILITY (WCAG):
Generate accessibility test cases. Include:
- Keyboard navigation (Tab, Enter, Escape, arrow keys)
- Focus management and focus trapping in modals/dialogs
- Screen reader compatibility (ARIA roles, labels, live regions)
- Colour contrast ratios (4.5:1 for normal text, 3:1 for large)
- Form labels, error messages, and field associations
- Zoom and reflow at 400% magnification`,

  performance: `Platform context — PERFORMANCE:
Generate performance and load test cases. Include:
- Response time SLAs (e.g. page loads < 2s, API calls < 500ms)
- Load testing: expected concurrent user counts
- Stress testing: behaviour at 150% of expected load
- Spike testing: sudden traffic surges
- Resource usage: memory, CPU, connection pool limits
- Graceful degradation under load`,
};

// ─── Schema ───────────────────────────────────────────────────────────────────

const BASE_TEST_CASE_SCHEMA = {
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

const API_TEST_CASE_SCHEMA = {
  ...BASE_TEST_CASE_SCHEMA,
  required: [...BASE_TEST_CASE_SCHEMA.required, "api"],
  properties: {
    ...BASE_TEST_CASE_SCHEMA.properties,
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
      test_cases: {
        type: "array",
        items: isApi ? API_TEST_CASE_SCHEMA : BASE_TEST_CASE_SCHEMA,
      },
    },
  };
}

// ─── AI clients ───────────────────────────────────────────────────────────────

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

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

function clampCount(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.floor(Number(n) || 0)));
}

function looksLikeUuid(s: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    s,
  );
}

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

async function resolveTemplateText(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  templateMaybeId: string,
): Promise<string> {
  const trimmed = (templateMaybeId ?? "").trim();
  if (!trimmed) return "";
  if (looksLikeUuid(trimmed)) {
    const { data, error } = await supabase
      .from("test_case_templates")
      .select("template_content")
      .eq("id", trimmed)
      .eq("user_id", userId)
      .single();
    if (error) throw new Error(`Template lookup failed: ${error.message}`);
    return JSON.stringify(data?.template_content ?? {}, null, 2);
  }
  return trimmed;
}

// ─── Batch plan ───────────────────────────────────────────────────────────────
//
// Same pattern as generate-test-cases: split the per-platform count into
// batches of ≤5, each assigned a coverage area. All batches across ALL
// platforms fire in parallel — Promise.allSettled.

const BATCH_SIZE = 5;

interface BatchPlan {
  platformId: PlatformId;
  framework: string;
  batchIndex: number;
  totalBatches: number;
  count: number;
  area: (typeof COVERAGE_AREAS)[number];
  allAreaNames: string[];
  apiContext?: string;
  templateText: string;
  isApi: boolean;
}

function buildApiContextBlock(
  cfg: Extract<PlatformConfig, { platform: "api" }>,
): string {
  const protocol = normalizeApiProtocol(cfg.protocol);
  const auth = normalizeApiAuth(cfg.auth);
  const format = normalizeApiFormat(cfg.format);
  const checks = Array.isArray(cfg.required_checks)
    ? cfg.required_checks.map((c) => String(c).trim()).filter(Boolean)
    : [];
  const lines = [
    "API CONTEXT:",
    `- Protocol: ${protocol}`,
    `- Auth: ${auth}`,
    `- Payload format: ${format}`,
  ];
  if (cfg.contract && String(cfg.contract).trim())
    lines.push("- Contract: provided");
  if (checks.length) lines.push(`- Required checks: ${checks.join(", ")}`);
  return lines.join("\n");
}

function buildBatchPlan(
  platforms: PlatformConfig[],
  testCaseCount: number,
  templateText: string,
): BatchPlan[] {
  const plans: BatchPlan[] = [];

  for (const platformData of platforms) {
    const platformId = platformData.platform as PlatformId;
    const framework = String(platformData.framework ?? "").trim();
    const isApi = platformId === "api";
    const apiContext = isApi
      ? buildApiContextBlock(
          platformData as Extract<PlatformConfig, { platform: "api" }>,
        )
      : undefined;

    const numBatches = Math.ceil(testCaseCount / BATCH_SIZE);
    const areaNames = COVERAGE_AREAS.slice(0, numBatches).map((a) => a.name);

    let remaining = testCaseCount;
    for (let i = 0; i < numBatches; i++) {
      const count = Math.min(BATCH_SIZE, remaining);
      plans.push({
        platformId,
        framework,
        batchIndex: i,
        totalBatches: numBatches,
        count,
        area: COVERAGE_AREAS[i % COVERAGE_AREAS.length],
        allAreaNames: areaNames,
        apiContext,
        templateText,
        isApi,
      });
      remaining -= count;
    }
  }

  return plans;
}

// ─── Prompt builder ───────────────────────────────────────────────────────────

function buildBatchPrompt(params: {
  requirement: string;
  batch: BatchPlan;
}): string {
  const { requirement, batch } = params;
  const {
    platformId,
    framework,
    count,
    area,
    allAreaNames,
    batchIndex,
    totalBatches,
    apiContext,
    templateText,
    isApi,
  } = batch;

  const platformGuidance = PLATFORM_GUIDANCE[platformId] ?? "";
  const apiCtx = apiContext ? `\n\n${apiContext}` : "";
  const tmplCtx = templateText
    ? `\n\nTemplate structure:\n${templateText}`
    : "";
  const otherAreas = allAreaNames.filter((n) => n !== area.name);
  const dedupeCtx =
    otherAreas.length > 0
      ? `\nOther batches for this platform cover: ${otherAreas.join(", ")}. Do NOT duplicate — stay focused on ${area.label}.`
      : "";

  return `You are a senior QA engineer creating production-ready cross-platform test cases.

Requirement to test:
${requirement}${apiCtx}${tmplCtx}

${platformGuidance}

YOUR TASK — generate EXACTLY ${count} test case${count !== 1 ? "s" : ""} for the ${platformId.toUpperCase()} platform (${framework}) covering: ${area.label.toUpperCase()}

${area.instruction}
${dedupeCtx}

QUALITY RULES (apply to every case):
  ✓ Title is unique, specific, and self-explanatory
  ✓ Steps are sequential and complete — a tester can execute them without guessing
  ✓ Expected results clearly state what a PASS looks like
  ✓ Preconditions state any required setup
  ✓ Automation hints give framework-specific implementation guidance for ${framework}
  ✓ Use realistic, specific test data — not "valid input" or placeholder text${isApi ? '\n  ✓ Every case MUST include a valid "api" object with method and path' : ""}

Call the generate_test_cases tool with a test_cases array containing EXACTLY ${count} objects.`;
}

// ─── LLM callers ─────────────────────────────────────────────────────────────

async function callAnthropic(
  modelId: string,
  prompt: string,
  isApi: boolean,
  count: number,
): Promise<PlatformTestCase[]> {
  const schema = buildResponseSchema(isApi);
  const res = await anthropic.messages.create({
    model: modelId,
    max_tokens: Math.min(16000, Math.max(4000, count * 1000)),
    tools: [
      {
        name: "generate_test_cases",
        description: "Output the generated test cases as structured data.",
        input_schema: schema,
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
  const input = toolUse.input as { test_cases?: PlatformTestCase[] };
  return input.test_cases ?? [];
}

async function callOpenAI(
  modelId: string,
  prompt: string,
  isApi: boolean,
  count: number,
): Promise<PlatformTestCase[]> {
  const schema = buildResponseSchema(isApi);
  const res = await openai.chat.completions.create({
    model: modelId,
    max_tokens: Math.min(16000, Math.max(4000, count * 1000)),
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "generate_test_cases",
        strict: true,
        schema: schema as unknown as Record<string, unknown>,
      },
    },
    messages: [{ role: "user", content: prompt }],
  });
  const raw = res.choices?.[0]?.message?.content ?? "{}";
  const parsed = JSON.parse(raw) as { test_cases?: PlatformTestCase[] };
  return parsed.test_cases ?? [];
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
    return primaryIsAnthropic
      ? await callAnthropic(primaryId, prompt, isApi, count)
      : await callOpenAI(primaryId, prompt, isApi, count);
  } catch (err) {
    console.error(`[LLM] Primary ${primaryId} failed:`, err);
    return primaryIsAnthropic
      ? await callOpenAI(fallbackId, prompt, isApi, count)
      : await callAnthropic(fallbackId, prompt, isApi, count);
  }
}

// ─── Insert row builder ───────────────────────────────────────────────────────

function buildInsertRow(args: {
  platformId: PlatformId;
  framework: string;
  tc: PlatformTestCase;
  userId: string;
  projectId: string | null;
}) {
  const { platformId, framework, tc, userId, projectId } = args;
  const isApi = platformId === "api";

  if (isApi && (!tc.api?.method || !tc.api?.path)) {
    throw new Error(`API test case "${tc.title}" missing method or path`);
  }

  return {
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
    automation_metadata: isApi ? { api: tc.api } : {},
    user_id: userId,
    project_id: projectId,
  };
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
    const testCaseCount = clampCount(Number(body.testCaseCount ?? 10), 1, 20);
    const project_id = body.project_id || null;
    const templateText = await resolveTemplateText(
      supabase,
      user.id,
      String(body.template ?? ""),
    );

    // Validation
    if (!requirement)
      return NextResponse.json(
        { error: "Requirement is required", field: "requirement" },
        { status: 400 },
      );
    if (!platforms.length)
      return NextResponse.json(
        { error: "At least one platform is required", field: "platforms" },
        { status: 400 },
      );
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
    if (!isModelAllowed(modelKey))
      return NextResponse.json(
        { error: "Unsupported AI model", field: "model" },
        { status: 400 },
      );

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

    // Build the flat batch plan across all platforms
    const batchPlan = buildBatchPlan(platforms, testCaseCount, templateText);

    // Fire all batches in parallel — same pattern as generate-test-cases route
    const batchResults = await Promise.allSettled(
      batchPlan.map(async (batch) => {
        const prompt = buildBatchPrompt({ requirement, batch });
        const cases = await callLLM(modelKey, prompt, batch.isApi, batch.count);

        // For API cases, normalize and filter invalid entries
        const normalized = batch.isApi
          ? cases
              .map((tc) => ({ ...tc, api: normalizeApiSpec((tc as any).api) }))
              .filter((tc) => tc.api?.method && tc.api?.path)
          : cases;

        return {
          batch,
          cases: normalized.slice(0, batch.count) as PlatformTestCase[],
        };
      }),
    );

    // Group by platform — collect cases per platform then insert once per platform
    const byPlatform = new Map<
      string,
      { platformId: PlatformId; framework: string; cases: PlatformTestCase[] }
    >();

    for (const result of batchResults) {
      if (result.status === "rejected") {
        console.error("[gen] Batch failed:", result.reason);
        continue;
      }
      const { batch, cases } = result.value;
      const key = `${batch.platformId}/${batch.framework}`;
      if (!byPlatform.has(key)) {
        byPlatform.set(key, {
          platformId: batch.platformId,
          framework: batch.framework,
          cases: [],
        });
      }
      byPlatform.get(key)!.cases.push(...cases);
    }

    // Save all platforms
    const generationResults: Array<{
      platform: string;
      framework: string;
      count: number;
      error?: string;
    }> = [];
    const apiCaseDetails: Array<{
      id?: string;
      title: string;
      api: ApiSpecOut;
    }> = [];
    let totalInserted = 0;
    const allInsertedCases: unknown[] = [];

    for (const { platformId, framework, cases } of byPlatform.values()) {
      if (cases.length === 0) {
        generationResults.push({
          platform: platformId,
          framework,
          count: 0,
          error: "No cases generated",
        });
        continue;
      }

      // Trim to exact requested count per platform
      const trimmed = cases.slice(0, testCaseCount);

      const rows: ReturnType<typeof buildInsertRow>[] = [];
      for (const tc of trimmed) {
        try {
          rows.push(
            buildInsertRow({
              platformId,
              framework,
              tc,
              userId: user.id,
              projectId: project_id,
            }),
          );
        } catch (err) {
          console.warn(`[gen] Skipping case "${tc.title}":`, err);
        }
      }

      if (!rows.length) {
        generationResults.push({
          platform: platformId,
          framework,
          count: 0,
          error: "All cases failed validation",
        });
        continue;
      }

      const { data: inserted, error: insertError } = await supabase
        .from("platform_test_cases")
        .insert(rows)
        .select("id, title, platform, framework, automation_metadata");

      if (insertError || !inserted) {
        console.error(
          `[DB] Insert failed for ${platformId}/${framework}:`,
          insertError,
        );
        generationResults.push({
          platform: platformId,
          framework,
          count: 0,
          error: insertError?.message ?? "Insert failed",
        });
        continue;
      }

      if (platformId === "api") {
        for (const row of inserted as Array<{
          id?: string;
          title: string;
          automation_metadata?: { api?: unknown };
        }>) {
          const api = normalizeApiSpec(row.automation_metadata?.api);
          if (api) apiCaseDetails.push({ id: row.id, title: row.title, api });
        }
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
          error: "Failed to generate any test cases",
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
      platforms: platforms.map((p) => ({
        platform: p.platform,
        framework: p.framework,
      })),
      generation_results: generationResults,
      api_case_details: apiCaseDetails,
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
