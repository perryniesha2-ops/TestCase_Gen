// app/(dashboard)/guides/browser-extension-troubleshooting/page.tsx
"use client"

import * as React from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"
import {
  AlertTriangle,
  CheckCircle2,
  Copy,
  ExternalLink,
  HelpCircle,
  Info,
  Puzzle,
  Shield,
  Wrench,
  Bug,
  Database,
  Gauge,
  Globe,
  Play,
  Code2,
  ListChecks,
} from "lucide-react"
import {Logo} from '@/components/pagecomponents/brandlogo'
import {Footer} from '@/components/landingpage/footer'

type TocItem = { id: string; title: string; icon?: React.ReactNode }

function CodeBlock({ code, label }: { code: string; label?: string }) {
  const [copied, setCopied] = React.useState(false)

  async function onCopy() {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1200)
    } catch {
      // Ignore clipboard errors
    }
  }

  return (
    <div className="rounded-xl border bg-muted/40">
      <div className="flex items-center justify-between px-3 py-2 border-b">
        <div className="text-xs text-muted-foreground">{label ?? "Code"}</div>
        <Button variant="ghost" size="sm" className="h-7 gap-2" onClick={onCopy}>
          <Copy className="h-4 w-4" />
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
      <pre className="overflow-x-auto p-3 text-sm leading-relaxed">
        <code>{code}</code>
      </pre>
    </div>
  )
}

function Section({
  id,
  title,
  kicker,
  children,
}: {
  id: string
  title: string
  kicker?: string
  children: React.ReactNode
}) {
  return (
    <section id={id} className="scroll-mt-24">
      <div className="mb-4">
        {kicker ? (
          <div className="text-xs uppercase tracking-wide text-muted-foreground">{kicker}</div>
        ) : null}
        <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  )
}

