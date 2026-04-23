// lib/generation/test-case-generation.ts
// Shared logic used by both the main route (job creation) and the
// process route (actual LLM work). Extracted so neither route duplicates code.

import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import {
  getModelId,
  isAnthropicModel,
  getFallbackModel,
  type ModelKey,
} from "@/lib/ai-models/config";

// ─── Types ────────────────────────────────────────────────────────────────────

export type Priority = "low" | "medium" | "high" | "critical";

export interface TestStep {
  step_number: number;
  action: string;
  expected: string;
  action_type?:
    | "navigate"
    | "click"
    | "fill"
    | "select"
    | "check"
    | "uncheck"
    | "hover"
    | "wait"
    | "press";
  selector?: string;
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
      | "enabled"
      | "disabled"
      | "checked"
      | "attribute"
      | "count";
    target?: string;
    value?: string;
    attribute?: string;
  };
}

export interface GeneratedTestCase {
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

// ─── Constants ────────────────────────────────────────────────────────────────

export const BATCH_SIZE = 5;

export const PRIORITY_VALUES = new Set<Priority>([
  "low",
  "medium",
  "high",
  "critical",
]);
export const PRIORITY_ALIASES: Record<string, Priority> = {
  p0: "critical",
  blocker: "critical",
  p1: "high",
  p2: "medium",
  p3: "low",
};

// ─── Coverage areas ───────────────────────────────────────────────────────────

// ─── Coverage areas ───────────────────────────────────────────────────────────

export const COVERAGE_AREAS = [
  {
    name: "happy-path",
    label: "Core Flows",
    instruction: `Focus on HAPPY PATH and CORE FLOW scenarios that go BEYOND basic smoke tests:
- Complete multi-step workflows including all intermediate states, not just start and end
- Valid inputs at realistic complexity (long names, international characters, real-world data volumes)
- Successful CRUD operations verifying the data actually persisted after a page refresh
- Workflows that depend on prior state (e.g. create → edit → delete, not just create)
- Confirmation flows, success states, and any downstream side effects (emails, counts, logs)
- Role-based happy paths — the same action performed by different user roles
- Re-doing an action that was previously completed (idempotency)

DO NOT generate: trivial "fill form and submit" cases with no state verification.
Set is_negative_test, is_boundary_test, is_edge_case, is_security_test = false on all cases.
Assign priority critical or high to the most important flows.`,
  },
  {
    name: "negative",
    label: "Error Handling",
    instruction: `Focus on NEGATIVE and ERROR HANDLING scenarios that QA teams routinely miss:

FORM VALIDATION (go beyond just "leave field empty"):
- Submit with only whitespace in required fields (spaces, tabs, newlines)
- Submit with valid format but logically invalid data (past date for future event, end date before start date)
- Paste content instead of typing — verify validation still fires
- Remove content after it was valid (re-empty a filled field and resubmit)
- Submit the same unique value twice (duplicate email, duplicate name)
- Fields that interact: password confirmation mismatch, dependent dropdowns in wrong combination

HTTP / NETWORK layer:
- Simulate slow network: verify loading states appear and don't allow double submission
- What happens when an API call returns a 500 — is there a user-facing error or silent failure?
- Expired session mid-form: fill a long form, session expires, submit — is data lost?

STATE ERRORS:
- Attempt an action on a resource that was deleted by another user/tab
- Try to act on a resource you don't own (wrong user ID in URL)
- Re-submitting a form after a failed submission without changing any data

Set is_negative_test = true on every case.`,
  },
  {
    name: "boundary",
    label: "Boundary Values",
    instruction: `Focus on BOUNDARY VALUE scenarios — test the exact limits, not just "too long":

NUMERIC:
- Exactly at minimum (valid), minimum minus 1 (invalid), exactly at maximum (valid), maximum plus 1 (invalid)
- Zero, negative numbers, and decimals where only integers are expected
- Very large numbers (999999999) and scientific notation strings ("1e5") in numeric fields
- Currency: $0.00, $0.01, maximum allowed amount, amounts with more than 2 decimal places

STRING LENGTH:
- Empty string, single character, exactly at max length (should pass), max+1 (should fail)
- Max length filled with special chars only, max length with unicode multibyte chars (each char may count as 2-4 bytes)

DATE / TIME:
- Today, yesterday, far future (year 9999), epoch (1970-01-01)
- Leap day Feb 29 on a leap year (valid) vs non-leap year (invalid)
- Timezone boundary: midnight UTC vs midnight local time producing different dates
- Daylight saving transition hours (2am on spring-forward day)

FILES:
- 0-byte file, 1-byte file, exactly at size limit, 1 byte over size limit
- Correct extension but wrong MIME type (rename .exe to .jpg)
- File with no extension
- Very long filename (255 chars), filename with special characters and spaces

COLLECTIONS:
- Empty list, exactly 1 item, exactly at the documented maximum, one over maximum
- Pagination: last page with exactly 1 item, requesting a page number beyond the last page

Set is_boundary_test = true on every case.`,
  },
  {
    name: "edge-case",
    label: "Edge Cases",
    instruction: `Focus on EDGE CASES that experienced QA engineers know to look for but junior testers miss:

INPUT CONTENT:
- Unicode and internationalization: Arabic/Hebrew RTL text in LTR fields, Chinese/Japanese characters, emoji (😀🔥), combined emoji (👨‍👩‍👧), zero-width spaces, null byte (%00)
- Names that break assumptions: "O'Brien", "José", "李", single-character names ("X"), hyphenated names ("Smith-Jones"), all-caps ("JOHN DOE")
- Numbers that look like other types: "007", "1.0", "1,000", " 42 " (with spaces), "+1"
- Strings that look like code: "null", "undefined", "NaN", "true", "false", "0", "{}", "[]"
- HTML-like content in plain text fields: "<b>bold</b>", "1 > 0", "a & b"
- Email edge cases: "user+tag@domain.com", "user@subdomain.domain.co.uk", very long local part

BROWSER / SESSION BEHAVIOR:
- Back button after completing a form — can the form be resubmitted?
- Duplicate tab: complete action in one tab, try same action in second tab
- Browser refresh mid-upload or mid-multi-step form
- Autofill: browser autofills wrong field or stale data, then user submits
- Copy-paste a value with hidden formatting characters from Word/Slack

CONCURRENCY:
- Two users editing the same record simultaneously — last write wins? conflict shown?
- Rapidly clicking submit multiple times before response returns
- Opening the same modal/dialog twice via keyboard shortcut

DISPLAY / RENDERING:
- Very long unbroken strings with no spaces (should not break layout)
- All fields at max length simultaneously (check for layout overflow)
- Content in a language that is 30% longer than English (German, Finnish) breaking button widths

Set is_edge_case = true on every case.`,
  },
  {
    name: "security",
    label: "Security",
    instruction: `Focus on SECURITY scenarios beyond basic XSS — these are the cases most QA teams never write:

INJECTION ATTACKS:
- SQL injection classics: ' OR '1'='1'--, '; DROP TABLE users;--, 1; SELECT * FROM users
- SQL injection in search/filter fields, sort parameters, and pagination parameters
- NoSQL injection (if applicable): {"$gt": ""}, {"$where": "1==1"}
- Command injection: ; ls -la, | whoami, \`id\`
- LDAP injection: *)(uid=*))(|(uid=*
- Template injection: {{7*7}}, ${7 * 7}, <%= 7*7 %>
- Path traversal: ../../etc/passwd, ..\\..\\windows\\system32

XSS:
- Stored XSS: save <script>alert(document.cookie)</script> in a text field, navigate away, return
- DOM XSS via URL parameters: inject script into query string, hash fragment
- XSS via file upload: SVG containing <script>, HTML file upload
- XSS bypass attempts: <ScRiPt>, <img src=x onerror=alert(1)>, javascript:alert(1) in href fields
- CSP bypass: data: URIs, inline event handlers

AUTHENTICATION & SESSION:
- Brute force login: 10+ rapid failed attempts — is there lockout or rate limiting?
- Credential stuffing pattern: valid email with many different passwords in quick succession  
- Password reset token reuse: use a reset link twice — second use should fail
- Session fixation: manipulate session cookie before login, verify it rotates after login
- Concurrent sessions: log in on device A, log in on device B, verify device A behavior
- JWT manipulation: decode JWT, change role claim from "user" to "admin", re-encode and send
- Remember me token: verify it expires, verify it's invalidated on password change

AUTHORIZATION (IDOR & privilege escalation):
- Change numeric ID in URL to another user's resource ID (/users/123/profile → /users/124/profile)
- Change ID in request body or query param to access another user's data
- Horizontal escalation: access /admin routes as a regular user
- Vertical escalation: perform admin actions (delete user, change role) as non-admin via direct API call
- Mass assignment: send extra fields in POST body (role: "admin", is_verified: true) and check if applied
- API endpoint enumeration: call endpoints referenced in JS bundles that have no UI surface

SENSITIVE DATA:
- Verify passwords are not echoed back in API responses or page source
- Verify tokens/secrets are not logged (check network response headers for Set-Cookie flags: Secure, HttpOnly, SameSite)
- Autocomplete="off" on sensitive fields (password, card number, SSN)
- Error messages must not leak stack traces, SQL queries, file paths, or internal IDs to the user

RATE LIMITING & ABUSE:
- Send 50+ requests in 10 seconds to a public endpoint — is there throttling?
- Enumerate valid usernames via timing difference or different error messages between "user not found" vs "wrong password"
- OTP/2FA brute force: try all 6-digit codes — is there lockout after N attempts?

Set is_security_test = true on every case.`,
  },
  {
    name: "integration",
    label: "Integration & State",
    instruction: `Focus on INTEGRATION and STATE MANAGEMENT scenarios — the bugs that only appear when features interact:

DATA CONSISTENCY:
- Create a record, verify it appears in: list view, detail view, search results, exported report, related entity counts
- Update a record and verify all downstream references update (foreign keys, denormalized counts, cached values)
- Delete a record and verify: it disappears from all views, related records are handled per spec (cascade vs restrict), audit log updated
- Soft-delete if applicable: verify soft-deleted records don't appear in normal queries but do appear in admin/trash view

MULTI-STEP STATE:
- Abandon a multi-step form halfway and return — is draft state preserved or lost?
- Complete step 2 of 3, navigate away, use browser back — are step 2 answers still filled?
- Concurrent edit: open record in two tabs, save in tab 1, attempt save in tab 2 — is there a conflict warning?
- Optimistic UI: action appears to succeed in UI, then API returns error — does UI correctly revert?

CROSS-FEATURE INTERACTION:
- Create entity A which is required by entity B, then delete A — what happens to B?
- Change a setting that affects display of another feature — verify the other feature reflects the new setting
- Notification/email triggered by an action — verify it fires exactly once, not on retries
- Pagination + filter: apply filter, go to page 3, remove filter — does pagination reset to page 1?
- Sort + search: apply sort, then search — does sort persist? Should it?

ASYNC & BACKGROUND JOBS:
- Trigger a long-running job, navigate away, return — does the UI correctly reflect the job status?
- Trigger the same job twice in quick succession — are duplicates prevented?
- Job failure: verify the user is notified and the system is left in a consistent state, not half-updated
- Webhook/callback: trigger action, verify third-party callback is received and processed correctly`,
  },
];

// ─── Schema ───────────────────────────────────────────────────────────────────

const STEP_SCHEMA: Anthropic.Tool["input_schema"] = {
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
        "navigate",
        "click",
        "fill",
        "select",
        "check",
        "uncheck",
        "hover",
        "wait",
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
            "enabled",
            "disabled",
            "checked",
            "attribute",
            "count",
          ],
        },
        target: { type: "string" },
        value: { type: "string" },
        attribute: { type: "string" },
      },
    },
  },
};

