"use client";

import { useMemo, useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toastSuccess, toastError } from "@/lib/utils/toast-utils";

type IntegrationType = "jira" | "testrail";

function normalizeJiraBaseUrl(input: string) {
  return String(input ?? "")
    .trim()
    .replace(/\/+$/, "");
}

function isLikelyJiraBaseUrl(url: string) {
  try {
    const withProto = /^https?:\/\//i.test(url) ? url : `https://${url}`;
    const u = new URL(withProto);
    return u.pathname === "/" && Boolean(u.host);
  } catch {
    return false;
  }
}

export function IntegrationSetup({ projectId }: { projectId: string }) {
  const [activeType, setActiveType] = useState<IntegrationType>("jira");

  return (
    <Card>
      <CardHeader>
        <CardTitle>Integration Settings</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs
          value={activeType}
          onValueChange={(v) => setActiveType(v as IntegrationType)}
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="jira">Jira</TabsTrigger>
            <TabsTrigger value="testrail">TestRail</TabsTrigger>
          </TabsList>

          <TabsContent value="jira">
            <JiraSetup projectId={projectId} />
          </TabsContent>

          <TabsContent value="testrail">
            <div className="pt-4 text-sm text-muted-foreground">
              TestRail setup coming next.
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

function JiraSetup({ projectId }: { projectId: string }) {
  const [integrationId, setIntegrationId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [loading, setLoading] = useState(true);

  const [config, setConfig] = useState({
    url: "",
    email: "",
    apiToken: "",
    projectKey: "",
    autoSync: false,
  });

  useEffect(() => {
    async function loadIntegration() {
      if (!projectId) return;

      setLoading(true);
      try {
        const url = `/api/integrations?project_id=${projectId}`;
        const response = await fetch(url);

        if (!response.ok) {
          throw new Error("Failed to load integrations");
        }

        const json = await response.json();
        const integrations = json?.integrations || [];
        const jiraIntegration = integrations.find(
          (i: any) => i.integration_type === "jira",
        );

        if (jiraIntegration) {
          setIntegrationId(jiraIntegration.id);
          setConfig({
            url: jiraIntegration.config?.url || "",
            email: jiraIntegration.config?.email || "",
            apiToken: jiraIntegration.config?.apiToken || "",
            projectKey: jiraIntegration.config?.projectKey || "",
            autoSync: jiraIntegration.sync_enabled || false,
          });
        } else {
          setIntegrationId(null);
          setConfig({
            url: "",
            email: "",
            apiToken: "",
            projectKey: "",
            autoSync: false,
          });
        }
      } catch (err) {
        setIntegrationId(null);
      } finally {
        setLoading(false);
      }
    }

    loadIntegration();
  }, [projectId]);

  const normalizedUrl = useMemo(
    () => normalizeJiraBaseUrl(config.url),
    [config.url],
  );
  const urlLooksValid = useMemo(() => {
    if (!normalizedUrl) return false;
    return isLikelyJiraBaseUrl(normalizedUrl);
  }, [normalizedUrl]);

  async function saveIntegration() {
    if (!projectId) {
      toastError("Missing project id");
      return;
    }
    if (!config.url || !config.email || !config.apiToken) {
      toastError("URL, Email, and API Token are required");
      return;
    }
    if (!urlLooksValid) {
      toastError("Use the base Jira site URL only (no /jira/... path).");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        integration_id: integrationId,
        integration_type: "jira",
        project_id: projectId,
        config: {
          url: normalizedUrl,
          email: config.email.trim(),
          apiToken: config.apiToken.trim(),
          projectKey: config.projectKey.trim(),
        },
        auto_sync: config.autoSync,
      };

      const response = await fetch("/api/integrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await response.json().catch(() => ({}));

      if (!response.ok)
        throw new Error(json?.error ?? "Failed to save integration");

      const id = json?.integration?.id ?? null;
      if (!id) throw new Error("Saved, but API did not return integration id");

      setIntegrationId(id);
      toastSuccess(integrationId ? "Integration updated" : "Integration saved");
    } catch (err) {
      toastError(
        err instanceof Error ? err.message : "Failed to save integration",
      );
    } finally {
      setSaving(false);
    }
  }

  async function testConnection() {
    if (!config.url || !config.email || !config.apiToken) {
      toastError("URL, Email, and API Token are required");
      return;
    }
    if (!urlLooksValid) {
      toastError("Use the base Jira site URL only (no /jira/... path).");
      return;
    }

    setTesting(true);
    try {
      const payload = {
        url: normalizedUrl,
        email: config.email.trim(),
        apiToken: config.apiToken.trim(),
      };

      const response = await fetch("/api/integrations/jira/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(json?.error ?? `HTTP ${response.status}`);
      }

      toastSuccess(
        `Connection successful! Connected as ${json?.me?.displayName ?? "user"}`,
      );
    } catch (err) {
      toastError(
        err instanceof Error ? err.message : "Failed to connect to Jira",
      );
    } finally {
      setTesting(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4 pt-4">
        <div className="text-sm text-muted-foreground">
          Loading integration settings...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 pt-4">
      <div className="space-y-2">
        <Label>Jira URL</Label>
        <Input
          placeholder="https://your-domain.atlassian.net"
          value={config.url}
          onChange={(e) => setConfig({ ...config, url: e.target.value })}
        />
        {config.url && !urlLooksValid ? (
          <div className="text-xs text-muted-foreground">
            Use the base site URL only (example:
            https://your-domain.atlassian.net). Do not paste board URLs.
          </div>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label>Email</Label>
        <Input
          type="email"
          value={config.email}
          onChange={(e) => setConfig({ ...config, email: e.target.value })}
        />
      </div>

      <div className="space-y-2">
        <Label>API Token</Label>
        <Input
          type="password"
          placeholder="Create in Atlassian Account → Security → API tokens"
          value={config.apiToken}
          onChange={(e) => setConfig({ ...config, apiToken: e.target.value })}
        />
      </div>

      <div className="space-y-2">
        <Label>Project Key</Label>
        <Input
          placeholder="SCRUM"
          value={config.projectKey}
          onChange={(e) => setConfig({ ...config, projectKey: e.target.value })}
        />
      </div>

      <div className="flex items-center justify-between">
        <Label>Auto-sync every hour</Label>
        <Switch
          checked={config.autoSync}
          onCheckedChange={(v) => setConfig({ ...config, autoSync: v })}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          onClick={testConnection}
          disabled={
            testing ||
            !config.url ||
            !config.email ||
            !config.apiToken ||
            !urlLooksValid
          }
        >
          {testing ? "Testing..." : "Test Connection"}
        </Button>
        <Button onClick={saveIntegration} disabled={saving || !urlLooksValid}>
          {saving ? "Saving..." : "Save Configuration"}
        </Button>
      </div>

      {integrationId ? (
        <div className="text-xs text-muted-foreground">
          Saved integration id: {integrationId}
        </div>
      ) : null}
    </div>
  );
}