export default function BrowserExtensionTroubleshootingPage() {
  const toc: TocItem[] = [
    { id: "quick-diagnostics", title: "Quick Diagnostics", icon: <ListChecks className="h-4 w-4" /> },
    { id: "installation-issues", title: "Installation Issues", icon: <Puzzle className="h-4 w-4" /> },
    { id: "detection-issues", title: "Detection Issues", icon: <Info className="h-4 w-4" /> },
    { id: "recording-issues", title: "Recording Issues", icon: <Play className="h-4 w-4" /> },
    { id: "execution-issues", title: "Execution Issues", icon: <Code2 className="h-4 w-4" /> },
    { id: "export-issues", title: "Export Issues", icon: <Code2 className="h-4 w-4" /> },
    { id: "database-issues", title: "Database Issues", icon: <Database className="h-4 w-4" /> },
    { id: "performance-issues", title: "Performance Issues", icon: <Gauge className="h-4 w-4" /> },
    { id: "browser-specific", title: "Browser-Specific Issues", icon: <Globe className="h-4 w-4" /> },
    { id: "advanced-debugging", title: "Advanced Debugging", icon: <Wrench className="h-4 w-4" /> },
    { id: "known-limitations", title: "Known Limitations", icon: <AlertTriangle className="h-4 w-4" /> },
    { id: "reset", title: "Complete Reset", icon: <Wrench className="h-4 w-4" /> },
    { id: "support", title: "Getting Help", icon: <HelpCircle className="h-4 w-4" /> },
  ]

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10">
      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="space-y-2">
          <Logo size="xl" />
          <h1 className="text-3xl font-semibold tracking-tight">Browser Extension Troubleshooting Guide</h1>
          <p className="max-w-2xl text-muted-foreground">
            Diagnose installation, detection, recording, execution, export, and data issues for the QA Test Recorder
            extension. Start with quick diagnostics, then follow the relevant section.
          </p>
          <Badge variant="secondary">Troubleshooting</Badge>

        </div>

        <div className="flex gap-2">
          <Button asChild variant="secondary">
            <Link href="#quick-diagnostics">Run Quick Checks</Link>
          </Button>
          <Button asChild>
            <Link href="/pages/docs/extension-guide">Back to Installation Guide</Link>
          </Button>
        </div>
      </div>

      <Separator className="my-8" />

      <div className="grid gap-8 lg:grid-cols-[260px_1fr]">
        {/* Sticky TOC */}
        <aside className="hidden lg:block">
          <div className="sticky top-20 rounded-2xl border bg-card p-4">
            <div className="mb-3 text-sm font-medium">On this page</div>
            <nav className="space-y-1">
              {toc.map((item) => (
                <a
                  key={item.id}
                  href={`#${item.id}`}
                  className={cn(
                    "flex items-center gap-2 rounded-lg px-2 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  {item.icon}
                  <span>{item.title}</span>
                </a>
              ))}
            </nav>
          </div>
        </aside>

        {/* Content */}
        <main className="space-y-10">
          {/* QUICK DIAGNOSTICS */}
          <Section id="quick-diagnostics" title="Quick Diagnostics" kicker="Start here">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>Fast path</AlertTitle>
              <AlertDescription>
                If any quick check fails, jump to the matching section below. Most issues are caused by site access,
                developer mode, or stale tabs after reloading the extension.
              </AlertDescription>
            </Alert>

            <Card>
              <CardHeader>
                <CardTitle>Basic health check</CardTitle>
                <CardDescription>Run these three checks before deeper investigation.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-muted-foreground">
                <div className="space-y-2">
                  <div className="font-medium text-foreground">1) Extension installed?</div>
                  <CodeBlock
                    label="Chrome extensions page"
                    code={`Go to: chrome://extensions/
Look for: "QA Test Recorder v1.0.0"
Status: Enabled (toggle ON)`}
                  />
                </div>

                <div className="space-y-2">
                  <div className="font-medium text-foreground">2) Extension detected on the page?</div>
                  <CodeBlock
                    label="Console check"
                    code={`// Open DevTools (F12), then run:
window.__QA_EXTENSION_INSTALLED
// Expected: true`}
                  />
                </div>

                <div className="space-y-2">
                  <div className="font-medium text-foreground">3) Content script running?</div>
                  <CodeBlock
                    label="Expected logs"
                    code={`🎯 QA Test Recorder content script loaded
✅ QA Test Recorder ready`}
                  />
                </div>

                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>If these fail</AlertTitle>
                  <AlertDescription>
                    Continue to the relevant section below. If you recently reloaded the extension, close affected tabs
                    and reopen them.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </Section>

          {/* INSTALLATION ISSUES */}
          <Section id="installation-issues" title="Installation Issues" kicker="Setup problems">
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="load-unpacked-disabled">
                <AccordionTrigger>“Load unpacked” button is disabled</AccordionTrigger>
                <AccordionContent className="space-y-3 text-sm text-muted-foreground">
                  <div>
                    <div className="font-medium text-foreground">Symptoms</div>
                    <ul className="list-disc pl-5 space-y-1">
                      <li>“Load unpacked” is grayed out</li>
                      <li>Cannot select a folder</li>
                    </ul>
                  </div>

                  <div>
                    <div className="font-medium text-foreground">Cause</div>
                    <div>Developer mode is not enabled.</div>
                  </div>

                  <div>
                    <div className="font-medium text-foreground">Solution</div>
                    <ol className="list-decimal pl-5 space-y-1">
                      <li>Go to <span className="font-medium">chrome://extensions/</span></li>
                      <li>Enable <span className="font-medium">Developer mode</span> (top-right)</li>
                      <li>Retry <span className="font-medium">Load unpacked</span></li>
                    </ol>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="cannot-load-extension">
                <AccordionTrigger>“Cannot load extension” / “Manifest file is missing or unreadable”</AccordionTrigger>
                <AccordionContent className="space-y-3 text-sm text-muted-foreground">
                  <div>
                    <div className="font-medium text-foreground">Cause</div>
                    <div>Wrong folder selected or ZIP not fully extracted.</div>
                  </div>

                  <div>
                    <div className="font-medium text-foreground">Solution</div>
                    <ol className="list-decimal pl-5 space-y-1">
                      <li>Re-extract the ZIP completely</li>
                      <li>Select the folder containing <span className="font-medium">manifest.json</span></li>
                      <li>Verify the folder contains the expected files</li>
                    </ol>
                  </div>

                  <CodeBlock
                    label="Expected files"
                    code={`manifest.json
background.js
content.js
injected.js
popup.html
popup.js
url-helper.js
icons/`}
                  />

                  <CodeBlock
                    label="Folder selection examples"
                    code={`✅ Correct: .../qa-test-recorder/manifest.json
❌ Wrong:   .../Downloads/manifest.json
❌ Wrong:   .../qa-test-recorder.zip`}
                  />
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="installs-but-errors">
                <AccordionTrigger>Extension installs but shows errors (warning icon / “Errors” button)</AccordionTrigger>
                <AccordionContent className="space-y-3 text-sm text-muted-foreground">
                  <ol className="list-decimal pl-5 space-y-1">
                    <li>Click <span className="font-medium">Errors</span> on the extension card</li>
                    <li>Use the message to identify the likely missing file/manifest issue</li>
                  </ol>

                  <div className="space-y-2">
                    <Alert>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertTitle>icons.16 missing</AlertTitle>
                      <AlertDescription>
                        Icons folder missing or empty. Re-download and extract the extension ZIP again.
                      </AlertDescription>
                    </Alert>

                    <Alert>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertTitle>Permission “storage” is invalid</AlertTitle>
                      <AlertDescription>
                        Manifest may be corrupted. Re-download the extension ZIP and reinstall.
                      </AlertDescription>
                    </Alert>

                    <Alert>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertTitle>Could not load background script</AlertTitle>
                      <AlertDescription>
                        background.js missing or not extracted. Re-extract ZIP and load the correct folder.
                      </AlertDescription>
                    </Alert>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </Section>

          {/* DETECTION ISSUES */}
          <Section id="detection-issues" title="Detection Issues" kicker="Dashboard cannot see extension">
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="not-detected-dashboard">
                <AccordionTrigger>Extension not detected on dashboard</AccordionTrigger>
                <AccordionContent className="space-y-3 text-sm text-muted-foreground">
                  <div>
                    <div className="font-medium text-foreground">Symptoms</div>
                    <ul className="list-disc pl-5 space-y-1">
                      <li>Dashboard shows “Extension Not Detected”</li>
                      <li><span className="font-medium">window.__QA_EXTENSION_INSTALLED</span> is undefined</li>
                    </ul>
                  </div>

                  <div className="space-y-2">
                    <div className="font-medium text-foreground">Diagnosis</div>
                    <CodeBlock
                      label="Look for these logs"
                      code={`✅ Should see: "🎯 QA Test Recorder content script loaded"
❌ If missing: content script is not running`}
                    />
                  </div>

                  <div className="space-y-4">
                    <div>
                      <div className="font-medium text-foreground">Solution 1: Site access permissions</div>
                      <ol className="list-decimal pl-5 space-y-1">
                        <li>Go to <span className="font-medium">chrome://extensions/</span></li>
                        <li>Open <span className="font-medium">Details</span> for QA Test Recorder</li>
                        <li>Set <span className="font-medium">Site access</span> to <span className="font-medium">On all sites</span></li>
                        <li>Refresh your dashboard</li>
                      </ol>
                    </div>

                    <div>
                      <div className="font-medium text-foreground">Solution 2: Hard refresh</div>
                      <CodeBlock
                        label="Hard refresh shortcuts"
                        code={`Windows/Linux: Ctrl + Shift + R
Mac: Cmd + Shift + R`}
                      />
                    </div>

                    <div>
                      <div className="font-medium text-foreground">Solution 3: Content scripts not registered</div>
                      <ol className="list-decimal pl-5 space-y-1">
                        <li>Open <span className="font-medium">chrome://extensions/</span></li>
                        <li>Click the <span className="font-medium">service worker</span> link</li>
                        <li>Run the snippet below</li>
                      </ol>
                      <CodeBlock
                        label="Check registered content scripts"
                        code={`chrome.scripting.getRegisteredContentScripts().then(scripts => {
  console.log('Registered scripts:', scripts)
})`}
                      />
                      <div className="text-xs">
                        If the list is empty, remove and reinstall the extension.
                      </div>
                    </div>

                    <div>
                      <div className="font-medium text-foreground">Solution 4: Extension context invalidated</div>
                      <div className="text-sm text-muted-foreground">
                        If you reloaded the extension while the dashboard tab was open:
                      </div>
                      <ol className="list-decimal pl-5 space-y-1">
                        <li>Close the affected tabs</li>
                        <li>Open a fresh tab</li>
                        <li>Navigate back to the dashboard</li>
                      </ol>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="icon-not-in-toolbar">
                <AccordionTrigger>Extension icon does not appear in the toolbar</AccordionTrigger>
                <AccordionContent className="space-y-3 text-sm text-muted-foreground">
                  <div>
                    <div className="font-medium text-foreground">Cause</div>
                    <div>The extension is not pinned.</div>
                  </div>
                  <div>
                    <div className="font-medium text-foreground">Solution</div>
                    <ol className="list-decimal pl-5 space-y-1">
                      <li>Click the puzzle icon (🧩)</li>
                      <li>Find “QA Test Recorder”</li>
                      <li>Click the pin icon</li>
                    </ol>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </Section>

          {/* RECORDING ISSUES */}
          <Section id="recording-issues" title="Recording Issues" kicker="Capture problems">
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="start-recording-ui-missing">
                <AccordionTrigger>“Start Recording” UI does not appear</AccordionTrigger>
                <AccordionContent className="space-y-3 text-sm text-muted-foreground">
                  <div className="font-medium text-foreground">Diagnosis</div>
                  <CodeBlock
                    label="Check install flag"
                    code={`window.__QA_EXTENSION_INSTALLED
// undefined => extension not loaded
// true => UI/rendering issue`}
                  />
                  <div className="space-y-2">
                    <div className="font-medium text-foreground">If extension not loaded</div>
                    <div>Follow the “Extension not detected on dashboard” section above.</div>
                  </div>
                  <div className="space-y-2">
                    <div className="font-medium text-foreground">If extension is loaded</div>
                    <ol className="list-decimal pl-5 space-y-1">
                      <li>Hard refresh (Ctrl/Cmd + Shift + R)</li>
                      <li>Clear cache</li>
                      <li>Check console for React errors</li>
                    </ol>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="new-tab-opens-no-recording">
                <AccordionTrigger>New tab opens, but recording does not start</AccordionTrigger>
                <AccordionContent className="space-y-3 text-sm text-muted-foreground">
                  <div className="font-medium text-foreground">Diagnosis (in the new tab)</div>
                  <CodeBlock
                    label="Expected console checks"
                    code={`window.__QA_EXTENSION_INSTALLED
// Expected: true

// Expected log:
🎬 Auto-starting recording from storage: rec_xxxxx`}
                  />

                  <div className="space-y-3">
                    <div>
                      <div className="font-medium text-foreground">Solution 1: Storage not set</div>
                      <ol className="list-decimal pl-5 space-y-1">
                        <li>Return to the dashboard tab</li>
                        <li>Open console and look for: <span className="font-medium">✅ Saved to chrome.storage: activeRecording</span></li>
                        <li>If missing, hard refresh dashboard and try again</li>
                      </ol>
                    </div>

                    <div>
                      <div className="font-medium text-foreground">Solution 2: Content script not loaded in new tab</div>
                      <ol className="list-decimal pl-5 space-y-1">
                        <li>Confirm the new tab logs <span className="font-medium">🎯 QA Test Recorder content script loaded</span></li>
                        <li>If missing, ensure Site access is “On all sites”</li>
                        <li>Try a different URL (site may restrict scripts)</li>
                      </ol>
                    </div>

                    <div>
                      <div className="font-medium text-foreground">Solution 3: Extension context invalidated</div>
                      <ol className="list-decimal pl-5 space-y-1">
                        <li>Close all tabs</li>
                        <li>Go to <span className="font-medium">chrome://extensions/</span></li>
                        <li>Reload the extension</li>
                        <li>Open fresh tabs and retry</li>
                      </ol>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="actions-not-captured">
                <AccordionTrigger>Actions are not being captured (counter stays at 0)</AccordionTrigger>
                <AccordionContent className="space-y-3 text-sm text-muted-foreground">
                  <div className="font-medium text-foreground">Diagnosis</div>
                  <CodeBlock
                    label="Expected logs while interacting"
                    code={`📝 Recorded click: ...
📝 Recorded input: ...`}
                  />

                  <div className="space-y-3">
                    <div>
                      <div className="font-medium text-foreground">Solution 1: Check recording state</div>
                      <CodeBlock
                        label="Recording state"
                        code={`window.__QA_RECORDER?.isRecording?.()
// Expected: true`}
                      />
                    </div>

                    <div>
                      <div className="font-medium text-foreground">Solution 2: Element constraints</div>
                      <ul className="list-disc pl-5 space-y-1">
                        <li>Iframes may block capture</li>
                        <li>Some Shadow DOM elements may not be recordable</li>
                        <li>Try different elements to validate capture pipeline</li>
                      </ul>
                    </div>

                    <div>
                      <div className="font-medium text-foreground">Solution 3: Slow down actions</div>
                      <ul className="list-disc pl-5 space-y-1">
                        <li>Wait 500ms–1s between actions</li>
                        <li>Allow pages to fully load before clicking</li>
                      </ul>
                    </div>

                    <div>
                      <div className="font-medium text-foreground">Solution 4: Re-record</div>
                      <ol className="list-decimal pl-5 space-y-1">
                        <li>Stop recording</li>
                        <li>Close the recording tab</li>
                        <li>Start a new recording and retry slowly</li>
                      </ol>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="counter-not-updating">
                <AccordionTrigger>Actions captured, but dashboard counter does not update</AccordionTrigger>
                <AccordionContent className="space-y-3 text-sm text-muted-foreground">
                  <div className="font-medium text-foreground">Cause</div>
                  <div>Cross-tab communication or polling issue.</div>

                  <div className="space-y-3">
                    <div>
                      <div className="font-medium text-foreground">Solution 1: Polling not working</div>
                      <div>Check the dashboard console for errors and expected update logs.</div>
                      <CodeBlock
                        label="Expected dashboard log"
                        code={`📊 Action count update: X`}
                      />
                    </div>

                    <div>
                      <div className="font-medium text-foreground">Solution 2: Verify storage data</div>
                      <CodeBlock
                        label="Read activeRecording"
                        code={`chrome.storage.local.get('activeRecording', (result) => {
  console.log('Storage:', result)
})`}
                      />
                    </div>

                    <div>
                      <div className="font-medium text-foreground">Solution 3: Refresh dashboard</div>
                      <ul className="list-disc pl-5 space-y-1">
                        <li>Keep the recording tab open</li>
                        <li>Hard refresh the dashboard tab</li>
                        <li>Counter should sync</li>
                      </ul>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="processing-stuck">
                <AccordionTrigger>Recording stuck in “Processing”</AccordionTrigger>
                <AccordionContent className="space-y-3 text-sm text-muted-foreground">
                  <div className="font-medium text-foreground">Diagnosis</div>
                  <CodeBlock
                    label="Expected dashboard logs"
                    code={`📥 Completed recording from storage: ...
💾 Saving recording: ...`}
                  />

                  <div className="space-y-3">
                    <div>
                      <div className="font-medium text-foreground">Solution 1: Check completedRecording</div>
                      <CodeBlock
                        label="Read completedRecording"
                        code={`chrome.storage.local.get('completedRecording', (result) => {
  console.log('Completed:', result)
})`}
                      />
                    </div>

                    <div>
                      <div className="font-medium text-foreground">Solution 2: Database/network issue</div>
                      <ul className="list-disc pl-5 space-y-1">
                        <li>Check for Supabase errors in console</li>
                        <li>Open Network tab and look for 400/401/403/500</li>
                        <li>Verify you are logged in and have permission</li>
                      </ul>
                    </div>

                    <div>
                      <div className="font-medium text-foreground">Solution 3: Force stop</div>
                      <ol className="list-decimal pl-5 space-y-1">
                        <li>Refresh the dashboard</li>
                        <li>Check “View Recordings” — it may have saved</li>
                      </ol>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </Section>

          {/* EXECUTION ISSUES */}
          <Section id="execution-issues" title="Execution Issues" kicker="Playback problems">
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="run-opens-tab-nothing">
                <AccordionTrigger>“Run Test” opens a tab but nothing happens</AccordionTrigger>
                <AccordionContent className="space-y-3 text-sm text-muted-foreground">
                  <div className="font-medium text-foreground">Diagnosis (in execution tab console)</div>
                  <CodeBlock
                    label="Expected logs"
                    code={`▶️ Executing test with X actions
⏸️ Executing step 1...`}
                  />

                  <div className="space-y-3">
                    <div>
                      <div className="font-medium text-foreground">Solution 1: Extension not loaded</div>
                      <CodeBlock
                        label="Check extension flag"
                        code={`window.__QA_EXTENSION_INSTALLED`}
                      />
                      <div className="text-xs">If undefined/false, hard refresh the execution tab.</div>
                    </div>

                    <div>
                      <div className="font-medium text-foreground">Solution 2: Execute command not sent</div>
                      <div>Check the dashboard console for “Sending execute command…” or related errors.</div>
                    </div>

                    <div>
                      <div className="font-medium text-foreground">Solution 3: Selector drift</div>
                      <ul className="list-disc pl-5 space-y-1">
                        <li>Look for “Element not found” errors</li>
                        <li>Re-record if the UI changed significantly</li>
                      </ul>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="fails-at-step">
                <AccordionTrigger>Test fails at a specific step</AccordionTrigger>
                <AccordionContent className="space-y-3 text-sm text-muted-foreground">
                  <div className="font-medium text-foreground">Common errors</div>

                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Element not found: [selector]</AlertTitle>
                    <AlertDescription>
                      Element changed or no longer exists. Confirm it exists and re-record if needed. Ensure the page
                      fully loaded before the step executes.
                    </AlertDescription>
                  </Alert>

                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Timeout waiting for element</AlertTitle>
                    <AlertDescription>
                      Page may be slow. Increase step delay (if supported), verify network stability, and validate the
                      target page is not failing to load.
                    </AlertDescription>
                  </Alert>

                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Element not visible</AlertTitle>
                    <AlertDescription>
                      Element may be off-screen, hidden, or blocked by a modal. Scrolling/visibility state may need to
                      be addressed in the flow.
                    </AlertDescription>
                  </Alert>

                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Navigation failed</AlertTitle>
                    <AlertDescription>
                      URL changed or auth is required. Validate the URL, confirm the page loads normally, and ensure the
                      session is authenticated.
                    </AlertDescription>
                  </Alert>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </Section>

          {/* EXPORT ISSUES */}
          <Section id="export-issues" title="Export Issues" kicker="Playwright output">
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="empty-export">
                <AccordionTrigger>Playwright export downloads an empty file</AccordionTrigger>
                <AccordionContent className="space-y-3 text-sm text-muted-foreground">
                  <ol className="list-decimal pl-5 space-y-1">
                    <li>Confirm the recording contains actions</li>
                    <li>Retry export</li>
                    <li>If it persists, check the console for export errors</li>
                  </ol>
                  <CodeBlock
                    label="Sanity check"
                    code={`// Recording should have actions:
recording.actions.length > 0`}
                  />
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="export-doesnt-run">
                <AccordionTrigger>Exported Playwright code does not work</AccordionTrigger>
                <AccordionContent className="space-y-3 text-sm text-muted-foreground">
                  <div className="space-y-2">
                    <div className="font-medium text-foreground">Common fixes</div>
                    <CodeBlock
                      label="Install Playwright"
                      code={`npm install -D @playwright/test`}
                    />
                    <CodeBlock
                      label="Add waits (example)"
                      code={`await page.waitForLoadState('networkidle')`}
                    />
                    <ul className="list-disc pl-5 space-y-1">
                      <li>If auth is required, add login steps or use storage state</li>
                      <li>Selectors may need adjustment if the UI differs in CI</li>
                    </ul>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </Section>

          {/* DATABASE ISSUES */}
          <Section id="database-issues" title="Database Issues" kicker="Saving & permissions">
            <Card>
              <CardHeader>
                <CardTitle>“Failed to save recording”</CardTitle>
                <CardDescription>Most often authentication or RLS policy issues.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <div className="font-medium text-foreground">Common HTTP errors</div>
                <ul className="list-disc pl-5 space-y-1">
                  <li><span className="font-medium">400</span>: validation / payload shape issue</li>
                  <li><span className="font-medium">401</span>: not authenticated / session expired</li>
                  <li><span className="font-medium">403</span>: RLS or permission denied</li>
                  <li><span className="font-medium">500</span>: server/database error</li>
                </ul>

                <Alert>
                  <Database className="h-4 w-4" />
                  <AlertTitle>Action</AlertTitle>
                  <AlertDescription>
                    Check DevTools Network tab for the failing request and inspect the response body. Use that to decide
                    whether this is payload validation, auth, RLS, or backend availability.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </Section>

          {/* PERFORMANCE ISSUES */}
          <Section id="performance-issues" title="Performance Issues" kicker="Speed & timing">
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="recording-laggy">
                <AccordionTrigger>Recording feels slow or laggy</AccordionTrigger>
                <AccordionContent className="space-y-3 text-sm text-muted-foreground">
                  <ol className="list-decimal pl-5 space-y-1">
                    <li>Close other tabs and heavy apps</li>
                    <li>Disable other extensions temporarily</li>
                    <li>Use incognito for isolated testing (if enabled)</li>
                    <li>Check system CPU/RAM utilization</li>
                  </ol>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="execution-too-fast">
                <AccordionTrigger>Execution runs too fast (timing failures)</AccordionTrigger>
                <AccordionContent className="space-y-3 text-sm text-muted-foreground">
                  <div>Increase step delay (if your execution options support it):</div>
                  <CodeBlock
                    label="Example execution option"
                    code={`{
  stepDelay: 1000 // wait 1 second between steps
}`}
                  />
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </Section>

          {/* BROWSER SPECIFIC */}
          <Section id="browser-specific" title="Browser-Specific Issues" kicker="Chrome vs Edge">
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="edge-not-working">
                <AccordionTrigger>Works in Chrome but not Edge</AccordionTrigger>
                <AccordionContent className="space-y-2 text-sm text-muted-foreground">
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Verify Edge version 88+</li>
                    <li>Use <span className="font-medium">edge://extensions/</span> for installation</li>
                    <li>Ensure Site access permissions are set correctly</li>
                  </ul>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="breaks-after-update">
                <AccordionTrigger>Extension breaks after a browser update</AccordionTrigger>
                <AccordionContent className="space-y-2 text-sm text-muted-foreground">
                  <ol className="list-decimal pl-5 space-y-1">
                    <li>Re-download the latest extension build</li>
                    <li>Remove old version</li>
                    <li>Install fresh via Load unpacked</li>
                    <li>If persistent, report to support with console logs</li>
                  </ol>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </Section>

          {/* ADVANCED DEBUGGING */}
          <Section id="advanced-debugging" title="Advanced Debugging" kicker="Deep dives">
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="verbose-logging">
                <AccordionTrigger>Enable verbose logging</AccordionTrigger>
                <AccordionContent className="space-y-3 text-sm text-muted-foreground">
                  <CodeBlock
                    label="Enable QA_DEBUG"
                    code={`localStorage.setItem('QA_DEBUG', 'true')
// Reload the page to see additional logs`}
                  />
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="service-worker">
                <AccordionTrigger>Check the extension service worker</AccordionTrigger>
                <AccordionContent className="space-y-3 text-sm text-muted-foreground">
                  <CodeBlock
                    label="Steps"
                    code={`1) chrome://extensions/
2) Click the "service worker" link
3) Check for console errors
4) Look for:
   - "🎯 QA Test Recorder extension loaded"
   - "✅ Content scripts registered successfully"`}
                  />
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="inspect-storage">
                <AccordionTrigger>Inspect Chrome storage</AccordionTrigger>
                <AccordionContent className="space-y-3 text-sm text-muted-foreground">
                  <CodeBlock
                    label="View all storage"
                    code={`chrome.storage.local.get(null, (items) => {
  console.log('All storage:', items)
})`}
                  />
                  <CodeBlock
                    label="Check specific keys"
                    code={`chrome.storage.local.get(['activeRecording', 'completedRecording'], (result) => {
  console.log('Recordings:', result)
})`}
                  />
                  <CodeBlock
                    label="Clear storage"
                    code={`chrome.storage.local.clear(() => {
  console.log('Storage cleared')
})`}
                  />
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="network-debugging">
                <AccordionTrigger>Network debugging (Supabase calls)</AccordionTrigger>
                <AccordionContent className="space-y-2 text-sm text-muted-foreground">
                  <ol className="list-decimal pl-5 space-y-1">
                    <li>Open DevTools → Network</li>
                    <li>Filter to Fetch/XHR</li>
                    <li>Identify failing requests (400/401/403/500)</li>
                    <li>Open response body for details</li>
                  </ol>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </Section>

          {/* KNOWN LIMITATIONS */}
          <Section id="known-limitations" title="Known Limitations" kicker="Current constraints">
            <Card>
              <CardHeader>
                <CardTitle>Current limitations</CardTitle>
                <CardDescription>These are expected in the current release.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <ul className="list-disc pl-5 space-y-1">
                  <li>No iframe support (content inside iframes may not record)</li>
                  <li>No file upload capture</li>
                  <li>Shadow DOM support is limited</li>
                  <li>No drag-and-drop capture</li>
                  <li>Multi-tab flows are limited (single tab recording behavior may apply)</li>
                </ul>

                <Separator className="my-3" />

                <div className="font-medium text-foreground">Planned</div>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Screenshot capture</li>
                  <li>Element highlighting</li>
                  <li>Advanced assertions</li>
                  <li>Expanded iframe support</li>
                  <li>Visual regression testing</li>
                </ul>
              </CardContent>
            </Card>
          </Section>

          {/* COMPLETE RESET */}
          <Section id="reset" title="Complete Reset" kicker="Emergency procedure">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Use as last resort</AlertTitle>
              <AlertDescription>
                If you have multiple unknown failures across detection, recording, and execution, perform a clean reset.
              </AlertDescription>
            </Alert>

            <CodeBlock
              label="Complete reset checklist"
              code={`1) Remove extension:
   chrome://extensions/ → Remove

2) Clear extension data:
   chrome://settings/siteData
   Search: "chrome-extension://"
   Remove all extension data

3) Clear browser cache:
   Ctrl+Shift+Delete → Clear all

4) Restart Chrome completely

5) Fresh install:
   Re-download extension
   Extract to a new folder
   Install via Load unpacked

6) Verify:
   Confirm "✅ QA Test Recorder ready"
   Test a short recording flow`}
            />
          </Section>

          {/* SUPPORT */}
          <Section id="support" title="Getting Additional Help" kicker="Support">
            <Card>
              <CardHeader>
                <CardTitle>Before contacting support</CardTitle>
                <CardDescription>Collect the data below so issues can be diagnosed quickly.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-muted-foreground">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <div className="font-medium text-foreground">Browser information</div>
                    <CodeBlock
                      label="Where to find versions"
                      code={`Chrome version: chrome://version/
Extension version: chrome://extensions/
OS: Windows / Mac / Linux`}
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="font-medium text-foreground">Error details</div>
                    <ul className="list-disc pl-5 space-y-1">
                      <li>Console errors (F12)</li>
                      <li>Service worker console errors</li>
                      <li>Screenshots</li>
                      <li>Steps to reproduce</li>
                    </ul>
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <div className="font-medium text-foreground">Bug report template</div>
                  <div className="rounded-xl border bg-muted/40 p-3 text-sm">
                    <pre className="whitespace-pre-wrap">
{`Bug Description:
[Clear description]

Steps to Reproduce:
1) ...
2) ...
3) ...

Expected Behavior:
[What should happen]

Actual Behavior:
[What happened]

Environment:
- Chrome/Edge version:
- Extension version:
- OS:
- URL:

Console Errors:
[Paste errors]

Screenshots:
[Attach]`}
                    </pre>
                  </div>
                </div>

                <Alert>
                  <Bug className="h-4 w-4" />
                  <AlertTitle>Contact support</AlertTitle>
                  <AlertDescription>
                    Email <span className="font-medium">support@synthqa.app</span> with the template above. Include
                    console logs (text preferred, screenshots acceptable) or click 'Contact'.
                  </AlertDescription>
                </Alert>

                <div className="text-xs text-muted-foreground">
                  Last updated: December 2025 · QA Test Recorder v1.0.0
                </div>
              </CardContent>
            </Card>
          </Section>
        </main>
      </div>
      <Footer />      
    </div>
  )
}
