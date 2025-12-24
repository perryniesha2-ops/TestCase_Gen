"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { motion, useReducedMotion } from "framer-motion"

export function CTA() {
  const reduceMotion = useReducedMotion()

  return (
    <motion.section
      id="pricing"
      className="mx-auto max-w-5xl px-4 pb-20"
      initial={reduceMotion ? false : { opacity: 0, y: 16 }}
      whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration: 0.45, ease: "easeOut" }}
    >
      <div className="overflow-hidden rounded-2xl border bg-card/90 p-8 text-center shadow-sm sm:p-10">
        <div className="mx-auto max-w-2xl space-y-4">
          <h3 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Start free. Upgrade when your team is ready.
          </h3>
          <p className="text-sm text-muted-foreground sm:text-base">
            Generate up to 50 test cases on the free tier. Move to paid when you need higher
            volume, team workspaces, and advanced reporting.
          </p>
        </div>

        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <motion.div whileHover={reduceMotion ? undefined : { scale: 1.02 }} transition={{ duration: 0.15 }}>
            <Button asChild size="lg">
              <Link href="/pages/signup">Create account</Link>
            </Button>
          </motion.div>

          <Button asChild size="lg" variant="outline">
            <Link href="/pages/pricing">View pricing & limits</Link>
          </Button>
        </div>

        <p className="mt-4 text-xs text-muted-foreground">
          Monthly & annual plans available · Cancel anytime
        </p>
      </div>
    </motion.section>
  )
}
