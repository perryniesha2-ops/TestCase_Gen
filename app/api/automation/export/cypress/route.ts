// app/api/automation/export/cypress/route.ts
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

    // Fetch suite
    const { data: suite, error: suiteErr } = await supabase
      .from("suites")
      .select("id, name, description, base_url")
      .eq("id", suiteId)
      .single();

    if (suiteErr || !suite) {
      return NextResponse.json({ error: "Suite not found" }, { status: 404 });
    }

    // Fetch test cases
    const { data: suiteItems } = await supabase
      .from("suite_items")
      .select(
        `
        id, test_case_id, sequence_order,
        test_cases (id, title, description, test_steps)
      `,
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
    const root = `cypress-${suite.name.toLowerCase().replace(/\s+/g, "-")}-${suite.id.slice(0, 8)}`;

    // Package.json
    zip.file(
      `${root}/package.json`,
      JSON.stringify(
        {
          name: `synthqa-cypress-${suite.name.toLowerCase().replace(/\s+/g, "-")}`,
          version: "1.0.0",
          private: true,
          scripts: {
            test: "cypress run",
            "test:headed": "cypress run --headed",
            open: "cypress open",
          },
          devDependencies: {
            cypress: "^13.6.2",
            typescript: "^5.3.3",
          },
        },
        null,
        2,
      ),
    );

    // Cypress config
    zip.file(
      `${root}/cypress.config.ts`,
      `import { defineConfig } from 'cypress';

export default defineConfig({
  e2e: {
    baseUrl: process.env.BASE_URL || '${suite.base_url}',
    setupNodeEvents(on, config) {
          synthqaReporter(on);
    },
    supportFile: 'cypress/support/e2e.ts',
    specPattern: 'cypress/e2e/**/*.cy.ts',
    video: true,
    screenshotOnRunFailure: true,
    retries: {
      runMode: 2,
      openMode: 0
    }
  },
});
`,
    );

    //cypress synthqa reporter

    zip.file(
      `${root}/cypress/support/synthqa-reporter.ts`,
      `import { execSync } from 'child_process';

const WEBHOOK_URL = process.env.SYNTHQA_WEBHOOK_URL;
const API_KEY = process.env.SYNTHQA_API_KEY;
const SUITE_ID = process.env.SYNTHQA_SUITE_ID;

interface TestResult {
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
  cypress_version: string;
}

const results: TestResult[] = [];
let suiteStartTime = new Date().toISOString();

let cypressVersion = 'unknown';
try {
  cypressVersion = execSync('npx cypress --version --component')
    .toString()
    .split('\\n')[0]
    .trim();
} catch {
  cypressVersion = 'unknown';
}

const getOS = (): string => {
  const p = process.platform;
  if (p === 'darwin') return 'macOS';
  if (p === 'win32') return 'Windows';
  return 'Linux';
};

module.exports = (on: Cypress.PluginEvents) => {
  on('before:run', () => {
    suiteStartTime = new Date().toISOString();
    results.length = 0;
  });

  on('after:spec', (_spec: any, specResults: any) => {
    const tests = specResults?.tests ?? [];

    for (const test of tests) {
      const attempts = test.attempts ?? [];
      const lastAttempt = attempts[attempts.length - 1] ?? {};
      const state = lastAttempt.state ?? test.state ?? 'skipped';
      const durationMs = lastAttempt.duration ?? test.duration ?? 0;

      // Extract test_case_id from the it() title (we use the UUID as the test name)
      const uuidRegex =
        /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
      const titleMatch = test.title?.join(' ')?.match(uuidRegex);
      const testCaseId = titleMatch ? titleMatch[0] : null;

      const error = lastAttempt.error;
      const startedAt = new Date(
        Date.now() - durationMs
      ).toISOString();
      const completedAt = new Date().toISOString();

      results.push({
        test_case_id: testCaseId,
        execution_status:
          state === 'passed'
            ? 'passed'
            : state === 'pending'
            ? 'skipped'
            : 'failed',
        started_at: startedAt,
        completed_at: completedAt,
        duration_minutes: durationMs / 60000,
        execution_notes: null,
        failure_reason: error?.message ?? null,
        stack_trace: error?.stack ?? null,
        browser: 'chrome',
        os_version: getOS(),
        test_environment: process.env.TEST_ENVIRONMENT || 'local',
        framework: 'cypress',
        cypress_version: cypressVersion,
      });
    }
  });

  on('after:run', async (runResults: any) => {
    if (!WEBHOOK_URL || !API_KEY || !SUITE_ID) {
      console.warn(
        '[SynthQA] Missing SYNTHQA_WEBHOOK_URL, SYNTHQA_API_KEY, or SYNTHQA_SUITE_ID — skipping result sync'
      );
      return;
    }

    const passed = results.filter((r) => r.execution_status === 'passed').length;
    const failed = results.filter((r) => r.execution_status === 'failed').length;
    const skipped = results.filter((r) => r.execution_status === 'skipped').length;
    const total = results.length;

    const payload = {
      suite_id: SUITE_ID,
      session_id: \`cypress-\${Date.now()}\`,
      framework: 'cypress',
      test_results: results,
      metadata: {
        total_tests: total,
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
        console.log(
          \`[SynthQA] ✅ Synced run #\${json.run_number} — \${passed} passed, \${failed} failed, \${skipped} skipped\`
        );
      }
    } catch (err) {
      console.error('[SynthQA] Webhook error:', err);
    }
  });
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
            lib: ["ES2020", "DOM"],
            types: ["cypress", "node"],
            moduleResolution: "node",
            esModuleInterop: true,
            skipLibCheck: true,
          },
          include: ["cypress/**/*.ts"],
        },
        null,
        2,
      ),
    );

    // Support file
    zip.file(
      `${root}/cypress/support/e2e.ts`,
      `// Cypress support file
import './commands';

// Hide fetch/XHR in command log
const app = window.top;
if (!app.document.head.querySelector('[data-hide-command-log-request]')) {
  const style = app.document.createElement('style');
  style.innerHTML = '.command-name-request, .command-name-xhr { display: none }';
  style.setAttribute('data-hide-command-log-request', '');
  app.document.head.appendChild(style);
}
`,
    );

    zip.file(
      `${root}/cypress/support/commands.ts`,
      `// Custom Cypress commands
declare global {
  namespace Cypress {
    interface Chainable {
      login(email: string, password: string): Chainable<void>
    }
  }
}

Cypress.Commands.add('login', (email: string, password: string) => {
  cy.visit('/login');
  cy.get('input[name="email"]').type(email);
  cy.get('input[name="password"]').type(password);
  cy.get('button[type="submit"]').click();
  cy.url().should('include', '/dashboard');
});

export {};
`,
    );

    // Generate test specs
    testCases.forEach((tc: any, idx: number) => {
      const steps = Array.isArray(tc.test_steps) ? tc.test_steps : [];
      const fileName = `${String(idx + 1).padStart(3, "0")}-${tc.title.toLowerCase().replace(/\s+/g, "-")}.cy.ts`;

      const testCode = generateCypressTest(tc, steps);
      zip.file(`${root}/cypress/e2e/${fileName}`, testCode);
    });

    // .env.example
    zip.file(
      `${root}/.env.example`,
      `BASE_URL=${suite.base_url}
SYNTHQA_WEBHOOK_URL=${process.env.NEXT_PUBLIC_APP_URL || ""}/api/automation/webhook/results
SYNTHQA_API_KEY=your_api_key_here
SYNTHQA_SUITE_ID=${suite.id}
TEST_ENVIRONMENT=local
USER_EMAIL=test@example.com
USER_PASSWORD=password123
`,
    );

    // .gitignore
    zip.file(
      `${root}/.gitignore`,
      `node_modules
cypress/videos
cypress/screenshots
.env
cypress/downloads
`,
    );

    // README
    zip.file(
      `${root}/README.md`,
      generateCypressReadme(suite.name, testCases.length),
    );

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
  } catch (error) {
    console.error("Cypress export error:", error);
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

function generateCypressTest(testCase: any, steps: TestStep[]): string {
  const stepsCode = steps
    .map((step, idx) => {
      const lines: string[] = [];
      const sel = escapeForJs(step.selector || "");
      const val = escapeForJs(step.input_value || "");

      if (step.action_type === "navigate") {
        const url = escapeForJs(step.input_value || "/");
        const isFullUrl =
          url.startsWith("http://") || url.startsWith("https://");
        const path = isFullUrl ? url : url.startsWith("/") ? url : `/${url}`;
        lines.push(`cy.visit('${path}');`);
      } else if (step.action_type === "click") {
        lines.push(`cy.get('${sel}').click();`);
      } else if (step.action_type === "fill" || step.action_type === "type") {
        lines.push(`cy.get('${sel}').clear().type('${val}');`);
      } else if (step.action_type === "check") {
        lines.push(`cy.get('${sel}').check();`);
      } else if (step.action_type === "select") {
        lines.push(`cy.get('${sel}').select('${val}');`);
      } else {
        lines.push(`// TODO: ${step.action}`);
      }

      // Assertions
      const assertTarget = escapeForJs(
        step.assertion?.target || step.selector || "",
      );
      if (step.assertion?.type === "visible") {
        lines.push(`cy.get('${assertTarget}').should('be.visible');`);
      } else if (step.assertion?.type === "text") {
        const assertVal = escapeForJs(step.assertion.value || "");
        lines.push(
          `cy.get('${assertTarget}').should('contain.text', '${assertVal}');`,
        );
      } else if (step.assertion?.type === "url") {
        const assertVal = escapeForJs(step.assertion.value || "");
        lines.push(`cy.url().should('include', '${assertVal}');`);
      }

      // Prefer DOM-based waits; only emit cy.wait() as a last resort
      if (step.wait_time && step.wait_time > 0 && !step.assertion) {
        lines.push(
          `// cy.wait(${step.wait_time}); // prefer a DOM assertion above instead`,
        );
      }

      return `    // Step ${idx + 1}: ${step.action}\n    ${lines.join("\n    ")}`;
    })
    .join("\n\n");

  return `describe('${escapeForJs(testCase.title)}', () => {
  it('${testCase.id}', () => {
${stepsCode}
  });
});
`;
}

function generateCypressReadme(suiteName: string, caseCount: number): string {
  return `# ${suiteName} - Cypress Tests

Generated by SynthQA

## Quick Start

\`\`\`bash
# Install dependencies
npm install

# Run tests headless
npm test

# Run tests in headed mode
npm run test:headed

# Open Cypress UI
npm run open
\`\`\`

## Configuration

Create a \`.env\` file:

\`\`\`bash
BASE_URL=https://your-app.com
USER_EMAIL=test@example.com
USER_PASSWORD=password123
\`\`\`

## Test Cases

- **Total Tests**: ${caseCount}
- **Location**: \`cypress/e2e/\`

## CI/CD Integration

\`\`\`yaml
- name: Run Cypress tests
  run: npm test
\`\`\`
`;
}
