import { NextResponse } from "next/server";
import JSZip from "jszip";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

// ============================================================================
// TYPES
// ============================================================================

type TestStep = {
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
};

type TestCaseRow = {
  id: string;
  title: string;
  description: string | null;
  test_type: string | null;
  expected_result: string | null;
  test_steps: unknown;
};

type SuiteRow = {
  id: string;
  name: string;
  description?: string | null;
  base_url?: string | null;
};

type SuiteLinkRow = {
  id: string;
  test_case_id: string | null;
  platform_test_case_id: string | null;
  sequence_order: number | null;
  priority: string | null;
  estimated_duration_minutes: number | null;
};

type PlatformTestCaseRow = {
  id: string;
  title: string;
  description: string | null;
  platform: string;
  framework: string | null;
  steps: string[];
  expected_results: string[] | null;
  automation_metadata: any;
};

// ============================================================================
// HELPERS
// ============================================================================

function safeSlug(input: string) {
  return String(input || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60);
}

function parseSteps(raw: unknown): TestStep[] {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw
      .map((s: any) => ({
        step_number: Number.isFinite(s?.step_number)
          ? Number(s.step_number)
          : undefined,
        action: String(s?.action ?? "").trim(),
        expected: String(s?.expected ?? "").trim(),
        selector: s?.selector ? String(s.selector).trim() : undefined,
        action_type: s?.action_type || undefined,
        input_value:
          s?.input_value !== undefined ? String(s.input_value) : undefined,
        wait_time: Number.isFinite(s?.wait_time)
          ? Number(s.wait_time)
          : undefined,
        assertion: s?.assertion || undefined,
      }))
      .filter((s) => s.action.length > 0 || s.expected.length > 0);
  }
  if (typeof raw === "string") {
    try {
      return parseSteps(JSON.parse(raw));
    } catch {
      return [];
    }
  }
  if (typeof raw === "object") {
    try {
      return parseSteps(Object.values(raw as Record<string, any>));
    } catch {
      return [];
    }
  }
  return [];
}

