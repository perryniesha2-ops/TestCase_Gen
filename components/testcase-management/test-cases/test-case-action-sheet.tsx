"use client"

import { useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetClose,
} from "@/components/ui/sheet"
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert"
import {
  Eye,
  Edit3,
  Trash2,
  AlertCircle,
  CheckCircle2,
} from "lucide-react"
import type { TestCase } from "@/types/test-cases"

interface TestCaseActionSheetProps {
  testCase: TestCase | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onEdit: (testCase: TestCase) => void
  onDelete: (testCase: TestCase) => void
  onViewDetails: (testCase: TestCase) => void
  /**
   * Retained for compatibility with the caller, but no longer used here
   * because automation/execution UI was removed per request.
   */
  isAutomated: boolean
}

export function TestCaseActionSheet({
  testCase,
  open,
  onOpenChange,
  onEdit,
  onDelete,
  onViewDetails,
}: TestCaseActionSheetProps) {
  const priorityClassName = useMemo(() => {
    const p = testCase?.priority
    switch (p) {
      case "critical":
        return "bg-red-500 text-white"
      case "high":
        return "bg-orange-500 text-white"
      case "medium":
        return "bg-yellow-500 text-black"
      case "low":
        return "bg-blue-500 text-white"
      default:
        return "bg-gray-500 text-white"
    }
  }, [testCase?.priority])

  if (!testCase) return null

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="
          w-[720px] sm:w-[820px] lg:w-[900px]
          max-w-[95vw]
          h-dvh
          p-0
          overflow-hidden
        "
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="border-b px-6 py-5">
            <SheetHeader className="space-y-2">
              <div className="min-w-0">
                <SheetTitle className="truncate">{testCase.title}</SheetTitle>
                <SheetDescription className="mt-1">
                  Test case actions and details
                </SheetDescription>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Badge className={priorityClassName}>{testCase.priority}</Badge>
                <Badge variant="secondary">{testCase.test_type}</Badge>
                <Badge variant="outline" className="text-muted-foreground">
                  {testCase.status}
                </Badge>
              </div>
            </SheetHeader>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-6 py-5">
            {/* Optional informational note to replace removed automation UI */}
           

            <div className="mt-6 grid gap-6">
              {/* Details */}
              <div className="rounded-lg border bg-background">
                <div className="border-b px-4 py-3">
                  <p className="text-sm font-medium">Details</p>
                </div>

                <div className="px-4 py-4 space-y-4">
                  <div>
                    <h4 className="text-sm font-semibold mb-2">Description</h4>
                    <p className="text-sm text-muted-foreground">
                      {testCase.description || "No description provided"}
                    </p>
                  </div>

                  {testCase.preconditions ? (
                    <div>
                      <h4 className="text-sm font-semibold mb-2">Preconditions</h4>
                      <p className="text-sm text-muted-foreground">{testCase.preconditions}</p>
                    </div>
                  ) : null}

                  <div>
                    <h4 className="text-sm font-semibold mb-2">Test Steps</h4>
                    {testCase.test_steps?.length ? (
                      <div className="space-y-2">
                        {testCase.test_steps.map((step, idx) => (
                          <div key={idx} className="text-sm border rounded-lg p-3">
                            <div className="font-medium">
                              Step {step.step_number}: {step.action}
                            </div>
                            <div className="text-muted-foreground mt-1">
                              Expected: {step.expected}
                            </div>
                            {"data" in step && (step as any).data ? (
                              <div className="text-xs text-muted-foreground mt-1">
                                Data: {(step as any).data}
                              </div>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No steps available.</p>
                    )}
                  </div>

                  {testCase.expected_result ? (
                    <div>
                      <h4 className="text-sm font-semibold mb-2">Expected Result</h4>
                      <p className="text-sm text-muted-foreground">{testCase.expected_result}</p>
                    </div>
                  ) : null}

                  <div className="flex gap-2 pt-4 border-t">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 h-9 gap-2"
                      onClick={() => {
                        onViewDetails(testCase)
                        onOpenChange(false)
                      }}
                    >
                      <Eye className="h-4 w-4" />
                      Full Details View
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 h-9 gap-2"
                      onClick={() => {
                        onEdit(testCase)
                        onOpenChange(false)
                      }}
                    >
                      <Edit3 className="h-4 w-4" />
                      Edit Test Case
                    </Button>
                  </div>
                </div>
              </div>

              {/* Metadata */}
              <div className="rounded-lg border bg-background">
                <div className="border-b px-4 py-3">
                  <p className="text-sm font-medium">Metadata</p>
                </div>

                <div className="px-4 py-4 space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Status</span>
                    <Badge variant="outline">{testCase.status}</Badge>
                  </div>

                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Priority</span>
                    <Badge className={priorityClassName}>{testCase.priority}</Badge>
                  </div>

                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Type</span>
                    <Badge variant="secondary">{testCase.test_type}</Badge>
                  </div>

                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Created</span>
                    <span className="text-sm">
                      {new Date(testCase.created_at).toLocaleDateString()}
                    </span>
                  </div>

                  {testCase.updated_at ? (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Last Updated</span>
                      <span className="text-sm">
                        {new Date(testCase.updated_at).toLocaleDateString()}
                      </span>
                    </div>
                  ) : null}
                </div>
              </div>

              {/* Small UX helper */}
              {testCase.test_steps?.length ? (
                <div className="rounded-lg border bg-muted/50 p-4">
                  <h4 className="font-semibold text-sm flex items-center gap-2 mb-2">
                    <CheckCircle2 className="h-4 w-4" />
                    Next steps
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    Use “Full Details View” to review step coverage, attachments, and execution notes.
                  </p>
                </div>
              ) : null}
            </div>
          </div>

          {/* Footer */}
          <div className="border-t px-6 py-4 bg-background">
            <div className="flex items-center justify-between gap-2">
              <Button
                size="sm"
                variant="destructive"
                className="h-8 px-3 gap-2"
                onClick={() => {
                  onDelete(testCase)
                  onOpenChange(false)
                }}
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </Button>

              <SheetClose asChild>
                <Button size="sm" variant="default" className="h-8 px-3">
                  Close
                </Button>
              </SheetClose>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
