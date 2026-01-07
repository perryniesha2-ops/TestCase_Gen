"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { customSignup } from "@/app/auth/actions/auth";

const COOLDOWN_SECONDS = 3;

export function SignupForm() {
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  const inFlightRef = useRef(false);
  const cooldownTimerRef = useRef<number | null>(null);

  const router = useRouter();

  const disabled = loading || cooldown > 0;

  useEffect(() => {
    return () => {
      if (cooldownTimerRef.current)
        window.clearInterval(cooldownTimerRef.current);
    };
  }, []);

  function startCooldown(seconds: number) {
    // Clear any existing timer
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

    // Single-flight: ignore if a request is already in progress
    if (inFlightRef.current) return;

    // Optional: also deter re-clicks during cooldown even if request ended
    if (cooldown > 0) return;

    inFlightRef.current = true;
    setLoading(true);

    const formData = new FormData(e.currentTarget);

    const password = (formData.get("password") ?? "").toString();
    const confirmPassword = (formData.get("confirmPassword") ?? "").toString();

    if (password !== confirmPassword) {
      toast.error("Passwords don't match");
      setLoading(false);
      inFlightRef.current = false;
      startCooldown(COOLDOWN_SECONDS);
      return;
    }

    try {
      const result = await customSignup(formData);

      if (result?.error) {
        toast.error("Signup failed", { description: result.error });
      } else if (result?.success && result?.requiresConfirmation) {
        toast.success("Account created!", {
          description: "Please check your email to confirm your account.",
        });
      } else if (result?.success) {
        router.push("/dashboard");
      } else {
        toast.error("Signup failed", { description: "Unexpected response." });
      }
    } catch (error) {
      toast.error("An unexpected error occurred");
      console.error(error);
    } finally {
      setLoading(false);
      inFlightRef.current = false;

      // Cooldown after any attempt (success/failure) to reduce spam
      startCooldown(COOLDOWN_SECONDS);
    }
  }

  return (
    <div className={cn("flex flex-col gap-6")}>
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
                {/* IMPORTANT: ensure name has a `name` attribute so it reaches FormData */}
                <Input
                  id="name"
                  name="name"
                  type="text"
                  placeholder="John Doe"
                  required
                  disabled={disabled}
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="you@example.com"
                  required
                  disabled={disabled}
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
                      disabled={disabled}
                    />
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="confirmPassword">
                      Confirm Password
                    </FieldLabel>
                    <Input
                      id="confirmPassword"
                      name="confirmPassword"
                      type="password"
                      placeholder="••••••••"
                      minLength={6}
                      required
                      disabled={disabled}
                    />
                  </Field>
                </Field>

                <FieldDescription>
                  Must be at least 6 characters long.
                </FieldDescription>
              </Field>

              <Field>
                <Button
                  type="submit"
                  className="w-full"
                  disabled={disabled}
                  aria-busy={loading}
                >
                  {loading
                    ? "Creating account..."
                    : cooldown > 0
                    ? `Please wait ${cooldown}s...`
                    : "Create account"}
                </Button>

                <FieldDescription className="text-center">
                  Already have an account? <Link href="/login">Sign in</Link>
                </FieldDescription>
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
