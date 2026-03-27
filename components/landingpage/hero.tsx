"use client";

import Link from "next/link";
import { motion, useReducedMotion, type Variants } from "framer-motion";
import { ArrowRight, CheckCircle2, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const container: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 },
  },
};

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] },
  },
};

export function Hero() {
  const reduce = useReducedMotion();

  return (
    <section className="relative overflow-hidden">
      {/* Atmospheric glow blobs */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10"
      >
        {/* Primary blue glow – top right */}
        <div
          className="absolute -right-40 -top-40 h-[600px] w-[600px] rounded-full opacity-30"
          style={{
            background:
              "radial-gradient(circle, #3b82f6 0%, #1d4ed8 40%, transparent 70%)",
            filter: "blur(80px)",
          }}
        />
        {/* Secondary teal glow – middle left */}
        <div
          className="absolute -left-20 top-1/3 h-[400px] w-[400px] rounded-full opacity-20"
          style={{
            background:
              "radial-gradient(circle, #06b6d4 0%, #0284c7 40%, transparent 70%)",
            filter: "blur(100px)",
          }}
        />
        {/* Subtle grid overlay */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.4) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />
      </div>

      <div className="mx-auto flex max-w-7xl flex-col items-center gap-12 px-6 py-24 lg:flex-row lg:items-center lg:py-32 xl:py-40">
        {/* Left column */}
        <motion.div
          className="max-w-2xl flex-1 space-y-8 text-center lg:text-left"
          variants={container}
          initial={reduce ? false : "hidden"}
          animate={reduce ? undefined : "show"}
        >
          {/* Pill badge */}
          <motion.div variants={fadeUp}>
            <span className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-gray-100 px-4 py-1.5 text-xs font-medium text-blue-600 backdrop-blur-sm dark:border-white/10 dark:bg-white/5 dark:text-blue-300">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-400 shadow-[0_0_6px_2px_rgba(96,165,250,0.8)]" />
              AI-powered test design for QA teams
              <ChevronRight className="h-3 w-3 opacity-60" />
            </span>
          </motion.div>

          {/* Headline */}
          <motion.div variants={fadeUp} className="space-y-5">
            <h1 className="text-balance text-5xl font-bold leading-[1.1] tracking-tight text-gray-900 sm:text-6xl lg:text-[64px] dark:text-white">
              Turn requirements into{" "}
              <span
                className="bg-clip-text text-transparent"
                style={{
                  backgroundImage:
                    "linear-gradient(135deg, #60a5fa 0%, #a78bfa 50%, #38bdf8 100%)",
                }}
              >
                production-ready
              </span>{" "}
              tests.
            </h1>
            <p className="max-w-lg text-balance text-base leading-relaxed text-gray-500 sm:text-lg lg:text-base xl:text-lg dark:text-white/50">
              SynthQA combines OpenAI & Anthropic to generate structured,
              cross-platform test suites—with steps, inputs, and assertions you
              can actually run.
            </p>
          </motion.div>

          {/* CTAs */}
          <motion.div
            variants={fadeUp}
            className="flex flex-wrap items-center justify-center gap-3 lg:justify-start"
          >
            <Button
              asChild
              size="lg"
              className="gap-2 rounded-full bg-gray-900 px-6 text-sm font-semibold text-white shadow-lg shadow-gray-900/10 transition-all hover:bg-gray-800 dark:bg-white dark:text-gray-900 dark:shadow-white/10 dark:hover:bg-white/90 dark:hover:shadow-white/20"
            >
              <Link href="/signup">
                Get started
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </motion.div>

          <motion.p variants={fadeUp} className="text-xs text-gray-400 dark:text-white/30">
            No credit card required · Designed for QA engineers & SDETs
          </motion.p>

          {/* Checklist */}
          <motion.div
            variants={fadeUp}
            className="grid gap-3 text-sm text-gray-500 sm:grid-cols-3 dark:text-white/50"
          >
            {[
              "Web, mobile & API coverage",
              "Edge cases & regression suites",
              "Requirement → execution traceability",
            ].map((text) => (
              <div key={text} className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-blue-400" />
                <span>{text}</span>
              </div>
            ))}
          </motion.div>
        </motion.div>

        {/* Right column – floating dashboard card */}
        <motion.div
          className="relative w-full max-w-lg flex-1"
          initial={reduce ? false : { opacity: 0, x: 30 }}
          animate={reduce ? undefined : { opacity: 1, x: 0 }}
          transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
        >
          {/* Card glow halo */}
          <div
            aria-hidden="true"
            className="absolute inset-0 -z-10 scale-110 rounded-2xl opacity-40"
            style={{
              background:
                "radial-gradient(ellipse at 50% 50%, #3b82f6 0%, transparent 65%)",
              filter: "blur(40px)",
            }}
          />

          <motion.div
            whileHover={reduce ? undefined : { y: -6 }}
            transition={{ type: "spring", stiffness: 220, damping: 20 }}
            className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl shadow-gray-200 backdrop-blur-xl dark:border-white/10 dark:bg-white/5 dark:shadow-black/40"
          >
            {/* Card top bar */}
            <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-5 py-3 dark:border-white/8 dark:bg-white/5">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-red-400/80" />
                <span className="h-2.5 w-2.5 rounded-full bg-yellow-400/80" />
                <span className="h-2.5 w-2.5 rounded-full bg-green-400/80" />
              </div>
              <span className="text-[11px] font-medium tracking-widest text-gray-400 uppercase dark:text-white/30">
                SynthQA
              </span>
              <div className="h-5 w-5" />
            </div>

            <div className="space-y-4 p-5">
              {/* Requirement input box */}
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-white/8 dark:bg-white/4">
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-400 dark:text-white/30">
                  Requirement
                </p>
                <p className="font-mono text-[12px] leading-relaxed text-gray-600 dark:text-white/60">
                  "As a user, I want to log in with email and password so that I
                  can access my dashboard."
                </p>
              </div>

              {/* Two stat cards */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-white/8 dark:bg-white/4">
                  <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-400 dark:text-white/30">
                    Generated cases
                  </p>
                  <ul className="space-y-1.5 font-mono text-[11px] text-gray-600 dark:text-white/60">
                    <li className="flex items-center gap-1.5">
                      <span className="h-1 w-1 rounded-full bg-green-400" />
                      Valid login – happy path
                    </li>
                    <li className="flex items-center gap-1.5">
                      <span className="h-1 w-1 rounded-full bg-green-400" />
                      Invalid password – lockout
                    </li>
                    <li className="flex items-center gap-1.5">
                      <span className="h-1 w-1 rounded-full bg-green-400" />
                      Empty fields validation
                    </li>
                    <li className="flex items-center gap-1.5">
                      <span className="h-1 w-1 rounded-full bg-green-400" />
                      API 500 fallback
                    </li>
                  </ul>
                </div>

                <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-white/8 dark:bg-white/4">
                  <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-400 dark:text-white/30">
                    Execution
                  </p>
                  <ul className="space-y-1.5 font-mono text-[11px]">
                    <li className="flex items-center gap-1.5 text-green-400">
                      <span className="h-1 w-1 rounded-full bg-current" />
                      12 passed
                    </li>
                    <li className="flex items-center gap-1.5 text-red-400">
                      <span className="h-1 w-1 rounded-full bg-current" />2
                      failed
                    </li>
                    <li className="flex items-center gap-1.5 text-gray-400 dark:text-white/40">
                      <span className="h-1 w-1 rounded-full bg-current" />3 not
                      run
                    </li>
                  </ul>
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-gray-200 dark:bg-white/10">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-blue-400 to-cyan-400"
                      style={{ width: "86%" }}
                    />
                  </div>
                  <p className="mt-2 text-[10px] text-gray-400 dark:text-white/30">
                    86% pass rate
                  </p>
                </div>
              </div>

              {/* Bottom status */}
              <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 dark:border-white/8 dark:bg-white/4">
                <span className="text-[11px] text-gray-500 dark:text-white/40">
                  Suite: Release 2026.3
                </span>
                <span className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_2px_rgba(52,211,153,0.6)]" />
                  100% req. coverage
                </span>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