export const RESPONSE_SCHEMA: Anthropic.Tool["input_schema"] = {
  type: "object",
  required: ["test_cases"],
  additionalProperties: false,
  properties: {
    test_cases: {
      type: "array",
      items: {
        type: "object",
        required: [
          "title",
          "description",
          "test_type",
          "priority",
          "preconditions",
          "test_steps",
          "expected_result",
          "is_edge_case",
          "is_negative_test",
          "is_security_test",
          "is_boundary_test",
          "tags",
        ],
        additionalProperties: false,
        properties: {
          title: { type: "string" },
          description: { type: "string" },
          test_type: {
            type: "string",
            enum: [
              "functional",
              "security",
              "performance",
              "integration",
              "regression",
              "smoke",
            ],
          },
          priority: {
            type: "string",
            enum: ["low", "medium", "high", "critical"],
          },
          preconditions: { type: ["string", "null"] },
          test_steps: { type: "array", items: STEP_SCHEMA },
          expected_result: { type: "string" },
          is_edge_case: { type: "boolean" },
          is_negative_test: { type: "boolean" },
          is_security_test: { type: "boolean" },
          is_boundary_test: { type: "boolean" },
          tags: { type: "array", items: { type: "string" } },
        },
      },
    },
  },
};

// ─── Prompt ───────────────────────────────────────────────────────────────────

