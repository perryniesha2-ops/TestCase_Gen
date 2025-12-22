// app/api/cross-platform-testing/route.ts
import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import Anthropic from "@anthropic-ai/sdk"
import OpenAI from "openai"
import { usageTracker } from "@/lib/usage-tracker"

export const runtime = "nodejs"

// ----- Types -----
interface PlatformTestCase {
  title: string
  description: string
  preconditions: string[]
  steps: string[]
  expected_results: string[]
  automation_hints?: string[]
  priority: "low" | "medium" | "high" | "critical"
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
  )
}

function anthropicTextFromContent(blocks: unknown): string {
  if (!Array.isArray(blocks)) return ""
  return blocks.filter(isAnthropicTextBlock).map((b) => b.text).join("\n\n").trim()
}

const ALLOWED_PRIORITIES = new Set(["low", "medium", "high", "critical"] as const)
type Priority = "low" | "medium" | "high" | "critical"

function normalizePriority(p: unknown): Priority {
  const s = (typeof p === "string" ? p : "").toLowerCase().trim()
  return ALLOWED_PRIORITIES.has(s as Priority) ? (s as Priority) : "medium"
}

const COVERAGE_PROMPTS = {
  standard: "Generate standard test cases covering the main functionality and common scenarios.",
  comprehensive:
    "Generate comprehensive test cases covering main functionality, edge cases, error handling, and validation scenarios.",
  exhaustive:
    "Generate exhaustive test cases covering all possible scenarios including main functionality, all edge cases, boundary conditions, error handling, security considerations, performance scenarios, and negative test cases.",
} as const

type CoverageKey = keyof typeof COVERAGE_PROMPTS

const AI_MODELS = {
  "claude-sonnet-4-5": "claude-sonnet-4-5-20250514",
  "claude-haiku-4-5": "claude-haiku-4-5-20250514",
  "claude-opus-4-5": "claude-opus-4-5-20250514",

  "gpt-5-mini": "gpt-5-mini",
  "gpt-5.2": "gpt-5.2",
  "gpt-4o": "gpt-4o-2024-11-20",
  "gpt-4o-mini": "gpt-4o-mini-2024-07-18",

  "claude-3-5-sonnet-20241022": "claude-3-5-sonnet-20241022",
  "claude-3-5-haiku-20241022": "claude-3-5-haiku-20241022",
} as const

type ModelKey = keyof typeof AI_MODELS

const DEFAULT_MODEL: ModelKey = "claude-sonnet-4-5"
const FALLBACK_CLAUDE = "claude-sonnet-4-5-20250514"
const FALLBACK_GPT = "gpt-4o-2024-11-20"

// ----- Clients -----
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! })

function clampCount(n: number, min: number, max: number) {
  const x = Math.floor(Number(n) || 0)
  return Math.min(max, Math.max(min, x))
}

