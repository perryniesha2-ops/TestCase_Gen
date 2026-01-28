// lib/exports/api/karate.ts
import {
  normalizeApiSpec,
  isValidApiSpec,
  type ApiSpecOut,
} from "../api-normalize";

export function exportToKarate(testCases: any[], suiteName: string) {
  const valid = testCases
    .map((tc) => ({
      tc,
      api: normalizeApiSpec(tc.automation_metadata?.api),
    }))
    .filter((item) => isValidApiSpec(item.api)) as Array<{
    tc: any;
    api: ApiSpecOut;
  }>;

  const lines = [
    `Feature: ${suiteName}`,
    ``,
    `Background:`,
    `  * url baseUrl`,
    `  * configure headers = { 'Content-Type': 'application/json' }`,
    ``,
  ];

  valid.forEach(({ tc, api }, idx) => {
    const method = String(api.method || "GET").toLowerCase();
    const path = String(api.path || "/");
    const title = tc.title || `Test ${idx + 1}`;
    const desc = tc.description || "";

    lines.push(`Scenario: ${title}`);
    if (desc) lines.push(`  # ${desc}`);

    // Auth - with proper type narrowing
    if (api.auth) {
      const authType = api.auth.type;

      if (authType === "bearer" || authType === "oauth2") {
        const tokenVar =
          authType === "bearer"
            ? api.auth.tokenVar
            : authType === "oauth2"
              ? api.auth.tokenVar
              : "token";
        lines.push(
          `  * header Authorization = 'Bearer ' + ${tokenVar || "token"}`,
        );
      } else if (authType === "apiKey") {
        const headerName = api.auth.headerName || "x-api-key";
        const apiKeyVar = api.auth.apiKeyVar || "apiKey";
        lines.push(`  * header ${headerName} = ${apiKeyVar}`);
      } else if (authType === "basic") {
        const username = api.auth.usernameVar || "username";
        const password = api.auth.passwordVar || "password";
        lines.push(
          `  * header Authorization = 'Basic ' + karate.encode(${username} + ':' + ${password})`,
        );
      }
    }

    // Custom headers
    if (api.headers) {
      Object.entries(api.headers).forEach(([k, v]) => {
        if (k.toLowerCase() !== "authorization") {
          lines.push(`  * header ${k} = '${v}'`);
        }
      });
    }

    // Path and query
    lines.push(`  Given path '${path}'`);

    if (api.query) {
      Object.entries(api.query).forEach(([k, v]) => {
        lines.push(`  And param ${k} = '${v}'`);
      });
    }

    // Request body
    if (api.body) {
      const bodyJson = JSON.stringify(api.body, null, 2)
        .split("\n")
        .map((line, i) => (i === 0 ? `  And request ${line}` : `  ${line}`))
        .join("\n");
      lines.push(bodyJson);
    }

    // Execute
    lines.push(`  When method ${method}`);

    // Assertions
    const expectedStatus = api.expectedStatus ?? 200;
    lines.push(`  Then status ${expectedStatus}`);

    // Add response validation if we have expected results
    if (tc.expected_results && Array.isArray(tc.expected_results)) {
      lines.push(`  # Expected results:`);
      tc.expected_results.forEach((result: string) => {
        lines.push(`  # - ${result}`);
      });
    }

    lines.push(``);
  });

  const timestamp = new Date().toISOString().split("T")[0];
  const filename = `${suiteName.toLowerCase().replace(/\s+/g, "-")}-${timestamp}.feature`;

  return {
    content: lines.join("\n"),
    filename,
    mimeType: "text/plain",
  };
}
