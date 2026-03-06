// app/api/automation/export/testcafe/route.ts
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
    const root = `testcafe-${suite.name.toLowerCase().replace(/\s+/g, "-")}-${suite.id.slice(0, 8)}`;

    // package.json
    zip.file(
      `${root}/package.json`,
      JSON.stringify(
        {
          name: `synthqa-testcafe-${suite.name.toLowerCase().replace(/\s+/g, "-")}`,
          version: "1.0.0",
          private: true,
          scripts: {
            test: "testcafe chrome tests/ --reporter spec,./support/synthqa-reporter.js",
            "test:headed":
              "testcafe chrome tests/ --reporter spec,./support/synthqa-reporter.js",
            "test:headless":
              "testcafe chrome:headless tests/ --reporter spec,./support/synthqa-reporter.js",
          },
          devDependencies: {
            testcafe: "^3.5.0",
            typescript: "^5.3.3",
            "ts-node": "^10.9.2",
            "@types/node": "^20.11.5",
          },
        },
        null,
        2,
      ),
    );

    // .testcaferc.json
    zip.file(
      `${root}/.testcaferc.json`,
      JSON.stringify(
        {
          browsers: ["chrome:headless"],
          src: ["tests/**/*.test.ts"],
          reporter: [
            { name: "spec" },
            { name: "./support/synthqa-reporter.js" },
          ],
          baseUrl: suite.base_url,
          screenshots: {
            takeOnFails: true,
            path: "screenshots/",
          },
          retryTestPages: true,
        },
        null,
        2,
      ),
    );

    // tsconfig.json
    zip.file(
      `${root}/tsconfig.json`,
      JSON.stringify(
        {
          compilerOptions: {
            target: "ES2020",
            lib: ["ES2020", "DOM"],
            types: ["testcafe", "node"],
            moduleResolution: "node",
            esModuleInterop: true,
            skipLibCheck: true,
            strict: false,
          },
          include: ["tests/**/*.ts", "support/**/*.ts"],
        },
        null,
        2,
      ),
    );

    // Reporter — TestCafe reporters are CommonJS plugins
    zip.file(
      `${root}/support/synthqa-reporter.js`,
      `// SynthQA TestCafe Reporter
// Implements the TestCafe reporter interface and POSTs results to SynthQA on completion.

const WEBHOOK_URL = process.env.SYNTHQA_WEBHOOK_URL;
const API_KEY = process.env.SYNTHQA_API_KEY;
const SUITE_ID = process.env.SYNTHQA_SUITE_ID;

const getOS = () => {
  const p = process.platform;
  if (p === 'darwin') return 'macOS';
  if (p === 'win32') return 'Windows';
  return 'Linux';
};

let testcafeVersion = 'unknown';
try {
  testcafeVersion = require('testcafe/package.json').version;
} catch {
  testcafeVersion = 'unknown';
}

module.exports = () => ({
  noColors: true,
  results: [],

  async reportTaskStart(startTime, userAgents, testCount) {
    this.results = [];
    this.startTime = startTime;
  },

  async reportFixtureStart(name) {
    this.currentFixture = name;
  },

  async reportTestDone(name, testRunInfo) {
    const durationMs = testRunInfo.durationMs || 0;
    const hasErrors = testRunInfo.errs && testRunInfo.errs.length > 0;
    const wasSkipped = testRunInfo.skipped;

    // Extract UUID from test name — we use the test case ID as the test name
    const uuidRegex = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
    const match = name.match(uuidRegex);
    const testCaseId = match ? match[0] : null;

    const firstError = hasErrors ? testRunInfo.errs[0] : null;

    this.results.push({
      test_case_id: testCaseId,
      execution_status: wasSkipped ? 'skipped' : hasErrors ? 'failed' : 'passed',
      started_at: new Date(Date.now() - durationMs).toISOString(),
      completed_at: new Date().toISOString(),
      duration_minutes: durationMs / 60000,
      execution_notes: null,
      failure_reason: firstError ? this.formatError(firstError) : null,
      stack_trace: firstError ? (firstError.callsite?.renderSync?.() ?? null) : null,
      browser: 'chrome',
      os_version: getOS(),
      test_environment: process.env.TEST_ENVIRONMENT || 'local',
      framework: 'testcafe',
      framework_version: testcafeVersion,
    });
  },

  async reportTaskDone(endTime, passed, warnings, result) {
    if (!WEBHOOK_URL || !API_KEY || !SUITE_ID) {
      console.warn('\\n[SynthQA] Missing SYNTHQA_WEBHOOK_URL, SYNTHQA_API_KEY, or SYNTHQA_SUITE_ID — skipping result sync');
      return;
    }

    const results = this.results;
    const passedCount = results.filter((r) => r.execution_status === 'passed').length;
    const failedCount = results.filter((r) => r.execution_status === 'failed').length;
    const skippedCount = results.filter((r) => r.execution_status === 'skipped').length;

    const payload = {
      suite_id: SUITE_ID,
      session_id: \`testcafe-\${Date.now()}\`,
      framework: 'testcafe',
      test_results: results,
      metadata: {
        total_tests: results.length,
        passed_tests: passedCount,
        failed_tests: failedCount,
        skipped_tests: skippedCount,
        overall_status: failedCount > 0 ? 'failed' : 'passed',
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
        console.error(\`\\n[SynthQA] Webhook failed (\${res.status}): \${text}\`);
      } else {
        const json = await res.json();
        console.log(\`\\n[SynthQA] ✅ Synced run #\${json.run_number} — \${passedCount} passed, \${failedCount} failed, \${skippedCount} skipped\`);
      }
    } catch (err) {
      console.error('\\n[SynthQA] Webhook error:', err);
    }
  },

  formatError(err) {
    try {
      return err.formatMessage?.() ?? err.message ?? String(err);
    } catch {
      return String(err);
    }
  },
});
`,
    );

    // Generate test files
    testCases.forEach((tc: any, idx: number) => {
      const steps = Array.isArray(tc.test_steps) ? tc.test_steps : [];
      const fileName = `${String(idx + 1).padStart(3, "0")}-${tc.title.toLowerCase().replace(/\s+/g, "-")}.test.ts`;
      zip.file(
        `${root}/tests/${fileName}`,
        generateTestCafeTest(tc, steps, suite.base_url),
      );
    });

    zip.file(
      `${root}/.env`,
      `SYNTHQA_WEBHOOK_URL=${process.env.NEXT_PUBLIC_APP_URL}/api/automation/webhook/results
SYNTHQA_API_KEY=your_api_key_here
SYNTHQA_SUITE_ID=${suite.id}
BASE_URL=${suite.base_url}
TEST_ENVIRONMENT=local
`,
    );

    zip.file(
      `${root}/.gitignore`,
      `node_modules
.env
screenshots/
`,
    );

    zip.file(
      `${root}/README.md`,
      generateReadme("TestCafe", suite.name, testCases.length),
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
    console.error("TestCafe export error:", error);
    return NextResponse.json({ error: "Export failed" }, { status: 500 });
  }
}

