// lib/integrations/sync-service.ts
import { createClient } from "@/lib/supabase/server";
import { JiraIntegration } from "./jira-client";
import { TestRailIntegration } from "./testrail-client";

type SyncResult = {
  processed: number;
  succeeded: number;
  failed: number;
};

export async function syncIntegration(
  integrationId: string,
  direction: "import" | "export" | "bidirectional",
  userId: string,
): Promise<SyncResult> {
  const supabase = await createClient();

  // Create sync log
  const { data: syncLog } = await supabase
    .from("integration_sync_logs")
    .insert({
      integration_id: integrationId,
      sync_type: "manual",
      direction,
      status: "running",
    })
    .select()
    .single();

  try {
    // Get integration config
    const { data: integration, error } = await supabase
      .from("integrations")
      .select("*")
      .eq("id", integrationId)
      .eq("user_id", userId)
      .single();

    if (error || !integration) {
      throw new Error("Integration not found");
    }

    let result: SyncResult;

    if (integration.integration_type === "jira") {
      result = await syncJira(supabase, integration, direction);
    } else if (integration.integration_type === "testrail") {
      result = await syncTestRail(supabase, integration, direction);
    } else {
      throw new Error(
        `Unsupported integration type: ${integration.integration_type}`,
      );
    }

    // Update sync log
    if (syncLog?.id) {
      await supabase
        .from("integration_sync_logs")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
          items_processed: result.processed,
          items_succeeded: result.succeeded,
          items_failed: result.failed,
        })
        .eq("id", syncLog.id);
    }

    return result;
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    // Update sync log with error
    if (syncLog?.id) {
      await supabase
        .from("integration_sync_logs")
        .update({
          status: "failed",
          completed_at: new Date().toISOString(),
          error_message: errorMessage,
        })
        .eq("id", syncLog.id);
    }

    throw error;
  }
}

async function syncJira(
  supabase: Awaited<ReturnType<typeof createClient>>,
  integration: any,
  direction: string,
): Promise<SyncResult> {
  const jira = new JiraIntegration(integration.config);

  if (direction === "import") {
    const issues = await jira.importIssues(integration.config.projectKey);

    let succeeded = 0;
    let failed = 0;

    for (const issue of issues) {
      try {
        // Check if already linked
        const { data: existing } = await supabase
          .from("external_entity_links")
          .select("*")
          .eq("integration_id", integration.id)
          .eq("external_id", issue.external_id)
          .maybeSingle();

        if (existing) {
          // Update existing requirement
          await supabase
            .from("requirements")
            .update({
              title: issue.title,
              description: issue.description,
              status: issue.status,
              priority: issue.priority,
            })
            .eq("id", existing.entity_id);
        } else {
          // Create new requirement
          const { data: requirement, error: reqError } = await supabase
            .from("requirements")
            .insert({
              user_id: integration.user_id,
              project_id: integration.project_id,
              title: issue.title,
              description: issue.description,
              status: issue.status,
              priority: issue.priority,
              source: "jira",
              metadata: issue.metadata,
            })
            .select()
            .single();

          if (reqError) throw reqError;

          if (requirement) {
            // Create link
            await supabase.from("external_entity_links").insert({
              integration_id: integration.id,
              entity_type: "requirement",
              entity_id: requirement.id,
              external_id: issue.external_id,
              external_type: "issue",
              external_url: issue.metadata.jira_url,
            });
          }
        }

        succeeded++;
      } catch (error) {
        console.error(`Failed to sync issue ${issue.external_id}:`, error);
        failed++;
      }
    }

    return { processed: issues.length, succeeded, failed };
  }

  return { processed: 0, succeeded: 0, failed: 0 };
}

async function syncTestRail(
  supabase: Awaited<ReturnType<typeof createClient>>,
  integration: any,
  direction: string,
): Promise<SyncResult> {
  return { processed: 0, succeeded: 0, failed: 0 };
}
