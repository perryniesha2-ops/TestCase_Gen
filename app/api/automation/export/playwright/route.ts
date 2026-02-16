import { NextResponse } from "next/server";
import JSZip from "jszip";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

//============================================================================

type TestStep = {
  step_number?: number;
  action: string;
  expected: string;
  // Automation fields
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
// HELPER FUNCTIONS
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
      const arr = Object.values(raw as Record<string, any>);
      return parseSteps(arr);
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

// ============================================================================
// NEW: Generate executable Playwright code for a step
// ============================================================================

function generateExecutableStep(step: TestStep): string {
  const lines: string[] = [];

  // Check if step has executable data
  const hasExecutableData = step.selector && step.action_type;

  if (hasExecutableData) {
    const sel = escapeString(step.selector!);

    // Generate action code
    switch (step.action_type) {
      case "click":
        lines.push(`await page.locator('${sel}').click();`);
        break;

      case "fill":
        if (step.input_value !== undefined) {
          const val = escapeString(step.input_value);
          lines.push(`await page.locator('${sel}').fill('${val}');`);
        }
        break;

      case "type":
        if (step.input_value !== undefined) {
          const val = escapeString(step.input_value);
          lines.push(
            `await page.locator('${sel}').pressSequentially('${val}');`,
          );
        }
        break;

      case "select":
        if (step.input_value !== undefined) {
          const val = escapeString(step.input_value);
          lines.push(`await page.locator('${sel}').selectOption('${val}');`);
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
          const url = step.input_value;

          // ✅ FIX: Simple and predictable logic
          if (url.startsWith("http://") || url.startsWith("https://")) {
            // Full URL - use as-is (don't concatenate with baseUrl)
            lines.push(`await page.goto('${escapeString(url)}');`);
          } else {
            // Relative path - concatenate with baseUrl
            const path = url.startsWith("/") ? url : `/${url}`;
            lines.push(`await page.goto(baseUrl + '${escapeString(path)}');`);
          }
        }
        break;

      case "press":
        if (step.input_value !== undefined) {
          const val = escapeString(step.input_value);
          lines.push(`await page.locator('${sel}').press('${val}');`);
        }
        break;
    }

    // Add wait time if specified
    if (step.wait_time) {
      lines.push(`await page.waitForTimeout(${step.wait_time});`);
    }

    // Generate assertion code (unchanged - keep existing assertion logic)
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
            const val = escapeString(String(step.assertion.value));
            lines.push(
              `await expect(page.locator('${escapedTarget}')).toContainText('${val}');`,
            );
          }
          break;

        case "exact-text":
          if (step.assertion.value !== undefined) {
            const val = escapeString(String(step.assertion.value));
            lines.push(
              `await expect(page.locator('${escapedTarget}')).toHaveText('${val}');`,
            );
          }
          break;

        case "value":
          if (step.assertion.value !== undefined) {
            const val = escapeString(String(step.assertion.value));
            lines.push(
              `await expect(page.locator('${escapedTarget}')).toHaveValue('${val}');`,
            );
          }
          break;

        case "url":
          if (step.assertion.value !== undefined) {
            const val = escapeString(String(step.assertion.value));
            if (val.includes("/") || val.includes("^") || val.includes("$")) {
              const escapedPattern = val.replace(/\//g, "\\/");
              lines.push(`await expect(page).toHaveURL(/${escapedPattern}/);`);
            } else {
              // Simple string match - more reliable
              lines.push(`await expect(page).toHaveURL('${val}');`);
            }
          }
          break;

        case "title":
          if (step.assertion.value !== undefined) {
            const val = escapeString(String(step.assertion.value));
            lines.push(`await expect(page).toHaveTitle('${val}');`);
          }
          break;

        case "count":
          if (step.assertion.value !== undefined) {
            const countValue = step.assertion.value;

            // Handle comparison operators (check longer operators first!)
            if (typeof countValue === "string") {
              const trimmed = countValue.trim();

              // Check for >= operator FIRST (before >)
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

              // Check for > operator
              if (trimmed.startsWith(">")) {
                const num = trimmed.replace(/[>\s]/g, "") || "0";
                lines.push(
                  `const elementCount = await page.locator('${escapedTarget}').count();`,
                );
                lines.push(`expect(elementCount).toBeGreaterThan(${num});`);
                break;
              }

              // Check for <= operator FIRST (before <)
              if (trimmed.startsWith("<=")) {
                const num = trimmed.replace(/[<=\s]/g, "") || "999";
                lines.push(
                  `const elementCount = await page.locator('${escapedTarget}').count();`,
                );
                lines.push(`expect(elementCount).toBeLessThanOrEqual(${num});`);
                break;
              }

              // Check for < operator
              if (trimmed.startsWith("<")) {
                const num = trimmed.replace(/[<\s]/g, "") || "999";
                lines.push(
                  `const elementCount = await page.locator('${escapedTarget}').count();`,
                );
                lines.push(`expect(elementCount).toBeLessThan(${num});`);
                break;
              }
            }

            // Normal exact count
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
            const attr = escapeString(step.assertion.attribute);
            const val = escapeString(String(step.assertion.value));
            lines.push(
              `await expect(page.locator('${escapedTarget}')).toHaveAttribute('${attr}', '${val}');`,
            );
          }
          break;
      }
    }
  } else {
    // Fallback: Generate TODO comments for backwards compatibility
    lines.push(`// TODO: Implement action - ${escapeString(step.action)}`);
    lines.push(`// Expected: ${escapeString(step.expected)}`);
  }

  return lines.join("\n        ");
}