function escapeTemplateLiteral(s: string) {
  return s.replace(/`/g, "\\`").replace(/\$\{/g, "\\${");
}

function escapeString(s: string) {
  return s.replace(/\\/g, "\\\\").replace(/'/g, "\\'").replace(/\n/g, "\\n");
}

function resolveEnvVar(selector: string | undefined, value: string): string {
  const sel = (selector || "").toLowerCase();
  if (sel.includes("email") || sel.includes("username"))
    return `process.env.TEST_USER_EMAIL || '${escapeString(value)}'`;
  if (sel.includes("password"))
    return `process.env.TEST_USER_PASSWORD || '${escapeString(value)}'`;
  return `'${escapeString(value)}'`;
}

// ============================================================================
// STEP CODE GENERATOR
// ============================================================================

function detectGeneratedString(
  action: string,
  inputValue: string | undefined,
): string | null {
  const exactMatch = action.match(/exactly\s+(\d+)\s+char/i);
  const countMatch = action.match(/string of\s+(\d+)\s+char/i);
  const genericMatch = action.match(/(\d+)[- ]char/i);
  const match = exactMatch ?? countMatch ?? genericMatch;
  if (!match) return null;
  const count = parseInt(match[1], 10);
  if (!Number.isFinite(count) || count <= 0 || count > 100_000) return null;
  return `'a'.repeat(${count})`;
}

function generateExecutableStep(step: TestStep): string {
  const lines: string[] = [];
  const hasExecutableData = step.selector && step.action_type;

  if (hasExecutableData) {
    const sel = escapeString(step.selector!);

    switch (step.action_type) {
      case "click":
        lines.push(`await page.locator('${sel}').click();`);
        break;
      case "fill": {
        const generatedVal = detectGeneratedString(
          step.action,
          step.input_value,
        );
        if (generatedVal) {
          lines.push(
            `await page.locator('${sel}').evaluate((el, val) => { (el as HTMLInputElement).value = val; el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); }, ${generatedVal});`,
          );
        } else if (step.input_value !== undefined) {
          const val = resolveEnvVar(step.selector, step.input_value);
          lines.push(`await page.locator('${sel}').fill(${val});`);
        }
        break;
      }
      case "type":
        if (step.input_value !== undefined) {
          const val = resolveEnvVar(step.selector, step.input_value);
          lines.push(`await page.locator('${sel}').pressSequentially(${val});`);
        }
        break;
      case "select":
        if (step.input_value !== undefined) {
          lines.push(
            `await page.locator('${sel}').selectOption('${escapeString(step.input_value)}');`,
          );
        }
        break;
      case "check":
        lines.push(`await page.locator('${sel}').check();`);
        break;
      case "uncheck":
        lines.push(`await page.locator('${sel}').uncheck();`);
        break;
      case "hover":
        lines.push(`await page.locator('${sel}').hover();`);
        break;
      case "wait":
        lines.push(
          `await page.locator('${sel}').waitFor({ state: 'visible' });`,
        );
        break;
      case "navigate":
        if (step.input_value !== undefined) {
          let path = step.input_value;
          try {
            const parsed = new URL(step.input_value);
            path = parsed.pathname + parsed.search + parsed.hash;
          } catch {}
          const cleanPath = path.startsWith("/") ? path : `/${path}`;
          lines.push(
            `await page.goto(baseUrl + '${escapeString(cleanPath)}');`,
          );
        }
        break;
      case "press":
        if (step.input_value !== undefined) {
          lines.push(
            `await page.locator('${sel}').press('${escapeString(step.input_value)}');`,
          );
        }
        break;
    }

    if (step.wait_time) {
      lines.push(`await page.waitForTimeout(${step.wait_time});`);
    }

    if (step.assertion?.type) {
      const target = step.assertion.target || step.selector;
      const escapedTarget = escapeString(target!);

      switch (step.assertion.type) {
        case "visible":
          lines.push(
            `await expect(page.locator('${escapedTarget}')).toBeVisible();`,
          );
          break;
        case "hidden":
          lines.push(
            `await expect(page.locator('${escapedTarget}')).toBeHidden();`,
          );
          break;
        case "text":
          if (step.assertion.value !== undefined) {
            lines.push(
              `await expect(page.locator('${escapedTarget}')).toContainText('${escapeString(String(step.assertion.value))}');`,
            );
          }
          break;
        case "exact-text":
          if (step.assertion.value !== undefined) {
            lines.push(
              `await expect(page.locator('${escapedTarget}')).toHaveText('${escapeString(String(step.assertion.value))}');`,
            );
          }
          break;
        case "value":
          if (step.assertion.value !== undefined) {
            lines.push(
              `await expect(page.locator('${escapedTarget}')).toHaveValue('${escapeString(String(step.assertion.value))}');`,
            );
          }
          break;
        case "url":
          if (step.assertion.value !== undefined) {
            let assertPath = String(step.assertion.value);
            try {
              const parsed = new URL(assertPath);
              assertPath = parsed.pathname;
            } catch {}
            if (assertPath && assertPath !== "/") {
              lines.push(
                `await expect(page).toHaveURL(baseUrl + '${escapeString(assertPath)}');`,
              );
            } else {
              lines.push(`await expect(page).toHaveURL(baseUrl);`);
            }
          }
          break;
        case "title":
          if (step.assertion.value !== undefined) {
            lines.push(
              `await expect(page).toHaveTitle('${escapeString(String(step.assertion.value))}');`,
            );
          }
          break;
        case "count":
          if (step.assertion.value !== undefined) {
            const countValue = step.assertion.value;
            if (typeof countValue === "string") {
              const trimmed = countValue.trim();
              const countNum = parseInt(String(countValue), 10);
              const isLengthAssertion =
                (step.action_type === "fill" || step.action_type === "type") &&
                detectGeneratedString(step.action, step.input_value) !== null;

              if (isLengthAssertion && Number.isFinite(countNum)) {
                lines.push(
                  `const fieldValue = await page.locator('${escapedTarget}').inputValue();`,
                );
                lines.push(`expect(fieldValue).toHaveLength(${countNum});`);
                break;
              }
              if (trimmed.startsWith(">=")) {
                const num = trimmed.replace(/[>=\s]/g, "") || "0";
                lines.push(
                  `const elementCount = await page.locator('${escapedTarget}').count();`,
                );
                lines.push(
                  `expect(elementCount).toBeGreaterThanOrEqual(${num});`,
                );
                break;
              }
              if (trimmed.startsWith(">")) {
                const num = trimmed.replace(/[>\s]/g, "") || "0";
                lines.push(
                  `const elementCount = await page.locator('${escapedTarget}').count();`,
                );
                lines.push(`expect(elementCount).toBeGreaterThan(${num});`);
                break;
              }
              if (trimmed.startsWith("<=")) {
                const num = trimmed.replace(/[<=\s]/g, "") || "999";
                lines.push(
                  `const elementCount = await page.locator('${escapedTarget}').count();`,
                );
                lines.push(`expect(elementCount).toBeLessThanOrEqual(${num});`);
                break;
              }
              if (trimmed.startsWith("<")) {
                const num = trimmed.replace(/[<\s]/g, "") || "999";
                lines.push(
                  `const elementCount = await page.locator('${escapedTarget}').count();`,
                );
                lines.push(`expect(elementCount).toBeLessThan(${num});`);
                break;
              }
            }
            lines.push(
              `await expect(page.locator('${escapedTarget}')).toHaveCount(${countValue});`,
            );
          }
          break;
        case "enabled":
          lines.push(
            `await expect(page.locator('${escapedTarget}')).toBeEnabled();`,
          );
          break;
        case "disabled":
          lines.push(
            `await expect(page.locator('${escapedTarget}')).toBeDisabled();`,
          );
          break;
        case "checked":
          lines.push(
            `await expect(page.locator('${escapedTarget}')).toBeChecked();`,
          );
          break;
        case "attribute":
          if (step.assertion.attribute && step.assertion.value !== undefined) {
            lines.push(
              `await expect(page.locator('${escapedTarget}')).toHaveAttribute('${escapeString(step.assertion.attribute)}', '${escapeString(String(step.assertion.value))}');`,
            );
          }
          break;
      }
    }
  } else {
    lines.push(`// TODO: Implement action - ${escapeString(step.action)}`);
    lines.push(`// Expected: ${escapeString(step.expected)}`);
  }

  return lines.join("\n        ");
}

// ============================================================================
// RENDER FUNCTIONS
// ============================================================================

function renderCaseSpec(opts: {
  suiteId: string;
  caseKey: string;
  caseId: string;
  title: string;
  steps: TestStep[];
  requiresAuth: boolean;
}) {
  // Import is determined at runtime by synthqa.config.ts so the user
  // can change auth requirements locally without editing spec files.
  // The spec reads the config and picks the right test object.
  const firstStepIsNavigate = opts.steps[0]?.action_type === "navigate";

  const initialNav = firstStepIsNavigate
    ? ""
    : `
    await test.step("Navigate to application", async () => {
      await page.goto(baseUrl, { waitUntil: "domcontentloaded" });
    });
`;

  const stepsCode = opts.steps
    .map((step, idx) => {
      const stepNum = step.step_number ?? idx + 1;
      const executableCode = generateExecutableStep(step);
      return `
    await test.step(\`Step ${stepNum}: ${escapeTemplateLiteral(step.action)}\`, async () => {
        ${executableCode}

        await page.screenshot({
          path: testInfo.outputPath(\`step-${stepNum}.png\`),
          fullPage: true,
        });
    });`;
    })
    .join("\n");

  return `import { test as _authTest, expect } from "../fixtures";
import { test as _baseTest } from "@playwright/test";
import { testConfig } from "../../synthqa.config";

// Auth is controlled by synthqa.config.ts — edit that file to change
// whether this test runs authenticated or not.
const _requiresAuth = testConfig["${opts.caseId}"]?.requires_auth ?? ${opts.requiresAuth};
const test = _requiresAuth ? _authTest : _baseTest;

test.describe(\`${escapeTemplateLiteral(opts.title)}\`, () => {
  test(\`${opts.caseId}\`, async ({ page }, testInfo) => {
    const baseUrl = process.env.BASE_URL;
    if (!baseUrl) throw new Error("Missing BASE_URL");
${initialNav}
${stepsCode}

    await test.step("Final state", async () => {
      await page.screenshot({
        path: testInfo.outputPath("final.png"),
        fullPage: true,
      });
    });
  });
});
`;
}

function renderPlaywrightConfig(suiteId: string, baseUrl?: string) {
  const baseUrlFallback = baseUrl ? ` || "${baseUrl}"` : "";
  return `import { defineConfig } from "@playwright/test";
import "dotenv/config";

export default defineConfig({
  testDir: "./tests",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  retries: 1,
  reporter: [
    ["html", { open: "never" }],
    ["list"],
    ["./synthqa-reporter.ts", { suiteId: "${suiteId}" }],
  ],
  projects: [
    {
      name: "chromium",
      testMatch: /.*\.spec\.ts/,
      use: {
        baseURL: process.env.BASE_URL${baseUrlFallback},
        headless: true,
        trace: "on-first-retry",
        screenshot: "on",
        video: "retain-on-failure",
      },
    },
  ],
});
`;
}

function renderFixtures() {
  return `import { test as base } from '@playwright/test';

export const test = base.extend({
  page: async ({ page }, use) => {
    const email = process.env.USER_EMAIL;
    const password = process.env.USER_PASSWORD;
    const baseUrl = process.env.BASE_URL;
    if (email && password && baseUrl) {
      await page.goto(baseUrl + '/login');
      await page.fill('[name="email"]', email);
      await page.fill('[name="password"]', password);
      await page.click('button[type="submit"]');
      await page.waitForURL('**/dashboard', { timeout: 10000 }).catch(() => {});
    }
    await use(page);
  },
});

export { expect } from '@playwright/test';
`;
}

function renderPackageJson() {
  return JSON.stringify(
    {
      name: "synthqa-playwright",
      private: true,
      scripts: {
        test: "playwright test",
        "test:ui": "playwright test --ui",
        "test:headed": "playwright test --headed",
        report: "playwright show-report",
      },
      devDependencies: {
        "@playwright/test": "^1.46.0",
        dotenv: "^16.4.5",
        typescript: "^5.5.4",
      },
    },
    null,
    2,
  );
}

function renderTsconfig() {
  return JSON.stringify(
    {
      compilerOptions: {
        target: "ES2022",
        module: "ESNext",
        moduleResolution: "Bundler",
        strict: true,
        esModuleInterop: true,
        skipLibCheck: true,
        types: ["node"],
      },
      include: [
        "tests",
        "playwright.config.ts",
        "synthqa",
        "synthqa-reporter.ts",
      ],
    },
    null,
    2,
  );
}

function renderGitignore() {
  return `node_modules
playwright-report
test-results
.env
auth.json
`;
}

function renderEnvExample(opts: {
  baseUrl?: string;
  suiteId?: string;
  webhookUrl?: string;
  apiKey?: string;
}) {
  return `# Required
BASE_URL="${opts.baseUrl || "https://app.example.com"}"

# Authentication (leave blank if tests don't require login)
USER_EMAIL="test@example.com"
USER_PASSWORD="yourpassword123"

# SynthQA Integration
SYNTHQA_WEBHOOK_URL="${opts.webhookUrl || ""}"
SYNTHQA_API_KEY="${opts.apiKey || ""}"
SYNTHQA_SUITE_ID="${opts.suiteId || ""}"

# Override email/password used in test fill actions (defaults to USER_EMAIL/USER_PASSWORD)
TEST_USER_EMAIL=""
TEST_USER_PASSWORD=""
`;
}

function renderSynthQAReporter() {
  return `import type {
  Reporter,
  TestCase,
  TestResult,
  FullResult,
} from "@playwright/test/reporter";

class SynthQAReporter implements Reporter {
  private suiteId: string;
  private sessionId: string;
  private testResults: any[] = [];

  constructor(options: { suiteId: string }) {
    this.suiteId = options.suiteId || process.env.SYNTHQA_SUITE_ID || "unknown";
    this.sessionId = \`playwright-\${Date.now()}\`;
  }

  private getOS(): string {
    const p = process.platform;
    if (p === "darwin") return "macOS";
    if (p === "win32") return "Windows";
    return "Linux";
  }

  onTestEnd(test: TestCase, result: TestResult) {
    const duration = result.duration / 1000 / 60;
    this.testResults.push({
      test_case_id: this.extractTestCaseId(test),
      execution_status: this.mapStatus(result.status),
      started_at: new Date(Date.now() - result.duration).toISOString(),
      completed_at: new Date().toISOString(),
      duration_minutes: Math.max(duration, 0.01),
      execution_notes: this.getExecutionNotes(result),
      failure_reason: result.error?.message || null,
      stack_trace: result.error?.stack || null,
      browser: process.env.BROWSER || "chromium",
      os_version: this.getOS(),
      test_environment: process.env.TEST_ENV || "local",
      framework: "playwright",
      framework_version: this.getPlaywrightVersion(),
    });
  }

  async onEnd(_result: FullResult) {
    const passed  = this.testResults.filter((t) => t.execution_status === "passed").length;
    const failed  = this.testResults.filter((t) => t.execution_status === "failed").length;
    const skipped = this.testResults.filter((t) => t.execution_status === "skipped").length;

    const payload = {
      suite_id: this.suiteId,
      session_id: this.sessionId,
      framework: "playwright",
      test_results: this.testResults,
      metadata: {
        total_tests: this.testResults.length,
        passed_tests: passed,
        failed_tests: failed,
        skipped_tests: skipped,
        overall_status: failed > 0 ? "failed" : "passed",
        ci_provider: process.env.CI_PROVIDER || null,
        branch: process.env.GIT_BRANCH || null,
        commit_sha: process.env.GIT_COMMIT || null,
        commit_message: process.env.GIT_COMMIT_MESSAGE || null,
      },
    };

    await this.sendToSynthQA(payload);
  }

  private mapStatus(status: string): string {
    if (status === "passed") return "passed";
    if (status === "skipped") return "skipped";
    return "failed";
  }

  private extractTestCaseId(test: TestCase): string | null {
    const uuidRegex = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
    const match = test.title.match(uuidRegex);
    return match ? match[0] : null;
  }

  private getExecutionNotes(result: TestResult): string | null {
    if (result.retry > 0) return \`Test retried \${result.retry} time(s)\`;
    return result.status === "passed" ? "Test passed successfully" : null;
  }

  private getPlaywrightVersion(): string {
    try { return require("@playwright/test/package.json").version; }
    catch { return "unknown"; }
  }

  private async sendToSynthQA(data: any) {
    const webhookUrl = process.env.SYNTHQA_WEBHOOK_URL;
    const apiKey     = process.env.SYNTHQA_API_KEY;

    if (!webhookUrl) {
      console.log("⚠️  SYNTHQA_WEBHOOK_URL not set — skipping result upload");
      return;
    }
    if (!apiKey) {
      console.log("⚠️  SYNTHQA_API_KEY not set — skipping result upload");
      return;
    }

    try {
      console.log("📤 Sending results to SynthQA...");
      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: \`Bearer \${apiKey}\`,
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        console.error(\`❌ Failed to send results: \${response.status} \${response.statusText}\`);
        console.error(await response.text());
      } else {
        console.log("✅ Results sent to SynthQA");
      }
    } catch (error) {
      console.error("❌ Error sending results to SynthQA:", error);
    }
  }
}

export default SynthQAReporter;
`;
}

function renderReadme(opts: {
  suiteName: string;
  suiteId: string;
  caseCount: number;
}) {
  return `# SynthQA Playwright Project

Generated by SynthQA — AI-powered test automation

## Suite
- **Name**: ${opts.suiteName}
- **Test Cases**: ${opts.caseCount}
- **Generated**: ${new Date().toLocaleDateString()}

---

## Quick Start

\`\`\`bash
# 1. Install
pnpm install
npx playwright install

# 2. Configure environment
cp .env.example .env
# Edit .env and set BASE_URL, USER_EMAIL, USER_PASSWORD

# 3. Run tests
pnpm test

# 4. Debug in UI mode
pnpm test:ui
\`\`\`

---

## Project Structure

\`\`\`
├── tests/
│   ├── fixtures.ts           # Extends page with auto-login
│   └── cases/                # Generated test specs
├── synthqa/
│   ├── suite.json
│   └── cases/
├── synthqa-reporter.ts       # Sends results back to SynthQA
├── playwright.config.ts
├── .env.example
└── README.md
\`\`\`

---

## Authentication

- Tests that require login use \`../fixtures\` which reads \`USER_EMAIL\` and \`USER_PASSWORD\` from \`.env\` and logs in before each test
- Tests for login/auth flows use \`@playwright/test\` directly so they start unauthenticated
- If \`USER_EMAIL\` and \`USER_PASSWORD\` are not set, fixtures skips login and tests run as a guest

---

## Updating Selectors

AI-generated selectors are best-effort. Run tests once, note failures, then update selectors:

\`\`\`bash
# Generate selectors interactively
npx playwright codegen https://your-app.com
\`\`\`

---

## CI/CD

\`\`\`yaml
- run: pnpm test
  env:
    BASE_URL: \${{ secrets.BASE_URL }}
    USER_EMAIL: \${{ secrets.USER_EMAIL }}
    USER_PASSWORD: \${{ secrets.USER_PASSWORD }}
    SYNTHQA_WEBHOOK_URL: \${{ secrets.SYNTHQA_WEBHOOK_URL }}
    SYNTHQA_API_KEY: \${{ secrets.SYNTHQA_API_KEY }}
\`\`\`
`;
}

// ============================================================================
// SYNTHQA CONFIG — user-editable auth settings
// ============================================================================

function renderSynthQAConfig(
  cases: Array<{ id: string; title: string; requiresAuth: boolean }>,
) {
  const entries = cases
    .map(
      (c) => `  // ${c.title}
  "${c.id}": { requires_auth: ${c.requiresAuth} },`,
    )
    .join("\n");

  return `// synthqa.config.ts
//
// Controls whether each test runs authenticated (logged in) or
// unauthenticated (fresh browser with no session).
//
//   requires_auth: true  → uses ../fixtures (auto-login before test)
//   requires_auth: false → uses @playwright/test (starts logged out)
//
// Edit this file locally to override the defaults generated by SynthQA.
// You do NOT need to edit the spec files themselves.

export const testConfig: Record<string, { requires_auth: boolean }> = {
${entries}
};
`;
}

// ============================================================================
// AUTH-TEST DETECTION
// ============================================================================

const AUTH_KEYWORDS = [
  "login",
  "log in",
  "sign in",
  "sign-in",
  "register",
  "signup",
  "sign up",
  "sign-up",
  "forgot password",
  "reset password",
  "logout",
  "log out",
  "sign out",
];

function isAuthTest(title: string): boolean {
  const lower = title.toLowerCase();
  return AUTH_KEYWORDS.some((kw) => lower.includes(kw));
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) as {
      suiteId?: string;
    } | null;
    const suiteId = body?.suiteId?.trim();
    if (!suiteId) {
      return NextResponse.json(
        { ok: false, error: "Missing suiteId" },
        { status: 400 },
      );
    }

    const supabase = await createClient();
    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();
    if (userErr || !user) {
      return NextResponse.json(
        { ok: false, error: userErr?.message || "Not authenticated" },
        { status: 401 },
      );
    }

    const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL || "https://www.synthqa.app"}/api/automation/webhook/results`;

    const { data: profile } = await supabase
      .from("user_profiles")
      .select("api_key")
      .eq("id", user.id)
      .single();

    // ── Suite ──────────────────────────────────────────────────────────────────
    const { data: suite, error: suiteErr } = await supabase
      .from("suites")
      .select(
        "id, name, description, base_url, automation_framework, automation_status, export_count",
      )
      .eq("id", suiteId)
      .single<SuiteRow>();

    if (suiteErr || !suite) {
      return NextResponse.json(
        { ok: false, error: suiteErr?.message || "Suite not found" },
        { status: 404 },
      );
    }

    // ── Suite links ────────────────────────────────────────────────────────────
    const { data: suiteLinks, error: linksErr } = await supabase
      .from("suite_items")
      .select(
        "id, test_case_id, platform_test_case_id, sequence_order, priority, estimated_duration_minutes",
      )
      .eq("suite_id", suiteId)
      .order("sequence_order", { ascending: true })
      .returns<SuiteLinkRow[]>();

    if (linksErr) {
      return NextResponse.json(
        { ok: false, error: linksErr.message },
        { status: 500 },
      );
    }
    if (!suiteLinks || suiteLinks.length === 0) {
      return NextResponse.json(
        { ok: false, error: "No test cases linked to this suite" },
        { status: 400 },
      );
    }

    const regularIds = suiteLinks
      .map((l) => l.test_case_id)
      .filter((x): x is string => Boolean(x));
    const platformIds = suiteLinks
      .map((l) => l.platform_test_case_id)
      .filter((x): x is string => Boolean(x));

    // ── Test cases ─────────────────────────────────────────────────────────────
    const { data: testCases, error: casesErr } = await supabase
      .from("test_cases")
      .select("id, title, description, test_type, expected_result, test_steps")
      .in("id", regularIds)
      .returns<TestCaseRow[]>();

    if (casesErr) {
      return NextResponse.json(
        { ok: false, error: casesErr.message },
        { status: 500 },
      );
    }

    const { data: platformCases, error: platErr } = platformIds.length
      ? await supabase
          .from("platform_test_cases")
          .select(
            "id, title, description, platform, framework, steps, expected_results, automation_metadata",
          )
          .in("id", platformIds)
          .eq("platform", "web")
          .returns<PlatformTestCaseRow[]>()
      : { data: [] as PlatformTestCaseRow[], error: null };

    if (platErr) {
      return NextResponse.json(
        { ok: false, error: platErr.message },
        { status: 500 },
      );
    }

    function platformToSteps(tc: PlatformTestCaseRow): TestStep[] {
      const actions = Array.isArray(tc.steps) ? tc.steps : [];
      const expected = Array.isArray(tc.expected_results)
        ? tc.expected_results
        : [];
      const metaSteps = Array.isArray(tc.automation_metadata?.steps)
        ? tc.automation_metadata.steps
        : [];
      return actions
        .map((action, i) => {
          const meta = metaSteps[i] ?? {};
          return {
            step_number: i + 1,
            action: String(action ?? "").trim(),
            expected: String(expected[i] ?? "").trim(),
            selector: meta.selector ? String(meta.selector).trim() : undefined,
            action_type: meta.action_type,
            input_value:
              meta.input_value !== undefined
                ? String(meta.input_value)
                : undefined,
            wait_time: Number.isFinite(meta.wait_time)
              ? Number(meta.wait_time)
              : undefined,
            assertion: meta.assertion,
          };
        })
        .filter((s) => s.action.length > 0 || s.expected.length > 0);
    }

    const tcMap = new Map((testCases ?? []).map((tc) => [tc.id, tc]));
    const ptcMap = new Map((platformCases ?? []).map((tc) => [tc.id, tc]));

    const ordered = suiteLinks
      .map((link, idx) => {
        const orderNum = link.sequence_order ?? idx + 1;

        if (link.test_case_id) {
          const tc = tcMap.get(link.test_case_id);
          if (!tc) return null;
          const steps = parseSteps(tc.test_steps);
          const caseKey = `${String(orderNum).padStart(3, "0")}-${safeSlug(tc.title)}-${tc.id.slice(0, 8)}`;
          return { link, tc, steps, caseKey, source: "regular" as const };
        }

        if (link.platform_test_case_id) {
          const ptc = ptcMap.get(link.platform_test_case_id);
          if (!ptc) return null;
          const steps = platformToSteps(ptc);
          const caseKey = `${String(orderNum).padStart(3, "0")}-${safeSlug(ptc.title)}-${ptc.id.slice(0, 8)}`;
          const normalized: TestCaseRow = {
            id: ptc.id,
            title: ptc.title,
            description: ptc.description,
            test_type: "web",
            expected_result: null,
            test_steps: steps,
          };
          return {
            link,
            tc: normalized,
            steps,
            caseKey,
            source: "cross-platform-web" as const,
          };
        }

        return null;
      })
      .filter((x): x is NonNullable<typeof x> => Boolean(x));

    // ── Build zip ──────────────────────────────────────────────────────────────
    const zip = new JSZip();
    const root = `synthqa-playwright-${safeSlug(suite.name) || "suite"}-${suite.id.slice(0, 8)}`;
    const add = (p: string, content: string) =>
      zip.file(`${root}/${p}`, content);

    add("package.json", renderPackageJson());
    add(
      "playwright.config.ts",
      renderPlaywrightConfig(suiteId, suite.base_url ?? undefined),
    );
    add("tsconfig.json", renderTsconfig());
    add(
      ".env.example",
      renderEnvExample({
        baseUrl: suite.base_url ?? undefined,
        suiteId: suite.id,
        webhookUrl,
        apiKey: profile?.api_key ?? undefined,
      }),
    );
    add(".gitignore", renderGitignore());
    add("tests/fixtures.ts", renderFixtures());
    add(
      "synthqa.config.ts",
      renderSynthQAConfig(
        ordered.map((o) => ({
          id: o.tc.id,
          title: o.tc.title,
          requiresAuth: !isAuthTest(o.tc.title),
        })),
      ),
    );
    add("synthqa-reporter.ts", renderSynthQAReporter());
    add(
      "README.md",
      renderReadme({
        suiteName: suite.name,
        suiteId: suite.id,
        caseCount: ordered.length,
      }),
    );

    add(
      "synthqa/suite.json",
      JSON.stringify(
        {
          generatedAt: new Date().toISOString(),
          suite: {
            id: suite.id,
            name: suite.name,
            description: suite.description ?? null,
          },
          cases: ordered.map((o) => ({
            id: o.tc.id,
            title: o.tc.title,
            sequence_order: o.link.sequence_order ?? null,
            priority: o.link.priority ?? null,
            estimated_duration_minutes:
              o.link.estimated_duration_minutes ?? null,
            caseKey: o.caseKey,
          })),
        },
        null,
        2,
      ),
    );

    for (const o of ordered) {
      add(
        `synthqa/cases/${o.caseKey}.json`,
        JSON.stringify(
          {
            id: o.tc.id,
            title: o.tc.title,
            description: o.tc.description ?? null,
            test_type: o.tc.test_type ?? null,
            expected_result: o.tc.expected_result ?? null,
            test_steps: o.steps.map((s, i) => ({
              step_number: s.step_number ?? i + 1,
              action: s.action,
              expected: s.expected,
              ...(s.selector && { selector: s.selector }),
              ...(s.action_type && { action_type: s.action_type }),
              ...(s.input_value !== undefined && {
                input_value: s.input_value,
              }),
              ...(s.wait_time && { wait_time: s.wait_time }),
              ...(s.assertion && { assertion: s.assertion }),
            })),
          },
          null,
          2,
        ),
      );

      add(
        `tests/cases/${o.caseKey}.spec.ts`,
        renderCaseSpec({
          suiteId: suite.id,
          caseKey: o.caseKey,
          caseId: o.tc.id,
          title: o.tc.title,
          steps: o.steps,
          requiresAuth: !isAuthTest(o.tc.title),
        }),
      );
    }

    const zipBuffer = await zip.generateAsync({ type: "nodebuffer" });
    const fileName = `${root}.zip`;

    await supabase
      .from("suites")
      .update({
        last_export_at: new Date().toISOString(),
        export_count: ((suite as any).export_count ?? 0) + 1,
      })
      .eq("id", suiteId);

    if (
      (suite as any).automation_framework &&
      (suite as any).automation_framework !== "playwright" &&
      (suite as any).automation_status === "ready"
    ) {
      console.warn(
        `[export/playwright] Suite was enhanced for ${(suite as any).automation_framework} — selectors may not be optimised for Playwright`,
      );
    }

    return new Response(new Uint8Array(zipBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (e: any) {
    console.error("[export/playwright] error:", e);
    return NextResponse.json(
      { ok: false, error: e?.message || "Export failed" },
      { status: 500 },
    );
  }
}
