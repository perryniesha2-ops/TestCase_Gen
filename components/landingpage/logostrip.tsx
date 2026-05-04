"use client";

import {
  MotionSection,
  MotionDiv,
  sectionVariants,
  useViewportOnce,
} from "./motion";

const platforms = ["Web", "Mobile", "API", "Accessibility", "Performance"];

export function LogosStrip() {
  const { reduceMotion, viewport } = useViewportOnce();

  return (
    <MotionSection
      className="relative py-8 sm:py-10"
      variants={sectionVariants}
      initial={reduceMotion ? false : "hidden"}
      whileInView={reduceMotion ? undefined : "show"}
      viewport={viewport}
    >
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-7 flex items-center justify-center gap-4">
          {/* Light mode rule */}
          <div
            className="h-px flex-1 block dark:hidden"
            style={{
              background:
                "linear-gradient(to right, transparent, rgba(0,0,0,0.1))",
            }}
          />
          {/* Dark mode rule */}
          <div
            className="h-px flex-1 hidden dark:block"
            style={{
              background:
                "linear-gradient(to right, transparent, rgba(255,255,255,0.08))",
            }}
          />

          <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-400 dark:text-white/25">
            Trusted over 2k+ teams
          </span>

          <div
            className="h-px flex-1 block dark:hidden"
            style={{
              background:
                "linear-gradient(to left, transparent, rgba(0,0,0,0.1))",
            }}
          />
          <div
            className="h-px flex-1 hidden dark:block"
            style={{
              background:
                "linear-gradient(to left, transparent, rgba(255,255,255,0.08))",
            }}
          />
        </div>

        <MotionDiv
          className="flex flex-wrap items-center justify-center gap-3"
          initial={reduceMotion ? false : { opacity: 0 }}
          whileInView={reduceMotion ? undefined : { opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          viewport={viewport}
        >
          {platforms.map((p) => (
            <span
              key={p}
              className="rounded-full border border-gray-200 bg-white/80 px-5 py-2 text-[12px] font-medium text-gray-500 backdrop-blur-sm dark:border-white/8 dark:bg-white/4 dark:text-white/40"
            >
              {p}
            </span>
          ))}
        </MotionDiv>
      </div>
    </MotionSection>
  );
}
