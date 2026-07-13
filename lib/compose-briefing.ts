// lib/compose-briefing.ts
// Builds the "morning briefing" from raw stats.
//
// Strategy: compose a correct, deterministic briefing from rules first —
// it's free, instant, and never hallucinates numbers. Optionally pass the
// result through an LLM for tone polish (see polishWithLLM stub below), but
// the numbers always come from here, never from the model.

import type {
  DashboardBriefing,
  DashboardMetrics,
  FixQueueItem,
  CoverageGap,
} from "./dashboard-types";

function greeting(date = new Date()): string {
  const h = date.getHours();
  if (h < 12) return "Morning briefing";
  if (h < 18) return "Afternoon briefing";
  return "Evening briefing";
}

export function composeBriefing(
  metrics: DashboardMetrics,
  fixQueue: FixQueueItem[],
  gaps: CoverageGap[],
): DashboardBriefing {
  const parts: string[] = [];
  const actions: DashboardBriefing["actions"] = [];

  // 1. Health verdict — answer "is everything okay?" first.
  if (metrics.executions7d === 0) {
    parts.push(
      `No test runs yet this week. Your suite is ready — run it once to start tracking health.`,
    );
    actions.push({
      label: "Run the suite",
      actionId: "run-suite",
      emphasized: true,
    });
  } else if (metrics.passRatePct >= 90) {
    parts.push(
      `Your suite is mostly healthy — ${metrics.passRatePct}% passing across ${metrics.executions7d} runs this week.`,
    );
  } else if (metrics.passRatePct >= 70) {
    parts.push(
      `Your suite needs attention — ${metrics.passRatePct}% passing across ${metrics.executions7d} runs this week.`,
    );
  } else {
    parts.push(
      `Your suite is unhealthy — only ${metrics.passRatePct}% of ${metrics.executions7d} runs passed this week.`,
    );
  }

  // 2. The one thing to do today.
  const top = fixQueue[0];
  if (top) {
    const streak =
      top.consecutiveFails > 1
        ? ` has failed ${top.consecutiveFails} consecutive runs`
        : " failed in the latest run";
    const cluster =
      fixQueue.length > 1 &&
      fixQueue.filter((f) => f.severity !== "low").length > 1
        ? ` ${fixQueue.length - 1} other failure${fixQueue.length > 2 ? "s" : ""} may share the same root cause.`
        : "";
    parts.push(`One thing needs you today: "${top.title}"${streak}.${cluster}`);
    actions.push({
      label: `Diagnose "${truncate(top.title, 32)}"`,
      href: top.href,
      emphasized: true,
    });
  }

  // 3. Coverage nudge.
  if (gaps.length > 0) {
    const g = gaps[0];
    parts.push(
      `Coverage is at ${metrics.coveragePct}% — "${g.title}" has ${g.totalCriteria - g.coveredCriteria} uncovered acceptance criteria.`,
    );
    actions.push({
      label: "Generate tests for uncovered flows",
      href: g.generateHref,
    });
  } else if (metrics.coverageDeltaReqs && metrics.coverageDeltaReqs > 0) {
    parts.push(
      `Coverage rose to ${metrics.coveragePct}% (+${metrics.coverageDeltaReqs} requirements).`,
    );
  }

  if (metrics.openFailures > 0) {
    actions.push({ label: "Re-run failed only", actionId: "rerun-failed" });
  }

  return {
    headline: greeting(),
    body: parts.join(" "),
    actions: actions.slice(0, 3),
    generatedAt: new Date().toISOString(),
  };
}

function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}

/**
 * Optional: polish the deterministic briefing with Claude for warmer phrasing.
 * Call from a route handler or server action — never the client.
 * Keep the composed briefing as fallback if the call fails, and instruct the
 * model to rephrase only, never to change any numbers.
 */
// export async function polishWithLLM(briefing: DashboardBriefing): Promise<DashboardBriefing> {
//   const res = await anthropic.messages.create({
//     model: 'claude-haiku-4-5-20251001',
//     max_tokens: 300,
//     messages: [{
//       role: 'user',
//       content: `Rephrase this QA dashboard briefing to be warm and concise.
// Do not change, add, or remove any numbers or test names. Return only the rephrased text.\n\n${briefing.body}`,
//     }],
//   });
//   const text = res.content[0].type === 'text' ? res.content[0].text : briefing.body;
//   return { ...briefing, body: text };
// }
