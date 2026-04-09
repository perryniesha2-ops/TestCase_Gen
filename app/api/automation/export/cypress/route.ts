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

    const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL || "https://www.synthqa.app"}/api/automation/webhook/results`;

    // Get user's API key
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("api_key")
      .eq("id", user.id)
      .single();

    // Fetch suite
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

    // Warn if suite was enhanced for a different framework
    if (
      suite.automation_framework &&
      suite.automation_framework !== "cypress" &&
      suite.automation_status === "ready"
    ) {
      console.warn(
        `[export/cypress] Suite ${suiteId} was enhanced for ${suite.automation_framework} — selectors may not be optimised for Cypress`,
      );
    }

    const zip = new JSZip();
    const root = `cypress-${suite.name.toLowerCase().replace(/\s+/g, "-")}-${suite.id.slice(0, 8)}`;

    // ── package.json ────────────────────────────────────────────────────────────
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
            dotenv: "^16.4.5",
          },
        },
        null,
        2,
      ),
    );

    // ── cypress.config.ts ───────────────────────────────────────────────────────
    // BASE_URL comes from .env at runtime — the user sets it, not us.
    zip.file(
      `${root}/cypress.config.ts`,
      `import { defineConfig } from 'cypress';
import 'dotenv/config';
import synthqareporter from './cypress/support/synthqareporter';

export default defineConfig({
  e2e: {
    // BASE_URL is read from .env — update that file, not this one.
    baseUrl: process.env.BASE_URL || '${suite.base_url}',
    setupNodeEvents(on, config) {
      synthqareporter(on, config);
      return config;
    },
    supportFile: 'cypress/support/e2e.ts',
    specPattern: 'cypress/e2e/**/*.cy.ts',
    video: true,
    screenshotOnRunFailure: true,
    retries: {
      runMode: 2,
      openMode: 0,
    },
  },
  env: {
    // Loaded from .env via dotenv/config above.
    // All Cypress.env() calls in commands.ts read from here.
    USER_EMAIL: process.env.USER_EMAIL,
    USER_PASSWORD: process.env.USER_PASSWORD,
    SYNTHQA_WEBHOOK_URL: process.env.SYNTHQA_WEBHOOK_URL,
    SYNTHQA_API_KEY: process.env.SYNTHQA_API_KEY,
    SYNTHQA_SUITE_ID: process.env.SYNTHQA_SUITE_ID,
    TEST_ENVIRONMENT: process.env.TEST_ENVIRONMENT || 'local',
  },
});
`,
    );

    // ── .env ────────────────────────────────────────────────────────────────────
    // Mirrors the Playwright export pattern — user fills in BASE_URL,
    // credentials pre-populated where we have them.
    zip.file(
      `${root}/.env.example`,
      `# ── Application ───────────────────────────────────────────────────────────
# Set this to the URL of the application under test.
# This overrides the baseUrl in cypress.config.ts.
BASE_URL="${suite.base_url || "https://app.example.com"}"

# ── Auth (leave blank if tests don't require login) ────────────────────────
USER_EMAIL="test@example.com"
USER_PASSWORD="yourpassword"

# ── SynthQA Integration ────────────────────────────────────────────────────
SYNTHQA_WEBHOOK_URL="${webhookUrl}"
SYNTHQA_API_KEY="${profile?.api_key || "your_api_key_here"}"
SYNTHQA_SUITE_ID="${suite.id}"
TEST_ENVIRONMENT="local"
`,
    );

    // ── synthqareporter.ts ──────────────────────────────────────────────────────
    zip.file(
      `${root}/cypress/support/synthqareporter.ts`,
      `import { execSync } from 'child_process';

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

