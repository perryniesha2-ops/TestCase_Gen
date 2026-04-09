// app/api/automation/export/puppeteer/route.ts
import { NextResponse } from "next/server";
import JSZip from "jszip";
import { createClient } from "@/lib/supabase/server";
import { TestStep } from "@/types/automation-export";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const suiteId = body?.suiteId?.trim();

    if (!suiteId) {
      return NextResponse.json({ error: "Missing suiteId" }, { status: 400 });
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL || "https://www.synthqa.app"}/api/automation/webhook/results`;

    const { data: profile } = await supabase
      .from("user_profiles")
      .select("api_key")
      .eq("id", user.id)
      .single();

    const { data: suite, error: suiteErr } = await supabase
      .from("suites")
      .select(
        "id, name, description, base_url, automation_framework, automation_status, export_count",
      )
      .eq("id", suiteId)
      .single();

    if (suiteErr || !suite) {
      return NextResponse.json({ error: "Suite not found" }, { status: 404 });
    }

    if (!suite.base_url?.trim()) {
      return NextResponse.json(
        {
          error:
            "Please set a Base URL in Automation Configuration before exporting.",
        },
        { status: 400 },
      );
    }

    // Warn if suite was enhanced for a different framework
    if (
      suite.automation_framework &&
      suite.automation_framework !== "puppeteer" &&
      suite.automation_status === "ready"
    ) {
      console.warn(
        `[export/puppeteer] Suite ${suiteId} was enhanced for ${suite.automation_framework} — selectors may not be optimised for Puppeteer`,
      );
    }

    const { data: suiteItems } = await supabase
      .from("suite_items")
      .select(
        `id, test_case_id, sequence_order,
        test_cases (id, title, description, test_steps)`,
      )
      .eq("suite_id", suiteId)
      .order("sequence_order", { ascending: true });

    const testCases = (suiteItems || [])
      .map((item: any) => item.test_cases)
      .filter(Boolean);

    if (testCases.length === 0) {
      return NextResponse.json(
        { error: "No test cases in suite" },
        { status: 400 },
      );
    }

    const zip = new JSZip();
    const root = `puppeteer-${suite.name.toLowerCase().replace(/\s+/g, "-")}-${suite.id.slice(0, 8)}`;

    // ── package.json ────────────────────────────────────────────────────────────
    zip.file(
      `${root}/package.json`,
      JSON.stringify(
        {
          name: `synthqa-puppeteer-${suite.name.toLowerCase().replace(/\s+/g, "-")}`,
          version: "1.0.0",
          private: true,
          scripts: {
            test: "jest --runInBand",
            "test:headed": "cross-env HEADLESS=false jest --runInBand",
          },
          devDependencies: {
            puppeteer: "^21.0.0",
            jest: "^29.7.0",
            "jest-puppeteer": "^9.0.2",
            "@types/jest": "^29.5.12",
            "cross-env": "^7.0.3",
            dotenv: "^16.4.5",
          },
        },
        null,
        2,
      ),
    );

    // ── jest.config.js ───────────────────────────────────────────────────────────
    zip.file(
      `${root}/jest.config.js`,
      `require('dotenv').config();

/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-puppeteer',
  testMatch: ['**/tests/**/*.test.js'],
  testTimeout: 60000,
  globalTeardown: './support/global-setup.js',
  runInBand: true,
};
`,
    );

    // ── jest-puppeteer.config.js ─────────────────────────────────────────────────
    zip.file(
      `${root}/jest-puppeteer.config.js`,
      `module.exports = {
  launch: {
    headless: process.env.HEADLESS !== 'false',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  },
  browserContext: 'default',
  exitOnPageError: false,
};
`,
    );

    // ── Reporter ─────────────────────────────────────────────────────────────────
    zip.file(
      `${root}/support/synthqa-reporter.js`,
      `const fs = require('fs');
const path = require('path');

const WEBHOOK_URL = process.env.SYNTHQA_WEBHOOK_URL;
const API_KEY = process.env.SYNTHQA_API_KEY;
const SUITE_ID = process.env.SYNTHQA_SUITE_ID;
const RESULTS_FILE = path.join(process.cwd(), '.synthqa-results.json');

