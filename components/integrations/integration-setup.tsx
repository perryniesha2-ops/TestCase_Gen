"use client";

import { useMemo, useState, useEffect, useCallback } from "react";
import { Switch } from "@/components/ui/switch";
import { toastSuccess, toastError, toastInfo } from "@/lib/utils/toast-utils";
import {
  RefreshCw,
  Copy,
  ExternalLink,
  CheckCircle,
  Clock,
  XCircle,
  AlertCircle,
  Loader2,
} from "lucide-react";
import Link from "next/link";

// ── Types ─────────────────────────────────────────────────────────────────────

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

// ── Helpers ───────────────────────────────────────────────────────────────────

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

// ── Status chip ───────────────────────────────────────────────────────────────

const statusConfig: Record<
  IssueStatus,
  { label: string; className: string; icon: React.ReactNode }
> = {
  open: {
    label: "Open",
    className:
      "bg-rose-100 text-rose-600 dark:bg-rose-400/10 dark:text-rose-300",
    icon: <AlertCircle className="h-3 w-3" />,
  },
  in_progress: {
    label: "In progress",
    className:
      "bg-amber-100 text-amber-600 dark:bg-amber-400/10 dark:text-amber-300",
    icon: <Clock className="h-3 w-3" />,
  },
  resolved: {
    label: "Resolved",
    className:
      "bg-emerald-100 text-emerald-600 dark:bg-emerald-400/10 dark:text-emerald-300",
    icon: <CheckCircle className="h-3 w-3" />,
  },
  closed: {
    label: "Closed",
    className:
      "bg-emerald-100 text-emerald-600 dark:bg-emerald-400/10 dark:text-emerald-300",
    icon: <CheckCircle className="h-3 w-3" />,
  },
  wont_fix: {
    label: "Won't fix",
    className:
      "bg-slate-100 text-slate-500 dark:bg-slate-700/60 dark:text-slate-400",
    icon: <XCircle className="h-3 w-3" />,
  },
};

function StatusChip({ status }: { status: IssueStatus }) {
  const { label, className, icon } = statusConfig[status] ?? statusConfig.open;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-mono text-[10px] ${className}`}
    >
      {icon}
      {label}
    </span>
  );
}

// ── Field components ──────────────────────────────────────────────────────────

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
        {label}
      </label>
      {children}
      {hint && (
        <p className="text-[11px] text-slate-400 dark:text-slate-500">{hint}</p>
      )}
    </div>
  );
}

function TextInput({
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:border-cyan-400/60 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500"
    />
  );
}

function ActionBtn({
  onClick,
  disabled,
  loading,
  children,
  variant = "default",
}: {
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
  children: React.ReactNode;
  variant?: "default" | "outline" | "danger";
}) {
  const base =
    "inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-50";
  const styles = {
    default:
      "border border-cyan-500/40 bg-cyan-50 text-cyan-700 hover:bg-cyan-100 dark:border-cyan-400/40 dark:bg-cyan-400/10 dark:text-cyan-300 dark:hover:bg-cyan-400/20",
    outline:
      "border border-slate-200 bg-white text-slate-600 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-slate-600",
    danger:
      "border border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100 dark:border-rose-400/20 dark:bg-rose-400/5 dark:text-rose-400",
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`${base} ${styles[variant]}`}
    >
      {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
      {children}
    </button>
  );
}

// ── Root component ────────────────────────────────────────────────────────────

export function IntegrationSetup({ projectId }: { projectId: string }) {
  const [activeType, setActiveType] = useState<IntegrationType>("jira");

  const tabs: { id: IntegrationType; label: string }[] = [
    { id: "jira", label: "Jira" },
    { id: "testrail", label: "TestRail" },
  ];

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
      <div className="h-4" />
      <Link
        href="/project-manager"
        className="rounded-full border border-slate-200 px-4 py-1.5 text-xs font-medium text-slate-600 hover:border-slate-300 transition dark:border-slate-700 dark:text-slate-300"
      >
        ← Back to Projects
      </Link>
      <div className="h-4" />

      <h3 className="mb-5 text-base font-semibold text-slate-800 dark:text-slate-100">
        Integration settings
      </h3>

      {/* Tab pills */}
      <div className="mb-6 flex gap-1 rounded-xl border border-slate-200 bg-white p-1 w-fit dark:border-slate-800 dark:bg-slate-900">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveType(t.id)}
            className={`rounded-lg px-4 py-1.5 text-xs font-medium transition ${
              activeType === t.id
                ? "bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-100"
                : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {activeType === "jira" && <JiraSetup projectId={projectId} />}
      {activeType === "testrail" && (
        <p className="text-sm text-slate-400 dark:text-slate-500">
          TestRail integration coming soon.
        </p>
      )}
    </section>
  );
}

