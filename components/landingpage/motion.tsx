"use client"

import * as React from "react"
import { motion, useReducedMotion, type Variants } from "framer-motion"

/**
 * Safe default easing. Using a string avoids TS issues with cubic-bezier arrays.
 */
const EASE = "easeOut" as const

export function useViewportOnce() {
  const reduceMotion = useReducedMotion()
  return {
    reduceMotion,
    viewport: { once: true, amount: 0.25 },
  }
}

export const sectionVariants: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: EASE },
  },
}

export const containerStagger: Variants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.08, delayChildren: 0.04 },
  },
}

export const itemFadeUp: Variants = {
  hidden: { opacity: 0, y: 10 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: EASE },
  },
}

export const MotionDiv = motion.div
export const MotionSection = motion.section
