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

    // ✅ FIX: Fetch suite info FIRST to get the kind
    let suiteKind: string | null = null;
    if (suiteId) {
      const { data: suite, error: suiteError } = await supabase
        .from("suites")
        .select("id, kind, user_id")
        .eq("id", suiteId)
        .eq("user_id", user.id)
        .single();

      if (suiteError || !suite) {
        console.error("[Automation] Suite not found:", suiteError);
        return NextResponse.json(
          {
            error: "Suite not found",
            hint: "Make sure the suite exists and belongs to you",
          },
          { status: 404 },
        );
      }

      suiteKind = suite.kind;
      console.log(`[Automation] Suite kind: ${suiteKind}`);
    }

    // Get test case IDs from suite if provided
    let finalTestCaseIds = testCaseIds;
    let platformTestCaseIds: string[] = [];

    if (suiteId) {
      // ✅ FIX: Fetch ALL suite items (both regular and platform)
      const { data: suiteItems, error: itemsError } = await supabase
        .from("suite_items")
        .select("test_case_id, platform_test_case_id")
        .eq("suite_id", suiteId);

      if (itemsError) {
        console.error("[Automation] Error fetching suite items:", itemsError);
        return NextResponse.json(
          { error: "Failed to fetch suite items" },
          { status: 500 },
        );
      }

      if (!suiteItems || suiteItems.length === 0) {
        console.warn("[Automation] Suite has no test cases");
        return NextResponse.json(
          {
            error: "No test cases found in suite",
            hint: "Add test cases to this suite first",
          },
          { status: 404 },
        );
      }

      // Extract regular test case IDs
      const regularIds = suiteItems
        .map((item) => item.test_case_id)
        .filter((id): id is string => Boolean(id));

      // Extract platform test case IDs
      const platformIds = suiteItems
        .map((item) => item.platform_test_case_id)
        .filter((id): id is string => Boolean(id));

      finalTestCaseIds = regularIds;
      platformTestCaseIds = platformIds;

      console.log(
        `[Automation] Found ${regularIds.length} regular + ${platformIds.length} platform test cases`,
      );

      // Check if suite is empty
      if (regularIds.length === 0 && platformIds.length === 0) {
        return NextResponse.json(
          {
            error: "No test cases found in suite",
            hint: "Add test cases to this suite first",
          },
          { status: 404 },
        );
      }
    }

    // ✅ FIX: Process regular test cases
    let totalEnhanced = 0;
    let totalSkipped = 0;
    let totalFailed = 0;
    const allEnhanced: any[] = [];
    const allFailed: any[] = [];

    // Process regular test cases if any
    if (finalTestCaseIds.length > 0) {
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

      console.log(
        `[Automation] Fetched ${testCases.length} regular test cases`,
      );

      // Filter out test cases that already have automation data
      const casesNeedingAutomation = testCases.filter((tc) => {
        const steps = Array.isArray(tc.test_steps) ? tc.test_steps : [];
        const hasAutomation = steps.some(
          (s: any) => s.selector && s.action_type,
        );
        if (hasAutomation) totalSkipped++;
        return !hasAutomation;
      });

      console.log(
        `[Automation] ${casesNeedingAutomation.length} regular test cases need automation`,
      );

      // Process each test case
      for (const tc of casesNeedingAutomation) {
        try {
          const steps = Array.isArray(tc.test_steps) ? tc.test_steps : [];

          if (steps.length === 0) {
            console.warn(`[Automation] Test case ${tc.id} has no steps`);
            allFailed.push({
              id: tc.id,
              title: tc.title,
              reason: "No test steps",
            });
            totalFailed++;
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
            allFailed.push({
              id: tc.id,
              title: tc.title,
              reason: "Invalid AI response",
            });
            totalFailed++;
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
            console.error(
              `[Automation] Update error for ${tc.id}:`,
              updateError,
            );
            allFailed.push({
              id: tc.id,
              title: tc.title,
              reason: updateError.message,
            });
            totalFailed++;
          } else {
            console.log(`[Automation] ✓ Enhanced: ${tc.title}`);
            allEnhanced.push({
              id: tc.id,
              title: tc.title,
              steps_enhanced: enhanced_steps.length,
            });
            totalEnhanced++;
          }
        } catch (error) {
          console.error(
            `[Automation] Failed to enhance test case ${tc.id}:`,
            error,
          );
          allFailed.push({
            id: tc.id,
            title: tc.title,
            reason: error instanceof Error ? error.message : "Unknown error",
          });
          totalFailed++;
        }
      }
    }

    // ✅ FIX: Process platform test cases if any
    if (platformTestCaseIds.length > 0) {
      const { data: platformCases, error: fetchError } = await supabase
        .from("platform_test_cases")
        .select("id, title, description, steps, expected_results, platform")
        .in("id", platformTestCaseIds)
        .eq("user_id", user.id);

      if (fetchError || !platformCases) {
        console.error("[Automation] Fetch error:", fetchError);
      } else {
        console.log(
          `[Automation] Fetched ${platformCases.length} platform test cases`,
        );

        const casesNeedingAutomation = platformCases.filter((tc: any) => {
          const steps = Array.isArray(tc.steps) ? tc.steps : [];
          // Platform test cases might have string steps or object steps
          const hasAutomation = steps.some(
            (s: any) => typeof s === "object" && s.selector && s.action_type,
          );
          if (hasAutomation) totalSkipped++;
          return !hasAutomation;
        });

        console.log(
          `[Automation] ${casesNeedingAutomation.length} platform test cases need automation`,
        );

        for (const tc of casesNeedingAutomation) {
          try {
            const steps = Array.isArray(tc.steps) ? tc.steps : [];

            if (steps.length === 0) {
              allFailed.push({
                id: tc.id,
                title: tc.title,
                reason: "No test steps",
              });
              totalFailed++;
              continue;
            }

            // Convert string steps to objects if needed
            const stepObjects = steps.map((step: any, i: number) => {
              if (typeof step === "string") {
                return {
                  step_number: i + 1,
                  action: step,
                  expected: tc.expected_results?.[i] || "",
                };
              }
              return step;
            });

            const prompt = `${AUTOMATION_ENHANCEMENT_PROMPT}

PLATFORM: ${tc.platform}
APPLICATION URL: ${applicationUrl}

TEST CASE: ${tc.title}
DESCRIPTION: ${tc.description || "N/A"}

STEPS TO ENHANCE:
${JSON.stringify(stepObjects, null, 2)}

Return ONLY a JSON object with an "enhanced_steps" array.`;

            const response = await openai.chat.completions.create({
              model: "gpt-4o-mini",
              messages: [{ role: "user", content: prompt }],
              response_format: { type: "json_object" },
              max_tokens: 4000,
              temperature: 0.3,
            });

            const content = response.choices?.[0]?.message?.content ?? "{}";
            const parsed = JSON.parse(content) as {
              enhanced_steps?: TestStep[];
            };

            if (
              !parsed.enhanced_steps ||
              !Array.isArray(parsed.enhanced_steps)
            ) {
              allFailed.push({
                id: tc.id,
                title: tc.title,
                reason: "Invalid AI response",
              });
              totalFailed++;
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
              allFailed.push({
                id: tc.id,
                title: tc.title,
                reason: updateError.message,
              });
              totalFailed++;
            } else {
              console.log(`[Automation] ✓ Enhanced platform test: ${tc.title}`);
              allEnhanced.push({
                id: tc.id,
                title: tc.title,
                platform: tc.platform,
                steps_enhanced: enhanced_steps.length,
              });
              totalEnhanced++;
            }
          } catch (error) {
            allFailed.push({
              id: tc.id,
              title: tc.title,
              reason: error instanceof Error ? error.message : "Unknown error",
            });
            totalFailed++;
          }
        }
      }
    }

    // ✅ FIX: Update suite metadata AFTER processing (not before!)
    if (suiteId && totalEnhanced > 0) {
      const { error: updateError } = await supabase
        .from("suites")
        .update({
          automation_enabled: true,
          automation_status: "ready",
          automation_generated: true,
          last_generated_at: new Date().toISOString(),
          automation_ready_count: totalEnhanced,
        })
        .eq("id", suiteId);

      if (updateError) {
        console.error("Failed to update suite metadata:", updateError);
      } else {
        console.log(
          `[Automation] ✓ Updated suite metadata: ${totalEnhanced} tests ready`,
        );
      }
    }

    console.log(
      `[Automation] Complete: ${totalEnhanced} enhanced, ${totalSkipped} skipped, ${totalFailed} failed`,
    );

    return NextResponse.json({
      success: true,
      enhanced_count: totalEnhanced,
      skipped_count: totalSkipped,
      failed_count: totalFailed,
      enhanced: allEnhanced,
      failed: allFailed,
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
