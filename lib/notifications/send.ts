// lib/notifications/send.ts
import { Resend } from "resend";
import { createClient } from "@supabase/supabase-js";

const resend = new Resend(process.env.RESEND_API_KEY!);

const FROM_EMAIL =
  process.env.RESEND_FROM_EMAIL || "SynthQA <notifications@synthqa.app>";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

// ─── Types ────────────────────────────────────────────────────────────────────

export type NotificationEvent =
  | "run_completed"
  | "run_failed"
  | "automation_completed"
  | "weekly_summary";

interface UserPreferences {
  notifications?: {
    email?: boolean;
    push?: boolean;
    marketing?: boolean;
  };
}

interface RunCompletedPayload {
  event: "run_completed";
  userId: string;
  suiteName: string;
  suiteId: string;
  runNumber: number;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  duration: string;
  appUrl: string;
}

interface RunFailedPayload {
  event: "run_failed";
  userId: string;
  suiteName: string;
  suiteId: string;
  runNumber: number;
  totalTests: number;
  failedTests: number;
  failedCases: Array<{ title: string; reason: string | null }>;
  appUrl: string;
}

interface AutomationCompletedPayload {
  event: "automation_completed";
  userId: string;
  suiteName: string;
  suiteId: string;
  runNumber: number;
  framework: string;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  passRate: number;
  duration: string;
  appUrl: string;
}

interface WeeklySummaryPayload {
  event: "weekly_summary";
  userId: string;
  totalRuns: number;
  totalTests: number;
  overallPassRate: number;
  topFailingSuites: Array<{ name: string; failedCount: number }>;
  appUrl: string;
}

export type NotificationPayload =
  | RunCompletedPayload
  | RunFailedPayload
  | AutomationCompletedPayload
  | WeeklySummaryPayload;

// ─── Preference check ─────────────────────────────────────────────────────────

async function getUserEmail(
  userId: string,
): Promise<{ email: string; preferences: UserPreferences } | null> {
  const { data, error } = await supabase
    .from("user_profiles")
    .select("email, preferences")
    .eq("id", userId)
    .single();

  if (error || !data) return null;
  return { email: data.email, preferences: data.preferences ?? {} };
}

function shouldSendEmail(preferences: UserPreferences): boolean {
  return preferences?.notifications?.email !== false;
}

// ─── Email templates ──────────────────────────────────────────────────────────

