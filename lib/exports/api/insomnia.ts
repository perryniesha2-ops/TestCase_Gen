// lib/exports/api/insomnia.ts
import {
  normalizeApiSpec,
  isValidApiSpec,
  type ApiSpecOut,
} from "../api-normalize";

export function exportToInsomnia(testCases: any[], suiteName: string) {
  const valid = testCases
    .map((tc) => ({
      tc,
      api: normalizeApiSpec(tc.automation_metadata?.api),
    }))
    .filter((item) => isValidApiSpec(item.api)) as Array<{
    tc: any;
    api: ApiSpecOut;
  }>;

  const workspaceId = `wrk_${Date.now()}`;
  const envId = `env_${Date.now()}`;

  const resources = [
    {
      _id: workspaceId,
      _type: "workspace",
      name: suiteName,
      description: "Exported from SynthQA",
    },
    {
      _id: envId,
      _type: "environment",
      name: "Base Environment",
      data: {
        baseUrl: "https://api.example.com",
        token: "your-token-here",
        apiKey: "your-api-key-here",
        username: "your-username",
        password: "your-password",
      },
      parentId: workspaceId,
    },
  ];

  valid.forEach(({ tc, api }, idx) => {
    const requestId = `req_${Date.now()}_${idx}`;
    const method = String(api.method || "GET").toUpperCase();
    const path = String(api.path || "/");

    const headers = [];
    if (api.headers) {
      Object.entries(api.headers).forEach(([name, value]) => {
        headers.push({ name, value: String(value) });
      });
    }

    // Auth header - with proper type narrowing
    if (api.auth) {
      const authType = api.auth.type;

      if (authType === "bearer" || authType === "oauth2") {
        headers.push({
          name: "Authorization",
          value: `Bearer {{ _.token }}`,
        });
      } else if (authType === "apiKey") {
        const headerName = api.auth.headerName || "x-api-key";
        headers.push({
          name: headerName,
          value: `{{ _.apiKey }}`,
        });
      }
    }

    const request: any = {
      _id: requestId,
      _type: "request",
      parentId: workspaceId,
      name: tc.title || "API Request",
      description: tc.description || "",
      method,
      url: `{{ _.baseUrl }}${path}`,
      headers,
      parameters: [],
      body: {},
    };

    // Query parameters
    if (api.query) {
      request.parameters = Object.entries(api.query).map(([name, value]) => ({
        name,
        value: String(value),
      }));
    }

    // Request body
    if (api.body) {
      request.body = {
        mimeType: "application/json",
        text: JSON.stringify(api.body, null, 2),
      };
    }

    // Basic auth - with proper type narrowing
    if (api.auth && api.auth.type === "basic") {
      request.authentication = {
        type: "basic",
        username: "{{ _.username }}",
        password: "{{ _.password }}",
      };
    }

    resources.push(request);
  });

  const collection = {
    _type: "export",
    __export_format: 4,
    __export_date: new Date().toISOString(),
    __export_source: "synthqa",
    resources,
  };

  const timestamp = new Date().toISOString().split("T")[0];
  const filename = `${suiteName.toLowerCase().replace(/\s+/g, "-")}-insomnia-${timestamp}.json`;

  return {
    content: JSON.stringify(collection, null, 2),
    filename,
    mimeType: "application/json",
  };
}
