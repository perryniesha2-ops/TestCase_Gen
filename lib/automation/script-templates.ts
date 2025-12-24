// lib/automation/script-templates.ts

/**
 * Playwright Script Templates and Utilities
 * Provides reusable patterns for generating Playwright automation scripts
 */

export interface TestStep {
  step_number: number
  action: string
  expected: string
  data?: string
}

export interface PlaywrightScriptConfig {
  testName: string
  baseUrl?: string
  timeout?: number
  slowMo?: number
  headless?: boolean
}

// Common Playwright action patterns
export const PLAYWRIGHT_PATTERNS = {
  // Navigation
  navigate: (url: string) => `await page.goto('${url}');`,
  
  // Clicks
  click: (selector: string) => `await page.click('${selector}');`,
  clickByText: (text: string) => `await page.getByText('${text}').click();`,
  clickByRole: (role: string, name: string) => `await page.getByRole('${role}', { name: '${name}' }).click();`,
  
  // Input
  fill: (selector: string, value: string) => `await page.fill('${selector}', '${value}');`,
  fillByLabel: (label: string, value: string) => `await page.getByLabel('${label}').fill('${value}');`,
  fillByPlaceholder: (placeholder: string, value: string) => `await page.getByPlaceholder('${placeholder}').fill('${value}');`,
  
  // Selection
  select: (selector: string, value: string) => `await page.selectOption('${selector}', '${value}');`,
  check: (selector: string) => `await page.check('${selector}');`,
  uncheck: (selector: string) => `await page.uncheck('${selector}');`,
  
  // Assertions
  expectVisible: (selector: string) => `await expect(page.locator('${selector}')).toBeVisible();`,
  expectText: (selector: string, text: string) => `await expect(page.locator('${selector}')).toContainText('${text}');`,
  expectValue: (selector: string, value: string) => `await expect(page.locator('${selector}')).toHaveValue('${value}');`,
  expectUrl: (url: string) => `await expect(page).toHaveURL('${url}');`,
  expectTitle: (title: string) => `await expect(page).toHaveTitle('${title}');`,
  
  // Waits
  waitForSelector: (selector: string) => `await page.waitForSelector('${selector}');`,
  waitForTimeout: (ms: number) => `await page.waitForTimeout(${ms});`,
  waitForUrl: (url: string) => `await page.waitForURL('${url}');`,
  
  // Screenshots
  screenshot: (name: string) => `await page.screenshot({ path: 'screenshots/${name}.png' });`,
  screenshotFullPage: (name: string) => `await page.screenshot({ path: 'screenshots/${name}.png', fullPage: true });`,
  
  // Keyboard
  press: (key: string) => `await page.keyboard.press('${key}');`,
  type: (text: string) => `await page.keyboard.type('${text}');`,
  
  // Mouse
  hover: (selector: string) => `await page.hover('${selector}');`,
  
  // Upload
  upload: (selector: string, filePath: string) => `await page.setInputFiles('${selector}', '${filePath}');`,
}

// Action keywords mapping
export const ACTION_KEYWORDS = {
  // Navigation
  navigate: ['navigate', 'go to', 'open', 'visit', 'load'],
  
  // Clicks
  click: ['click', 'press', 'tap', 'select'],
  
  // Input
  fill: ['enter', 'type', 'input', 'fill', 'write'],
  
  // Checkbox/Radio
  check: ['check', 'select checkbox', 'tick'],
  uncheck: ['uncheck', 'unselect', 'untick'],
  
  // Dropdown
  select: ['select from', 'choose from', 'pick from'],
  
  // Upload
  upload: ['upload', 'attach', 'choose file'],
  
  // Wait
  wait: ['wait for', 'pause', 'delay'],
  
  // Verify/Assert
  verify: ['verify', 'check that', 'ensure', 'confirm', 'validate', 'should see', 'should show'],
}

/**
 * Generate base Playwright test template
 */
