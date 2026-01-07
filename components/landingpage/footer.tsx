"use client";

import Link from "next/link";
import {
  motion,
  useReducedMotion,
  type Variants,
  type Easing,
} from "framer-motion";
import { TermsSheet } from "../legal/TermsSheet";
import { PrivacySheet } from "../legal/PrivacySheet";
import { ContactSheet } from "../legal/contactSheet";

const easeOut: Easing = [0.16, 1, 0.3, 1];

const container = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.08,
    },
  },
};

const item: Variants = {
  hidden: { opacity: 0, y: 8 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.25,
      ease: easeOut,
    },
  },
};

export function Footer() {
  const reduce = useReducedMotion();

  return (
    <motion.footer
      className="border-t bg-background/80"
      initial={reduce ? false : "hidden"}
      whileInView={reduce ? undefined : "show"}
      viewport={{ once: true, margin: "-80px" }}
      variants={container}
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        {/* Left block */}
        <motion.div variants={item} className="flex flex-col gap-1">
          <p>© {new Date().getFullYear()} SynthQA, LLC. All rights reserved.</p>
        </motion.div>

        {/* Nav */}
        <motion.nav
          variants={container}
          className="flex flex-wrap items-center gap-3"
        >
          <motion.div variants={item}>
            <FooterLink href="docs/privacy">Privacy Policy</FooterLink>
          </motion.div>
          <motion.div variants={item}>
            <FooterLink href="docs/terms">Terms of Service</FooterLink>
          </motion.div>
          <motion.div variants={item}>
            <ContactSheet />
          </motion.div>
        </motion.nav>
      </div>
    </motion.footer>
  );
}

function FooterLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  const reduce = useReducedMotion();

  return (
    <motion.div
      variants={item}
      whileHover={reduce ? undefined : { y: -1 }}
      transition={{ type: "spring", stiffness: 420, damping: 26 }}
    >
      <Link href={href} className="hover:text-foreground transition-colors">
        {children}
      </Link>
    </motion.div>
  );
}
