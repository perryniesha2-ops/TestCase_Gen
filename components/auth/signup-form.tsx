"use client"
import Link from "next/link"
import { toast } from "sonner"
import { useState } from "react"
import { useRouter } from "next/navigation"



import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { customSignup } from "@/app/auth/actions/auth"




export function SignupForm(){
   const [loading, setLoading] = useState(false)
    const router = useRouter()


  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)

    const formData = new FormData(e.currentTarget)
    
    const password = formData.get("password") as string
    const confirmPassword = formData.get("confirmPassword") as string

    if (password !== confirmPassword) {
      toast.error("Passwords don't match")
      setLoading(false)
      return
    }

 try {
    const result = await customSignup(formData)
    
    if (result?.error) {
      toast.error("Signup failed", {
        description: result.error,
      })
    } else if (result?.success && result?.requiresConfirmation) {
      toast.success("Account created!", {
        description: "Please check your email to confirm your account.",
      })
    } else if (result?.success) {
      router.push("/pages/dashboard")
    }
  } catch (error) {
    toast.error("An unexpected error occurred")
  } finally {
    setLoading(false)
  }
}
  
  return (
    <div className={cn("flex flex-col gap-6",)}>
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Create your account</CardTitle>
          <CardDescription>
            Enter your email below to create your account
          </CardDescription>
        </CardHeader>
        <CardContent>
        <form onSubmit={handleSubmit}>
              <FieldGroup>
              <Field>
                <FieldLabel htmlFor="name">Full Name</FieldLabel>
                <Input id="name" type="text" placeholder="John Doe" required />
              </Field>
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
                <Field className="grid grid-cols-2 gap-4">
                  <Field>
                    <FieldLabel htmlFor="password">Password</FieldLabel>
 <Input
              id="password"
              name="password"
              type="password"
              placeholder="••••••••"
              minLength={6}
              required
              disabled={loading}
            />                  </Field>
                  <Field>
                    <FieldLabel htmlFor="confirm-password">
                      Confirm Password
                    </FieldLabel>
 <Input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              placeholder="••••••••"
              minLength={6}
              required
              disabled={loading}
            />                  </Field>
                </Field>
                <FieldDescription>
                  Must be at least 6 characters long.
                </FieldDescription>
              </Field>
              <Field>
                <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Creating account..." : "Create account"}
          </Button>
                <FieldDescription className="text-center">
                  Already have an account? <a href="/pages/login">Sign in</a>
                </FieldDescription>
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
      
    </div>
  )
}
