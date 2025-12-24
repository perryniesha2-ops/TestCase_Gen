// app/api/generate-script/route.ts
import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import Anthropic from "@anthropic-ai/sdk"
import { generateScriptWithSteps, validateScript, formatScript, TestStep } from "@/lib/automation/script-templates"

export const runtime = "nodejs"

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

interface GenerateScriptRequest {
  testCaseId: string
  testName: string
  testSteps: TestStep[]
  baseUrl?: string
  framework?: "playwright" | "cypress" | "selenium"
  timeout?: number
}

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

    const body = await request.json() as GenerateScriptRequest
    const { testCaseId, testName, testSteps, baseUrl = '', framework = 'playwright', timeout = 30000 } = body

    // Validation
    if (!testCaseId) {
      return NextResponse.json(
        { error: "Test case ID is required" },
        { status: 400 }
      )
    }

    if (!testSteps || testSteps.length === 0) {
      return NextResponse.json(
        { error: "Test steps are required" },
        { status: 400 }
      )
    }

    // Verify test case exists and user has access
    const { data: testCase, error: testCaseError } = await supabase
      .from('test_cases')
      .select('id, title, description, test_type')
      .eq('id', testCaseId)
      .eq('user_id', user.id)
      .single()

    if (testCaseError || !testCase) {
      return NextResponse.json(
        { error: "Test case not found or access denied" },
        { status: 404 }
      )
    }

    console.log(`🤖 Generating ${framework} script for test case: ${testName}`)

    // Method 1: Template-based generation (Fast, predictable)
    let generatedScript = generateScriptWithSteps(
      {
        testName,
        baseUrl,
        timeout
      },
      testSteps
    )

    // Method 2: AI enhancement (Smarter, context-aware)
    try {
      const aiScript = await generateScriptWithAI(testName, testSteps, baseUrl, testCase.description)
      
      // Use AI script if it's valid and better
      const aiValidation = validateScript(aiScript)
      if (aiValidation.valid) {
        console.log('✅ Using AI-generated script')
        generatedScript = aiScript
      } else {
        console.log('⚠️ AI script invalid, using template-based script')
      }
    } catch (aiError) {
      console.error('AI generation failed, using template:', aiError)
      // Fall back to template-based script (already generated above)
    }

    // Format and validate
    generatedScript = formatScript(generatedScript)
    const validation = validateScript(generatedScript)

    // Save script to database
    const { data: savedScript, error: saveError } = await supabase
      .from('automation_scripts')
      .insert({
        test_case_id: testCaseId,
        user_id: user.id,
        script_name: testName,
        framework: framework,
        script_content: generatedScript,
        base_url: baseUrl,
        timeout: timeout,
        status: validation.valid ? 'ready' : 'draft',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (saveError) {
      console.error('Error saving script:', saveError)
      // Return the script anyway, even if save fails
      return NextResponse.json({
        success: true,
        script: generatedScript,
        validation,
        warning: 'Script generated but not saved to database'
      })
    }

    console.log(`✅ Script generated and saved (ID: ${savedScript.id})`)

    return NextResponse.json({
      success: true,
      scriptId: savedScript.id,
      script: generatedScript,
      validation,
      metadata: {
        framework,
        stepCount: testSteps.length,
        hasBaseUrl: !!baseUrl,
        status: savedScript.status
      }
    })

  } catch (error) {
    console.error("❌ Script generation error:", error)
    return NextResponse.json(
      { 
        error: "Failed to generate script",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  }
}

/**
 * Generate script using AI for better context awareness
 */
async function generateScriptWithAI(
  testName: string,
  testSteps: TestStep[],
  baseUrl: string,
  testDescription?: string
): Promise<string> {
  const stepsText = testSteps
    .map((step, idx) => `${idx + 1}. Action: ${step.action}\n   Expected: ${step.expected}`)
    .join('\n\n')

  const prompt = `You are an expert QA automation engineer. Generate a Playwright test script for the following test case.

Test Name: ${testName}
${testDescription ? `Description: ${testDescription}\n` : ''}${baseUrl ? `Base URL: ${baseUrl}\n` : ''}
Test Steps:
${stepsText}

Requirements:
- Use Playwright with TypeScript
- Use modern selectors (getByRole, getByLabel, getByText) when possible
- Include proper waits and assertions
- Add comments for each step
- Handle errors gracefully
- Use page object pattern best practices
- Include proper test setup and teardown

Generate ONLY the complete Playwright test code. Do not include explanations or markdown.`

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-5-20250514",
    max_tokens: 3000,
    messages: [
      {
        role: "user",
        content: prompt
      }
    ]
  })

  const content = response.content[0]
  if (content.type !== 'text') {
    throw new Error('Unexpected response type from AI')
  }

  let script = content.text.trim()

  // Clean up markdown code blocks if present
  script = script.replace(/```typescript\n?/g, '').replace(/```\n?/g, '')

  return script
}

/**
 * Update existing script
 */
export async function PUT(request: Request) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { scriptId, scriptContent, status } = body

    if (!scriptId || !scriptContent) {
      return NextResponse.json(
        { error: "Script ID and content are required" },
        { status: 400 }
      )
    }

    // Validate script
    const validation = validateScript(scriptContent)

    // Update script
    const { data: updatedScript, error: updateError } = await supabase
      .from('automation_scripts')
      .update({
        script_content: formatScript(scriptContent),
        status: status || (validation.valid ? 'ready' : 'draft'),
        updated_at: new Date().toISOString()
      })
      .eq('id', scriptId)
      .eq('user_id', user.id)
      .select()
      .single()

    if (updateError) {
      throw updateError
    }

    return NextResponse.json({
      success: true,
      script: updatedScript,
      validation
    })

  } catch (error) {
    console.error("❌ Script update error:", error)
    return NextResponse.json(
      { 
        error: "Failed to update script",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  }
}

/**
 * Get script by test case ID
 */
export async function GET(request: Request) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const testCaseId = searchParams.get('testCaseId')
    const scriptId = searchParams.get('scriptId')

    if (!testCaseId && !scriptId) {
      return NextResponse.json(
        { error: "Test case ID or script ID is required" },
        { status: 400 }
      )
    }

    let query = supabase
      .from('automation_scripts')
      .select('*')
      .eq('user_id', user.id)

    if (scriptId) {
      query = query.eq('id', scriptId)
    } else if (testCaseId) {
      query = query.eq('test_case_id', testCaseId)
    }

    const { data: scripts, error } = await query.order('created_at', { ascending: false })

    if (error) {
      throw error
    }

    return NextResponse.json({
      success: true,
      scripts: scripts || [],
      count: scripts?.length || 0
    })

  } catch (error) {
    console.error("❌ Script fetch error:", error)
    return NextResponse.json(
      { 
        error: "Failed to fetch scripts",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  }
}

/**
 * Delete script
 */
export async function DELETE(request: Request) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const scriptId = searchParams.get('scriptId')

    if (!scriptId) {
      return NextResponse.json(
        { error: "Script ID is required" },
        { status: 400 }
      )
    }

    const { error: deleteError } = await supabase
      .from('automation_scripts')
      .delete()
      .eq('id', scriptId)
      .eq('user_id', user.id)

    if (deleteError) {
      throw deleteError
    }

    return NextResponse.json({
      success: true,
      message: 'Script deleted successfully'
    })

  } catch (error) {
    console.error("❌ Script delete error:", error)
    return NextResponse.json(
      { 
        error: "Failed to delete script",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  }
}