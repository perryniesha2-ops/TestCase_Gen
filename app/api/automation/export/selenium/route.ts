// app/api/automation/export/selenium/route.ts
import { NextResponse } from "next/server";
import JSZip from "jszip";
import { createClient } from "@/lib/supabase/server";
// All generator functions are inlined below — no lib dependency needed.

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

/**
 * Normalise a CSS selector for safe embedding inside a Java double-quoted string.
 * Converts [attr="value"] → [attr='value'] so inner attribute quotes don't
 * break the surrounding Java string delimiter.
 */
function normaliseSel(sel: string): string {
  return sel.replace(/="([^"]*)"/g, "='$1'");
}

function escapeJava(str: string): string {
  return str
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "\\r");
}

function extractLoginSelectors(loginTest: any): {
  emailField: string;
  passwordField: string;
  submitButton: string;
  postLoginUrl: string;
} {
  if (!loginTest || !Array.isArray(loginTest.test_steps)) {
    return {
      // Use single quotes inside — safe in Java double-quoted strings
      emailField: "input[name='email']",
      passwordField: "input[name='password']",
      submitButton: "button[type='submit']",
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
    emailField: normaliseSel(emailStep?.selector || "input[name='email']"),
    passwordField: normaliseSel(
      passwordStep?.selector || "input[name='password']",
    ),
    submitButton: normaliseSel(submitStep?.selector || "button[type='submit']"),
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
      // Normalise selector — single quotes inside, safe in Java double-quoted strings
      const sel = normaliseSel(step.selector || "");

      // ── Navigation ──────────────────────────────────────────────────────────
      if (step.action_type === "navigate") {
        const url = step.input_value || "/";
        let path: string;

        if (url.startsWith("http://") || url.startsWith("https://")) {
          try {
            // Strip origin — baseUrl already contains it.
            // Keeping the full URL hardcodes the environment and breaks staging/prod.
            const urlObj = new URL(url);
            path = urlObj.pathname + urlObj.search + urlObj.hash;
          } catch {
            path = url;
          }
        } else {
          path = url.startsWith("/") ? url : `/${url}`;
        }

        lines.push(`driver.get(baseUrl + "${escapeJava(path)}");`);
        // Only emit the auto URL assertion if the step doesn't already have
        // a url assertion — avoids the duplicate assertion on every navigate step.
        if (!step.assertion || step.assertion.type !== "url") {
          lines.push(
            `Assert.assertTrue(driver.getCurrentUrl().contains("${escapeJava(path)}"), "URL should contain: ${escapeJava(path)}");`,
          );
        }
      }
      // ── Click ───────────────────────────────────────────────────────────────
      else if (step.action_type === "click") {
        if (sel.includes(":has-text(")) {
          // :has-text() is Cypress/Playwright only — Selenium needs XPath
          const m = sel.match(/^([a-zA-Z]*)\s*:has-text\(['"](.+?)['"]\)/);
          if (m) {
            const tag = m[1] || "*";
            // XPath string literals use single quotes inside the Java double-quoted string
            const text = escapeJava(m[2]);
            lines.push(
              `driver.findElement(By.xpath("//${tag}[normalize-space()='${text}']")).click();`,
            );
          } else {
            const fallback = normaliseSel(
              sel.replace(/:has-text\([^)]*\)/g, "").trim(),
            );
            lines.push(
              `driver.findElement(By.cssSelector("${fallback}")).click();`,
            );
          }
        } else {
          lines.push(`driver.findElement(By.cssSelector("${sel}")).click();`);
        }
      }
      // ── Fill / Type ─────────────────────────────────────────────────────────
      else if (step.action_type === "fill" || step.action_type === "type") {
        // Only substitute env credentials when the SELECTOR identifies the field
        // as an email/password input — not when the typed value happens to mention
        // "email" in text (e.g. typing a requirements sentence about email flows).
        const isEmailField = sel.includes("email") || sel.includes("username");

        const isPasswordField = sel.includes("password");

        const isNegativeTest =
          step.input_value?.toLowerCase().includes("wrong") ||
          step.input_value?.toLowerCase().includes("incorrect") ||
          step.input_value?.toLowerCase().includes("invalid") ||
          step.expected?.toLowerCase().includes("fail") ||
          step.expected?.toLowerCase().includes("error") ||
          step.action?.toLowerCase().includes("incorrect") ||
          step.action?.toLowerCase().includes("invalid");

        // Long string detection — sendKeys is too slow for thousands of chars
        const longMatch = step.action?.match(
          /exactly\s+(\d+)\s+char|(\d+)[- ]char|string of\s+(\d+)\s+char/i,
        );
        const longCount = longMatch
          ? parseInt(longMatch[1] || longMatch[2] || longMatch[3], 10)
          : 0;

        if (longCount > 0 && Number.isFinite(longCount)) {
          // Use JS executor — much faster than sendKeys for large strings
          lines.push(
            `((org.openqa.selenium.JavascriptExecutor) driver)`,
            `    .executeScript("arguments[0].value = 'a'.repeat(${longCount});",`,
            `        driver.findElement(By.cssSelector("${sel}")));`,
          );
        } else if (isEmailField && !isNegativeTest) {
          // EnvLoader reads .env into System properties — use getProperty() to access them.
          // The property name matches the key in .env (USER_EMAIL / USER_PASSWORD).
          lines.push(
            `driver.findElement(By.cssSelector("${sel}")).sendKeys(`,
            `    EnvLoader.get("TEST_USER_EMAIL", "${escapeJava(step.input_value || "test@example.com")}"));`,
          );
        } else if (isPasswordField && !isNegativeTest) {
          lines.push(
            `driver.findElement(By.cssSelector("${sel}")).sendKeys(`,
            `    EnvLoader.get("TEST_USER_PASSWORD", "${escapeJava(step.input_value || "password123")}"));`,
          );
        } else {
          lines.push(
            `driver.findElement(By.cssSelector("${sel}")).sendKeys("${escapeJava(step.input_value || "")}");`,
          );
        }
      }
      // ── Checkbox ────────────────────────────────────────────────────────────
      else if (step.action_type === "check") {
        lines.push(`driver.findElement(By.cssSelector("${sel}")).click();`);
      }
      // ── Select dropdown ─────────────────────────────────────────────────────
      else if (step.action_type === "select") {
        lines.push(
          `new Select(driver.findElement(By.cssSelector("${sel}"))).selectByVisibleText("${escapeJava(step.input_value || "")}");`,
        );
      }
      // ── Wait ────────────────────────────────────────────────────────────────
      else if (step.action_type === "wait") {
        // Wait for element to be visible — use explicit wait, not Thread.sleep
        const timeout =
          step.wait_time && step.wait_time > 0 ? step.wait_time : 10000;
        if (sel) {
          lines.push(
            `new org.openqa.selenium.support.ui.WebDriverWait(driver, java.time.Duration.ofMillis(${timeout}))`,
            `    .until(org.openqa.selenium.support.ui.ExpectedConditions.visibilityOfElementLocated(By.cssSelector("${sel}")));`,
          );
        } else if (step.wait_time && step.wait_time > 0) {
          lines.push(
            `Thread.sleep(${step.wait_time}); // TODO: replace with an explicit wait`,
          );
        }
      }
      // ── Unknown / missing action_type ──────────────────────────────────────
      // When action_type is not set, emit what we can from the available data.
      // A selector + assertion alone is still useful (verify the element exists).
      else if (step.selector) {
        lines.push(`// TODO: implement action — ${escapeJava(step.action)}`);
        lines.push(`// Selector available: ${escapeJava(step.selector)}`);
        // Still emit the assertion below if present — at minimum verifies element exists
      } else {
        lines.push(`// TODO: implement — ${escapeJava(step.action)}`);
        lines.push(`// Expected: ${escapeJava(step.expected || "")}`);
      }

      // ── Assertions ──────────────────────────────────────────────────────────
      if (step.assertion?.type) {
        const assertTarget = normaliseSel(
          step.assertion.target || step.selector || "",
        );
        const assertVal = escapeJava(String(step.assertion.value ?? ""));

        switch (step.assertion.type) {
          case "visible": {
            // :has-text() is not valid CSS for Selenium — convert to XPath text match
            if (assertTarget.includes(":has-text(")) {
              const m = assertTarget.match(
                /^([a-zA-Z]*)\s*:has-text\(['"](.+?)['"]\)/,
              );
              if (m) {
                const tag = m[1] || "*";
                const txt = escapeJava(m[2]);
                lines.push(
                  `Assert.assertTrue(driver.findElement(By.xpath("//${tag}[contains(text(), \"${txt}\")]")).isDisplayed(), "Element should be visible");`,
                );
              } else {
                lines.push(
                  `// TODO: unsupported selector — ${escapeJava(assertTarget)}`,
                );
              }
            } else {
              lines.push(
                `Assert.assertTrue(driver.findElement(By.cssSelector("${assertTarget}")).isDisplayed(), "Element should be visible");`,
              );
            }
            break;
          }
          case "hidden":
            lines.push(
              `Assert.assertFalse(driver.findElement(By.cssSelector("${assertTarget}")).isDisplayed(), "Element should be hidden");`,
            );
            break;
          case "text":
            lines.push(
              `Assert.assertTrue(driver.findElement(By.cssSelector("${assertTarget}")).getText().contains("${assertVal}"), "Element should contain: ${assertVal}");`,
            );
            break;
          case "exact-text":
            lines.push(
              `Assert.assertEquals(driver.findElement(By.cssSelector("${assertTarget}")).getText(), "${assertVal}", "Text mismatch");`,
            );
            break;
          case "value":
            lines.push(
              // getDomProperty reads the current field value (live DOM property),
              // getAttribute reads the static HTML attribute — always use getDomProperty for inputs.
              `Assert.assertEquals(driver.findElement(By.cssSelector("${assertTarget}")).getDomProperty("value"), "${assertVal}", "Value mismatch");`,
            );
            break;
          case "url": {
            // Strip origin so assertion works across environments
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
              `Assert.assertTrue(driver.getCurrentUrl().contains("${escapeJava(urlPath)}"), "URL should contain: ${escapeJava(urlPath)}");`,
            );
            break;
          }
          case "enabled":
            lines.push(
              `Assert.assertTrue(driver.findElement(By.cssSelector("${assertTarget}")).isEnabled(), "Element should be enabled");`,
            );
            break;
          case "disabled":
            lines.push(
              `Assert.assertFalse(driver.findElement(By.cssSelector("${assertTarget}")).isEnabled(), "Element should be disabled");`,
            );
            break;
          case "checked":
            lines.push(
              `Assert.assertTrue(driver.findElement(By.cssSelector("${assertTarget}")).isSelected(), "Element should be checked");`,
            );
            break;
        }
      }

      // ── Wait ────────────────────────────────────────────────────────────────
      if (step.wait_time) {
        lines.push(`Thread.sleep(${step.wait_time});`);
      }

      return `        // Step ${idx + 1}: ${escapeJava(step.action)}\n        ${lines.join("\n        ")}`;
    })
    .join("\n\n");

  const baseClass = needsAuth ? "AuthenticatedBaseTest" : "BaseTest";
  const authNote = needsAuth
    ? "// Auth: logs in before running (extends AuthenticatedBaseTest)."
    : `// Auth: runs without login (extends BaseTest).\n// If this page requires authentication, change the line below to:\n//   public class ${className}Test extends AuthenticatedBaseTest {`;

  return `package com.synthqa;

import org.openqa.selenium.By;
import org.openqa.selenium.WebElement;
import org.openqa.selenium.support.ui.Select;
import org.testng.Assert;
import org.testng.annotations.Test;

// ── Auth Setup ───────────────────────────────────────────────────────────────
${authNote}
// ─────────────────────────────────────────────────────────────────────────────
public class ${className} extends ${baseClass} {

    @Test(description = "${testCase.id}")
    public void test${className}() throws InterruptedException {
${stepsCode}
    }
}
`;
}

// ============================================================================
// INLINE AUTHENTICATED BASE TEST
// Replaces the lib version which uses System.getProperty("TEST_USER_EMAIL")
// with a hardcoded fallback. Now uses EnvLoader.get() which reads .env directly.
// ============================================================================

function buildAuthenticatedBaseTest(loginSelectors: {
  emailField: string;
  passwordField: string;
  submitButton: string;
  postLoginUrl: string;
}): string {
  const { emailField, passwordField, submitButton, postLoginUrl } =
    loginSelectors;
  return `package com.synthqa;

import org.openqa.selenium.By;
import org.openqa.selenium.WebElement;
import org.openqa.selenium.support.ui.WebDriverWait;
import org.openqa.selenium.support.ui.ExpectedConditions;
import org.testng.annotations.BeforeClass;
import java.time.Duration;

/**
 * Base class for tests that require authentication.
 * Reads credentials from .env via EnvLoader — update TEST_USER_EMAIL and
 * TEST_USER_PASSWORD in .env, then re-run. No code changes needed.
 */
public class AuthenticatedBaseTest extends BaseTest {

    protected String testUserEmail;
    protected String testUserPassword;

    @BeforeClass
    public void authenticateUser() {
        super.setUpOnce();
        loadCredentials();
        performLogin();
    }

    private void loadCredentials() {
        // EnvLoader reads directly from .env file — no System.getProperty needed
        testUserEmail    = EnvLoader.get("TEST_USER_EMAIL");
        testUserPassword = EnvLoader.get("TEST_USER_PASSWORD");

        if (testUserEmail == null || testUserEmail.isBlank()) {
            throw new RuntimeException(
                "TEST_USER_EMAIL not set in .env — " +
                "open .env and set it to your test account email"
            );
        }
        if (testUserPassword == null || testUserPassword.isBlank()) {
            throw new RuntimeException(
                "TEST_USER_PASSWORD not set in .env — " +
                "open .env and set it to your test account password"
            );
        }

        System.out.println("🔐 Using test credentials: " + testUserEmail);
    }

    private void performLogin() {
        try {
            System.out.println("🔐 Performing login...");
            driver.get(baseUrl + "/login");

            WebDriverWait wait = new WebDriverWait(driver, Duration.ofSeconds(15));

            WebElement emailField = wait.until(
                ExpectedConditions.elementToBeClickable(
                    By.cssSelector("${emailField}")
                )
            );
            emailField.clear();
            emailField.sendKeys(testUserEmail);

            WebElement passwordField = wait.until(
                ExpectedConditions.elementToBeClickable(
                    By.cssSelector("${passwordField}")
                )
            );
            passwordField.clear();
            passwordField.sendKeys(testUserPassword);

            WebElement submitButton = wait.until(
                ExpectedConditions.elementToBeClickable(
                    By.cssSelector("${submitButton}")
                )
            );
            submitButton.click();

            wait.until(ExpectedConditions.urlContains("${postLoginUrl}"));

            System.out.println("✅ Login successful! URL: " + driver.getCurrentUrl());

        } catch (Exception e) {
            System.err.println("❌ Login failed: " + e.getMessage());
            System.err.println("   Verify TEST_USER_EMAIL / TEST_USER_PASSWORD in .env");
            System.err.println("   Verify login selectors match your application");
            throw new RuntimeException("Authentication failed", e);
        }
    }
}
`;
}

// ============================================================================
// INLINE ENV LOADER
// Replaces the lib's generateEnvLoader() which has a brittle quote-stripping
// regex that corrupts values on Windows (CRLF line endings) and doesn't expose
// a get() method for use in test steps.
// ============================================================================

function buildEnvLoader(): string {
  return `package com.synthqa;

import java.io.BufferedReader;
import java.io.FileReader;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.HashMap;
import java.util.Map;

/**
 * Loads .env file variables and makes them available via get() and System properties.
 *
 * Handles:
 *   - Unquoted values:  KEY=value
 *   - Single-quoted:    KEY='value'
 *   - Double-quoted:    KEY="value"
 *   - Windows line endings (CRLF)
 *   - Comments (#) and blank lines
 */
public class EnvLoader {

    private static final Map<String, String> envVars = new HashMap<>();
    private static boolean loaded = false;

    static {
        loadEnvFile();
    }

    private static void loadEnvFile() {
        if (loaded) return;
        Path envPath = Paths.get(System.getProperty("user.dir", "."), ".env");

        if (!Files.exists(envPath)) {
            System.out.println("⚠️  No .env file found at: " + envPath.toAbsolutePath());
            loaded = true;
            return;
        }

        try (BufferedReader reader = new BufferedReader(new FileReader(envPath.toFile()))) {
            String line;
            int count = 0;

            while ((line = reader.readLine()) != null) {
                // Strip Windows carriage return (char 13) if present.
                // Using (char)13 avoids escape sequence issues in the code generator.
                line = line.replace(String.valueOf((char) 13), "").trim();

                // Skip blank lines and comments
                if (line.isEmpty() || line.startsWith("#")) continue;

                int eq = line.indexOf('=');
                if (eq <= 0) continue;

                String key   = line.substring(0, eq).trim();
                String value = line.substring(eq + 1).trim();

                // Strip surrounding quotes — handles both " and '.
                // Uses (char)39 for single-quote to avoid any escaping issues
                // in the code generator that produces this file.
                if (value.length() >= 2) {
                    char first = value.charAt(0);
                    char last  = value.charAt(value.length() - 1);
                    char sq = (char) 39; // single quote: '
                    if ((first == '"' && last == '"') ||
                        (first == sq  && last == sq)) {
                        value = value.substring(1, value.length() - 1);
                    }
                }

                if (!key.isEmpty()) {
                    envVars.put(key, value);
                    // Also set as system property so legacy System.getProperty() calls work
                    System.setProperty(key, value);
                    count++;
                }
            }

            System.out.println("✅ Loaded " + count + " environment variables from " + envPath.toAbsolutePath());

        } catch (IOException e) {
            System.err.println("⚠️  Error reading .env file: " + e.getMessage());
        }

        loaded = true;
    }

    /**
     * Called automatically via static block — public for backward compatibility.
     */
    public static void load() {
        // Loading already happened in static block
    }

    /**
     * Get a value by key, with fallback.
     * Priority: .env file → System.getProperty → System.getenv → defaultValue
     */
    public static String get(String key, String defaultValue) {
        String value = envVars.get(key);
        if (value != null && !value.isBlank()) return value;
        value = System.getProperty(key);
        if (value != null && !value.isBlank()) return value;
        value = System.getenv(key);
        if (value != null && !value.isBlank()) return value;
        return defaultValue;
    }

    public static String get(String key) {
        return get(key, null);
    }
}
`;
}

// ============================================================================
// INLINED LIB FUNCTIONS
// Everything below replaces @/lib/exports/web/selenium so the route is
// fully self-contained with no external lib dependency.
// ============================================================================

function buildBaseTest(baseUrl: string): string {
  return `package com.synthqa;

import org.openqa.selenium.WebDriver;
import org.openqa.selenium.chrome.ChromeDriver;
import org.openqa.selenium.chrome.ChromeOptions;
import org.testng.annotations.AfterClass;
import org.testng.annotations.BeforeClass;
import io.github.bonigarcia.wdm.WebDriverManager;

import java.time.Duration;

public class BaseTest {
    protected WebDriver driver;
    protected String baseUrl;

    static {
        EnvLoader.load();
    }

    @BeforeClass
    public void setUpOnce() {
        baseUrl = EnvLoader.get("BASE_URL", "${baseUrl}");

        WebDriverManager.chromedriver().setup();

        ChromeOptions options = new ChromeOptions();
        options.addArguments("--start-maximized");
        options.addArguments("--disable-blink-features=AutomationControlled");
        options.addArguments("--disable-dev-shm-usage");
        options.addArguments("--no-sandbox");

        driver = new ChromeDriver(options);
        driver.manage().timeouts().implicitlyWait(Duration.ofSeconds(10));
        driver.manage().timeouts().pageLoadTimeout(Duration.ofSeconds(30));

        System.out.println("\u2705 WebDriver initialized");
        System.out.println("\uD83C\uDF10 Base URL: " + baseUrl);
    }

    @AfterClass
    public void tearDownOnce() {
        if (driver != null) {
            driver.quit();
            System.out.println("\u2705 WebDriver closed");
        }
    }
}
`;
}

function buildPomXml(): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0
         http://maven.apache.org/xsd/maven-4.0.0.xsd">
    <modelVersion>4.0.0</modelVersion>
    <groupId>com.synthqa</groupId>
    <artifactId>selenium-tests</artifactId>
    <version>1.0-SNAPSHOT</version>
    <packaging>jar</packaging>
    <name>SynthQA Selenium Tests</name>

    <properties>
        <maven.compiler.source>17</maven.compiler.source>
        <maven.compiler.target>17</maven.compiler.target>
        <project.build.sourceEncoding>UTF-8</project.build.sourceEncoding>
        <selenium.version>4.16.1</selenium.version>
        <testng.version>7.8.0</testng.version>
    </properties>

    <dependencies>
        <dependency>
            <groupId>org.seleniumhq.selenium</groupId>
            <artifactId>selenium-java</artifactId>
            <version>\${selenium.version}</version>
        </dependency>
        <dependency>
            <groupId>org.testng</groupId>
            <artifactId>testng</artifactId>
            <version>\${testng.version}</version>
            <scope>test</scope>
        </dependency>
        <dependency>
            <groupId>io.github.bonigarcia</groupId>
            <artifactId>webdrivermanager</artifactId>
            <version>5.6.3</version>
        </dependency>
        <dependency>
            <groupId>com.google.code.gson</groupId>
            <artifactId>gson</artifactId>
            <version>2.10.1</version>
        </dependency>
    </dependencies>

    <build>
        <plugins>
            <plugin>
                <groupId>org.apache.maven.plugins</groupId>
                <artifactId>maven-compiler-plugin</artifactId>
                <version>3.11.0</version>
                <configuration>
                    <source>17</source>
                    <target>17</target>
                </configuration>
            </plugin>
            <plugin>
                <groupId>org.apache.maven.plugins</groupId>
                <artifactId>maven-surefire-plugin</artifactId>
                <version>3.2.3</version>
                <configuration>
                    <suiteXmlFiles>
                        <suiteXmlFile>testng.xml</suiteXmlFile>
                    </suiteXmlFiles>
                </configuration>
            </plugin>
        </plugins>
    </build>
</project>
`;
}

function buildTestNGXml(suiteName: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE suite SYSTEM "https://testng.org/testng-1.0.dtd">
<suite name="${suiteName}">
    <listeners>
        <listener class-name="com.synthqa.SynthQAReporter"/>
        <listener class-name="com.synthqa.GlobalCleanupListener"/>
    </listeners>
    <test name="${suiteName} Tests">
        <packages>
            <package name="com.synthqa"/>
        </packages>
    </test>
</suite>
`;
}

function buildDotEnv(
  baseUrl: string,
  credentials: { email: string; password: string },
  suiteId: string,
  webhookUrl: string,
  apiKey?: string | null,
): string {
  return `# ============================================================================
# Application Configuration
# ============================================================================
BASE_URL=${baseUrl}

# ============================================================================
# Test User Credentials — update with your actual test account
# ============================================================================
TEST_USER_EMAIL=${credentials.email}
TEST_USER_PASSWORD=${credentials.password}

# ============================================================================
# SynthQA Integration
# ============================================================================
SYNTHQA_WEBHOOK_URL=${webhookUrl}
SYNTHQA_API_KEY=${apiKey || ""}
SYNTHQA_SUITE_ID=${suiteId}

# ============================================================================
# Test Environment
# ============================================================================
TEST_ENVIRONMENT=local
BROWSER=chrome
`;
}

function buildDotEnvExample(webhookUrl: string): string {
  return `# Copy this file to .env and fill in your values
BASE_URL=https://app.example.com
TEST_USER_EMAIL=test@example.com
TEST_USER_PASSWORD=yourpassword
SYNTHQA_WEBHOOK_URL=${webhookUrl}
SYNTHQA_API_KEY=
SYNTHQA_SUITE_ID=your-suite-id
TEST_ENVIRONMENT=local
BROWSER=chrome
`;
}

function buildGitignore(): string {
  return `target/
test-output/
.idea/
*.iml
.vscode/
.env
.DS_Store
Thumbs.db
*.log
`;
}

function buildReadme(
  suiteName: string,
  caseCount: number,
  suiteId: string,
): string {
  return `# ${suiteName} — Selenium Tests

Generated by SynthQA

## Quick Start

\`\`\`bash
# 1. Install dependencies
mvn clean install

# 2. Configure environment
cp .env.example .env
# Edit .env — set BASE_URL, TEST_USER_EMAIL, TEST_USER_PASSWORD
# SYNTHQA_API_KEY is pre-filled from your account

# 3. Run all tests
mvn test

# 4. Run a single test
mvn test -Dtest=MyTestClassName
\`\`\`

## Test Cases

- **Total**: ${caseCount}
- **Results**: https://www.synthqa.app/automation/suites/${suiteId}

## Auth Configuration

Edit \`synthqa.config.properties\` to control which tests run authenticated:

\`\`\`properties
MyTestClassNameTest.requires_auth=true   # logs in before running
LoginTest.requires_auth=false            # runs without a session
\`\`\`

## CI/CD

\`\`\`yaml
- name: Run Selenium tests
  run: mvn test
  env:
    BASE_URL: \${{ secrets.BASE_URL }}
    TEST_USER_EMAIL: \${{ secrets.TEST_USER_EMAIL }}
    TEST_USER_PASSWORD: \${{ secrets.TEST_USER_PASSWORD }}
    SYNTHQA_API_KEY: \${{ secrets.SYNTHQA_API_KEY }}
    SYNTHQA_WEBHOOK_URL: \${{ secrets.SYNTHQA_WEBHOOK_URL }}
    SYNTHQA_SUITE_ID: ${suiteId}
\`\`\`
`;
}

function buildGlobalCleanupListener(): string {
  return `package com.synthqa;

import org.testng.IExecutionListener;

public class GlobalCleanupListener implements IExecutionListener {

    @Override
    public void onExecutionStart() {
        System.out.println("\uD83D\uDE80 Test execution starting...");
        killOrphanedProcesses();
    }

    @Override
    public void onExecutionFinish() {
        System.out.println("\uD83C\uDFC1 Test execution finished - cleaning up...");
        killOrphanedProcesses();
    }

    private void killOrphanedProcesses() {
        try {
            String os = System.getProperty("os.name").toLowerCase();
            if (os.contains("win")) {
                Runtime.getRuntime().exec("taskkill /F /IM chromedriver.exe");
                Runtime.getRuntime().exec("taskkill /F /IM chrome.exe");
            } else if (os.contains("mac")) {
                Runtime.getRuntime().exec("pkill -9 chromedriver");
            } else {
                Runtime.getRuntime().exec("pkill -9 chromedriver");
                Runtime.getRuntime().exec("pkill -9 chrome");
            }
            System.out.println("\u2705 Cleaned up browser processes");
        } catch (Exception ignored) {}
    }
}
`;
}

function buildSeleniumReporter(): string {
  return `package com.synthqa;

import org.testng.*;
import com.google.gson.Gson;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.time.Instant;
import java.util.*;

public class SynthQAReporter implements ITestListener, ISuiteListener {

    private String webhookUrl;
    private String apiKey;
    private String suiteId;

    private final HttpClient httpClient = HttpClient.newBuilder()
        .connectTimeout(Duration.ofSeconds(10))
        .build();
    private final Gson gson = new Gson();
    private String sessionId;
    private final List<Map<String, Object>> testResults = new ArrayList<>();

    @Override
    public void onStart(ISuite suite) {
        this.webhookUrl = EnvLoader.get("SYNTHQA_WEBHOOK_URL");
        this.apiKey     = EnvLoader.get("SYNTHQA_API_KEY");
        this.suiteId    = EnvLoader.get("SYNTHQA_SUITE_ID");
        this.sessionId  = "run-" + System.currentTimeMillis();

        System.out.println("\n\u2554\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2557");
        if (webhookUrl != null && !webhookUrl.isEmpty()) {
            System.out.println("\u2551          SynthQA Test Reporting - ENABLED                      \u2551");
        } else {
            System.out.println("\u2551          SynthQA Test Reporting - DISABLED                     \u2551");
            System.out.println("\u255A\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u255D");
            System.out.println("\u26A0\uFE0F  SYNTHQA_WEBHOOK_URL not set - results will not sync");
            System.out.println("   To enable: set SYNTHQA_WEBHOOK_URL and SYNTHQA_API_KEY in .env");
        }
        System.out.println();
    }

    @Override
    public void onTestStart(ITestResult result) {
        System.out.println("\u25B6\uFE0F  Starting: " + result.getMethod().getMethodName());
    }

    @Override
    public void onTestSuccess(ITestResult result) { recordResult(result, "passed", null); }

    @Override
    public void onTestFailure(ITestResult result) {
        recordResult(result, "failed",
            result.getThrowable() != null ? result.getThrowable().getMessage() : "Test failed");
    }

    @Override
    public void onTestSkipped(ITestResult result) { recordResult(result, "skipped", "Test was skipped"); }

    @Override
    public void onFinish(ISuite suite) {
        if (webhookUrl == null || webhookUrl.isEmpty()) {
            System.out.println("\n\u23ED\uFE0F  Skipping result upload (SYNTHQA_WEBHOOK_URL not set)");
            printSummary();
            return;
        }

        long passed  = testResults.stream().filter(r -> "passed".equals(r.get("execution_status"))).count();
        long failed  = testResults.stream().filter(r -> "failed".equals(r.get("execution_status"))).count();
        long skipped = testResults.stream().filter(r -> "skipped".equals(r.get("execution_status"))).count();

        Map<String, Object> payload = new HashMap<>();
        payload.put("suite_id", suiteId);
        payload.put("session_id", sessionId);
        payload.put("framework", "selenium");
        payload.put("test_results", testResults);

        Map<String, Object> meta = new HashMap<>();
        meta.put("total_tests", testResults.size());
        meta.put("passed_tests", passed);
        meta.put("failed_tests", failed);
        meta.put("skipped_tests", skipped);
        meta.put("overall_status", failed > 0 ? "failed" : "passed");
        payload.put("metadata", meta);

        try {
            System.out.println("\n\uD83D\uDCE4 Sending test results to SynthQA...");
            HttpRequest req = HttpRequest.newBuilder()
                .uri(URI.create(webhookUrl))
                .header("Content-Type", "application/json")
                .header("Authorization", "Bearer " + (apiKey != null ? apiKey : ""))
                .timeout(Duration.ofSeconds(15))
                .POST(HttpRequest.BodyPublishers.ofString(gson.toJson(payload)))
                .build();

            HttpResponse<String> res = httpClient.send(req, HttpResponse.BodyHandlers.ofString());

            if (res.statusCode() >= 200 && res.statusCode() < 300) {
                System.out.println("\u2705 Test results synced to SynthQA (" + testResults.size() + " tests)");
            } else {
                System.err.println("\u274C Failed to send results: " + res.statusCode() + " — " + res.body());
            }
        } catch (IOException | InterruptedException e) {
            System.err.println("\u274C Error sending results: " + e.getMessage());
        }

        printSummary();
    }

    private void recordResult(ITestResult result, String status, String reason) {
        long duration = result.getEndMillis() - result.getStartMillis();

        Map<String, Object> r = new HashMap<>();
        r.put("test_case_id",     extractId(result));
        r.put("execution_status", status);
        r.put("started_at",       Instant.ofEpochMilli(result.getStartMillis()).toString());
        r.put("completed_at",     Instant.ofEpochMilli(result.getEndMillis()).toString());
        r.put("duration_minutes", Math.max(duration / 60000.0, 0.01));
        r.put("failure_reason",   reason);
        r.put("stack_trace",      result.getThrowable() != null ? stackTrace(result.getThrowable()) : null);
        r.put("browser",          EnvLoader.get("BROWSER", "chrome"));
        r.put("os_version",       System.getProperty("os.name"));
        r.put("test_environment", EnvLoader.get("TEST_ENVIRONMENT", "local"));
        r.put("framework",        "selenium");
        testResults.add(r);

        String icon = "passed".equals(status) ? "\u2705" : "failed".equals(status) ? "\u274C" : "\u23ED\uFE0F";
        System.out.println(icon + " " + status.toUpperCase() + ": " +
            result.getMethod().getMethodName() + " (" + fmt(duration) + ")");
        if (webhookUrl != null && !webhookUrl.isEmpty()) {
            System.out.println("   \u2514\u2500 \u2705 Reported to SynthQA");
        }
    }

    private String extractId(ITestResult result) {
        String d = result.getMethod().getDescription();
        return (d != null && d.matches("^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$")) ? d : null;
    }

    private String stackTrace(Throwable t) {
        StringBuilder sb = new StringBuilder(t.toString()).append("\n");
        for (int i = 0; i < Math.min(5, t.getStackTrace().length); i++) {
            sb.append("  at ").append(t.getStackTrace()[i]).append("\n");
        }
        return sb.toString();
    }

    private void printSummary() {
        long passed  = testResults.stream().filter(r -> "passed".equals(r.get("execution_status"))).count();
        long failed  = testResults.stream().filter(r -> "failed".equals(r.get("execution_status"))).count();
        long skipped = testResults.stream().filter(r -> "skipped".equals(r.get("execution_status"))).count();
        double rate  = testResults.isEmpty() ? 0 : passed * 100.0 / testResults.size();

        System.out.println("\n\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550");
        System.out.println("\uD83D\uDCCA Test Run Summary");
        System.out.println("\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550");
        System.out.println("Total:   " + testResults.size());
        System.out.println("Passed:  " + passed  + " \u2705");
        System.out.println("Failed:  " + failed  + " \u274C");
        System.out.println("Skipped: " + skipped + " \u23ED\uFE0F");
        System.out.println("Pass Rate: " + String.format("%.2f%%", rate));
        System.out.println("\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\n");
    }

    private String fmt(long ms) {
        long s = ms / 1000;
        return s < 60 ? s + "s" : (s / 60) + "m " + (s % 60) + "s";
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
      suite.automation_framework !== "selenium" &&
      suite.automation_status === "ready"
    ) {
      console.warn(
        `[export/selenium] Suite ${suiteId} was enhanced for ${suite.automation_framework} — selectors may not be optimised for Selenium`,
      );
    }

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

    const loginTest = detectLoginTest(testCases);
    const credentials = extractCredentials(loginTest);
    const loginSelectors = extractLoginSelectors(loginTest);

    const zip = new JSZip();
    const root = `selenium-${suite.name.toLowerCase().replace(/\s+/g, "-")}-${suite.id.slice(0, 8)}`;

    zip.file(`${root}/pom.xml`, buildPomXml());

    zip.file(
      `${root}/src/test/java/com/synthqa/BaseTest.java`,
      buildBaseTest(suite.base_url),
    );

    zip.file(
      `${root}/src/test/java/com/synthqa/AuthenticatedBaseTest.java`,
      buildAuthenticatedBaseTest(loginSelectors),
    );

    zip.file(
      `${root}/src/test/java/com/synthqa/EnvLoader.java`,
      buildEnvLoader(),
    );

    zip.file(
      `${root}/src/test/java/com/synthqa/SynthQAReporter.java`,
      buildSeleniumReporter(),
    );

    zip.file(
      `${root}/src/test/java/com/synthqa/GlobalCleanupListener.java`,
      buildGlobalCleanupListener(),
    );

    zip.file(
      `${root}/.env`,
      buildDotEnv(
        suite.base_url,
        credentials,
        suiteId,
        webhookUrl,
        profile?.api_key,
      ),
    );

    zip.file(`${root}/.env.example`, buildDotEnvExample(webhookUrl));

    zip.file(`${root}/testng.xml`, buildTestNGXml(suite.name));

    zip.file(`${root}/.gitignore`, buildGitignore());

    zip.file(
      `${root}/README.md`,
      buildReadme(suite.name, testCases.length, suiteId),
    );

    // Generate test classes
    testCases.forEach((tc: any) => {
      const steps = Array.isArray(tc.test_steps) ? tc.test_steps : [];

      // PascalCase class name — avoids the all-lowercase collision issue
      // "Export generated test cases" → "ExportGeneratedTestCases"
      const className = (() => {
        const pascal = tc.title
          .split(/[^a-zA-Z0-9]+/)
          .filter(Boolean)
          .map(
            (w: string) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase(),
          )
          .join("");
        return /^\d/.test(pascal) ? `TC${pascal}` : pascal;
      })();

      const needsAuth = needsAuthentication(tc);

      const testCode = generateSeleniumTest(
        className,
        tc,
        steps,
        needsAuth,
        suiteId,
      );
      zip.file(
        `${root}/src/test/java/com/synthqa/${className}Test.java`,
        testCode,
      );
    });

    const zipBuffer = await zip.generateAsync({ type: "nodebuffer" });
    const fileName = `${root}.zip`;

    // Record export in suite metadata
    await supabase
      .from("suites")
      .update({
        last_export_at: new Date().toISOString(),
        export_count: ((suite as any).export_count ?? 0) + 1,
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
    console.error("Selenium export error:", error);
    return NextResponse.json({ error: "Export failed" }, { status: 500 });
  }
}
