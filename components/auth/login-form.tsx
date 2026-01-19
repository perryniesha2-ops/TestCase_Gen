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
import { useAuth } from "@/lib/auth/auth-context";

const COOLDOWN_SECONDS = 3;

export function LoginForm() {
  const router = useRouter();

  const [cooldown, setCooldown] = useState(0);
  const cooldownTimerRef = useRef<number | null>(null);

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

    // Block submits during cooldown (separate from single-flight)
    if (cooldown > 0) return;

    const formData = new FormData(e.currentTarget);

    const result = await run(formData);

    // If single-flight blocked (duplicate submit), do nothing
    if (!result) return;

    // Always deter spamming after an attempt
    startCooldown(COOLDOWN_SECONDS);

    if ("error" in result) {
      toast.error("Login failed", { description: result.error });
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

              <Field>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  required
                  disabled={disabled}
                />
              </Field>

              <Field>
                <div className="flex items-center">
                  <div className="flex items-center gap-35">
                    <FieldLabel htmlFor="password">Password</FieldLabel>
                    <Link
                      href="/forgot-password"
                      className="text-sm text-muted-foreground hover:text-primary"
                    >
                      Forgot password?
                    </Link>
                  </div>
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
                  Don&apos;t have an account? <a href="/signup">Sign up</a>
                </FieldDescription>
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
