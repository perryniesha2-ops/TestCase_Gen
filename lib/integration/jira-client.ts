// lib/integration/jira-client.ts
import { Version3Client } from "jira.js";

export interface JiraConfig {
  url: string; // base site url, e.g. https://your-domain.atlassian.net
  email: string;
  apiToken: string;
  projectKey?: string;
}

export type ImportedJiraIssue = {
  external_id: string; // Jira issue key, e.g. "ABC-123"
  title: string;
  description: string | null;
  status: string | null;
  priority: string | null;
  metadata: {
    jira_key: string;
    jira_url: string;
    raw?: unknown;
  };
};

function normalizeBaseUrl(input: string) {
  const trimmed = String(input ?? "")
    .trim()
    .replace(/\/+$/, "");
  if (!trimmed) throw new Error("Jira URL is required");
  return trimmed;
}

function toHost(baseUrl: string) {
  const cleaned = normalizeBaseUrl(baseUrl);

  // Ensure URL is parseable
  const withProto = /^https?:\/\//i.test(cleaned)
    ? cleaned
    : `https://${cleaned}`;

  let u: URL;
  try {
    u = new URL(withProto);
  } catch {
    throw new Error(
      "Invalid Jira URL. Use the base site URL like https://your-domain.atlassian.net",
    );
  }

  // Must be root site only (no /jira/... etc)
  if (u.pathname && u.pathname !== "/") {
    throw new Error(
      "Jira URL must be the base site URL only (no /jira/... path). Example: https://your-domain.atlassian.net",
    );
  }

  if (!u.host) {
    throw new Error(
      "Invalid Jira URL host. Use the base site URL like https://your-domain.atlassian.net",
    );
  }

  return { host: u.host, baseUrl: `${u.protocol}//${u.host}` };
}

export class JiraIntegration {
  private client: Version3Client;
  private baseUrl: string;

  constructor(config: JiraConfig) {
    if (!config?.url || !config?.email || !config?.apiToken) {
      throw new Error(
        "Missing Jira config (url, email, apiToken are required)",
      );
    }

    const { baseUrl } = toHost(config.url);
    this.baseUrl = baseUrl;

    this.client = new Version3Client({
      host: baseUrl,
      authentication: {
        basic: {
          email: String(config.email).trim(),
          apiToken: String(config.apiToken).trim(),
        },
      },
    });
  }

  getBaseUrl() {
    return this.baseUrl;
  }

  async testConnection() {
    const anyClient = this.client as any;

    if (anyClient?.myself?.getCurrentUser)
      return await anyClient.myself.getCurrentUser();
    if (anyClient?.myself?.getMyself) return await anyClient.myself.getMyself();
    if (anyClient?.serverInfo?.getServerInfo)
      return await anyClient.serverInfo.getServerInfo();

    throw new Error(
      "Unable to test Jira connection (myself/serverInfo methods not found on jira.js client).",
    );
  }

  async createIssueFromFailure(
    failure: {
      test_title: string;
      failure_reason: string;
      suite_name: string;
      evidence_urls?: string[];
    },
    projectKey: string,
  ) {
    if (!projectKey) throw new Error("Jira projectKey is required");

    // Build ADF (Atlassian Document Format) description
    // This is the JSON format that Jira Cloud requires
    const descriptionContent: any[] = [
      {
        type: "paragraph",
        content: [
          { type: "text", text: "Test Case: ", marks: [{ type: "strong" }] },
          { type: "text", text: failure.test_title },
        ],
      },
      {
        type: "paragraph",
        content: [
          { type: "text", text: "Test Suite: ", marks: [{ type: "strong" }] },
          { type: "text", text: failure.suite_name },
        ],
      },
      {
        type: "heading",
        attrs: { level: 3 },
        content: [{ type: "text", text: "Failure Details" }],
      },
      {
        type: "codeBlock",
        content: [{ type: "text", text: failure.failure_reason }],
      },
    ];

    // Add evidence section if URLs are present
    if (failure.evidence_urls && failure.evidence_urls.length > 0) {
      descriptionContent.push({
        type: "heading",
        attrs: { level: 3 },
        content: [{ type: "text", text: "Evidence" }],
      });

      for (const url of failure.evidence_urls) {
        descriptionContent.push({
          type: "paragraph",
          content: [
            {
              type: "text",
              text: url,
              marks: [{ type: "link", attrs: { href: url } }],
            },
          ],
        });
      }
    }

    const description = {
      type: "doc",
      version: 1,
      content: descriptionContent,
    };

    try {
      const issue = await (this.client as any).issues.createIssue({
        fields: {
          project: { key: projectKey },
          summary: `Test Failure: ${failure.test_title}`,
          description,
          issuetype: { name: "Bug" },
          labels: ["synthqa-test-failure"],
        },
      });

      return issue;
    } catch (error: any) {
      console.error("❌ Jira API Error:", {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: JSON.stringify(error.response?.data, null, 2),
      });
      throw error;
    }
  }

  async importIssues(projectKey: string): Promise<ImportedJiraIssue[]> {
    if (!projectKey) throw new Error("Jira projectKey is required");

    // Pull most recently updated issues first
    const jql = `project=${projectKey} ORDER BY updated DESC`;

    // jira.js typing can vary by version; use `as any` like the rest of your file
    const res = await (this.client as any).issueSearch.searchForIssuesUsingJql({
      jql,
      maxResults: 100,
      fields: ["summary", "description", "status", "priority"],
    });

    const issues = Array.isArray(res?.issues) ? res.issues : [];

    return issues.map((issue: any) => {
      const key = String(issue?.key ?? "");
      const fields = issue?.fields ?? {};

      const summary = String(fields?.summary ?? "");

      // Jira Cloud descriptions are often Atlassian Document Format (ADF).
      // Store as string for now (either plain or JSON string).
      const description =
        typeof fields?.description === "string"
          ? fields.description
          : fields?.description
            ? JSON.stringify(fields.description)
            : null;

      const status = fields?.status?.name ?? null;
      const priority = fields?.priority?.name ?? null;

      return {
        external_id: key,
        title: summary,
        description,
        status,
        priority,
        metadata: {
          jira_key: key,
          jira_url: `${this.baseUrl}/browse/${encodeURIComponent(key)}`,
          raw: issue, // optional; remove if you don't want raw payload stored
        },
      };
    });
  }
}