let cypressVersion = 'unknown';
try {
  cypressVersion = execSync('npx cypress --version')
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

export default (on: Cypress.PluginEvents, config: Cypress.PluginConfigOptions) => {
  const WEBHOOK_URL = config.env.SYNTHQA_WEBHOOK_URL as string | undefined;
  const API_KEY = config.env.SYNTHQA_API_KEY as string | undefined;
  const SUITE_ID = config.env.SYNTHQA_SUITE_ID as string | undefined;

  const results: TestResult[] = [];

  on('before:run', () => {
    results.length = 0;
  });

  on('after:spec', (_spec: any, specResults: any) => {
    const tests = specResults?.tests ?? [];

    for (const test of tests) {
      const attempts = test.attempts ?? [];
      const lastAttempt = attempts[attempts.length - 1] ?? {};
      const state = lastAttempt.state ?? test.state ?? 'skipped';
      const durationMs = lastAttempt.duration ?? test.duration ?? 0;

      const uuidRegex = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
      const titleMatch = test.title?.join(' ')?.match(uuidRegex);
      const testCaseId = titleMatch ? titleMatch[0] : null;

      // Cypress structures errors inconsistently depending on retry count and
      // failure type. Walk all these locations in priority order:
      //   1. lastAttempt.error          — most common for single-run failures
      //   2. lastAttempt.errors[]       — some Cypress versions use an array
      //   3. test.displayError          — set when error doesn't appear in attempts
      //   4. any earlier attempt error  — fallback if last attempt has no error
      //      (can happen when the test passes on retry but we still want the reason)
      const extractError = (attempt: any) =>
        attempt?.error ??
        attempt?.errors?.[0] ??
        null;

      const error =
        extractError(lastAttempt) ??
        (test.displayError ? { message: test.displayError, stack: null } : null) ??
        attempts.slice().reverse().map(extractError).find(Boolean) ??
        null;

      // Build a human-readable execution note:
      // - For retried tests, note how many attempts were made
      // - For hook failures (beforeEach/afterEach), surface which hook failed
      const retryCount = attempts.length - 1;
      const failedFromHook = lastAttempt.failedFromHookId
        ? \`Failed in hook: \${lastAttempt.failedFromHookId}\`
        : null;
      const executionNotes = [
        retryCount > 0 ? \`Retried \${retryCount} time(s)\` : null,
        failedFromHook,
      ].filter(Boolean).join(' — ') || null;

      // Stack trace: clean it up by stripping Cypress internal frames
      // so only the test code frames are visible in SynthQA
      const rawStack = error?.stack ?? null;
      const cleanStack = rawStack
        ? rawStack
            .split('\n')
            .filter((line: string) =>
              !line.includes('node_modules/cypress') &&
              !line.includes('/__cypress/') &&
              !line.includes('cypress/support/') &&
              line.trim() !== ''
            )
            .join('\n')
            .trim() || rawStack  // fall back to full stack if everything was filtered
        : null;

      results.push({
        test_case_id: testCaseId,
        execution_status:
          state === 'passed' ? 'passed' : state === 'pending' ? 'skipped' : 'failed',
        started_at: new Date(Date.now() - durationMs).toISOString(),
        completed_at: new Date().toISOString(),
        duration_minutes: durationMs / 60000,
        execution_notes: executionNotes,
        failure_reason: error?.message ?? null,
        stack_trace: cleanStack,
        browser: 'chrome',
        os_version: getOS(),
        test_environment: config.env.TEST_ENVIRONMENT || 'local',
        framework: 'cypress',
        cypress_version: cypressVersion,
      });
    }
  });

  on('after:run', async (_runResults: any) => {
    if (!WEBHOOK_URL || !API_KEY || !SUITE_ID) {
      console.warn('[SynthQA] Missing SYNTHQA_WEBHOOK_URL, SYNTHQA_API_KEY, or SYNTHQA_SUITE_ID — skipping result sync');
      return;
    }

    const passed = results.filter((r) => r.execution_status === 'passed').length;
    const failed = results.filter((r) => r.execution_status === 'failed').length;
    const skipped = results.filter((r) => r.execution_status === 'skipped').length;

    const payload = {
      suite_id: SUITE_ID,
      session_id: \`cypress-\${Date.now()}\`,
      framework: 'cypress',
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
        console.log(\`[SynthQA] ✅ Synced run #\${json.run_number} — \${passed} passed, \${failed} failed, \${skipped} skipped\`);
      }
    } catch (err) {
      console.error('[SynthQA] Webhook error:', err);
    }
  });
};
`,
    );

    // ── tsconfig.json ───────────────────────────────────────────────────────────
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
          include: ["cypress/**/*.ts", "cypress.config.ts"],
        },
        null,
        2,
      ),
    );

    // ── Support files ───────────────────────────────────────────────────────────
    zip.file(
      `${root}/cypress/support/e2e.ts`,
      `// Cypress support file
import './commands';
import { testConfig } from '../../synthqa.config';

// Make the config available to specs via window so beforeEach blocks can read it
// without importing directly (avoids module resolution issues in some setups).
Cypress.on('window:before:load', (win) => {
  (win as any).__synthqaConfig = testConfig;
});
`,
    );

    zip.file(
      `${root}/cypress/support/commands.ts`,
      `// Custom Cypress commands
declare global {
  namespace Cypress {
    interface Chainable {
      login(): Chainable<void>
    }
  }
}

// Credentials are read from .env — update USER_EMAIL / USER_PASSWORD there,
// not here. Never hard-code credentials in test files.
Cypress.Commands.add('login', () => {
  const email = Cypress.env('USER_EMAIL');
  const password = Cypress.env('USER_PASSWORD');

  if (!email || !password) {
    throw new Error(
      '[SynthQA] USER_EMAIL and USER_PASSWORD must be set in .env before running authenticated tests.'
    );
  }

  cy.visit('/login');
  cy.get('input[name="email"]').type(email);
  cy.get('input[name="password"]').type(password);
  cy.get('button[type="submit"]').click();
  cy.url().should('include', '/dashboard');
});

export {};
`,
    );

    // ── synthqa.config.ts — user edits this to control auth per test ──────────
    const cypressAuthConfig = generateCypressAuthConfig(
      testCases.map((tc: any) => {
        const steps = Array.isArray(tc.test_steps) ? tc.test_steps : [];
        return {
          id: tc.id,
          title: tc.title,
          needsAuth: testNeedsAuth(tc),
        };
      }),
    );
    zip.file(`${root}/synthqa.config.ts`, cypressAuthConfig);

    // ── Generate test specs ─────────────────────────────────────────────────────
    testCases.forEach((tc: any, idx: number) => {
      const steps = Array.isArray(tc.test_steps) ? tc.test_steps : [];
      const fileName = `${String(idx + 1).padStart(3, "0")}-${tc.title.toLowerCase().replace(/\s+/g, "-").slice(0, 60)}.cy.ts`;
      const testCode = generateCypressTest(tc, steps);
      zip.file(`${root}/cypress/e2e/${fileName}`, testCode);
    });

    // ── .gitignore ──────────────────────────────────────────────────────────────
    zip.file(
      `${root}/.gitignore`,
      `node_modules
cypress/videos
cypress/screenshots
cypress/downloads
# .env holds real secrets — never commit it
.env
`,
    );

    // ── README ──────────────────────────────────────────────────────────────────
    zip.file(
      `${root}/README.md`,
      generateCypressReadme(suite.name, testCases.length),
    );

    const zipBuffer = await zip.generateAsync({ type: "nodebuffer" });
    const fileName = `${root}.zip`;

    // Record export in suite metadata
    await supabase
      .from("suites")
      .update({
        last_export_at: new Date().toISOString(),
        export_count: (suite.export_count ?? 0) + 1,
      })
      .eq("id", suiteId);

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

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Safely encode a value for embedding inside a Cypress JS string.
 *
 * We use JSON.stringify() which handles ALL edge cases correctly:
 *   - Accented / non-ASCII chars: é ñ ô ü → kept as-is (valid in JS strings)
 *   - Single quotes inside single-quoted strings → no longer an issue
 *     because we emit double-quoted strings from JSON.stringify
 *   - Backslashes, newlines, carriage returns, null bytes → escaped
 *   - < > & characters → kept as-is (safe inside JS strings)
 *
 * Returns the value wrapped in double quotes, ready to drop into generated code.
 * e.g.  escapeForJs("O'Brien")  →  '"O\'Brien"'  ... actually just '"O'Brien"'
 *        escapeForJs("José")     →  '"José"'
 */
function escapeForJs(str: string): string {
  // JSON.stringify gives us a properly double-quoted, fully escaped JS string literal.
  // We return it as-is so call sites can use it directly: cy.type(${escapeForJs(val)})
  return JSON.stringify(String(str ?? ""));
}

/**
 * Prepare a CSS selector for safe embedding inside a template literal.
 *
 * CSS attribute selectors contain quoted values, e.g.:
 *   [data-testid="foo"]   or   input[name="email"]
 *
 * These inner quotes must be removed or replaced so they don't clash with
 * the surrounding JS string. The cleanest solution: strip quotes from simple
 * alphanumeric attribute values (valid unquoted CSS), and escape any remaining
 * quotes as needed. For complex values we escape single-quotes with \'.
 *
 * Examples:
 *   [data-testid="foo"]   → [data-testid=foo]       (unquoted, valid CSS)
 *   input[name="email"]   → input[name=email]
 *   [class="foo bar"]     → [class='foo bar']        (space needs quotes → escape)
 */
function escapeForCss(str: string): string {
  return (
    str
      .replace(/\\/g, "\\\\")
      // For attribute values that are simple identifiers (no spaces/special chars),
      // drop the quotes entirely — unquoted attribute selectors are valid CSS.
      .replace(/="([a-zA-Z0-9_-]+)"/g, "=$1")
      .replace(/='([a-zA-Z0-9_-]+)'/g, "=$1")
      // For anything remaining that still has double quotes, convert to escaped single
      .replace(/"/g, "\\'")
  );
}

/**
 * Detects "N characters" patterns in a step's action description and returns
 * a JS expression that generates that string rather than embedding it literally.
 *
 * Examples matched:
 *   "exactly 5001 characters"
 *   "a string of 256 characters"
 *   "exceeding 100-character limit"
 *
 * Returns null if no pattern found (use literal value instead).
 */
function detectGeneratedString(
  action: string,
  inputValue: string | undefined,
): string | null {
  // Match patterns like "exactly N characters", "N-character", "N chars"
  const exactMatch = action.match(/exactly\s+(\d+)\s+char/i);
  const genericMatch = action.match(/(\d+)[- ]char/i);
  const countMatch = action.match(/string of\s+(\d+)\s+char/i);

  const match = exactMatch ?? countMatch ?? genericMatch;
  if (!match) return null;

  const count = parseInt(match[1], 10);
  if (!Number.isFinite(count) || count <= 0 || count > 100_000) return null;

  // Try to figure out what character to repeat.
  // If the input_value already contains a repeated character pattern, use that.
  // Otherwise default to 'a'.
  let fillChar = "a";
  if (inputValue && inputValue.length > 0) {
    // If the value is mostly one char (e.g. "aaaaa...X"), use the dominant one
    const firstChar = inputValue[0];
    const dominated =
      inputValue.split("").filter((c) => c === firstChar).length >
      inputValue.length * 0.8;
    if (dominated) fillChar = firstChar.replace(/'/g, "\\'");
  }

  // Emit a JS expression: 'a'.repeat(5001)
  return `'${fillChar}'.repeat(${count})`;
}

// ============================================================================
// STEP CODE GENERATOR
// ============================================================================

/**
 * Converts Playwright :has-text() pseudo-selectors to valid Cypress equivalents.
 * Cypress uses jQuery/Sizzle which does not support :has-text().
 *
 * Handles two patterns:
 *
 * A) Single :has-text() selector:
 *   button:has-text('Save')   → { type: "contains", tag: "button", text: "Save" }
 *   :has-text('Generate')     → { type: "contains", tag: "*", text: "Generate" }
 *
 * B) Comma-separated list where some parts have :has-text():
 *   [data-testid=x], button:has-text('Save')
 *   → strips :has-text() parts, returns { type: "get", selector: "[data-testid=x]" }
 *   If ALL parts had :has-text(), uses the first as a contains() call.
 */
function convertHasText(
  sel: string,
):
  | { type: "get"; selector: string }
  | { type: "contains"; tag: string; text: string } {
  if (!sel.includes(":has-text(")) return { type: "get", selector: sel };

  const parts = sel.split(",").map((s) => s.trim());
  const cleanParts: string[] = [];
  let firstHasText: { tag: string; text: string } | null = null;

  for (const part of parts) {
    const m = part.match(/^([^:]*):has-text\(['"]?(.*?)['"]?\)/);
    if (m) {
      if (!firstHasText) firstHasText = { tag: m[1].trim() || "*", text: m[2] };
      // Drop :has-text() parts — Sizzle crashes on them
    } else {
      cleanParts.push(part);
    }
  }

  if (cleanParts.length > 0) {
    return { type: "get", selector: cleanParts.join(", ") };
  }

  if (firstHasText) {
    return { type: "contains", tag: firstHasText.tag, text: firstHasText.text };
  }

  return { type: "get", selector: sel };
}

function generateCypressStep(step: TestStep, idx: number): string {
  const lines: string[] = [];
  // Selectors go inside CSS  cy.get('...')  — use CSS escaping (single-quote safe)
  const sel = escapeForCss(step.selector || "");
  const rawVal = step.input_value || "";

  // Check if the action description implies we need to generate a long string
  const generatedVal = detectGeneratedString(step.action, rawVal);
  // escapeForJs() now returns a full double-quoted JS string literal, e.g. '"José"'
  // so valExpr is always a ready-to-use JS expression.
  const valExpr = generatedVal ?? escapeForJs(rawVal);

  if (step.action_type === "navigate") {
    // Strip the origin so cy.visit() uses the configured baseUrl.
    // cy.visit('/generate') is correct — a full URL ignores cypress baseUrl.
    const raw = rawVal || "/";
    let visitPath: string;
    if (raw.startsWith("http://") || raw.startsWith("https://")) {
      try {
        const parsed = new URL(raw);
        visitPath = parsed.pathname + parsed.search + parsed.hash;
      } catch {
        visitPath = raw;
      }
    } else {
      visitPath = raw.startsWith("/") ? raw : `/${raw}`;
    }
    lines.push(`cy.visit('${escapeForCss(visitPath)}');`);
  } else if (step.action_type === "click") {
    const clickSel = convertHasText(sel);
    if (clickSel.type === "contains") {
      const tag = clickSel.tag === "*" ? "" : clickSel.tag;
      lines.push(
        tag
          ? `cy.contains('${tag}', '${escapeForJs(clickSel.text).replace(/^"|"$/g, "")}').click();`
          : `cy.contains('${escapeForJs(clickSel.text).replace(/^"|"$/g, "")}').click();`,
      );
    } else {
      lines.push(`cy.get('${sel}').click();`);
    }
  } else if (step.action_type === "fill" || step.action_type === "type") {
    if (generatedVal) {
      // Generated long string (e.g. 'a'.repeat(5001)) — use invoke to avoid
      // cy.type() typing character-by-character which times out on large inputs.
      lines.push(
        `cy.get('${sel}').invoke('val', ${valExpr}).trigger('input').trigger('change');`,
      );
    } else if (rawVal.length > 200) {
      // Literal value is long — same problem applies, use invoke instead of type.
      lines.push(
        `cy.get('${sel}').invoke('val', ${valExpr}).trigger('input').trigger('change');`,
      );
    } else {
      lines.push(`cy.get('${sel}').clear().type(${valExpr});`);
    }
  } else if (step.action_type === "check") {
    lines.push(`cy.get('${sel}').check();`);
  } else if (step.action_type === "uncheck") {
    lines.push(`cy.get('${sel}').uncheck();`);
  } else if (step.action_type === "select") {
    lines.push(`cy.get('${sel}').select(${valExpr});`);
  } else if (step.action_type === "hover") {
    lines.push(`cy.get('${sel}').trigger('mouseover');`);
  } else if (step.action_type === "press") {
    lines.push(`cy.get('${sel}').type('{${escapeForCss(rawVal)}}');`);
  } else if (step.action_type === "wait") {
    if (step.selector) {
      const timeout =
        step.wait_time && step.wait_time > 0 ? step.wait_time : 10000;
      const waitSel = convertHasText(sel);
      if (waitSel.type === "contains") {
        const tag = waitSel.tag === "*" ? "" : waitSel.tag;
        lines.push(
          tag
            ? `cy.contains('${tag}', '${escapeForJs(waitSel.text).replace(/^"|"$/g, "")}', { timeout: ${timeout} }).should('be.visible');`
            : `cy.contains('${escapeForJs(waitSel.text).replace(/^"|"$/g, "")}', { timeout: ${timeout} }).should('be.visible');`,
        );
      } else {
        lines.push(
          `cy.get('${sel}', { timeout: ${timeout} }).should('be.visible');`,
        );
      }
    } else if (step.wait_time && step.wait_time > 0) {
      lines.push(
        `cy.wait(${step.wait_time}); // TODO: replace with a DOM assertion`,
      );
    }
  } else {
    lines.push(`// TODO: implement — ${escapeForJs(step.action)}`);
    lines.push(`// Expected: ${escapeForJs(step.expected || "")}`);
  }

  // Assertions
  if (step.assertion?.type) {
    // Selectors in CSS go through escapeForCss; values go through escapeForJs
    // which returns a complete double-quoted JS string literal ready to inline.
    const assertTarget = escapeForCss(
      step.assertion.target || step.selector || "",
    );
    const assertVal = escapeForJs(String(step.assertion.value ?? ""));
    const assertAttr = step.assertion.attribute
      ? escapeForJs(step.assertion.attribute)
      : '""';

    switch (step.assertion.type) {
      case "visible": {
        const visSel = convertHasText(assertTarget);
        if (visSel.type === "contains") {
          const tag = visSel.tag === "*" ? "" : visSel.tag;
          lines.push(
            tag
              ? `cy.contains('${tag}', '${escapeForJs(visSel.text).replace(/^"|"$/g, "")}').should('be.visible');`
              : `cy.contains('${escapeForJs(visSel.text).replace(/^"|"$/g, "")}').should('be.visible');`,
          );
        } else {
          lines.push(`cy.get('${assertTarget}').should('be.visible');`);
        }
        break;
      }
      case "hidden":
        lines.push(`cy.get('${assertTarget}').should('not.be.visible');`);
        break;
      case "text":
        // Use contain.text with the JS string literal from escapeForJs
        lines.push(
          `cy.get('${assertTarget}').should('contain.text', ${assertVal});`,
        );
        break;
      case "exact-text":
        lines.push(
          `cy.get('${assertTarget}').should('have.text', ${assertVal});`,
        );
        break;
      case "value":
        // For boundary tests where invoke('val', 'a'.repeat(N)) was used,
        // asserting have.value with empty string is always wrong.
        // Assert length instead when the fill used a generated string.
        if (generatedVal && String(step.assertion.value ?? "").length === 0) {
          const cm = step.action?.match(
            /exactly\s+(\d+)\s+char|(\d+)[- ]char|string of\s+(\d+)\s+char/i,
          );
          const count = cm ? parseInt(cm[1] || cm[2] || cm[3], 10) : null;
          if (count && Number.isFinite(count)) {
            lines.push(
              `cy.get('${assertTarget}').invoke('val').should('have.length', ${count});`,
            );
          } else {
            lines.push(
              `cy.get('${assertTarget}').invoke('val').should('not.be.empty');`,
            );
          }
        } else {
          lines.push(
            `cy.get('${assertTarget}').should('have.value', ${assertVal});`,
          );
        }
        break;
      case "url": {
        // Strip origin from URL assertions so they work across environments
        let urlVal = String(step.assertion.value ?? "");
        if (urlVal.startsWith("http://") || urlVal.startsWith("https://")) {
          try {
            urlVal = new URL(urlVal).pathname;
          } catch {}
        }
        lines.push(`cy.url().should('include', ${escapeForJs(urlVal)});`);
        break;
      }
      case "enabled":
        lines.push(`cy.get('${assertTarget}').should('be.enabled');`);
        break;
      case "disabled":
        lines.push(`cy.get('${assertTarget}').should('be.disabled');`);
        break;
      case "checked":
        lines.push(`cy.get('${assertTarget}').should('be.checked');`);
        break;
      case "count": {
        // count after a fill step = assert the field has N characters
        // count after other steps = assert N elements exist
        const countVal = parseInt(String(step.assertion.value ?? "0"), 10);
        if (
          (step.action_type === "fill" || step.action_type === "type") &&
          countVal > 0
        ) {
          lines.push(
            `cy.get('${assertTarget}').invoke('val').should('have.length', ${countVal});`,
          );
        } else if (countVal > 0) {
          lines.push(
            `cy.get('${assertTarget}').should('have.length', ${countVal});`,
          );
        }
        break;
      }
      case "attribute":
        if (step.assertion.attribute) {
          lines.push(
            `cy.get('${assertTarget}').should('have.attr', ${assertAttr}, ${assertVal});`,
          );
        }
        break;
    }
  }

  // Waits — only emit when no assertion is present.
  // Use cy.wait() sparingly; it's a last resort when there's truly nothing to
  // assert on. A commented hint is left so the developer can replace it.
  if (step.wait_time && step.wait_time > 0 && !step.assertion) {
    const ms = step.wait_time;
    lines.push(
      `cy.wait(${ms}); // TODO: replace with a DOM assertion for reliability`,
    );
  }

  return `    // Step ${idx + 1}: ${escapeForJs(step.action)}\n    ${lines.join("\n    ")}`;
}

// ============================================================================
// TEST FILE GENERATOR
// ============================================================================

const AUTH_TEST_KEYWORDS = [
  "login",
  "log in",
  "sign in",
  "sign-in",
  "register",
  "sign up",
  "sign-up",
  "forgot password",
  "reset password",
  "logout",
  "log out",
  "sign out",
];

/**
 * A test "needs auth" when its title doesn't look like an auth flow itself,
 * but its steps include navigating to protected pages or doing post-login actions.
 * Title-keyword detection alone is too blunt — e.g. "Dashboard loads after login"
 * should run authenticated, not be skipped because it contains the word "login".
 *
 * Strategy:
 *  - If the title IS an auth flow (login/register/logout) → unauthenticated
 *  - If the title contains "after login", "when logged in", etc. → authenticated
 *  - Otherwise → authenticated (safer default; a fresh session rarely breaks tests)
 */
function testNeedsAuth(testCase: any): boolean {
  const title = (testCase.title ?? "").toLowerCase();
  const preconditions = (testCase.preconditions ?? "").toLowerCase();
  const steps: any[] = Array.isArray(testCase.test_steps)
    ? testCase.test_steps
    : [];

  // 1. Explicit precondition — most reliable signal
  if (preconditions) {
    if (
      preconditions.includes("logged in") ||
      preconditions.includes("authenticated") ||
      preconditions.includes("signed in") ||
      preconditions.includes("valid session") ||
      preconditions.includes("user is on the")
    )
      return true;

    if (
      preconditions.includes("not logged in") ||
      preconditions.includes("unauthenticated") ||
      preconditions.includes("not signed in") ||
      preconditions.includes("logged out")
    )
      return false;
  }

  // 2. Pure auth-flow title — test IS the login/register/logout flow
  const isPureAuthFlow = AUTH_TEST_KEYWORDS.some((kw) => {
    const idx = title.indexOf(kw);
    if (idx === -1) return false;
    const before = title.slice(0, idx).trim();
    return before === "" || before.endsWith(",") || before.endsWith(":");
  });
  if (isPureAuthFlow) return false;

  // 3. Unauthenticated intent signals in title
  if (
    title.includes("without login") ||
    title.includes("unauthenticated") ||
    title.includes("not logged in") ||
    title.includes("prevent access") ||
    title.includes("unauthorized") ||
    title.includes("as a guest")
  )
    return false;

  // 4. First navigate step path
  const firstNav = steps.find((s: any) => s.action_type === "navigate");
  if (firstNav) {
    const path = (firstNav.input_value ?? "").toLowerCase();
    const isPublicRoute =
      path === "/" ||
      path === "/login" ||
      path === "/signin" ||
      path === "/register" ||
      path === "/signup" ||
      path === "/forgot-password" ||
      path === "/reset-password" ||
      path.startsWith("/login") ||
      path.startsWith("/register");
    if (isPublicRoute) return false;
    if (path && path !== "/") return true;
  }

  // 5. Default — assume auth required
  return true;
}

function generateCypressTest(testCase: any, steps: TestStep[]): string {
  const needsAuth = testNeedsAuth(testCase);

  // Remove URL assertions that immediately follow a cy.visit() — they're
  // redundant (Cypress waits for page load) and break when BASE_URL changes.
  const cleanedSteps = steps.filter((step, idx) => {
    if (
      step.assertion?.type === "url" &&
      idx > 0 &&
      steps[idx - 1]?.action_type === "navigate"
    ) {
      return false; // drop redundant post-navigate URL assertion
    }
    return true;
  });

  const stepsCode = cleanedSteps
    .map((step, idx) => generateCypressStep(step, idx))
    .join("\n\n");

  // Auth is read from synthqa.config.ts at runtime — users edit that file,
  // not the spec. The beforeEach checks the config and skips login if not needed.
  const authBlock = `
  beforeEach(() => {
    const config = (window as any).__synthqaConfig?.["${testCase.id}"];
    const requiresAuth = config?.requires_auth ?? ${needsAuth};
    if (requiresAuth) cy.login();
  });
`;

  const afterBlock = `
  afterEach(function () {
    // Capture a screenshot on failure for easier debugging
    if (this.currentTest?.state === 'failed') {
      cy.screenshot(this.currentTest.fullTitle().replace(/\s+/g, '-'));
    }
  });
`;

  return `describe('${escapeForJs(testCase.title)}', () => {${authBlock}${afterBlock}
  it('${testCase.id}', () => {
${stepsCode}
  });
});
`;
}

// ============================================================================
// README
// ============================================================================

/**
 * Generates synthqa.config.ts for Cypress — single file users edit
 * to control which specs run authenticated vs unauthenticated.
 */
function generateCypressAuthConfig(
  testCases: Array<{ id: string; title: string; needsAuth: boolean }>,
): string {
  const entries = testCases
    .map((tc) =>
      [
        `  // ${tc.title}`,
        `  "${tc.id}": { requires_auth: ${tc.needsAuth} },`,
      ].join("\n"),
    )
    .join("\n\n");

  return `// synthqa.config.ts
//
// Controls whether each test runs with an authenticated session.
//
//   requires_auth: true  → beforeEach runs cy.login() before the test
//   requires_auth: false → test starts with no session (for login/register flows)
//
// HOW TO UPDATE:
//   Change the value for any test case below and re-run — no rebuild needed.
//
// COMMON PATTERNS:
//   Login / register / logout tests  → false  (they test the auth flow itself)
//   Tests on protected pages         → true   (dashboard, settings, profile)
//   Tests on public pages            → false  (homepage, pricing, docs)

export const testConfig: Record<string, { requires_auth: boolean }> = {
${entries}
};
`;
}

function generateCypressReadme(suiteName: string, caseCount: number): string {
  return `# ${suiteName} — Cypress Tests

Generated by SynthQA

## Quick Start

\`\`\`bash
# 1. Install dependencies
npm install
# or: pnpm install

# 2. Configure environment
cp .env.example .env
# Edit .env — set BASE_URL, your credentials, and verify SYNTHQA_API_KEY

# 3. Run tests headless
npm test

# 4. Run tests in headed mode (useful for debugging)
npm run test:headed

# 5. Open Cypress interactive runner
npm run open
\`\`\`

## Configuration

All runtime configuration lives in \`.env\` — **do not commit this file**.

| Variable | Description |
|---|---|
| \`BASE_URL\` | URL of the application under test |
| \`USER_EMAIL\` | Email used for login in auth tests |
| \`USER_PASSWORD\` | Password used for login in auth tests |
| \`SYNTHQA_API_KEY\` | Pre-filled from your SynthQA account |
| \`SYNTHQA_WEBHOOK_URL\` | Pre-filled — sends results back to SynthQA |
| \`SYNTHQA_SUITE_ID\` | Pre-filled — identifies this suite |

> \`SYNTHQA_API_KEY\` is pre-populated from your account. If it is blank,
> generate one in **Settings → API Keys** and paste it into \`.env\`.

## Test Cases

- **Total**: ${caseCount}
- **Location**: \`cypress/e2e/\`

## CI/CD

\`\`\`yaml
- name: Run Cypress tests
  env:
    BASE_URL: \${{ secrets.BASE_URL }}
    USER_EMAIL: \${{ secrets.USER_EMAIL }}
    USER_PASSWORD: \${{ secrets.USER_PASSWORD }}
    SYNTHQA_API_KEY: \${{ secrets.SYNTHQA_API_KEY }}
    SYNTHQA_WEBHOOK_URL: \${{ secrets.SYNTHQA_WEBHOOK_URL }}
    SYNTHQA_SUITE_ID: \${{ secrets.SYNTHQA_SUITE_ID }}
  run: npm test
\`\`\`
`;
}