// ============================================================================
// RENDER FUNCTIONS
// ============================================================================

function renderReadme(opts: {
  suiteName: string;
  suiteId: string;
  caseCount: number;
}) {
  return `# SynthQA Playwright Project

Generated by SynthQA - AI-powered test automation

## Suite Information
- **Name**: ${opts.suiteName}
- **Test Cases**: ${opts.caseCount}
- **Generated**: ${new Date().toLocaleDateString()}

---

## Quick Start

### 1. Install Dependencies
\`\`\`bash
pnpm install
npx playwright install
\`\`\`

### 2. Configure Environment
\`\`\`bash
cp .env.example .env
\`\`\`

Edit \`.env\` and set:
\`\`\`bash
BASE_URL="https://your-app.com"

# If tests require authentication:
USER_EMAIL="test@example.com"
USER_PASSWORD="yourpassword"
\`\`\`

### 3. Verify Selectors (5-10 minutes)

⚠️ **Important**: Tests contain AI-generated selectors that may need adjustment.

Open test files in \`tests/cases/\` and verify selectors match your application.

**How to find correct selectors:**
1. Open your app in Chrome
2. Right-click element → Inspect
3. In DevTools, right-click element → Copy → Copy selector
4. Paste in test file

Or use Playwright's codegen:
\`\`\`bash
npx playwright codegen https://your-app.com
\`\`\`

### 4. Setup Authentication (if needed)

If tests require login, update \`tests/auth.setup.ts\`:

\`\`\`typescript
// Update these selectors to match your login form:
await page.fill('[name="email"]', email);           // ← your email input
await page.fill('[name="password"]', password);     // ← your password input
await page.click('button[type="submit"]');          // ← your submit button
await page.waitForURL('**/dashboard');              // ← your post-login URL
\`\`\`

Test auth setup:
\`\`\`bash
npx playwright test auth.setup.ts --headed
# Should create auth.json file
\`\`\`

### 5. Run Tests
\`\`\`bash
# Run all tests
pnpm test

# Run in UI mode (recommended for debugging)
pnpm test:ui

# Run in headed mode (see browser)
pnpm test:headed

# View HTML report
pnpm report
\`\`\`

---

## Project Structure

\`\`\`
.
├── tests/
│   ├── auth.setup.ts         # Authentication setup (runs once)
│   └── cases/                # Test specifications
│       └── *.spec.ts
├── synthqa/
│   ├── suite.json            # Suite metadata
│   └── cases/                # Test case JSON snapshots
├── playwright.config.ts      # Playwright configuration
├── .env.example              # Environment template
├── .env                      # Your configuration (git-ignored)
└── README.md
\`\`\`

---

## Understanding the Tests

Each test includes:
- ✅ **Executable commands**: Real Playwright actions (click, fill, type)
- ✅ **Smart selectors**: CSS selectors and data-testid attributes
- ✅ **Assertions**: Automated verification of expected outcomes
- ✅ **Screenshots**: Visual evidence captured at each step
- ✅ **Videos**: Recorded on failure for debugging

---

## Common Issues & Solutions

### Tests fail with "locator.click: Target closed"
**Cause**: Selector doesn't match your application  
**Fix**: Update selector using browser DevTools or \`npx playwright codegen\`

### Tests fail with "Timeout exceeded"
**Cause**: Element loads slowly or selector is wrong  
**Fix**: Add explicit wait or verify selector exists

### Tests fail with "Element is not visible"
**Cause**: Element is hidden, in different tab, or wrong selector  
**Fix**: Check element state in your application

### Authentication fails
**Cause**: Login selectors don't match your form  
**Fix**: Update selectors in \`tests/auth.setup.ts\` and verify credentials in \`.env\`

### First run: Some tests fail
**This is normal!** AI-generated selectors are best-effort guesses.  
**Expected workflow**:
1. ✅ Run tests once → note failures
2. ✅ Update selectors for failed tests
3. ✅ Re-run → fewer failures
4. ✅ Repeat until all pass

---

## Authentication

These tests use Playwright's \`storageState\` for fast authentication.

### How it Works

1. **First run**: \`auth.setup.ts\` runs once, logs in, saves cookies to \`auth.json\`
2. **All tests**: Load \`auth.json\` before starting, already logged in
3. **Result**: Fast tests (no repeated logins)

### If Tests Don't Need Login

Leave \`USER_EMAIL\` and \`USER_PASSWORD\` empty in \`.env\`. Auth setup will be skipped.

### Troubleshooting Auth

**"auth.json not found"**  
→ Auth setup failed. Run: \`npx playwright test auth.setup.ts --headed\` to debug

**"Redirect to /login in tests"**  
→ Auth expired or selectors wrong. Delete \`auth.json\` and re-run setup

**"Tests work individually but fail in suite"**  
→ Auth state might be modified. Use \`test.use({ storageState: { cookies: [], origins: [] } })\` for tests that need fresh state

---

## Tips for Success

### Start Small
Get 1-2 tests working perfectly before scaling to all tests.

### Use UI Mode
\`pnpm test:ui\` lets you visually debug selectors and see exactly where tests fail.

### Prefer data-testid
If you control the application code, add \`data-testid\` attributes:
\`\`\`html
<button data-testid="submit-button">Submit</button>
\`\`\`

Then use in tests:
\`\`\`typescript
await page.locator('[data-testid="submit-button"]').click();
\`\`\`

### Different Environments
\`\`\`bash
# Development
BASE_URL="http://localhost:3000" pnpm test

# Staging
BASE_URL="https://staging.app.com" pnpm test

# Production
BASE_URL="https://app.com" pnpm test
\`\`\`

---

## CI/CD Integration

### GitHub Actions

\`\`\`yaml
name: Playwright Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: pnpm install
      - run: npx playwright install --with-deps
      - run: pnpm test
        env:
          BASE_URL: \${{ secrets.BASE_URL }}
          USER_EMAIL: \${{ secrets.USER_EMAIL }}
          USER_PASSWORD: \${{ secrets.USER_PASSWORD }}
      - uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
\`\`\`

---

## Support

- **Playwright Documentation**: https://playwright.dev
- **Report Issues**: Contact SynthQA support

---

Generated with ❤️ by SynthQA
`;
}
function renderEnvExample() {
  return `# Required
BASE_URL="https://app.example.com"

# Authentication (Required if tests need login)
# Leave empty if testing public pages only
USER_EMAIL="test@example.com"
USER_PASSWORD="yourpassword123"


# SynthQA Integration (optional - to sync results back to platform)
# Get these from: https://synthqa.com/settings/integrations
SYNTHQA_WEBHOOK_URL=""
SYNTHQA_API_KEY=""
`;
}

