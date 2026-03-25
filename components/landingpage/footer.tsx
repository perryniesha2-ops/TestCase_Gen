"use client";

import Link from "next/link";
import {
  motion,
  useReducedMotion,
  type Variants,
  type Easing,
} from "framer-motion";
import { ContactSheet } from "../legal/contactSheet";

const easeOut: Easing = [0.16, 1, 0.3, 1];

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};

const item: Variants = {
  hidden: { opacity: 0, y: 6 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: easeOut } },
};

export function Footer() {
  const reduce = useReducedMotion();

  return (
    <motion.footer
      className="relative border-t border-gray-200 dark:border-white/8"
      initial={reduce ? false : "hidden"}
      whileInView={reduce ? undefined : "show"}
      viewport={{ once: true, margin: "-60px" }}
      variants={container}
    >
      {/* Subtle top glow line */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-px"
        style={{
          background:
            "linear-gradient(90deg, transparent 0%, rgba(96,165,250,0.4) 30%, rgba(167,139,250,0.4) 70%, transparent 100%)",
        }}
      />

      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-6 py-8 text-xs sm:flex-row sm:items-center sm:justify-between">
        {/* Logo + copyright */}
        <motion.div variants={item} className="flex flex-col gap-1.5">
          <span className="text-sm font-semibold tracking-tight text-gray-800 dark:text-white/80">
            SynthQA
          </span>
          <p className="text-gray-400 dark:text-white/25">
            © {new Date().getFullYear()} SynthQA, LLC. All rights reserved.
          </p>
        </motion.div>

        {/* Nav links */}
        <motion.nav
          variants={container}
          className="flex flex-wrap items-center gap-5"
        >
          {[
            { label: "Privacy Policy", href: "docs/privacy" },
            { label: "Terms of Service", href: "docs/terms" },
          ].map(({ label, href }) => (
            <motion.div key={label} variants={item}>
              <Link
                href={href}
                className="text-gray-500 transition-colors duration-200 hover:text-gray-800 dark:text-white/30 dark:hover:text-white/70"
              >
                {label}
              </Link>
            </motion.div>
          ))}
          <motion.div
            variants={item}
            className="text-gray-500 hover:text-gray-800 transition-colors duration-200 dark:text-white/30 dark:hover:text-white/70"
          >
            <ContactSheet />
          </motion.div>
        </motion.nav>
      </div>
    </motion.footer>
  );
}
