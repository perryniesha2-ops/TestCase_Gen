"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

type IntegrationType = "jira" | "testrail";

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
        </Tabs>
      </CardContent>
    </Card>
  );
}

function JiraSetup({ projectId }: { projectId: string }) {
  const [config, setConfig] = useState({
    url: "",
    email: "",
    apiToken: "",
    projectKey: "",
    autoSync: false,
  });

  async function testConnection() {
    try {
      const response = await fetch("/api/integrations/jira/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });

      if (!response.ok) throw new Error("Connection failed");
      toast.success("Connection successful!");
    } catch {
      toast.error("Failed to connect to Jira");
    }
  }

  async function saveIntegration() {
    try {
      const response = await fetch("/api/integrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          integration_type: "jira",
          project_id: projectId,
          config,
        }),
      });

      const json = await response.json();
      if (!response.ok) throw new Error(json?.error ?? "Failed to save");

      toast.success("Jira integration configured!");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to save integration"
      );
    }
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
          placeholder="Get from Jira account settings"
          value={config.apiToken}
          onChange={(e) => setConfig({ ...config, apiToken: e.target.value })}
        />
      </div>

      <div className="space-y-2">
        <Label>Project Key</Label>
        <Input
          placeholder="PROJ"
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

      <div className="flex gap-2">
        <Button variant="outline" onClick={testConnection}>
          Test Connection
        </Button>
        <Button onClick={saveIntegration}>Save Configuration</Button>
      </div>
    </div>
  );
}
