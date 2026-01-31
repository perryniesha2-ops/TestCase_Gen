// app/api/automation/enhance-test-cases/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import OpenAI from "openai";

export const runtime = "nodejs";

// ============================================================================
// TYPES
// ============================================================================

interface TestStep {
  step_number?: number;
  action: string;
  expected: string;
  selector?: string;
  action_type?:
    | "click"
    | "fill"
    | "type"
    | "select"
    | "check"
    | "uncheck"
    | "hover"
    | "wait"
    | "navigate"
    | "press";
  input_value?: string;
  wait_time?: number;
  assertion?: {
    type:
      | "visible"
      | "hidden"
      | "text"
      | "exact-text"
      | "value"
      | "url"
      | "title"
      | "count"
      | "enabled"
      | "disabled"
      | "checked"
      | "attribute";
    target?: string;
    value?: any;
    attribute?: string;
  };
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function extractUrlFromAction(
  action: string,
  applicationUrl: string,
): string | null {
  const fullUrlMatch = action.match(/https?:\/\/[^\s]+/);
  if (fullUrlMatch) return fullUrlMatch[0];

  const pathMatch = action.match(/\/[a-z0-9\/-]+/i);
  if (pathMatch) return pathMatch[0];

  const navigateMatch = action
    .toLowerCase()
    .match(/navigate to|go to|visit|open/);
  if (navigateMatch) {
    const afterPhrase = action
      .substring(
        action.toLowerCase().indexOf(navigateMatch[0]) +
          navigateMatch[0].length,
      )
      .trim();
    const pathInPhrase = afterPhrase.match(
      /^(https?:\/\/[^\s]+|\/[a-z0-9\/-]+)/i,
    );
    if (pathInPhrase) return pathInPhrase[0];
  }

  return null;
}

function isNavigationAction(action: string): boolean {
  const navigationKeywords = [
    "navigate",
    "go to",
    "visit",
    "open",
    "load",
    "access",
    "browse to",
  ];
  const lowerAction = action.toLowerCase();
  return navigationKeywords.some((keyword) => lowerAction.includes(keyword));
}

// ============================================================================
// AUTOMATION ENHANCEMENT PROMPT
// ============================================================================

const AUTOMATION_ENHANCEMENT_PROMPT = `You are enhancing test case steps with automation data for Playwright.

For each test step, add these fields:
- selector: CSS selector, data-testid, or aria-label
- action_type: click|fill|type|select|check|uncheck|hover|wait|navigate|press
- input_value: Value to enter or URL (when applicable)
- wait_time: Milliseconds to wait (optional)
- assertion: Object with type, target, value, attribute

ACTION TYPES:
- click: Click an element
- fill: Fill input field (clears first)
- type: Type text sequentially
- select: Select dropdown option
- check/uncheck: Checkbox operations
- hover: Hover over element
- wait: Wait for element to appear
- navigate: Navigate to URL (CRITICAL: MUST set input_value to full URL or path)
- press: Press keyboard key

🚨 CRITICAL NAVIGATION RULES 🚨
For ANY step that involves navigation (navigate to, go to, visit, open, load, access, browse to), you MUST:
1. Set action_type = "navigate"
2. Set selector = "body" (always use "body" for navigation)
3. Set input_value = FULL URL OR PATH (this is REQUIRED - do not leave empty!)
   - If step mentions full URL like "https://app.example.com/login" → use that
   - If step mentions path like "/settings/profile" → use that
   - If step says "login page" → infer common path like "/login"
4. Set assertion with type "url" to verify navigation succeeded

NAVIGATION EXAMPLES:
{
  "step_number": 1,
  "action": "Navigate to https://app.example.com/settings/bank-accounts",
  "expected": "Settings page loads",
  "selector": "body",
  "action_type": "navigate",
  "input_value": "https://app.example.com/settings/bank-accounts",
  "assertion": {
    "type": "url",
    "value": "/settings/bank-accounts"
  }
}

{
  "step_number": 1,
  "action": "Go to the login page",
  "expected": "Login form appears",
  "selector": "body",
  "action_type": "navigate",
  "input_value": "/login",
  "assertion": {
    "type": "url",
    "value": "/login"
  }
}

SELECTOR PREFERENCES (in order):
1. [data-testid="..."] - Most stable
2. [aria-label="..."] - Semantic
3. input[name="..."] - Form fields
4. button[type="..."] - Semantic HTML
5. #id - If stable
6. .class - Only if stable

AVOID:
- Generated classes (.css-xyz-123)
- Fragile paths (div > div > button)
- Position selectors (:nth-child)

ASSERTION TYPES:
- visible: Element is visible
- hidden: Element is hidden
- text: Contains text
- exact-text: Exact text match
- value: Input has value
- url: Page URL matches (use for navigation!)
- title: Page title matches
- count: Element count (MUST be a NUMBER like 1, 5, 10 - NOT "> 0" or "< 5")
- enabled/disabled: Element state
- checked: Checkbox state
- attribute: Has attribute with value

COMPLETE EXAMPLES:

1. NAVIGATION WITH FULL URL:
{
  "step_number": 1,
  "action": "Navigate to https://app.example.com/dashboard",
  "expected": "Dashboard loads",
  "selector": "body",
  "action_type": "navigate",
  "input_value": "https://app.example.com/dashboard",
  "assertion": {
    "type": "url",
    "value": "/dashboard"
  }
}

2. NAVIGATION WITH PATH:
{
  "step_number": 1,
  "action": "Open settings page",
  "expected": "Settings page displays",
  "selector": "body",
  "action_type": "navigate",
  "input_value": "/settings",
  "assertion": {
    "type": "url",
    "value": "/settings"
  }
}

3. FILL INPUT:
{
  "step_number": 2,
  "action": "Enter email address",
  "expected": "Email field contains value",
  "selector": "input[name='email']",
  "action_type": "fill",
  "input_value": "test@example.com",
  "assertion": {
    "type": "value",
    "value": "test@example.com"
  }
}

4. TYPE PASSWORD:
{
  "step_number": 3,
  "action": "Type password",
  "expected": "Password field is masked",
  "selector": "input[name='password']",
  "action_type": "type",
  "input_value": "SecurePass123!",
  "assertion": {
    "type": "attribute",
    "attribute": "type",
    "value": "password"
  }
}

5. CLICK BUTTON:
{
  "step_number": 4,
  "action": "Click submit button",
  "expected": "Form submits successfully",
  "selector": "button[type='submit']",
  "action_type": "click",
  "wait_time": 2000,
  "assertion": {
    "type": "url",
    "value": "/dashboard"
  }
}

6. VERIFY ELEMENT:
{
  "step_number": 5,
  "action": "Verify success message appears",
  "expected": "Success message is visible",
  "selector": "[data-testid='success-message']",
  "action_type": "wait",
  "assertion": {
    "type": "visible"
  }
}

7. CHECK CHECKBOX:
{
  "step_number": 6,
  "action": "Accept terms and conditions",
  "expected": "Terms checkbox is checked",
  "selector": "input[name='terms']",
  "action_type": "check",
  "assertion": {
    "type": "checked"
  }
}

8. SELECT DROPDOWN:
{
  "step_number": 7,
  "action": "Select country",
  "expected": "Country is selected",
  "selector": "select[name='country']",
  "action_type": "select",
  "input_value": "United States",
  "assertion": {
    "type": "value",
    "value": "US"
  }
}

CRITICAL RULES:
✓ EVERY navigation step MUST have selector="body" and input_value with URL/path
✓ Use realistic test data (john@example.com, not "valid email")
✓ Infer selectors from action descriptions using semantic HTML when possible
✓ Include assertions that verify the expected outcome
✓ Add wait_time (milliseconds) for async operations
✓ For verification steps without actions, use action_type="wait"`;

// ============================================================================
// POST-PROCESSING
// ============================================================================

function postProcessSteps(
  steps: TestStep[],
  applicationUrl: string,
): TestStep[] {
  return steps.map((step, index) => {
    const processedStep = { ...step };

    if (!processedStep.step_number) {
      processedStep.step_number = index + 1;
    }

    if (processedStep.action_type === "navigate") {
      if (!processedStep.selector || processedStep.selector === "") {
        processedStep.selector = "body";
      }

      if (!processedStep.input_value) {
        const extractedUrl = extractUrlFromAction(
          processedStep.action,
          applicationUrl,
        );
        if (extractedUrl) {
          processedStep.input_value = extractedUrl;
          console.log(
            `[Automation] Extracted URL for step ${processedStep.step_number}: ${extractedUrl}`,
          );
        } else {
          console.warn(
            `[Automation] Navigation step ${processedStep.step_number} missing URL - check: ${processedStep.action}`,
          );
        }
      }

      if (!processedStep.assertion || processedStep.assertion.type !== "url") {
        const urlValue = processedStep.input_value || "";
        const pathMatch = urlValue.match(/\/[a-z0-9\/-]*/i);
        if (pathMatch) {
          processedStep.assertion = {
            type: "url",
            value: pathMatch[0],
          };
        }
      }
    }

    if (
      !processedStep.action_type &&
      isNavigationAction(processedStep.action)
    ) {
      processedStep.action_type = "navigate";
      processedStep.selector = "body";

      const extractedUrl = extractUrlFromAction(
        processedStep.action,
        applicationUrl,
      );
      if (extractedUrl) {
        processedStep.input_value = extractedUrl;
        console.log(
          `[Automation] Inferred navigation for step ${processedStep.step_number}`,
        );
      }
    }

    return processedStep;
  });
} // ← THIS WAS MISSING!

// ============================================================================
// MAIN HANDLER
// ============================================================================

export async function POST(req: Request) {
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

    // Parse body
    const body = (await req.json()) as {
      test_case_ids?: string[];
      suite_id?: string;
      application_url?: string;
    };

    const testCaseIds = body.test_case_ids || [];
    const suiteId = body.suite_id;
    const applicationUrl = body.application_url || "https://app.example.com";

    console.log("[Automation] Request:", {
      test_case_ids: testCaseIds.length,
      suite_id: suiteId,
      application_url: applicationUrl,
    });

    // Validate input
    if (!testCaseIds.length && !suiteId) {
      return NextResponse.json(
        { error: "Either test_case_ids or suite_id is required" },
        { status: 400 },
      );
    }

    // Get suite info if suite_id provided
    let suiteKind: string | null = null;
    if (suiteId) {
      const { data: suite, error: suiteError } = await supabase
        .from("suites")
        .select("id, kind, user_id")
        .eq("id", suiteId)
        .eq("user_id", user.id)
        .single();

      if (suiteError || !suite) {
        return NextResponse.json({ error: "Suite not found" }, { status: 404 });
      }

      suiteKind = suite.kind;
    }

    // Get test case IDs from suite if provided
    let finalTestCaseIds = testCaseIds;
    if (suiteId && suiteKind === "regular") {
      // For regular suites, get test cases from suite_items
      const { data: suiteItems } = await supabase
        .from("suite_items")
        .select("test_case_id")
        .eq("suite_id", suiteId)
        .not("test_case_id", "is", null);

      finalTestCaseIds =
        (suiteItems
          ?.map((item) => item.test_case_id)
          .filter(Boolean) as string[]) || [];
      console.log(
        `[Automation] Found ${finalTestCaseIds.length} test cases in regular suite`,
      );
    } else if (suiteId && suiteKind === "cross-platform") {
      // For cross-platform suites, get platform test cases from suite_items
      const { data: suiteItems } = await supabase
        .from("suite_items")
        .select("platform_test_case_id")
        .eq("suite_id", suiteId)
        .not("platform_test_case_id", "is", null);

      const platformTestCaseIds =
        (suiteItems
          ?.map((item) => item.platform_test_case_id)
          .filter(Boolean) as string[]) || [];
      console.log(
        `[Automation] Found ${platformTestCaseIds.length} platform test cases in cross-platform suite`,
      );

      // Handle platform test cases separately (they have different schema)
      return await handleCrossPlatformAutomation(
        supabase,
        user.id,
        suiteId,
        platformTestCaseIds,
        applicationUrl,
      );
    }

    if (finalTestCaseIds.length === 0) {
      return NextResponse.json(
        { error: "No test cases found" },
        { status: 404 },
      );
    }

    // Fetch regular test cases
    const { data: testCases, error: fetchError } = await supabase
      .from("test_cases")
      .select("id, title, description, test_steps, expected_result")
      .in("id", finalTestCaseIds)
      .eq("user_id", user.id);

    if (fetchError || !testCases) {
      console.error("[Automation] Fetch error:", fetchError);
      return NextResponse.json(
        { error: "Failed to fetch test cases" },
        { status: 500 },
      );
    }

    console.log(`[Automation] Fetched ${testCases.length} test cases`);

    // Filter out test cases that already have automation data
    const casesNeedingAutomation = testCases.filter((tc) => {
      const steps = Array.isArray(tc.test_steps) ? tc.test_steps : [];
      const hasAutomation = steps.some((s: any) => s.selector && s.action_type);
      return !hasAutomation;
    });

    console.log(
      `[Automation] ${casesNeedingAutomation.length} test cases need automation`,
    );

    if (casesNeedingAutomation.length === 0) {
      return NextResponse.json({
        success: true,
        message: "All test cases already have automation data",
        enhanced_count: 0,
        skipped_count: testCases.length,
      });
    }

    // Process each test case
    const enhanced: any[] = [];
    const failed: any[] = [];

    for (const tc of casesNeedingAutomation) {
      try {
        const steps = Array.isArray(tc.test_steps) ? tc.test_steps : [];

        if (steps.length === 0) {
          console.warn(`[Automation] Test case ${tc.id} has no steps`);
          failed.push({ id: tc.id, title: tc.title, reason: "No test steps" });
          continue;
        }

        console.log(
          `[Automation] Processing: ${tc.title} (${steps.length} steps)`,
        );

        const prompt = `${AUTOMATION_ENHANCEMENT_PROMPT}

APPLICATION URL: ${applicationUrl}

TEST CASE: ${tc.title}
DESCRIPTION: ${tc.description || "N/A"}
EXPECTED RESULT: ${tc.expected_result || "N/A"}

STEPS TO ENHANCE:
${JSON.stringify(steps, null, 2)}

Return ONLY a JSON object with an "enhanced_steps" array.`;

        const response = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [{ role: "user", content: prompt }],
          response_format: { type: "json_object" },
          max_tokens: 4000,
          temperature: 0.3,
        });

        const content = response.choices?.[0]?.message?.content ?? "{}";
        const parsed = JSON.parse(content) as { enhanced_steps?: TestStep[] };

        if (!parsed.enhanced_steps || !Array.isArray(parsed.enhanced_steps)) {
          console.error(`[Automation] Invalid AI response for ${tc.id}`);
          failed.push({
            id: tc.id,
            title: tc.title,
            reason: "Invalid AI response",
          });
          continue;
        }

        const enhanced_steps = postProcessSteps(
          parsed.enhanced_steps,
          applicationUrl,
        );

        // Update test case with enhanced steps
        const { error: updateError } = await supabase
          .from("test_cases")
          .update({ test_steps: enhanced_steps })
          .eq("id", tc.id);

        if (updateError) {
          console.error(`[Automation] Update error for ${tc.id}:`, updateError);
          failed.push({
            id: tc.id,
            title: tc.title,
            reason: updateError.message,
          });
        } else {
          console.log(`[Automation] ✓ Enhanced: ${tc.title}`);
          enhanced.push({
            id: tc.id,
            title: tc.title,
            steps_enhanced: enhanced_steps.length,
          });
        }
      } catch (error) {
        console.error(
          `[Automation] Failed to enhance test case ${tc.id}:`,
          error,
        );
        failed.push({
          id: tc.id,
          title: tc.title,
          reason: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    // Update suite automation metadata
    if (suiteId && enhanced.length > 0) {
      await supabase
        .from("suites")
        .update({
          automation_generated: true,
          last_generated_at: new Date().toISOString(),
          automation_ready_count: enhanced.length,
        })
        .eq("id", suiteId);
    }

    console.log(
      `[Automation] Complete: ${enhanced.length} enhanced, ${failed.length} failed`,
    );

    return NextResponse.json({
      success: true,
      enhanced_count: enhanced.length,
      skipped_count: testCases.length - casesNeedingAutomation.length,
      failed_count: failed.length,
      enhanced,
      failed,
    });
  } catch (error) {
    console.error("[Automation] Generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate automation data" },
      { status: 500 },
    );
  }
}

// ============================================================================
// CROSS-PLATFORM AUTOMATION HANDLER
// ============================================================================

async function handleCrossPlatformAutomation(
  supabase: any,
  userId: string,
  suiteId: string,
  platformTestCaseIds: string[],
  applicationUrl: string,
) {
  console.log("[Automation] Processing cross-platform suite");

  // Fetch platform test cases
  const { data: platformCases, error: fetchError } = await supabase
    .from("platform_test_cases")
    .select("id, title, description, steps, expected_results, platform")
    .in("id", platformTestCaseIds)
    .eq("user_id", userId);

  if (fetchError || !platformCases) {
    console.error("[Automation] Fetch error:", fetchError);
    return NextResponse.json(
      { error: "Failed to fetch platform test cases" },
      { status: 500 },
    );
  }

  const casesNeedingAutomation = platformCases.filter((tc: any) => {
    const steps = Array.isArray(tc.steps) ? tc.steps : [];
    const hasAutomation = steps.some((s: any) => s.selector && s.action_type);
    return !hasAutomation;
  });

  if (casesNeedingAutomation.length === 0) {
    return NextResponse.json({
      success: true,
      message: "All platform test cases already have automation data",
      enhanced_count: 0,
      skipped_count: platformCases.length,
    });
  }

  const enhanced: any[] = [];
  const failed: any[] = [];

  for (const tc of casesNeedingAutomation) {
    try {
      const steps = Array.isArray(tc.steps) ? tc.steps : [];

      if (steps.length === 0) {
        failed.push({ id: tc.id, title: tc.title, reason: "No test steps" });
        continue;
      }

      const prompt = `${AUTOMATION_ENHANCEMENT_PROMPT}

PLATFORM: ${tc.platform}
APPLICATION URL: ${applicationUrl}

TEST CASE: ${tc.title}
DESCRIPTION: ${tc.description || "N/A"}

STEPS TO ENHANCE:
${JSON.stringify(steps, null, 2)}

Return ONLY a JSON object with an "enhanced_steps" array.`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        max_tokens: 4000,
        temperature: 0.3,
      });

      const content = response.choices?.[0]?.message?.content ?? "{}";
      const parsed = JSON.parse(content) as { enhanced_steps?: TestStep[] };

      if (!parsed.enhanced_steps || !Array.isArray(parsed.enhanced_steps)) {
        failed.push({
          id: tc.id,
          title: tc.title,
          reason: "Invalid AI response",
        });
        continue;
      }

      const enhanced_steps = postProcessSteps(
        parsed.enhanced_steps,
        applicationUrl,
      );

      // Update platform test case
      const { error: updateError } = await supabase
        .from("platform_test_cases")
        .update({ steps: enhanced_steps })
        .eq("id", tc.id);

      if (updateError) {
        failed.push({
          id: tc.id,
          title: tc.title,
          reason: updateError.message,
        });
      } else {
        enhanced.push({
          id: tc.id,
          title: tc.title,
          platform: tc.platform,
          steps_enhanced: enhanced_steps.length,
        });
      }
    } catch (error) {
      failed.push({
        id: tc.id,
        title: tc.title,
        reason: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  // Update suite automation metadata
  if (enhanced.length > 0) {
    await supabase
      .from("suites")
      .update({
        automation_generated: true,
        last_generated_at: new Date().toISOString(),
        automation_ready_count: enhanced.length,
      })
      .eq("id", suiteId);
  }

  return NextResponse.json({
    success: true,
    suite_kind: "cross-platform",
    enhanced_count: enhanced.length,
    skipped_count: platformCases.length - casesNeedingAutomation.length,
    failed_count: failed.length,
    enhanced,
    failed,
  });
}
