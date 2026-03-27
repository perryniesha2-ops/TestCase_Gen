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
type CoverageKey = keyof typeof COVERAGE_PROMPTS;

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
  coverage?: string;
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

// ─── Structured output schema ─────────────────────────────────────────────────

// Base schema shared by all platforms
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

// Extended schema for API platform — includes required "api" field
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

// ─── Constants ────────────────────────────────────────────────────────────────

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

const COVERAGE_PROMPTS = {
  standard:
    "Generate standard test cases covering the main functionality and common scenarios.",
  comprehensive:
    "Generate comprehensive test cases covering main functionality, edge cases, error handling, and validation scenarios.",
  exhaustive:
    "Generate exhaustive test cases covering all possible scenarios including main functionality, all edge cases, boundary conditions, error handling, security considerations, performance scenarios, and negative test cases.",
} as const;

// ─── Utilities ────────────────────────────────────────────────────────────────

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

// ─── Prompt building ──────────────────────────────────────────────────────────

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

function buildPlatformPrompt(params: {
  requirement: string;
  platformId: PlatformId;
  framework: string;
  testCaseCount: number;
  coverage: CoverageKey;
  apiContext?: string;
  templateText?: string;
}): string {
  const {
    requirement,
    platformId,
    framework,
    testCaseCount,
    coverage,
    apiContext,
    templateText,
  } = params;
  const coverageInstruction = COVERAGE_PROMPTS[coverage];
  const apiCtx = apiContext ? `\n\n${apiContext}` : "";
  const tmplCtx = templateText
    ? `\n\nTemplate structure:\n${templateText}`
    : "";

  return `${coverageInstruction}

You are a QA expert specialising in cross-platform testing.
Generate EXACTLY ${testCaseCount} test case${testCaseCount !== 1 ? "s" : ""} for the "${platformId}" platform using "${framework}".

Requirement:
${requirement}${apiCtx}${tmplCtx}

Call the generate_test_cases tool with a test_cases array containing EXACTLY ${testCaseCount} objects.
Each object must have: title, description, preconditions (array), steps (array), expected_results (array), automation_hints (array), priority.${platformId === "api" ? '\nEach object MUST also include a valid "api" object with at minimum "method" and "path".' : ""}`;
}

// ─── Structured LLM calls ─────────────────────────────────────────────────────

interface PlatformBatchResult {
  platformId: PlatformId;
  framework: string;
  cases: PlatformTestCase[];
  provider: "anthropic" | "openai";
  model: string;
  error?: string;
}

