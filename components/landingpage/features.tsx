"use client"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Zap, Layers, Shield, BarChart3 } from "lucide-react"
import {
  MotionSection,
  MotionDiv,
  containerStagger,
  itemFadeUp,
  sectionVariants,
  useViewportOnce,
} from "./motion"

export function Features() {
  const { reduceMotion, viewport } = useViewportOnce()

  const items = [
    {
      icon: <Zap className="h-4 w-4" />,
      title: "Instant structured generation",
      desc: "Turn user stories and specs into mapped test suites with steps, inputs, and assertions.",
    },
    {
      icon: <Layers className="h-4 w-4" />,
      title: "Cross-platform by design",
      desc: "Generate web, mobile, API/backend, accessibility, and performance cases.",
    },
    {
      icon: <Shield className="h-4 w-4" />,
      title: "Guardrails & negatives",
      desc: "Dial coverage, add negative and edge-case paths, and keep tests aligned to risk.",
    },
    {
      icon: <BarChart3 className="h-4 w-4" />,
      title: "Traceability & reporting",
      desc: "Link tests to requirements, suites, and runs—then track health over time.",
    },
  ]

  return (
    <MotionSection
      id="features"
      className="mx-auto max-w-6xl px-4 py-16 sm:py-20"
      variants={sectionVariants}
      initial={reduceMotion ? false : "hidden"}
      whileInView={reduceMotion ? undefined : "show"}
      viewport={viewport}
    >
      <div className="mx-auto mb-10 max-w-2xl text-center">
        <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Everything you need to test faster
        </h2>
        <p className="mt-3 text-sm text-muted-foreground sm:text-base">
          SynthQA combines AI generation with practical controls, so you can ship coverage you
          trust—not just pretty text.
        </p>
      </div>

      <MotionDiv
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
        variants={containerStagger}
        initial={reduceMotion ? false : "hidden"}
        whileInView={reduceMotion ? undefined : "show"}
        viewport={viewport}
      >
        {items.map((f) => (
          <MotionDiv key={f.title} variants={itemFadeUp}>
            <Card className="border-muted/70 bg-background/80 shadow-sm transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md">
              <CardHeader className="space-y-2">
                <Badge
                  variant="outline"
                  className="flex h-8 w-8 items-center justify-center rounded-full"
                >
                  {f.icon}
                </Badge>
                <CardTitle className="text-sm font-semibold">{f.title}</CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground sm:text-sm">
                {f.desc}
              </CardContent>
            </Card>
          </MotionDiv>
        ))}
      </MotionDiv>
    </MotionSection>
  )
}
