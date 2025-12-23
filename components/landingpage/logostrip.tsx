"use client"

import { MotionSection, sectionVariants, useViewportOnce } from "./motion"

export function LogosStrip() {
  const { reduceMotion, viewport } = useViewportOnce()

  return (
    <MotionSection
      className="border-b bg-muted/40"
      variants={sectionVariants}
      initial={reduceMotion ? false : "hidden"}
      whileInView={reduceMotion ? undefined : "show"}
      viewport={viewport}
    >
      <div className="mx-auto max-w-6xl px-4 py-6 sm:py-8">
        <div className="flex flex-col items-center justify-between gap-4 text-xs text-muted-foreground sm:flex-row">
          <p className="flex items-center gap-2 text-center sm:text-left">
            <span className="h-1 w-6 rounded-full bg-primary/60" />
            <span>Built for modern QA & engineering teams</span>
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4 opacity-80">
            <span className="text-[11px] uppercase tracking-[0.22em]">
              Web · Mobile · API · Accessibility
            </span>
          </div>
        </div>
      </div>
    </MotionSection>
  )
}
