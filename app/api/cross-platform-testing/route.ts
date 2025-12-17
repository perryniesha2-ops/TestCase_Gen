// app/api/cross-platform-testing/route.ts
import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import Anthropic from "@anthropic-ai/sdk"
import OpenAI from "openai"

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

// ----- Clients -----
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! })

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
} as const;

type ModelKey = keyof typeof AI_MODELS

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
    }

    const requirement = (body.requirement ?? "").trim()
    const platforms = body.platforms || []
    const model = (body.model as ModelKey) || "claude-sonnet-4-5-20250514"


    // Validation
    if (!requirement) {
      return NextResponse.json(
        { error: "Requirement is required", field: "requirement" },
        { status: 400 }
      )
    }

    if (!Array.isArray(platforms) || platforms.length === 0) {
      return NextResponse.json(
        { error: "At least one platform is required", field: "platforms" },
        { status: 400 }
      )
    }

    // Validate all platforms have frameworks
    for (const p of platforms) {
      if (!p.platform || !p.framework) {
        return NextResponse.json(
          { error: "Each platform must have a framework specified", field: "platforms" },
          { status: 400 }
        )
      }
    }

    if (!(model in AI_MODELS)) {
      return NextResponse.json(
        { error: "Unsupported AI model", field: "model" },
        { status: 400 }
      )
    }

    // Create test suite record
    const { data: suite, error: suiteError } = await supabase
      .from("cross_platform_test_suites")
      .insert({
        requirement: requirement,
        platforms: platforms.map(p => p.platform),
        user_id: user.id,
        generated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (suiteError || !suite) {
      console.error("❌ Error creating test suite:", suiteError)
      return NextResponse.json(
        { error: "Failed to create test suite", details: suiteError?.message },
        { status: 500 }
      )
    }


    // Generate test cases for each platform
    let totalTestCases = 0
    const generationResults: Array<{ platform: string; count: number; error?: string }> = []

    const isAnthropicModel = (model as string).startsWith("claude")
    const primary: "anthropic" | "openai" = isAnthropicModel ? "anthropic" : "openai"
    const fallback: "anthropic" | "openai" = isAnthropicModel ? "openai" : "anthropic"

    for (const platformData of platforms) {
      try {

        // Build prompt for this platform
        const promptUsed = `You are a QA expert specializing in cross-platform testing. Generate 5-7 comprehensive test cases for the following requirement on the ${platformData.platform} platform using ${platformData.framework}.

Requirement: ${requirement}

Generate test cases that cover:
1. Basic functionality specific to ${platformData.platform}
2. Platform-specific edge cases
3. Integration points
4. Error handling
5. ${platformData.framework}-specific considerations

For each test case, provide:
- A clear, descriptive title
- Detailed description
- Preconditions (array of strings)
- Test steps (array of strings) - be specific to ${platformData.platform} and ${platformData.framework}
- Expected results (array of strings)
- Automation hints (array of strings) - specific to ${platformData.framework}
- Priority (low, medium, high, or critical)

Make the test cases practical and executable on ${platformData.platform} with ${platformData.framework}.`

        // ---- Call LLM (primary, then fallback) ----
        let rawText = ""

        try {
          if (primary === "anthropic") {
            const res = await anthropic.messages.create({
              model: AI_MODELS[model],
              max_tokens: 4096,
              messages: [{ role: "user", content: promptUsed }],
            })
            rawText = anthropicTextFromContent(res.content)
          } else {
            const res = await openai.chat.completions.create({
              model: AI_MODELS[model],
              messages: [{ role: "user", content: promptUsed }],
              max_tokens: 4096,
            })
            rawText = res.choices?.[0]?.message?.content ?? ""
          }
        } catch (primaryError) {
          try {
            if (fallback === "anthropic") {
              const res = await anthropic.messages.create({
                model: "claude-sonnet-4-5-20250514",
                max_tokens: 4096,
                messages: [{ role: "user", content: promptUsed }],
              })
              rawText = anthropicTextFromContent(res.content)
            } else {
              const res = await openai.chat.completions.create({
                model: "gpt-4o",
                messages: [{ role: "user", content: promptUsed }],
                max_tokens: 4096,
              })
              rawText = res.choices?.[0]?.message?.content ?? ""
            }
          } catch (fallbackError) {
            console.error(`❌ Both providers failed for ${platformData.platform}`)
            generationResults.push({
              platform: platformData.platform,
              count: 0,
              error: "AI generation failed"
            })
            continue
          }
        }


        // ---- Structure into JSON via OpenAI ----
        const structurePrompt = `Convert the following test cases into a structured JSON array. Each test case should have this exact format:

{
  "title": "string",
  "description": "string",
  "preconditions": ["string", "string"],
  "steps": ["string", "string"],
  "expected_results": ["string", "string"],
  "automation_hints": ["string", "string"],
  "priority": "string (low, medium, high, critical)"
}

Return a JSON object with a "test_cases" key containing the array, e.g. {"test_cases": [...]}

Test Cases to Convert:
${rawText}

Return ONLY valid JSON, no markdown, no explanation.`

        let testCases: PlatformTestCase[] = []
        try {
          const structured = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [{ role: "user", content: structurePrompt }],
            response_format: { type: "json_object" },
            max_tokens: 4096,
          })
          const content = structured.choices?.[0]?.message?.content ?? "{}"
          const parsed = JSON.parse(content) as {
            test_cases?: PlatformTestCase[]
            testCases?: PlatformTestCase[]
          }
          testCases = Array.isArray(parsed.test_cases)
            ? parsed.test_cases
            : Array.isArray(parsed.testCases)
            ? parsed.testCases
            : []
        } catch (structureError) {
          console.error(`❌ Failed to structure test cases for ${platformData.platform}:`, structureError)
          // Try naive fallback
          const match = rawText.match(/\[[\s\S]*\]/)
          if (match) {
            try {
              testCases = JSON.parse(match[0]) as PlatformTestCase[]
            } catch {
              testCases = []
            }
          }
        }

        if (!Array.isArray(testCases)) testCases = []


        if (testCases.length === 0) {
          generationResults.push({
            platform: platformData.platform,
            count: 0,
            error: "No test cases generated"
          })
          continue
        }

        // Prepare test cases for database
        const testCasesToInsert = testCases.map(tc => ({
          suite_id: suite.id,
          platform: platformData.platform,
          framework: platformData.framework,
          title: tc.title || "Untitled Test",
          description: tc.description || "",
          preconditions: Array.isArray(tc.preconditions) ? tc.preconditions : [],
          steps: Array.isArray(tc.steps) ? tc.steps : [],
          expected_results: Array.isArray(tc.expected_results) ? tc.expected_results : [],
          automation_hints: Array.isArray(tc.automation_hints) ? tc.automation_hints : [],
          priority: normalizePriority(tc.priority),
          execution_status: "not_run" as const,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }))

        // Insert test cases into database
        const { data: insertedCases, error: insertError } = await supabase
          .from("platform_test_cases")
          .insert(testCasesToInsert)
          .select()

        if (insertError) {
          console.error(`❌ Error inserting test cases for ${platformData.platform}:`, insertError)
          generationResults.push({
            platform: platformData.platform,
            count: 0,
            error: insertError.message
          })
          continue
        }

        const count = insertedCases?.length || 0
        totalTestCases += count
        generationResults.push({
          platform: platformData.platform,
          count: count
        })


      } catch (error) {
        console.error(`❌ Error generating test cases for ${platformData.platform}:`, error)
        generationResults.push({
          platform: platformData.platform,
          count: 0,
          error: error instanceof Error ? error.message : "Unknown error"
        })
      }
    }


    // Update suite with total test case count
    await supabase
      .from("cross_platform_test_suites")
      .update({ total_test_cases: totalTestCases })
      .eq("id", suite.id)

    // Check if any test cases were generated
    if (totalTestCases === 0) {
      const errors = generationResults
        .filter(r => r.error)
        .map(r => `${r.platform}: ${r.error}`)
      
      return NextResponse.json(
        { 
          error: "Failed to generate any test cases",
          details: errors.length > 0 ? errors.join("; ") : "Unknown error",
          generation_results: generationResults
        },
        { status: 500 }
      )
    }

    const successfulPlatforms = generationResults.filter(r => r.count > 0).length

    return NextResponse.json({
      success: true,
      suite_id: suite.id,
      total_test_cases: totalTestCases,
      platforms: platforms.map(p => p.platform),
      generation_results: generationResults,
      message: `Successfully generated ${totalTestCases} test cases across ${successfulPlatforms} platform(s)`
    })

  } catch (error) {
    console.error("❌ Cross-platform generation error:", error)
    return NextResponse.json(
      { 
        error: "Unexpected error. Please try again.",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  }
}