function renderGitignore() {
  return `node_modules
playwright-report
test-results
.env
auth.json
`;
}

function renderPackageJson() {
  return JSON.stringify(
    {
      name: "synthqa-playwright",
      private: true,
      type: "module",
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
      include: ["tests", "playwright.config.ts", "synthqa"],
    },
    null,
    2,
  );
}

// In your export route, add this function:

function renderAuthSetup() {
  return `import { test as setup } from '@playwright/test';

// This setup runs ONCE before all tests to authenticate
setup('authenticate', async ({ page }) => {
  const baseUrl = process.env.BASE_URL;
  const email = process.env.USER_EMAIL;
  const password = process.env.USER_PASSWORD;
  
  if (!email || !password) {
    console.log('⚠️  USER_EMAIL and USER_PASSWORD not set - skipping auth setup');
    console.log('⚠️  Tests requiring authentication will fail');
    return;
  }
  
  console.log('🔐 Authenticating...');
  
  await page.goto(baseUrl + '/login');
  
  // TODO: Update these selectors to match your login form
  await page.fill('[name="email"]', email);
  await page.fill('[name="password"]', password);
  await page.click('button[type="submit"]');
  
  // TODO: Update this URL to match your post-login page
  await page.waitForURL('**/dashboard', { timeout: 10000 });
  
  // Save authentication state
  await page.context().storageState({ path: 'auth.json' });
  
  console.log('✅ Authentication saved to auth.json');
});
`;
}