async function callAnthropic(
  modelId: string,
  prompt: string,
  isApi: boolean,
  expectedCount: number,
): Promise<PlatformTestCase[]> {
  const schema = buildResponseSchema(isApi);
  const res = await anthropic.messages.create({
    model: modelId,
    max_tokens: Math.min(32000, Math.max(4000, expectedCount * 600)),
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
  if (!toolUse) throw new Error("Anthropic did not call the tool");

  const input = toolUse.input as { test_cases?: PlatformTestCase[] };
  return input.test_cases ?? [];
}

async function callOpenAI(
  modelId: string,
  prompt: string,
  isApi: boolean,
  expectedCount: number,
): Promise<PlatformTestCase[]> {
  const schema = buildResponseSchema(isApi);
  const res = await openai.chat.completions.create({
    model: modelId,
    max_tokens: Math.min(16384, Math.max(4000, expectedCount * 600)),
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

async function callWithFallback(params: {
  modelKey: ModelKey;
  prompt: string;
  isApi: boolean;
  expectedCount: number;
  label: string;
}): Promise<{
  cases: PlatformTestCase[];
  provider: "anthropic" | "openai";
  model: string;
}> {
  const { modelKey, prompt, isApi, expectedCount, label } = params;
  const primaryIsAnthropic = isAnthropicModel(modelKey);
  const primaryModelId = getModelId(modelKey);
  const fallbackKey = getFallbackModel(
    primaryIsAnthropic ? "openai" : "anthropic",
  );
  const fallbackModelId = getModelId(fallbackKey);

  // Primary
  try {
    if (primaryIsAnthropic) {
      const cases = await callAnthropic(
        primaryModelId,
        prompt,
        isApi,
        expectedCount,
      );
      console.log(`[LLM] ${label}: anthropic OK, ${cases.length} cases`);
      return { cases, provider: "anthropic", model: primaryModelId };
    } else {
      const cases = await callOpenAI(
        primaryModelId,
        prompt,
        isApi,
        expectedCount,
      );
      console.log(`[LLM] ${label}: openai OK, ${cases.length} cases`);
      return { cases, provider: "openai", model: primaryModelId };
    }
  } catch (err) {
    console.error(`[LLM] ${label}: primary (${primaryModelId}) failed:`, err);
  }

  // Fallback
  try {
    if (primaryIsAnthropic) {
      const cases = await callOpenAI(
        fallbackModelId,
        prompt,
        isApi,
        expectedCount,
      );
      console.log(`[LLM] ${label}: openai fallback OK, ${cases.length} cases`);
      return { cases, provider: "openai", model: fallbackModelId };
    } else {
      const cases = await callAnthropic(
        fallbackModelId,
        prompt,
        isApi,
        expectedCount,
      );
      console.log(
        `[LLM] ${label}: anthropic fallback OK, ${cases.length} cases`,
      );
      return { cases, provider: "anthropic", model: fallbackModelId };
    }
  } catch (err) {
    console.error(
      `[LLM] ${label}: fallback (${fallbackModelId}) also failed:`,
      err,
    );
    throw new Error(`All LLM providers failed for ${label}`);
  }
}

// ─── Per-platform batch ───────────────────────────────────────────────────────

async function generateForPlatform(params: {
  platformData: PlatformConfig;
  requirement: string;
  testCaseCount: number;
  coverage: CoverageKey;
  modelKey: ModelKey;
  templateText: string;
}): Promise<PlatformBatchResult> {
  const {
    platformData,
    requirement,
    testCaseCount,
    coverage,
    modelKey,
    templateText,
  } = params;
  const platformId = platformData.platform as PlatformId;
  const framework = String(platformData.framework ?? "").trim();
  const isApi = platformId === "api";
  const label = `${platformId}/${framework}`;

  const apiContext = isApi
    ? buildApiContextBlock(
        platformData as Extract<PlatformConfig, { platform: "api" }>,
      )
    : undefined;

  const prompt = buildPlatformPrompt({
    requirement,
    platformId,
    framework,
    testCaseCount,
    coverage,
    apiContext,
    templateText: templateText || undefined,
  });

  try {
    const result = await callWithFallback({
      modelKey,
      prompt,
      isApi,
      expectedCount: testCaseCount,
      label,
    });

    // For API cases, run normalizeApiSpec so method/path are always clean
    let cases = result.cases;
    if (isApi) {
      cases = cases
        .map((tc) => ({
          ...tc,
          api: normalizeApiSpec(
            (tc as PlatformTestCase & { api?: unknown }).api,
          ),
        }))
        .filter((tc) => tc.api?.method && tc.api?.path) as PlatformTestCase[];

      if (cases.length < result.cases.length) {
        console.warn(
          `[${label}] Filtered ${result.cases.length - cases.length} invalid API cases`,
        );
      }
    }

    const { cases: _raw, ...resultMeta } = result;
    return {
      platformId,
      framework,
      cases: cases.slice(0, testCaseCount),
      ...resultMeta,
    };
  } catch (err) {
    console.error(`[${label}] Failed:`, err);
    return {
      platformId,
      framework,
      cases: [],
      provider: "anthropic",
      model: getModelId(modelKey),
      error: err instanceof Error ? err.message : String(err),
    };
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
    const testCaseCount = clampCount(Number(body.testCaseCount ?? 10), 1, 100);
    const coverage = (
      (body.coverage ?? "comprehensive") in COVERAGE_PROMPTS
        ? body.coverage
        : "comprehensive"
    ) as CoverageKey;
    const project_id = body.project_id || null;
    const templateText = await resolveTemplateText(
      supabase,
      user.id,
      String(body.template ?? ""),
    );

    // ── Validation ────────────────────────────────────────────────────────────
    if (!requirement) {
      return NextResponse.json(
        { error: "Requirement is required", field: "requirement" },
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

    // ── Usage quota ───────────────────────────────────────────────────────────
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
          error: e instanceof Error ? e.message : "Usage limit exceeded",
          upgradeRequired: true,
          remaining: 0,
          requested: requestedTotal,
        },
        { status: 429 },
      );
    }

    // ── Generate all platforms in parallel ────────────────────────────────────
    const firstWave = await Promise.allSettled(
      platforms.map((platformData) =>
        generateForPlatform({
          platformData,
          requirement,
          testCaseCount,
          coverage,
          modelKey,
          templateText,
        }),
      ),
    );

    // Collect results; retry any platform that hard-failed or came back empty
    const batchResults: PlatformBatchResult[] = [];
    const retryPlatforms: PlatformConfig[] = [];

    for (let i = 0; i < firstWave.length; i++) {
      const r = firstWave[i];
      if (
        r.status === "rejected" ||
        (r.status === "fulfilled" && r.value.cases.length === 0)
      ) {
        retryPlatforms.push(platforms[i]);
      } else if (r.status === "fulfilled") {
        batchResults.push(r.value);
      }
    }

    // Sequential retry for failed platforms
    for (const platformData of retryPlatforms) {
      console.warn(
        `[retry] ${platformData.platform}/${platformData.framework}`,
      );
      const retried = await generateForPlatform({
        platformData,
        requirement,
        testCaseCount,
        coverage,
        modelKey,
        templateText,
      });
      batchResults.push(retried);
    }

    // ── Save ──────────────────────────────────────────────────────────────────
    const apiCaseDetails: Array<{
      id?: string;
      title: string;
      api: ApiSpecOut;
    }> = [];
    let totalInserted = 0;
    const allInsertedCases: unknown[] = [];
    const generationResults: Array<{
      platform: string;
      framework: string;
      count: number;
      error?: string;
    }> = [];

    for (const batch of batchResults) {
      if (batch.cases.length === 0) {
        generationResults.push({
          platform: batch.platformId,
          framework: batch.framework,
          count: 0,
          error: batch.error ?? "No cases generated",
        });
        continue;
      }

      const rows = batch.cases.map((tc) =>
        buildInsertRow({
          platformId: batch.platformId,
          framework: batch.framework,
          tc,
          userId: user.id,
          projectId: project_id,
        }),
      );

      const { data: inserted, error: insertError } = await supabase
        .from("platform_test_cases")
        .insert(rows)
        .select("id, title, platform, framework, automation_metadata");

      if (insertError || !inserted) {
        console.error(
          `[DB] Insert failed for ${batch.platformId}/${batch.framework}:`,
          insertError,
        );
        generationResults.push({
          platform: batch.platformId,
          framework: batch.framework,
          count: 0,
          error: insertError?.message ?? "Insert failed",
        });
        continue;
      }

      if (batch.platformId === "api") {
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
        platform: batch.platformId,
        framework: batch.framework,
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