const STEP_GUIDELINES = `
AUTOMATION FIELDS — every step must include:
  action_type  — one of: navigate, click, fill, select, check, uncheck, hover, wait, press
  selector     — CSS selector for the target element (required for all except navigate)
  input_value  — the value to type/select/navigate to (required for fill, select, navigate)

SELECTOR PRIORITY (use the first that applies):
  1. [data-testid="submit-button"]
  2. input[name="email"]
  3. input[type="password"]
  4. [aria-label="Close dialog"]
  5. button:has-text("Sign in")
  Never use: nth-child, positional selectors, or long class chains

STEP EXAMPLES:
  Navigate:  action_type="navigate"  input_value="/login"  selector="body"  assertion={type:"url",value:"/login"}
  Fill:      action_type="fill"      selector="input[name='email']"  input_value="user@example.com"  assertion={type:"value",target:"input[name='email']",value:"user@example.com"}
  Click:     action_type="click"     selector="[data-testid='submit-btn']"  assertion={type:"visible",target:"[data-testid='success-msg']"}
  Wait:      action_type="wait"      selector="[data-testid='result']"  wait_time=5000  assertion={type:"text",target:"[data-testid='result']",value:"Saved"}
  Select:    action_type="select"    selector="select[name='role']"  input_value="Admin"

RULES:
  - Use path-only input_value for navigate steps ("/dashboard" not "https://...")
  - Use REALISTIC, SPECIFIC test data — not "test@test.com", "password123", "some text", or any placeholder
  - For security tests use actual attack strings, not descriptions of them
  - Every step that changes state MUST have an assertion verifying the outcome
  - Steps must be granular enough for a junior tester to follow without guessing
  - Include teardown steps if the test creates data that would affect other tests
`;

