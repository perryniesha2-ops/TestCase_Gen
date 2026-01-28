// lib/exports/api/openapi.ts
import {
  normalizeApiSpec,
  isValidApiSpec,
  type ApiSpecOut,
} from "../api-normalize";

export function exportToOpenAPI(testCases: any[], suiteName: string) {
  const valid = testCases
    .map((tc) => ({
      tc,
      api: normalizeApiSpec(tc.automation_metadata?.api),
    }))
    .filter((item) => isValidApiSpec(item.api)) as Array<{
    tc: any;
    api: ApiSpecOut;
  }>;

  const paths: Record<string, any> = {};

  valid.forEach(({ tc, api }) => {
    const method = String(api.method || "GET").toLowerCase();
    const path = String(api.path || "/");

    if (!paths[path]) {
      paths[path] = {};
    }

    const operation: any = {
      summary: tc.title || "API Operation",
      description: tc.description || "",
      operationId: tc.id || `${method}${path.replace(/\//g, "_")}`,
      tags: [suiteName],
      responses: {
        [api.expectedStatus || 200]: {
          description: "Successful response",
          content: {
            "application/json": {
              schema: { type: "object" },
            },
          },
        },
      },
    };

    // Parameters (query)
    if (api.query) {
      operation.parameters = Object.entries(api.query).map(([name, value]) => ({
        name,
        in: "query",
        schema: { type: "string", example: value },
      }));
    }

    // Request body
    if (api.body && ["post", "put", "patch"].includes(method)) {
      operation.requestBody = {
        required: true,
        content: {
          "application/json": {
            schema: { type: "object", example: api.body },
          },
        },
      };
    }

    // Security - with proper type narrowing
    if (api.auth) {
      const authType = api.auth.type;

      if (authType === "bearer" || authType === "oauth2") {
        operation.security = [{ bearerAuth: [] }];
      } else if (authType === "apiKey") {
        operation.security = [{ apiKeyAuth: [] }];
      } else if (authType === "basic") {
        operation.security = [{ basicAuth: [] }];
      }
    }

    paths[path][method] = operation;
  });

  // Security schemes
  const securitySchemes: Record<string, any> = {};
  valid.forEach(({ api }) => {
    if (api.auth) {
      const authType = api.auth.type;

      if (authType === "bearer" || authType === "oauth2") {
        securitySchemes.bearerAuth = {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        };
      } else if (authType === "apiKey") {
        const headerName = api.auth.headerName || "x-api-key";
        securitySchemes.apiKeyAuth = {
          type: "apiKey",
          in: "header",
          name: headerName,
        };
      } else if (authType === "basic") {
        securitySchemes.basicAuth = {
          type: "http",
          scheme: "basic",
        };
      }
    }
  });

  const spec = {
    openapi: "3.0.0",
    info: {
      title: suiteName,
      version: "1.0.0",
      description: `API specification generated from SynthQA test suite`,
    },
    servers: [
      {
        url: "{baseUrl}",
        variables: {
          baseUrl: {
            default: "https://api.example.com",
            description: "Base URL for the API",
          },
        },
      },
    ],
    paths,
    components: {
      securitySchemes,
    },
  };

  const timestamp = new Date().toISOString().split("T")[0];
  const filename = `${suiteName.toLowerCase().replace(/\s+/g, "-")}-openapi-${timestamp}.yaml`;

  // Convert to YAML format
  const yaml = jsonToYaml(spec);

  return {
    content: yaml,
    filename,
    mimeType: "text/yaml",
  };
}

function jsonToYaml(obj: any, indent = 0): string {
  const spaces = "  ".repeat(indent);
  let yaml = "";

  for (const [key, value] of Object.entries(obj)) {
    if (value === null || value === undefined) continue;

    if (typeof value === "object" && !Array.isArray(value)) {
      yaml += `${spaces}${key}:\n${jsonToYaml(value, indent + 1)}`;
    } else if (Array.isArray(value)) {
      yaml += `${spaces}${key}:\n`;
      value.forEach((item) => {
        if (typeof item === "object") {
          yaml += `${spaces}  -\n${jsonToYaml(item, indent + 2)}`;
        } else {
          yaml += `${spaces}  - ${item}\n`;
        }
      });
    } else {
      const val = typeof value === "string" ? `"${value}"` : value;
      yaml += `${spaces}${key}: ${val}\n`;
    }
  }

  return yaml;
}
