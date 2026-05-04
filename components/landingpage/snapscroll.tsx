"use client";

import { useRef, useEffect, useState } from "react";
import { motion, useReducedMotion, AnimatePresence } from "framer-motion";
import { ChevronUp, ChevronDown } from "lucide-react";

export function SnapScroll({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const [activeIndex, setActiveIndex] = useState(0);

  const childArray = Array.isArray(children) ? children : [children];
  const childCount = childArray.length;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    function onScroll() {
      const index = Math.round(el!.scrollTop / window.innerHeight);
      setActiveIndex(index);
    }

    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  function scrollTo(index: number) {
    ref.current?.scrollTo({
      top: index * window.innerHeight,
      behavior: "smooth",
    });
  }

  function scrollBy(dir: 1 | -1) {
    scrollTo(Math.max(0, Math.min(childCount - 1, activeIndex + dir)));
  }

  const isFirst = activeIndex === 0;
  const isLast = activeIndex === childCount - 1;

  return (
    <div
      ref={ref}
      className="h-screen w-full overflow-y-scroll"
      style={{
        scrollSnapType: "y mandatory",
        scrollbarWidth: "none",
        msOverflowStyle: "none",
      }}
    >
      <style>{`
        .snap-container::-webkit-scrollbar { display: none; }
      `}</style>

      {childArray.map((child, i) => {
        const isFooter = i === childCount - 1;
        return (
          <div
            key={i}
            style={{
              scrollSnapAlign: "start",
              // Footer doesn't force 100vh — it just snaps to start
              minHeight: isFooter ? "auto" : "100vh",
              height: isFooter ? "auto" : "100vh",
            }}
            className="relative w-full overflow-hidden"
          >
            {child}
          </div>
        );
      })}

      {/* Up arrow */}
      <AnimatePresence>
        {!isFirst && (
          <motion.button
            key="up"
            aria-label="Previous section"
            onClick={() => scrollBy(-1)}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.25 }}
            className="fixed right-6 bottom-20 z-50 flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white/90 text-gray-600 shadow-md backdrop-blur-sm hover:bg-gray-50 dark:border-white/10 dark:bg-white/5 dark:text-white/60 dark:hover:bg-white/10"
          >
            <ChevronUp className="h-4 w-4" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Down arrow */}
      <AnimatePresence>
        {!isLast && (
          <motion.button
            key="down"
            aria-label="Next section"
            onClick={() => scrollBy(1)}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
            className="fixed right-6 bottom-6 z-50 flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white/90 text-gray-600 shadow-md backdrop-blur-sm hover:bg-gray-50 dark:border-white/10 dark:bg-white/5 dark:text-white/60 dark:hover:bg-white/10"
          >
            <ChevronDown className="h-4 w-4" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Dot indicators */}
      <div className="fixed right-4 top-1/2 -translate-y-1/2 z-50 flex flex-col items-center gap-2">
        {childArray.map((_, i) => (
          <button
            key={i}
            aria-label={`Go to section ${i + 1}`}
            onClick={() => scrollTo(i)}
          >
            <motion.div
              animate={{
                height: activeIndex === i ? 24 : 6,
                opacity: activeIndex === i ? 1 : 0.35,
              }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="w-1.5 rounded-full bg-cyan-500 dark:bg-cyan-400"
            />
          </button>
        ))}
      </div>
    </div>
  );
}
