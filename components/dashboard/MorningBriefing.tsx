// components/dashboard/MorningBriefing.tsx
"use client";

import type { DashboardBriefing } from "@/lib/dashboard-types";
import { useRouter } from "next/navigation";

interface Props {
  briefing: DashboardBriefing;
  onAction?: (actionId: string) => void;
}

export default function MorningBriefing({ briefing, onAction }: Props) {
  const router = useRouter();

  return (
    <section
      aria-label="AI briefing"
      className="relative mb-4 flex items-start gap-4 overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-700/60 dark:bg-slate-900"
    >
      {/* Aurora corners — dark mode only */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 hidden dark:block"
        style={{
          background:
            "radial-gradient(600px 140px at 12% 0%, rgba(34,211,238,.10), transparent 70%), radial-gradient(600px 140px at 88% 100%, rgba(59,130,246,.10), transparent 70%)",
        }}
      />
      {/* Subtle tint — light mode */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 dark:hidden"
        style={{
          background:
            "radial-gradient(600px 140px at 12% 0%, rgba(6,182,212,.05), transparent 70%), radial-gradient(600px 140px at 88% 100%, rgba(59,130,246,.05), transparent 70%)",
        }}
      />

      {/* Icon */}
      <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 to-blue-500">
        <svg
          width="18"
          height="18"
          viewBox="0 0 120 120"
          fill="none"
          aria-hidden
        >
          <path
            d="M38 62 L56 80 L86 42"
            stroke="#04121c"
            strokeWidth="14"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      {/* Content */}
      <div className="relative">
        <h2 className="text-[15px] font-semibold text-slate-800 dark:text-slate-100">
          {briefing.headline}
        </h2>
        <p className="mt-1.5 max-w-3xl text-[13.5px] leading-relaxed text-slate-500 dark:text-slate-400">
          {briefing.body}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {briefing.actions.map((a) => (
            <button
              key={a.label}
              onClick={() =>
                a.href
                  ? router.push(a.href)
                  : a.actionId && onAction?.(a.actionId)
              }
              className={`rounded-full border px-4 py-2 text-xs font-medium transition ${
                a.emphasized
                  ? "border-cyan-500/40 bg-cyan-50 text-cyan-700 hover:bg-cyan-100 dark:border-cyan-400/40 dark:bg-cyan-400/10 dark:text-cyan-300 dark:hover:bg-cyan-400/20"
                  : "border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-300 dark:hover:border-slate-500"
              }`}
            >
              {a.label}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
