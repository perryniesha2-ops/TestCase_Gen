// lib/notifications/send.ts
import { Resend } from "resend";
import { createClient } from "@supabase/supabase-js";

// ─── Shared design system (matches lib/email-service.ts) ──────────────────────

const EMAIL_STYLES = `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
    line-height: 1.6;
    color: #1e293b;
    background-color: #f8fafc;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }
  .email-wrapper {
    max-width: 600px;
    margin: 0 auto;
    background-color: #f8fafc;
    padding: 40px 20px;
  }
  .email-container {
    background: #ffffff;
    border-radius: 16px;
    overflow: hidden;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
    border: 1px solid #e2e8f0;
  }
  .email-header {
    background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
    padding: 40px 32px;
    text-align: center;
    border-bottom: 3px solid #14b8a6;
  }
  .logo-container {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
    margin-bottom: 16px;
  }
  .logo-text {
    color: #ffffff;
    font-size: 32px;
    font-weight: 700;
    letter-spacing: -0.02em;
  }
  .header-subtitle {
    color: #94a3b8;
    font-size: 15px;
    margin-top: 8px;
    font-weight: 500;
  }
  .email-content {
    padding: 48px 32px;
    background: #ffffff;
  }
  .greeting {
    font-size: 18px;
    color: #1e293b;
    margin-bottom: 24px;
    font-weight: 600;
  }
  .body-text {
    font-size: 16px;
    color: #475569;
    line-height: 1.7;
    margin-bottom: 20px;
  }
  .button-container {
    text-align: center;
    margin: 40px 0;
  }
  .button {
    display: inline-block;
    background: #14b8a6;
    color: #ffffff;
    text-decoration: none;
    padding: 16px 40px;
    border-radius: 10px;
    font-weight: 600;
    font-size: 16px;
    box-shadow: 0 4px 6px -1px rgba(20, 184, 166, 0.3);
  }
  .stat-row {
    display: flex;
    gap: 12px;
    margin: 24px 0;
  }
  .stat {
    flex: 1;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    padding: 16px;
    text-align: center;
  }
  .stat-value {
    font-size: 24px;
    font-weight: 700;
    color: #1e293b;
  }
  .stat-label {
    font-size: 12px;
    color: #64748b;
    margin-top: 4px;
    font-weight: 500;
  }
  .stat.passed .stat-value { color: #0d9488; }
  .stat.failed .stat-value  { color: #dc2626; }
  .info-box {
    background: #f1f5f9;
    border-left: 4px solid #14b8a6;
    padding: 20px;
    border-radius: 8px;
    margin: 28px 0;
  }
  .info-box-title {
    font-weight: 600;
    color: #0f172a;
    margin-bottom: 8px;
    font-size: 15px;
  }
  .info-box-text {
    color: #475569;
    font-size: 14px;
    line-height: 1.6;
  }
  .warning-box {
    background: #fef3c7;
    border-left: 4px solid #f59e0b;
    padding: 20px;
    border-radius: 8px;
    margin: 28px 0;
  }
  .warning-box-title {
    font-weight: 600;
    color: #92400e;
    margin-bottom: 8px;
    font-size: 15px;
  }
  .warning-box-text {
    color: #78350f;
    font-size: 14px;
    line-height: 1.6;
  }
  .failure-item {
    background: #fef2f2;
    border: 1px solid #fecaca;
    border-radius: 8px;
    padding: 16px;
    margin-bottom: 10px;
  }
  .failure-title {
    font-size: 14px;
    font-weight: 600;
    color: #dc2626;
  }
  .failure-reason {
    font-size: 13px;
    color: #475569;
    margin-top: 6px;
    white-space: pre-wrap;
    word-break: break-word;
    line-height: 1.5;
  }
  .badge {
    display: inline-block;
    padding: 3px 10px;
    border-radius: 9999px;
    font-size: 12px;
    font-weight: 600;
  }
  .badge-green { background: #ccfbf1; color: #0d9488; }
  .badge-red   { background: #fee2e2; color: #dc2626; }
  .badge-blue  { background: #dbeafe; color: #2563eb; }
  .divider {
    height: 1px;
    background: #e2e8f0;
    margin: 32px 0;
  }
  .suite-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 0;
    border-bottom: 1px solid #f1f5f9;
    font-size: 14px;
    color: #475569;
  }
  .suite-row:last-child { border-bottom: none; }
  .suite-name { font-weight: 500; color: #1e293b; }
  .suite-count { color: #dc2626; font-weight: 600; }
  .email-footer {
    background: #f8fafc;
    padding: 32px;
    text-align: center;
    border-top: 1px solid #e2e8f0;
  }
  .footer-text {
    color: #64748b;
    font-size: 14px;
    line-height: 1.6;
    margin: 6px 0;
  }
  .footer-brand {
    font-weight: 600;
    color: #1e293b;
    font-size: 15px;
  }
`;

