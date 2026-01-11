"use client";

import Link from "next/link";
import { motion, useReducedMotion, type Variants } from "framer-motion";
import { ArrowRight, CheckCircle2, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const container: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.07, delayChildren: 0.05 },
  },
};

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] },
  },
};

const fadeIn: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] } },
};

export function Hero() {
  const reduce = useReducedMotion();

  return (
    <section className="border-b">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-10 px-4 py-16 sm:py-20 lg:flex-row lg:items-start lg:py-24">
        {/* Left column */}
        <motion.div
          className="max-w-xl space-y-6 text-center lg:text-left"
          variants={container}
          initial={reduce ? false : "hidden"}
          animate={reduce ? undefined : "show"}
        >
          <motion.div variants={fadeUp}>
            <div className="inline-flex items-center gap-2 rounded-full border bg-background/80 px-3 py-1 text-xs text-muted-foreground shadow-sm">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              <span>AI-powered test design for QA teams</span>
            </div>
          </motion.div>

          <motion.div variants={fadeUp} className="space-y-4">
            <h1 className="text-balance text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
              Turn requirements into{" "}
              <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                production-ready tests
              </span>{" "}
              in minutes.
            </h1>
            <p className="text-balance text-base text-muted-foreground sm:text-lg">
              SynthQA combines OpenAI & Anthropic to generate structured,
              cross-platform test suites—with steps, inputs, and assertions you
              can actually run and maintain.
            </p>
          </motion.div>

          <motion.div
            variants={fadeUp}
            className="flex flex-wrap items-center justify-center gap-3 lg:justify-start"
          >
            {/* CTA micro-interactions */}
            <motion.div
              whileHover={reduce ? undefined : { y: -2 }}
              whileTap={reduce ? undefined : { scale: 0.98 }}
            >
              <Button asChild size="lg" className="gap-2">
                <Link href="/signup">
                  Start free
                  <motion.span
                    className="inline-flex"
                    whileHover={reduce ? undefined : { x: 2 }}
                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                  >
                    <ArrowRight className="h-4 w-4" />
                  </motion.span>
                </Link>
              </Button>
            </motion.div>

            <motion.div
              whileHover={reduce ? undefined : { y: -2 }}
              whileTap={reduce ? undefined : { scale: 0.98 }}
            ></motion.div>
          </motion.div>

          <motion.p variants={fadeIn} className="text-xs text-muted-foreground">
            No credit card required · Designed for QA engineers, SDETs & teams
          </motion.p>

          <motion.div
            variants={fadeUp}
            className="mt-4 grid gap-4 text-sm text-muted-foreground sm:grid-cols-3"
          >
            {[
              "Web, mobile & API coverage in one place",
              "Edge cases, negatives & regression suites",
              "Traceability from requirement → execution",
            ].map((text) => (
              <div key={text} className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 text-primary" />
                <span>{text}</span>
              </div>
            ))}
          </motion.div>
        </motion.div>

        {/* Right column – hero preview */}
        <motion.div
          className="w-full max-w-md lg:max-w-lg"
          variants={fadeUp}
          initial={reduce ? false : "hidden"}
          animate={reduce ? undefined : "show"}
          transition={{ delay: reduce ? 0 : 0.12 }}
        >
          <motion.div
            whileHover={reduce ? undefined : { y: -4 }}
            transition={{ type: "spring", stiffness: 260, damping: 22 }}
            className="relative"
          >
            {/* Background gradient drift */}
            {!reduce && (
              <motion.div
                aria-hidden="true"
                className="pointer-events-none absolute -inset-8 -z-10 opacity-60 blur-2xl"
                style={{
                  background:
                    "radial-gradient(600px 260px at 20% 30%, hsl(var(--primary) / 0.25), transparent 60%), radial-gradient(520px 240px at 80% 60%, hsl(var(--primary) / 0.18), transparent 60%)",
                }}
                animate={{ x: [0, 18, -12, 0], y: [0, -10, 14, 0] }}
                transition={{
                  duration: 10,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />
            )}

            <Card className="relative overflow-hidden border bg-card/80 shadow-lg">
              <div className="absolute inset-x-0 top-0 h-10 bg-gradient-to-r from-primary/10 via-primary/0 to-primary/10" />
              <CardHeader className="relative z-10 pb-3">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-xs font-medium uppercase tracking-[0.16em] text-primary">
                      Test Case Generator
                    </p>
                    <CardTitle className="text-base font-semibold">
                      User Login – Cross-platform suite
                    </CardTitle>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    Beta
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="relative z-10 space-y-4 text-xs text-muted-foreground">
                <div className="rounded-md border bg-muted/40 p-3 font-mono text-[11px] leading-relaxed">
                  <div className="mb-2 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                    Requirement
                  </div>
                  <p>
                    “As a user, I want to log in with email and password so that
                    I can access my dashboard.”
                  </p>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-md border bg-muted/40 p-3 font-mono text-[11px]">
                    <div className="mb-2 flex items-center justify-between text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                      <span>Generated cases</span>
                      <span>Web · API</span>
                    </div>
                    <ul className="space-y-1">
                      <li>✓ Valid login – happy path</li>
                      <li>✓ Invalid password – lockout</li>
                      <li>✓ Empty fields validation</li>
                      <li>✓ API 500 fallback</li>
                    </ul>
                  </div>

                  <div className="rounded-md border bg-muted/40 p-3 font-mono text-[11px]">
                    <div className="mb-2 flex items-center justify-between text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                      <span>Execution status</span>
                      <span>Suite: Release 2025.3</span>
                    </div>
                    <ul className="space-y-1">
                      <li>• 12 passed</li>
                      <li>• 2 failed</li>
                      <li>• 3 not run</li>
                      <li className="mt-2 text-[10px] text-emerald-500">
                        86% pass rate · 100% requirement coverage
                      </li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
