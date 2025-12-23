"use client"

import Image from "next/image"
import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
  useMotionValueEvent,
  useMotionValue,
} from "framer-motion"
import { useEffect, useState } from "react"

export function SiteNav() {
  const reduce = useReducedMotion()
  const { scrollY } = useScroll()

  // visual tightening on scroll
  const scale = useTransform(scrollY, [0, 80], [1, 0.985])
  const backdrop = useTransform(scrollY, [0, 80], [0, 1])

  // hide on down, show on up
  const [hidden, setHidden] = useState(false)
  const lastY = useMotionValue(0)

  useMotionValueEvent(scrollY, "change", (latest) => {
    const prev = lastY.get()
    lastY.set(latest)

    // Ignore tiny scroll jitter
    const delta = latest - prev
    if (Math.abs(delta) < 6) return

    // Always show at top
    if (latest < 24) {
      setHidden(false)
      return
    }

    // Down hides, up shows
    if (delta > 0) setHidden(true)
    else setHidden(false)
  })

  // If the user prefers reduced motion, don't do hide/show animation
  const navAnimate = reduce
    ? undefined
    : hidden
      ? { y: -92, opacity: 0 } // ~header height
      : { y: 0, opacity: 1 }

  return (
    <motion.header
      className="sticky top-0 z-50"
      initial={reduce ? false : { opacity: 0, y: -10 }}
      animate={reduce ? undefined : { opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
    >
      {/* Background layer that activates on scroll */}
      <motion.div className="absolute inset-0 -z-10" style={{ opacity: backdrop }}>
        <div className="h-full w-full border-b bg-background/70 backdrop-blur supports-[backdrop-filter]:bg-background/55 shadow-sm" />
      </motion.div>

      {/* The actual bar that hides/shows */}
      <motion.div
        className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8"
        animate={navAnimate}
        transition={{
          type: "spring",
          stiffness: 520,
          damping: 46,
          mass: 0.9,
        }}
      >
        <motion.div
          className="flex h-20 items-center justify-between"
          style={reduce ? undefined : { scale }}
        >
          {/* Brand */}
          <Link href="/" className="flex items-center gap-2 md:gap-3 font-semibold">
            <Image
              src="/logo-sq-dark.svg"
              alt="SynthQA Logo"
              width={5000}
              height={2000}
              className="hidden dark:inline-block h-20 w-auto sm:h-20"
              loading="eager"
              priority
            />
            <Image
              src="/logo-sq-light.svg"
              alt="SynthQA Logo"
              width={1000}
              height={100}
              className="inline-block dark:hidden h-20 w-auto sm:h-20"
              loading="eager"
              priority
            />
          </Link>

       

          {/* CTAs */}
          <div className="flex items-center gap-2">
            <motion.div
              whileHover={reduce ? undefined : { y: -1 }}
              transition={{ type: "spring", stiffness: 420, damping: 26 }}
            >
              <Button variant="ghost" asChild size="sm">
                <Link href="/pages/login">Log in</Link>
              </Button>
            </motion.div>

            <motion.div
              whileHover={reduce ? undefined : { y: -1 }}
              transition={{ type: "spring", stiffness: 420, damping: 26 }}
            >
              <Button asChild size="sm" className="gap-1">
                <Link href="/pages/signup">
                  Start free
                  <motion.span
                    className="inline-flex"
                    whileHover={reduce ? undefined : { x: 2 }}
                    transition={{ type: "spring", stiffness: 500, damping: 28 }}
                  >
                    <ArrowRight className="h-3.5 w-3.5" />
                  </motion.span>
                </Link>
              </Button>
            </motion.div>
          </div>
        </motion.div>
      </motion.div>
    </motion.header>
  )
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  const reduce = useReducedMotion()

  return (
    <motion.div
      className="relative"
      whileHover={reduce ? undefined : { y: -1 }}
      transition={{ type: "spring", stiffness: 420, damping: 26 }}
    >
      <Link href={href} className={cn("relative transition-colors hover:text-foreground")}>
        {children}
        <motion.span
          className="pointer-events-none absolute -bottom-1 left-0 h-px w-full origin-left bg-foreground/60"
          initial={{ scaleX: 0 }}
          whileHover={reduce ? undefined : { scaleX: 1 }}
          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
        />
      </Link>
    </motion.div>
  )
}
