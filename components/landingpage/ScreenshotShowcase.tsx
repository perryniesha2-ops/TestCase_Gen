import Link from "next/link"
import { ArrowRight, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { MotionDiv } from "./motion"
import { CheckCircle2 } from "lucide-react"

export function ScreenshotShowcase() {
  return (
    <section id="demo" className="mx-auto max-w-6xl px-4 py-16 sm:py-20">
      <div className="grid items-center gap-10 lg:grid-cols-2">
        <div className="order-2 space-y-4 lg:order-1">
          <h3 className="text-2xl font-semibold tracking-tight">
            From requirement → suite → execution
          </h3>
          <p className="text-sm text-muted-foreground sm:text-base">
            Paste a requirement, pick coverage and platforms, and generate reviewable test cases.
            Save them into suites, run them continuously, and report on health across releases.
          </p>
          <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 text-primary" />
              <span>Adjust coverage and negative paths by story, epic, or suite.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 text-primary" />
              <span>Templates for API, UI, mobile, accessibility and performance testing.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 text-primary" />
              <span>Cost meter, model controls and export-ready formats (CSV, Jira, and more).</span>
            </li>
          </ul>
          <div className="mt-5 flex flex-wrap gap-3">
            <Button asChild>
              <Link href="/pages/signup">Try SynthQA free</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/pages/generate">Open generator</Link>
            </Button>
          </div>
        </div>

        <div className="order-1 lg:order-2">
          <div className="overflow-hidden rounded-xl border bg-card shadow-lg">
            <div className="flex items-center gap-1 border-b bg-muted/60 px-4 py-2">
              <span className="h-2 w-2 rounded-full bg-red-400" />
              <span className="h-2 w-2 rounded-full bg-amber-300" />
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              <span className="ml-3 text-xs text-muted-foreground">synthqa.app · Test suites</span>
            </div>
            <div className="aspect-[16/10] w-full bg-muted/40" />
          </div>
        </div>
      </div>
    </section>
  )
}
