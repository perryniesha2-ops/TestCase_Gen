"use client"

import { useEffect, useMemo, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { Dialog, DialogContent, DialogHeader, DialogTitle,  DialogFooter, DialogDescription, DialogClose  } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { TestCase } from "@/lib/test-execution"
import { X } from "lucide-react"

type Step = { step_number?: number; action: string; expected: string }

type TestCaseRow = {
  id: string
  title: string
  description: string | null
  test_type: string | null
  priority: string | null
  preconditions: string | null
  expected_result: string | null
  test_steps: Step[] | null
}


export function TestCaseQuickViewDialog({
  open,
  onOpenChange,
  testCaseId,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  testCaseId: string | null
}) {
  const supabase = useMemo(() => createClient(), [])
  const [loading, setLoading] = useState(false)
  const [tc, setTc] = useState<TestCaseRow | null>(null)
  const [openView, setOpenView] = useState(false)
  const [activeTestCase, setActiveTestCase] = useState<TestCase | null>(null)

  

  useEffect(() => {
    if (!open || !testCaseId) return

    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        const { data, error } = await supabase
          .from("test_cases")
          .select("id,title,description,test_type,priority,preconditions,expected_result,test_steps")
          .eq("id", testCaseId)
          .maybeSingle()

        if (error) throw error
        if (!cancelled) setTc((data as TestCaseRow) ?? null)
      } catch (e) {
        console.error(e)
        toast.error("Failed to load test case")
        if (!cancelled) setTc(null)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [open, testCaseId, supabase])



function handleClose() {
  setOpenView(false)

  // Reset after close animation to avoid flicker
  setTimeout(() => {
    setActiveTestCase(null)
  }, 150)
}


 return (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent
      className="w-[95vw] sm:max-w-4xl lg:max-w-5xl max-h-[90vh] flex flex-col p-0"
      onInteractOutside={(e) => e.preventDefault()}
    >
      {/* ================= Header ================= */}
      <DialogHeader className="sticky top-0 z-10 bg-background border-b px-6 py-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 space-y-2">
            <DialogTitle className="text-lg font-semibold leading-tight">
              {tc?.title ?? "Test case"}
            </DialogTitle>

            {/* Meta row (NOT DialogDescription) */}
            <div className="flex flex-wrap items-center gap-2">
              {tc?.test_type && (
                <Badge variant="secondary">{tc.test_type}</Badge>
              )}
              {tc?.priority && (
                <Badge variant="outline">{tc.priority}</Badge>
              )}
            </div>
          </div>

          
        </div>
      </DialogHeader>

      {/* ================= Scrollable Body ================= */}
      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-6 w-2/3" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : !tc ? (
          <div className="text-sm text-muted-foreground">
            No test case found.
          </div>
        ) : (
          <>
            {/* Description */}
            {tc.description && (
              <div className="text-sm text-muted-foreground whitespace-pre-wrap">
                {tc.description}
              </div>
            )}

            <Separator />

            {/* Preconditions */}
            <div className="space-y-2">
              <Label>Preconditions</Label>
              <div className="text-sm text-muted-foreground whitespace-pre-wrap">
                {tc.preconditions || "—"}
              </div>
            </div>

            <Separator />

            {/* Steps */}
            <div className="space-y-2">
              <div className="text-sm font-medium">Steps</div>

              <div className="space-y-3">
                {(tc.test_steps ?? []).map((s, idx) => (
                  <div key={idx} className="rounded-md border p-3">
                    <div className="text-xs text-muted-foreground mb-1">
                      Step {s.step_number ?? idx + 1}
                    </div>

                    <div className="space-y-1">
                      <div className="text-sm font-medium">Action</div>
                      <div className="text-sm text-muted-foreground whitespace-pre-wrap">
                        {s.action}
                      </div>
                    </div>

                    <div className="space-y-1 mt-2">
                      <div className="text-sm font-medium">Expected</div>
                      <div className="text-sm text-muted-foreground whitespace-pre-wrap">
                        {s.expected}
                      </div>
                    </div>
                  </div>
                ))}

                {(tc.test_steps ?? []).length === 0 && (
                  <div className="text-sm text-muted-foreground">
                    No steps recorded.
                  </div>
                )}
              </div>
            </div>

            <Separator />

            {/* Overall Expected Result */}
            <div className="space-y-2">
              <Label>Overall Expected Result</Label>
              <div className="text-sm text-muted-foreground whitespace-pre-wrap">
                {tc.expected_result || "—"}
              </div>
            </div>
          </>
        )}
      </div>

      {/* ================= Footer ================= */}
      <DialogFooter className="border-t px-6 py-4">
        <DialogClose asChild>
        <Button variant="outline" onClick={handleClose}>
          Close
        </Button>
        </DialogClose>
      </DialogFooter>
    </DialogContent>
  </Dialog>
)
}