export function buildPrompt(params: {
  requirements: string;
  count: number;
  area: (typeof COVERAGE_AREAS)[number];
  batchIndex: number;
  totalBatches: number;
  allAreaNames: string[];
  application_url?: string;
  template?: string;
}): string {
  const {
    requirements,
    count,
    area,
    batchIndex,
    totalBatches,
    allAreaNames,
    application_url,
    template,
  } = params;

  const urlCtx = application_url
    ? `\nApplication base URL (context only — use path-only in navigate steps): ${application_url}`
    : "";
  const tmplCtx = template ? `\nTemplate to follow:\n${template}` : "";
  const otherAreas = allAreaNames.filter((n) => n !== area.name);
  const dedupeCtx =
    otherAreas.length > 0
      ? `\nOther batches cover: ${otherAreas.join(", ")}. Stay strictly within ${area.label} — do not bleed into those areas.`
      : "";

  return `You are a principal QA engineer with 15 years of experience finding bugs that automated scanners and junior testers miss. You write test cases for high-stakes production systems where a missed bug causes data loss, security breaches, or revenue impact.

Requirements to test:
${requirements}${urlCtx}${tmplCtx}

${STEP_GUIDELINES}

YOUR TASK — generate EXACTLY ${count} test case${count !== 1 ? "s" : ""} for: ${area.label.toUpperCase()}

${area.instruction}
${dedupeCtx}

ANTI-PATTERNS — never generate these:
  ✗ "Verify the page loads" — too trivial
  ✗ "Enter valid data and click submit" with no state verification after
  ✗ Variations of the same test that differ only in a field label
  ✗ Tests that any non-technical user would think of in under 10 seconds
  ✗ Security tests that describe an attack but use placeholder values (use real attack strings)
  ✗ Two cases where the only difference is which required field is omitted — combine into one parameterized case or pick the most revealing one

REQUIRED QUALITY BAR — every case must:
  ✓ Expose a bug class that would realistically reach production if untested
  ✓ Have a title specific enough that a developer can identify the exact scenario without reading the steps
  ✓ Include realistic, specific test data (real attack strings, real unicode, real boundary numbers)
  ✓ State what a PASS looks like AND what a FAIL looks like in expected_result
  ✓ Include any required preconditions (account type, feature flag, existing data setup)
  ✓ Cover the FULL scenario — setup, action, verification, and any teardown

Call the generate_test_cases tool with a test_cases array containing EXACTLY ${count} objects.`;
}

