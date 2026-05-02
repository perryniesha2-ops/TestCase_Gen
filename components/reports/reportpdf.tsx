// components/reports/ReportPDF.tsx
// Server-safe: no window/document references, no CSS variables.
// Uses @react-pdf/renderer SVG primitives for all charts.

import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Svg,
  Circle,
  Rect,
  Line,
  Path,
  G,
  Defs,
  LinearGradient,
  Stop,
} from "@react-pdf/renderer";
import type { ReportPDFData, ReportPDFSection } from "@/types/pdf";

// ─── Design tokens ────────────────────────────────────────────────────────────

const C = {
  indigo: "#4f46e5",
  indigoLight: "#c7d2fe",
  green: "#16a34a",
  greenLight: "#dcfce7",
  red: "#dc2626",
  redLight: "#fee2e2",
  amber: "#d97706",
  amberLight: "#fef3c7",
  blue: "#3b82f6",
  slate900: "#0f172a",
  slate700: "#334155",
  slate500: "#64748b",
  slate300: "#cbd5e1",
  slate100: "#f1f5f9",
  white: "#ffffff",
  orange: "#ea580c",
  gray: "#9ca3af",
  purple: "#6366f1",
};

const PIE_COLORS = [C.green, C.red, C.amber, C.gray, C.purple];

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    backgroundColor: C.white,
    paddingBottom: 36,
  },
  // Header
  header: {
    backgroundColor: C.indigo,
    paddingHorizontal: 28,
    paddingTop: 22,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: "Helvetica-Bold",
    color: C.white,
  },
  headerSub: {
    fontSize: 9,
    color: C.indigoLight,
    marginTop: 4,
  },
  // Body
  body: {
    paddingHorizontal: 28,
    paddingTop: 18,
  },
  // Section
  sectionTitle: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: C.slate500,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: 6,
    marginTop: 14,
  },
  divider: {
    borderBottomWidth: 0.5,
    borderBottomColor: C.slate300,
    marginBottom: 10,
  },
  // Stat cards
  cardRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 4,
  },
  card: {
    flex: 1,
    backgroundColor: C.slate100,
    borderRadius: 6,
    padding: 10,
  },
  cardLabel: {
    fontSize: 7,
    color: C.slate500,
    marginBottom: 4,
  },
  cardValue: {
    fontSize: 18,
    fontFamily: "Helvetica-Bold",
    color: C.slate900,
  },
  cardSub: {
    fontSize: 7,
    color: C.slate500,
    marginTop: 3,
  },
  // Progress bar
  progressTrack: {
    height: 5,
    backgroundColor: C.slate300,
    borderRadius: 3,
    marginTop: 4,
    overflow: "hidden",
  },
  // KV row
  kvRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 3,
    borderBottomWidth: 0.3,
    borderBottomColor: C.slate100,
  },
  kvLabel: { fontSize: 8.5, color: C.slate500 },
  kvValue: { fontSize: 8.5, fontFamily: "Helvetica-Bold", color: C.slate900 },
  // Table
  tableHeader: {
    flexDirection: "row",
    backgroundColor: C.indigo,
    borderRadius: 4,
    paddingVertical: 5,
    paddingHorizontal: 6,
    marginBottom: 1,
  },
  tableHeaderCell: {
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    color: C.white,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderBottomWidth: 0.3,
    borderBottomColor: C.slate100,
  },
  tableRowAlt: {
    backgroundColor: C.slate100,
  },
  tableCell: {
    fontSize: 8,
    color: C.slate700,
    maxLines: 1,
  },
  // Chart card
  chartCard: {
    backgroundColor: C.white,
    borderWidth: 0.5,
    borderColor: C.slate300,
    borderRadius: 6,
    padding: 12,
    marginBottom: 10,
  },
  chartTitle: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: C.slate700,
    marginBottom: 2,
  },
  chartSub: {
    fontSize: 7.5,
    color: C.slate500,
    marginBottom: 8,
  },
  // Footer
  footer: {
    position: "absolute",
    bottom: 14,
    left: 28,
    right: 28,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  footerText: {
    fontSize: 7,
    color: C.slate300,
  },
  // Two-col layout
  twoCol: {
    flexDirection: "row",
    gap: 10,
  },
  col: { flex: 1 },
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function progressColor(pct: number): string {
  if (pct >= 80) return C.green;
  if (pct >= 60) return C.amber;
  return C.red;
}

function ProgressBar({ pct, color }: { pct: number; color?: string }) {
  const c = color ?? progressColor(pct);
  return (
    <View style={s.progressTrack}>
      <View
        style={{
          width: `${Math.min(100, Math.max(0, pct))}%`,
          height: 5,
          backgroundColor: c,
          borderRadius: 3,
        }}
      />
    </View>
  );
}

function KVRow({
  label,
  value,
  valueColor,
}: {
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <View style={s.kvRow}>
      <Text style={s.kvLabel}>{label}</Text>
      <Text style={[s.kvValue, valueColor ? { color: valueColor } : {}]}>
        {value}
      </Text>
    </View>
  );
}

function SectionTitle({ children }: { children: string }) {
  return (
    <>
      <Text style={s.sectionTitle}>{children}</Text>
      <View style={s.divider} />
    </>
  );
}

// ─── Pie chart ────────────────────────────────────────────────────────────────

function PieChart({
  slices,
  size = 120,
}: {
  slices: { label: string; value: number; color: string }[];
  size?: number;
}) {
  const total = slices.reduce((s, d) => s + d.value, 0);
  if (total === 0) return null;

  const r = size / 2 - 8;
  const cx = size / 2;
  const cy = size / 2;

  // Build arc paths
  const arcs: {
    path: string;
    color: string;
    midAngle: number;
    pct: number;
    label: string;
  }[] = [];
  let startAngle = -Math.PI / 2;

  slices.forEach((slice) => {
    if (slice.value === 0) return;
    const pct = slice.value / total;
    const angle = pct * 2 * Math.PI;
    const endAngle = startAngle + angle;
    const midAngle = startAngle + angle / 2;

    const x1 = cx + r * Math.cos(startAngle);
    const y1 = cy + r * Math.sin(startAngle);
    const x2 = cx + r * Math.cos(endAngle);
    const y2 = cy + r * Math.sin(endAngle);
    const largeArc = angle > Math.PI ? 1 : 0;

    const path = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`;
    arcs.push({ path, color: slice.color, midAngle, pct, label: slice.label });
    startAngle = endAngle;
  });

  // Legend
  const legendItems = slices.filter((s) => s.value > 0);

  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
      <Svg width={size} height={size}>
        {arcs.map((arc, i) => (
          <Path
            key={i}
            d={arc.path}
            fill={arc.color}
            stroke={C.white}
            strokeWidth={1}
          />
        ))}
        {/* Donut hole */}
        <Circle cx={cx} cy={cy} r={r * 0.42} fill={C.white} />
        {/* Center label */}
        <G>
          <Path
            d={`M ${cx - 12} ${cy + 3} L ${cx + 12} ${cy + 3}`}
            stroke="transparent"
          />
        </G>
      </Svg>
      {/* Legend */}
      <View style={{ gap: 5 }}>
        {legendItems.map((item, i) => {
          const pct = Math.round((item.value / total) * 100);
          return (
            <View
              key={i}
              style={{ flexDirection: "row", alignItems: "center", gap: 5 }}
            >
              <View
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: item.color,
                }}
              />
              <Text style={{ fontSize: 7.5, color: C.slate700 }}>
                {item.label}: {item.value} ({pct}%)
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

// ─── Line chart ───────────────────────────────────────────────────────────────

function LineChart({
  data,
  width = 480,
  height = 120,
}: {
  data: Array<{ date: string; passed: number; failed: number }>;
  width?: number;
  height?: number;
}) {
  if (data.length === 0) return null;

  const PAD = { top: 10, right: 10, bottom: 24, left: 28 };
  const W = width - PAD.left - PAD.right;
  const H = height - PAD.top - PAD.bottom;

  const allVals = data.flatMap((d) => [d.passed, d.failed]);
  const maxVal = Math.max(...allVals, 1);
  const minVal = 0;

  const xScale = (i: number) => PAD.left + (i / (data.length - 1)) * W;
  const yScale = (v: number) =>
    PAD.top + H - ((v - minVal) / (maxVal - minVal)) * H;

  // Build polyline points
  const passedPts = data
    .map((d, i) => `${xScale(i)},${yScale(d.passed)}`)
    .join(" ");
  const failedPts = data
    .map((d, i) => `${xScale(i)},${yScale(d.failed)}`)
    .join(" ");

  // Y gridlines (4 lines)
  const gridLines = [0, 0.25, 0.5, 0.75, 1].map((f) => {
    const val = Math.round(minVal + f * (maxVal - minVal));
    const y = yScale(val);
    return { y, val };
  });

  // X labels — show max 8 evenly
  const step = Math.max(1, Math.ceil(data.length / 8));
  const xLabels = data
    .map((d, i) => ({ i, label: formatChartDate(d.date) }))
    .filter((_, i) => i % step === 0 || i === data.length - 1);

  return (
    <Svg width={width} height={height}>
      {/* Grid */}
      {gridLines.map((g, i) => (
        <G key={i}>
          <Line
            x1={PAD.left}
            y1={g.y}
            x2={PAD.left + W}
            y2={g.y}
            stroke={C.slate300}
            strokeWidth={0.4}
          />
          <Path
            d={`M ${PAD.left - 2} ${g.y} L ${PAD.left - 2} ${g.y}`}
            stroke="transparent"
          />
        </G>
      ))}

      {/* Y axis labels */}
      {gridLines.map((g, i) => (
        <G key={`yl-${i}`}>
          {/* react-pdf SVG Text workaround — use a tiny Path as anchor */}
        </G>
      ))}

      {/* Passed line */}
      <Path
        d={`M ${passedPts
          .split(" ")
          .map((p, i) => (i === 0 ? `M ${p}` : `L ${p}`))
          .join(" ")}`}
        stroke={C.green}
        strokeWidth={1.5}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Failed line */}
      <Path
        d={`M ${failedPts
          .split(" ")
          .map((p, i) => (i === 0 ? `M ${p}` : `L ${p}`))
          .join(" ")}`}
        stroke={C.red}
        strokeWidth={1.5}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Passed dots */}
      {data.map((d, i) => (
        <Circle
          key={`pd-${i}`}
          cx={xScale(i)}
          cy={yScale(d.passed)}
          r={2}
          fill={C.green}
        />
      ))}

      {/* Failed dots */}
      {data.map((d, i) => (
        <Circle
          key={`fd-${i}`}
          cx={xScale(i)}
          cy={yScale(d.failed)}
          r={2}
          fill={C.red}
        />
      ))}

      {/* X axis line */}
      <Line
        x1={PAD.left}
        y1={PAD.top + H}
        x2={PAD.left + W}
        y2={PAD.top + H}
        stroke={C.slate300}
        strokeWidth={0.5}
      />

      {/* Y axis line */}
      <Line
        x1={PAD.left}
        y1={PAD.top}
        x2={PAD.left}
        y2={PAD.top + H}
        stroke={C.slate300}
        strokeWidth={0.5}
      />
    </Svg>
  );
}

// ─── Bar chart ────────────────────────────────────────────────────────────────

function BarChart({
  data,
  width = 480,
  height = 110,
}: {
  data: Array<{ name: string; count: number }>;
  width?: number;
  height?: number;
}) {
  if (data.length === 0) return null;

  const PAD = { top: 10, right: 10, bottom: 28, left: 28 };
  const W = width - PAD.left - PAD.right;
  const H = height - PAD.top - PAD.bottom;

  const maxVal = Math.max(...data.map((d) => d.count), 1);
  const barW = Math.max(8, (W / data.length) * 0.55);
  const gap = W / data.length;

  const gridLines = [0, 0.5, 1].map((f) => ({
    val: Math.round(f * maxVal),
    y: PAD.top + H - f * H,
  }));

  return (
    <Svg width={width} height={height}>
      {/* Grid */}
      {gridLines.map((g, i) => (
        <Line
          key={i}
          x1={PAD.left}
          y1={g.y}
          x2={PAD.left + W}
          y2={g.y}
          stroke={C.slate300}
          strokeWidth={0.4}
        />
      ))}

      {/* Bars */}
      {data.map((d, i) => {
        const barH = Math.max(2, (d.count / maxVal) * H);
        const x = PAD.left + gap * i + (gap - barW) / 2;
        const y = PAD.top + H - barH;
        return (
          <Rect
            key={i}
            x={x}
            y={y}
            width={barW}
            height={barH}
            fill={C.indigo}
            rx={2}
            ry={2}
          />
        );
      })}

      {/* X axis */}
      <Line
        x1={PAD.left}
        y1={PAD.top + H}
        x2={PAD.left + W}
        y2={PAD.top + H}
        stroke={C.slate300}
        strokeWidth={0.5}
      />

      {/* Y axis */}
      <Line
        x1={PAD.left}
        y1={PAD.top}
        x2={PAD.left}
        y2={PAD.top + H}
        stroke={C.slate300}
        strokeWidth={0.5}
      />
    </Svg>
  );
}

// ─── Inline legend for line chart ─────────────────────────────────────────────

function LineLegend() {
  return (
    <View style={{ flexDirection: "row", gap: 14, marginTop: 4 }}>
      {[
        { color: C.green, label: "Passed" },
        { color: C.red, label: "Failed" },
      ].map((item) => (
        <View
          key={item.label}
          style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
        >
          <View
            style={{
              width: 12,
              height: 3,
              backgroundColor: item.color,
              borderRadius: 1,
            }}
          />
          <Text style={{ fontSize: 7.5, color: C.slate500 }}>{item.label}</Text>
        </View>
      ))}
    </View>
  );
}

// ─── Bar chart legend ─────────────────────────────────────────────────────────

function BarLegend({ data }: { data: Array<{ name: string; count: number }> }) {
  return (
    <View
      style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 2 }}
    >
      {data.map((d, i) => (
        <View
          key={i}
          style={{ flexDirection: "row", alignItems: "center", gap: 3 }}
        >
          <View
            style={{
              width: 8,
              height: 8,
              backgroundColor: C.indigo,
              borderRadius: 1,
            }}
          />
          <Text style={{ fontSize: 7, color: C.slate500 }}>
            {d.name}: {d.count}
          </Text>
        </View>
      ))}
    </View>
  );
}

// ─── Table component ──────────────────────────────────────────────────────────

function PDFTable({
  headers,
  rows,
  flex,
}: {
  headers: string[];
  rows: string[][];
  flex: number[];
}) {
  return (
    <View>
      <View style={s.tableHeader}>
        {headers.map((h, i) => (
          <Text key={i} style={[s.tableHeaderCell, { flex: flex[i] }]}>
            {h}
          </Text>
        ))}
      </View>
      {rows.map((row, ri) => (
        <View key={ri} style={[s.tableRow, ri % 2 !== 0 ? s.tableRowAlt : {}]}>
          {row.map((cell, ci) => (
            <Text key={ci} style={[s.tableCell, { flex: flex[ci] }]}>
              {cell}
            </Text>
          ))}
        </View>
      ))}
    </View>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatChartDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

// ─── Footer ───────────────────────────────────────────────────────────────────

function Footer({ reportName }: { reportName: string }) {
  return (
    <View style={s.footer} fixed>
      <Text style={s.footerText}>{reportName}</Text>
      <Text
        style={s.footerText}
        render={({ pageNumber, totalPages }) =>
          `Page ${pageNumber} of ${totalPages}`
        }
      />
    </View>
  );
}

// ─── Section renderer ─────────────────────────────────────────────────────────
// Mirrors ReportViewer's ReportSection switch — renders only what the user
// configured, in the order they configured it.

function renderSection(section: ReportPDFSection, d: ReportPDFData) {
  switch (section.metric) {
    // ── Stat cards — grouped separately by the document, skip here
    case "pass_rate_card":
    case "total_tests_card":
    case "coverage_card":
    case "automation_runs_card":
      return null;

    case "status_distribution_pie":
      return null; // rendered inline in the card row below

    case "execution_trend_line":
      if (!d.execution_trend?.length) return null;
      return (
        <View key={section.id} style={s.chartCard}>
          <Text style={s.chartTitle}>Execution Trend</Text>
          <Text
            style={s.chartSub}
          >{`Daily pass/fail — last ${d.days ?? 30} days`}</Text>
          <LineChart data={d.execution_trend} width={500} height={130} />
          <LineLegend />
        </View>
      );

    case "test_type_breakdown_bar":
      if (!d.test_type_breakdown?.length) return null;
      return (
        <View key={section.id} style={s.chartCard}>
          <Text style={s.chartTitle}>Test Type Breakdown</Text>
          <Text style={s.chartSub}>Distribution of test case types</Text>
          <BarChart data={d.test_type_breakdown} width={500} height={110} />
          <BarLegend data={d.test_type_breakdown} />
        </View>
      );

    case "suite_performance_table":
      if (!d.suite_performance?.length) return null;
      return (
        <View key={section.id} style={s.chartCard}>
          <Text style={s.chartTitle}>Suite Performance</Text>
          <Text style={s.chartSub}>Pass rate and run count per suite</Text>
          <PDFTable
            headers={["Suite", "Runs", "Pass Rate", "Last Run"]}
            rows={d.suite_performance.map((s) => [
              s.suite_name,
              String(s.execution_count),
              `${s.avg_pass_rate}%`,
              s.last_execution
                ? new Date(s.last_execution).toLocaleDateString()
                : "—",
            ])}
            flex={[3, 1, 1, 1.5]}
          />
        </View>
      );

    case "top_failures_table":
      if (!d.top_failures?.length) return null;
      return (
        <View key={section.id} style={s.chartCard}>
          <Text style={s.chartTitle}>Top Failures</Text>
          <Text style={s.chartSub}>Tests that fail most often</Text>
          <PDFTable
            headers={["Test Case", "Failures", "Pass Rate"]}
            rows={d.top_failures.map((t) => [
              t.test_title,
              String(t.failure_count),
              `${t.pass_rate}%`,
            ])}
            flex={[4, 1, 1]}
          />
        </View>
      );

    case "flakiness_table":
      if (!d.flaky_tests?.length) return null;
      return (
        <View key={section.id} style={s.chartCard}>
          <Text style={s.chartTitle}>Flaky Tests</Text>
          <Text style={s.chartSub}>Tests with inconsistent results</Text>
          <PDFTable
            headers={["Test Case", "Flakiness", "Executions"]}
            rows={d.flaky_tests.map((t) => [
              t.test_title,
              `${t.flakiness_score}%`,
              String(t.total_executions),
            ])}
            flex={[4, 1, 1]}
          />
        </View>
      );

    default:
      return null;
  }
}

// ─── Stat card metrics ────────────────────────────────────────────────────────

const CARD_METRICS = [
  "pass_rate_card",
  "total_tests_card",
  "coverage_card",
  "automation_runs_card",
];

// ─── Main document ────────────────────────────────────────────────────────────

export function ReportPDF({ d }: { d: ReportPDFData }) {
  const sections = d.sections ?? [];

  // Deduplicate by metric (mirrors ReportViewer)
  const seen = new Set<string>();
  const dedupedSections = sections.filter((s) => {
    if (seen.has(s.metric)) return false;
    seen.add(s.metric);
    return true;
  });

  const cardSections = dedupedSections.filter((s) =>
    CARD_METRICS.includes(s.metric),
  );
  const hasCards = cardSections.length > 0;

  const hasPie = dedupedSections.some(
    (s) => s.metric === "status_distribution_pie",
  );

  const otherSections = dedupedSections.filter(
    (s) =>
      !CARD_METRICS.includes(s.metric) &&
      s.metric !== "status_distribution_pie",
  );

  const pieSlices = [
    { label: "Passed", value: d.passed, color: PIE_COLORS[0] },
    { label: "Failed", value: d.failed, color: PIE_COLORS[1] },
    { label: "Blocked", value: d.blocked ?? 0, color: PIE_COLORS[2] },
    { label: "Skipped", value: d.skipped ?? 0, color: PIE_COLORS[3] },
    { label: "Not Run", value: d.not_run, color: PIE_COLORS[4] },
  ].filter((sl) => sl.value > 0);

  return (
    <Document>
      <Page size="A4" style={s.page}>
        {/* Header */}
        <View style={s.header} fixed>
          <Text style={s.headerTitle}>{d.reportName}</Text>
          <Text style={s.headerSub}>
            {d.periodLabel} · Generated {d.generatedAt}
          </Text>
        </View>

        <View style={s.body}>
          {/* Stat cards — only the ones the user picked */}
          {hasCards && (
            <View style={s.cardRow}>
              {cardSections.map((section) => {
                switch (section.metric) {
                  case "pass_rate_card":
                    return (
                      <View key={section.id} style={s.card}>
                        <Text style={s.cardLabel}>Pass Rate</Text>
                        <Text style={s.cardValue}>{d.pass_rate}%</Text>
                        <Text style={s.cardSub}>
                          {d.passed} passed · {d.failed} failed
                        </Text>
                        <ProgressBar pct={d.pass_rate} />
                      </View>
                    );
                  case "total_tests_card":
                    return (
                      <View key={section.id} style={s.card}>
                        <Text style={s.cardLabel}>Total Tests</Text>
                        <Text style={s.cardValue}>{d.total_tests}</Text>
                        <Text style={s.cardSub}>{d.not_run} not yet run</Text>
                      </View>
                    );
                  case "coverage_card":
                    return (
                      <View key={section.id} style={s.card}>
                        <Text style={s.cardLabel}>Coverage</Text>
                        <Text style={s.cardValue}>
                          {d.coverage_percentage}%
                        </Text>
                        <Text style={s.cardSub}>
                          {d.requirements_tested}/{d.requirements_total}{" "}
                          requirements
                        </Text>
                        <ProgressBar
                          pct={d.coverage_percentage}
                          color={C.blue}
                        />
                      </View>
                    );
                  case "automation_runs_card":
                    return (
                      <View key={section.id} style={s.card}>
                        <Text style={s.cardLabel}>Auto Runs</Text>
                        <Text style={s.cardValue}>{d.automation_runs}</Text>
                        <Text style={s.cardSub}>
                          {d.automation_pass_rate}% pass rate
                        </Text>
                        <ProgressBar pct={d.automation_pass_rate} />
                      </View>
                    );
                  default:
                    return null;
                }
              })}
            </View>
          )}

          {/* Pie + test results KV side by side — only if user included pie */}
          {hasPie && (
            <View style={s.twoCol}>
              <View style={[s.col, s.chartCard]}>
                <Text style={s.chartTitle}>Status Distribution</Text>
                <Text style={s.chartSub}>Breakdown of test states</Text>
                <PieChart slices={pieSlices} size={130} />
              </View>
              <View style={[s.col, s.chartCard]}>
                <Text style={s.chartTitle}>Test Results</Text>
                <Text style={s.chartSub}>{`${d.days ?? 30} day period`}</Text>
                <KVRow
                  label="Passed"
                  value={String(d.passed)}
                  valueColor={C.green}
                />
                <KVRow
                  label="Failed"
                  value={String(d.failed)}
                  valueColor={C.red}
                />
                <KVRow
                  label="Blocked"
                  value={String(d.blocked ?? 0)}
                  valueColor={C.orange}
                />
                <KVRow
                  label="Skipped"
                  value={String(d.skipped ?? 0)}
                  valueColor={C.slate500}
                />
                <KVRow
                  label="Not Run"
                  value={String(d.not_run)}
                  valueColor={C.slate500}
                />
              </View>
            </View>
          )}

          {/* Remaining sections in user order */}
          {otherSections.map((section) => renderSection(section, d))}
        </View>

        <Footer reportName={d.reportName} />
      </Page>
    </Document>
  );
}