export function generateBaseTemplate(config: PlaywrightScriptConfig): string {
  const { testName, baseUrl = '', timeout = 30000, headless = true } = config

  return `import { test, expect } from '@playwright/test';

test.describe('${testName}', () => {
  test.beforeEach(async ({ page }) => {
    // Set timeout
    test.setTimeout(${timeout});
    
    ${baseUrl ? `// Navigate to base URL\n    await page.goto('${baseUrl}');\n` : ''}
  });

  test('${testName}', async ({ page }) => {
    // Test steps will be inserted here
  });
});
`
}

/**
 * Generate script with test steps
 */
export function generateScriptWithSteps(
  config: PlaywrightScriptConfig,
  steps: TestStep[]
): string {
  const { testName, baseUrl = '', timeout = 30000 } = config

  const stepCode = steps.map((step, index) => {
    const stepComment = `// Step ${step.step_number}: ${step.action}`
    const stepImplementation = generateStepCode(step)
    const assertion = generateAssertion(step.expected)
    
    return `
    ${stepComment}
    ${stepImplementation}
    
    // Expected: ${step.expected}
    ${assertion}
    `
  }).join('\n')

  return `import { test, expect } from '@playwright/test';

test.describe('${testName}', () => {
  test.beforeEach(async ({ page }) => {
    test.setTimeout(${timeout});
    ${baseUrl ? `await page.goto('${baseUrl}');\n` : ''}
  });

  test('${testName}', async ({ page }) => {
${stepCode}
  });
});
`
}

/**
 * Generate code for a single test step
 */
function generateStepCode(step: TestStep): string {
  const action = step.action.toLowerCase()
  
  // Navigate
  if (ACTION_KEYWORDS.navigate.some(kw => action.includes(kw))) {
    const urlMatch = action.match(/(?:to|url)\s+['"]?([^'"]+)['"]?/)
    if (urlMatch) {
      return PLAYWRIGHT_PATTERNS.navigate(urlMatch[1])
    }
  }
  
  // Click
  if (ACTION_KEYWORDS.click.some(kw => action.includes(kw))) {
    const buttonMatch = action.match(/button|link|element/i)
    if (buttonMatch) {
      const textMatch = action.match(/['"]([^'"]+)['"]/)
      if (textMatch) {
        return PLAYWRIGHT_PATTERNS.clickByText(textMatch[1])
      }
    }
    // Generic click with selector placeholder
    return `await page.click('[data-testid="element"]'); // TODO: Update selector`
  }
  
  // Fill/Type
  if (ACTION_KEYWORDS.fill.some(kw => action.includes(kw))) {
    const fieldMatch = action.match(/(?:in|into|to)\s+['"]?([^'"]+)['"]?/)
    const valueMatch = action.match(/with|as\s+['"]?([^'"]+)['"]?/)
    
    if (fieldMatch && valueMatch) {
      return PLAYWRIGHT_PATTERNS.fillByLabel(fieldMatch[1], valueMatch[1])
    } else if (fieldMatch) {
      return PLAYWRIGHT_PATTERNS.fillByLabel(fieldMatch[1], step.data || 'test-value')
    }
    return `await page.fill('[name="field"]', 'value'); // TODO: Update selector and value`
  }
  
  // Check/Uncheck
  if (ACTION_KEYWORDS.check.some(kw => action.includes(kw))) {
    const checkboxMatch = action.match(/['"]([^'"]+)['"]/)
    if (checkboxMatch) {
      return PLAYWRIGHT_PATTERNS.check(`[aria-label="${checkboxMatch[1]}"]`)
    }
    return PLAYWRIGHT_PATTERNS.check('[type="checkbox"]')
  }
  
  if (ACTION_KEYWORDS.uncheck.some(kw => action.includes(kw))) {
    return PLAYWRIGHT_PATTERNS.uncheck('[type="checkbox"]')
  }
  
  // Select
  if (ACTION_KEYWORDS.select.some(kw => action.includes(kw))) {
    const valueMatch = action.match(/['"]([^'"]+)['"]/)
    if (valueMatch) {
      return PLAYWRIGHT_PATTERNS.select('select', valueMatch[1])
    }
    return `await page.selectOption('select', 'option-value'); // TODO: Update selector`
  }
  
  // Upload
  if (ACTION_KEYWORDS.upload.some(kw => action.includes(kw))) {
    return PLAYWRIGHT_PATTERNS.upload('[type="file"]', 'path/to/file.pdf')
  }
  
  // Wait
  if (ACTION_KEYWORDS.wait.some(kw => action.includes(kw))) {
    const timeMatch = action.match(/(\d+)\s*(second|sec|ms|millisecond)/i)
    if (timeMatch) {
      const time = timeMatch[2].startsWith('sec') 
        ? parseInt(timeMatch[1]) * 1000 
        : parseInt(timeMatch[1])
      return PLAYWRIGHT_PATTERNS.waitForTimeout(time)
    }
    return PLAYWRIGHT_PATTERNS.waitForTimeout(2000)
  }
  
  // Generic action - add comment
  return `// TODO: Implement action: ${step.action}`
}

