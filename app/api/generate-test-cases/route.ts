// app/api/generate-test-cases/route.ts - ENHANCED WITH TEST TYPES & EXPORT FORMATS
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import {
  checkAndRecordUsage,
  recordSuccessfulGeneration,
} from "@/lib/usage-tracker";

export const runtime = "nodejs";

// ----- Types -----
interface TestStep {
  step_number: number;
  action: string;
  expected: string;
}

interface GeneratedTestCase {
  title: string;
  description: string;
  test_type: string;
  priority: "low" | "medium" | "high" | "critical";
  preconditions: string | null;
  test_steps: TestStep[];
  expected_result: string;
  is_edge_case: boolean;
  is_negative_test: boolean;
  is_security_test: boolean;
  is_boundary_test: boolean;
  tags?: string[];
}

// ----- AI Model Configuration -----
const AI_MODELS = {
  "claude-sonnet-4-5": "claude-sonnet-4-5-20250514",
  "claude-haiku-4-5": "claude-haiku-4-5-20250514",
  "claude-opus-4-5": "claude-opus-4-5-20250514",
  "gpt-5-mini": "gpt-5-mini",
  "gpt-5.2": "gpt-5.2",
  "gpt-4o": "gpt-4o-2024-11-20",
  "gpt-4o-mini": "gpt-4o-mini-2024-07-18",
} as const;

const DEFAULT_MODEL = "claude-sonnet-4-5";
const FALLBACK_CLAUDE = "claude-sonnet-4-5";
const FALLBACK_GPT = "gpt-4o";

type ModelKey = keyof typeof AI_MODELS;
type Priority = "low" | "medium" | "high" | "critical";

// ----- Clients -----
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

