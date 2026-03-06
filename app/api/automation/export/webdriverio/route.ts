// app/api/automation/export/webdriverio/route.ts
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
    const root = `webdriverio-${suite.name.toLowerCase().replace(/\s+/g, "-")}-${suite.id.slice(0, 8)}`;

    // package.json
    zip.file(
      `${root}/package.json`,
      JSON.stringify(
        {
          name: `synthqa-webdriverio-${suite.name.toLowerCase().replace(/\s+/g, "-")}`,
          version: "1.0.0",
          private: true,
          scripts: {
            test: "wdio run wdio.conf.ts",
            "test:headed": "HEADLESS=false wdio run wdio.conf.ts",
          },
          devDependencies: {
            "@wdio/cli": "^8.29.1",
            "@wdio/local-runner": "^8.29.1",
            "@wdio/mocha-framework": "^8.29.1",
            "@wdio/spec-reporter": "^8.29.1",
            "wdio-chromedriver-service": "^8.1.1",
            chromedriver: "^121.0.0",
            typescript: "^5.3.3",
            "ts-node": "^10.9.2",
            "@types/node": "^20.11.5",
            dotenv: "^16.4.5",
          },
        },
        null,
        2,
      ),
    );

    // wdio.conf.ts
    zip.file(
      `${root}/wdio.conf.ts`,
      `import * as dotenv from 'dotenv';
dotenv.config();
import type { Options } from '@wdio/types';
import { synthqaReporter } from './support/synthqa-reporter';

export const config: Options.Testrunner = {
  runner: 'local',
  autoCompileOpts: {
    autoCompile: true,
    tsNodeOpts: {
      project: './tsconfig.json',
      transpileOnly: true,
    },
  },
  specs: ['./tests/**/*.test.ts'],
  maxInstances: 1,
  capabilities: [{
    browserName: 'chrome',
    'goog:chromeOptions': {
      args: process.env.HEADLESS !== 'false'
        ? ['--headless', '--no-sandbox', '--disable-setuid-sandbox']
        : ['--no-sandbox'],
    },
  }],
  logLevel: 'warn',
  bail: 0,
  baseUrl: process.env.BASE_URL || '${suite.base_url}',
  waitforTimeout: 10000,
  connectionRetryTimeout: 120000,
  connectionRetryCount: 3,
  services: ['chromedriver'],
  framework: 'mocha',
  reporters: ['spec'],
  mochaOpts: {
    ui: 'bdd',
    timeout: 60000,
  },
  onComplete: async () => {
    await synthqaReporter.flush();
  },
};
`,
    );

    // tsconfig.json
    zip.file(
      `${root}/tsconfig.json`,
      JSON.stringify(
        {
          compilerOptions: {
            target: "ES2020",
            lib: ["ES2020"],
            types: ["node", "@wdio/globals/types"],
            moduleResolution: "node",
            esModuleInterop: true,
            skipLibCheck: true,
            strict: false,
          },
          include: ["tests/**/*.ts", "support/**/*.ts", "wdio.conf.ts"],
        },
        null,
        2,
      ),
    );

    // Reporter
    zip.file(
      `${root}/support/synthqa-reporter.ts`,
      `export interface TestResult {
  test_case_id: string | null;
  execution_status: 'passed' | 'failed' | 'skipped';
  started_at: string;
  completed_at: string;
  duration_minutes: number;
  execution_notes: string | null;
  failure_reason: string | null;
  stack_trace: string | null;
  browser: string;
  os_version: string;
  test_environment: string;
  framework: string;
  framework_version: string;
}

const WEBHOOK_URL = process.env.SYNTHQA_WEBHOOK_URL;
const API_KEY = process.env.SYNTHQA_API_KEY;
const SUITE_ID = process.env.SYNTHQA_SUITE_ID;

let wdioVersion = 'unknown';
try {
  wdioVersion = require('@wdio/cli/package.json').version;
} catch {
  wdioVersion = 'unknown';
}

const getOS = (): string => {
  const p = process.platform;
  if (p === 'darwin') return 'macOS';
  if (p === 'win32') return 'Windows';
  return 'Linux';
};

class SynthQAReporter {
  private results: TestResult[] = [];

  collect(result: TestResult): void {
    this.results.push(result);
  }

  makeResult(
    overrides: Partial<TestResult> & { execution_status: TestResult['execution_status'] }
  ): TestResult {
    return {
      test_case_id: null,
      execution_status: overrides.execution_status,
      started_at: overrides.started_at ?? new Date().toISOString(),
      completed_at: overrides.completed_at ?? new Date().toISOString(),
      duration_minutes: overrides.duration_minutes ?? 0,
      execution_notes: null,
      failure_reason: null,
      stack_trace: null,
      browser: 'chrome',
      os_version: getOS(),
      test_environment: process.env.TEST_ENVIRONMENT || 'local',
      framework: 'webdriverio',
      framework_version: wdioVersion,
      ...overrides,
    };
  }

  async flush(): Promise<void> {
    if (!WEBHOOK_URL || !API_KEY || !SUITE_ID) {
      console.warn('[SynthQA] Missing SYNTHQA_WEBHOOK_URL, SYNTHQA_API_KEY, or SYNTHQA_SUITE_ID — skipping result sync');
      return;
    }

    const passed = this.results.filter((r) => r.execution_status === 'passed').length;
    const failed = this.results.filter((r) => r.execution_status === 'failed').length;
    const skipped = this.results.filter((r) => r.execution_status === 'skipped').length;

    const payload = {
      suite_id: SUITE_ID,
      session_id: \`wdio-\${Date.now()}\`,
      framework: 'webdriverio',
      test_results: this.results,
      metadata: {
        total_tests: this.results.length,
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
        console.log(\`[SynthQA] ✅ Synced run #\${json.run_number} — \${passed} passed, \${failed} failed, \${skipped} skipped\`);
      }
    } catch (err) {
      console.error('[SynthQA] Webhook error:', err);
    }
  }
}

export const synthqaReporter = new SynthQAReporter();
`,
    );

    // Generate test files
    testCases.forEach((tc: any, idx: number) => {
      const steps = Array.isArray(tc.test_steps) ? tc.test_steps : [];
      const fileName = `${String(idx + 1).padStart(3, "0")}-${tc.title.toLowerCase().replace(/\s+/g, "-")}.test.ts`;
      zip.file(
        `${root}/tests/${fileName}`,
        generateWdioTest(tc, steps, suite.base_url),
      );
    });

    zip.file(
      `${root}/.env`,
      `SYNTHQA_WEBHOOK_URL=${process.env.NEXT_PUBLIC_APP_URL}/api/automation/webhook/results
SYNTHQA_API_KEY=your_api_key_here
SYNTHQA_SUITE_ID=${suite.id}
BASE_URL=${suite.base_url}
TEST_ENVIRONMENT=local
HEADLESS=true
`,
    );

    zip.file(
      `${root}/.gitignore`,
      `node_modules
.env
logs/
`,
    );

    zip.file(
      `${root}/README.md`,
      generateReadme("WebdriverIO", suite.name, testCases.length),
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
    console.error("WebdriverIO export error:", error);
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

function generateWdioTest(
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
            ? `await browser.url('${path}');`
            : `await browser.url(\`\${BASE_URL}${path}\`);`,
        );
      } else if (step.action_type === "click") {
        lines.push(`await (await $('${sel}')).click();`);
      } else if (step.action_type === "fill" || step.action_type === "type") {
        lines.push(`await (await $('${sel}')).clearValue();`);
        lines.push(`await (await $('${sel}')).setValue('${val}');`);
      } else if (step.action_type === "check") {
        lines.push(`await (await $('${sel}')).click();`);
      } else if (step.action_type === "select") {
        lines.push(`await (await $('${sel}')).selectByVisibleText('${val}');`);
      } else {
        lines.push(`// TODO: ${step.action}`);
      }

      if (step.assertion?.type === "visible") {
        const target = escapeForJs(
          step.assertion.target || step.selector || "",
        );
        lines.push(`await expect(await $('${target}')).toBeDisplayed();`);
      } else if (step.assertion?.type === "text") {
        const target = escapeForJs(
          step.assertion.target || step.selector || "",
        );
        const assertVal = escapeForJs(step.assertion.value || "");
        lines.push(
          `await expect(await $('${target}')).toHaveText(expect.stringContaining('${assertVal}'));`,
        );
      } else if (step.assertion?.type === "url") {
        const assertVal = escapeForJs(step.assertion.value || "");
        lines.push(
          `await expect(browser).toHaveUrlContaining('${assertVal}');`,
        );
      }

      return `    // Step ${idx + 1}: ${step.action}\n    ${lines.join("\n    ")}`;
    })
    .join("\n\n");

  return `import { synthqaReporter } from '../support/synthqa-reporter';

const BASE_URL = process.env.BASE_URL || '${escapeForJs(baseUrl)}';

describe('${escapeForJs(testCase.title)}', () => {
  it('${testCase.id}', async () => {
    const startedAt = new Date().toISOString();
    let status: 'passed' | 'failed' = 'passed';
    let failureReason: string | null = null;
    let stackTrace: string | null = null;

    try {
${stepsCode}
    } catch (err: any) {
      status = 'failed';
      failureReason = err?.message ?? String(err);
      stackTrace = err?.stack ?? null;
      throw err;
    } finally {
      synthqaReporter.collect(
        synthqaReporter.makeResult({
          test_case_id: '${testCase.id}',
          execution_status: status,
          started_at: startedAt,
          completed_at: new Date().toISOString(),
          duration_minutes: (Date.now() - new Date(startedAt).getTime()) / 60000,
          failure_reason: failureReason,
          stack_trace: stackTrace,
        })
      );
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
