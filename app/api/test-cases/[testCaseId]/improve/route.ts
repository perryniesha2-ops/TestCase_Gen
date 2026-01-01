// app/api/test-cases/[testCaseId]/improve/route.ts
import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import OpenAI from "openai"

export const runtime = "nodejs"

type TestStep = { step_number: number; action: string; expected: string }

type ImproveResponse = {
  title?: string
  description?: string
  preconditions?: string | null
  expected_result: string
  test_steps: TestStep[]
  notes?: string[]
}

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! })

function isValidSteps(steps: unknown): steps is TestStep[] {
  return (
    Array.isArray(steps) &&
    steps.every(
      (s) =>
        s &&
        typeof s === "object" &&
        typeof (s as any).step_number === "number" &&
        typeof (s as any).action === "string" &&
        typeof (s as any).expected === "string"
    )
  )
}

type RouteCtx =
  | { params: { testCaseId: string } }
  | { params: Promise<{ testCaseId: string }> }

async function readTestCaseId(ctx: RouteCtx): Promise<string> {
  const p: any = (ctx as any).params
  const resolved = typeof p?.then === "function" ? await p : p
  return String(resolved?.testCaseId ?? "")
}

export async function POST(req: NextRequest, ctx: RouteCtx) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const testCaseId = await readTestCaseId(ctx)
    if (!testCaseId) {
      return NextResponse.json({ error: "Missing testCaseId" }, { status: 400 })
    }

    const body = (await req.json().catch(() => ({}))) as {
      application_url?: string
      style?: "concise" | "detailed"
    }

    const application_url = (body.application_url ?? "").trim()
    const style = body.style ?? "detailed"

    const { data: tc, error: tcErr } = await supabase
      .from("test_cases")
      .select(
        "id, user_id, title, description, preconditions, test_steps, expected_result, test_type, priority"
      )
      .eq("id", testCaseId)
      .eq("user_id", user.id)
      .single()

    if (tcErr || !tc) {
      return NextResponse.json({ error: "Test case not found" }, { status: 404 })
    }

    const prompt = `
You are improving a manual QA test case so it becomes automation-ready.
Rewrite steps to be specific, atomic, and verifiable.

Rules:
- Use concrete test data (emails, names, values)
- Include explicit navigation URLs when applicable
${application_url ? `- Base URL: ${application_url}` : ""}
- Avoid vague wording like "verify it works"
- Expected results must be explicit (visible text, URL path, UI state)
- Keep the intent of the test, do not change what it's testing
- Output JSON only.

Return JSON with:
{
  "preconditions": string|null,
  "expected_result": string,
  "test_steps": [{"step_number": number, "action": string, "expected": string}],
  "notes": string[] (optional)
}

Style: ${style}

INPUT TEST CASE:
Title: ${tc.title}
Description: ${tc.description}
Preconditions: ${tc.preconditions ?? ""}
Expected Result: ${tc.expected_result}
Steps JSON: ${JSON.stringify(tc.test_steps ?? [], null, 2)}
`

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini-2024-07-18",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      max_tokens: 2000,
    })

    const content = completion.choices?.[0]?.message?.content ?? "{}"
    const parsed = JSON.parse(content) as ImproveResponse

    if (!parsed.expected_result || !isValidSteps(parsed.test_steps)) {
      return NextResponse.json({ error: "Model returned invalid structure" }, { status: 502 })
    }

    const normalizedSteps = parsed.test_steps.map((s, idx) => ({
      step_number: idx + 1,
      action: s.action.trim(),
      expected: s.expected.trim(),
    }))

    const { error: updErr } = await supabase
      .from("test_cases")
      .update({
        preconditions: parsed.preconditions ?? tc.preconditions ?? null,
        expected_result: parsed.expected_result.trim(),
        test_steps: normalizedSteps,
        updated_at: new Date().toISOString(),
      })
      .eq("id", tc.id)
      .eq("user_id", user.id)

    if (updErr) {
      return NextResponse.json({ error: "Failed to update test case" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      test_case_id: tc.id,
      updated: {
        preconditions: parsed.preconditions ?? tc.preconditions ?? null,
        expected_result: parsed.expected_result.trim(),
        test_steps: normalizedSteps,
        notes: parsed.notes ?? [],
      },
    })
  } catch (err) {
    console.error("Improve test case error:", err)
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 })
  }
}
