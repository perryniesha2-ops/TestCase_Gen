"use client";

import { Zap, Layers, Shield, BarChart3 } from "lucide-react";
import {
  MotionSection,
  MotionDiv,
  containerStagger,
  itemFadeUp,
  sectionVariants,
  useViewportOnce,
} from "./motion";

const items = [
  {
    icon: Zap,
    accent: "#60a5fa",
    title: "Instant structured generation",
    desc: "Turn user stories and specs into mapped test suites with steps, inputs, and assertions.",
  },
  {
    icon: Layers,
    accent: "#a78bfa",
    title: "Cross-platform by design",
    desc: "Generate web, mobile, API/backend, accessibility, and performance cases from one workflow.",
  },
  {
    icon: Shield,
    accent: "#34d399",
    title: "Guardrails & negatives",
    desc: "Dial coverage, add negative and edge-case paths, and keep tests aligned to real risk.",
  },
  {
    icon: BarChart3,
    accent: "#fb923c",
    title: "Traceability & reporting",
    desc: "Link tests to requirements, suites, and runs—then track health over time.",
  },
];

export function Features() {
  const { reduceMotion, viewport } = useViewportOnce();

  return (
    <MotionSection
      id="features"
      className="relative overflow-hidden py-24 sm:py-32"
      variants={sectionVariants}
      initial={reduceMotion ? false : "hidden"}
      whileInView={reduceMotion ? undefined : "show"}
      viewport={viewport}
    >
      {/* Section label */}
      <div className="mx-auto mb-16 max-w-7xl px-6 text-center">
        <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-gray-200 bg-gray-100 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-gray-500 dark:border-white/10 dark:bg-white/5 dark:text-white/40">
          <span className="h-1 w-4 rounded-full bg-gray-300 dark:bg-white/20" />
          Our workflow
          <span className="h-1 w-4 rounded-full bg-gray-300 dark:bg-white/20" />
        </span>

        <h2 className="mt-4 text-balance text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl dark:text-white">
          How our platform makes your{" "}
          <span
            className="bg-clip-text text-transparent"
            style={{
              backgroundImage:
                "linear-gradient(135deg, #60a5fa 0%, #a78bfa 100%)",
            }}
          >
            workflow easier
          </span>
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-base text-gray-500 dark:text-white/40">
          SynthQA combines AI generation with practical controls so you can ship
          coverage you trust—not just pretty text.
        </p>
      </div>

      <MotionDiv
        className="mx-auto grid max-w-7xl gap-4 px-6 sm:grid-cols-2 lg:grid-cols-4"
        variants={containerStagger}
        initial={reduceMotion ? false : "hidden"}
        whileInView={reduceMotion ? undefined : "show"}
        viewport={viewport}
      >
        {items.map((f) => {
          const Icon = f.icon;
          return (
            <MotionDiv key={f.title} variants={itemFadeUp}>
              <div className="group relative h-full overflow-hidden rounded-2xl border border-gray-200 bg-white p-6 backdrop-blur-sm transition-all duration-300 hover:border-gray-300 hover:bg-gray-50 dark:border-white/8 dark:bg-white/4 dark:hover:border-white/15 dark:hover:bg-white/[0.07]">
                {/* Hover corner glow */}
                <div
                  className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full opacity-0 transition-opacity duration-500 group-hover:opacity-30"
                  style={{
                    background: `radial-gradient(circle, ${f.accent}, transparent 70%)`,
                    filter: "blur(20px)",
                  }}
                />

                {/* Icon */}
                <div
                  className="mb-5 flex h-10 w-10 items-center justify-center rounded-xl"
                  style={{
                    background: `${f.accent}18`,
                    border: `1px solid ${f.accent}30`,
                  }}
                >
                  <Icon className="h-4.5 w-4.5" style={{ color: f.accent }} />
                </div>

                <h3 className="mb-2 text-sm font-semibold text-gray-900 dark:text-white">
                  {f.title}
                </h3>
                <p className="text-sm leading-relaxed text-gray-500 dark:text-white/40">
                  {f.desc}
                </p>
              </div>
            </MotionDiv>
          );
        })}
      </MotionDiv>
    </MotionSection>
  );
}
