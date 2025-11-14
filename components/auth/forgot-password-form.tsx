"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { toast } from "sonner"
import { customResetPassword } from "@/app/auth/actions/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Mail, ArrowLeft, AlertTriangle } from "lucide-react"

export function ForgotPasswordForm() {
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [email, setEmail] = useState("")
  const searchParams = useSearchParams()
  
  // Check for error parameters (like expired token)
  const error = searchParams.get('error')

  useEffect(() => {
    if (error === 'expired') {
      toast.error("Reset link expired", {
        description: "The password reset link has expired. Please request a new one.",
        duration: 5000
      })
    }
  }, [error])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)

    const formData = new FormData(e.currentTarget)

    try {
      const result = await customResetPassword(formData)
      
      if (result?.error) {
        toast.error("Reset failed", {
          description: result.error,
        })
        setLoading(false)
      } else if (result?.success) {
        setSent(true)
        setEmail(formData.get("email") as string)
        toast.success("Reset email sent!", {
          description: result.message,
        })
        setLoading(false)
      }
    } catch (error) {
      toast.error("An unexpected error occurred")
      console.error(error)
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <Mail className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl">Check your email</CardTitle>
          <CardDescription>
            We&apos;ve sent a password reset link to <strong>{email}</strong>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <Mail className="h-4 w-4" />
            <AlertDescription>
              Click the link in the email to reset your password. The link will expire in 1 hour.
            </AlertDescription>
          </Alert>
          
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
            <p className="text-sm text-blue-800">
              <strong>Important:</strong> Click the reset link as soon as you receive it. If you wait too long, the link may expire and you&apos;ll need to request a new one.
            </p>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col space-y-4">
          <p className="text-sm text-muted-foreground text-center">
            Didn&apos;t receive the email? Check your spam folder or{" "}
            <button
              onClick={() => {
                setSent(false)
                setEmail("")
              }}
              className="text-primary hover:underline"
            >
              try again
            </button>
          </p>
          <Link href="/pages/login">
            <Button variant="ghost" className="w-full">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to login
            </Button>
          </Link>
        </CardFooter>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="text-2xl">Reset password</CardTitle>
        <CardDescription>
          Enter your email address and we&apos;ll send you a link to reset your password
        </CardDescription>
      </CardHeader>
      
      {error === 'expired' && (
        <CardContent className="pb-0">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Your previous reset link has expired. Please request a new one below.
            </AlertDescription>
          </Alert>
        </CardContent>
      )}
      
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email address</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="you@example.com"
              required
              disabled={loading}
            />
          </div>
          
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-md">
            <p className="text-sm text-amber-800">
              <strong>Tip:</strong> Click the reset link in your email immediately to avoid expiration issues.
            </p>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col space-y-4">
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Sending..." : "Send reset link"}
          </Button>
          <Link href="/pages/login">
            <Button variant="ghost" className="w-full">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to login
            </Button>
          </Link>
        </CardFooter>
      </form>
    </Card>
  )
}