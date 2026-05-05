"use client";

import Link from "next/link";
import { useState } from "react";
import {
  AnimatePresence,
  motion,
  useReducedMotion,
  type Variants,
} from "framer-motion";
import { ArrowRight, CheckCircle2, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProductDemo } from "@/components/demo/productdemo";
import { demoSteps } from "@/components/demo/demosteps";

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
  const [demoOpen, setDemoOpen] = useState(false);

  return (
    <section className="relative h-full overflow-hidden">
      <div className="mx-auto flex h-full max-w-7xl flex-col items-center justify-center gap-8 px-6 py-8 lg:flex-row lg:gap-12">
        {/* Left column */}
        <motion.div
          className="max-w-2xl flex-1 space-y-6 text-center lg:text-left"
          variants={container}
          initial={reduce ? false : "hidden"}
          animate={reduce ? undefined : "show"}
        >
          {/* Pill badge */}
          <motion.div variants={fadeUp}>
            <span className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-4 py-1.5 text-xs font-medium text-blue-600 backdrop-blur-sm dark:border-white/10 dark:bg-white/5 dark:text-cyan-300">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-400 shadow-[0_0_6px_2px_rgba(96,165,250,0.6)] dark:bg-cyan-400 dark:shadow-[0_0_6px_2px_rgba(34,211,238,0.8)]" />
              AI-powered test design for QA teams
              <ChevronRight className="h-3 w-3 opacity-60" />
            </span>
          </motion.div>

          {/* Headline */}
          <motion.div variants={fadeUp} className="space-y-4">
            <h1 className="text-balance text-4xl font-bold leading-tight tracking-tight text-gray-900 sm:text-5xl lg:text-[56px] dark:text-white">
              Turn requirements into{" "}
              <span
                className="bg-clip-text text-transparent"
                style={{
                  backgroundImage:
                    "linear-gradient(to right, #06b6d4, #3b82f6)",
                }}
              >
                real test coverage
              </span>
            </h1>
            <p className="max-w-lg text-balance text-base leading-relaxed text-gray-600 dark:text-white/60">
              Generate structured, execution-ready test cases powered by AI.
              Built for QA engineers who need speed, coverage, and clarity.
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
              className="gap-2 rounded-full bg-cyan-600 px-6 text-sm font-semibold text-white shadow-lg shadow-cyan-600/20 transition-all hover:bg-cyan-500 dark:shadow-cyan-900/50"
            >
              <Link href="/signup">
                Get started
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => setDemoOpen(true)}
              className="gap-2 rounded-full border-gray-300 bg-white/80 px-6 text-sm font-semibold text-gray-700 backdrop-blur-sm transition-all hover:bg-gray-50 dark:border-white/15 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
            >
              View demo
            </Button>
          </motion.div>

          <motion.p
            variants={fadeUp}
            className="text-xs text-gray-400 dark:text-white/30"
          >
            No credit card required · Designed for QA engineers & SDETs
          </motion.p>

          {/* Checklist */}
          <motion.div
            variants={fadeUp}
            className="grid gap-2 text-sm text-gray-500 sm:grid-cols-3 dark:text-white/50"
          >
            {[
              "Web, mobile & API coverage",
              "Edge cases & regression suites",
              "Requirement → execution traceability",
            ].map((text) => (
              <div key={text} className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-cyan-500 dark:text-cyan-400" />
                <span>{text}</span>
              </div>
            ))}
          </motion.div>
        </motion.div>

        {/* Right column */}
        <motion.div
          className="relative w-full max-w-lg flex-1"
          initial={reduce ? false : { opacity: 0, x: 60 }}
          animate={reduce ? undefined : { opacity: 1, x: 0 }}
          transition={{ duration: 0.8, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
        >
          {/* Gradient border */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -inset-[1px] rounded-2xl"
            style={{
              background:
                "linear-gradient(160deg, #22d3ee 0%, #0ea5e9 30%, #1d4ed8 70%, #0a0f1e 100%)",
              opacity: 0.9,
            }}
          />
          {/* Soft outer glow */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -inset-[3px] rounded-2xl"
            style={{
              background:
                "linear-gradient(160deg, #22d3ee 0%, #0ea5e9 40%, transparent 70%)",
              filter: "blur(10px)",
              opacity: 0.2,
            }}
          />

          {/* Card */}
          <motion.div
            whileHover={reduce ? undefined : { y: -4 }}
            transition={{ type: "spring", stiffness: 220, damping: 20 }}
            className="relative overflow-hidden rounded-[15px] shadow-[0_10px_40px_rgba(0,0,0,0.1)] backdrop-blur-xl dark:shadow-[0_20px_80px_rgba(0,0,0,0.6)]"
            style={{ background: "var(--hero-card-bg)", margin: "1px" }}
          >
            <style>{`
              :root { --hero-card-bg: rgba(255,255,255,0.9); }
              .dark { --hero-card-bg: #0b1220; }
            `}</style>

            {/* Top bar */}
            <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-4 py-2.5 dark:border-white/5 dark:bg-white/[0.02]">
              <div className="flex gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
                <span className="h-2.5 w-2.5 rounded-full bg-yellow-400" />
                <span className="h-2.5 w-2.5 rounded-full bg-green-400" />
              </div>
              <span className="text-[10px] tracking-widest text-gray-400 uppercase dark:text-white/40">
                Dashboard
              </span>
              <div className="w-5" />
            </div>

            <div className="space-y-3 p-4">
              {/* Stats row */}
              <div className="grid grid-cols-3 gap-2">
                {[
                  {
                    label: "Pass Rate",
                    value: "86%",
                    color: "text-cyan-600 dark:text-cyan-400",
                  },
                  {
                    label: "Tests",
                    value: "124",
                    color: "text-gray-900 dark:text-white",
                  },
                  { label: "Failures", value: "6", color: "text-red-500" },
                ].map((s, i) => (
                  <motion.div
                    key={s.label}
                    className="rounded-lg border border-gray-200 bg-gray-100 p-3 dark:border-white/5 dark:bg-white/[0.03]"
                    initial={reduce ? false : { opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      duration: 0.4,
                      delay: 0.5 + i * 0.07,
                      ease: [0.16, 1, 0.3, 1],
                    }}
                  >
                    <p className="text-[10px] text-gray-500 dark:text-white/40">
                      {s.label}
                    </p>
                    <p className={`text-sm font-semibold ${s.color}`}>
                      {s.value}
                    </p>
                  </motion.div>
                ))}
              </div>

              {/* Chart */}
              <motion.div
                className="rounded-xl border border-gray-200 bg-gray-100 p-3 dark:border-white/5 dark:bg-white/[0.02]"
                initial={reduce ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.65 }}
              >
                <p className="mb-2 text-[10px] uppercase tracking-wider text-gray-500 dark:text-white/40">
                  Execution Trend
                </p>
                <div className="flex h-16 items-end gap-1">
                  {[20, 25, 18, 30, 28, 40, 90].map((h, i) => (
                    <motion.div
                      key={i}
                      className="flex-1 rounded-sm bg-gradient-to-t from-cyan-500/80 to-transparent"
                      initial={reduce ? false : { scaleY: 0 }}
                      animate={{ scaleY: 1 }}
                      transition={{
                        duration: 0.5,
                        delay: 0.75 + i * 0.05,
                        ease: [0.16, 1, 0.3, 1],
                      }}
                      style={{ height: `${h}%`, transformOrigin: "bottom" }}
                    />
                  ))}
                </div>
              </motion.div>

              {/* Test list */}
              <div className="space-y-1.5">
                {[
                  { name: "Login – valid flow", status: "passed" },
                  { name: "Password reset", status: "failed" },
                  { name: "Session timeout", status: "passed" },
                ].map((t, i) => (
                  <motion.div
                    key={i}
                    className="flex items-center justify-between rounded-md border border-gray-200 bg-gray-100 px-3 py-2 text-xs dark:border-white/5 dark:bg-white/[0.02]"
                    initial={reduce ? false : { opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{
                      duration: 0.4,
                      delay: 0.85 + i * 0.08,
                      ease: [0.16, 1, 0.3, 1],
                    }}
                  >
                    <span className="text-gray-700 dark:text-white/70">
                      {t.name}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] ${
                        t.status === "passed"
                          ? "bg-cyan-500/20 text-cyan-600 dark:text-cyan-400"
                          : "bg-red-500/20 text-red-500"
                      }`}
                    >
                      {t.status}
                    </span>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Bottom rim light */}
            <div className="h-[1px] bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent" />
          </motion.div>
        </motion.div>
      </div>
      <AnimatePresence>
        {demoOpen && (
          <ProductDemo steps={demoSteps} onClose={() => setDemoOpen(false)} />
        )}
      </AnimatePresence>
    </section>
  );
}