// ----- Handler -----
export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    // Auth
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Input
    const body = (await request.json()) as {
      requirement?: string
      platforms?: Array<{ platform: string; framework: string }>
      model?: string
      testCaseCount?: number | string
      coverage?: string
      template?: string
    }

    const requirement = (body.requirement ?? "").trim()
    const platforms = Array.isArray(body.platforms) ? body.platforms : []
    const modelKey = (body.model as ModelKey) || DEFAULT_MODEL
    const testCaseCount = clampCount(Number(body.testCaseCount ?? 10), 1, 50)
    const coverage = (body.coverage as CoverageKey) || "comprehensive"
    const template = (body.template ?? "").trim()

    // Validation
    if (!requirement) {
      return NextResponse.json({ error: "Requirement is required", field: "requirement" }, { status: 400 })
    }
    if (!platforms.length) {
      return NextResponse.json({ error: "At least one platform is required", field: "platforms" }, { status: 400 })
    }
    for (const p of platforms) {
      if (!p?.platform || !p?.framework) {
        return NextResponse.json(
          { error: "Each platform must have a framework specified", field: "platforms" },
          { status: 400 }
        )
      }
    }
    if (!(modelKey in AI_MODELS)) {
      return NextResponse.json({ error: "Unsupported AI model", field: "model" }, { status: 400 })
    }
    if (!(coverage in COVERAGE_PROMPTS)) {
      return NextResponse.json({ error: "Invalid coverage level", field: "coverage" }, { status: 400 })
    }

    // ---- Quota check BEFORE creating suite / generating ----
    const requestedTotal = testCaseCount * platforms.length
    const quota = await usageTracker.canGenerateTestCases(user.id, requestedTotal)

    if (!quota.allowed) {
      return NextResponse.json(
        {
          error: quota.error || "Monthly usage limit exceeded",
          upgradeRequired: true,
          usage: {
            remaining: quota.remaining,
            requested: requestedTotal,
            perPlatform: testCaseCount,
            platforms: platforms.length,
          },
        },
        { status: 429 }
      )
    }

    // Create suite only after quota passes
    const { data: suite, error: suiteError } = await supabase
      .from("cross_platform_test_suites")
      .insert({
        requirement,
        platforms: platforms.map((p) => p.platform),
        user_id: user.id,
        generated_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (suiteError || !suite) {
      return NextResponse.json({ error: "Failed to create test suite", details: suiteError?.message }, { status: 500 })
    }

    // Provider routing based on selected model
    const selectedModel = AI_MODELS[modelKey]
    const isAnthropicModel = selectedModel.startsWith("claude")
    const primary: "anthropic" | "openai" = isAnthropicModel ? "anthropic" : "openai"
    const fallback: "anthropic" | "openai" = isAnthropicModel ? "openai" : "anthropic"

    let totalInserted = 0
    const generationResults: Array<{ platform: string; count: number; error?: string }> = []

    for (const platformData of platforms) {
      const platformId = platformData.platform
      const framework = platformData.framework

      try {
        const coverageInstruction = COVERAGE_PROMPTS[coverage]
        const templateInstruction = template ? `\n\nUse this template structure:\n${template}` : ""

        const promptUsed = `${coverageInstruction}

You are a QA expert specializing in cross-platform testing.
Generate EXACTLY ${testCaseCount} test cases for the requirement on the "${platformId}" platform using "${framework}".

Requirement:
${requirement}${templateInstruction}

For each test case, provide:
- title
- description
- preconditions (array of strings)
- steps (array of strings)
- expected_results (array of strings)
- automation_hints (array of strings)
- priority (low, medium, high, critical)

Return plain text test cases (no JSON).`

        // ---- Call LLM (primary, then fallback) ----
        let rawText = ""

        try {
          if (primary === "anthropic") {
            const res = await anthropic.messages.create({
              model: selectedModel,
              max_tokens: 4096,
              messages: [{ role: "user", content: promptUsed }],
            })
            rawText = anthropicTextFromContent(res.content)
          } else {
            const res = await openai.chat.completions.create({
              model: selectedModel,
              messages: [{ role: "user", content: promptUsed }],
              max_tokens: 4096,
            })
            rawText = res.choices?.[0]?.message?.content ?? ""
          }
        } catch {
          if (fallback === "anthropic") {
            const res = await anthropic.messages.create({
              model: FALLBACK_CLAUDE,
              max_tokens: 4096,
              messages: [{ role: "user", content: promptUsed }],
            })
            rawText = anthropicTextFromContent(res.content)
          } else {
            const res = await openai.chat.completions.create({
              model: FALLBACK_GPT,
              messages: [{ role: "user", content: promptUsed }],
              max_tokens: 4096,
            })
            rawText = res.choices?.[0]?.message?.content ?? ""
          }
        }

        // ---- Structure into JSON via OpenAI ----
        const structurePrompt = `Convert the following test cases into a structured JSON array. Each test case should have this exact format:

{
  "title": "string",
  "description": "string",
  "preconditions": ["string"],
  "steps": ["string"],
  "expected_results": ["string"],
  "automation_hints": ["string"],
  "priority": "string (low, medium, high, critical)"
}

Return a JSON object with a "test_cases" key containing the array, e.g. {"test_cases": [...]}

Test Cases to Convert:
${rawText}

Return ONLY valid JSON, no markdown, no explanation.`

        let testCases: PlatformTestCase[] = []
        try {
          const structured = await openai.chat.completions.create({
            model: "gpt-4o-mini-2024-07-18",
            messages: [{ role: "user", content: structurePrompt }],
            response_format: { type: "json_object" },
            max_tokens: 4096,
          })

          const content = structured.choices?.[0]?.message?.content ?? "{}"
          const parsed = JSON.parse(content) as { test_cases?: PlatformTestCase[]; testCases?: PlatformTestCase[] }

          testCases = Array.isArray(parsed.test_cases)
            ? parsed.test_cases
            : Array.isArray(parsed.testCases)
            ? parsed.testCases
            : []
        } catch {
          testCases = []
        }

        // Enforce EXACTLY N inserts per platform (cap extras)
        if (testCases.length > testCaseCount) {
          testCases = testCases.slice(0, testCaseCount)
        }

        if (testCases.length === 0) {
          generationResults.push({ platform: platformId, count: 0, error: "No test cases generated" })
          continue
        }

        const testCasesToInsert = testCases.map((tc) => ({
          suite_id: suite.id,
          platform: platformId,
          framework,
          title: tc.title || "Untitled Test",
          description: tc.description || "",
          preconditions: Array.isArray(tc.preconditions) ? tc.preconditions : [],
          steps: Array.isArray(tc.steps) ? tc.steps : [],
          expected_results: Array.isArray(tc.expected_results) ? tc.expected_results : [],
          automation_hints: Array.isArray(tc.automation_hints) ? tc.automation_hints : [],
          priority: normalizePriority(tc.priority),
          execution_status: "not_run" as const,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }))

        const { data: insertedCases, error: insertError } = await supabase
          .from("platform_test_cases")
          .insert(testCasesToInsert)
          .select()

        if (insertError) {
          generationResults.push({ platform: platformId, count: 0, error: insertError.message })
          continue
        }

        const insertedCount = insertedCases?.length ?? 0
        totalInserted += insertedCount
        generationResults.push({ platform: platformId, count: insertedCount })
      } catch (err) {
        generationResults.push({
          platform: platformId,
          count: 0,
          error: err instanceof Error ? err.message : "Unknown error",
        })
      }
    }

    // Persist suite total count
    await supabase.from("cross_platform_test_suites").update({ total_test_cases: totalInserted }).eq("id", suite.id)

    if (totalInserted === 0) {
      return NextResponse.json(
        {
          error: "Failed to generate any test cases",
          generation_results: generationResults,
        },
        { status: 500 }
      )
    }

    // Record usage ONCE, for what we actually inserted
    await usageTracker.recordTestCaseGeneration(user.id, totalInserted)

    // Compute remaining after charge (optional, but helps UI)
    const after = await usageTracker.canGenerateTestCases(user.id, 0)

    const successfulPlatforms = generationResults.filter((r) => r.count > 0).length

    return NextResponse.json({
      success: true,
      suite_id: suite.id,
      total_test_cases: totalInserted,
      platforms: platforms.map((p) => p.platform),
      generation_results: generationResults,
      usage: {
        remaining: after.remaining,
        generated: totalInserted,
        requested: requestedTotal,
      },
      message: `Successfully generated ${totalInserted} test cases across ${successfulPlatforms} platform(s)`,
    })
  } catch (error) {
    return NextResponse.json(
      {
        error: "Unexpected error. Please try again.",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}
