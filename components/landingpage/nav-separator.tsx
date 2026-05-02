"use client";

import { motion, useScroll, useMotionValueEvent } from "framer-motion";
import { useState } from "react";

export function NavSeparator() {
  const { scrollY } = useScroll();
  const [visible, setVisible] = useState(true);

  useMotionValueEvent(scrollY, "change", (latest) => {
    // Fade out once user scrolls down even slightly
    setVisible(latest < 10);
  });

  return (
    <motion.div
      className="w-full"
      animate={{ opacity: visible ? 1 : 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      {/* Light mode separator */}
      <div
        className="h-px w-full block dark:hidden"
        style={{
          background:
            "linear-gradient(90deg, transparent 0%, rgba(0,0,0,0.08) 20%, rgba(0,0,0,0.08) 80%, transparent 100%)",
        }}
      />
      {/* Dark mode separator */}
      <div
        className="h-px w-full hidden dark:block"
        style={{
          background:
            "linear-gradient(90deg, transparent 0%, #06b6d4 25%, #38bdf8 50%, #06b6d4 75%, transparent 100%)",
          opacity: 0.35,
        }}
      />
    </motion.div>
  );
}
