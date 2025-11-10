"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { toast } from "sonner"
import { updatePassword } from "@/app/auth/actions/auth"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle, AlertTriangle, Eye, EyeOff } from "lucide-react"

export function ResetPasswordForm() {
  const [loading, setLoading] = useState(false)
  const [isValidToken, setIsValidToken] = useState<boolean | null>(null)
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [success, setSuccess] = useState(false)
  
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  useEffect(() => {
    // Check if user has a valid session (from reset link)
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setIsValidToken(!!session)
    }

    checkSession()
  }, [supabase])

  const passwordsMatch = password === confirmPassword
  const isPasswordValid = password.length >= 6
  const canSubmit = isPasswordValid && passwordsMatch && password && confirmPassword

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    
    if (!canSubmit) {
      toast.error("Please check your password requirements")
      return
    }

    setLoading(true)

    const formData = new FormData()
    formData.append("password", password)

    try {
      const result = await updatePassword(formData)
      
      if (result?.error) {
        toast.error("Password update failed", {
          description: result.error,
        })
        setLoading(false)
      } else if (result?.success) {
        setSuccess(true)
        toast.success("Password updated!", {
          description: "Your password has been successfully updated.",
        })
        
        // Redirect to dashboard after a short delay
        setTimeout(() => {
          router.push("/pages/dashboard")
        }, 2000)
      }
    } catch (error) {
      toast.error("An unexpected error occurred")
      console.error(error)
      setLoading(false)
    }
  }

  // Loading state while checking token
  if (isValidToken === null) {
    return (
      <Card className="w-full max-w-md">
        <CardContent className="pt-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
          <p className="text-center text-muted-foreground mt-4">
            Verifying reset link...
          </p>
        </CardContent>
      </Card>
    )
  }

  // Invalid or expired token
  if (!isValidToken) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-destructive/10 rounded-full flex items-center justify-center mb-4">
            <AlertTriangle className="h-6 w-6 text-destructive" />
          </div>
          <CardTitle className="text-2xl">Invalid reset link</CardTitle>
          <CardDescription>
            This password reset link is invalid or has expired
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Reset links expire after 1 hour for security. Please request a new reset link.
            </AlertDescription>
          </Alert>
        </CardContent>
        <CardFooter>
          <Button 
            className="w-full" 
            onClick={() => router.push("/pages/forgot-password")}
          >
            Request new reset link
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
          <CardTitle className="text-2xl">Password updated!</CardTitle>
          <CardDescription>
            Your password has been successfully updated. You&apos;ll be redirected to your dashboard shortly.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              Redirecting you to the dashboard...
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  // Reset form
  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="text-2xl">Create new password</CardTitle>
        <CardDescription>
          Enter your new password below. Make sure it&apos;s secure and easy to remember.
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">New password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter new password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
                className={password && !isPasswordValid ? "border-destructive" : ""}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3"
                onClick={() => setShowPassword(!showPassword)}
                disabled={loading}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
            {password && !isPasswordValid && (
              <p className="text-sm text-destructive">
                Password must be at least 6 characters
              </p>
            )}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm password</Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={loading}
                className={confirmPassword && !passwordsMatch ? "border-destructive" : ""}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                disabled={loading}
              >
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
            {confirmPassword && !passwordsMatch && (
              <p className="text-sm text-destructive">
                Passwords don&apos;t match
              </p>
            )}
          </div>

          {/* Password requirements */}
          <div className="space-y-2">
            <p className="text-sm font-medium">Password requirements:</p>
            <ul className="text-sm space-y-1">
              <li className={`flex items-center gap-2 ${isPasswordValid ? 'text-green-600' : 'text-muted-foreground'}`}>
                <div className={`w-1.5 h-1.5 rounded-full ${isPasswordValid ? 'bg-green-600' : 'bg-gray-300'}`} />
                At least 6 characters
              </li>
              <li className={`flex items-center gap-2 ${passwordsMatch && confirmPassword ? 'text-green-600' : 'text-muted-foreground'}`}>
                <div className={`w-1.5 h-1.5 rounded-full ${passwordsMatch && confirmPassword ? 'bg-green-600' : 'bg-gray-300'}`} />
                Passwords match
              </li>
            </ul>
          </div>
        </CardContent>
        <CardFooter>
          <Button 
            type="submit" 
            className="w-full" 
            disabled={loading || !canSubmit}
          >
            {loading ? "Updating password..." : "Update password"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}