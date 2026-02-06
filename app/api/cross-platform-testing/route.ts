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

// ----- Types -----
type PlatformId = "web" | "mobile" | "api" | "accessibility" | "performance";

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

type ApiMethod =
  | "GET"
  | "POST"
  | "PUT"
  | "PATCH"
  | "DELETE"
  | "HEAD"
  | "OPTIONS";

type PlatformConfig =
  | {
      platform: Exclude<PlatformId, "api">;
      framework: string;
    }
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

interface PlatformTestCase {
  title: string;
  description: string;
  preconditions: string[];
  steps: string[];
  expected_results: string[];
  automation_hints?: string[];
  priority: "low" | "medium" | "high" | "critical";
  api?: ApiSpecOut;
}

// ----- Helpers -----
const ALLOWED_METHODS = new Set<ApiMethod>([
  "GET",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
  "HEAD",
  "OPTIONS",
]);

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
    if (!k) continue;
    if (val == null) continue;
    out[k] = String(val);
  }
  return Object.keys(out).length ? out : undefined;
}

function normalizeApiSpec(v: unknown): ApiSpecOut | undefined {
  if (!v || typeof v !== "object") return undefined;
  const o = v as Record<string, unknown>;

  const method = normalizeMethod(o.method);
  const path = normalizePath(o.path);

  const headers = safeRecord(o.headers);
  const query = safeRecord(o.query);

  const authRaw = o.auth as any;
  const auth: ApiAuthOut | undefined =
    authRaw && typeof authRaw === "object"
      ? (() => {
          const t = String(authRaw.type ?? "bearer").toLowerCase();
          if (t === "none") return { type: "none" };
          if (t === "apikey") {
            return {
              type: "apiKey",
              headerName: authRaw.headerName
                ? String(authRaw.headerName)
                : undefined,
              apiKeyVar: authRaw.apiKeyVar
                ? String(authRaw.apiKeyVar)
                : "apiKey",
            };
          }
          if (t === "basic") {
            return {
              type: "basic",
              usernameVar: authRaw.usernameVar
                ? String(authRaw.usernameVar)
                : "username",
              passwordVar: authRaw.passwordVar
                ? String(authRaw.passwordVar)
                : "password",
            };
          }
          if (t === "oauth2") {
            return {
              type: "oauth2",
              tokenVar: authRaw.tokenVar ? String(authRaw.tokenVar) : "token",
            };
          }
          return {
            type: "bearer",
            tokenVar: authRaw.tokenVar ? String(authRaw.tokenVar) : "token",
          };
        })()
      : undefined;

  const expectedStatus =
    typeof o.expectedStatus === "number" && Number.isFinite(o.expectedStatus)
      ? o.expectedStatus
      : undefined;

  const body = o.body;

  return {
    method,
    path,
    headers,
    query,
    body,
    auth,
    expectedStatus,
  };
}

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
  return blocks
    .filter(isAnthropicTextBlock)
    .map((b) => b.text)
    .join("\n\n")
    .trim();
}

const ALLOWED_PRIORITIES = new Set([
  "low",
  "medium",
  "high",
  "critical",
] as const);
type Priority = "low" | "medium" | "high" | "critical";

function normalizePriority(p: unknown): Priority {
  const s = (typeof p === "string" ? p : "").toLowerCase().trim();
  return ALLOWED_PRIORITIES.has(s as Priority) ? (s as Priority) : "medium";
}

const COVERAGE_PROMPTS = {
  standard:
    "Generate standard test cases covering the main functionality and common scenarios.",
  comprehensive:
    "Generate comprehensive test cases covering main functionality, edge cases, error handling, and validation scenarios.",
  exhaustive:
    "Generate exhaustive test cases covering all possible scenarios including main functionality, all edge cases, boundary conditions, error handling, security considerations, performance scenarios, and negative test cases.",
} as const;

type CoverageKey = keyof typeof COVERAGE_PROMPTS;

// ----- Clients -----
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

function clampCount(n: number, min: number, max: number) {
  const x = Math.floor(Number(n) || 0);
  return Math.min(max, Math.max(min, x));
}

function looksLikeUuid(s: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    s,
  );
}