function renderPlaywrightConfig(suiteId: string) {
  return `import { defineConfig } from "@playwright/test";
import "dotenv/config";

export default defineConfig({
  testDir: "./tests",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  retries: 1,

 // Reporters
  reporter: [
    ["html", { open: "never" }],
    ["list"],
    // SynthQA reporter - syncs results back to platform
    ["./synthqa-reporter.ts", { suiteId: "${suiteId}" }],
  ],  
  // Projects setup
  projects: [
    // Setup authentication
    { 
      name: 'setup', 
      testMatch: /.*\\.setup\\.ts/,
    },
    
    // Run tests with authentication
    {
      name: 'chromium',
      testMatch: /.*\\.spec\\.ts/,
      use: {
        baseURL: process.env.BASE_URL,
        headless: true,
        trace: "on-first-retry",
        screenshot: "on",
        video: "retain-on-failure",
        
        // Use saved authentication state
        storageState: 'auth.json',
      },
      dependencies: ['setup'],
    },
  ],
});
`;
}

function renderCaseSpec(opts: {
  suiteId: string;
  caseKey: string;
  caseId: string;
  title: string;
  steps: TestStep[];
}) {
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

  return `import { test, expect } from "@playwright/test";

test.describe(\`${escapeTemplateLiteral(opts.title)}\`, () => {
  test(\`${opts.caseId}\`, async ({ page }, testInfo) => {
    const baseUrl = process.env.BASE_URL;
    if (!baseUrl) throw new Error("Missing BASE_URL");

    await test.step("Navigate to application", async () => {
      await page.goto(baseUrl, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(500);
    });
${stepsCode}

    await test.step("Expected Result", async () => {
      await page.screenshot({
        path: testInfo.outputPath("final.png"),
        fullPage: true,
      });
    });
  });
});
`;
}

