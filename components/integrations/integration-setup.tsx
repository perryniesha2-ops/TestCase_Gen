"use client";

import { useMemo, useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toastSuccess, toastError, toastInfo } from "@/lib/utils/toast-utils";
import {
  RefreshCw,
  Copy,
  ExternalLink,
  CheckCircle,
  Clock,
  XCircle,
  AlertCircle,
} from "lucide-react";

type IntegrationType = "jira" | "testrail";

type IssueStatus = "open" | "in_progress" | "resolved" | "closed" | "wont_fix";

interface TrackedIssue {
  id: string;
  external_issue_id: string;
  external_issue_url: string;
  status: IssueStatus;
  issue_type: string;
  updated_at: string;
  test_executions?: { test_cases?: { title?: string } };
}

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

function statusBadge(status: IssueStatus) {
  const map: Record<
    IssueStatus,
    {
      label: string;
      variant: "default" | "secondary" | "destructive" | "outline";
      icon: React.ReactNode;
    }
  > = {
    open: {
      label: "Open",
      variant: "destructive",
      icon: <AlertCircle className="h-3 w-3" />,
    },
    in_progress: {
      label: "In Progress",
      variant: "secondary",
      icon: <Clock className="h-3 w-3" />,
    },
    resolved: {
      label: "Resolved",
      variant: "default",
      icon: <CheckCircle className="h-3 w-3" />,
    },
    closed: {
      label: "Closed",
      variant: "default",
      icon: <CheckCircle className="h-3 w-3" />,
    },
    wont_fix: {
      label: "Won't Fix",
      variant: "outline",
      icon: <XCircle className="h-3 w-3" />,
    },
  };
  const { label, variant, icon } = map[status] ?? map.open;
  return (
    <Badge variant={variant} className="flex items-center gap-1 text-xs">
      {icon}
      {label}
    </Badge>
  );
}

// ─── Root component ───────────────────────────────────────────────────────────

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

// ─── Jira setup ───────────────────────────────────────────────────────────────

