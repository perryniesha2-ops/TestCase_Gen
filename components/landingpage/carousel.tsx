"use client";

import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useSwipeable } from "react-swipeable";

const variants = {
  enter: (dir: number) => ({
    x: dir > 0 ? "100%" : "-100%",
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (dir: number) => ({
    x: dir > 0 ? "-100%" : "100%",
    opacity: 0,
  }),
};

export function Carousel({ slides }: { slides: React.ReactNode[] }) {
  const reduce = useReducedMotion();
  const [[index, dir], setPage] = useState([0, 0]);

  const paginate = useCallback(
    (newDir: number) => {
      setPage(([prev]) => {
        const next = prev + newDir;
        if (next < 0 || next >= slides.length) return [prev, newDir];
        return [next, newDir];
      });
    },
    [slides.length],
  );

  const goTo = useCallback((i: number) => {
    setPage(([prev]) => [i, i > prev ? 1 : -1]);
  }, []);

  const swipe = useSwipeable({
    onSwipedLeft: () => paginate(1),
    onSwipedRight: () => paginate(-1),
    preventScrollOnSwipe: true,
    trackMouse: true,
  });

  const isFirst = index === 0;
  const isLast = index === slides.length - 1;

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowRight") paginate(1);
      if (e.key === "ArrowLeft") paginate(-1);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [paginate]);

  return (
    <div
      className="relative h-[calc(100vh-5rem)] w-full overflow-hidden"
      {...swipe}
    >
      <AnimatePresence initial={false} custom={dir} mode="popLayout">
        <motion.div
          key={index}
          custom={dir}
          variants={reduce ? undefined : variants}
          initial={reduce ? false : "enter"}
          animate="center"
          exit={reduce ? undefined : "exit"}
          transition={{
            x: { type: "spring", stiffness: 280, damping: 30 },
            opacity: { duration: 0.2 },
          }}
          className="absolute inset-0 w-full h-full overflow-y-auto"
          style={{
            scrollbarWidth: "none",
            msOverflowStyle: "none",
          }}
        >
          <style>{`.carousel-slide::-webkit-scrollbar { display: none; }`}</style>
          <div className="carousel-slide min-h-full w-full flex flex-col justify-center">
            {slides[index]}
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Left arrow */}
      <AnimatePresence>
        {!isFirst && (
          <motion.button
            key="left"
            aria-label="Previous"
            onClick={() => paginate(-1)}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -8 }}
            transition={{ duration: 0.2 }}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-20 flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white/90 text-gray-600 shadow-md backdrop-blur-sm hover:bg-gray-50 dark:border-white/10 dark:bg-white/5 dark:text-white/60 dark:hover:bg-white/10"
          >
            <ChevronLeft className="h-4 w-4" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Right arrow */}
      <AnimatePresence>
        {!isLast && (
          <motion.button
            key="right"
            aria-label="Next"
            onClick={() => paginate(1)}
            initial={{ opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 8 }}
            transition={{ duration: 0.2 }}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-20 flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white/90 text-gray-600 shadow-md backdrop-blur-sm hover:bg-gray-50 dark:border-white/10 dark:bg-white/5 dark:text-white/60 dark:hover:bg-white/10"
          >
            <ChevronRight className="h-4 w-4" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Dot indicators */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2">
        {slides.map((_, i) => (
          <button
            key={i}
            aria-label={`Go to slide ${i + 1}`}
            onClick={() => goTo(i)}
          >
            <motion.div
              animate={{
                width: index === i ? 24 : 6,
                opacity: index === i ? 1 : 0.35,
              }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="h-1.5 rounded-full bg-cyan-500 dark:bg-cyan-400"
            />
          </button>
        ))}
      </div>

      {/* Keyboard hint on first slide */}
      <AnimatePresence>
        {isFirst && (
          <motion.div
            className="absolute bottom-6 right-6 z-20 hidden md:flex items-center gap-1.5 text-[11px] text-gray-400 dark:text-white/25"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ delay: 2, duration: 0.5 }}
          ></motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