// ----- Test Type Instructions -----
const TEST_TYPE_INSTRUCTIONS: Record<string, string> = {
  "happy-path": `
HAPPY PATH / POSITIVE TESTS:
Generate tests that verify the system works correctly with valid inputs and expected user flows.

Focus on:
- Valid user journeys from start to finish
- Expected use cases and common scenarios
- Successful operations with proper data
- Normal workflow completion

Example:
  Title: Successful User Registration
  Steps:
    1. Navigate to https://app.example.com/register
    2. Type "john@example.com" in input[name="email"]
    3. Type "SecurePass123!" in input[name="password"]
    4. Click button "Create Account"
    5. Verify redirect to /dashboard
    6. Verify welcome message "Welcome, John!" appears
`,

  negative: `
NEGATIVE TESTS (UNHAPPY PATH):
Generate tests that verify the system handles invalid inputs and error conditions correctly.

Focus on:
- Empty or missing required fields
- Invalid data formats (malformed emails, bad dates)
- Data exceeding limits (too long, too large)
- Wrong data types (text in number fields)
- Unauthorized access attempts

Example:
  Title: Login with Empty Password
  Steps:
    1. Navigate to https://app.example.com/login
    2. Type "valid@email.com" in input[name="email"]
    3. Leave password field empty
    4. Click button "Sign In"
    5. Verify error message "Password is required" appears
    6. Verify URL remains at /login
  Flags: is_negative_test = true
`,

  security: `
SECURITY TESTS:
Generate tests that verify security controls and protections.

Focus on:
1. AUTHENTICATION:
   - SQL injection: ' OR '1'='1
   - Brute force attempts
   - Session fixation

2. AUTHORIZATION:
   - Access restricted pages without login
   - Access other users' data (change user IDs in URL)
   - Privilege escalation

3. INPUT VALIDATION:
   - XSS: <script>alert('XSS')</script>
   - Path traversal: ../../etc/passwd
   - Command injection: ; rm -rf /

4. SESSION MANAGEMENT:
   - Session timeout
   - Concurrent sessions
   - Logout functionality

Example:
  Title: XSS Attempt in Comment Field
  Steps:
    1. Navigate to https://app.example.com/posts/123
    2. Type "<script>alert('XSS')</script>" in textarea[name="comment"]
    3. Click button "Post Comment"
    4. Verify comment is displayed as plain text, NOT executed
    5. Verify page does not show alert popup
  Flags: is_security_test = true
`,

  boundary: `
BOUNDARY TESTS:
Generate tests that test limits and boundaries.

Focus on:
1. NUMERIC BOUNDARIES:
   - Minimum value (0, -1)
   - Maximum value (max int)
   - Just below minimum (min - 1)
   - Just above maximum (max + 1)

2. STRING LENGTH:
   - Empty string ("")
   - Single character
   - Maximum length
   - Maximum length + 1

3. DATE/TIME:
   - Past dates when future required
   - Leap year dates (Feb 29)
   - Invalid dates (Feb 30)

4. FILE SIZE:
   - 0 bytes
   - Just under limit (9.99MB for 10MB limit)
   - Exactly at limit (10MB)
   - Just over limit (10.01MB)

Example:
  Title: Password Minimum Length Boundary
  Steps:
    1. Navigate to https://app.example.com/register
    2. Type "Pass1!" (6 chars) in input[name="password"]
    3. Click button "Register"
    4. Verify error "Password must be at least 8 characters"
    5. Type "Pass123!" (8 chars) in input[name="password"]
    6. Click button "Register"
    7. Verify registration succeeds
  Flags: is_boundary_test = true
`,

  "edge-case": `
EDGE CASES:
Generate tests for unusual but valid scenarios.

Focus on:
- Rare but possible user actions
- Uncommon data combinations
- System limits and boundaries
- Special characters in names/data
- Concurrent operations
- Network interruptions

Example:
  Title: User with Special Characters in Name
  Steps:
    1. Navigate to registration page
    2. Enter name "José O'Brien-Smith" with accents and hyphens
    3. Complete registration
    4. Verify name displays correctly throughout app
  Flags: is_edge_case = true
`,

  performance: `
PERFORMANCE TESTS:
Generate tests that verify system performance and response times.

Focus on:
- Page load times
- API response times
- Database query performance
- Large data sets
- Concurrent users
- Resource usage

Example:
  Title: Dashboard Load Time Under 2 Seconds
  Steps:
    1. Navigate to https://app.example.com/dashboard
    2. Measure page load time
    3. Verify page loads in under 2 seconds
    4. Verify all dashboard widgets load
`,

  integration: `
INTEGRATION TESTS:
Generate tests that verify component interactions.

Focus on:
- Data flow between systems
- API integrations
- Third-party services
- Database transactions
- Message queues

Example:
  Title: Payment Processing Integration
  Steps:
    1. Add item to cart
    2. Proceed to checkout
    3. Enter payment details
    4. Submit order
    5. Verify payment processor receives request
    6. Verify order status updates in database
    7. Verify confirmation email sent
`,

  regression: `
REGRESSION TESTS:
Generate tests that verify existing functionality still works after changes.

Focus on:
- Core user flows
- Previously fixed bugs
- Critical business logic
- Common use cases

Example:
  Title: User Login Still Works After UI Update
  Steps:
    1. Navigate to login page
    2. Enter valid credentials
    3. Click login
    4. Verify successful authentication
    5. Verify redirect to correct page
`,

  smoke: `
SMOKE TESTS:
Generate critical path tests to verify basic functionality.

Focus on:
- Application starts/loads
- Critical features accessible
- Core functionality works
- No blocking errors

Example:
  Title: Application Loads Successfully
  Steps:
    1. Navigate to https://app.example.com
    2. Verify homepage loads
    3. Verify navigation menu appears
    4. Verify no JavaScript errors in console
`,
};

// ----- Helper Functions -----
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

const ALLOWED = new Set(["low", "medium", "high", "critical"] as const);

function normalizePriority(p: unknown): Priority {
  const s = (typeof p === "string" ? p : "").toLowerCase().trim();
  if (["p0", "blocker"].includes(s)) return "critical";
  if (["p1"].includes(s)) return "high";
  if (["p2"].includes(s)) return "medium";
  if (["p3"].includes(s)) return "low";
  return ALLOWED.has(s as Priority) ? (s as Priority) : "medium";
}

