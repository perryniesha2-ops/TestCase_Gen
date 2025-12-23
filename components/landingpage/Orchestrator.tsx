"use client"

import React, { createContext, useContext, useMemo, useState } from "react"

type Orchestration = {
  phase: number
  startNextPhase: () => void
  reset: () => void
}

const OrchestratorContext = createContext<Orchestration | null>(null)

export function LandingOrchestrator({ children }: { children: React.ReactNode }) {
  const [phase, setPhase] = useState(0)

  const value = useMemo(
    () => ({
      phase,
      startNextPhase: () => setPhase((p) => Math.max(p, 1)),
      reset: () => setPhase(0),
    }),
    [phase]
  )

  return <OrchestratorContext.Provider value={value}>{children}</OrchestratorContext.Provider>
}

export function useLandingOrchestrator() {
  const ctx = useContext(OrchestratorContext)
  if (!ctx) throw new Error("useLandingOrchestrator must be used within LandingOrchestrator")
  return ctx
}
