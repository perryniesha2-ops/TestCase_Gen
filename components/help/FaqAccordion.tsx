"use client"

import * as React from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { cn } from "@/lib/utils"
import { Link2, Search } from "lucide-react"

export type FaqItem = {
  id: string
  q: string
  a: string
  tags?: string[]
}

type Props = {
  items: FaqItem[]
  className?: string
  searchPlaceholder?: string
  defaultOpenId?: string
}

export function FaqAccordion({
  items,
  className,
  searchPlaceholder = "Search FAQs…",
  defaultOpenId,
}: Props) {
  const [query, setQuery] = React.useState("")
  const [openValue, setOpenValue] = React.useState<string | undefined>(defaultOpenId)

  // Open by URL hash: /help/test-cases#execution-status
  React.useEffect(() => {
    if (typeof window === "undefined") return
    const hash = window.location.hash?.replace("#", "")
    if (hash) setOpenValue(hash)
  }, [])

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return items
    return items.filter((it) => {
      const haystack = `${it.q}\n${it.a}\n${(it.tags || []).join(" ")}`.toLowerCase()
      return haystack.includes(q)
    })
  }, [items, query])

  function copyLink(id: string) {
    if (typeof window === "undefined") return
    const url = `${window.location.origin}${window.location.pathname}#${id}`
    navigator.clipboard?.writeText(url)
    // Optional: toast here if you want
  }

  return (
    <div className={cn("space-y-4", className)}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={searchPlaceholder}
          className="pl-10"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-lg border p-6 text-sm text-muted-foreground">
          No results. Try a different keyword.
        </div>
      ) : (
        <Accordion
          type="single"
          collapsible
          value={openValue}
          onValueChange={(v) => setOpenValue(v || undefined)}
          className="w-full"
        >
          {filtered.map((it) => (
            <AccordionItem key={it.id} value={it.id} className="scroll-mt-24">
              {/* Anchor target for deep-linking */}
              <div id={it.id} className="relative">
                <div className="flex items-start gap-2">
                  <AccordionTrigger className="text-left flex-1">
                    {it.q}
                  </AccordionTrigger>

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="mt-1 h-8 w-8"
                    onClick={() => copyLink(it.id)}
                    title="Copy link"
                  >
                    <Link2 className="h-4 w-4" />
                  </Button>
                </div>

                <AccordionContent className="text-muted-foreground whitespace-pre-wrap">
                  {it.a}
                </AccordionContent>
              </div>
            </AccordionItem>
          ))}
        </Accordion>
      )}
    </div>
  )
}