const LOGO_SVG = `
<svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="48" height="48" rx="10" fill="#14b8a6"/>
  <path d="M14 18L24 12L34 18V30L24 36L14 30V18Z" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M14 18L24 24M24 24L34 18M24 24V36" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

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

// ─── Lazy clients (matches email-service.ts pattern) ──────────────────────────

function getResend(): Resend {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("RESEND_API_KEY is not configured");
  return new Resend(apiKey);
}

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

const FROM_EMAIL =
  process.env.RESEND_FROM_EMAIL || "SynthQA <notify@synthqa.app>";

// ─── Preference check ─────────────────────────────────────────────────────────

async function getUserEmail(
  userId: string,
): Promise<{ email: string; preferences: UserPreferences } | null> {
  const { data, error } = await getSupabase()
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

// ─── Base template (matches email-service.ts layout exactly) ──────────────────

function baseTemplate(content: string, appUrl: string, title: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} - SynthQA</title>
  <style>${EMAIL_STYLES}</style>
</head>
<body>
  <div class="email-wrapper">
    <div class="email-container">
      <div class="email-header">
        <div class="logo-container">
          ${LOGO_SVG}
          <div class="logo-text">SynthQA</div>
        </div>
        <div class="header-subtitle">AI-Powered Test Case Generator</div>
      </div>

      <div class="email-content">
        ${content}
      </div>

      <div class="email-footer">
        <p class="footer-brand">SynthQA</p>
        <p class="footer-text">AI-Powered Test Case Generator</p>
        <p class="footer-text">
          You're receiving this because email notifications are enabled in your
          <a href="${appUrl}/settings" style="color: #14b8a6; text-decoration: none;">settings</a>.
        </p>
        <p class="footer-text">© ${new Date().getFullYear()} SynthQA. All rights reserved.</p>
      </div>
    </div>
  </div>
</body>
</html>`;
}

// ─── Email templates ──────────────────────────────────────────────────────────

function runCompletedTemplate(p: RunCompletedPayload): {
  subject: string;
  html: string;
} {
  const passRate =
    p.totalTests > 0 ? Math.round((p.passedTests / p.totalTests) * 100) : 0;
  const passed = p.failedTests === 0;
  const statusBadge = passed
    ? `<span class="badge badge-green">All Passed</span>`
    : `<span class="badge badge-red">${p.failedTests} Failed</span>`;

  const content = `
    <div class="greeting">Test Run #${p.runNumber} Complete ${statusBadge}</div>

    <p class="body-text">
      <strong>${p.suiteName}</strong> finished in ${p.duration}.
    </p>

    <div class="stat-row">
      <div class="stat">
        <div class="stat-value">${p.totalTests}</div>
        <div class="stat-label">Total</div>
      </div>
      <div class="stat passed">
        <div class="stat-value">${p.passedTests}</div>
        <div class="stat-label">Passed</div>
      </div>
      <div class="stat failed">
        <div class="stat-value">${p.failedTests}</div>
        <div class="stat-label">Failed</div>
      </div>
      <div class="stat">
        <div class="stat-value">${passRate}%</div>
        <div class="stat-label">Pass Rate</div>
      </div>
    </div>

    ${
      passed
        ? `<div class="info-box">
            <div class="info-box-title">🎉 Great job!</div>
            <div class="info-box-text">All tests passed. Your suite is looking healthy.</div>
           </div>`
        : `<div class="warning-box">
            <div class="warning-box-title">⚠️ Some tests need attention</div>
            <div class="warning-box-text">${p.failedTests} test${p.failedTests > 1 ? "s" : ""} failed. View the full report for details.</div>
           </div>`
    }

    <div class="button-container">
      <a href="${p.appUrl}/automation" class="button">View Results →</a>
    </div>
  `;

  return {
    subject: `Test Run #${p.runNumber} ${passed ? "passed ✓" : "failed ✗"} — ${p.suiteName}`,
    html: baseTemplate(content, p.appUrl, `Test Run #${p.runNumber}`),
  };
}

