"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { X, ChevronLeft, ChevronRight, MousePointer2 } from "lucide-react";

export type DemoStep = {
  title: string;
  description: string;
  // Position of the hotspot as % of the mockup container
  hotspot: { x: number; y: number };
  // Optional: which side the tooltip appears on
  tooltipSide?: "top" | "bottom" | "left" | "right";
  // The screen/mockup to show for this step
  screen: React.ReactNode;
};

type Props = {
  steps: DemoStep[];
  onClose: () => void;
};

export function ProductDemo({ steps, onClose }: Props) {
  const reduce = useReducedMotion();
  const [current, setCurrent] = useState(0);
  const [hotspotPulsed, setHotspotPulsed] = useState(false);
  const [tooltipVisible, setTooltipVisible] = useState(false);

  const step = steps[current];
  const isFirst = current === 0;
  const isLast = current === steps.length - 1;

  // Auto-show tooltip after hotspot pulses
  useEffect(() => {
    setHotspotPulsed(false);
    setTooltipVisible(false);
    const t1 = setTimeout(() => setHotspotPulsed(true), 400);
    const t2 = setTimeout(() => setTooltipVisible(true), 900);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [current]);

  const next = useCallback(() => {
    if (!isLast) setCurrent((c) => c + 1);
  }, [isLast]);

  const prev = useCallback(() => {
    if (!isFirst) setCurrent((c) => c - 1);
  }, [isFirst]);

  // Keyboard navigation
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowRight" || e.key === "Enter") next();
      if (e.key === "ArrowLeft") prev();
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, prev, onClose]);

  const tooltipOffset = {
    top: { x: "-50%", y: "-120%" },
    bottom: { x: "-50%", y: "24px" },
    left: { x: "-110%", y: "-50%" },
    right: { x: "24px", y: "-50%" },
  }[step.tooltipSide ?? "bottom"];

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      onClick={onClose}
    >
      <motion.div
        className="relative w-full max-w-4xl overflow-hidden rounded-2xl border border-white/10 bg-[#080f1e] shadow-2xl shadow-black/60"
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top bar */}
        <div className="flex items-center justify-between border-b border-white/8 bg-white/[0.03] px-5 py-3">
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-white">
              SynthQA Demo
            </span>
            <span className="rounded-full bg-cyan-500/15 px-2.5 py-0.5 text-[11px] font-medium text-cyan-400">
              Interactive tour
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-white/30">
              {current + 1} / {steps.length}
            </span>
            <button
              onClick={onClose}
              className="flex h-7 w-7 items-center justify-center rounded-full border border-white/10 text-white/40 hover:border-white/20 hover:text-white/70 transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-[2px] w-full bg-white/5">
          <motion.div
            className="h-full bg-gradient-to-r from-cyan-400 to-blue-400"
            animate={{ width: `${((current + 1) / steps.length) * 100}%` }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          />
        </div>

        {/* Screen area */}
        <div className="relative aspect-[16/9] w-full overflow-hidden bg-[#040d18]">
          {/* Screen content */}
          <AnimatePresence mode="wait">
            <motion.div
              key={current}
              className="absolute inset-0"
              initial={reduce ? false : { opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={reduce ? undefined : { opacity: 0, x: -30 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            >
              {step.screen}
            </motion.div>
          </AnimatePresence>

          {/* Hotspot */}
          <div
            className="absolute z-10"
            style={{
              left: `${step.hotspot.x}%`,
              top: `${step.hotspot.y}%`,
              transform: "translate(-50%, -50%)",
            }}
          >
            {/* Pulse rings */}
            {hotspotPulsed && !reduce && (
              <>
                <motion.div
                  className="absolute inset-0 rounded-full bg-cyan-400/30"
                  initial={{ scale: 1, opacity: 0.6 }}
                  animate={{ scale: 3, opacity: 0 }}
                  transition={{
                    duration: 1.2,
                    repeat: Infinity,
                    ease: "easeOut",
                  }}
                />
                <motion.div
                  className="absolute inset-0 rounded-full bg-cyan-400/20"
                  initial={{ scale: 1, opacity: 0.4 }}
                  animate={{ scale: 2.2, opacity: 0 }}
                  transition={{
                    duration: 1.2,
                    repeat: Infinity,
                    ease: "easeOut",
                    delay: 0.3,
                  }}
                />
              </>
            )}

            {/* Core dot */}
            <motion.div
              className="relative h-5 w-5 cursor-pointer rounded-full border-2 border-white bg-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.8)]"
              initial={{ scale: 0 }}
              animate={{ scale: hotspotPulsed ? 1 : 0 }}
              transition={{ type: "spring", stiffness: 400, damping: 20 }}
              onClick={next}
            >
              <MousePointer2 className="absolute -right-1 -top-1 h-3 w-3 text-white/80" />
            </motion.div>

            {/* Tooltip */}
            <AnimatePresence>
              {tooltipVisible && (
                <motion.div
                  className="absolute z-20 w-64 cursor-pointer"
                  style={{
                    left: "50%",
                    top: "50%",
                    transform: `translate(${tooltipOffset.x}, ${tooltipOffset.y})`,
                  }}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                  onClick={next}
                >
                  <div className="overflow-hidden rounded-xl border border-white/15 bg-[#0d1a2e]/95 shadow-xl shadow-black/50 backdrop-blur-xl">
                    {/* Rim light */}
                    <div
                      className="h-px w-full"
                      style={{
                        background:
                          "linear-gradient(90deg, transparent, #22d3ee 40%, #38bdf8 60%, transparent)",
                        opacity: 0.6,
                      }}
                    />
                    <div className="p-4">
                      <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.15em] text-cyan-400">
                        Step {current + 1}
                      </p>
                      <p className="text-sm font-semibold text-white">
                        {step.title}
                      </p>
                      <p className="mt-1 text-xs leading-relaxed text-white/50">
                        {step.description}
                      </p>
                      <div className="mt-3 flex items-center justify-between">
                        <span className="text-[10px] text-white/25">
                          {isLast ? "Last step" : "Click to continue →"}
                        </span>
                        {isLast && (
                          <span className="text-[10px] font-medium text-cyan-400">
                            Tour complete ✓
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Bottom nav */}
        <div className="flex items-center justify-between border-t border-white/8 bg-white/[0.02] px-5 py-3">
          {/* Step dots */}
          <div className="flex items-center gap-1.5">
            {steps.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                aria-label={`Go to step ${i + 1}`}
              >
                <motion.div
                  animate={{
                    width: i === current ? 20 : 6,
                    opacity: i === current ? 1 : i < current ? 0.6 : 0.25,
                    backgroundColor: i <= current ? "#22d3ee" : "#ffffff",
                  }}
                  transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                  className="h-1.5 rounded-full"
                />
              </button>
            ))}
          </div>

          {/* Nav buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={prev}
              disabled={isFirst}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 text-white/40 transition-all hover:border-white/20 hover:text-white/70 disabled:opacity-20 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={isLast ? onClose : next}
              className="flex items-center gap-2 rounded-full bg-cyan-500 px-4 py-1.5 text-xs font-semibold text-white shadow-md shadow-cyan-900/40 transition-all hover:bg-cyan-400"
            >
              {isLast ? "Finish tour" : "Next"}
              {!isLast && <ChevronRight className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
