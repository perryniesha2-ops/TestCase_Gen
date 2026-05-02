"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
  useMotionValueEvent,
  useMotionValue,
} from "framer-motion";
import { useState } from "react";

export function SiteNav() {
  const reduce = useReducedMotion();
  const { scrollY } = useScroll();

  const scale = useTransform(scrollY, [0, 80], [1, 0.985]);
  const backdrop = useTransform(scrollY, [0, 80], [0, 1]);

  const [hidden, setHidden] = useState(false);
  const lastY = useMotionValue(0);

  useMotionValueEvent(scrollY, "change", (latest) => {
    const prev = lastY.get();
    lastY.set(latest);
    const delta = latest - prev;
    if (Math.abs(delta) < 6) return;
    if (latest < 24) {
      setHidden(false);
      return;
    }
    if (delta > 0) setHidden(true);
    else setHidden(false);
  });

  const navAnimate = reduce
    ? undefined
    : hidden
      ? { y: -92, opacity: 0 }
      : { y: 0, opacity: 1 };

  return (
    <motion.header
      className="sticky top-0 z-50"
      initial={reduce ? false : { opacity: 0, y: -10 }}
      animate={reduce ? undefined : { opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
    >
      {/* Scroll-activated background */}
      <motion.div
        className="absolute inset-0 -z-10"
        style={{ opacity: backdrop }}
      >
        {/* Light mode nav bg */}
        <div className="h-full w-full border-b border-gray-200 bg-white/80 shadow-sm backdrop-blur-xl dark:hidden" />
        {/* Dark mode nav bg */}
        <div className="hidden h-full w-full border-b border-white/8 bg-[#020810]/80 shadow-sm backdrop-blur-xl dark:block" />
      </motion.div>

      {/* Aqua rim light along bottom of nav — dark mode only */}
      <motion.div
        className="absolute bottom-0 left-[5%] right-[5%] h-[1px] hidden dark:block"
        style={{ opacity: backdrop }}
      >
        <div
          className="h-full w-full"
          style={{
            background:
              "linear-gradient(90deg, transparent, #06b6d4 30%, #38bdf8 50%, #06b6d4 70%, transparent)",
            opacity: 0.3,
          }}
        />
      </motion.div>

      {/* Nav content */}
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
          <Link
            href="/"
            className="flex items-center gap-2 md:gap-3 font-semibold"
          >
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
              width={5000}
              height={2000}
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
              <Button
                variant="outline"
                asChild
                size="sm"
                className="text-gray-600 hover:text-gray-900 hover:bg-gray-100 dark:text-white/60 dark:hover:text-white dark:hover:bg-white/8"
              >
                <Link href="/login">Log in</Link>
              </Button>
            </motion.div>

            <motion.div
              whileHover={reduce ? undefined : { y: -1 }}
              transition={{ type: "spring", stiffness: 420, damping: 26 }}
            >
              <Button
                variant="secondary"
                asChild
                size="sm"
                className="gap-1 bg-cyan-600 text-white shadow-md shadow-blue-600/20 hover:bg-blue-500 dark:bg-cyan-500 dark:shadow-cyan-900/40 dark:hover:bg-cyan-400"
              >
                <Link href="/signup">
                  Sign Up
                  <motion.span
                    className="inline-flex"
                    whileHover={reduce ? undefined : { x: 2 }}
                    transition={{ type: "spring", stiffness: 500, damping: 28 }}
                  ></motion.span>
                </Link>
              </Button>
            </motion.div>
          </div>
        </motion.div>
      </motion.div>
    </motion.header>
  );
}

function NavLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  const reduce = useReducedMotion();

  return (
    <motion.div
      className="relative"
      whileHover={reduce ? undefined : { y: -1 }}
      transition={{ type: "spring", stiffness: 420, damping: 26 }}
    >
      <Link
        href={href}
        className={cn(
          "relative text-gray-500 transition-colors hover:text-gray-900 dark:text-white/50 dark:hover:text-white",
        )}
      >
        {children}
        <motion.span
          className="pointer-events-none absolute -bottom-1 left-0 h-px w-full origin-left bg-gray-900/60 dark:bg-white/60"
          initial={{ scaleX: 0 }}
          whileHover={reduce ? undefined : { scaleX: 1 }}
          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
        />
      </Link>
    </motion.div>
  );
}