const AUTOMATION_GUIDELINES = `
AUTOMATION REQUIREMENTS:
You are creating test cases that will be AUTOMATICALLY CONVERTED to Playwright automation scripts.
Follow these rules strictly:

1. NAVIGATION STEPS:
   ✅ GOOD: "Navigate to https://app.example.com/login"
   ❌ BAD: "Go to the login page"

2. CLICKING STEPS:
   ✅ GOOD: "Click the button with text 'Sign In'" or "Click button[type='submit']"
   ❌ BAD: "Click login" or "Submit the form"

3. TYPING STEPS:
   ✅ GOOD: "Type 'test@example.com' in the email input field (input[name='email'])"
   ❌ BAD: "Enter email" or "Fill in credentials"

4. VERIFICATION STEPS:
   ✅ GOOD: "Verify the page URL contains '/dashboard'" or "Verify text 'Welcome, User' is visible"
   ❌ BAD: "Check if login successful" or "Verify authentication"

5. TEST DATA:
   - Use realistic, specific test data
   - Examples: "test@company.com", "John Doe", "123 Main Street"
   - NOT: "valid email", "user name", "address"
`;

// ----- Build Enhanced Prompt -----
function buildPromptFromTestTypes(params: {
  requirements: string;
  testCaseCount: number;
  testTypes: string[];
  application_url?: string;
  template?: string;
}): string {
  const { requirements, testCaseCount, testTypes, application_url, template } =
    params;

  const templateInstruction = template
    ? `\n\nUse this template structure:\n${template}`
    : "";
  const urlContext = application_url
    ? `\n\nAPPLICATION BASE URL: ${application_url}\nUse this as the base URL for all navigation steps.`
    : "";

  // Calculate distribution based on selected types
  const typesCount = testTypes.length;
  const perType = Math.floor(testCaseCount / typesCount);
  const remainder = testCaseCount % typesCount;

  let distributionText = `\nTEST CASE DISTRIBUTION (${testCaseCount} total across ${typesCount} type${
    typesCount > 1 ? "s" : ""
  }):\n`;

  testTypes.forEach((type, index) => {
    const count = perType + (index === 0 ? remainder : 0);
    const label =
      type === "happy-path"
        ? "Happy Path"
        : type === "negative"
          ? "Negative"
          : type === "security"
            ? "Security"
            : type === "boundary"
              ? "Boundary"
              : type === "edge-case"
                ? "Edge Case"
                : type === "performance"
                  ? "Performance"
                  : type === "integration"
                    ? "Integration"
                    : type === "regression"
                      ? "Regression"
                      : type === "smoke"
                        ? "Smoke"
                        : type;
    distributionText += `- ${count} ${label} test${count > 1 ? "s" : ""}\n`;
  });

  // Build instructions for selected types
  let typeInstructions = "";
  testTypes.forEach((type) => {
    if (TEST_TYPE_INSTRUCTIONS[type]) {
      typeInstructions += TEST_TYPE_INSTRUCTIONS[type] + "\n\n";
    }
  });

  return `${AUTOMATION_GUIDELINES}

${distributionText}

${typeInstructions}

Generate test cases for the following requirements:

${requirements}${urlContext}${templateInstruction}

For each test case, provide:
1. A clear, specific title describing what is being tested
2. Detailed description of the test scenario
3. Test type (functional, integration, e2e, security, performance, etc.)
4. Priority level (critical, high, medium, low)
5. Preconditions with specific setup requirements
6. Step-by-step test steps with SPECIFIC actions and CLEAR expected results
7. Overall expected result
8. Flags for test categorization:
   - is_edge_case: true/false
   - is_negative_test: true/false (for negative/unhappy path tests)
   - is_security_test: true/false (for security tests)
   - is_boundary_test: true/false (for boundary/limit tests)
9. Tags array (e.g., ["login", "authentication", "negative-test"])

CRITICAL REQUIREMENTS:
- Every step must be ACTIONABLE by Playwright automation
- Include EXACT test data (emails, passwords, names, values)
- Specify EXACT element selectors or button text
- Define CLEAR, VERIFIABLE expected results
- Use FULL URLs for navigation steps
- Break complex actions into individual steps
- Each step should map to a single Playwright command
- CORRECTLY FLAG each test with appropriate boolean values based on the test type`;
}

