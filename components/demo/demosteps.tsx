import { DemoStep } from "./productdemo";

// Reusable mock app shell
function AppShell({
  children,
  activeNav = "Dashboard",
}: {
  children: React.ReactNode;
  activeNav?: string;
}) {
  const navItems = [
    "Dashboard",
    "Requirements",
    "Test Cases",
    "Suites",
    "Automation",
  ];
  return (
    <div className="flex h-full w-full overflow-hidden bg-[#070d1a] font-sans text-white">
      {/* Sidebar */}
      <div className="flex w-48 flex-shrink-0 flex-col border-r border-white/8 bg-[#050b14] px-3 py-4">
        <div className="mb-6 px-2">
          <span className="text-sm font-bold text-white">SynthQA</span>
        </div>
        <nav className="space-y-0.5">
          {navItems.map((item) => (
            <div
              key={item}
              className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs transition-colors ${
                item === activeNav
                  ? "bg-cyan-500/15 text-cyan-400 font-medium"
                  : "text-white/40"
              }`}
            >
              <div
                className={`h-1.5 w-1.5 rounded-full ${item === activeNav ? "bg-cyan-400" : "bg-white/20"}`}
              />
              {item}
            </div>
          ))}
        </nav>
      </div>
      {/* Main */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <div className="flex h-10 items-center justify-between border-b border-white/8 bg-[#060c18] px-4">
          <span className="text-xs font-medium text-white/60">{activeNav}</span>
          <div className="flex items-center gap-2">
            <div className="h-5 w-5 rounded-full bg-cyan-500/20 border border-cyan-400/30" />
          </div>
        </div>
        <div className="flex-1 overflow-hidden p-4">{children}</div>
      </div>
    </div>
  );
}

export const demoSteps: DemoStep[] = [
  {
    title: "Create a project",
    description:
      "Start by creating a project from a template or scratch. All your requirements, test cases, and suites live here.",
    hotspot: { x: 72, y: 38 },
    tooltipSide: "bottom",
    screen: (
      <AppShell activeNav="Dashboard">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white">Projects</h2>
            <div className="flex items-center gap-2 rounded-lg bg-cyan-500 px-3 py-1.5 text-[11px] font-semibold text-white cursor-pointer">
              + New Project
            </div>
          </div>
          {[
            "E-Commerce Checkout",
            "Auth & Login Flow",
            "API Gateway Tests",
          ].map((p, i) => (
            <div
              key={p}
              className="flex items-center gap-3 rounded-xl border border-white/8 bg-white/4 px-4 py-3"
            >
              <div
                className="h-2 w-2 rounded-full"
                style={{ background: ["#38bdf8", "#60a5fa", "#818cf8"][i] }}
              />
              <span className="flex-1 text-xs text-white/70">{p}</span>
              <span className="text-[10px] text-white/30">
                {["12 reqs", "8 reqs", "24 reqs"][i]}
              </span>
            </div>
          ))}
        </div>
      </AppShell>
    ),
  },
  {
    title: "Paste your requirements",
    description:
      "Drop in raw user stories or specs. The AI parser structures and improves them automatically.",
    hotspot: { x: 55, y: 55 },
    tooltipSide: "right",
    screen: (
      <AppShell activeNav="Requirements">
        <div className="space-y-3">
          <div className="rounded-xl border border-white/8 bg-white/4 p-4">
            <p className="mb-2 text-[10px] uppercase tracking-wider text-white/30">
              Paste requirement
            </p>
            <div className="rounded-lg border border-white/10 bg-[#040d18] p-3 font-mono text-xs text-white/60">
              "As a user, I want to log in with email and password so I can
              access my dashboard."
            </div>
            <div className="mt-3 flex justify-end">
              <div className="rounded-lg bg-cyan-500 px-3 py-1.5 text-[11px] font-semibold text-white">
                Parse with AI →
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-cyan-400/20 bg-cyan-400/5 p-4">
            <p className="mb-2 text-[10px] uppercase tracking-wider text-cyan-400">
              AI Structured Output
            </p>
            {[
              "Valid credentials → dashboard redirect",
              "Invalid password → lockout after 5x",
              "Empty fields → inline validation",
            ].map((r) => (
              <div key={r} className="flex items-start gap-2 mb-1.5">
                <div className="mt-1 h-1.5 w-1.5 rounded-full bg-cyan-400 flex-shrink-0" />
                <span className="text-[11px] text-white/60">{r}</span>
              </div>
            ))}
          </div>
        </div>
      </AppShell>
    ),
  },
  {
    title: "Generate test cases",
    description:
      "One click generates structured test cases with steps, inputs, and assertions — standard or cross-platform.",
    hotspot: { x: 80, y: 28 },
    tooltipSide: "left",
    screen: (
      <AppShell activeNav="Test Cases">
        <div className="space-y-2">
          <div className="flex items-center justify-between mb-3">
            <div className="flex gap-1.5">
              {["Standard", "Cross-Platform"].map((t, i) => (
                <span
                  key={t}
                  className={`rounded-full px-3 py-1 text-[11px] font-medium ${i === 0 ? "bg-blue-500/20 text-blue-400" : "border border-white/10 text-white/30"}`}
                >
                  {t}
                </span>
              ))}
            </div>
            <div className="rounded-lg bg-cyan-500 px-3 py-1.5 text-[11px] font-semibold text-white">
              Generate Cases
            </div>
          </div>
          {[
            {
              name: "TC-001 Valid login flow",
              platform: "Web",
              color: "bg-green-400",
            },
            {
              name: "TC-002 Invalid password – lockout",
              platform: "Web",
              color: "bg-green-400",
            },
            {
              name: "TC-003 Empty fields validation",
              platform: "Mobile",
              color: "bg-green-400",
            },
            {
              name: "TC-004 API auth endpoint",
              platform: "API",
              color: "bg-blue-400",
            },
          ].map((tc) => (
            <div
              key={tc.name}
              className="flex items-center gap-3 rounded-xl border border-white/8 bg-white/4 px-4 py-2.5"
            >
              <div className={`h-1.5 w-1.5 rounded-full ${tc.color}`} />
              <span className="flex-1 text-xs text-white/70">{tc.name}</span>
              <span className="text-[9px] rounded-full border border-white/10 px-2 py-0.5 text-white/30">
                {tc.platform}
              </span>
            </div>
          ))}
        </div>
      </AppShell>
    ),
  },
  {
    title: "Organize into suites",
    description:
      "Group test cases into suites by feature or sprint. Track pass rates and requirement coverage in real time.",
    hotspot: { x: 50, y: 60 },
    tooltipSide: "top",
    screen: (
      <AppShell activeNav="Suites">
        <div className="space-y-3">
          {[
            { name: "Authentication Suite", passed: 12, failed: 2, total: 14 },
            { name: "Checkout Suite", passed: 8, failed: 0, total: 8 },
            { name: "API Regression", passed: 18, failed: 3, total: 21 },
          ].map((suite) => {
            const pct = Math.round((suite.passed / suite.total) * 100);
            return (
              <div
                key={suite.name}
                className="rounded-xl border border-white/8 bg-white/4 p-4"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-white/80">
                    {suite.name}
                  </span>
                  <span
                    className={`text-xs font-bold ${pct === 100 ? "text-green-400" : "text-cyan-400"}`}
                  >
                    {pct}%
                  </span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-blue-400"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <div className="mt-1.5 flex gap-3 text-[10px]">
                  <span className="text-green-400">{suite.passed} passed</span>
                  {suite.failed > 0 && (
                    <span className="text-red-400">{suite.failed} failed</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </AppShell>
    ),
  },
  {
    title: "Export automation scripts",
    description:
      "Generate Playwright, Cypress, Selenium, or Puppeteer scripts from your test cases with one click.",
    hotspot: { x: 65, y: 75 },
    tooltipSide: "top",
    screen: (
      <AppShell activeNav="Automation">
        <div className="space-y-3">
          <div className="grid grid-cols-4 gap-2 mb-3">
            {[
              {
                name: "Playwright",
                color: "text-green-400 border-green-400/30 bg-green-400/10",
              },
              {
                name: "Cypress",
                color:
                  "text-emerald-400 border-emerald-400/30 bg-emerald-400/10",
              },
              {
                name: "Selenium",
                color: "text-blue-400 border-blue-400/30 bg-blue-400/10",
              },
              {
                name: "Puppeteer",
                color: "text-purple-400 border-purple-400/30 bg-purple-400/10",
              },
            ].map((fw) => (
              <div
                key={fw.name}
                className={`rounded-lg border px-2 py-2 text-center text-[11px] font-semibold ${fw.color}`}
              >
                {fw.name}
              </div>
            ))}
          </div>
          <div className="rounded-xl border border-white/8 bg-[#040d18] p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] text-white/30 uppercase tracking-wider">
                Generated script
              </span>
              <div className="rounded-md bg-cyan-500 px-2.5 py-1 text-[10px] font-semibold text-white">
                Export →
              </div>
            </div>
            <div className="font-mono text-[11px] space-y-0.5">
              <p className="text-green-400">{"// Generated by SynthQA"}</p>
              <p className="text-blue-300">
                {"test('valid login', async ({ page }) => {"}
              </p>
              <p className="text-white/50 pl-4">
                {"await page.goto('/login');"}
              </p>
              <p className="text-white/50 pl-4">
                {"await page.fill('#email', 'user@test.com');"}
              </p>
              <p className="text-white/50 pl-4">
                {"await page.fill('#password', 'pass123');"}
              </p>
              <p className="text-white/50 pl-4">
                {"await page.click('[data-testid=\"login-btn\"]');"}
              </p>
              <p className="text-white/50 pl-4">
                {"await expect(page).toHaveURL('/dashboard');"}
              </p>
              <p className="text-blue-300">{"});"}</p>
            </div>
          </div>
        </div>
      </AppShell>
    ),
  },
];