function escapeForJs(str: string): string {
  return str
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "\\'")
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "\\r");
}

function generateTestCafeTest(
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
        const path = isFullUrl
          ? escapeForJs(url)
          : escapeForJs(url.startsWith("/") ? url : `/${url}`);
        lines.push(
          isFullUrl
            ? `await t.navigateTo('${path}');`
            : `await t.navigateTo(\`\${BASE_URL}${path}\`);`,
        );
      } else if (step.action_type === "click") {
        lines.push(`await t.click(Selector('${sel}'));`);
      } else if (step.action_type === "fill" || step.action_type === "type") {
        lines.push(
          `await t.selectText(Selector('${sel}')).typeText(Selector('${sel}'), '${val}', { replace: true });`,
        );
      } else if (step.action_type === "check") {
        lines.push(`await t.click(Selector('${sel}'));`);
      } else if (step.action_type === "select") {
        lines.push(
          `await t.click(Selector('${sel} option[value=\\'${val}\\']'));`,
        );
      } else {
        lines.push(`// TODO: ${step.action}`);
      }

      if (step.assertion?.type === "visible") {
        const target = escapeForJs(
          step.assertion.target || step.selector || "",
        );
        lines.push(`await t.expect(Selector('${target}').visible).ok();`);
      } else if (step.assertion?.type === "text") {
        const target = escapeForJs(
          step.assertion.target || step.selector || "",
        );
        const assertVal = escapeForJs(step.assertion.value || "");
        lines.push(
          `await t.expect(Selector('${target}').innerText).contains('${assertVal}');`,
        );
      } else if (step.assertion?.type === "url") {
        const assertVal = escapeForJs(step.assertion.value || "");
        lines.push(`await t.expect(getPageUrl()).contains('${assertVal}');`);
      }

      return `    // Step ${idx + 1}: ${step.action}\n    ${lines.join("\n    ")}`;
    })
    .join("\n\n");

  return `import { Selector, ClientFunction } from 'testcafe';

const BASE_URL = process.env.BASE_URL || '${escapeForJs(baseUrl)}';
const getPageUrl = ClientFunction(() => document.location.href);

fixture('${escapeForJs(testCase.title)}')
  .page(BASE_URL);

test('${testCase.id}', async (t) => {
${stepsCode}
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
npm test          # headless (default via .testcaferc.json)
npm run test:headed   # headed browser
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