function JiraSetup({ projectId }: { projectId: string }) {
  const [integrationId, setIntegrationId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [issues, setIssues] = useState<TrackedIssue[]>([]);
  const [lastSynced, setLastSynced] = useState<string | null>(null);

  const [config, setConfig] = useState({
    url: "",
    email: "",
    apiToken: "",
    projectKey: "",
    webhookSecret: "",
    autoSync: false,
  });

  const webhookUrl = useMemo(() => {
    if (!integrationId || typeof window === "undefined") return null;
    return `${window.location.origin}/api/integrations/jira/webhook?integration_id=${integrationId}`;
  }, [integrationId]);

  const loadIntegration = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/integrations?project_id=${projectId}`);
      if (!res.ok) throw new Error("Failed to load integrations");
      const json = await res.json();
      const jira = (json?.integrations ?? []).find(
        (i: { integration_type: string }) => i.integration_type === "jira",
      );

      if (jira) {
        setIntegrationId(jira.id);
        setLastSynced(jira.last_synced_at ?? null);
        setConfig({
          url: jira.config?.url ?? "",
          email: jira.config?.email ?? "",
          apiToken: jira.config?.apiToken ?? "",
          projectKey: jira.config?.projectKey ?? "",
          webhookSecret: jira.config?.webhookSecret ?? "",
          autoSync: jira.sync_enabled ?? false,
        });
        // Load tracked issues
        const issuesRes = await fetch(
          `/api/integrations/jira/issues?integration_id=${jira.id}`,
        );
        if (issuesRes.ok) {
          const issuesJson = await issuesRes.json();
          setIssues(issuesJson.issues ?? []);
        }
      } else {
        setIntegrationId(null);
        setConfig({
          url: "",
          email: "",
          apiToken: "",
          projectKey: "",
          webhookSecret: "",
          autoSync: false,
        });
        setIssues([]);
      }
    } catch {
      setIntegrationId(null);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadIntegration();
  }, [loadIntegration]);

  const normalizedUrl = useMemo(
    () => normalizeJiraBaseUrl(config.url),
    [config.url],
  );
  const urlLooksValid = useMemo(
    () => Boolean(normalizedUrl) && isLikelyJiraBaseUrl(normalizedUrl),
    [normalizedUrl],
  );

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
      const res = await fetch("/api/integrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          integration_id: integrationId,
          integration_type: "jira",
          project_id: projectId,
          config: {
            url: normalizedUrl,
            email: config.email.trim(),
            apiToken: config.apiToken.trim(),
            projectKey: config.projectKey.trim(),
            webhookSecret: config.webhookSecret.trim(),
          },
          auto_sync: config.autoSync,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error ?? "Failed to save integration");
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
      toastError("Use the base Jira site URL only.");
      return;
    }
    setTesting(true);
    try {
      const res = await fetch("/api/integrations/jira/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: normalizedUrl,
          email: config.email.trim(),
          apiToken: config.apiToken.trim(),
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error ?? `HTTP ${res.status}`);
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

  async function syncNow() {
    if (!integrationId) return;
    setSyncing(true);
    try {
      const res = await fetch(
        `/api/integrations/jira/sync?integration_id=${integrationId}`,
        { method: "POST" },
      );
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error ?? "Sync failed");
      const result = json.results?.[0];
      toastSuccess(
        `Synced ${result?.synced ?? 0} issues, ${result?.changed ?? 0} updated`,
      );
      setLastSynced(new Date().toISOString());
      await loadIntegration(); // refresh issue list
    } catch (err) {
      toastError(err instanceof Error ? err.message : "Sync failed");
    } finally {
      setSyncing(false);
    }
  }

  async function copyWebhookUrl() {
    if (!webhookUrl) return;
    await navigator.clipboard.writeText(webhookUrl);
    toastInfo("Webhook URL copied to clipboard");
  }

  if (loading) {
    return (
      <div className="space-y-4 pt-4 text-sm text-muted-foreground">
        Loading integration settings...
      </div>
    );
  }

  return (
    <div className="space-y-6 pt-4">
      {/* Config fields */}
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Jira URL</Label>
          <Input
            placeholder="https://your-domain.atlassian.net"
            value={config.url}
            onChange={(e) => setConfig({ ...config, url: e.target.value })}
          />
          {config.url && !urlLooksValid && (
            <p className="text-xs text-muted-foreground">
              Use the base site URL only (e.g.
              https://your-domain.atlassian.net).
            </p>
          )}
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
            onChange={(e) =>
              setConfig({ ...config, projectKey: e.target.value })
            }
          />
        </div>

        <div className="flex items-center justify-between">
          <Label>Auto-sync every hour</Label>
          <Switch
            checked={config.autoSync}
            onCheckedChange={(v) => setConfig({ ...config, autoSync: v })}
          />
        </div>
      </div>

      {/* Webhook section — only shown after integration is saved */}
      {integrationId && (
        <div className="space-y-3 rounded-lg border p-4 bg-muted/30">
          <div>
            <p className="text-sm font-medium">Webhook URL</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Add this URL in Jira → Project Settings → Automation → Webhooks to
              receive real-time status updates.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Input
              readOnly
              value={webhookUrl ?? ""}
              className="font-mono text-xs bg-background"
            />
            <Button
              size="icon"
              variant="outline"
              onClick={copyWebhookUrl}
              title="Copy webhook URL"
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>

          <div className="space-y-2">
            <Label className="text-xs">
              Webhook Secret (optional but recommended)
            </Label>
            <Input
              type="password"
              placeholder="Random string — set the same value in Jira"
              value={config.webhookSecret}
              onChange={(e) =>
                setConfig({ ...config, webhookSecret: e.target.value })
              }
              className="text-xs"
            />
            <p className="text-xs text-muted-foreground">
              Jira will include this in{" "}
              <code className="text-xs">x-hub-signature-256</code> so your
              endpoint can verify requests are genuine.
            </p>
          </div>
        </div>
      )}

      {/* Action buttons */}
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
          {saving
            ? "Saving..."
            : integrationId
              ? "Update Configuration"
              : "Save Configuration"}
        </Button>
        {integrationId && (
          <Button
            variant="outline"
            onClick={syncNow}
            disabled={syncing}
            className="ml-auto"
          >
            <RefreshCw
              className={`h-4 w-4 mr-2 ${syncing ? "animate-spin" : ""}`}
            />
            {syncing ? "Syncing..." : "Sync Now"}
          </Button>
        )}
      </div>

      {lastSynced && (
        <p className="text-xs text-muted-foreground">
          Last synced: {new Date(lastSynced).toLocaleString()}
        </p>
      )}

      {/* Tracked issues */}
      {issues.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">
              Tracked Issues ({issues.length})
            </p>
          </div>
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {issues.map((issue) => (
              <div
                key={issue.id}
                className="flex items-center justify-between rounded-md border px-3 py-2 text-sm bg-background"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <a
                    href={issue.external_issue_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-xs font-medium text-primary hover:underline flex items-center gap-1 shrink-0"
                  >
                    {issue.external_issue_id}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                  <span className="text-xs text-muted-foreground truncate">
                    {issue.test_executions?.test_cases?.title ?? "—"}
                  </span>
                </div>
                {statusBadge(issue.status)}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
