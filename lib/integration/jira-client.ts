// lib/integration/jira-client.ts
import { Version3Client } from "jira.js";

export interface JiraConfig {
  url: string; // base site url, e.g. https://your-domain.atlassian.net
  email: string;
  apiToken: string;
  projectKey?: string;
}

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
      host: baseUrl, // ✅ CORRECT: Full URL with protocol
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

    const description = `
*Test Case:* ${failure.test_title}
*Test Suite:* ${failure.suite_name}

h3. Failure Details
{code}
${failure.failure_reason}
{code}

${
  failure.evidence_urls?.length
    ? `h3. Evidence\n${failure.evidence_urls.map((url) => `!${url}!`).join("\n")}`
    : ""
}
`.trim();

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
  }
}
