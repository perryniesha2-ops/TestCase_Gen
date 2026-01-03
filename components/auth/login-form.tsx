"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { login } from "@/app/auth/actions/auth";
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
  FieldSeparator,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";

export function LoginForm() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);

    try {
      const result = await login(formData);

      if (result?.error) {
        toast.error("Login failed", {
          description: result.error,
        });
      } else {
        toast.success("Welcome back!");
        router.push("/dashboard");
      }
    } catch (error) {
      toast.error("An unexpected error occurred");
      console.error(error);
    } finally {
      setLoading(false);
    }
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
                  placeholder="you@example.com"
                  required
                  disabled={loading}
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
                  placeholder="••••••••"
                  required
                  disabled={loading}
                />
              </Field>
              <Field>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Signing in..." : "Sign in"}
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
