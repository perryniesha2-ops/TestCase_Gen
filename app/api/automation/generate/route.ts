// app/api/automation/enhance-test-cases/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import Anthropic from "@anthropic-ai/sdk";

export const runtime = "nodejs";
export const maxDuration = 120; // increased — batches of 4 AI calls can take >60s

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

type Framework =
  | "playwright"
  | "selenium"
  | "cypress"
  | "puppeteer"
  | "testcafe"
  | "webdriverio";

// ============================================================================
// CONFIGURATION
// ============================================================================

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

// Structured output schema — forces the AI to return valid JSON every time.
// Same pattern as the generate route (tool_use). No more JSON.parse fragility.
const ENHANCED_STEPS_SCHEMA: Anthropic.Tool["input_schema"] = {
  type: "object",
  required: ["enhanced_steps"],
  additionalProperties: false,
  properties: {
    enhanced_steps: {
      type: "array",
      items: {
        type: "object",
        required: ["step_number", "action", "expected"],
        additionalProperties: false,
        properties: {
          step_number: { type: "integer" },
          action: { type: "string" },
          expected: { type: "string" },
          action_type: {
            type: "string",
            enum: [
              "click",
              "fill",
              "type",
              "select",
              "check",
              "uncheck",
              "hover",
              "wait",
              "navigate",
              "press",
            ],
          },
          selector: { type: "string" },
          input_value: { type: "string" },
          wait_time: { type: "integer" },
          assertion: {
            type: "object",
            required: ["type"],
            additionalProperties: false,
            properties: {
              type: {
                type: "string",
                enum: [
                  "visible",
                  "hidden",
                  "text",
                  "exact-text",
                  "value",
                  "url",
                  "title",
                  "count",
                  "enabled",
                  "disabled",
                  "checked",
                  "attribute",
                ],
              },
              target: { type: "string" },
              value: { type: "string" },
              attribute: { type: "string" },
            },
          },
        },
      },
    },
  },
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Strips the origin from a URL so navigate steps contain path-only values.
 * Exporters prepend baseUrl themselves — full URLs cause double-URL bugs.
 *   https://app.example.com/generate  →  /generate
 *   /generate                         →  /generate  (unchanged)
 */
function toPathOnly(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.pathname + parsed.search + parsed.hash || "/";
  } catch {
    // Not a full URL — already a path or relative reference
    return url.startsWith("/") ? url : `/${url}`;
  }
}

function extractUrlFromAction(action: string): string | null {
  const fullUrlMatch = action.match(/https?:\/\/[^\s]+/);
  if (fullUrlMatch) return toPathOnly(fullUrlMatch[0]);

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
    if (pathInPhrase) return toPathOnly(pathInPhrase[0]);
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
  return navigationKeywords.some((kw) => action.toLowerCase().includes(kw));
}

/**
 * Strips automation fields for regeneration — also clears input_value so
 * the AI gets a fresh chance to set it correctly rather than inheriting a
 * previously wrong value.
 */
function stripAutomationFields(step: any) {
  if (!step || typeof step !== "object") return step;
  // Keep only the human-readable fields — everything automation-related is regenerated
  const { action, expected, step_number } = step;
  return { step_number, action, expected };
}

/**
 * Truncates long action descriptions for the AI prompt — but NOT input_value.
 * input_value for boundary tests is intentionally long or empty (the exporter
 * generates the long string from the action description).
 */
function truncateForPrompt(step: any): any {
  if (!step || typeof step !== "object") return step;
  return {
    ...step,
    action:
      step.action?.length > 500
        ? step.action.slice(0, 500) + "... [truncated]"
        : step.action,
    // Do NOT truncate input_value — boundary tests need it preserved or empty
  };
}

// ============================================================================
// FRAMEWORK-SPECIFIC PROMPT ADDITIONS
// ============================================================================

function getFrameworkGuidance(framework: Framework): string {
  switch (framework) {
    case "cypress":
      return `
FRAMEWORK: Cypress
- Use CSS selectors compatible with cy.get()
- Do NOT use :has-text() — it crashes Cypress/Sizzle. Use [data-testid], [aria-label], or class selectors instead
- For text-based element selection use data-testid attributes
- navigate input_value should be path-only (e.g. /generate, not full URL)`;

    case "selenium":
      return `
FRAMEWORK: Selenium (Java)
- Use CSS selectors compatible with By.cssSelector()
- Do NOT use :has-text() — use XPath or data-testid instead
- Selectors go inside Java double-quoted strings — use single quotes inside: input[name='email']
- navigate input_value should be path-only (e.g. /generate, not full URL)`;

    case "puppeteer":
      return `
FRAMEWORK: Puppeteer
- Use CSS selectors compatible with page.click() and page.type()
- Do NOT use :has-text() — standard CSS only
- For text-based selection use [data-testid] or class selectors
- navigate input_value should be path-only (e.g. /generate, not full URL)`;

    case "playwright":
    default:
      return `
FRAMEWORK: Playwright
- Use CSS selectors, data-testid, aria-label, or role selectors
- :has-text() is supported but prefer data-testid for stability
- navigate input_value should be path-only (e.g. /generate, not full URL)`;
  }
}

