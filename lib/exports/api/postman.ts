// lib/exports/api/postman.ts
import { normalizeApiSpec, isValidApiSpec } from "../api-normalize";

function toQueryPairs(query?: Record<string, string>) {
  if (!query) return [];
  return Object.entries(query)
    .filter(([k, v]) => k && v != null)
    .map(([key, value]) => ({ key, value: String(value) }));
}

function safeHeaders(headers?: Record<string, string>) {
  if (!headers) return [];
  return Object.entries(headers)
    .filter(([k, v]) => k && v != null)
    .map(([key, value]) => ({ key, value: String(value) }));
}

function buildPostmanAuth(apiAuth: any) {
  const t = String(apiAuth?.type ?? "").toLowerCase();
  if (!t || t === "none") return undefined;

  if (t === "bearer") {
    return {
      type: "bearer",
      bearer: [
        {
          key: "token",
          value: `{{${apiAuth?.tokenVar ?? "token"}}}`,
          type: "string",
        },
      ],
    };
  }

  if (t === "apikey") {
    const headerName = apiAuth?.headerName ?? "x-api-key";
    const apiKeyVar = apiAuth?.apiKeyVar ?? "apiKey";
    return {
      type: "apikey",
      apikey: [
        { key: "key", value: headerName, type: "string" },
        { key: "value", value: `{{${apiKeyVar}}}`, type: "string" },
        { key: "in", value: "header", type: "string" },
      ],
    };
  }

  if (t === "basic") {
    return {
      type: "basic",
      basic: [
        {
          key: "username",
          value: `{{${apiAuth?.usernameVar ?? "username"}}}`,
          type: "string",
        },
        {
          key: "password",
          value: `{{${apiAuth?.passwordVar ?? "password"}}}`,
          type: "string",
        },
      ],
    };
  }

  if (t === "oauth2") {
    return {
      type: "bearer",
      bearer: [
        {
          key: "token",
          value: `{{${apiAuth?.tokenVar ?? "token"}}}`,
          type: "string",
        },
      ],
    };
  }

  return undefined;
}

export function exportToPostman(testCases: any[], suiteName: string) {
  const valid = testCases
    .map((tc) => ({
      tc,
      api: normalizeApiSpec(tc.automation_metadata?.api),
    }))
    .filter(({ api }) => isValidApiSpec(api));

  const collection = {
    info: {
      name: `SynthQA - ${suiteName}`,
      description: `API test collection exported from SynthQA`,
      schema:
        "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
    },
    item: valid.map(({ tc, api }) => {
      const method = String(api?.method || "GET").toUpperCase();
      const path = String(api?.path || "/");

      return {
        name: tc.title || "API Test",
        request: {
          method,
          header: safeHeaders(api?.headers),
          auth: buildPostmanAuth(api?.auth),
          url: {
            raw: `{{baseUrl}}${path}`,
            host: ["{{baseUrl}}"],
            path: path.split("/").filter(Boolean),
            query: toQueryPairs(api?.query),
          },
          body:
            api?.body != null
              ? {
                  mode: "raw",
                  raw: JSON.stringify(api.body, null, 2),
                  options: { raw: { language: "json" } },
                }
              : undefined,
          description: tc.description || "",
        },
        response: [],
        event: api?.expectedStatus
          ? [
              {
                listen: "test",
                script: {
                  exec: [
                    `pm.test("Status code is ${api.expectedStatus}", function () {`,
                    `    pm.response.to.have.status(${api.expectedStatus});`,
                    `});`,
                    ``,
                    `pm.test("Response time is acceptable", function () {`,
                    `    pm.expect(pm.response.responseTime).to.be.below(2000);`,
                    `});`,
                  ],
                  type: "text/javascript",
                },
              },
            ]
          : undefined,
      };
    }),
  };

  const timestamp = new Date().toISOString().split("T")[0];
  const filename = `${suiteName.toLowerCase().replace(/\s+/g, "-")}-postman-${timestamp}.json`;

  return {
    content: JSON.stringify(collection, null, 2),
    filename,
    mimeType: "application/json",
  };
}
