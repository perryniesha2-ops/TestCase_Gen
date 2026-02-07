// app/api/generate-test-cases/route.ts
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
  AI_MODELS,
} from "@/lib/ai-models/config";

export const runtime = "nodejs";

// ─── Types ───────────────────────────────────────────────────────────────────

interface TestStep {
  step_number: number;
  action: string;
  expected: string;
}

interface GeneratedTestCase {
  title: string;
  description: string;
  test_type: string;
  priority: Priority;
  preconditions: string | null;
  test_steps: TestStep[];
  expected_result: string;
  is_edge_case: boolean;
  is_negative_test: boolean;
  is_security_test: boolean;
  is_boundary_test: boolean;
  tags?: string[];
}

interface RequestBody {
  requirements?: string;
  requirement_id?: string;
  project_id?: string | null;
  model?: string;
  testCaseCount?: number | string;
  testTypes?: string[];
  template?: string;
  title?: string;
  description?: string | null;
  application_url?: string;
}

// ─── AI Configuration ────────────────────────────────────────────────────────

type Priority = "low" | "medium" | "high" | "critical";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

// ─── Constants ───────────────────────────────────────────────────────────────

const PRIORITY_VALUES = new Set<Priority>([
  "low",
  "medium",
  "high",
  "critical",
]);

const PRIORITY_ALIASES: Record<string, Priority> = {
  p0: "critical",
  blocker: "critical",
  p1: "high",
  p2: "medium",
  p3: "low",
};

const TEST_TYPE_LABELS: Record<string, string> = {
  "happy-path": "Happy Path",
  negative: "Negative",
  security: "Security",
  boundary: "Boundary",
  "edge-case": "Edge Case",
  performance: "Performance",
  integration: "Integration",
  regression: "Regression",
  smoke: "Smoke",
};

// ─── Test Type Instructions ─────────────────────────────────────────────────

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

// ─── Utility Functions ──────────────────────────────────────────────────────

function normalizePriority(p: unknown): Priority {
  const s = (typeof p === "string" ? p : "").toLowerCase().trim();
  if (PRIORITY_ALIASES[s]) return PRIORITY_ALIASES[s];
  return PRIORITY_VALUES.has(s as Priority) ? (s as Priority) : "medium";
}

function extractAnthropicText(blocks: unknown): string {
  if (!Array.isArray(blocks)) return "";
  return blocks
    .filter(
      (b): b is { type: "text"; text: string } =>
        typeof b === "object" &&
        b !== null &&
        (b as Record<string, unknown>).type === "text" &&
        typeof (b as Record<string, unknown>).text === "string",
    )
    .map((b) => b.text)
    .join("\n\n")
    .trim();
}

// ─── LLM Interaction ─────────────────────────────────────────────────────────

interface LLMResult {
  text: string;
  provider: "anthropic" | "openai";
  model: string;
}

async function callWithFallback(
  modelKey: ModelKey,
  prompt: string,
  maxTokens: number = 8000,
): Promise<LLMResult> {
  const primaryProvider: "anthropic" | "openai" = isAnthropicModel(modelKey)
    ? "anthropic"
    : "openai";

  const primaryModelId = getModelId(modelKey);

  const fallbackProvider: "anthropic" | "openai" =
    primaryProvider === "anthropic" ? "openai" : "anthropic";

  const fallbackKey = getFallbackModel(fallbackProvider);
  const fallbackModelId = getModelId(fallbackKey);

  const providers: Array<{ type: "anthropic" | "openai"; model: string }> =
    primaryProvider === "anthropic"
      ? [
          { type: "anthropic", model: primaryModelId },
          { type: "openai", model: fallbackModelId },
        ]
      : [
          { type: "openai", model: primaryModelId },
          { type: "anthropic", model: fallbackModelId },
        ];

  for (const provider of providers) {
    try {
      if (provider.type === "anthropic") {
        const res = await anthropic.messages.create({
          model: provider.model,
          max_tokens: maxTokens,
          messages: [{ role: "user", content: prompt }],
        });
        const text = extractAnthropicText(res.content);

        return { text, provider: "anthropic", model: provider.model };
      }

      const res = await openai.chat.completions.create({
        model: provider.model,
        messages: [{ role: "user", content: prompt }],
        max_tokens: maxTokens,
      });

      const text = res.choices?.[0]?.message?.content ?? "";
      return { text, provider: "openai", model: provider.model };
    } catch (err) {
      console.error(`❌ ${provider.type} failed:`, err);
      continue;
    }
  }

  throw new Error("All LLM providers failed");
}

