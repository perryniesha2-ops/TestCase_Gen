"use client";

import { motion, useReducedMotion, type Variants } from "framer-motion";
import { MotionSection, sectionVariants, useViewportOnce } from "./motion";
import {
  FolderKanban,
  FileText,
  Sparkles,
  Layers,
  GitPullRequest,
  Zap,
} from "lucide-react";

const driftVariants = (i: number): Variants => {
  const origins = [
    { x: -80, y: -60 },
    { x: 0, y: -80 },
    { x: 80, y: -60 },
    { x: -80, y: 60 },
    { x: 0, y: 80 },
    { x: 80, y: 60 },
  ];
  const origin = origins[i % origins.length];
  return {
    hidden: {
      opacity: 0,
      x: origin.x,
      y: origin.y,
      scale: 0.85,
      rotate: i % 2 === 0 ? -4 : 4,
    },
    show: {
      opacity: 1,
      x: 0,
      y: 0,
      scale: 1,
      rotate: 0,
      transition: {
        duration: 0.7,
        delay: i * 0.08,
        ease: [0.16, 1, 0.3, 1],
      },
    },
  };
};

function JiraProgressBar() {
  return (
    <motion.div
      className="h-1.5 flex-1 rounded-full bg-gray-100 dark:bg-white/10 overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <motion.div
        className="h-full rounded-full bg-pink-400"
        initial={{ width: "0%" }}
        animate={{ width: ["0%", "100%", "0%"] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      />
    </motion.div>
  );
}

const steps = [
  {
    accent: "#38bdf8",
    step: "01",
    title: "Requirements with AI Parsing",
    desc: "Paste raw requirements, user stories, or specs. Our AI parses, structures, and improves them — flagging gaps and ambiguities before you write a single test.",
    mockup: (
      <div className="space-y-2">
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-white/8 dark:bg-white/4">
          <p className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-white/30 mb-1">
            Raw input
          </p>
          <p className="font-mono text-[11px] text-gray-600 dark:text-white/50">
            "User should be able to log in"
          </p>
        </div>
        <div className="flex justify-center">
          <div className="flex flex-col items-center gap-0.5">
            <div className="h-3 w-px bg-cyan-400/50" />
            <span className="text-[9px] text-cyan-500 font-medium">
              AI PARSING
            </span>
            <div className="h-3 w-px bg-cyan-400/50" />
          </div>
        </div>
        <div className="rounded-lg border border-cyan-200 bg-cyan-50/50 p-3 dark:border-cyan-400/20 dark:bg-cyan-400/5">
          <p className="text-[10px] uppercase tracking-wider text-cyan-600 dark:text-cyan-400 mb-1.5">
            Structured & improved
          </p>
          {[
            "Valid credentials → dashboard redirect",
            "Invalid password → error + lockout after 5x",
            "Empty fields → inline validation",
          ].map((r) => (
            <div key={r} className="flex items-start gap-1.5 mb-1">
              <div className="mt-1 h-1.5 w-1.5 rounded-full bg-cyan-400 flex-shrink-0" />
              <span className="text-[10px] text-gray-600 dark:text-white/60">
                {r}
              </span>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    accent: "#60a5fa",
    step: "02",
    title: "AI Test Case Generation",
    desc: "Generate structured test cases with steps, inputs, and assertions from your requirements. Choose standard or cross-platform coverage across web, mobile, API, accessibility, and performance.",
    mockup: (
      <div className="space-y-2">
        <div className="flex gap-1.5 mb-2">
          {["Standard", "Cross-Platform"].map((t, i) => (
            <span
              key={t}
              className={`rounded-full px-2.5 py-1 text-[10px] font-medium ${i === 0 ? "bg-blue-500/20 text-blue-600 dark:text-blue-400" : "border border-gray-200 text-gray-400 dark:border-white/10 dark:text-white/30"}`}
            >
              {t}
            </span>
          ))}
        </div>
        {[
          {
            name: "TC-001 Valid login flow",
            platform: "Web",
            status: "bg-green-400",
          },
          {
            name: "TC-002 Invalid password",
            platform: "Mobile",
            status: "bg-green-400",
          },
          {
            name: "TC-003 API auth endpoint",
            platform: "API",
            status: "bg-blue-400",
          },
          {
            name: "TC-004 Screen reader flow",
            platform: "A11y",
            status: "bg-purple-400",
          },
        ].map((tc) => (
          <div
            key={tc.name}
            className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 dark:border-white/8 dark:bg-white/5"
          >
            <div className={`h-1.5 w-1.5 rounded-full ${tc.status}`} />
            <span className="flex-1 text-[11px] text-gray-700 dark:text-white/70">
              {tc.name}
            </span>
            <span className="text-[9px] rounded-full border border-gray-200 px-1.5 py-0.5 text-gray-400 dark:border-white/10 dark:text-white/30">
              {tc.platform}
            </span>
          </div>
        ))}
      </div>
    ),
  },
  {
    accent: "#818cf8",
    step: "03",
    title: "Test Suites",
    desc: "Group test cases into suites by feature, sprint, or risk level. Track execution progress, pass rates, and requirement coverage across every suite.",
    mockup: (
      <div className="space-y-2">
        {[
          { name: "Authentication Suite", passed: 12, failed: 2, total: 14 },
          { name: "Checkout Suite", passed: 8, failed: 0, total: 8 },
          { name: "API Regression", passed: 18, failed: 3, total: 21 },
        ].map((suite) => {
          const pct = Math.round((suite.passed / suite.total) * 100);
          return (
            <div
              key={suite.name}
              className="rounded-lg border border-gray-200 bg-white p-3 dark:border-white/8 dark:bg-white/5"
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-medium text-gray-700 dark:text-white/70">
                  {suite.name}
                </span>
                <span
                  className={`text-[10px] font-semibold ${pct === 100 ? "text-green-500" : pct >= 80 ? "text-cyan-500" : "text-red-400"}`}
                >
                  {pct}%
                </span>
              </div>
              <div className="h-1 w-full rounded-full bg-gray-100 dark:bg-white/10 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-blue-400"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <div className="mt-1 flex gap-2">
                <span className="text-[9px] text-green-500">
                  {suite.passed} passed
                </span>
                {suite.failed > 0 && (
                  <span className="text-[9px] text-red-400">
                    {suite.failed} failed
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    ),
  },
  {
    accent: "#f472b6",
    step: "04",
    title: "Test Execution & Review",
    desc: "Run test cases manually or trigger automated suites. Log results in real time, capture evidence, and flag failures for immediate review.",
    mockup: (
      <div className="space-y-2">
        {/* Execution header */}
        <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-3 py-2 dark:border-white/8 dark:bg-white/5">
          <span className="text-[11px] font-medium text-gray-700 dark:text-white/70">
            Auth Suite — Run #14
          </span>
          <span className="flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-[9px] font-medium text-green-600 dark:bg-green-400/15 dark:text-green-400">
            <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
            Running
          </span>
        </div>

        {/* Test rows */}
        {[
          { name: "Valid login flow", status: "passed", time: "1.2s" },
          { name: "Invalid password", status: "passed", time: "0.8s" },
          { name: "Password reset OTP", status: "failed", time: "2.1s" },
          { name: "Session timeout", status: "running", time: "—" },
          { name: "2FA verification", status: "pending", time: "—" },
        ].map((t) => (
          <div
            key={t.name}
            className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 dark:border-white/8 dark:bg-white/5"
          >
            <div
              className={`h-2 w-2 flex-shrink-0 rounded-full ${
                t.status === "passed"
                  ? "bg-green-400"
                  : t.status === "failed"
                    ? "bg-red-400"
                    : t.status === "running"
                      ? "bg-pink-400 animate-pulse"
                      : "bg-gray-200 dark:bg-white/15"
              }`}
            />
            <span className="flex-1 text-[11px] text-gray-700 dark:text-white/70">
              {t.name}
            </span>
            <span
              className={`text-[9px] ${
                t.status === "passed"
                  ? "text-green-500"
                  : t.status === "failed"
                    ? "text-red-400"
                    : t.status === "running"
                      ? "text-pink-400"
                      : "text-gray-300 dark:text-white/20"
              }`}
            >
              {t.status === "running"
                ? "running..."
                : t.status === "pending"
                  ? "queued"
                  : t.time}
            </span>
          </div>
        ))}

        {/* Progress bar */}
        <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 dark:border-white/8 dark:bg-white/4">
          <div className="flex justify-between mb-1">
            <span className="text-[9px] text-gray-400 dark:text-white/30">
              Progress
            </span>
            <span className="text-[9px] text-gray-500 dark:text-white/40">
              3 / 5
            </span>
          </div>
          <div className="h-1 w-full rounded-full bg-gray-200 dark:bg-white/10 overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-pink-400 to-rose-400"
              initial={{ width: "0%" }}
              animate={{ width: "60%" }}
              transition={{ duration: 1, ease: [0.16, 1, 0.3, 1], delay: 0.5 }}
            />
          </div>
          <div className="mt-1.5 flex gap-3">
            <span className="text-[9px] text-green-500">2 passed</span>
            <span className="text-[9px] text-red-400">1 failed</span>
            <span className="text-[9px] text-gray-300 dark:text-white/20">
              2 pending
            </span>
          </div>
        </div>
      </div>
    ),
  },
  {
    icon: Zap,
    accent: "#34d399",
    step: "05",
    title: "Automation Generation & Export",
    desc: "Generate ready-to-run automation scripts from your test cases. Export to Playwright, Selenium, Cypress, or Puppeteer with one click.",
    mockup: (
      <div className="space-y-2">
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-white/8 dark:bg-white/4">
          <p className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-white/30 mb-2">
            Export as
          </p>
          <div className="grid grid-cols-2 gap-1.5">
            {[
              {
                name: "Playwright",
                color: "text-green-600 dark:text-green-400",
                bg: "bg-green-50 dark:bg-green-400/10 border-green-200 dark:border-green-400/20",
              },
              {
                name: "Cypress",
                color: "text-emerald-600 dark:text-emerald-400",
                bg: "bg-emerald-50 dark:bg-emerald-400/10 border-emerald-200 dark:border-emerald-400/20",
              },
              {
                name: "Selenium",
                color: "text-blue-600 dark:text-blue-400",
                bg: "bg-blue-50 dark:bg-blue-400/10 border-blue-200 dark:border-blue-400/20",
              },
              {
                name: "Puppeteer",
                color: "text-purple-600 dark:text-purple-400",
                bg: "bg-purple-50 dark:bg-purple-400/10 border-purple-200 dark:border-purple-400/20",
              },
            ].map((fw) => (
              <div
                key={fw.name}
                className={`rounded-lg border px-2.5 py-2 text-center ${fw.bg}`}
              >
                <span className={`text-[11px] font-semibold ${fw.color}`}>
                  {fw.name}
                </span>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-lg border border-gray-200 bg-gray-900 p-3 dark:border-white/8">
          <p className="font-mono text-[10px] text-green-400">
            {"// Generated by SynthQA"}
          </p>
          <p className="font-mono text-[10px] text-blue-300">
            {"test('valid login', async ({ page }) => {"}
          </p>
          <p className="font-mono text-[10px] text-white/60 pl-3">
            {"await page.goto('/login');"}
          </p>
          <p className="font-mono text-[10px] text-white/60 pl-3">
            {"await page.fill('#email', user);"}
          </p>
          <p className="font-mono text-[10px] text-blue-300">{"});"}</p>
        </div>
      </div>
    ),
  },
  {
    accent: "#fb923c",
    step: "06",
    title: "Custom Reporting",
    desc: "Build reports around the metrics that matter to your team. Track pass rates, coverage, flakiness, and automation health — or define your own.",
    mockup: (
      <div className="space-y-2">
        {/* Report builder header */}
        <div className="rounded-lg border border-gray-200 bg-white p-3 dark:border-white/8 dark:bg-white/5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-medium text-gray-700 dark:text-white/70">
              Sprint Health Report
            </span>
            <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[9px] font-medium text-orange-600 dark:bg-orange-400/15 dark:text-orange-400">
              Custom
            </span>
          </div>
          {/* Mini bar chart */}
          <div className="flex items-end gap-1 h-10 mb-1">
            {[65, 80, 72, 91, 88, 95].map((h, i) => (
              <div
                key={i}
                className="flex-1 rounded-sm"
                style={{
                  height: `${h}%`,
                  background: `linear-gradient(to top, #fb923c, #fbbf24)`,
                  opacity: 0.7 + i * 0.05,
                }}
              />
            ))}
          </div>
          <div className="flex justify-between">
            {["W1", "W2", "W3", "W4", "W5", "W6"].map((w) => (
              <span
                key={w}
                className="text-[8px] text-gray-400 dark:text-white/20"
              >
                {w}
              </span>
            ))}
          </div>
        </div>

        {/* Metric pills */}
        <div className="flex flex-wrap gap-1.5">
          {[
            { label: "Pass Rate", active: true },
            { label: "Coverage %", active: true },
            { label: "Flakiness", active: true },
            { label: "Avg Duration", active: false },
            { label: "Automation %", active: false },
          ].map((m) => (
            <span
              key={m.label}
              className={`rounded-full px-2 py-0.5 text-[9px] font-medium border ${
                m.active
                  ? "border-orange-300 bg-orange-50 text-orange-600 dark:border-orange-400/30 dark:bg-orange-400/10 dark:text-orange-400"
                  : "border-gray-200 bg-white text-gray-400 dark:border-white/10 dark:bg-white/4 dark:text-white/25"
              }`}
            >
              {m.active ? "✓ " : "+ "}
              {m.label}
            </span>
          ))}
        </div>

        {/* Summary stats */}
        <div className="grid grid-cols-3 gap-1.5">
          {[
            { label: "Pass Rate", value: "94%", delta: "+6%", up: true },
            { label: "Coverage", value: "87%", delta: "+12%", up: true },
            { label: "Flaky", value: "3", delta: "-2", up: true },
          ].map((s) => (
            <div
              key={s.label}
              className="rounded-lg border border-gray-200 bg-gray-50 p-2 dark:border-white/8 dark:bg-white/4"
            >
              <p className="text-[9px] text-gray-400 dark:text-white/30">
                {s.label}
              </p>
              <p className="text-[12px] font-bold text-gray-800 dark:text-white">
                {s.value}
              </p>
              <p className="text-[9px] text-green-500">{s.delta}</p>
            </div>
          ))}
        </div>
      </div>
    ),
  },
];

export function Features() {
  const { reduceMotion } = useViewportOnce();

  return (
    <MotionSection
      id="features"
      className="relative h-full w-full overflow-y-auto py-12"
      variants={sectionVariants}
      initial={reduceMotion ? false : "hidden"}
      animate={reduceMotion ? undefined : "show"}
    >
      {/* Section header */}
      <div className="mx-auto mb-10 max-w-7xl px-6 text-center">
        <h2 className="mt-4 text-balance text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl dark:text-white">
          From requirement to automation —{" "}
          <span
            className="bg-clip-text text-transparent"
            style={{
              backgroundImage:
                "linear-gradient(135deg, #60a5fa 0%, #38bdf8 50%, #22d3ee 100%)",
            }}
          >
            end to end.
          </span>
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-sm text-gray-500 dark:text-white/40">
          SynthQA handles your entire QA workflow — from raw specs to
          production-ready automation scripts.
        </p>
      </div>

      {/* Step grid — single map, no nesting */}
      <div className="mx-auto grid max-w-7xl gap-4 px-6 sm:grid-cols-2 lg:grid-cols-3">
        {steps.map((step, i) => {
          const Icon = step.icon;
          return (
            <motion.div
              key={step.title}
              variants={driftVariants(i)}
              initial={reduceMotion ? false : "hidden"}
              animate={reduceMotion ? undefined : "show"}
              whileHover={
                reduceMotion
                  ? undefined
                  : {
                      y: -4,
                      scale: 1.01,
                      transition: {
                        type: "spring",
                        stiffness: 300,
                        damping: 20,
                      },
                    }
              }
            >
              <div className="group relative h-full overflow-hidden rounded-2xl border border-gray-200 bg-white/80 p-5 backdrop-blur-sm transition-colors duration-300 hover:border-gray-300 hover:bg-white dark:border-white/8 dark:bg-white/4 dark:hover:border-white/15 dark:hover:bg-white/[0.07]">
                {/* Hover corner glow */}
                <div
                  className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full opacity-0 transition-opacity duration-500 group-hover:opacity-25"
                  style={{
                    background: `radial-gradient(circle, ${step.accent}, transparent 70%)`,
                    filter: "blur(20px)",
                  }}
                />

                {/* Top accent line */}
                <div
                  className="pointer-events-none absolute top-0 left-6 right-6 h-[1px] opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                  style={{
                    background: `linear-gradient(90deg, transparent, ${step.accent}80, transparent)`,
                  }}
                />

                {/* Header */}
                <div className="mb-4 flex items-start gap-3">
                  <div>
                    <p
                      className="text-[10px] font-bold uppercase tracking-[0.15em]"
                      style={{ color: step.accent }}
                    >
                      Step {step.step}
                    </p>
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                      {step.title}
                    </h3>
                  </div>
                </div>

                <p className="mb-4 text-xs leading-relaxed text-gray-500 dark:text-white/40">
                  {step.desc}
                </p>

                {/* Mockup */}
                <div className="rounded-xl border border-gray-100 bg-gray-50/80 p-3 dark:border-white/5 dark:bg-white/[0.02]">
                  {step.mockup}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      <div className="h-8" />
    </MotionSection>
  );
}
