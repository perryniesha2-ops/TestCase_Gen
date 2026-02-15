// app/api/automation/export/selenium/route.ts
import { NextResponse } from "next/server";
import JSZip from "jszip";
import { createClient } from "@/lib/supabase/server";
import {
  generateSeleniumReporter,
  generateBaseTest,
  generateAuthenticatedBaseTest,
  generateEnvLoader,
  generatePomXml,
  generateTestNGXml,
  generateDotEnv,
  generateDotEnvExample,
  generateGitignore,
  generateReadme,
  generateGlobalCleanupListener,
} from "@/lib/exports/web/selenium";

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

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function detectLoginTest(testCases: any[]): any | null {
  return testCases.find((tc) => {
    const title = tc.title.toLowerCase();
    return (
      (title.includes("login") || title.includes("sign in")) &&
      !title.includes("prevent") &&
      !title.includes("without")
    );
  });
}

function extractCredentials(loginTest: any): {
  email: string;
  password: string;
} {
  if (!loginTest || !Array.isArray(loginTest.test_steps)) {
    return { email: "test@example.com", password: "password123" };
  }

  const steps = loginTest.test_steps;

  const emailStep = steps.find(
    (s: any) =>
      s.input_value?.includes("@") || s.action?.toLowerCase().includes("email"),
  );

  const passwordStep = steps.find(
    (s: any) => s.action?.toLowerCase().includes("password") && s.input_value,
  );

  return {
    email: emailStep?.input_value || "test@example.com",
    password: passwordStep?.input_value || "password123",
  };
}

function extractLoginSelectors(loginTest: any): {
  emailField: string;
  passwordField: string;
  submitButton: string;
  postLoginUrl: string;
} {
  if (!loginTest || !Array.isArray(loginTest.test_steps)) {
    return {
      emailField: 'input[name="email"]',
      passwordField: 'input[name="password"]',
      submitButton: 'button[type="submit"]',
      postLoginUrl: "/dashboard",
    };
  }

  const steps = loginTest.test_steps;

  const emailStep = steps.find(
    (s: any) =>
      s.input_value?.includes("@") || s.action?.toLowerCase().includes("email"),
  );

  const passwordStep = steps.find((s: any) =>
    s.action?.toLowerCase().includes("password"),
  );

  const submitStep = steps.find(
    (s: any) =>
      s.action_type === "click" &&
      (s.action?.toLowerCase().includes("submit") ||
        s.action?.toLowerCase().includes("login") ||
        s.action?.toLowerCase().includes("sign in")),
  );

  const urlAssertion = steps.find((s: any) => s.assertion?.type === "url");

  return {
    emailField: emailStep?.selector || 'input[name="email"]',
    passwordField: passwordStep?.selector || 'input[name="password"]',
    submitButton: submitStep?.selector || 'button[type="submit"]',
    postLoginUrl: urlAssertion?.assertion?.value || "/dashboard",
  };
}

function needsAuthentication(testCase: any): boolean {
  const title = testCase.title.toLowerCase();

  if (
    title.includes("login") ||
    title.includes("sign in") ||
    title.includes("sign up") ||
    title.includes("authentication") ||
    title.includes("register")
  ) {
    return false;
  }
  if (
    title.includes("without login") ||
    title.includes("prevent access") ||
    title.includes("require login") ||
    title.includes("unauthorized")
  ) {
    return false;
  }

  if (!Array.isArray(testCase.test_steps)) {
    return false;
  }

  const firstSteps = testCase.test_steps.slice(0, 4);
  const hasLoginSteps = firstSteps.some((step: any) => {
    const action = step.action?.toLowerCase() || "";
    return (
      action.includes("email") ||
      action.includes("password") ||
      step.input_value?.includes("@")
    );
  });

  return hasLoginSteps;
}

