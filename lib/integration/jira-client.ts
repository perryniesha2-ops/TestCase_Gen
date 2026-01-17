// lib/integrations/jira-client.ts
import { Version3Client } from "jira.js";

interface JiraConfig {
  url: string;
  email: string;
  apiToken: string;
}

export class JiraIntegration {
  private client: Version3Client;
  private jiraHost: string;

  constructor(config: JiraConfig) {
    const host = config.url.replace(/^https?:\/\//, "");
    this.jiraHost = config.url;

    this.client = new Version3Client({
      host,
      authentication: {
        basic: {
          email: config.email,
          apiToken: config.apiToken,
        },
      },
    });
  }

  // Import Jira issues as requirements
  async importIssues(
    projectKey: string,
    options?: {
      issueTypes?: string[];
      jql?: string;
    }
  ) {
    const jql =
      options?.jql || `project = ${projectKey} AND type IN (Story, Task, Bug)`;

    const issues = await this.client.issueSearch.searchForIssuesUsingJql({
      jql,
      maxResults: 100,
      fields: ["summary", "description", "status", "priority", "labels"],
    });

    return (
      issues.issues?.map((issue) => ({
        external_id: issue.key,
        title: issue.fields.summary,
        description: issue.fields.description,
        status: this.mapJiraStatus(issue.fields.status?.name || "To Do"),
        priority: this.mapJiraPriority(issue.fields.priority?.name),
        metadata: {
          issue_type: issue.fields.issuetype?.name || "Unknown",
          labels: issue.fields.labels,
          jira_url: `${this.jiraHost}/browse/${issue.key}`,
        },
      })) || []
    );
  }

  // Create Jira issue from test failure
  async createIssueFromFailure(
    failure: {
      test_title: string;
      failure_reason: string;
      suite_name: string;
      evidence_urls?: string[];
    },
    projectKey: string
  ) {
    const description = `
*Test Case:* ${failure.test_title}
*Test Suite:* ${failure.suite_name}

h3. Failure Details
{code}
${failure.failure_reason}
{code}

${
  failure.evidence_urls?.length
    ? `h3. Evidence\n${failure.evidence_urls
        .map((url) => `!${url}!`)
        .join("\n")}`
    : ""
}
    `.trim();

    const issue = await this.client.issues.createIssue({
      fields: {
        project: { key: projectKey },
        summary: `Test Failure: ${failure.test_title}`,
        description,
        issuetype: { name: "Bug" },
        labels: ["automated-test-failure"],
      },
    });

    return issue;
  }

  // Link test case to Jira issue
  async linkTestCase(issueKey: string, testCaseUrl: string) {
    await this.client.issueRemoteLinks.createOrUpdateRemoteIssueLink({
      issueIdOrKey: issueKey,
      object: {
        url: testCaseUrl,
        title: "Test Case",
      },
    });
  }

  // Update issue status based on test results
  async updateIssueStatus(issueKey: string, allTestsPassed: boolean) {
    const transitions = await this.client.issues.getTransitions({
      issueIdOrKey: issueKey,
    });

    const targetStatus = allTestsPassed ? "Done" : "In Progress";
    const transition = transitions.transitions?.find(
      (t) => t.name === targetStatus
    );

    if (transition) {
      await this.client.issues.doTransition({
        issueIdOrKey: issueKey,
        transition: { id: transition.id },
      });
    }
  }

  private mapJiraStatus(jiraStatus?: string): string {
    const mapping: Record<string, string> = {
      "To Do": "draft",
      "In Progress": "approved",
      Done: "implemented",
      Closed: "tested",
    };
    return mapping[jiraStatus || "To Do"] || "draft";
  }

  private mapJiraPriority(jiraPriority?: string): string {
    const mapping: Record<string, string> = {
      Highest: "critical",
      High: "high",
      Medium: "medium",
      Low: "low",
      Lowest: "low",
    };
    return mapping[jiraPriority || "Medium"] || "medium";
  }
}