// ─── LLM callers ─────────────────────────────────────────────────────────────

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

async function callAnthropic(
  modelId: string,
  prompt: string,
  count: number,
): Promise<GeneratedTestCase[]> {
  const res = await anthropic.messages.create({
    model: modelId,
    max_tokens: Math.min(16000, Math.max(8000, count * 1600)),
    tools: [
      {
        name: "generate_test_cases",
        description: "Output the generated test cases as structured data.",
        input_schema: RESPONSE_SCHEMA,
      },
    ],
    tool_choice: { type: "any" },
    messages: [{ role: "user", content: prompt }],
  });
  const toolUse = res.content.find(
    (b): b is Anthropic.ToolUseBlock => b.type === "tool_use",
  );
  if (!toolUse)
    throw new Error(
      `Anthropic returned no tool call (stop_reason: ${res.stop_reason})`,
    );
  const input = toolUse.input as { test_cases?: GeneratedTestCase[] };
  return input.test_cases ?? [];
}

async function callOpenAI(
  modelId: string,
  prompt: string,
  count: number,
): Promise<GeneratedTestCase[]> {
  const res = await openai.chat.completions.create({
    model: modelId,
    max_tokens: Math.min(16000, Math.max(8000, count * 1600)),
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "generate_test_cases",
        strict: true,
        schema: RESPONSE_SCHEMA as unknown as Record<string, unknown>,
      },
    },
    messages: [{ role: "user", content: prompt }],
  });
  const raw = res.choices?.[0]?.message?.content ?? "{}";
  const parsed = JSON.parse(raw) as { test_cases?: GeneratedTestCase[] };
  return parsed.test_cases ?? [];
}

export async function callLLM(
  modelKey: ModelKey,
  prompt: string,
  count: number,
): Promise<GeneratedTestCase[]> {
  const primaryIsAnthropic = isAnthropicModel(modelKey);
  const primaryId = getModelId(modelKey);
  const fallbackKey = getFallbackModel(
    primaryIsAnthropic ? "openai" : "anthropic",
  );
  const fallbackId = getModelId(fallbackKey);

  // Try primary — treat 0-case response same as error, fall through to fallback
  try {
    const cases = primaryIsAnthropic
      ? await callAnthropic(primaryId, prompt, count)
      : await callOpenAI(primaryId, prompt, count);
    if (cases.length > 0) return cases;
    console.warn(
      `[LLM] Primary ${primaryId} returned 0 cases, trying fallback`,
    );
  } catch (err) {
    console.error(
      `[LLM] Primary ${primaryId} failed:`,
      (err as Error)?.message ?? err,
    );
  }

  // Fallback
  try {
    const cases = primaryIsAnthropic
      ? await callOpenAI(fallbackId, prompt, count)
      : await callAnthropic(fallbackId, prompt, count);
    if (cases.length > 0) return cases;
    console.warn(`[LLM] Fallback ${fallbackId} also returned 0 cases`);
  } catch (err) {
    console.error(
      `[LLM] Fallback ${fallbackId} failed:`,
      (err as Error)?.message ?? err,
    );
  }

  return [];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function normalizePriority(p: unknown): Priority {
  const s = (typeof p === "string" ? p : "").toLowerCase().trim();
  if (PRIORITY_ALIASES[s]) return PRIORITY_ALIASES[s];
  return PRIORITY_VALUES.has(s as Priority) ? (s as Priority) : "medium";
}

export interface BatchPlan {
  batchIndex: number;
  count: number;
  area: (typeof COVERAGE_AREAS)[number];
}

export function buildBatchPlan(totalCount: number): BatchPlan[] {
  const numBatches = Math.ceil(totalCount / BATCH_SIZE);
  const plans: BatchPlan[] = [];
  let remaining = totalCount;
  for (let i = 0; i < numBatches; i++) {
    plans.push({
      batchIndex: i,
      count: Math.min(BATCH_SIZE, remaining),
      area: COVERAGE_AREAS[i % COVERAGE_AREAS.length],
    });
    remaining -= Math.min(BATCH_SIZE, remaining);
  }
  return plans;
}