let puppeteerVersion = 'unknown';
try { puppeteerVersion = require('puppeteer/package.json').version; } catch {}

const getOS = () => {
  const p = process.platform;
  if (p === 'darwin') return 'macOS';
  if (p === 'win32') return 'Windows';
  return 'Linux';
};

function saveResult(result) {
  let existing = [];
  try { existing = JSON.parse(fs.readFileSync(RESULTS_FILE, 'utf8')); } catch {}
  existing.push(result);
  fs.writeFileSync(RESULTS_FILE, JSON.stringify(existing));
}

function loadResults() {
  try { return JSON.parse(fs.readFileSync(RESULTS_FILE, 'utf8')); } catch { return []; }
}

function clearResults() {
  try { fs.unlinkSync(RESULTS_FILE); } catch {}
}

function makeResult(overrides) {
  return {
    test_case_id: null,
    execution_status: overrides.execution_status,
    started_at: overrides.started_at ?? new Date().toISOString(),
    completed_at: overrides.completed_at ?? new Date().toISOString(),
    duration_minutes: overrides.duration_minutes ?? 0,
    execution_notes: null,
    failure_reason: overrides.failure_reason ?? null,
    stack_trace: overrides.stack_trace ?? null,
    browser: 'chrome',
    os_version: getOS(),
    test_environment: process.env.TEST_ENVIRONMENT || 'local',
    framework: 'puppeteer',
    framework_version: puppeteerVersion,
    ...overrides,
  };
}

