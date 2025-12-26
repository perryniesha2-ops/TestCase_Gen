"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Download,
  Chrome,
  CheckCircle2,
  MonitorSmartphone,
  AlertCircle,
  ExternalLink,
  Copy,
  Check,
} from "lucide-react"
import { toast } from "sonner"

export default function ExtensionPage() {
  const [copied, setCopied] = useState(false)
  const [extensionInstalled, setExtensionInstalled] = useState(false)

  // Check if extension is already installed - only on client
  useEffect(() => {
    const checkExtension = () => {
      const installed = !!(window as any).__QA_EXTENSION_INSTALLED
      setExtensionInstalled(installed)
    }
    
    checkExtension()
    
    // Re-check when window gains focus
    window.addEventListener('focus', checkExtension)
    return () => window.removeEventListener('focus', checkExtension)
  }, [])

  async function copyToClipboard(text: string) {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    toast.success("Copied to clipboard!")
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="container max-w-5xl py-8 space-y-8">
      {/* Header */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-primary/10 rounded-lg">
            <MonitorSmartphone className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">QA Test Recorder Extension</h1>
            <p className="text-muted-foreground">
              Record and run browser tests without writing code
            </p>
          </div>
        </div>

        {/* Installation Status */}
        {extensionInstalled ? (
          <Card className="border-green-200 bg-green-50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-6 w-6 text-green-600" />
                <div>
                  <h3 className="font-semibold text-green-900">Extension Installed!</h3>
                  <p className="text-sm text-green-700">
                    You're all set. Close this tab and start recording tests.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-yellow-200 bg-yellow-50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <AlertCircle className="h-6 w-6 text-yellow-600" />
                <div>
                  <h3 className="font-semibold text-yellow-900">Extension Not Detected</h3>
                  <p className="text-sm text-yellow-700">
                    Follow the instructions below to install the browser extension
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Browser Selection */}
      <Tabs defaultValue="chrome" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="chrome" className="gap-2">
            <Chrome className="h-4 w-4" />
            Chrome / Edge
          </TabsTrigger>
          <TabsTrigger value="firefox" className="gap-2">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0z"/>
            </svg>
            Firefox
          </TabsTrigger>
        </TabsList>

        {/* Chrome Installation */}
        <TabsContent value="chrome" className="space-y-6 mt-6">
          {/* Download Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="h-5 w-5" />
                Step 1: Download Extension
              </CardTitle>
              <CardDescription>
                Download the latest version of the QA Test Recorder for Chrome
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
                <div>
                  <p className="font-medium">QA Test Recorder v1.0.0</p>
                  <p className="text-sm text-muted-foreground">Chrome Extension (.zip)</p>
                </div>
              <Button className="gap-2" asChild>
  <a href="/extensions/qa-test-recorder-chrome-v1.0.0.zip" download>
    <Download className="h-4 w-4" />
    Download
  </a>
</Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Compatible with Chrome 88+ and Edge 88+
              </p>
            </CardContent>
          </Card>

          {/* Installation Steps */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Step 2: Install in Chrome
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                {[
                  {
                    step: 1,
                    title: "Extract the ZIP file",
                    description: "Unzip the downloaded file to a folder on your computer"
                  },
                  {
                    step: 2,
                    title: "Open Chrome Extensions",
                    description: "Navigate to chrome://extensions/ or click the puzzle icon → Manage Extensions"
                  },
                  {
                    step: 3,
                    title: "Enable Developer Mode",
                    description: "Toggle the 'Developer mode' switch in the top right corner"
                  },
                  {
                    step: 4,
                    title: "Load Unpacked Extension",
                    description: "Click 'Load unpacked' and select the extracted folder"
                  },
                  {
                    step: 5,
                    title: "Pin the Extension",
                    description: "Click the puzzle icon and pin the QA Test Recorder for easy access"
                  }
                ].map((item) => (
                  <div key={item.step} className="flex gap-4">
                    <div className="flex-shrink-0">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-semibold text-sm">
                        {item.step}
                      </div>
                    </div>
                    <div>
                      <p className="font-medium">{item.title}</p>
                      <p className="text-sm text-muted-foreground">{item.description}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Quick Copy */}
              <div className="mt-6 p-4 border rounded-lg bg-muted/50">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium">Quick Access URL:</p>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => copyToClipboard("chrome://extensions/")}
                    className="gap-2"
                  >
                    {copied ? (
                      <>
                        <Check className="h-4 w-4" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4" />
                        Copy
                      </>
                    )}
                  </Button>
                </div>
                <code className="text-sm bg-background px-2 py-1 rounded">
                  chrome://extensions/
                </code>
              </div>
            </CardContent>
          </Card>

          {/* Verification */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Step 3: Verify Installation
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                After installation, refresh this page to verify the extension is working
              </p>
              <Button
                variant="outline"
                className="w-full gap-2"
                onClick={() => window.location.reload()}
              >
                <CheckCircle2 className="h-4 w-4" />
                Refresh Page to Check
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Firefox Installation */}
        <TabsContent value="firefox" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="h-5 w-5" />
                Step 1: Download Extension
              </CardTitle>
              <CardDescription>
                Download the latest version of the QA Test Recorder for Firefox
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
                <div>
                  <p className="font-medium">QA Test Recorder v1.0.0</p>
                  <p className="text-sm text-muted-foreground">Firefox Add-on (.xpi)</p>
                </div>
                <Button className="gap-2">
                  <Download className="h-4 w-4" />
                  Download
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Step 2: Install in Firefox</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                {[
                  {
                    step: 1,
                    title: "Open Add-ons Manager",
                    description: "Navigate to about:addons or click the menu → Add-ons and themes"
                  },
                  {
                    step: 2,
                    title: "Install Add-on from File",
                    description: "Click the gear icon and select 'Install Add-on From File'"
                  },
                  {
                    step: 3,
                    title: "Select Downloaded File",
                    description: "Choose the .xpi file you downloaded"
                  },
                  {
                    step: 4,
                    title: "Confirm Installation",
                    description: "Click 'Add' when Firefox asks for confirmation"
                  }
                ].map((item) => (
                  <div key={item.step} className="flex gap-4">
                    <div className="flex-shrink-0">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-semibold text-sm">
                        {item.step}
                      </div>
                    </div>
                    <div>
                      <p className="font-medium">{item.title}</p>
                      <p className="text-sm text-muted-foreground">{item.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Features */}
      <Card>
        <CardHeader>
          <CardTitle>What You Can Do</CardTitle>
          <CardDescription>
            Powerful test automation features right in your browser
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            {[
              {
                icon: MonitorSmartphone,
                title: "Record Tests",
                description: "Click, type, and navigate - we capture everything automatically"
              },
              {
                icon: CheckCircle2,
                title: "Run Tests",
                description: "Execute recorded tests with one click and see results instantly"
              },
              {
                icon: Download,
                title: "Export to Code",
                description: "Convert recordings to Playwright code for CI/CD integration"
              },
              {
                icon: AlertCircle,
                title: "Smart Selectors",
                description: "Automatic fallback strategies ensure tests don't break easily"
              }
            ].map((feature, idx) => (
              <div key={idx} className="flex gap-3 p-4 border rounded-lg">
                <feature.icon className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-sm mb-1">{feature.title}</h4>
                  <p className="text-xs text-muted-foreground">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Support */}
      <Card>
        <CardHeader>
          <CardTitle>Need Help?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Having trouble installing the extension? Check out these resources:
          </p>
          <div className="flex flex-col gap-2">
            <Button variant="outline" className="justify-start gap-2" asChild>
              <a href="/pages/docs/extension-guide" target="_blank">
                <ExternalLink className="h-4 w-4" />
                Installation Guide
              </a>
            </Button>
            <Button variant="outline" className="justify-start gap-2" asChild>
              <a href="/pages/docs/troubleshooting" target="_blank">
                <ExternalLink className="h-4 w-4" />
                Troubleshooting
              </a>
            </Button>
            <Button variant="outline" className="justify-start gap-2" asChild>
              <a href="/pages/contact">
                <ExternalLink className="h-4 w-4" />
                Contact Support
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}