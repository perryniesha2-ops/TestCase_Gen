// app/api/automation/export/cypress/route.ts
import { NextResponse } from "next/server";
import JSZip from "jszip";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

type TestStep = {
  step_number?: number;
  action: string;
  expected: string;
  selector?: string;
  action_type?: string;
  input_value?: string;
  wait_time?: number;
  assertion?: any;
};

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
    baseUrl: process.env.BASE_URL || '${suite.base_url || "https://app.example.com"}',
    setupNodeEvents(on, config) {
      // implement node event listeners here
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
      `BASE_URL=https://app.example.com
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

    // ✅ FIX: Convert Buffer to Uint8Array
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

function generateCypressTest(testCase: any, steps: TestStep[]): string {
  const stepsCode = steps
    .map((step, idx) => {
      const lines: string[] = [];

      if (step.action_type === "navigate") {
        // ✅ FIX: Handle full URLs vs relative paths
        const url = step.input_value || "/";
        const isFullUrl =
          url.startsWith("http://") || url.startsWith("https://");

        if (isFullUrl) {
          // Use full URL as-is
          lines.push(`cy.visit('${url}');`);
        } else {
          // Relative path - Cypress handles baseUrl automatically
          const path = url.startsWith("/") ? url : `/${url}`;
          lines.push(`cy.visit('${path}');`);
        }
      } else if (step.action_type === "click") {
        lines.push(`cy.get('${step.selector}').click();`);
      } else if (step.action_type === "fill" || step.action_type === "type") {
        lines.push(
          `cy.get('${step.selector}').type('${step.input_value || ""}');`,
        );
      } else if (step.action_type === "check") {
        lines.push(`cy.get('${step.selector}').check();`);
      } else if (step.action_type === "select") {
        lines.push(`cy.get('${step.selector}').select('${step.input_value}');`);
      } else {
        lines.push(`// TODO: ${step.action}`);
      }

      if (step.assertion?.type === "visible") {
        lines.push(
          `cy.get('${step.assertion.target || step.selector}').should('be.visible');`,
        );
      } else if (step.assertion?.type === "text") {
        lines.push(
          `cy.get('${step.assertion.target || step.selector}').should('contain', '${step.assertion.value}');`,
        );
      } else if (step.assertion?.type === "url") {
        lines.push(`cy.url().should('include', '${step.assertion.value}');`);
      }

      if (step.wait_time) {
        lines.push(`cy.wait(${step.wait_time});`);
      }

      return `    // Step ${idx + 1}: ${step.action}\n    ${lines.join("\n    ")}`;
    })
    .join("\n\n");

  return `describe('${testCase.title}', () => {
  beforeEach(() => {
    cy.visit('/');
  });

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