async function reportResults(results) {
  if (!WEBHOOK_URL || !API_KEY || !SUITE_ID) {
    console.warn('[SynthQA] Missing SYNTHQA_WEBHOOK_URL, SYNTHQA_API_KEY, or SYNTHQA_SUITE_ID — skipping result sync');
    return;
  }

  const passed  = results.filter((r) => r.execution_status === 'passed').length;
  const failed  = results.filter((r) => r.execution_status === 'failed').length;
  const skipped = results.filter((r) => r.execution_status === 'skipped').length;

  const payload = {
    suite_id: SUITE_ID,
    session_id: \`puppeteer-\${Date.now()}\`,
    framework: 'puppeteer',
    test_results: results,
    metadata: {
      total_tests: results.length,
      passed_tests: passed,
      failed_tests: failed,
      skipped_tests: skipped,
      overall_status: failed > 0 ? 'failed' : 'passed',
      branch: process.env.GIT_BRANCH ?? process.env.GITHUB_REF_NAME ?? null,
      commit_sha: process.env.GIT_COMMIT ?? process.env.GITHUB_SHA ?? null,
      ci_provider: process.env.CI ? 'github-actions' : null,
    },
  };

  try {
    const res = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: \`Bearer \${API_KEY}\` },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      console.error(\`[SynthQA] Webhook failed (\${res.status}): \${await res.text()}\`);
    } else {
      console.log('[SynthQA] Results synced to SynthQA');
    }
  } catch (err) {
    console.error('[SynthQA] Webhook error:', err);
  }
}

module.exports = { saveResult, loadResults, clearResults, makeResult, reportResults };
`,
    );

    // ── Global teardown ──────────────────────────────────────────────────────────
    zip.file(
      `${root}/support/global-setup.js`,
      `const { loadResults, clearResults, reportResults } = require('./synthqa-reporter');

module.exports = async function globalTeardown() {
  const results = loadResults();
  await reportResults(results);
  clearResults();
};
`,
    );

    // ── Test files ───────────────────────────────────────────────────────────────
    testCases.forEach((tc: any, idx: number) => {
      const steps = Array.isArray(tc.test_steps) ? tc.test_steps : [];
      const fileName = `${String(idx + 1).padStart(3, "0")}-${tc.title.toLowerCase().replace(/\s+/g, "-").slice(0, 60)}.test.js`;
      zip.file(
        `${root}/tests/${fileName}`,
        generatePuppeteerTest(tc, steps, suite.base_url),
      );
    });

    // ── .env ─────────────────────────────────────────────────────────────────────
    zip.file(
      `${root}/.env`,
      `# Application
BASE_URL=${suite.base_url}

# Test credentials — update with your test account
TEST_USER_EMAIL=your_test_email@example.com
TEST_USER_PASSWORD=your_test_password

# SynthQA Integration
SYNTHQA_WEBHOOK_URL=${webhookUrl}
SYNTHQA_API_KEY=${profile?.api_key || ""}
SYNTHQA_SUITE_ID=${suite.id}

# Test environment
TEST_ENVIRONMENT=local
HEADLESS=true
`,
    );

    // ── .gitignore ───────────────────────────────────────────────────────────────
    zip.file(
      `${root}/.gitignore`,
      `node_modules
.env
.synthqa-results.json
test-results/
`,
    );

    // ── README ───────────────────────────────────────────────────────────────────
    zip.file(`${root}/README.md`, generateReadme(suite.name, testCases.length));

    // ── Record export ────────────────────────────────────────────────────────────
    await supabase
      .from("suites")
      .update({
        last_export_at: new Date().toISOString(),
        export_count: (suite.export_count ?? 0) + 1,
      })
      .eq("id", suiteId);

    const zipBuffer = await zip.generateAsync({ type: "nodebuffer" });

    return new Response(new Uint8Array(zipBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${root}.zip"`,
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("Puppeteer export error:", error);
    return NextResponse.json({ error: "Export failed" }, { status: 500 });
  }
}

// ============================================================================
// HELPERS
// ============================================================================

function escapeForJs(str: string): string {
  return str
    .replace(/\\/g, "\\\\")
    .replace(/`/g, "\\`")
    .replace(/'/g, "\\'")
    .replace(/\$/g, "\\$")
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "\\r");
}

/**
 * Detects "N characters" patterns in a step action description.
 * Returns a JS expression like 'a'.repeat(5001) when found, null otherwise.
 */
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

// ============================================================================
// TEST GENERATOR
// ============================================================================

function generatePuppeteerTest(
  testCase: any,
  steps: TestStep[],
  baseUrl: string,
): string {
  const stepsCode = steps
    .map((step, idx) => {
      const lines: string[] = [];
      // Normalise selector — single quotes inside, safe in JS template literals
      const sel = escapeForJs(step.selector || "");

      // ── Navigate ──────────────────────────────────────────────────────────────
      if (step.action_type === "navigate") {
        const url = step.input_value || "/";
        let path: string;
        if (url.startsWith("http://") || url.startsWith("https://")) {
          try {
            const parsed = new URL(url);
            path = parsed.pathname + parsed.search + parsed.hash;
          } catch {
            path = url;
          }
        } else {
          path = url.startsWith("/") ? url : `/${url}`;
        }
        lines.push(`await page.goto(\`\${BASE_URL}${escapeForJs(path)}\`);`);
        // URL assertion — only if step doesn't already have a url assertion
        if (!step.assertion || step.assertion.type !== "url") {
          lines.push(`expect(page.url()).toContain('${escapeForJs(path)}');`);
        }
      }
      // ── Click ─────────────────────────────────────────────────────────────────
      else if (step.action_type === "click") {
        lines.push(`await page.click('${sel}');`);
      }
      // ── Fill / Type ───────────────────────────────────────────────────────────
      else if (step.action_type === "fill" || step.action_type === "type") {
        const generatedVal = detectGeneratedString(
          step.action,
          step.input_value,
        );

        // Only use env vars when the SELECTOR identifies the field type —
        // not when the value being typed mentions email/password in text
        const isEmailField = sel.includes("email") || sel.includes("username");
        const isPasswordField = sel.includes("password");

        if (generatedVal) {
          // Long string — use evaluate to set value directly (page.type is too slow)
          lines.push(`await page.evaluate((sel, val) => {`);
          lines.push(`  const el = document.querySelector(sel);`);
          lines.push(
            `  if (el) { el.value = val; el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); }`,
          );
          lines.push(`}, '${sel}', ${generatedVal});`);
        } else if (isEmailField) {
          lines.push(`await page.click('${sel}', { clickCount: 3 });`);
          lines.push(
            `await page.type('${sel}', process.env.TEST_USER_EMAIL || '${escapeForJs(step.input_value || "")}');`,
          );
        } else if (isPasswordField) {
          lines.push(`await page.click('${sel}', { clickCount: 3 });`);
          lines.push(
            `await page.type('${sel}', process.env.TEST_USER_PASSWORD || '${escapeForJs(step.input_value || "")}');`,
          );
        } else {
          lines.push(`await page.click('${sel}', { clickCount: 3 });`);
          lines.push(
            `await page.type('${sel}', '${escapeForJs(step.input_value || "")}');`,
          );
        }
      }
      // ── Check ─────────────────────────────────────────────────────────────────
      else if (step.action_type === "check") {
        lines.push(`await page.click('${sel}');`);
      }
      // ── Select ────────────────────────────────────────────────────────────────
      else if (step.action_type === "select") {
        lines.push(
          `await page.select('${sel}', '${escapeForJs(step.input_value || "")}');`,
        );
      }
      // ── Hover ─────────────────────────────────────────────────────────────────
      else if (step.action_type === "hover") {
        lines.push(`await page.hover('${sel}');`);
      }
      // ── Wait ──────────────────────────────────────────────────────────────────
      else if (step.action_type === "wait") {
        if (sel) {
          const timeout =
            step.wait_time && step.wait_time > 0 ? step.wait_time : 10000;
          lines.push(
            `await page.waitForSelector('${sel}', { timeout: ${timeout} });`,
          );
        } else if (step.wait_time && step.wait_time > 0) {
          lines.push(
            `await page.waitForTimeout(${step.wait_time}); // TODO: replace with waitForSelector`,
          );
        }
      }
      // ── Press ─────────────────────────────────────────────────────────────────
      else if (step.action_type === "press") {
        lines.push(
          `await page.keyboard.press('${escapeForJs(step.input_value || "")}');`,
        );
      }
      // ── Unknown ───────────────────────────────────────────────────────────────
      else {
        lines.push(`// TODO: implement — ${escapeForJs(step.action)}`);
        if (sel) lines.push(`// Selector available: '${sel}'`);
      }

      // ── Assertions ────────────────────────────────────────────────────────────
      if (step.assertion?.type) {
        const target = escapeForJs(
          step.assertion.target || step.selector || "",
        );
        const assertVal = escapeForJs(String(step.assertion.value ?? ""));

        switch (step.assertion.type) {
          case "visible":
            lines.push(`await expect(page).toMatchElement('${target}');`);
            break;
          case "hidden":
            lines.push(
              `await page.waitForSelector('${target}', { hidden: true });`,
            );
            break;
          case "text":
            lines.push(
              `await expect(page).toMatchElement('${target}', { text: '${assertVal}' });`,
            );
            break;
          case "exact-text":
            lines.push(
              `await expect(page).toMatchElement('${target}', { text: '${assertVal}' });`,
            );
            break;
          case "value": {
            lines.push(
              `const fieldVal = await page.$eval('${target}', el => el.value);`,
            );
            lines.push(`expect(fieldVal).toBe('${assertVal}');`);
            break;
          }
          case "url": {
            let urlPath = String(step.assertion.value ?? "");
            if (
              urlPath.startsWith("http://") ||
              urlPath.startsWith("https://")
            ) {
              try {
                urlPath = new URL(urlPath).pathname;
              } catch {}
            }
            lines.push(
              `expect(page.url()).toContain('${escapeForJs(urlPath)}');`,
            );
            break;
          }
          case "count": {
            const countNum = parseInt(String(step.assertion.value ?? "0"), 10);
            const isLengthAssertion =
              (step.action_type === "fill" || step.action_type === "type") &&
              detectGeneratedString(step.action, step.input_value) !== null;
            if (isLengthAssertion && Number.isFinite(countNum)) {
              lines.push(
                `const fieldLength = await page.$eval('${target}', el => el.value.length);`,
              );
              lines.push(`expect(fieldLength).toBe(${countNum});`);
            } else {
              lines.push(
                `const elCount = await page.$$eval('${target}', els => els.length);`,
              );
              lines.push(`expect(elCount).toBe(${countNum});`);
            }
            break;
          }
          case "enabled":
            lines.push(
              `const isEnabled = await page.$eval('${target}', el => !el.disabled);`,
            );
            lines.push(`expect(isEnabled).toBe(true);`);
            break;
          case "disabled":
            lines.push(
              `const isDisabled = await page.$eval('${target}', el => el.disabled);`,
            );
            lines.push(`expect(isDisabled).toBe(true);`);
            break;
          case "checked":
            lines.push(
              `const isChecked = await page.$eval('${target}', el => el.checked);`,
            );
            lines.push(`expect(isChecked).toBe(true);`);
            break;
          case "attribute":
            if (step.assertion.attribute) {
              lines.push(
                `const attrVal = await page.$eval('${target}', (el, attr) => el.getAttribute(attr), '${escapeForJs(step.assertion.attribute)}');`,
              );
              lines.push(`expect(attrVal).toBe('${assertVal}');`);
            }
            break;
        }
      }

      return `    // Step ${idx + 1}: ${escapeForJs(step.action)}\n    ${lines.join("\n    ")}`;
    })
    .join("\n\n");

  return `const { makeResult, saveResult } = require('../support/synthqa-reporter');
const BASE_URL = process.env.BASE_URL || '${escapeForJs(baseUrl)}';

describe('${escapeForJs(testCase.title)}', () => {
  it('${testCase.id}', async () => {
    const startedAt = new Date().toISOString();
    let status = 'passed';
    let failureReason = null;
    let stackTrace = null;

    try {
${stepsCode}
    } catch (err) {
      status = 'failed';
      failureReason = err?.message ?? String(err);
      stackTrace = err?.stack ?? null;
      try {
        const screenshotDir = require('path').join(process.cwd(), 'test-results', 'screenshots');
        require('fs').mkdirSync(screenshotDir, { recursive: true });
        const screenshotPath = require('path').join(screenshotDir, \`${testCase.id}-\${Date.now()}.png\`);
        await page.screenshot({ path: screenshotPath, fullPage: true });
        console.log(\`[SynthQA] Screenshot saved: \${screenshotPath}\`);
      } catch (screenshotErr) {
        console.warn('[SynthQA] Could not save screenshot:', screenshotErr.message);
      }
      throw err;
    } finally {
      const durationMs = Date.now() - new Date(startedAt).getTime();
      saveResult(makeResult({
        test_case_id: '${testCase.id}',
        execution_status: status,
        started_at: startedAt,
        completed_at: new Date().toISOString(),
        duration_minutes: durationMs / 60000,
        failure_reason: failureReason,
        stack_trace: stackTrace,
      }));
    }
  });
});
`;
}

function generateReadme(suiteName: string, caseCount: number): string {
  return `# ${suiteName} — Puppeteer Tests

Generated by SynthQA

## Quick Start

\`\`\`bash
# 1. Install dependencies
npm install

# 2. Configure environment
# .env is pre-filled — update TEST_USER_EMAIL and TEST_USER_PASSWORD

# 3. Run tests
npm test

# 4. Run headed (visible browser)
npm run test:headed
\`\`\`

## Configuration

All configuration lives in \`.env\`. Do not commit this file.

| Variable | Description |
|---|---|
| \`BASE_URL\` | URL of the application under test |
| \`TEST_USER_EMAIL\` | Email used for authenticated tests |
| \`TEST_USER_PASSWORD\` | Password used for authenticated tests |
| \`SYNTHQA_API_KEY\` | Pre-filled from your SynthQA account |

## Test Cases

- **Total**: ${caseCount}
- **Location**: \`tests/\`

## CI/CD

\`\`\`yaml
- name: Run Puppeteer tests
  env:
    BASE_URL: \${{ secrets.BASE_URL }}
    TEST_USER_EMAIL: \${{ secrets.TEST_USER_EMAIL }}
    TEST_USER_PASSWORD: \${{ secrets.TEST_USER_PASSWORD }}
    SYNTHQA_API_KEY: \${{ secrets.SYNTHQA_API_KEY }}
    SYNTHQA_WEBHOOK_URL: \${{ secrets.SYNTHQA_WEBHOOK_URL }}
    SYNTHQA_SUITE_ID: \${{ secrets.SYNTHQA_SUITE_ID }}
  run: npm test
\`\`\`
`;
}
