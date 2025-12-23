"use client"

import { motion, useReducedMotion } from "framer-motion"
import { useLandingOrchestrator } from "./Orchestrator"

export function RevealAfterHero({
  children,
  delay = 0.1,
  className,
}: {
  children: React.ReactNode
  delay?: number
  className?: string
}) {
  const { phase } = useLandingOrchestrator()
  const reduce = useReducedMotion()

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: reduce ? 0 : 10 }}
      animate={phase >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: reduce ? 0 : 10 }}
      transition={{ duration: reduce ? 0 : 0.5, ease: "easeOut", delay }}
    >
      {children}
    </motion.div>
  )
}