function runFailedTemplate(p: RunFailedPayload): {
  subject: string;
  html: string;
} {
  const shown = p.failedCases.slice(0, 5);
  const moreCount = p.failedCases.length - shown.length;

  const failureItems = shown
    .map(
      (fc) => `
    <div class="failure-item">
      <div class="failure-title">${fc.title}</div>
      ${fc.reason ? `<div class="failure-reason">${fc.reason.slice(0, 300)}${fc.reason.length > 300 ? "…" : ""}</div>` : ""}
    </div>`,
    )
    .join("");

  const content = `
    <div class="greeting">⚠️ Test Failures Detected</div>

    <p class="body-text">
      <strong>${p.suiteName}</strong> · Run #${p.runNumber} ·
      ${p.failedTests} of ${p.totalTests} tests failed.
    </p>

    <div style="margin: 24px 0;">
      ${failureItems}
      ${moreCount > 0 ? `<p class="body-text" style="margin-top: 12px;">+ ${moreCount} more failure${moreCount > 1 ? "s" : ""}…</p>` : ""}
    </div>

    <div class="button-container">
      <a href="${p.appUrl}/automation" class="button">View Full Report →</a>
    </div>

    <div class="info-box">
      <div class="info-box-title">💡 Need help debugging?</div>
      <div class="info-box-text">
        Open the report to see full stack traces and step-by-step screenshots for each failure.
      </div>
    </div>
  `;

  return {
    subject: `⚠️ ${p.failedTests} test${p.failedTests > 1 ? "s" : ""} failed — ${p.suiteName} Run #${p.runNumber}`,
    html: baseTemplate(content, p.appUrl, "Test Failures Detected"),
  };
}

function automationCompletedTemplate(p: AutomationCompletedPayload): {
  subject: string;
  html: string;
} {
  const passed = p.failedTests === 0;
  const statusBadge = passed
    ? `<span class="badge badge-green">All Passed</span>`
    : `<span class="badge badge-red">${p.failedTests} Failed</span>`;

  const content = `
    <div class="greeting">Automation Run #${p.runNumber} Complete ${statusBadge}</div>

    <p class="body-text">
      <strong>${p.suiteName}</strong> ·
      <span class="badge badge-blue">${p.framework}</span> ·
      ${p.duration}
    </p>

    <div class="stat-row">
      <div class="stat">
        <div class="stat-value">${p.totalTests}</div>
        <div class="stat-label">Total</div>
      </div>
      <div class="stat passed">
        <div class="stat-value">${p.passedTests}</div>
        <div class="stat-label">Passed</div>
      </div>
      <div class="stat failed">
        <div class="stat-value">${p.failedTests}</div>
        <div class="stat-label">Failed</div>
      </div>
      <div class="stat">
        <div class="stat-value">${p.passRate}%</div>
        <div class="stat-label">Pass Rate</div>
      </div>
    </div>

    ${
      passed
        ? `<div class="info-box">
            <div class="info-box-title">🎉 Clean run!</div>
            <div class="info-box-text">All ${p.totalTests} tests passed with ${p.framework}.</div>
           </div>`
        : `<div class="warning-box">
            <div class="warning-box-title">⚠️ Failures found</div>
            <div class="warning-box-text">${p.failedTests} test${p.failedTests > 1 ? "s" : ""} failed. Check the report for details.</div>
           </div>`
    }

    <div class="button-container">
      <a href="${p.appUrl}/automation" class="button">View Results →</a>
    </div>
  `;

  return {
    subject: `Automation Run #${p.runNumber} ${passed ? "passed ✓" : "failed ✗"} — ${p.suiteName}`,
    html: baseTemplate(content, p.appUrl, `Automation Run #${p.runNumber}`),
  };
}

function weeklySummaryTemplate(p: WeeklySummaryPayload): {
  subject: string;
  html: string;
} {
  const failingSuitesHtml =
    p.topFailingSuites.length > 0
      ? `
        <p class="body-text" style="font-weight: 600; margin-bottom: 8px;">Top failing suites</p>
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 8px 16px; margin-bottom: 24px;">
          ${p.topFailingSuites
            .map(
              (s) => `
            <div class="suite-row">
              <span class="suite-name">${s.name}</span>
              <span class="suite-count">${s.failedCount} failure${s.failedCount > 1 ? "s" : ""}</span>
            </div>`,
            )
            .join("")}
        </div>`
      : `<div class="info-box">
          <div class="info-box-title">🎉 Perfect week!</div>
          <div class="info-box-text">No test failures recorded this week. Keep it up!</div>
         </div>`;

  const content = `
    <div class="greeting">Your Weekly Testing Summary</div>

    <p class="body-text">Here's how your test suite performed over the last 7 days.</p>

    <div class="stat-row">
      <div class="stat">
        <div class="stat-value">${p.totalRuns}</div>
        <div class="stat-label">Runs</div>
      </div>
      <div class="stat">
        <div class="stat-value">${p.totalTests}</div>
        <div class="stat-label">Tests Run</div>
      </div>
      <div class="stat passed">
        <div class="stat-value">${p.overallPassRate}%</div>
        <div class="stat-label">Pass Rate</div>
      </div>
    </div>

    ${failingSuitesHtml}

    <div class="button-container">
      <a href="${p.appUrl}/dashboard" class="button">View Dashboard →</a>
    </div>
  `;

  return {
    subject: `Your weekly testing summary — ${p.overallPassRate}% pass rate`,
    html: baseTemplate(content, p.appUrl, "Weekly Testing Summary"),
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

    const { error } = await getResend().emails.send({
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
