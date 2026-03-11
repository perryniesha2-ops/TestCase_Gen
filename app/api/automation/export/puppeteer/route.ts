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

    const { data: suite, error: suiteErr } = await supabase
      .from("suites")
      .select("id, name, description, base_url")
      .eq("id", suiteId)
      .single();

    if (suiteErr || !suite) {
      return NextResponse.json({ error: "Suite not found" }, { status: 404 });
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

    if (!suite.base_url?.trim()) {
      return NextResponse.json(
        {
          error:
            "Please set a Base URL in Automation Configuration before exporting.",
        },
        { status: 400 },
      );
    }

    const zip = new JSZip();
    const root = `puppeteer-${suite.name.toLowerCase().replace(/\s+/g, "-")}-${suite.id.slice(0, 8)}`;

    // package.json
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

    // jest.config.js
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

    // jest-puppeteer.config.js
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

    // Reporter
    zip.file(
      `${root}/support/synthqa-reporter.js`,
      `const fs = require('fs');
const path = require('path');

const WEBHOOK_URL = process.env.SYNTHQA_WEBHOOK_URL;
const API_KEY = process.env.SYNTHQA_API_KEY;
const SUITE_ID = process.env.SYNTHQA_SUITE_ID;

const RESULTS_FILE = path.join(process.cwd(), '.synthqa-results.json');

let puppeteerVersion = 'unknown';
try {
  puppeteerVersion = require('puppeteer/package.json').version;
} catch {
  puppeteerVersion = 'unknown';
}

const getOS = () => {
  const p = process.platform;
  if (p === 'darwin') return 'macOS';
  if (p === 'win32') return 'Windows';
  return 'Linux';
};

function saveResult(result) {
  let existing = [];
  try {
    existing = JSON.parse(fs.readFileSync(RESULTS_FILE, 'utf8'));
  } catch {
    existing = [];
  }
  existing.push(result);
  fs.writeFileSync(RESULTS_FILE, JSON.stringify(existing));
}

function loadResults() {
  try {
    return JSON.parse(fs.readFileSync(RESULTS_FILE, 'utf8'));
  } catch {
    return [];
  }
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

  const passed = results.filter((r) => r.execution_status === 'passed').length;
  const failed = results.filter((r) => r.execution_status === 'failed').length;
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
      headers: {
        'Content-Type': 'application/json',
        Authorization: \`Bearer \${API_KEY}\`,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error(\`[SynthQA] Webhook failed (\${res.status}): \${text}\`);
    } else {
      const json = await res.json();
    }
  } catch (err) {
    console.error('[SynthQA] Webhook error:', err);
  }
}

module.exports = { saveResult, loadResults, clearResults, makeResult, reportResults };
`,
    );

    // Global setup/teardown
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

    // Generate test files
    testCases.forEach((tc: any, idx: number) => {
      const steps = Array.isArray(tc.test_steps) ? tc.test_steps : [];
      const fileName = `${String(idx + 1).padStart(3, "0")}-${tc.title.toLowerCase().replace(/\s+/g, "-")}.test.js`;
      zip.file(
        `${root}/tests/${fileName}`,
        generatePuppeteerTest(tc, steps, suite.base_url),
      );
    });

    // cypress.env.json equivalent — jest uses process.env but we ship a .env
    zip.file(
      `${root}/.env`,
      `SYNTHQA_WEBHOOK_URL=${process.env.NEXT_PUBLIC_APP_URL}/api/automation/webhook/results
SYNTHQA_API_KEY=your_api_key_here
SYNTHQA_SUITE_ID=${suite.id}
BASE_URL=${suite.base_url}
TEST_ENVIRONMENT=local
HEADLESS=true
TEST_USER_EMAIL=your_test_email@example.com
TEST_USER_PASSWORD=your_test_password
TEST_USER_USERNAME=your_test_username
`,
    );
    //generate gitignore

    zip.file(
      `${root}/.gitignore`,
      `node_modules
.env
test-results/,
.synthqa-results.json
test-results/screenshots
`,
    );

    zip.file(
      `${root}/README.md`,
      generateReadme("Puppeteer", suite.name, testCases.length),
    );

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

function escapeForJs(str: string): string {
  return str
    .replace(/\\/g, "\\\\")
    .replace(/`/g, "\\`")
    .replace(/'/g, "\\'")
    .replace(/\$/g, "\\$")
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "\\r");
}

function generatePuppeteerTest(
  testCase: any,
  steps: TestStep[],
  baseUrl: string,
): string {
  const stepsCode = steps
    .map((step, idx) => {
      const lines: string[] = [];
      const sel = escapeForJs(step.selector || "");
      const val = escapeForJs(step.input_value || "");

      if (step.action_type === "navigate") {
        const url = step.input_value || "/";
        const isFullUrl =
          url.startsWith("http://") || url.startsWith("https://");
        const isPlaceholder =
          url.includes("example.com") ||
          url.includes("localhost:3000") ||
          url.includes("your-app");

        if (isFullUrl && !isPlaceholder) {
          lines.push(`await page.goto('${escapeForJs(url)}');`);
        } else if (isFullUrl && isPlaceholder) {
          // Extract path and use BASE_URL instead
          try {
            const parsedPath = new URL(url).pathname;
            lines.push(
              `await page.goto(\`\${BASE_URL}${escapeForJs(parsedPath)}\`);`,
            );
          } catch {
            lines.push(`await page.goto(BASE_URL);`);
          }
        } else {
          const path = url.startsWith("/") ? url : `/${url}`;
          lines.push(`await page.goto(\`\${BASE_URL}${escapeForJs(path)}\`);`);
        }
      } else if (step.action_type === "click") {
        lines.push(`await page.click('${sel}');`);
      } else if (step.action_type === "fill" || step.action_type === "type") {
        const isEmailField =
          sel.includes("email") ||
          step.action?.toLowerCase().includes("email") ||
          val.includes("@");
        const isPasswordField =
          sel.includes("password") ||
          step.action?.toLowerCase().includes("password");
        const isUsernameField =
          sel.includes("username") ||
          step.action?.toLowerCase().includes("username");

        let typedVal: string;
        if (isEmailField) {
          typedVal = `' + (process.env.TEST_USER_EMAIL || '${val}') + '`;
        } else if (isPasswordField) {
          typedVal = `' + (process.env.TEST_USER_PASSWORD || '${val}') + '`;
        } else if (isUsernameField) {
          typedVal = `' + (process.env.TEST_USER_USERNAME || '${val}') + '`;
        } else {
          typedVal = val;
        }

        lines.push(`await page.click('${sel}', { clickCount: 3 });`);
        lines.push(`await page.type('${sel}', '${typedVal}');`);
      } else if (step.action_type === "check") {
        lines.push(`await page.click('${sel}');`);
      } else if (step.action_type === "select") {
        lines.push(`await page.select('${sel}', '${val}');`);
      } else {
        lines.push(`// TODO: ${step.action}`);
      }

      if (step.assertion?.type === "visible") {
        const target = escapeForJs(
          step.assertion.target || step.selector || "",
        );
        lines.push(`await expect(page).toMatchElement('${target}');`);
      } else if (step.assertion?.type === "text") {
        const target = escapeForJs(
          step.assertion.target || step.selector || "",
        );
        const assertVal = escapeForJs(step.assertion.value || "");
        lines.push(
          `await expect(page).toMatchElement('${target}', { text: '${assertVal}' });`,
        );
      } else if (step.assertion?.type === "url") {
        const assertVal = escapeForJs(step.assertion.value || "");
        lines.push(`expect(page.url()).toContain('${assertVal}');`);
      }

      return `    // Step ${idx + 1}: ${step.action}\n    ${lines.join("\n    ")}`;
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

function generateReadme(
  framework: string,
  suiteName: string,
  caseCount: number,
): string {
  return `# ${suiteName} - ${framework} Tests

Generated by SynthQA

## Quick Start

\`\`\`bash
npm install
npm test
\`\`\`

## Configuration

Update \`.env\` with your API key before running:

\`\`\`
SYNTHQA_API_KEY=your_api_key_here
\`\`\`

All other values are pre-filled from your SynthQA configuration.

> ⚠️ Do not commit \`.env\` — it is already in \`.gitignore\`.

## Test Cases

- **Total Tests**: ${caseCount}
- **Location**: \`tests/\`

## CI/CD

\`\`\`yaml
- name: Run ${framework} tests
  env:
    SYNTHQA_API_KEY: \${{ secrets.SYNTHQA_API_KEY }}
  run: npm test
\`\`\`
`;
}
