"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Play, Loader2 } from "lucide-react"
import { toast } from "sonner"

interface ExecutionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  script: {
    id: string
    script_name: string
    framework: string
  }
  onExecutionStarted?: (executionId: string) => void
}

export function ExecutionDialog({
  open,
  onOpenChange,
  script,
  onExecutionStarted
}: ExecutionDialogProps) {
  const [browser, setBrowser] = useState<'chromium' | 'firefox' | 'webkit'>('chromium')
  const [headless, setHeadless] = useState(true)
  const [screenshots, setScreenshots] = useState(true)
  const [video, setVideo] = useState(true)
  const [executing, setExecuting] = useState(false)

  async function handleRun() {
    setExecuting(true)
    
    try {
      const response = await fetch('/api/execute-script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scriptId: script.id,
          browser,
          headless,
          captureScreenshots: screenshots,
          recordVideo: video
        })
      })
      
      const data = await response.json()
      
      if (!data.success) {
        throw new Error(data.error)
      }
      
      toast.success('Test execution started!')
      
      if (onExecutionStarted) {
        onExecutionStarted(data.executionId)
      }
      
      onOpenChange(false)
      
    } catch (error) {
      toast.error('Failed to start execution')
      console.error(error)
    } finally {
      setExecuting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Run Automation Test</DialogTitle>
          <DialogDescription>
            Execute {script.script_name} with Playwright
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Browser Selection */}
          <div className="space-y-3">
            <Label>Browser</Label>
            <RadioGroup value={browser} onValueChange={(v: any) => setBrowser(v)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="chromium" id="chromium" />
                <Label htmlFor="chromium" className="font-normal cursor-pointer">
                  Chromium (Chrome)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="firefox" id="firefox" />
                <Label htmlFor="firefox" className="font-normal cursor-pointer">
                  Firefox
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="webkit" id="webkit" />
                <Label htmlFor="webkit" className="font-normal cursor-pointer">
                  WebKit (Safari)
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Options */}
          <div className="space-y-3">
            <Label>Options</Label>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="headless"
                checked={headless}
                onCheckedChange={(checked) => setHeadless(checked as boolean)}
              />
              <Label htmlFor="headless" className="font-normal cursor-pointer">
                Headless mode (run in background)
              </Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="screenshots"
                checked={screenshots}
                onCheckedChange={(checked) => setScreenshots(checked as boolean)}
              />
              <Label htmlFor="screenshots" className="font-normal cursor-pointer">
                Capture screenshots
              </Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="video"
                checked={video}
                onCheckedChange={(checked) => setVideo(checked as boolean)}
              />
              <Label htmlFor="video" className="font-normal cursor-pointer">
                Record video
              </Label>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={executing}
          >
            Cancel
          </Button>
          <Button onClick={handleRun} disabled={executing}>
            {executing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Starting...
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Run Test
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}