function generateSeleniumTest(
  className: string,
  testCase: any,
  steps: TestStep[],
  needsAuth: boolean,
  suiteId: string,
): string {
  let processedSteps = steps;

  if (needsAuth) {
    const firstNonLoginStepIndex = steps.findIndex((step) => {
      const action = step.action?.toLowerCase() || "";
      const isNavigateToLogin =
        step.action_type === "navigate" &&
        step.input_value?.toLowerCase().includes("login");

      const isLoginField =
        action.includes("email") ||
        action.includes("password") ||
        step.input_value?.includes("@");

      const isLoginButton =
        action.includes("sign in") ||
        action.includes("login") ||
        (step.action_type === "click" && action.includes("submit"));

      return !isNavigateToLogin && !isLoginField && !isLoginButton;
    });

    if (firstNonLoginStepIndex > 0) {
      processedSteps = steps.slice(firstNonLoginStepIndex);
    }
  }

  const hasNavigationStep = processedSteps.some(
    (step) => step.action_type === "navigate",
  );

  if (!hasNavigationStep && processedSteps.length > 0) {
    const defaultUrl = needsAuth ? "/dashboard" : "/login";

    processedSteps = [
      {
        action: "Navigate to page",
        action_type: "navigate",
        input_value: defaultUrl,
        expected: "Page loads",
      } as TestStep,
      ...processedSteps,
    ];
  }

  const stepsCode = processedSteps
    .map((step, idx) => {
      const lines: string[] = [];

      // ============================================================
      // NAVIGATION
      // ============================================================
      if (step.action_type === "navigate") {
        const url = step.input_value || "/";

        if (url.startsWith("http://") || url.startsWith("https://")) {
          try {
            const urlObj = new URL(url);
            const path = urlObj.pathname + urlObj.search + urlObj.hash;
            lines.push(`driver.get(baseUrl + "${path}");`);
          } catch {
            lines.push(`driver.get(baseUrl + "${url}");`);
          }
        } else {
          const path = url.startsWith("/") ? url : `/${url}`;
          lines.push(`driver.get(baseUrl + "${path}");`);
        }
      }
      // ============================================================
      // CLICK
      // ============================================================
      else if (step.action_type === "click") {
        lines.push(
          `driver.findElement(By.cssSelector("${step.selector}")).click();`,
        );
      }
      // ============================================================
      // FILL / TYPE (EMAIL & PASSWORD HANDLING)
      // ============================================================
      else if (step.action_type === "fill" || step.action_type === "type") {
        const isEmailField =
          step.selector?.includes("email") ||
          step.action?.toLowerCase().includes("email") ||
          step.input_value?.includes("@");

        const isPasswordField =
          step.selector?.includes("password") ||
          step.action?.toLowerCase().includes("password");

        // ✅ Check if this is a NEGATIVE test (testing failures)
        const isNegativeTest =
          step.input_value?.toLowerCase().includes("wrong") ||
          step.input_value?.toLowerCase().includes("incorrect") ||
          step.input_value?.toLowerCase().includes("invalid") ||
          step.expected?.toLowerCase().includes("fail") ||
          step.expected?.toLowerCase().includes("error") ||
          step.action?.toLowerCase().includes("incorrect") ||
          step.action?.toLowerCase().includes("invalid");

        if (isEmailField) {
          // For email, check if it's intentionally invalid
          if (isNegativeTest || !step.input_value?.includes("@")) {
            // Use the hardcoded invalid email
            lines.push(
              `driver.findElement(By.cssSelector("${step.selector}")).sendKeys("${step.input_value || "invalid-email"}");`,
            );
          } else {
            // Use environment variable for valid email
            lines.push(
              `driver.findElement(By.cssSelector("${step.selector}")).sendKeys(System.getProperty("${step.input_value || "test@example.com"}"));`,
            );
          }
        } else if (isPasswordField) {
          // For password, check if it's intentionally wrong
          if (isNegativeTest) {
            // ✅ Use the hardcoded WRONG password for negative tests
            lines.push(
              `driver.findElement(By.cssSelector("${step.selector}")).sendKeys("${step.input_value || "WrongPassword123!"}");`,
            );
          } else {
            // Use environment variable for correct password
            lines.push(
              `driver.findElement(By.cssSelector("${step.selector}")).sendKeys(System.getProperty("TEST_USER_PASSWORD", "${step.input_value || "password123"}"));`,
            );
          }
        } else {
          // Regular input - use hardcoded value
          lines.push(
            `driver.findElement(By.cssSelector("${step.selector}")).sendKeys("${step.input_value || ""}");`,
          );
        }
      }
      // ============================================================
      // CHECKBOX
      // ============================================================
      else if (step.action_type === "check") {
        lines.push(
          `driver.findElement(By.cssSelector("${step.selector}")).click();`,
        );
      }
      // ============================================================
      // SELECT DROPDOWN
      // ============================================================
      else if (step.action_type === "select") {
        lines.push(
          `new Select(driver.findElement(By.cssSelector("${step.selector}"))).selectByVisibleText("${step.input_value}");`,
        );
      }
      // ============================================================
      // UNKNOWN ACTION
      // ============================================================
      else {
        lines.push(`// TODO: ${step.action}`);
      }

      // ============================================================
      // ASSERTIONS
      // ============================================================
      if (step.assertion?.type === "visible") {
        lines.push(
          `Assert.assertTrue(driver.findElement(By.cssSelector("${step.assertion.target || step.selector}")).isDisplayed());`,
        );
      } else if (step.assertion?.type === "text") {
        lines.push(
          `Assert.assertTrue(driver.findElement(By.cssSelector("${step.assertion.target || step.selector}")).getText().contains("${step.assertion.value}"));`,
        );
      } else if (step.assertion?.type === "url") {
        lines.push(
          `Assert.assertTrue(driver.getCurrentUrl().contains("${step.assertion.value}"));`,
        );
      }

      // ============================================================
      // WAIT TIME
      // ============================================================
      if (step.wait_time) {
        lines.push(`Thread.sleep(${step.wait_time});`);
      }

      return `        // Step ${idx + 1}: ${step.action}\n        ${lines.join("\n        ")}`;
    })
    .join("\n\n");

  const baseClass = needsAuth ? "AuthenticatedBaseTest" : "BaseTest";

  return `package com.synthqa;

import org.openqa.selenium.By;
import org.openqa.selenium.support.ui.Select;
import org.testng.Assert;
import org.testng.annotations.Test;

public class ${className} extends ${baseClass} {

    @Test(description = "${testCase.id}")
    public void test${className}() throws InterruptedException {
${stepsCode}
    }
}
`;
}