/**
 * Generate assertion from expected result
 */
function generateAssertion(expected: string): string {
  const expectedLower = expected.toLowerCase()
  
  // Visible/Display checks
  if (expectedLower.includes('visible') || expectedLower.includes('display') || expectedLower.includes('shown')) {
    const elementMatch = expected.match(/['"]([^'"]+)['"]/)
    if (elementMatch) {
      return PLAYWRIGHT_PATTERNS.expectVisible(`text=${elementMatch[1]}`)
    }
    return `await expect(page.locator('[data-testid="element"]')).toBeVisible(); // TODO: Update selector`
  }
  
  // Text/Content checks
  if (expectedLower.includes('text') || expectedLower.includes('message') || expectedLower.includes('shows')) {
    const textMatch = expected.match(/['"]([^'"]+)['"]/)
    if (textMatch) {
      return `await expect(page.locator('body')).toContainText('${textMatch[1]}');`
    }
  }
  
  // URL checks
  if (expectedLower.includes('url') || expectedLower.includes('redirect') || expectedLower.includes('navigate')) {
    const urlMatch = expected.match(/(?:to|url)\s+['"]?([^'"]+)['"]?/)
    if (urlMatch) {
      return PLAYWRIGHT_PATTERNS.expectUrl(urlMatch[1])
    }
  }
  
  // Title checks
  if (expectedLower.includes('title')) {
    const titleMatch = expected.match(/['"]([^'"]+)['"]/)
    if (titleMatch) {
      return PLAYWRIGHT_PATTERNS.expectTitle(titleMatch[1])
    }
  }
  
  // Success/Error states
  if (expectedLower.includes('success')) {
    return `await expect(page.locator('[role="alert"]')).toContainText('success');`
  }
  
  if (expectedLower.includes('error')) {
    return `await expect(page.locator('[role="alert"]')).toContainText('error');`
  }
  
  // Generic assertion
  return `// TODO: Verify - ${expected}`
}

/**
 * Generate Playwright config file
 */
export function generatePlaywrightConfig(): string {
  return `import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],
});
`
}

/**
 * Validate generated script
 */
export function validateScript(script: string): { valid: boolean; errors: string[] } {
  const errors: string[] = []
  
  // Check for required imports
  if (!script.includes("import { test, expect } from '@playwright/test'")) {
    errors.push("Missing required Playwright imports")
  }
  
  // Check for test structure
  if (!script.includes('test(') && !script.includes('test.describe(')) {
    errors.push("Missing test structure")
  }
  
  // Check for page parameter
  if (!script.includes('async ({ page })')) {
    errors.push("Missing page fixture")
  }
  
  // Warning for TODO comments
  const todoCount = (script.match(/TODO:/g) || []).length
  if (todoCount > 0) {
    errors.push(`Script contains ${todoCount} TODO item(s) that need manual review`)
  }
  
  return {
    valid: errors.length === 0 || (errors.length === 1 && errors[0].includes('TODO')),
    errors
  }
}

/**
 * Format script with proper indentation
 */
export function formatScript(script: string): string {
  // Basic formatting - in production, use prettier
  return script
    .split('\n')
    .map(line => line.trimEnd())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n') // Remove excessive blank lines
}

/**
 * Extract test metadata from script
 */
export function extractMetadata(script: string): {
  testName: string | null
  stepCount: number
  hasBaseUrl: boolean
  timeout: number | null
} {
  const testNameMatch = script.match(/test\(['"]([^'"]+)['"]/)
  const stepCount = (script.match(/\/\/ Step \d+:/g) || []).length
  const hasBaseUrl = script.includes('await page.goto(')
  const timeoutMatch = script.match(/setTimeout\((\d+)\)/)
  
  return {
    testName: testNameMatch ? testNameMatch[1] : null,
    stepCount,
    hasBaseUrl,
    timeout: timeoutMatch ? parseInt(timeoutMatch[1]) : null
  }
}