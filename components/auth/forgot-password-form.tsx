"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { toast } from "sonner"
import { customResetPassword } from "@/app/auth/actions/auth"
import { cn } from "@/lib/utils"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from "@/components/ui/field"
import { Alert, AlertDescription } from "@/components/ui/alert"

import { ArrowLeft, AlertTriangle, Mail } from "lucide-react"

export function ForgotPasswordForm() {
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [email, setEmail] = useState("")
  const searchParams = useSearchParams()

  const error = searchParams.get("error")

  useEffect(() => {
    if (error === "expired") {
      toast.error("Reset link expired", {
        description: "The password reset link has expired. Please request a new one.",
        duration: 5000,
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
        toast.error("Reset failed", { description: result.error })
      } else if (result?.success) {
        const enteredEmail = String(formData.get("email") || "")
        setEmail(enteredEmail)
        setSent(true)
        toast.success("Reset email sent!", { description: result.message })
      } else {
        toast.error("Reset failed", { description: "Please try again." })
      }
    } catch (err) {
      console.error(err)
      toast.error("An unexpected error occurred")
    } finally {
      setLoading(false)
    }
  }

  // --- SENT STATE (styled like LoginForm) ---
  if (sent) {
    return (
      <div className={cn("flex flex-col gap-6")}>
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-xl">Check your email</CardTitle>
          </CardHeader>

          <CardContent>
            <FieldGroup>
              <FieldSeparator className="*:data-[slot=field-separator-content]:bg-card">
                We&apos;ve sent a reset link to <span className="font-medium">{email}</span>
              </FieldSeparator>

              <Field>
                <Alert>
                  <Mail className="h-4 w-4" />
                  <AlertDescription>
                    Click the link in the email to reset your password. The link expires in 1 hour.
                  </AlertDescription>
                </Alert>
              </Field>

              {error === "expired" && (
                <Field>
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      Your previous reset link expired. This new link will also expire in 1 hour.
                    </AlertDescription>
                  </Alert>
                </Field>
              )}

              <Field>
                <Button
                  type="button"
                  className="w-full"
                  variant="outline"
                  onClick={() => {
                    setSent(false)
                    setEmail("")
                  }}
                  disabled={loading}
                >
                  Send another link
                </Button>

                <FieldDescription className="text-center">
                  Didn&apos;t receive the email? Check spam/junk, or try another address.
                </FieldDescription>
              </Field>

              <Field>
                <Button asChild variant="ghost" className="w-full">
                  <Link href="/pages/login">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to login
                  </Link>
                </Button>
              </Field>
            </FieldGroup>
          </CardContent>
        </Card>
      </div>
    )
  }

  // --- DEFAULT STATE (styled like LoginForm) ---
  return (
    <div className={cn("flex flex-col gap-6")}>
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Reset password</CardTitle>
        </CardHeader>

        <CardContent>
          {error === "expired" && (
            <div className="mb-4">
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Your reset link expired. Request a new one below.
                </AlertDescription>
              </Alert>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <FieldGroup>
              <FieldSeparator className="*:data-[slot=field-separator-content]:bg-card">
                Enter your email to receive a reset link
              </FieldSeparator>

              <Field>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="you@example.com"
                  required
                  disabled={loading}
                />
              </Field>

              <Field>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Sending..." : "Send reset link"}
                </Button>

                <FieldDescription className="text-center">
                  Remembered your password? <Link className="hover:underline" href="/pages/login">Back to login</Link>
                </FieldDescription>
              </Field>

              <Field>
                <Button asChild variant="ghost" className="w-full">
                  <Link href="/pages/login">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to login
                  </Link>
                </Button>
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