// ----- Main Handler -----
export async function POST(request: Request) {
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

    // Input
    const body = (await request.json()) as {
      requirements?: string;
      requirement_id?: string;
      project_id?: string | null;
      model?: string;
      testCaseCount?: number | string;
      testTypes?: string[]; // NEW: Array of test type strings
      template?: string;
      title?: string;
      description?: string | null;
      application_url?: string;
    };

    const requirements = (body.requirements ?? "").trim();
    const requirement_id = body.requirement_id || null;
    const modelKey = (body.model as ModelKey) || DEFAULT_MODEL;
    const testCaseCount = Number(body.testCaseCount ?? 10);
    const testTypes = Array.isArray(body.testTypes)
      ? body.testTypes
      : ["happy-path"];
    const template = body.template ?? "";
    const title = (body.title ?? "").trim();
    const description = body.description ?? null;
    const application_url = (body.application_url ?? "").trim();
    const project_id = body.project_id || null;

    // Validation
    if (!requirements) {
      return NextResponse.json(
        { error: "Requirements are required", field: "requirements" },
        { status: 400 },
      );
    }
    if (!title) {
      return NextResponse.json(
        { error: "Generation title is required", field: "title" },
        { status: 400 },
      );
    }
    if (testCaseCount <= 0 || testCaseCount > 50) {
      return NextResponse.json(
        {
          error: "Test case count must be between 1 and 50",
          field: "testCaseCount",
        },
        { status: 400 },
      );
    }
    if (testTypes.length === 0) {
      return NextResponse.json(
        {
          error: "At least one test type must be selected",
          field: "testTypes",
        },
        { status: 400 },
      );
    }

    // Quota check
    try {
      await checkAndRecordUsage(user.id, testCaseCount);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Usage limit exceeded";
      return NextResponse.json(
        { error: msg, upgradeRequired: true },
        { status: 429 },
      );
    }

    const model = AI_MODELS[modelKey];

    const promptUsed = buildPromptFromTestTypes({
      requirements,
      testCaseCount,
      testTypes,
      application_url,
      template,
    });

    // ---- Call LLM (primary, then fallback) ----
    const isAnthropicModel = model.startsWith("claude");
    const primary: "anthropic" | "openai" = isAnthropicModel
      ? "anthropic"
      : "openai";
    const fallback: "anthropic" | "openai" = isAnthropicModel
      ? "openai"
      : "anthropic";

    let rawText = "";
    let usedProvider = "";
    let usedModel = "";

    try {
      if (primary === "anthropic") {
        const res = await anthropic.messages.create({
          model: model,
          max_tokens: 8000,
          messages: [{ role: "user", content: promptUsed }],
        });
        rawText = anthropicTextFromContent(res.content);
        usedProvider = "anthropic";
        usedModel = model;
      } else {
        const res = await openai.chat.completions.create({
          model: model,
          messages: [{ role: "user", content: promptUsed }],
          max_tokens: 8000,
        });
        rawText = res.choices?.[0]?.message?.content ?? "";
        usedProvider = "openai";
        usedModel = model;
      }
    } catch (primaryError) {
      try {
        if (fallback === "anthropic") {
          const res = await anthropic.messages.create({
            model: FALLBACK_CLAUDE,
            max_tokens: 8000,
            messages: [{ role: "user", content: promptUsed }],
          });
          rawText = anthropicTextFromContent(res.content);
          usedProvider = "anthropic";
          usedModel = FALLBACK_CLAUDE;
        } else {
          const res = await openai.chat.completions.create({
            model: FALLBACK_GPT,
            messages: [{ role: "user", content: promptUsed }],
            max_tokens: 8000,
          });
          rawText = res.choices?.[0]?.message?.content ?? "";
          usedProvider = "openai";
          usedModel = FALLBACK_GPT;
        }
      } catch (fallbackError) {
        return NextResponse.json(
          {
            error:
              "Generation temporarily unavailable. Please try again later.",
          },
          { status: 503 },
        );
      }
    }

    // ---- Structure into JSON via OpenAI ----
    const structurePrompt = `Convert the following test cases into a structured JSON array. Each test case should have this exact format:

{
  "title": "string",
  "description": "string",
  "test_type": "string (functional, integration, unit, security, etc.)",
  "priority": "string (low, medium, high, critical)",
  "preconditions": "string or null",
  "test_steps": [
    {"step_number": 1, "action": "string", "expected": "string"},
    {"step_number": 2, "action": "string", "expected": "string"}
  ],
  "expected_result": "string",
  "is_edge_case": boolean,
  "is_negative_test": boolean,
  "is_security_test": boolean,
  "is_boundary_test": boolean,
  "tags": ["string"]
}

IMPORTANT: Correctly identify and flag each test based on its type.

Return a JSON object with a "test_cases" key containing the array, e.g. {"test_cases": [...]}

Test Cases to Convert:
${rawText}

Return ONLY valid JSON, no markdown, no explanation.`;

    let testCases: GeneratedTestCase[] = [];
    try {
      const structured = await openai.chat.completions.create({
        model: "gpt-4o-mini-2024-07-18",
        messages: [{ role: "user", content: structurePrompt }],
        response_format: { type: "json_object" },
        max_tokens: 8000,
      });
      const content = structured.choices?.[0]?.message?.content ?? "{}";
      const parsed = JSON.parse(content) as {
        test_cases?: GeneratedTestCase[];
        testCases?: GeneratedTestCase[];
      };
      testCases = Array.isArray(parsed.test_cases)
        ? parsed.test_cases
        : Array.isArray(parsed.testCases)
          ? parsed.testCases
          : [];
    } catch {
      const match = rawText.match(/\[[\s\S]*\]/);
      if (!match) {
        return NextResponse.json(
          { error: "Failed to structure test cases. Please regenerate." },
          { status: 500 },
        );
      }
      testCases = JSON.parse(match[0]) as GeneratedTestCase[];
    }

    if (!Array.isArray(testCases)) testCases = [];

    // ---- Persist generation ----
    const { data: generation, error: genError } = await supabase
      .from("test_case_generations")
      .insert({
        user_id: user.id,
        title,
        description,
        ai_provider: usedProvider === "anthropic" ? "anthropic" : "openai",
        ai_model: usedModel,
        prompt_used: promptUsed,
      })
      .select()
      .single();

    if (genError || !generation) {
      return NextResponse.json(
        { error: "Failed to save generation" },
        { status: 500 },
      );
    }

    // ---- Persist cases ----
    const rows = testCases.map((tc) => ({
      generation_id: generation.id,
      requirement_id,
      project_id,
      user_id: user.id,
      title: tc.title,
      description: tc.description,
      test_type: tc.test_type || "functional",
      priority: normalizePriority(tc.priority),
      preconditions: tc.preconditions ?? null,
      test_steps: tc.test_steps,
      expected_result: tc.expected_result,
      is_edge_case: Boolean(tc.is_edge_case),
      is_negative_test: Boolean(tc.is_negative_test),
      is_security_test: Boolean(tc.is_security_test),
      is_boundary_test: Boolean(tc.is_boundary_test),
      is_manual: false,
      status: "draft",
    }));

    const { data: savedCases, error: tcError } = await supabase
      .from("test_cases")
      .insert(rows)
      .select();

    if (tcError || !savedCases) {
      return NextResponse.json(
        { error: "Failed to save test cases" },
        { status: 500 },
      );
    }

    try {
      await recordSuccessfulGeneration(user.id, savedCases.length);
    } catch (recordError) {}

    return NextResponse.json({
      success: true,
      generation_id: generation.id,
      test_cases: savedCases,
      count: savedCases.length,
      provider_used: usedProvider,
      model_used: usedModel,
      statistics: {
        total: savedCases.length,
        negative: savedCases.filter((tc) => tc.is_negative_test).length,
        security: savedCases.filter((tc) => tc.is_security_test).length,
        boundary: savedCases.filter((tc) => tc.is_boundary_test).length,
        edge: savedCases.filter((tc) => tc.is_edge_case).length,
      },
    });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Unexpected error. Please try again." },
      { status: 500 },
    );
  }
}

// ----- Export model info for frontend -----
export async function GET() {
  return NextResponse.json({
    models: AI_MODELS,
    defaultModel: DEFAULT_MODEL,
  });
}