// ============================================================================
// AUTOMATION ENHANCEMENT PROMPT
// ============================================================================

function buildEnhancementPrompt(
  tc: {
    title: string;
    description?: string | null;
    expected_result?: string | null;
  },
  stepsForModel: any[],
  applicationUrl: string,
  framework: Framework,
  platform?: string,
): string {
  const frameworkGuidance = getFrameworkGuidance(framework);
  const platformCtx = platform ? `\nPLATFORM: ${platform}` : "";

  return `You are enhancing test case steps with automation data.

${frameworkGuidance}${platformCtx}
APPLICATION URL: ${applicationUrl}
TEST CASE: ${tc.title}
DESCRIPTION: ${tc.description || "N/A"}
${tc.expected_result ? `EXPECTED RESULT: ${tc.expected_result}` : ""}

For each step, add:
  action_type  — click | fill | type | select | check | uncheck | hover | wait | navigate | press
  selector     — CSS selector for the target element (omit for navigate)
  input_value  — value to type/select, OR path for navigate (e.g. /generate)
  assertion    — what to verify after the action
  wait_time    — ms to wait (only for explicit waits with no selector)

SELECTOR PRIORITY:
  1. [data-testid="..."]
  2. input[name="..."] or textarea[name="..."]
  3. [aria-label="..."]
  4. button[type="submit"]
  5. #id (if stable)
  Avoid: positional selectors, long class chains, nth-child

NAVIGATION RULES — critical:
  - action_type = "navigate"
  - selector = "body"
  - input_value = PATH ONLY (e.g. /generate, /dashboard — never a full URL)
  - assertion = { type: "url", value: "/the-path" }

BOUNDARY / LONG STRING STEPS:
  - If the step says "type exactly N characters", "string of N characters", or similar:
    - Set action_type = "fill"
    - Set input_value = "" (empty string — the exporter generates the repeated string)
    - Set assertion = { type: "count", value: "N" } where N is the number from the action
    - Do NOT set assertion type to "attribute", "value", or "text" for these steps
    - Do NOT assert "have.value" or "have.attr" — assert the character count instead
  - Example: "Type exactly 5000 characters in the textarea"
    - input_value = ""
    - assertion = { type: "count", value: "5000" }

REALISTIC TEST DATA:
  - Use real-looking values: john@example.com, SecurePass123!, not "valid email"
  - For negative tests: wrong@invalid, WrongPassword123

STEPS TO ENHANCE:
${JSON.stringify(stepsForModel, null, 2)}

Call the enhance_steps tool with the enhanced_steps array.`;
}

// ============================================================================
// STRUCTURED AI CALL
// ============================================================================

async function enhanceStepsWithAI(
  prompt: string,
): Promise<{ enhanced_steps?: TestStep[] }> {
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4000,
    tools: [
      {
        name: "enhance_steps",
        description: "Return the enhanced test steps with automation data.",
        input_schema: ENHANCED_STEPS_SCHEMA,
      },
    ],
    tool_choice: { type: "any" },
    messages: [{ role: "user", content: prompt }],
  });

  const toolUse = response.content.find(
    (b: any): b is Anthropic.ToolUseBlock => b.type === "tool_use",
  );
  if (!toolUse) throw new Error("AI did not call the enhance_steps tool");

  return toolUse.input as { enhanced_steps?: TestStep[] };
}

// ============================================================================
// POST-PROCESSING
// ============================================================================

function postProcessSteps(
  steps: TestStep[],
  applicationUrl: string,
): TestStep[] {
  return steps.map((step, index) => {
    const s = { ...step };

    if (!s.step_number) s.step_number = index + 1;

    // Ensure all navigate steps have correct fields
    if (s.action_type === "navigate") {
      s.selector = "body";

      // Strip origin from input_value — exporters prepend baseUrl themselves
      if (s.input_value) {
        s.input_value = toPathOnly(s.input_value);
      } else {
        // Try to extract path from action text as fallback
        const extracted = extractUrlFromAction(s.action);
        if (extracted) s.input_value = extracted;
      }

      // Ensure URL assertion uses path only
      if (s.assertion?.type === "url" && s.assertion.value) {
        s.assertion.value = toPathOnly(s.assertion.value);
      } else if (!s.assertion && s.input_value) {
        s.assertion = { type: "url", value: s.input_value };
      }
    }

    // Heuristic: if action_type is missing but looks like navigation, set it
    if (!s.action_type && isNavigationAction(s.action)) {
      s.action_type = "navigate";
      s.selector = "body";
      const extracted = extractUrlFromAction(s.action);
      if (extracted) s.input_value = extracted;
    }

    return s;
  });
}