async function resolveTemplateText(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  templateMaybeId: string,
) {
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

function normalizeApiProtocol(v: unknown): ApiProtocol | null {
  const s = String(v ?? "")
    .trim()
    .toLowerCase();
  if (s === "rest") return "REST";
  if (s === "soap") return "SOAP";
  if (s === "graphql") return "GraphQL";
  if (s === "grpc") return "gRPC";
  if (s === "websocket") return "WebSocket";
  return null;
}

function normalizeApiAuth(v: unknown): ApiAuth | null {
  const s = String(v ?? "")
    .trim()
    .toLowerCase();

  if (s === "none") return "None";
  if (s === "basic") return "Basic";
  if (s === "bearer") return "Bearer";
  if (s === "oauth2") return "OAuth2";
  if (s === "api key" || s === "apikey") return "API Key";
  if (s === "mtls") return "mTLS";
  if (s === "oauth2 client_credentials" || s === "client_credentials") {
    return "OAuth2 client_credentials";
  }
  return null;
}

function normalizeApiFormat(v: unknown): ApiFormat | null {
  const s = String(v ?? "")
    .trim()
    .toLowerCase();
  if (s === "json") return "JSON";
  if (s === "xml") return "XML";
  return null;
}

function buildApiContextBlock(
  cfg: Extract<PlatformConfig, { platform: "api" }>,
) {
  const protocol = normalizeApiProtocol(cfg.protocol) ?? "REST";
  const auth = normalizeApiAuth(cfg.auth) ?? "Bearer";
  const format = normalizeApiFormat(cfg.format) ?? "JSON";

  const checks = Array.isArray(cfg.required_checks)
    ? cfg.required_checks.map((c) => String(c).trim()).filter(Boolean)
    : [];

  const lines: string[] = [
    "API CONTEXT (use this for API test generation)",
    `- Protocol: ${protocol}`,
    `- Auth: ${auth}`,
    `- Payload: ${format}`,
  ];

  if (cfg.contract && String(cfg.contract).trim()) {
    lines.push(`- Contract: provided`);
  }
  if (checks.length) {
    lines.push(`- Required checks: ${checks.join(", ")}`);
  }

  return lines.join("\n");
}

function buildStructurePrompt(isApi: boolean, rawText: string) {
  if (isApi) {
    return `Convert the following test cases into a structured JSON object.

CRITICAL: For API platform, each test case MUST include a complete "api" object.

Required "api" fields:
- method: Must be one of GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS
- path: Relative path starting with / (e.g. "/v1/users" or "/address/verify")

Optional "api" fields:
- headers: Object with header key-value pairs
- query: Object with query parameter key-value pairs  
- body: JSON object (for POST/PUT/PATCH)
- auth: Object with type and credentials
- expectedStatus: Number (default 200)

Example valid API object:
{
  "method": "POST",
  "path": "/v1/address/verify",
  "headers": {
    "Content-Type": "application/json"
  },
  "query": {
    "format": "json"
  },
  "body": {
    "address": "123 Main St",
    "city": "Boston",
    "state": "MA"
  },
  "auth": {
    "type": "apiKey",
    "headerName": "x-api-key",
    "apiKeyVar": "apiKey"
  },
  "expectedStatus": 200
}

Return format:
{
  "test_cases": [
    {
      "title": "Verify valid US address",
      "description": "Test address validation with complete US address",
      "preconditions": ["API key is valid", "Service is available"],
      "steps": ["Send POST request with address data", "Verify response format"],
      "expected_results": ["Status 200", "Valid address returned"],
      "automation_hints": ["Check ZIP code format", "Validate state abbreviation"],
      "priority": "high",
      "api": {
        "method": "POST",
        "path": "/v1/address/verify",
        "headers": { "Content-Type": "application/json" },
        "body": { "address": "123 Main St", "city": "Boston", "state": "MA" },
        "auth": { "type": "apiKey", "headerName": "x-api-key", "apiKeyVar": "apiKey" },
        "expectedStatus": 200
      }
    }
  ]
}

Test Cases to Convert:
${rawText}

IMPORTANT: Every test case MUST have a valid "api" object with "method" and "path" fields.
Return ONLY valid JSON, no markdown, no explanation.`;
  }

  return `Convert the following test cases into a structured JSON object.

Return format:
{
  "test_cases": [
    {
      "title": "string",
      "description": "string",
      "preconditions": ["string"],
      "steps": ["string"],
      "expected_results": ["string"],
      "automation_hints": ["string"],
      "priority": "low|medium|high|critical"
    }
  ]
}

Test Cases to Convert:
${rawText}

Return ONLY valid JSON, no markdown, no explanation.`;
}

async function structureTestCasesWithOpenAI(
  rawText: string,
  isApi: boolean,
): Promise<PlatformTestCase[]> {
  const structurePrompt = buildStructurePrompt(isApi, rawText);

  try {
    const structured = await openai.chat.completions.create({
      model: "gpt-4o-mini-2024-07-18",
      messages: [{ role: "user", content: structurePrompt }],
      response_format: { type: "json_object" },
      max_tokens: 4096,
    });

    const content = structured.choices?.[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(content) as {
      test_cases?: PlatformTestCase[];
      testCases?: PlatformTestCase[];
    };

    const parsedCases = Array.isArray(parsed.test_cases)
      ? parsed.test_cases
      : Array.isArray(parsed.testCases)
        ? parsed.testCases
        : [];

    return isApi
      ? parsedCases.map((tc) => ({
          ...tc,
          api: normalizeApiSpec((tc as any).api),
        }))
      : parsedCases;
  } catch {
    return [];
  }
}

function buildInsertRow(args: {
  platformId: PlatformId;
  framework: string;
  tc: PlatformTestCase;
  userId: string;
  projectId: string | null;
}) {
  const { platformId, framework, tc, userId, projectId } = args;
  const isApi = platformId === "api";

  if (isApi) {
    if (!tc.api || !tc.api.method || !tc.api.path) {
      throw new Error(
        `API test case "${tc.title}" missing method or path. Got: ${JSON.stringify(tc.api)}`,
      );
    }
  }

  const automation_metadata = isApi ? { api: tc.api } : {};

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
    automation_metadata,
    user_id: userId,
    project_id: projectId,
  };
}

// ----- Handler -----
export async function POST(request: Request) {
  const apiCaseDetails: Array<{ id?: string; title: string; api: ApiSpecOut }> =
    [];

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

    const body = (await request.json()) as RequestBody;

    const requirement = (body.requirement ?? "").trim();
    const platforms = Array.isArray(body.platforms) ? body.platforms : [];
    const rawModelKey = String(body.model ?? "").trim();
    const modelKey: ModelKey = rawModelKey
      ? migrateModelKey(rawModelKey)
      : getDefaultModel();
    const testCaseCount = clampCount(Number(body.testCaseCount ?? 10), 1, 100);
    const coverage = (body.coverage as CoverageKey) || "comprehensive";
    const project_id = body.project_id || null;
    const templateText = await resolveTemplateText(
      supabase,
      user.id,
      String(body.template ?? ""),
    );

    // Validation
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

    if (!(coverage in COVERAGE_PROMPTS)) {
      return NextResponse.json(
        { error: "Invalid coverage level", field: "coverage" },
        { status: 400 },
      );
    }

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
            usage: {
              requested: requestedTotal,
              perPlatform: testCaseCount,
              platforms: platforms.length,
            },
          },
          { status: 429 },
        );
      }

      // Generic error fallback
      const msg = e instanceof Error ? e.message : "Usage limit exceeded";
      return NextResponse.json(
        {
          error: msg,
          upgradeRequired: true,
          remaining: 0,
          requested: requestedTotal,
          usage: {
            requested: requestedTotal,
            perPlatform: testCaseCount,
            platforms: platforms.length,
          },
        },
        { status: 429 },
      );
    }

    // Provider routing (from central config)
    const selectedModelId = getModelId(modelKey);
    const primary: "anthropic" | "openai" = isAnthropicModel(modelKey)
      ? "anthropic"
      : "openai";

    const fallbackProvider: "anthropic" | "openai" =
      primary === "anthropic" ? "openai" : "anthropic";

    const fallbackModelKey = getFallbackModel(fallbackProvider);
    const fallbackModelId = getModelId(fallbackModelKey);

    let totalInserted = 0;
    const allInsertedCases: any[] = [];
    const generationResults: Array<{
      platform: string;
      framework: string;
      count: number;
      error?: string;
    }> = [];

    for (const platformData of platforms) {
      const platformId = platformData.platform as PlatformId;
      const framework = String(platformData.framework ?? "").trim();
      const isApi = platformId === "api";

      try {
        const coverageInstruction = COVERAGE_PROMPTS[coverage];
        const templateInstruction = templateText
          ? `\n\nUse this template structure:\n${templateText}`
          : "";

        const apiContext = isApi
          ? `\n\n${buildApiContextBlock(
              platformData as Extract<PlatformConfig, { platform: "api" }>,
            )}`
          : "";

        const promptUsed = `${coverageInstruction}

You are a QA expert specializing in cross-platform testing.
Generate EXACTLY ${testCaseCount} test cases for the requirement on the "${platformId}" platform using "${framework}".

Requirement:
${requirement}${apiContext}${templateInstruction}

For each test case, provide:
- title
- description
- preconditions (array of strings)
- steps (array of strings)
- expected_results (array of strings)
- automation_hints (array of strings)
- priority (low, medium, high, critical)

Return plain text test cases (no JSON).`;

        // Call LLM
        let rawText = "";
        try {
          if (primary === "anthropic") {
            const res = await anthropic.messages.create({
              model: selectedModelId,
              max_tokens: 4096,
              messages: [{ role: "user", content: promptUsed }],
            });
            rawText = anthropicTextFromContent(res.content);
          } else {
            const res = await openai.chat.completions.create({
              model: selectedModelId,
              messages: [{ role: "user", content: promptUsed }],
              max_tokens: 4096,
            });
            rawText = res.choices?.[0]?.message?.content ?? "";
          }
        } catch {
          if (fallbackProvider === "anthropic") {
            const res = await anthropic.messages.create({
              model: fallbackModelId,
              max_tokens: 4096,
              messages: [{ role: "user", content: promptUsed }],
            });
            rawText = anthropicTextFromContent(res.content);
          } else {
            const res = await openai.chat.completions.create({
              model: fallbackModelId,
              messages: [{ role: "user", content: promptUsed }],
              max_tokens: 4096,
            });
            rawText = res.choices?.[0]?.message?.content ?? "";
          }
        }

        // Structure / normalize JSON
        let testCases = await structureTestCasesWithOpenAI(rawText, isApi);

        if (testCases.length > testCaseCount)
          testCases = testCases.slice(0, testCaseCount);

        if (testCases.length === 0) {
          generationResults.push({
            platform: platformId,
            framework,
            count: 0,
            error: "No test cases generated",
          });
          continue;
        }

        const testCasesToInsert = testCases.map((tc) =>
          buildInsertRow({
            platformId,
            framework,
            tc,
            userId: user.id,
            projectId: project_id,
          }),
        );

        const { data: insertedCases, error: insertError } = await supabase
          .from("platform_test_cases")
          .insert(testCasesToInsert)
          .select("id, title, platform, framework, automation_metadata");

        if (insertError) {
          generationResults.push({
            platform: platformId,
            framework,
            count: 0,
            error: insertError.message,
          });
          continue;
        }

        if (isApi && Array.isArray(insertedCases)) {
          for (const row of insertedCases as any[]) {
            const api = normalizeApiSpec(row?.automation_metadata?.api);
            if (api) {
              apiCaseDetails.push({
                id: row.id,
                title: row.title,
                api,
              });
            }
          }
        }

        const insertedCount = insertedCases?.length ?? 0;
        totalInserted += insertedCount;
        allInsertedCases.push(...(insertedCases || []));
        generationResults.push({
          platform: platformId,
          framework,
          count: insertedCount,
        });
      } catch (err) {
        generationResults.push({
          platform: String((platformData as any)?.platform ?? "unknown"),
          framework: String((platformData as any)?.framework ?? "unknown"),
          count: 0,
          error: err instanceof Error ? err.message : "Unknown error",
        });
      }
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
    try {
      await recordSuccessfulGeneration(user.id, totalInserted);
    } catch (recordError) {
      console.error("Failed to record usage:", recordError);
    }

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