function renderSynthQAReporter() {
  return `import {
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
    this.suiteId = options.suiteId || process.env.SYNTHQA_SUITE_ID || 'unknown';
    this.sessionId = \`run-\${Date.now()}\`;
  }

  onTestEnd(test: TestCase, result: TestResult) {
    const duration = result.duration / 1000 / 60; // Convert to minutes

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
      os_version: process.platform,
      test_environment: process.env.TEST_ENV || "local",
      playwright_version: this.getPlaywrightVersion(),
    });
  }

  async onEnd(result: FullResult) {
    const passed = this.testResults.filter(
      (t) => t.execution_status === "passed",
    ).length;
    const failed = this.testResults.filter(
      (t) => t.execution_status === "failed",
    ).length;
    const skipped = this.testResults.filter(
      (t) => t.execution_status === "skipped",
    ).length;

    const payload = {
      suite_id: this.suiteId,
      session_id: this.sessionId,
      test_results: this.testResults,
      metadata: {
        total_tests: this.testResults.length,
        passed_tests: passed,
        failed_tests: failed,
        skipped_tests: skipped,
        overall_status: failed > 0 ? 'failed' : 'passed',
      },
    };

    await this.sendToSynthQA(payload);
  }

  private mapStatus(status: string): string {
    if (status === "passed") return "passed";
    if (status === "failed") return "failed";
    if (status === "skipped") return "skipped";
    return "failed";
  }

  private extractTestCaseId(test: TestCase): string | null {
    // Extract from test title (the UUID we set)
    const titleMatch = test.title.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    if (titleMatch) {
      return titleMatch[0];
    }
    return null;
  }

  private getExecutionNotes(result: TestResult): string | null {
    if (result.retry > 0) {
      return \`Test retried \${result.retry} time(s)\`;
    }
    return result.status === "passed" ? "Test passed successfully" : null;
  }

  private getPlaywrightVersion(): string {
    try {
      return require("@playwright/test/package.json").version;
    } catch {
      return "unknown";
    }
  }

  private async sendToSynthQA(data: any) {
    const webhookUrl = process.env.SYNTHQA_WEBHOOK_URL;
    const apiKey = process.env.SYNTHQA_API_KEY;

    if (!webhookUrl) {
      console.log('⚠️  SYNTHQA_WEBHOOK_URL not set - skipping result upload');
      console.log('   To sync results back to SynthQA, add SYNTHQA_WEBHOOK_URL to .env');
      return;
    }

    if (!apiKey) {
      console.log('⚠️  SYNTHQA_API_KEY not set - skipping result upload');
      return;
    }

    try {
      console.log('📤 Sending test results to SynthQA...');
      
      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": \`Bearer \${apiKey}\`,
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.text();
        console.error(\`❌ Failed to send results: \${response.statusText}\`);
        console.error(\`   Response: \${error}\`);
      } else {
        console.log(\`✅ Test results synced to SynthQA (\${data.metadata.total_tests} tests)\`);
      }
    } catch (error) {
      console.error("❌ Error sending results to SynthQA:", error);
    }
  }
}

export default SynthQAReporter;
`;
}

