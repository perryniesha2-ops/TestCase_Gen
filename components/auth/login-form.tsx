"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { login } from "@/app/auth/actions/auth";
import { cn } from "@/lib/utils";
import { useSingleFlight } from "@/lib/auth/use-single-flight";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/lib/auth/auth-context";
import { AlertCircle, Mail } from "lucide-react";

const COOLDOWN_SECONDS = 3;

export function LoginForm() {
  const router = useRouter();

  const [cooldown, setCooldown] = useState(0);
  const cooldownTimerRef = useRef<number | null>(null);
  const [emailNotConfirmed, setEmailNotConfirmed] = useState(false);
  const [userEmail, setUserEmail] = useState("");

  const { run, loading } = useSingleFlight(async (formData: FormData) => {
    return await login(formData);
  });

  const disabled = loading || cooldown > 0;
  const { refreshAuth } = useAuth();

  useEffect(() => {
    return () => {
      if (cooldownTimerRef.current)
        window.clearInterval(cooldownTimerRef.current);
    };
  }, []);

  function startCooldown(seconds: number) {
    if (cooldownTimerRef.current)
      window.clearInterval(cooldownTimerRef.current);

    setCooldown(seconds);
    cooldownTimerRef.current = window.setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          if (cooldownTimerRef.current)
            window.clearInterval(cooldownTimerRef.current);
          cooldownTimerRef.current = null;
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    // Reset email confirmation error state
    setEmailNotConfirmed(false);

    // Block submits during cooldown
    if (cooldown > 0) return;

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;

    const result = await run(formData);

    // If single-flight blocked (duplicate submit), do nothing
    if (!result) return;

    // Always deter spamming after an attempt
    startCooldown(COOLDOWN_SECONDS);

    if ("error" in result) {
      // Check if it's an email confirmation issue
      if (result.code === "EMAIL_NOT_CONFIRMED") {
        setEmailNotConfirmed(true);
        setUserEmail(email);
        toast.error("Email not confirmed", {
          description: result.error,
        });
      } else {
        toast.error("Login failed", { description: result.error });
      }
      return;
    }

    toast.success("Welcome back!");
    await refreshAuth();

    router.replace("/dashboard");
    router.refresh();
  }

  return (
    <div className={cn("flex flex-col gap-6")}>
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Welcome back</CardTitle>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit}>
            <FieldGroup>
              <FieldSeparator className="*:data-[slot=field-separator-content]:bg-card">
                Enter your email to access your account
              </FieldSeparator>

              {/* Email Confirmation Alert */}
              {emailNotConfirmed && (
                <Alert variant="destructive" className="mb-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="flex flex-col gap-2">
                    <p className="font-medium">
                      Your email address hasn't been confirmed yet.
                    </p>
                    <p className="text-sm">
                      Please check your inbox for the confirmation email. Didn't
                      receive it?
                    </p>
                    <div className="flex justify-items-center">
                      <Button
                        asChild
                        variant="outline"
                        size="sm"
                        className="w-ful"
                      >
                        <Link
                          href={`/resend-confirmation?email=${encodeURIComponent(userEmail)}`}
                        >
                          <Mail className="h-4 w-4 mr-2" />
                          Resend Confirmation Email
                        </Link>
                      </Button>
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              <Field>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  required
                  disabled={disabled}
                  defaultValue={userEmail}
                />
              </Field>

              <Field>
                <div className="flex items-center justify-between">
                  <FieldLabel htmlFor="password">Password</FieldLabel>
                  <Link
                    href="/forgot-password"
                    className="text-sm text-muted-foreground hover:text-primary"
                  >
                    Forgot password?
                  </Link>
                </div>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  required
                  disabled={disabled}
                />
              </Field>

              <Field>
                <Button
                  type="submit"
                  className="w-full"
                  disabled={disabled}
                  aria-busy={loading}
                >
                  {loading
                    ? "Signing in..."
                    : cooldown > 0
                      ? `Please wait ${cooldown}s...`
                      : "Sign in"}
                </Button>

                <FieldDescription className="text-center">
                  Don&apos;t have an account?{" "}
                  <Link href="/signup" className="text-primary hover:underline">
                    Sign up
                  </Link>
                </FieldDescription>
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
