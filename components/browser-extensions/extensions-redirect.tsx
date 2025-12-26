"use client"

import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AlertCircle, ExternalLink, Home } from "lucide-react"

export default function ExtensionRedirectPage() {
  const [countdown, setCountdown] = useState(5)
  const [redirecting, setRedirecting] = useState(true)

  useEffect(() => {
    // Try to detect if we're on the actual app
    const currentUrl = window.location.href
    
    // If we're already on the app domain, redirect immediately
    if (currentUrl.includes('localhost') || 
        currentUrl.includes('https://dev.synthqa.app/') ||
        currentUrl.includes('https://www.synthqa.app/')) { 
      
      // Redirect to extension page
      window.location.href = '/pages/browserextensions'
      return
    }

    // Otherwise, show manual options with countdown
    setRedirecting(false)

  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50 p-4">
      <Card className="max-w-md w-full">
        <CardContent className="pt-6">
          {redirecting ? (
            <div className="text-center space-y-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
              <h2 className="text-xl font-semibold">Redirecting...</h2>
              <p className="text-sm text-muted-foreground">
                Taking you to the extension page
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Warning */}
              <div className="flex items-start gap-3 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5 shrink-0" />
                <div className="flex-1">
                  <h3 className="font-semibold text-yellow-900 text-sm">
                    Extension Not Connected to Your App
                  </h3>
                  <p className="text-xs text-yellow-700 mt-1">
                    The extension couldn't detect your app URL. Please choose an option below.
                  </p>
                </div>
              </div>

              {/* Instructions */}
              <div className="space-y-4">
                <h2 className="text-lg font-semibold">What would you like to do?</h2>
                
                {/* Option 1: Go to app */}
                <div className="space-y-2">
                  <h3 className="font-medium text-sm">Option 1: Open Your App</h3>
                  <p className="text-xs text-muted-foreground">
                    If you have the app open in another tab, switch to it. Otherwise, open your app URL:
                  </p>
                  <div className="grid gap-2">
                    <Button
                      variant="default"
                      className="w-full justify-start gap-2"
                      onClick={() => {
                        // Try localhost first
                        window.open('http://localhost:3000/pages/browserextensions', '_blank')
                      }}
                    >
                      <Home className="h-4 w-4" />
                      Open Localhost (Development)
                    </Button>
                    
                    <Button
                      variant="outline"
                      className="w-full justify-start gap-2"
                      onClick={() => {
                        const prodUrl = prompt('Enter your app URL (e.g., https://www.synthqa.app/):')
                        if (prodUrl) {
                          window.open(`${prodUrl}/pages/browserextensions`, '_blank')
                        }
                      }}
                    >
                      <ExternalLink className="h-4 w-4" />
                      Enter Production URL
                    </Button>
                  </div>
                </div>

                {/* Option 2: Manual setup 
                <div className="space-y-2">
                  <h3 className="font-medium text-sm">Option 2: Manual Setup</h3>
                  <p className="text-xs text-muted-foreground">
                    For help installing and configuring the extension:
                  </p>
                  <Button
                    variant="outline"
                    className="w-full justify-start gap-2"
                    onClick={() => {
                      window.open('https://github.com/your-repo/docs/extension-setup', '_blank')
                    }}
                  >
                    <ExternalLink className="h-4 w-4" />
                    View Documentation
                  </Button>
                </div>
                 */}
              </div>
             

              {/* Tip */}
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-xs text-blue-900">
                  <strong>💡 Tip:</strong> Once you're on your app, open any test case and click the "Browser Extension" tab to start recording tests.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}