// ── Jira setup ────────────────────────────────────────────────────────────────

function JiraSetup({ projectId }: { projectId: string }) {
  const [integrationId, setIntegrationId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [issues, setIssues] = useState<TrackedIssue[]>([]);
  const [lastSynced, setLastSynced] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const [config, setConfig] = useState({
    url: "",
    email: "",
    apiToken: "",
    projectKey: "",
    webhookSecret: "",
    autoSync: false,
  });

  const set = (key: keyof typeof config) => (val: string | boolean) =>
    setConfig((prev) => ({ ...prev, [key]: val }));

  const webhookUrl = useMemo(() => {
    if (!integrationId || typeof window === "undefined") return null;
    return `${window.location.origin}/api/integrations/jira/webhook?integration_id=${integrationId}`;
  }, [integrationId]);

  const normalizedUrl = useMemo(
    () => normalizeJiraBaseUrl(config.url),
    [config.url],
  );
  const urlLooksValid = useMemo(
    () => Boolean(normalizedUrl) && isLikelyJiraBaseUrl(normalizedUrl),
    [normalizedUrl],
  );
  const canConnect = Boolean(
    config.url && config.email && config.apiToken && urlLooksValid,
  );

  // ── Load ────────────────────────────────────────────────────────────────

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
        const issuesRes = await fetch(
          `/api/integrations/jira/issues?integration_id=${jira.id}`,
        );
        if (issuesRes.ok) setIssues((await issuesRes.json()).issues ?? []);
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

  // ── Actions ─────────────────────────────────────────────────────────────

  async function saveIntegration() {
    if (!canConnect) {
      toastError("URL, Email, and API Token are required");
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
      if (!res.ok) throw new Error(json?.error ?? "Failed to save");
      const id = json?.integration?.id ?? null;
      if (!id) throw new Error("Saved, but no integration id returned");
      setIntegrationId(id);
      toastSuccess(integrationId ? "Integration updated" : "Integration saved");
    } catch (err) {
      toastError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function testConnection() {
    if (!canConnect) {
      toastError("URL, Email, and API Token are required");
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
      toastSuccess(`Connected as ${json?.me?.displayName ?? "user"}`);
    } catch (err) {
      toastError(err instanceof Error ? err.message : "Connection failed");
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
      await loadIntegration();
    } catch (err) {
      toastError(err instanceof Error ? err.message : "Sync failed");
    } finally {
      setSyncing(false);
    }
  }

  async function copyWebhookUrl() {
    if (!webhookUrl) return;
    await navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    toastInfo("Webhook URL copied");
    setTimeout(() => setCopied(false), 2000);
  }

  // ── Loading ──────────────────────────────────────────────────────────────

  if (loading)
    return (
      <div className="flex items-center gap-2 py-8 text-slate-400 dark:text-slate-500">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm">Loading integration settings…</span>
      </div>
    );

  // ── Form ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Config fields */}
      <div className="space-y-4">
        <Field
          label="Jira URL"
          hint={
            config.url && !urlLooksValid
              ? "Use the base site URL only — e.g. https://your-domain.atlassian.net"
              : undefined
          }
        >
          <TextInput
            value={config.url}
            onChange={set("url")}
            placeholder="https://your-domain.atlassian.net"
          />
        </Field>

        <Field label="Email">
          <TextInput
            value={config.email}
            onChange={set("email")}
            type="email"
          />
        </Field>

        <Field
          label="API Token"
          hint="Create in Atlassian Account → Security → API tokens"
        >
          <TextInput
            value={config.apiToken}
            onChange={set("apiToken")}
            type="password"
            placeholder="••••••••"
          />
        </Field>

        <Field label="Project Key">
          <TextInput
            value={config.projectKey}
            onChange={set("projectKey")}
            placeholder="SCRUM"
          />
        </Field>

        {/* Auto-sync toggle */}
        <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-950/60">
          <div>
            <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
              Auto-sync
            </p>
            <p className="text-xs text-slate-400 dark:text-slate-500">
              Sync Jira issue statuses automatically every hour
            </p>
          </div>
          <Switch
            checked={config.autoSync}
            onCheckedChange={(v) => set("autoSync")(v)}
          />
        </div>
      </div>

      {/* Webhook section — shown after save */}
      {integrationId && (
        <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-950/60">
          <div>
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              Webhook URL
            </p>
            <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">
              Add this in Jira → Project Settings → Automation → Webhooks to
              receive real-time status updates.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <input
              readOnly
              value={webhookUrl ?? ""}
              className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 font-mono text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
            />
            <button
              onClick={copyWebhookUrl}
              title="Copy webhook URL"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:border-slate-300 hover:text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-slate-600 dark:text-slate-400"
            >
              {copied ? (
                <CheckCircle className="h-4 w-4 text-emerald-500" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </button>
          </div>

          <Field
            label="Webhook Secret (optional)"
            hint={
              <>
                Jira will include this in{" "}
                <code className="rounded bg-slate-100 px-1 dark:bg-slate-800">
                  x-hub-signature-256
                </code>{" "}
                so your endpoint can verify requests are genuine.
              </>
            }
          >
            <TextInput
              value={config.webhookSecret}
              onChange={set("webhookSecret")}
              type="password"
              placeholder="Random string — set the same value in Jira"
            />
          </Field>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap items-center gap-2">
        <ActionBtn
          onClick={testConnection}
          disabled={!canConnect}
          loading={testing}
          variant="outline"
        >
          {testing ? "Testing…" : "Test connection"}
        </ActionBtn>
        <ActionBtn
          onClick={saveIntegration}
          disabled={!urlLooksValid}
          loading={saving}
        >
          {saving
            ? "Saving…"
            : integrationId
              ? "Update configuration"
              : "Save configuration"}
        </ActionBtn>
        {integrationId && (
          <ActionBtn onClick={syncNow} loading={syncing} variant="outline">
            <RefreshCw
              className={`h-3.5 w-3.5 ${syncing ? "animate-spin" : ""}`}
            />
            {syncing ? "Syncing…" : "Sync now"}
          </ActionBtn>
        )}
        {lastSynced && (
          <span className="ml-auto text-xs text-slate-400 dark:text-slate-500">
            Last synced {new Date(lastSynced).toLocaleString()}
          </span>
        )}
      </div>

      {/* Tracked issues */}
      {issues.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
              Tracked issues
              <span className="ml-2 font-mono text-xs text-slate-400 dark:text-slate-500">
                ({issues.length})
              </span>
            </h4>
          </div>
          <div className="max-h-72 space-y-2 overflow-y-auto">
            {issues.map((issue) => (
              <div
                key={issue.id}
                className="flex items-center gap-4 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-950/60"
              >
                <a
                  href={issue.external_issue_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex shrink-0 items-center gap-1 font-mono text-xs font-semibold text-cyan-600 hover:underline dark:text-cyan-400"
                >
                  {issue.external_issue_id}
                  <ExternalLink className="h-3 w-3" />
                </a>
                <span className="min-w-0 flex-1 truncate text-xs text-slate-500 dark:text-slate-400">
                  {issue.test_executions?.test_cases?.title ?? "—"}
                </span>
                <StatusChip status={issue.status} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
