"use client"

import { motion, useReducedMotion } from "framer-motion"

export function BackgroundDrift() {
  const reduce = useReducedMotion()

  if (reduce) {
    // Keep a static background for reduced motion users
    return (
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_rgba(129,140,248,0.15),_transparent_55%),radial-gradient(ellipse_at_bottom,_rgba(56,189,248,0.12),_transparent_55%)]"
      />
    )
  }

  return (
    <motion.div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10"
      initial={{ opacity: 0.9 }}
      animate={{
        backgroundPosition: ["0% 0%", "100% 30%", "0% 0%"],
        filter: ["blur(0px)", "blur(1px)", "blur(0px)"],
      }}
      transition={{
        duration: 22,
        ease: "easeInOut",
        repeat: Infinity,
      }}
      style={{
        backgroundImage:
          "radial-gradient(ellipse at top, rgba(129,140,248,0.16), transparent 55%), radial-gradient(ellipse at bottom, rgba(56,189,248,0.14), transparent 55%)",
        backgroundSize: "140% 140%",
      }}
    />
  )
}
