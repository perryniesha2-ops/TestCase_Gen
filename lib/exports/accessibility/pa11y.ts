// lib/exports/accessibility/pa11y.ts
export function exportToPa11y(testCases: any[], suiteName: string) {
  const urls = new Set<string>();

  // Extract URLs from test cases
  testCases.forEach((tc) => {
    if (tc.steps && Array.isArray(tc.steps)) {
      tc.steps.forEach((step: string) => {
        const urlMatch = step.match(/https?:\/\/[^\s]+/);
        if (urlMatch) {
          urls.add(urlMatch[0]);
        }
      });
    }
  });

  const urlList = Array.from(urls);
  if (urlList.length === 0) {
    urlList.push("https://example.com");
  }

  const config = {
    defaults: {
      timeout: 30000,
      wait: 1000,
      chromeLaunchConfig: {
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
      },
      standard: "WCAG2AA",
      runners: ["axe", "htmlcs"],
      includeNotices: false,
      includeWarnings: true,
      ignore: [] as string[],
      actions: [] as string[],
    },
    urls: urlList.map((url) => ({
      url,
      screenCapture: `./screenshots/${url.replace(/[^a-z0-9]/gi, "_")}.png`,
      viewport: {
        width: 1280,
        height: 1024,
      },
    })),
    tests: testCases.map((tc, idx) => ({
      name: tc.title,
      description: tc.description || "",
      url: urlList[idx % urlList.length],
      actions: generatePa11yActions(tc.steps),
      verifications: generatePa11yVerifications(tc.expected_results),
    })),
    metadata: {
      suite: suiteName,
      generatedBy: "SynthQA",
      generatedAt: new Date().toISOString(),
      testCount: testCases.length,
    },
  };

  const timestamp = new Date().toISOString().split("T")[0];
  const filename = `${suiteName.toLowerCase().replace(/\s+/g, "-")}-pa11y-${timestamp}.json`;

  return {
    content: JSON.stringify(config, null, 2),
    filename,
    mimeType: "application/json",
  };
}

function generatePa11yActions(steps?: string[]): string[] {
  if (!steps || !Array.isArray(steps)) return [];

  return steps
    .map((step) => {
      const lower = step.toLowerCase();
      if (lower.includes("click")) {
        return 'click element button[type="submit"]';
      } else if (lower.includes("type") || lower.includes("enter")) {
        return 'set field input[name="email"] to test@example.com';
      } else if (lower.includes("wait")) {
        return "wait for element h1 to be visible";
      }
      return null;
    })
    .filter(Boolean) as string[];
}

function generatePa11yVerifications(results?: string[]): string[] {
  if (!results || !Array.isArray(results)) return [];

  return results
    .map((result) => {
      const lower = result.toLowerCase();
      if (lower.includes("contrast")) {
        return "color-contrast";
      } else if (lower.includes("keyboard")) {
        return "keyboard-access";
      } else if (lower.includes("aria")) {
        return "aria-valid";
      } else if (lower.includes("heading")) {
        return "heading-structure";
      }
      return null;
    })
    .filter(Boolean) as string[];
}
