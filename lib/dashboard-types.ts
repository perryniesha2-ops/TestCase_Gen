// lib/dashboard-types.ts
// Data contracts for the QA Vault dashboard.
// Populate these from Supabase in a server component / route handler,
// then pass down as props. Components never touch the database directly.

export type FailureSeverity = "high" | "medium" | "low";

export interface DashboardMetrics {
  passRatePct: number; // 0–100
  executions7d: number;
  coveragePct: number; // 0–100
  openFailures: number;
  highPriorityFailures: number;
  avgRunSeconds: number;
  /** Optional deltas vs previous period; omit to hide the delta chip. */
  passRateDeltaPct?: number;
  executionsDelta?: number;
  coverageDeltaReqs?: number;
}

export interface BriefingAction {
  label: string;
  /** Route to push or action id your client handler switches on. */
  href?: string;
  actionId?: string;
  emphasized?: boolean;
}

export interface DashboardBriefing {
  headline: string; // "Your suite is mostly healthy — 94% passing"
  body: string; // 2–3 sentences, plain language
  actions: BriefingAction[];
  generatedAt: string; // ISO timestamp
}

export interface FixQueueItem {
  id: string;
  title: string; // test case title
  reason: string; // why it's ranked here ("Blocks 12 downstream tests")
  severity: FailureSeverity;
  consecutiveFails: number;
  flakyScore?: number; // 0–1
  href: string; // deep link to the failure detail
}

export interface CoverageGap {
  requirementId: string;
  title: string;
  coveredCriteria: number;
  totalCriteria: number;
  /** Pre-filled generate-tests link, e.g. /generate?requirement=... */
  generateHref: string;
}

export interface OnboardingStep {
  id: string;
  label: string;
  done: boolean;
  href: string;
}

export interface DashboardData {
  projectName: string;
  lastRunAt: string | null; // ISO or null if never run
  metrics: DashboardMetrics;
  briefing: DashboardBriefing;
  fixQueue: FixQueueItem[];
  coverageGaps: CoverageGap[];
  /** When present and incomplete, the dashboard swaps the fix queue
      for the onboarding checklist (empty-state mode). */
  onboarding?: OnboardingStep[];
}
