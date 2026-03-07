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
    // wdio.conf.ts
    zip.file(
      `${root}/wdio.conf.ts`,
      `import * as dotenv from 'dotenv';
dotenv.config();
import type { Options } from '@wdio/types';
import { synthqaReporter } from './support/synthqa-reporter';
import './support/setup';  // ← Import setup directly

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
    require: ['./support/setup.ts'],  // ← Move require here inside mochaOpts
  },
  
  before: function() {
    console.log('[WDIO HOOK] before() called');
  },
  
  beforeTest: function(test, context) {
    console.log('[WDIO HOOK] beforeTest() called for:', test.title);
  },
  
  afterTest: async function(test, context, result) {
    console.log('[WDIO HOOK] afterTest() called for:', test.title);
    console.log('[WDIO HOOK] Test result:', result.passed ? 'PASSED' : 'FAILED');
    console.log('[WDIO HOOK] Error:', result.error?.message || 'none');
    
    const testCaseId = test.title;
    
    synthqaReporter.collect(
      synthqaReporter.makeResult({
        test_case_id: testCaseId,
        execution_status: result.passed ? 'passed' : 'failed',
        started_at: new Date(Date.now() - result.duration).toISOString(),
        completed_at: new Date().toISOString(),
        duration_minutes: result.duration / 60000,
        failure_reason: result.error?.message || null,
        stack_trace: result.error?.stack || null,
      })
    );
  },
  
  after: function() {
    console.log('[WDIO HOOK] after() called');
  },
  
  onComplete: async function() {
    console.log('[WDIO HOOK] onComplete() called');
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

interface WebhookResponse {
  success: boolean;
  automation_run_id: string;
  run_number: number;
  executions_saved: number;
  message: string;
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

  constructor() {
    console.log('[SynthQA] Reporter initialized');
  }

  collect(result: TestResult): void {
    console.log('[SynthQA] Collecting result:', result.test_case_id, '-', result.execution_status);
    this.results.push(result);
    console.log('[SynthQA] Total results collected:', this.results.length);
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
    console.log('[SynthQA] Flush called with', this.results.length, 'results');
    
    if (!WEBHOOK_URL || !API_KEY || !SUITE_ID) {
      console.warn('[SynthQA] Missing environment variables:');
      console.warn('  WEBHOOK_URL:', WEBHOOK_URL ? 'SET' : 'MISSING');
      console.warn('  API_KEY:', API_KEY ? 'SET' : 'MISSING');
      console.warn('  SUITE_ID:', SUITE_ID ? 'SET' : 'MISSING');
      return;
    }

    const passed = this.results.filter((r) => r.execution_status === 'passed').length;
    const failed = this.results.filter((r) => r.execution_status === 'failed').length;
    const skipped = this.results.filter((r) => r.execution_status === 'skipped').length;

    const payload = {
      suite_id: SUITE_ID,
      session_id: 'wdio-' + Date.now(),
      framework: 'webdriverio',
      test_results: this.results,
      metadata: {
        total_tests: this.results.length,
        passed_tests: passed,
        failed_tests: failed,
        skipped_tests: skipped,
        overall_status: (failed > 0 ? 'failed' : 'passed') as 'passed' | 'failed',
        branch: process.env.GIT_BRANCH ?? process.env.GITHUB_REF_NAME ?? null,
        commit_sha: process.env.GIT_COMMIT ?? process.env.GITHUB_SHA ?? null,
        ci_provider: process.env.CI ? 'github-actions' : null,
      },
    };

    console.log('[SynthQA] Sending payload with', this.results.length, 'results to', WEBHOOK_URL);

    try {
      const res = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + API_KEY,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const text = await res.text();
        console.error('[SynthQA] Webhook failed (' + res.status + '):', text);
      } else {
        const json = (await res.json()) as WebhookResponse;
        console.log('[SynthQA] ✅ Synced run #' + json.run_number + ' — ' + passed + ' passed, ' + failed + ' failed, ' + skipped + ' skipped');
      }
    } catch (err) {
      console.error('[SynthQA] Webhook error:', err);
    }
  }
}

export const synthqaReporter = new SynthQAReporter();
`,
    );

    // support/setup.ts with debug logging

    zip.file(
      `${root}/support/setup.ts`,
      `import { synthqaReporter } from './synthqa-reporter';

console.log('[SETUP] Loading setup.ts');

let currentTestId: string | null = null;
let currentTestStart: number = 0;

// Make these available globally
(global as any).setCurrentTest = (id: string) => {
  console.log('[SETUP] setCurrentTest called with:', id);
  currentTestId = id;
  currentTestStart = Date.now();
};

(global as any).reportTestResult = (passed: boolean, error?: Error) => {
  console.log('[SETUP] reportTestResult called:', passed, currentTestId);
  
  if (!currentTestId) {
    console.warn('[SETUP] No current test ID set!');
    return;
  }
  
  synthqaReporter.collect(
    synthqaReporter.makeResult({
      test_case_id: currentTestId,
      execution_status: passed ? 'passed' : 'failed',
      started_at: new Date(currentTestStart).toISOString(),
      completed_at: new Date().toISOString(),
      duration_minutes: (Date.now() - currentTestStart) / 60000,
      failure_reason: error?.message || null,
      stack_trace: error?.stack || null,
    })
  );
  
  currentTestId = null;
};

console.log('[SETUP] Global functions registered:', {
  setCurrentTest: typeof (global as any).setCurrentTest,
  reportTestResult: typeof (global as any).reportTestResult,
});
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
TEST_USER_EMAIL=your_test_email@example.com
TEST_USER_PASSWORD=your_test_password
TEST_USER_USERNAME=your_test_username
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
    .replace(/`/g, "\\`")
    .replace(/'/g, "\\'")
    .replace(/\$/g, "\\$")
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

        lines.push(`await (await $('${sel}')).clearValue();`);
        lines.push(`await (await $('${sel}')).setValue('${typedVal}');`);
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

declare global {
  var setCurrentTest: (id: string) => void;
  var reportTestResult: (passed: boolean, error?: Error) => void;
}

describe('${escapeForJs(testCase.title)}', () => {
  it('${testCase.id}', async () => {
    console.log('[TEST] Starting test: ${testCase.id}');
    
    if (typeof global.setCurrentTest === 'function') {
      console.log('[TEST] Calling setCurrentTest');
      global.setCurrentTest('${testCase.id}');
    } else {
      console.error('[TEST] setCurrentTest is not a function!', typeof global.setCurrentTest);
    }
    
    try {
      console.log('[TEST] Executing test steps...');
${stepsCode}
      console.log('[TEST] Test steps completed successfully');
      
      if (typeof global.reportTestResult === 'function') {
        console.log('[TEST] Reporting success');
        global.reportTestResult(true);
      } else {
        console.error('[TEST] reportTestResult is not a function!');
      }
    } catch (err: any) {
      console.log('[TEST] Test failed with error:', err.message);
      
      if (typeof global.reportTestResult === 'function') {
        console.log('[TEST] Reporting failure');
        global.reportTestResult(false, err);
      } else {
        console.error('[TEST] reportTestResult is not a function!');
      }
      
      throw err;
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