// ============================================================================
// MAIN EXPORT HANDLER
// ============================================================================

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

    // ✅ Get webhook URL
    const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL || "https://app.synthqa.com"}/api/automation/webhook/results`;

    // ✅ Get user's API key if they have one
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("api_key")
      .eq("id", user.id)
      .single();

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

    // Detect login test and extract credentials
    const loginTest = detectLoginTest(testCases);
    const credentials = extractCredentials(loginTest);
    const loginSelectors = extractLoginSelectors(loginTest);

    const zip = new JSZip();
    const root = `selenium-${suite.name.toLowerCase().replace(/\s+/g, "-")}-${suite.id.slice(0, 8)}`;

    // ✅ Generate all files using library functions
    zip.file(`${root}/pom.xml`, generatePomXml());

    zip.file(
      `${root}/src/test/java/com/synthqa/BaseTest.java`,
      generateBaseTest(suite.base_url || "http://localhost:3000"),
    );

    zip.file(
      `${root}/src/test/java/com/synthqa/AuthenticatedBaseTest.java`,
      generateAuthenticatedBaseTest(loginSelectors, credentials),
    );

    zip.file(
      `${root}/src/test/java/com/synthqa/EnvLoader.java`,
      generateEnvLoader(),
    );

    zip.file(
      `${root}/src/test/java/com/synthqa/SynthQAReporter.java`,
      generateSeleniumReporter(),
    );

    zip.file(
      `${root}/src/test/java/com/synthqa/GlobalCleanupListener.java`,
      generateGlobalCleanupListener(),
    );

    // ✅ Generate .env with SYNTHQA variables
    zip.file(
      `${root}/.env`,
      generateDotEnv(
        suite.base_url || "http://localhost:3000",
        credentials,
        suiteId,
        webhookUrl,
        profile?.api_key,
      ),
    );

    zip.file(`${root}/.env.example`, generateDotEnvExample(webhookUrl));

    zip.file(`${root}/testng.xml`, generateTestNGXml(suite.name));

    zip.file(`${root}/.gitignore`, generateGitignore());

    zip.file(
      `${root}/README.md`,
      generateReadme(suite.name, testCases.length, suiteId),
    );

    // Generate test classes
    testCases.forEach((tc: any) => {
      const steps = Array.isArray(tc.test_steps) ? tc.test_steps : [];
      const className = tc.title.replace(/[^a-zA-Z0-9]/g, "") + "Test";
      const needsAuth = needsAuthentication(tc);

      const testCode = generateSeleniumTest(
        className,
        tc,
        steps,
        needsAuth,
        suiteId,
      );
      zip.file(`${root}/src/test/java/com/synthqa/${className}.java`, testCode);
    });

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
    console.error("Selenium export error:", error);
    return NextResponse.json({ error: "Export failed" }, { status: 500 });
  }
}