function baseTemplate(content: string, appUrl: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f4f4f5; margin: 0; padding: 24px; }
    .card { background: #ffffff; border-radius: 12px; padding: 32px; max-width: 560px; margin: 0 auto; box-shadow: 0 1px 3px rgba(0,0,0,0.08); }
    .logo { font-size: 18px; font-weight: 700; color: #18181b; margin-bottom: 24px; }
    .logo span { color: #2563eb; }
    h2 { font-size: 20px; font-weight: 600; color: #18181b; margin: 0 0 8px; }
    p { font-size: 14px; color: #71717a; line-height: 1.6; margin: 0 0 16px; }
    .stat-row { display: flex; gap: 12px; margin: 20px 0; }
    .stat { flex: 1; background: #f4f4f5; border-radius: 8px; padding: 12px 16px; }
    .stat-value { font-size: 22px; font-weight: 700; color: #18181b; }
    .stat-label { font-size: 12px; color: #71717a; margin-top: 2px; }
    .stat.passed .stat-value { color: #16a34a; }
    .stat.failed .stat-value { color: #dc2626; }
    .btn { display: inline-block; background: #18181b; color: #ffffff; text-decoration: none; padding: 10px 20px; border-radius: 8px; font-size: 14px; font-weight: 500; margin-top: 8px; }
    .failure-item { background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 12px; margin-bottom: 8px; }
    .failure-title { font-size: 13px; font-weight: 600; color: #dc2626; }
    .failure-reason { font-size: 12px; color: #71717a; margin-top: 4px; white-space: pre-wrap; word-break: break-word; }
    .footer { text-align: center; font-size: 12px; color: #a1a1aa; margin-top: 24px; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 9999px; font-size: 11px; font-weight: 600; }
    .badge-green { background: #dcfce7; color: #16a34a; }
    .badge-red { background: #fee2e2; color: #dc2626; }
    .badge-blue { background: #dbeafe; color: #2563eb; }
  </style>
</head>
<body>
  <div class="card">
    <div class="logo">Synth<span>QA</span></div>
    ${content}
    <div class="footer">
      <p style="margin:0">You're receiving this because email notifications are enabled in your <a href="${appUrl}/settings" style="color:#2563eb">settings</a>.</p>
    </div>
  </div>
</body>
</html>`;
}

function runCompletedTemplate(p: RunCompletedPayload): {
  subject: string;
  html: string;
} {
  const passRate =
    p.totalTests > 0 ? Math.round((p.passedTests / p.totalTests) * 100) : 0;
  const statusBadge =
    p.failedTests === 0
      ? `<span class="badge badge-green">Passed</span>`
      : `<span class="badge badge-red">Failed</span>`;

  return {
    subject: `Test Run #${p.runNumber} ${p.failedTests === 0 ? "passed" : "failed"} — ${p.suiteName}`,
    html: baseTemplate(
      `
      <h2>Test Run #${p.runNumber} ${statusBadge}</h2>
      <p><strong>${p.suiteName}</strong> · ${p.duration}</p>
      <div class="stat-row">
        <div class="stat"><div class="stat-value">${p.totalTests}</div><div class="stat-label">Total</div></div>
        <div class="stat passed"><div class="stat-value">${p.passedTests}</div><div class="stat-label">Passed</div></div>
        <div class="stat failed"><div class="stat-value">${p.failedTests}</div><div class="stat-label">Failed</div></div>
        <div class="stat"><div class="stat-value">${passRate}%</div><div class="stat-label">Pass rate</div></div>
      </div>
      <a href="${p.appUrl}/automation" class="btn">View Results →</a>
    `,
      p.appUrl,
    ),
  };
}

function runFailedTemplate(p: RunFailedPayload): {
  subject: string;
  html: string;
} {
  const failureItems = p.failedCases
    .slice(0, 5)
    .map(
      (fc) => `
    <div class="failure-item">
      <div class="failure-title">${fc.title}</div>
      ${fc.reason ? `<div class="failure-reason">${fc.reason.slice(0, 300)}${fc.reason.length > 300 ? "..." : ""}</div>` : ""}
    </div>
  `,
    )
    .join("");

  const moreCount = p.failedCases.length - 5;

  return {
    subject: `⚠️ ${p.failedTests} test${p.failedTests > 1 ? "s" : ""} failed — ${p.suiteName} Run #${p.runNumber}`,
    html: baseTemplate(
      `
      <h2>Test Failures Detected</h2>
      <p><strong>${p.suiteName}</strong> · Run #${p.runNumber} · ${p.failedTests} of ${p.totalTests} tests failed</p>
      <div style="margin: 20px 0;">
        ${failureItems}
        ${moreCount > 0 ? `<p style="margin:8px 0 0; font-size:13px;">+ ${moreCount} more failure${moreCount > 1 ? "s" : ""}...</p>` : ""}
      </div>
      <a href="${p.appUrl}/automation" class="btn">View Full Report →</a>
    `,
      p.appUrl,
    ),
  };
}

function automationCompletedTemplate(p: AutomationCompletedPayload): {
  subject: string;
  html: string;
} {
  const statusBadge =
    p.failedTests === 0
      ? `<span class="badge badge-green">Passed</span>`
      : `<span class="badge badge-red">Failed</span>`;

  return {
    subject: `Automation Run #${p.runNumber} ${p.failedTests === 0 ? "passed" : "failed"} — ${p.suiteName}`,
    html: baseTemplate(
      `
      <h2>Automation Run Complete ${statusBadge}</h2>
      <p>
        <strong>${p.suiteName}</strong> · 
        <span class="badge badge-blue">${p.framework}</span> · 
        ${p.duration}
      </p>
      <div class="stat-row">
        <div class="stat"><div class="stat-value">${p.totalTests}</div><div class="stat-label">Total</div></div>
        <div class="stat passed"><div class="stat-value">${p.passedTests}</div><div class="stat-label">Passed</div></div>
        <div class="stat failed"><div class="stat-value">${p.failedTests}</div><div class="stat-label">Failed</div></div>
        <div class="stat"><div class="stat-value">${p.passRate}%</div><div class="stat-label">Pass rate</div></div>
      </div>
      <a href="${p.appUrl}/automation" class="btn">View Results →</a>
    `,
      p.appUrl,
    ),
  };
}

function weeklySummaryTemplate(p: WeeklySummaryPayload): {
  subject: string;
  html: string;
} {
  const failingSuitesHtml =
    p.topFailingSuites.length > 0
      ? p.topFailingSuites
          .map(
            (s) => `
        <div class="failure-item">
          <div class="failure-title">${s.name}</div>
          <div class="failure-reason">${s.failedCount} failure${s.failedCount > 1 ? "s" : ""} this week</div>
        </div>
      `,
          )
          .join("")
      : `<p style="color:#16a34a; font-weight:500;">🎉 No failures this week!</p>`;

  return {
    subject: `Your weekly testing summary — ${p.overallPassRate}% pass rate`,
    html: baseTemplate(
      `
      <h2>Weekly Testing Summary</h2>
      <p>Here's how your test suite performed over the last 7 days.</p>
      <div class="stat-row">
        <div class="stat"><div class="stat-value">${p.totalRuns}</div><div class="stat-label">Runs</div></div>
        <div class="stat"><div class="stat-value">${p.totalTests}</div><div class="stat-label">Tests run</div></div>
        <div class="stat passed"><div class="stat-value">${p.overallPassRate}%</div><div class="stat-label">Pass rate</div></div>
      </div>
      ${p.topFailingSuites.length > 0 ? `<p style="font-weight:600; margin-bottom:8px;">Top failing suites</p>` : ""}
      ${failingSuitesHtml}
      <a href="${p.appUrl}/dashboard" class="btn">View Dashboard →</a>
    `,
      p.appUrl,
    ),
  };
}

// ─── Main send function ───────────────────────────────────────────────────────

export async function sendNotification(
  payload: NotificationPayload,
): Promise<boolean> {
  try {
    const user = await getUserEmail(payload.userId);
    if (!user) {
      console.warn(`[notifications] User ${payload.userId} not found`);
      return false;
    }

    if (!shouldSendEmail(user.preferences)) {
      console.log(
        `[notifications] Email notifications disabled for ${payload.userId}`,
      );
      return false;
    }

    let email: { subject: string; html: string };

    switch (payload.event) {
      case "run_completed":
        email = runCompletedTemplate(payload);
        break;
      case "run_failed":
        email = runFailedTemplate(payload);
        break;
      case "automation_completed":
        email = automationCompletedTemplate(payload);
        break;
      case "weekly_summary":
        email = weeklySummaryTemplate(payload);
        break;
      default:
        console.warn("[notifications] Unknown event type");
        return false;
    }

    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: user.email,
      subject: email.subject,
      html: email.html,
    });

    if (error) {
      console.error("[notifications] Resend error:", error);
      return false;
    }

    console.log(`[notifications] ✅ Sent ${payload.event} to ${user.email}`);
    return true;
  } catch (err) {
    console.error("[notifications] Unexpected error:", err);
    return false;
  }
}
