"use client";

import { useRef, useEffect, useState } from "react";
import { motion, useReducedMotion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";

export function HorizontalScroll({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const [hinted, setHinted] = useState(false);

  const childArray = Array.isArray(children) ? children : [children];
  const childCount = childArray.length;
  const isLastSlide = activeIndex === childCount - 1;

  function updateState() {
    const el = ref.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 10);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 10);
    setActiveIndex(Math.round(el.scrollLeft / el.clientWidth));
  }

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.addEventListener("scroll", updateState, { passive: true });
    updateState();
    return () => el.removeEventListener("scroll", updateState);
  }, []);

  // Lock body scroll — always clean up on unmount
  useEffect(() => {
    const previous = document.body.style.overflow;

    if (!isLastSlide) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      // Always restore on unmount regardless of slide
      document.body.style.overflow = previous || "";
    };
  }, [isLastSlide]);

  // Also release overflow when any link is clicked
  useEffect(() => {
    function onLinkClick() {
      document.body.style.overflow = "";
    }
    document.addEventListener("click", (e) => {
      const target = e.target as HTMLElement;
      if (target.closest("a") || target.closest("button")) {
        onLinkClick();
      }
    });
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  // Wheel hijack → horizontal
  useEffect(() => {
    const el = ref.current;
    if (!el || reduce) return;
    function onWheel(e: WheelEvent) {
      if (isLastSlide) return;
      const goingDown = e.deltaY > 0;
      const goingUp = e.deltaY < 0;
      if (goingDown && !canScrollRight) return;
      if (goingUp && !canScrollLeft) return;
      e.preventDefault();
      el!.scrollBy({ left: e.deltaY * 2, behavior: "smooth" });
    }
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [canScrollLeft, canScrollRight, reduce, isLastSlide]);

  useEffect(() => {
    const t = setTimeout(() => setHinted(true), 1500);
    return () => clearTimeout(t);
  }, []);

  function scrollTo(index: number) {
    const el = ref.current;
    if (!el) return;
    el.scrollTo({ left: index * el.clientWidth, behavior: "smooth" });
  }

  function scrollBy(dir: 1 | -1) {
    scrollTo(Math.max(0, Math.min(childCount - 1, activeIndex + dir)));
  }

  return (
    <>
      <style>{`
        .hs-track::-webkit-scrollbar { display: none; }
        :root { --edge-fade: rgba(248,250,255,0.85); }
        .dark { --edge-fade: rgba(2,8,16,0.85); }
      `}</style>

      <div className="relative w-full" style={{ height: "calc(100vh - 5rem)" }}>
        <div
          ref={ref}
          className="hs-track flex h-full w-full"
          style={{
            overflowX: "scroll",
            overflowY: "hidden",
            scrollSnapType: "x mandatory",
            scrollBehavior: "smooth",
            scrollbarWidth: "none",
          }}
        >
          {childArray.map((child, i) => (
            <div
              key={i}
              className="h-full w-full flex-shrink-0 flex flex-col justify-center"
              style={{
                scrollSnapAlign: "start",
                overflowY: "auto",
                scrollbarWidth: "none",
              }}
            >
              {child}
            </div>
          ))}
        </div>

        {/* Left arrow */}
        <AnimatePresence>
          {canScrollLeft && (
            <motion.button
              key="left"
              aria-label="Previous section"
              onClick={() => scrollBy(-1)}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.25 }}
              className="absolute left-4 top-1/2 -translate-y-1/2 z-20 flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white/90 text-gray-600 shadow-md backdrop-blur-sm hover:bg-gray-50 dark:border-white/10 dark:bg-white/5 dark:text-white/60 dark:hover:bg-white/10"
            >
              <ChevronLeft className="h-4 w-4" />
            </motion.button>
          )}
        </AnimatePresence>

        {/* Right arrow */}
        <AnimatePresence>
          {canScrollRight && (
            <motion.button
              key="right"
              aria-label="Next section"
              onClick={() => scrollBy(1)}
              initial={{ opacity: 0, x: 8 }}
              animate={
                hinted && activeIndex === 0 && !reduce
                  ? {
                      opacity: 1,
                      x: [0, 6, 0],
                      transition: {
                        opacity: { duration: 0.25 },
                        x: { duration: 0.8, repeat: 2, ease: "easeInOut" },
                      },
                    }
                  : { opacity: 1, x: 0 }
              }
              exit={{ opacity: 0, x: 8 }}
              transition={{ duration: 0.25 }}
              className="absolute right-4 top-1/2 -translate-y-1/2 z-20 flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white/90 text-gray-600 shadow-md backdrop-blur-sm hover:bg-gray-50 dark:border-white/10 dark:bg-white/5 dark:text-white/60 dark:hover:bg-white/10"
            >
              <ChevronRight className="h-4 w-4" />
            </motion.button>
          )}
        </AnimatePresence>

        {/* Scroll down hint on last slide */}
        <AnimatePresence>
          {isLastSlide && (
            <motion.div
              className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-1"
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4, delay: 0.3 }}
            >
              <span className="text-[10px] uppercase tracking-widest text-gray-400 dark:text-white/30">
                Scroll down
              </span>
              <motion.div
                animate={{ y: [0, 4, 0] }}
                transition={{
                  duration: 1.2,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                className="text-sm text-gray-400 dark:text-white/30"
              >
                ↓
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Dot indicators */}
        {!isLastSlide && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2">
            {Array.from({ length: childCount }).map((_, i) => (
              <button
                key={i}
                aria-label={`Go to section ${i + 1}`}
                onClick={() => scrollTo(i)}
              >
                <motion.div
                  animate={{
                    width: activeIndex === i ? 24 : 6,
                    opacity: activeIndex === i ? 1 : 0.35,
                  }}
                  transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                  className="h-1.5 rounded-full bg-cyan-500 dark:bg-cyan-400"
                />
              </button>
            ))}
          </div>
        )}

        {/* Edge fades */}
        <div
          className="pointer-events-none absolute left-0 top-0 bottom-0 w-16 z-10"
          style={{
            background:
              "linear-gradient(to right, var(--edge-fade), transparent)",
          }}
        />
        <div
          className="pointer-events-none absolute right-0 top-0 bottom-0 w-16 z-10"
          style={{
            background:
              "linear-gradient(to left, var(--edge-fade), transparent)",
          }}
        />
      </div>
    </>
  );
}
