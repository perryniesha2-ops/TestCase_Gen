"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight } from "lucide-react";

export function CTA() {
  const reduceMotion = useReducedMotion();

  return (
    <section id="pricing" className="relative overflow-hidden py-24 sm:py-32">
      <motion.div
        className="mx-auto max-w-7xl px-6"
        initial={reduceMotion ? false : { opacity: 0, y: 20 }}
        whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.25 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="relative overflow-hidden rounded-2xl border border-gray-200 bg-white/80 p-12 text-center backdrop-blur-sm sm:p-16 dark:border-white/10 dark:bg-white/4">
          {/* Inner glow — aqua in dark, soft blue in light */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 -z-10"
            style={{
              background:
                "radial-gradient(ellipse 80% 60% at 50% 100%, rgba(6,182,212,0.08), transparent 70%)",
            }}
          />

          {/* Rim light along top of card */}
          <div
            className="absolute top-0 left-[10%] right-[10%] h-[1px]"
            style={{
              background:
                "linear-gradient(90deg, transparent, #06b6d4 40%, #38bdf8 50%, #06b6d4 60%, transparent)",
              opacity: 0.3,
            }}
          />

          {/* Top rule */}
          <div className="mx-auto mb-8 flex items-center justify-center gap-4">
            <div
              className="h-px w-16 block dark:hidden"
              style={{
                background:
                  "linear-gradient(to right, transparent, rgba(0,0,0,0.12))",
              }}
            />
            <div
              className="h-px w-16 hidden dark:block"
              style={{
                background:
                  "linear-gradient(to right, transparent, rgba(255,255,255,0.15))",
              }}
            />
            <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gray-400 dark:text-white/30">
              Pricing
            </span>
            <div
              className="h-px w-16 block dark:hidden"
              style={{
                background:
                  "linear-gradient(to left, transparent, rgba(0,0,0,0.12))",
              }}
            />
            <div
              className="h-px w-16 hidden dark:block"
              style={{
                background:
                  "linear-gradient(to left, transparent, rgba(255,255,255,0.15))",
              }}
            />
          </div>

          <div className="mx-auto max-w-2xl space-y-5">
            <h3 className="text-balance text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl dark:text-white">
              Start free. Upgrade when your{" "}
              <span
                className="bg-clip-text text-transparent"
                style={{
                  backgroundImage:
                    "linear-gradient(135deg, #60a5fa 0%, #38bdf8 50%, #22d3ee 100%)",
                }}
              >
                team is ready.
              </span>
            </h3>
            <p className="text-base text-gray-500 sm:text-lg dark:text-white/40">
              Generate up to 50 test cases on the free tier. Move to paid when
              you need higher volume, team workspaces, and advanced reporting.
            </p>
          </div>

          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button
              asChild
              size="lg"
              className="gap-2 rounded-full bg-blue-600 px-8 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition-all hover:bg-blue-500 dark:bg-cyan-500 dark:shadow-cyan-900/50 dark:hover:bg-cyan-400"
            >
              <Link href="/signup">
                Create account
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>

            <Button
              asChild
              size="lg"
              variant="ghost"
              className="gap-2 rounded-full border border-gray-200 bg-gray-50 px-8 text-sm font-medium text-gray-600 backdrop-blur-sm hover:bg-gray-100 hover:text-gray-900 dark:border-white/10 dark:bg-white/5 dark:text-white/70 dark:hover:bg-white/10 dark:hover:text-white"
            >
              <Link href="/pricing">View pricing & limits</Link>
            </Button>
          </div>

          <p className="mt-6 text-xs text-gray-400 dark:text-white/25">
            Monthly & annual plans available · Cancel anytime
          </p>
        </div>
      </motion.div>
    </section>
  );
}