// ============================================================================
// BATCH PROCESSOR
// ============================================================================

async function processBatch<T = any>(
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
      automation_framework?: Framework;
    };

    const testCaseIds = body.test_case_ids || [];
    const suiteId = body.suite_id;
    const applicationUrl = body.application_url || "https://app.example.com";
    const framework: Framework = body.automation_framework || "playwright";
    // shouldRegenerate may be promoted to true later if framework changed
    let shouldRegenerate = Boolean(body.regenerate);

    if (!testCaseIds.length && !suiteId) {
      return NextResponse.json(
        { error: "Either test_case_ids or suite_id is required" },
        { status: 400 },
      );
    }

    if (suiteId) {
      const { data: suite, error: suiteError } = await supabase
        .from("suites")
        .select("id, kind, user_id, automation_framework")
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

      // If the requested framework differs from what the suite was last enhanced
      // for, treat this as a regenerate regardless of the regenerate flag —
      // the existing selectors were optimised for a different framework.
      if (
        suite.automation_framework &&
        suite.automation_framework !== framework
      ) {
        console.log(
          `[enhance] Framework changed: ${suite.automation_framework} → ${framework}. Forcing regenerate.`,
        );
        // Promote regenerate for this request
        shouldRegenerate = true;
      }

      // Mark suite as in_progress immediately so UI can show a spinner
      await supabase
        .from("suites")
        .update({
          automation_status: "in_progress",
          automation_framework: framework,
          automation_config_updated_at: new Date().toISOString(),
        })
        .eq("id", suiteId);
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

      finalTestCaseIds = suiteItems
        .map((item: any) => item.test_case_id)
        .filter((id: any): id is string => Boolean(id));

      platformTestCaseIds = suiteItems
        .map((item: any) => item.platform_test_case_id)
        .filter((id: any): id is string => Boolean(id));

      if (finalTestCaseIds.length === 0 && platformTestCaseIds.length === 0) {
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

      const casesToProcess = testCases.filter((tc: any) => {
        const steps = Array.isArray(tc.test_steps) ? tc.test_steps : [];
        const hasAutomation = steps.some(
          (s: any) => s.selector && s.action_type,
        );
        if (!shouldRegenerate && hasAutomation) {
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

          // On regenerate: strip ALL automation fields so AI gets a clean slate.
          // On first-time enhance: send existing steps (AI fills missing fields only).
          const stepsForModel = (
            shouldRegenerate ? rawSteps.map(stripAutomationFields) : rawSteps
          ).map(truncateForPrompt);

          const prompt = buildEnhancementPrompt(
            tc,
            stepsForModel,
            applicationUrl,
            framework,
          );

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
        console.error("[Automation] Platform fetch error:", fetchError);
      } else {
        const casesNeedingAutomation = platformCases.filter((tc: any) => {
          const steps = Array.isArray(tc.steps) ? tc.steps : [];
          const hasAutomation = steps.some(
            (s: any) => typeof s === "object" && s.selector && s.action_type,
          );
          if (!shouldRegenerate && hasAutomation) {
            totalSkipped++;
            return false;
          }
          return true;
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

            // Normalise platform steps — they may be plain strings
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
              shouldRegenerate
                ? stepObjects.map(stripAutomationFields)
                : stepObjects
            ).map(truncateForPrompt);

            const prompt = buildEnhancementPrompt(
              { title: tc.title, description: tc.description },
              stepsForModel,
              applicationUrl,
              framework,
              tc.platform,
            );

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
    if (suiteId) {
      const now = new Date().toISOString();
      // Set ready if any cases were enhanced, otherwise back to not_configured
      // if nothing was enhanced and this wasn't a re-enhance run.
      const finalStatus =
        totalEnhanced > 0
          ? "ready"
          : totalFailed > 0 && totalEnhanced === 0
            ? "not_configured"
            : "ready"; // all skipped = already ready

      await supabase
        .from("suites")
        .update({
          automation_enabled: totalEnhanced > 0 || totalSkipped > 0,
          automation_status: finalStatus,
          automation_framework: framework,
          last_generated_at: now,
          automation_ready_count: totalEnhanced + totalSkipped, // total with automation data
          automated_by: user.id,
          automated_at: now,
          automation_config_updated_at: now,
        })
        .eq("id", suiteId);
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
    console.error("[Automation] Enhancement error:", error);
    return NextResponse.json(
      { error: "Failed to enhance automation data" },
      { status: 500 },
    );
  }
}
