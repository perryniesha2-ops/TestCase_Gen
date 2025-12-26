"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert"
import {
  Code2,
  Eye,
  Edit3,
  Trash2,
  MonitorSmartphone,
  Play,
  Circle,
  CheckCircle2,
  Download,
  AlertCircle,
  Info,
} from "lucide-react"
import { BrowserRecorder } from "@/components/browser-extensions/browser-recorder"
import { BrowserTestExecutor } from "@/components/browser-extensions/browser-test-executor"
import type { TestCase } from "@/types/test-cases"
import type { BrowserExecutionResult } from "@/types/browser-automation"

interface TestCaseActionSheetProps {
  testCase: TestCase | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onEdit: (testCase: TestCase) => void
  onDelete: (testCase: TestCase) => void
  onViewDetails: (testCase: TestCase) => void
  isAutomated: boolean
  onOpenScriptEditor?: (testCase: TestCase) => void
  onOpenAutomationDialog?: (testCase: TestCase) => void
}

export function TestCaseActionSheet({
  testCase,
  open,
  onOpenChange,
  onEdit,
  onDelete,
  onViewDetails,
  isAutomated,
  onOpenScriptEditor,
  onOpenAutomationDialog,
}: TestCaseActionSheetProps) {
  const [recordings, setRecordings] = useState<any[]>([])
  const [activeRecordingId, setActiveRecordingId] = useState<string | null>(null)
  const [loadingRecordings, setLoadingRecordings] = useState(false)
  const [extensionInstalled, setExtensionInstalled] = useState(false)
  const [showRecorder, setShowRecorder] = useState(false) 
  

  useEffect(() => {
    if (open && testCase) {
      fetchRecordings()
      checkExtensionInstalled()
    }
  }, [open, testCase?.id])

   if (!testCase) {
    return null}


  async function fetchRecordings() {
     if (!testCase) return
    setLoadingRecordings(true)
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('browser_recordings')
        .select('*')
        .eq('test_case_id', testCase.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setRecordings(data || [])
      
      if (data && data.length > 0) {
        setActiveRecordingId(data[0].id)
      }
    } catch (error) {
      console.error('Error fetching recordings:', error)
    } finally {
      setLoadingRecordings(false)
    }
  }

  function checkExtensionInstalled() {
    // Check if extension is installed
    const installed = !!(window as any).__QA_EXTENSION_INSTALLED
    setExtensionInstalled(installed)
  }

  function getPriorityColor(priority: string) {
    switch (priority) {
      case "critical": return "bg-red-500 text-white"
      case "high": return "bg-orange-500 text-white"
      case "medium": return "bg-yellow-500 text-black"
      case "low": return "bg-blue-500 text-white"
      default: return "bg-gray-500 text-white"
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="
          w-[800px] sm:w-[900px] lg:w-[1000px]
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
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <SheetTitle className="truncate">{testCase.title}</SheetTitle>
                <SheetDescription className="mt-1">
                  Test case automation and execution
                </SheetDescription>

                {/* Badges */}
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Badge className={getPriorityColor(testCase.priority)}>
                    {testCase.priority}
                  </Badge>
                  <Badge variant="secondary">{testCase.test_type}</Badge>
                  {isAutomated ? (
                    <Badge className="gap-1 bg-purple-100 text-purple-700">
                      <Code2 className="h-3 w-3" />
                      Playwright
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-muted-foreground">
                      Manual
                    </Badge>
                  )}
                  {recordings.length > 0 && (
                    <Badge className="gap-1 bg-green-100 text-green-700">
                      <MonitorSmartphone className="h-3 w-3" />
                      {recordings.length} recording{recordings.length > 1 ? 's' : ''}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-6 py-5">
            <Tabs defaultValue="browser" className="w-full">
<TabsList
  className="
    grid w-full grid-cols-3
    h-auto
    p-1
    gap-1
  "
>                <TabsTrigger value="browser"
  className="
    h-12
    flex items-center justify-center gap-2
    text-sm
    text-center
    leading-tight
    whitespace-normal
  "
>
                  <MonitorSmartphone className="h-4 w-4 shrink-0" />
                  <span className="block max-w-[6.5rem]">
                  Browser
                  Extension 
                   </span>
                </TabsTrigger>
                <TabsTrigger value="playwright" className="
    gap-2
    h-10
    text-xs sm:text-sm
    flex items-center justify-center
  ">
                  <Code2 className="h-4 w-4" />
                  Playwright
                </TabsTrigger>
                <TabsTrigger value="details" className="
    gap-2
    h-10
    text-xs sm:text-sm
    flex items-center justify-center
  ">
                  <Eye className="h-4 w-4" />
                  Details
                </TabsTrigger>
              </TabsList>

              {/* Browser Extension Tab */}
              <TabsContent value="browser" className="space-y-6 mt-6">
                {/* Extension Not Installed Alert */}
                {!extensionInstalled && (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Browser Extension Required</AlertTitle>
                    <AlertDescription>
                      Install the browser extension to record and run tests.
                      <Button 
                        variant="link" 
                        className="h-auto p-0 ml-1"
                        onClick={() => {
                          // Navigate to extension page
                          window.open('/pages/browserextensions', '_blank')
                        }}
                      >
                        Get Extension →
                      </Button>
                    </AlertDescription>
                  </Alert>
                )}

                {/* Recording Section */}
                {extensionInstalled && (
                  <div className="rounded-lg border bg-background">
                    <div className="border-b px-4 py-3">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium">Record Test</p>
                        <Badge variant="outline" className="gap-1">
                          <MonitorSmartphone className="h-3 w-3" />
                          Browser-based
                        </Badge>
                      </div>
                    </div>
                    <div className="px-4 py-4">
                      {/* ✅ IMPROVED: Show button first, then recorder */}
                      {!showRecorder ? (
                        <div className="space-y-4">
                          <div className="text-center py-8">
                            <MonitorSmartphone className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                            <h3 className="font-semibold mb-2">Ready to Record</h3>
                            <p className="text-sm text-muted-foreground mb-4">
                              Click below to start recording your test. Use your app normally, and we'll capture every action.
                            </p>
                            <Button 
                              onClick={() => setShowRecorder(true)}
                              className="gap-2"
                            >
                              <Circle className="h-4 w-4" />
                              Start Recording
                            </Button>
                          </div>

                          {/* Quick Tips */}
                          <div className="rounded-lg bg-blue-50 border border-blue-200 p-4">
                            <div className="flex items-start gap-2">
                              <Info className="h-4 w-4 text-blue-600 mt-0.5" />
                              <div className="flex-1 space-y-2 text-sm text-blue-900">
                                <p className="font-semibold">Recording Tips:</p>
                                <ul className="space-y-1 text-xs">
                                  <li>• Perform actions slowly and deliberately</li>
                                  <li>• Wait for pages to fully load</li>
                                  <li>• Each click, type, and navigation is captured</li>
                                  <li>• You can edit the recording after stopping</li>
                                </ul>
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <BrowserRecorder
                          testCaseId={testCase.id}
                          testCaseTitle={testCase.title}
                          onRecordingComplete={(recordingId: string) => {
                            setActiveRecordingId(recordingId)
                            fetchRecordings()
                            setShowRecorder(false) // ✅ Hide recorder after completion
                            toast.success("Recording saved!", {
                              description: "You can now run this test"
                            })
                          }}
                        />
                      )}
                    </div>
                  </div>
                )}

                {/* Existing Recordings */}
                {recordings.length > 0 && (
                  <div className="rounded-lg border bg-background">
                    <div className="border-b px-4 py-3">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium">Saved Recordings ({recordings.length})</p>
                      </div>
                    </div>
                    <div className="px-4 py-4 space-y-3">
                      {recordings.map((recording) => (
                        <div 
                          key={recording.id}
                          className={`
                            flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors
                            ${activeRecordingId === recording.id ? 'bg-primary/5 border-primary' : 'hover:bg-muted'}
                          `}
                          onClick={() => setActiveRecordingId(recording.id)}
                        >
                          <div className="flex items-center gap-3">
                            <Circle className={`h-3 w-3 ${activeRecordingId === recording.id ? 'fill-primary' : ''}`} />
                            <div>
                              <p className="text-sm font-medium">
                                {new Date(recording.created_at).toLocaleDateString()} at {new Date(recording.created_at).toLocaleTimeString()}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {recording.actions?.length || 0} actions • {recording.duration_ms ? `${Math.round(recording.duration_ms / 1000)}s` : 'N/A'}
                              </p>
                            </div>
                          </div>
                          {activeRecordingId === recording.id && (
                            <Badge variant="default" className="text-xs">Active</Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Execution Section */}
                {activeRecordingId && (
                  <div className="rounded-lg border bg-background">
                    <div className="border-b px-4 py-3">
                      <p className="text-sm font-medium">Run Test</p>
                    </div>
                    <div className="px-4 py-4">
                      <BrowserTestExecutor
                        testCaseId={testCase.id}
                        recordingId={activeRecordingId}
                        onExecutionComplete={(result: BrowserExecutionResult) => {
                          toast.success("Execution complete!")
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* Info Card */}
                <div className="rounded-lg border bg-muted/50 p-4">
                  <h4 className="font-semibold text-sm flex items-center gap-2 mb-3">
                    <MonitorSmartphone className="h-4 w-4" />
                    Browser Extension Benefits
                  </h4>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                      <span>Record by using your app - no code required</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                      <span>Run tests with one click in your browser</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                      <span>Automatic screenshots and console logs</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                      <span>Export to Playwright for CI/CD integration</span>
                    </div>
                  </div>
                </div>
              </TabsContent>

        
              {/* ✅ Playwright Tab - FULL IMPLEMENTATION */}
  <TabsContent value="playwright" className="space-y-6">
    <div className="rounded-lg border bg-background">
      <div className="border-b px-4 py-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium">Playwright Automation</p>
          <Badge variant="outline" className="gap-1">
            <Code2 className="h-3 w-3" />
            Code-based
          </Badge>
        </div>
      </div>

      <div className="px-4 py-4 space-y-4">
  {isAutomated ? (
    <>
      {/* Script Generated banner */}
      <div className="flex items-center justify-between rounded-lg border border-border bg-card p-3">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-emerald-500/10 text-emerald-600 dark:bg-emerald-400/10 dark:text-emerald-400">
            <CheckCircle2 className="h-4 w-4" />
          </span>

          <div className="leading-tight">
            <div className="text-sm font-semibold text-foreground">Script Generated</div>
            <div className="text-xs text-muted-foreground">
              Your Playwright script is ready to review and export.
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Button
          size="sm"
          variant="outline"
          className="w-full h-9 justify-start gap-2 text-foreground hover:bg-muted"
          onClick={() => onOpenScriptEditor?.(testCase)}
        >
                <Code2 className="h-4 w-4" />
                View / Edit Script
              </Button>

              <Button
                size="sm"
                variant="outline"
                className="w-full h-9 justify-start gap-2"
                onClick={async () => {
                  toast.info("Downloading script...")
                }}
              >
                <Download className="h-4 w-4" />
                Download Script
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="text-sm text-muted-foreground text-center py-6">
              No Playwright script generated yet
            </div>

            <Button
              size="sm"
              variant="default"
              className="w-full h-9 gap-2"
              onClick={() => onOpenAutomationDialog?.(testCase)}
              disabled={!testCase.test_steps?.length}
            >
              <Code2 className="h-4 w-4" />
              Generate Playwright Script
            </Button>

            {!testCase.test_steps?.length && (
              <p className="text-xs text-muted-foreground text-center">
                Test case must have steps to generate a script
              </p>
            )}
          </>
        )}
 </div>
    </div>
              </TabsContent>

              {/* Details Tab - Keep existing code */}
               {/* ✅ Details Tab - FULL IMPLEMENTATION */}
  <TabsContent value="details" className="space-y-6">
    <div className="rounded-lg border bg-background">
      <div className="border-b px-4 py-3">
        <p className="text-sm font-medium">Test Case Details</p>
      </div>
      <div className="px-4 py-4 space-y-4">
        <div>
          <h4 className="text-sm font-semibold mb-2">Description</h4>
          <p className="text-sm text-muted-foreground">
            {testCase.description || "No description provided"}
          </p>
        </div>

        {testCase.preconditions && (
          <div>
            <h4 className="text-sm font-semibold mb-2">Preconditions</h4>
            <p className="text-sm text-muted-foreground">
              {testCase.preconditions}
            </p>
          </div>
        )}

        <div>
          <h4 className="text-sm font-semibold mb-2">Test Steps</h4>
          <div className="space-y-2">
            {testCase.test_steps?.map((step, idx) => (
              <div key={idx} className="text-sm border rounded-lg p-3">
                <div className="font-medium">Step {step.step_number}: {step.action}</div>
                <div className="text-muted-foreground mt-1">
                  Expected: {step.expected}
                </div>
                {step.data && (
                  <div className="text-xs text-muted-foreground mt-1">
                    Data: {step.data}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {testCase.expected_result && (
          <div>
            <h4 className="text-sm font-semibold mb-2">Expected Result</h4>
            <p className="text-sm text-muted-foreground">
              {testCase.expected_result}
            </p>
          </div>
        )}

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
            className="flex-1 h-9 gap-0"
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
          <Badge className={getPriorityColor(testCase.priority)}>
            {testCase.priority}
          </Badge>
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
        {testCase.updated_at && (
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Last Updated</span>
            <span className="text-sm">
              {new Date(testCase.updated_at).toLocaleDateString()}
            </span>
          </div>
        )}
      </div>
    </div>
  </TabsContent>
            </Tabs>
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

              <div className="flex items-center gap-2">
               

                <SheetClose asChild>
                  <Button size="sm" variant="default" className="h-8 px-3">
                    Close
                  </Button>
                </SheetClose>
              </div>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}