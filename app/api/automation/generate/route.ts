// app/api/automation/enhance-test-cases/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import Anthropic from "@anthropic-ai/sdk";

export const runtime = "nodejs";
export const maxDuration = 60;

const BATCH_SIZE = 4;

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

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

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

function stripAutomationFields(step: any) {
  if (!step || typeof step !== "object") return step;
  const { selector, action_type, input_value, wait_time, assertion, ...rest } =
    step;
  return rest;
}

function truncateLongValues(step: any): any {
  if (!step || typeof step !== "object") return step;
  return {
    ...step,
    action:
      step.action?.length > 500
        ? step.action.slice(0, 500) + "... [truncated]"
        : step.action,
    input_value:
      step.input_value?.length > 200
        ? step.input_value.slice(0, 200) + "... [truncated]"
        : step.input_value,
  };
}

function extractJson(raw: string): string {
  const match = raw.match(/\{[\s\S]*\}/);
  return match ? match[0] : "{}";
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

CRITICAL NAVIGATION RULES:
For ANY step that involves navigation (navigate to, go to, visit, open, load, access, browse to), you MUST:
1. Set action_type = "navigate"
2. Set selector = "body"
3. Set input_value = FULL URL OR PATH (REQUIRED)
4. Set assertion with type "url" to verify navigation succeeded

SELECTOR PREFERENCES (in order):
1. [data-testid="..."] - Most stable
2. [aria-label="..."] - Semantic
3. input[name="..."] - Form fields
4. button[type="..."] - Semantic HTML
5. #id - If stable
6. .class - Only if stable

AVOID: Generated classes, fragile paths (div > div > button), position selectors (:nth-child)

ASSERTION TYPES:
visible, hidden, text, exact-text, value, url, title, count (NUMBER only), enabled, disabled, checked, attribute

CRITICAL RULES:
- EVERY navigation step MUST have selector="body" and input_value with URL/path
- Use realistic test data (john@example.com, not "valid email")
- Infer selectors from action descriptions using semantic HTML
- Include assertions that verify the expected outcome
- Add wait_time (milliseconds) for async operations
- For verification steps without actions, use action_type="wait"`;

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
          processedStep.assertion = { type: "url", value: pathMatch[0] };
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
      }
    }

    return processedStep;
  });
}

// ============================================================================
// SHARED ANTHROPIC CALL
// ============================================================================

async function enhanceStepsWithAI(
  prompt: string,
): Promise<{ enhanced_steps?: TestStep[] }> {
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4000,
    messages: [{ role: "user", content: prompt }],
  });

  const content =
    response.content[0].type === "text" ? response.content[0].text : "{}";

  return JSON.parse(extractJson(content)) as { enhanced_steps?: TestStep[] };
}

// ============================================================================
// BATCH PROCESSOR — runs items in parallel chunks of BATCH_SIZE
// ============================================================================

async function processBatch<T>(
  items: T[],
  processor: (item: T) => Promise<void>,
): Promise<void> {
  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const batch = items.slice(i, i + BATCH_SIZE);
    await Promise.allSettled(batch.map(processor));
  }
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

export async function POST(req: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json()) as {
      test_case_ids?: string[];
      suite_id?: string;
      application_url?: string;
      regenerate?: boolean;
      automation_framework?:
        | "playwright"
        | "selenium"
        | "cypress"
        | "puppeteer"
        | "testcafe"
        | "webdriverio";
    };

    const testCaseIds = body.test_case_ids || [];
    const suiteId = body.suite_id;
    const applicationUrl = body.application_url || "https://app.example.com";
    const regenerate = Boolean(body.regenerate);

    if (!testCaseIds.length && !suiteId) {
      return NextResponse.json(
        { error: "Either test_case_ids or suite_id is required" },
        { status: 400 },
      );
    }

    if (suiteId) {
      const { data: suite, error: suiteError } = await supabase
        .from("suites")
        .select("id, kind, user_id")
        .eq("id", suiteId)
        .eq("user_id", user.id)
        .single();

      if (suiteError || !suite) {
        return NextResponse.json(
          {
            error: "Suite not found",
            hint: "Make sure the suite exists and belongs to you",
          },
          { status: 404 },
        );
      }
    }

    let finalTestCaseIds = testCaseIds;
    let platformTestCaseIds: string[] = [];

    if (suiteId) {
      const { data: suiteItems, error: itemsError } = await supabase
        .from("suite_items")
        .select("test_case_id, platform_test_case_id")
        .eq("suite_id", suiteId);

      if (itemsError) {
        return NextResponse.json(
          { error: "Failed to fetch suite items" },
          { status: 500 },
        );
      }

      if (!suiteItems || suiteItems.length === 0) {
        return NextResponse.json(
          {
            error: "No test cases found in suite",
            hint: "Add test cases to this suite first",
          },
          { status: 404 },
        );
      }

      const regularIds = suiteItems
        .map((item) => item.test_case_id)
        .filter((id): id is string => Boolean(id));

      const platformIds = suiteItems
        .map((item) => item.platform_test_case_id)
        .filter((id): id is string => Boolean(id));

      finalTestCaseIds = regularIds;
      platformTestCaseIds = platformIds;

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

    let totalEnhanced = 0;
    let totalSkipped = 0;
    let totalFailed = 0;
    const allEnhanced: any[] = [];
    const allFailed: any[] = [];

    // ── Regular test cases ──────────────────────────────────────────────────
    if (finalTestCaseIds.length > 0) {
      const { data: testCases, error: fetchError } = await supabase
        .from("test_cases")
        .select("id, title, description, test_steps, expected_result")
        .in("id", finalTestCaseIds)
        .eq("user_id", user.id);

      if (fetchError || !testCases) {
        return NextResponse.json(
          { error: "Failed to fetch test cases" },
          { status: 500 },
        );
      }

      const casesToProcess = testCases.filter((tc) => {
        const steps = Array.isArray(tc.test_steps) ? tc.test_steps : [];
        const hasAutomation = steps.some(
          (s: any) => s.selector && s.action_type,
        );
        if (!regenerate && hasAutomation) {
          totalSkipped++;
          return false;
        }
        return true;
      });

      await processBatch(casesToProcess, async (tc) => {
        try {
          const rawSteps = Array.isArray(tc.test_steps) ? tc.test_steps : [];

          if (rawSteps.length === 0) {
            allFailed.push({
              id: tc.id,
              title: tc.title,
              reason: "No test steps",
            });
            totalFailed++;
            return;
          }

          const stepsForModel = (
            regenerate ? rawSteps.map(stripAutomationFields) : rawSteps
          ).map(truncateLongValues);

          const prompt = `${AUTOMATION_ENHANCEMENT_PROMPT}

APPLICATION URL: ${applicationUrl}

TEST CASE: ${tc.title}
DESCRIPTION: ${tc.description || "N/A"}
EXPECTED RESULT: ${tc.expected_result || "N/A"}

STEPS TO ENHANCE:
${JSON.stringify(stepsForModel, null, 2)}

Return ONLY a valid JSON object with an "enhanced_steps" array. No explanation, no markdown, no backticks. Just the raw JSON.`;

          const parsed = await enhanceStepsWithAI(prompt);

          if (!parsed.enhanced_steps || !Array.isArray(parsed.enhanced_steps)) {
            allFailed.push({
              id: tc.id,
              title: tc.title,
              reason: "Invalid AI response",
            });
            totalFailed++;
            return;
          }

          const enhanced_steps = postProcessSteps(
            parsed.enhanced_steps,
            applicationUrl,
          );

          const { error: updateError } = await supabase
            .from("test_cases")
            .update({ test_steps: enhanced_steps })
            .eq("id", tc.id);

          if (updateError) {
            allFailed.push({
              id: tc.id,
              title: tc.title,
              reason: updateError.message,
            });
            totalFailed++;
          } else {
            allEnhanced.push({
              id: tc.id,
              title: tc.title,
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
      });
    }

    // ── Platform test cases ─────────────────────────────────────────────────
    if (platformTestCaseIds.length > 0) {
      const { data: platformCases, error: fetchError } = await supabase
        .from("platform_test_cases")
        .select("id, title, description, steps, expected_results, platform")
        .in("id", platformTestCaseIds)
        .eq("user_id", user.id);

      if (fetchError || !platformCases) {
        console.error("[Automation] Fetch error:", fetchError);
      } else {
        const casesNeedingAutomation = platformCases.filter((tc: any) => {
          const steps = Array.isArray(tc.steps) ? tc.steps : [];
          const hasAutomation = steps.some(
            (s: any) => typeof s === "object" && s.selector && s.action_type,
          );
          if (hasAutomation) totalSkipped++;
          return !hasAutomation;
        });

        await processBatch(casesNeedingAutomation, async (tc: any) => {
          try {
            const steps = Array.isArray(tc.steps) ? tc.steps : [];

            if (steps.length === 0) {
              allFailed.push({
                id: tc.id,
                title: tc.title,
                reason: "No test steps",
              });
              totalFailed++;
              return;
            }

            const stepObjects = steps.map((step: any, i: number) => {
              if (typeof step === "string") {
                return {
                  step_number: i + 1,
                  action: step,
                  expected: Array.isArray(tc.expected_results)
                    ? tc.expected_results[i] || ""
                    : "",
                };
              }
              return step;
            });

            const stepsForModel = (
              regenerate ? stepObjects.map(stripAutomationFields) : stepObjects
            ).map(truncateLongValues);

            const prompt = `${AUTOMATION_ENHANCEMENT_PROMPT}

PLATFORM: ${tc.platform}
APPLICATION URL: ${applicationUrl}

TEST CASE: ${tc.title}
DESCRIPTION: ${tc.description || "N/A"}

STEPS TO ENHANCE:
${JSON.stringify(stepsForModel, null, 2)}

Return ONLY a valid JSON object with an "enhanced_steps" array. No explanation, no markdown, no backticks. Just the raw JSON.`;

            const parsed = await enhanceStepsWithAI(prompt);

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
              return;
            }

            const enhanced_steps = postProcessSteps(
              parsed.enhanced_steps,
              applicationUrl,
            );

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
        });
      }
    }

    // ── Update suite metadata ───────────────────────────────────────────────
    if (suiteId && (totalEnhanced > 0 || regenerate)) {
      const now = new Date().toISOString();
      const { error: updateError } = await supabase
        .from("suites")
        .update({
          automation_enabled: true,
          automation_status: "ready",
          automation_generated: true,
          last_generated_at: now,
          automation_ready_count: totalEnhanced,
        })
        .eq("id", suiteId);

      if (updateError) {
        console.error("Failed to update suite metadata:", updateError);
      }
    }

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
  const { data: platformCases, error: fetchError } = await supabase
    .from("platform_test_cases")
    .select("id, title, description, steps, expected_results, platform")
    .in("id", platformTestCaseIds)
    .eq("user_id", userId);

  if (fetchError || !platformCases) {
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

  await processBatch(casesNeedingAutomation, async (tc: any) => {
    try {
      const steps = Array.isArray(tc.steps) ? tc.steps : [];

      if (steps.length === 0) {
        failed.push({ id: tc.id, title: tc.title, reason: "No test steps" });
        return;
      }

      const prompt = `${AUTOMATION_ENHANCEMENT_PROMPT}

PLATFORM: ${tc.platform}
APPLICATION URL: ${applicationUrl}

TEST CASE: ${tc.title}
DESCRIPTION: ${tc.description || "N/A"}

STEPS TO ENHANCE:
${JSON.stringify(steps, null, 2)}

Return ONLY a valid JSON object with an "enhanced_steps" array. No explanation, no markdown, no backticks. Just the raw JSON.`;

      const parsed = await enhanceStepsWithAI(prompt);

      if (!parsed.enhanced_steps || !Array.isArray(parsed.enhanced_steps)) {
        failed.push({
          id: tc.id,
          title: tc.title,
          reason: "Invalid AI response",
        });
        return;
      }

      const enhanced_steps = postProcessSteps(
        parsed.enhanced_steps,
        applicationUrl,
      );

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
  });

  const now = new Date().toISOString();

  if (enhanced.length > 0) {
    await supabase
      .from("suites")
      .update({
        automation_generated: true,
        last_generated_at: now,
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
