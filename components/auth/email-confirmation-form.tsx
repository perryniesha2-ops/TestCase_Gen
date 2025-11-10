"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { toast } from "sonner"
import { confirmEmail } from "@/app/auth/actions/auth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle, AlertTriangle, Loader2 } from "lucide-react"

export function EmailConfirmationForm() {
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmedEmail, setConfirmedEmail] = useState("")
  
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  useEffect(() => {
    if (token) {
      handleConfirmation(token)
    } else {
      setError("Invalid confirmation link - missing token")
    }
  }, [token])

  async function handleConfirmation(confirmToken: string) {
    setLoading(true)
    
    const formData = new FormData()
    formData.append("token", confirmToken)

    try {
      const result = await confirmEmail(formData)
      
      if (result?.error) {
        setError(result.error)
        toast.error("Confirmation failed", {
          description: result.error,
        })
      } else if (result?.success) {
        setSuccess(true)
        setConfirmedEmail(result.email || "")
        toast.success("Email confirmed!", {
          description: result.message,
        })
        
        // Redirect to login after a short delay
        setTimeout(() => {
          router.push("/pages/login?message=email_confirmed")
        }, 3000)
      }
    } catch (error) {
      setError("An unexpected error occurred")
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  // Loading state
  if (loading && !error && !success) {
    return (
      <Card className="w-full max-w-md">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center justify-center py-8">
            <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
            <h3 className="text-lg font-medium mb-2">Confirming your email...</h3>
            <p className="text-sm text-muted-foreground text-center">
              Please wait while we verify your confirmation link.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Error state
  if (error) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-destructive/10 rounded-full flex items-center justify-center mb-4">
            <AlertTriangle className="h-6 w-6 text-destructive" />
          </div>
          <CardTitle className="text-2xl">Confirmation Failed</CardTitle>
          <CardDescription>
            There was a problem confirming your email address
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {error}
            </AlertDescription>
          </Alert>
          
          {error.includes("expired") && (
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
              <p className="text-sm text-blue-800">
                <strong>Need a new confirmation link?</strong> You can request a new one from the signup page.
              </p>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex flex-col gap-2">
          <Button 
            className="w-full" 
            onClick={() => router.push("/pages/signup")}
          >
            Back to Signup
          </Button>
          <Button 
            variant="outline"
            className="w-full" 
            onClick={() => router.push("/pages/login")}
          >
            Go to Login
          </Button>
        </CardFooter>
      </Card>
    )
  }

  // Success state
  if (success) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <CheckCircle className="h-6 w-6 text-green-600" />
          </div>
          <CardTitle className="text-2xl">Email Confirmed!</CardTitle>
          <CardDescription>
            Welcome to SynthQA! Your account is now ready to use.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              Your email {confirmedEmail && <strong>{confirmedEmail}</strong>} has been successfully confirmed. You can now log in and start generating test cases!
            </AlertDescription>
          </Alert>
          
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
            <h4 className="font-medium text-blue-900 mb-2">🎉 What&apos;s next?</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Log in to your account</li>
              <li>• Create your first requirements</li>
              <li>• Generate AI-powered test cases</li>
              <li>• Build comprehensive test coverage</li>
            </ul>
          </div>

          <div className="mt-4 text-center">
            <p className="text-sm text-muted-foreground">
              Redirecting to login page in a few seconds...
            </p>
          </div>
        </CardContent>
        <CardFooter>
          <Button 
            className="w-full" 
            onClick={() => router.push("/pages/login")}
          >
            Go to Login
          </Button>
        </CardFooter>
      </Card>
    )
  }

  // Fallback state (shouldn't reach here)
  return (
    <Card className="w-full max-w-md">
      <CardContent className="pt-6">
        <div className="text-center">
          <p className="text-muted-foreground">Processing...</p>
        </div>
      </CardContent>
    </Card>
  )
}