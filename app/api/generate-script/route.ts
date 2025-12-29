// app/api/generate-script/route.ts - COMPLETE VERSION
import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import Anthropic from "@anthropic-ai/sdk"

export const runtime = "nodejs"

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

function extractTextFromResponse(content: Anthropic.Messages.ContentBlock[]): string {
  return content
    .filter((block): block is Anthropic.Messages.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("\n\n")
    .trim()
}

const ENHANCED_SCRIPT_GENERATION_PROMPT = `You are an expert Playwright test automation engineer. Generate a COMPLETE, PRODUCTION-READY Playwright test script.

CRITICAL OUTPUT FORMAT:
- Output ONLY valid TypeScript code
- NO explanatory text before or after the code
- NO markdown formatting like \`\`\`typescript
- NO comments like "This script provides..."
- The response should be pure, executable TypeScript
- End with }); and NOTHING else

CRITICAL OBJECTIVES:
1. Minimize TODO comments - only use when absolutely necessary
2. Use real, working selectors with multiple fallback options
3. Provide specific, executable code for every step
4. Use Playwright best practices (semantic selectors, proper waits)
5. Make the script as complete as possible given the available information
6. When test data is provided, create a testData object and use those values

SELECTOR STRATEGY:

1. **Semantic Selectors (BEST):**
   - page.getByRole('button', { name: 'Sign In' })
   - page.getByLabel('Email')
   - page.getByPlaceholder('Enter email')

2. **Multiple Fallback Selectors:**
   - page.locator('button.submit, button[type="submit"], button:has-text("Submit")')
   - page.locator('.price, [class*="price"], .product-price')

3. **Common Patterns:**

   **Buttons:**
   \`\`\`typescript
   await page.getByRole('button', { name: /submit|send/i }).click()
   await page.locator('button:has-text("Submit"), button.submit').first().click()
   \`\`\`
   
   **Inputs:**
   \`\`\`typescript
   await page.getByLabel('Email').fill('test@example.com')
   await page.locator('input[name="email"], input[type="email"]').fill('test@example.com')
   \`\`\`
   
   **Verification:**
   \`\`\`typescript
   await expect(page.locator('h1, h2')).toContainText(/dashboard|home/i)
   await expect(page.locator('.price, [class*="price"]')).toContainText('$')
   \`\`\`

TEST DATA USAGE:
When test data is provided (e.g., email, password, username), follow this pattern:
\`\`\`typescript
import { test, expect } from '@playwright/test'

test('Test name', async ({ page }) => {
  // Test data
  const testData = {
    email: 'provided-email@example.com',
    password: 'provided-password',
    // ... other provided data
  }
  
  // Use testData.email instead of hardcoded values
  await page.fill('[name="email"]', testData.email)
  await page.fill('[name="password"]', testData.password)
  
  // Rest of test...
})
\`\`\`

KEY RULES:
1. Never use generic placeholders
2. Always provide fallback selectors
3. Use .first() or .last() when multiple matches expected
4. Use regex for flexible text matching
5. Use toContainText() instead of exact matches
6. Only add TODO if genuinely cannot infer selector
7. Prefer working code over perfection
8. When test data provided, use it throughout the script

OUTPUT FORMAT REMINDER:
Generate ONLY the TypeScript code. No explanations. No markdown. Just code.
End with }); and stop immediately.`

export async function POST(request: Request) {
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
    const { 
      testCaseId, 
      applicationUrl,  // Changed from appUrl for consistency
      testData,
      forceRegenerate = false
    } = body

    if (!testCaseId) {
      return NextResponse.json({ error: "Test case ID is required" }, { status: 400 })
    }

    const { data: testCase, error: testCaseError } = await supabase
      .from("test_cases")
      .select("*")
      .eq("id", testCaseId)
      .single()

    if (testCaseError || !testCase) {
      return NextResponse.json({ error: "Test case not found" }, { status: 404 })
    }

    // Check for existing script
    const { data: existingScript } = await supabase
      .from("automation_scripts")
      .select("*")
      .eq("test_case_id", testCaseId)
      .eq("user_id", user.id)
      .maybeSingle()

    // Handle existing script
    if (existingScript && !forceRegenerate) {
      console.log("⚠️ Script already exists:", existingScript.id)
      
      return NextResponse.json({
        success: true,
        script: existingScript,
        metadata: {
          todoCount: (existingScript.script_content?.match(/\/\/ TODO:/g) || []).length,
          hasCriticalTodos: existingScript.script_content?.includes('TODO: Update selector'),
          missingInfo: [],
          isExisting: true,
          needsReview: existingScript.status === "needs_review"
        }
      })
    }

    // If forceRegenerate, delete old script first
    if (existingScript && forceRegenerate) {
      console.log("🔄 Regenerating script, deleting old one:", existingScript.id)
      await supabase
        .from("automation_scripts")
        .delete()
        .eq("id", existingScript.id)
    }

    // Build prompt with all context
    const testStepsText = Array.isArray(testCase.test_steps)
      ? testCase.test_steps
          .map((step: any) => `Step ${step.step_number}: ${step.action}\nExpected: ${step.expected}`)
          .join('\n\n')
      : ''

    const applicationContext = applicationUrl 
      ? `\n\nAPPLICATION BASE URL: ${applicationUrl}\nUse this as the base for all navigation steps.`
      : ''

    // Format test data for prompt
    const testDataContext = testData && Object.keys(testData).length > 0
      ? `\n\nTEST DATA PROVIDED:\n${Object.entries(testData)
          .filter(([_, value]) => value) // Only include non-empty values
          .map(([key, value]) => `- ${key}: "${value}"`)
          .join('\n')}\n\nIMPORTANT: Create a testData object at the top of the test and use these values throughout the script. Do NOT use placeholder values like "test@example.com" - use the provided test data instead.`
      : ''

    const preconditionsText = testCase.preconditions 
      ? `\n\nPRECONDITIONS:\n${testCase.preconditions}`
      : ''

    const fullPrompt = `${ENHANCED_SCRIPT_GENERATION_PROMPT}

TEST CASE DETAILS:
Title: ${testCase.title}
Description: ${testCase.description || 'N/A'}
${preconditionsText}${applicationContext}${testDataContext}

TEST STEPS:
${testStepsText}

EXPECTED RESULT:
${testCase.expected_result}

REMEMBER: Output ONLY TypeScript code. No explanations. End with }); and stop.`

    console.log("🤖 Generating new script for test case:", testCase.title)
    if (testData && Object.keys(testData).length > 0) {
      console.log("📊 Using test data:", Object.keys(testData))
    }

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4000,
      messages: [{ role: "user", content: fullPrompt }],
    })

    let scriptContent = extractTextFromResponse(response.content)

    // Clean up markdown code blocks
    scriptContent = scriptContent
      .replace(/```typescript\n?/g, "")
      .replace(/```ts\n?/g, "")
      .replace(/```\n?/g, "")
      .trim()

    // Remove commentary after the script
    const lastBraceIndex = scriptContent.lastIndexOf('});')
    
    if (lastBraceIndex !== -1) {
      const afterBrace = scriptContent.substring(lastBraceIndex + 3).trim()
      
      if (afterBrace && (
        afterBrace.startsWith('This ') ||
        afterBrace.startsWith('The ') ||
        afterBrace.startsWith('**') ||
        afterBrace.startsWith('1.') ||
        afterBrace.startsWith('Note:')
      )) {
        scriptContent = scriptContent.substring(0, lastBraceIndex + 3).trim()
        console.log('✂️ Removed commentary after script')
      }
    }

    if (!scriptContent) {
      throw new Error("No script generated")
    }

    // Analyze script
    const todoCount = (scriptContent.match(/\/\/ TODO:/g) || []).length
    const hasCriticalTodos = scriptContent.includes('TODO: Update selector')
    
    const missingInfo: Array<{
      field: string
      label: string
      description: string
      placeholder?: string
      type?: string
      required?: boolean
    }> = []
    
    // Check for missing application URL
    if (!applicationUrl && (scriptContent.includes('example.com') || scriptContent.includes('shop.example.com'))) {
      missingInfo.push({
        field: 'applicationUrl',
        label: 'Application URL',
        description: 'Base URL for your application (script currently uses example.com)',
        placeholder: 'https://app.yourcompany.com',
        type: 'url',
        required: true
      })
    }
    
    // Check for missing test email
    if (!testData?.email && (scriptContent.includes('test@example.com') || scriptContent.includes('user@') || scriptContent.includes('@shop.com'))) {
      missingInfo.push({
        field: 'testEmail',
        label: 'Test Email',
        description: 'Email address for test account',
        placeholder: 'test@yourcompany.com',
        type: 'email',
        required: false
      })
    }
    
    // Check for missing test password
    if (!testData?.password && scriptContent.match(/fill\(['"].*password.*['"]/i)) {
      missingInfo.push({
        field: 'testPassword',
        label: 'Test Password',
        description: 'Password for test account',
        placeholder: 'TestPassword123',
        type: 'password',
        required: false
      })
    }

    // Save to database
    const { data: savedScript, error: saveError } = await supabase
      .from("automation_scripts")
      .insert({
        test_case_id: testCaseId,
        user_id: user.id,
        script_name: `${testCase.title} - Automation`,
        framework: "playwright",
        script_content: scriptContent,
        status: hasCriticalTodos ? "needs_review" : "ready",
      })
      .select()
      .single()

    if (saveError) {
      console.error("Database save error:", saveError)
      throw new Error(`Database error: ${saveError.message}`)
    }

    console.log("✅ Script generated and saved (ID:", savedScript.id, ")")
    console.log("📊 TODOs:", todoCount, "| Missing info:", missingInfo.length)

    return NextResponse.json({
      success: true,
      script: savedScript,
      metadata: {
        todoCount,
        hasCriticalTodos,
        missingInfo,
        needsReview: hasCriticalTodos,
        isExisting: false
      }
    })

  } catch (error) {
    console.error("Script generation error:", error)
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : "Failed to generate script" 
      },
      { status: 500 }
    )
  }
}

// GET endpoint to check if script exists
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const testCaseId = searchParams.get("testCaseId")

    if (!testCaseId) {
      return NextResponse.json(
        { success: false, error: "Missing testCaseId" },
        { status: 400 }
      )
    }

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      )
    }

    const { data: scripts, error } = await supabase
      .from("automation_scripts")
      .select("*")
      .eq("test_case_id", testCaseId)
      .eq("user_id", user.id)

    if (error) {
      throw error
    }

    return NextResponse.json({
      success: true,
      scripts: scripts || []
    })
  } catch (error) {
    console.error("Error checking scripts:", error)
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    )
  }
}