// ─── Enhanced structuring with retry ────────────────────────────────────────

async function structureTestCases(
  rawText: string,
  expectedCount: number,
): Promise<GeneratedTestCase[]> {
  const prompt = `Convert the following test cases into a structured JSON array. Each test case should have this exact format:

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

IMPORTANT: 
- Correctly identify and flag each test based on its type
- You should extract EXACTLY ${expectedCount} test cases from the text below
- Do not skip any test cases

Return a JSON object with a "test_cases" key containing the array, e.g. {"test_cases": [...]}

Test Cases to Convert:
${rawText}

Return ONLY valid JSON, no markdown, no explanation.`;

  try {
    const res = await openai.chat.completions.create({
      model: "gpt-4o-mini-2024-07-18",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      max_tokens: 8000,
    });

    const content = res.choices?.[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(content) as {
      test_cases?: GeneratedTestCase[];
      testCases?: GeneratedTestCase[];
    };

    if (!content) {
      console.warn("⚠️ structureTestCases: Empty response from OpenAI");
    }

    const cases = parsed.test_cases ?? parsed.testCases ?? [];

    if (cases.length !== expectedCount) {
      console.warn(
        `⚠️ structureTestCases: Expected ${expectedCount} test cases, got ${cases.length}`,
      );
    }

    return cases;
  } catch (error) {
    console.error("❌ structureTestCases: JSON parsing failed:", error);

    // Last resort: pull a bare JSON array out of the raw text
    const match = rawText.match(/\[[\s\S]*\]/);
    if (!match) {
      console.error("❌ structureTestCases: No JSON array found in fallback");
      return [];
    }

    try {
      const fallbackCases = JSON.parse(match[0]) as GeneratedTestCase[];
      console.warn(
        `⚠️ structureTestCases: Used fallback parsing, got ${fallbackCases.length} cases (expected ${expectedCount})`,
      );
      return fallbackCases;
    } catch (fallbackError) {
      console.error(
        "❌ structureTestCases: Fallback parsing failed:",
        fallbackError,
      );
      return [];
    }
  }
}

// ─── Prompt Building ─────────────────────────────────────────────────────────

function buildPrompt(params: {
  requirements: string;
  testCaseCount: number;
  testTypes: string[];
  application_url?: string;
  template?: string;
}): string {
  const { requirements, testCaseCount, testTypes, application_url, template } =
    params;

  // Distribute cases as evenly as possible
  const perType = Math.floor(testCaseCount / testTypes.length);
  const remainder = testCaseCount % testTypes.length;

  const distribution = testTypes
    .map((type, i) => {
      const count = perType + (i < remainder ? 1 : 0);
      const label = TEST_TYPE_LABELS[type] ?? type;
      return `- ${count} ${label} test${count !== 1 ? "s" : ""}`;
    })
    .join("\n");

  const typeInstructions = testTypes
    .map((type) => TEST_TYPE_INSTRUCTIONS[type] ?? "")
    .filter(Boolean)
    .join("\n\n");

  const urlContext = application_url
    ? `\n\nAPPLICATION BASE URL: ${application_url}\nUse this as the base URL for all navigation steps.`
    : "";

  const templateContext = template
    ? `\n\nUse this template structure:\n${template}`
    : "";

  return `${AUTOMATION_GUIDELINES}

CRITICAL: You MUST generate EXACTLY ${testCaseCount} test cases total. This is a hard requirement.

TEST CASE DISTRIBUTION:
${distribution}

IMPORTANT: The above shows the TARGET distribution, but your PRIMARY goal is to generate EXACTLY ${testCaseCount} total test cases. If you cannot hit the exact distribution, adjust the numbers while maintaining ${testCaseCount} total.

${typeInstructions}

Generate test cases for the following requirements:

${requirements}${urlContext}${templateContext}

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
- CORRECTLY FLAG each test with appropriate boolean values based on the test type

REMINDER: Generate EXACTLY ${testCaseCount} test cases. No more, no less.`;
}
// ─── Route Handlers ──────────────────────────────────────────────────────────

// ─── Update POST handler ────────────────────────────────────────────────────

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

    const requirements = (body.requirements ?? "").trim();
    const requirement_id = body.requirement_id || null;
    const project_id = body.project_id || null;
    const rawModelKey = String(body.model ?? "").trim();
    const modelKey: ModelKey = rawModelKey
      ? migrateModelKey(rawModelKey)
      : getDefaultModel();

    if (!isModelAllowed(modelKey)) {
      return NextResponse.json(
        { error: "Unsupported AI model", field: "model" },
        { status: 400 },
      );
    }
    const testCaseCount = Number(body.testCaseCount ?? 10);
    const testTypes = Array.isArray(body.testTypes)
      ? body.testTypes
      : ["happy-path"];
    const template = body.template ?? "";
    const title = (body.title ?? "").trim();
    const description = body.description ?? null;
    const application_url = (body.application_url ?? "").trim();

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
    if (testCaseCount < 1 || testCaseCount > 50) {
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

    try {
      await checkUsageQuota(user.id, testCaseCount);
    } catch (e) {
      let remaining = 0;
      try {
        const { data: usage } = await supabase
          .from("user_usage_tracking")
          .select("test_cases_generated, test_case_limit")
          .eq("user_id", user.id)
          .single();

        if (usage) {
          const limit = usage.test_case_limit || 50; // Default free tier limit
          const used = usage.test_cases_generated || 0;
          remaining = Math.max(0, limit - used);
        }

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
      } catch (usageError) {
        console.error("Error fetching remaining usage:", usageError);
      }

      return NextResponse.json(
        {
          error: e instanceof Error ? e.message : "Usage limit exceeded",
          upgradeRequired: true,
          remaining,
          requested: testCaseCount,
        },
        { status: 429 },
      );
    }

    const prompt = buildPrompt({
      requirements,
      testCaseCount,
      testTypes,
      application_url,
      template,
    });

    let llmResult: LLMResult;
    try {
      llmResult = await callWithFallback(modelKey, prompt);
    } catch {
      return NextResponse.json(
        {
          error: "Generation temporarily unavailable. Please try again later.",
        },
        { status: 503 },
      );
    }

    let testCases = await structureTestCases(llmResult.text, testCaseCount);

    if (testCases.length < testCaseCount) {
      const retryPrompt = `${prompt}

CRITICAL CORRECTION: The previous generation only produced ${testCases.length} test cases but we need EXACTLY ${testCaseCount}.
Generate the FULL ${testCaseCount} test cases now. Do not skip any.`;

      try {
        const retryResult = await callWithFallback(modelKey, retryPrompt);

        const retryCases = await structureTestCases(
          retryResult.text,
          testCaseCount,
        );

        if (retryCases.length >= testCases.length) {
          testCases = retryCases;
          llmResult = retryResult; // Update to use retry result
        }
      } catch (retryError) {
        console.error("❌ Retry failed:", retryError);
        // Continue with original results
      }
    }

    testCases = testCases.slice(0, testCaseCount);

    const { data: generation, error: genError } = await supabase
      .from("test_case_generations")
      .insert({
        user_id: user.id,
        title,
        description,
        ai_provider: llmResult.provider,
        ai_model: llmResult.model,
        prompt_used: prompt,
      })
      .select()
      .single();

    if (genError || !generation) {
      return NextResponse.json(
        { error: "Failed to save generation" },
        { status: 500 },
      );
    }

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

    await recordSuccessfulGeneration(user.id, savedCases.length).catch(
      () => {},
    );

    return NextResponse.json({
      success: true,
      generation_id: generation.id,
      test_cases: savedCases,
      count: savedCases.length,
      requested_count: testCaseCount, // ✅ Show what was requested
      provider_used: llmResult.provider,
      model_used: llmResult.model,
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

export async function GET() {
  return NextResponse.json({
    models: AI_MODELS,
    defaultModel: getDefaultModel(),
  });
}