// ============================================================================
// MAIN EXPORT HANDLER
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
    if (userErr) {
      return NextResponse.json(
        { ok: false, error: userErr.message },
        { status: 401 },
      );
    }
    if (!user) {
      return NextResponse.json(
        { ok: false, error: "Not authenticated" },
        { status: 401 },
      );
    }

    // Fetch suite
    const { data: suite, error: suiteErr } = await supabase
      .from("suites")
      .select("id, name, description")
      .eq("id", suiteId)
      .single<SuiteRow>();

    if (suiteErr || !suite) {
      return NextResponse.json(
        { ok: false, error: suiteErr?.message || "Suite not found" },
        { status: 404 },
      );
    }

    // Fetch suite links
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

    const regularIds = (suiteLinks ?? [])
      .map((l) => l.test_case_id)
      .filter((x): x is string => Boolean(x));

    const platformIds = (suiteLinks ?? [])
      .map((l) => l.platform_test_case_id)
      .filter((x): x is string => Boolean(x));

    // Fetch test cases
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
      : { data: [], error: null as any };

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

      // OPTIONAL: if you store automation hints per step in automation_metadata
      // Example shape (recommended):
      // automation_metadata = { steps: [{ selector, action_type, input_value, assertion, wait_time }, ...] }
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

    const ordered = (suiteLinks ?? [])
      .map((link, idx) => {
        const orderNum = link.sequence_order ?? idx + 1;

        // Regular test case
        if (link.test_case_id) {
          const tc = tcMap.get(link.test_case_id);
          if (!tc) return null;

          const steps = parseSteps(tc.test_steps);
          const caseKey = `${String(orderNum).padStart(3, "0")}-${safeSlug(tc.title)}-${tc.id.slice(0, 8)}`;

          return { link, tc, steps, caseKey, source: "regular" as const };
        }

        // Cross-platform web case
        if (link.platform_test_case_id) {
          const ptc = ptcMap.get(link.platform_test_case_id);
          if (!ptc) return null; // could be non-web platform filtered out

          const steps = platformToSteps(ptc);
          const caseKey = `${String(orderNum).padStart(3, "0")}-${safeSlug(ptc.title)}-${ptc.id.slice(0, 8)}`;

          // Normalize to same shape your rendering expects
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

    // --------------------------
    // Zip project
    // --------------------------
    const zip = new JSZip();
    const root = `synthqa-playwright-${
      safeSlug(suite.name) || "suite"
    }-${suite.id.slice(0, 8)}`;

    const add = (p: string, content: string) =>
      zip.file(`${root}/${p}`, content);

    add("package.json", renderPackageJson());
    add("playwright.config.ts", renderPlaywrightConfig(suiteId));
    add("tsconfig.json", renderTsconfig());
    add(".env.example", renderEnvExample());
    add("tests/auth.setup.ts", renderAuthSetup());
    add(".gitignore", renderGitignore());
    add("synthqa-reporter.ts", renderSynthQAReporter());
    add(
      "README.md",
      renderReadme({
        suiteName: suite.name,
        suiteId: suite.id,
        caseCount: ordered.length,
      }),
    );

    // Suite snapshot
    const suiteSnapshot = {
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
        estimated_duration_minutes: o.link.estimated_duration_minutes ?? null,
        caseKey: o.caseKey,
      })),
    };
    add("synthqa/suite.json", JSON.stringify(suiteSnapshot, null, 2));

    for (const o of ordered) {
      const caseJson = {
        id: o.tc.id,
        title: o.tc.title,
        description: o.tc.description ?? null,
        test_type: o.tc.test_type ?? null,
        expected_result: o.tc.expected_result ?? null,
        test_steps: o.steps.map((s, i) => ({
          step_number: s.step_number ?? i + 1,
          action: s.action,
          expected: s.expected,
          // Include automation fields in JSON snapshot
          ...(s.selector && { selector: s.selector }),
          ...(s.action_type && { action_type: s.action_type }),
          ...(s.input_value !== undefined && { input_value: s.input_value }),
          ...(s.wait_time && { wait_time: s.wait_time }),
          ...(s.assertion && { assertion: s.assertion }),
        })),
      };

      add(`synthqa/cases/${o.caseKey}.json`, JSON.stringify(caseJson, null, 2));

      // IMPORTANT: Pass steps to renderCaseSpec
      add(
        `tests/cases/${o.caseKey}.spec.ts`,
        renderCaseSpec({
          suiteId: suite.id,
          caseKey: o.caseKey,
          caseId: o.tc.id,
          title: o.tc.title,
          steps: o.steps, // <-- Pass the parsed steps here
        }),
      );
    }

    const zipBuffer = await zip.generateAsync({ type: "nodebuffer" });
    const fileName = `${root}.zip`;

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
