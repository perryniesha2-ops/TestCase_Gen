"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { customUpdatePassword } from "@/app/auth/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle, AlertTriangle, Eye, EyeOff, Loader2 } from "lucide-react";

export function ResetPasswordForm() {
  const [loading, setLoading] = useState(false);
  const [checkingToken, setCheckingToken] = useState(true);
  const [isValidToken, setIsValidToken] = useState<boolean | null>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [success, setSuccess] = useState(false);
  const [tokenError, setTokenError] = useState<string | null>(null);

  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  useEffect(() => {
    const checkToken = async () => {
      if (!token) {
        setIsValidToken(false);
        setTokenError("No reset token found in URL");
        setCheckingToken(false);
        return;
      }

      setIsValidToken(true);
      setCheckingToken(false);
    };

    checkToken();
  }, [token]);

  const passwordsMatch = password === confirmPassword;
  const isPasswordValid = password.length >= 6;
  const canSubmit =
    isPasswordValid &&
    passwordsMatch &&
    password &&
    confirmPassword &&
    isValidToken;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!canSubmit || !token) {
      toast.error("Please check your password requirements");
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("token", token);
      formData.append("password", password);

      const result = await customUpdatePassword(formData);

      if (result?.error) {
        console.error("❌ Password update failed:", result.error);

        if (
          result.error.includes("Invalid") ||
          result.error.includes("expired")
        ) {
          setIsValidToken(false);
          setTokenError(result.error);
        } else {
          toast.error("Password update failed", {
            description: result.error,
          });
        }
        setLoading(false);
      } else if (result?.success) {
        setSuccess(true);
        toast.success("Password updated!", {
          description:
            result.message || "Your password has been successfully updated.",
        });

        setTimeout(() => {
          router.push("/login");
        }, 2000);
      }
    } catch (error) {
      console.error("❌ Password update error:", error);
      toast.error("An unexpected error occurred");
      setLoading(false);
    }
  }

  if (checkingToken) {
    return (
      <Card className="w-full max-w-md">
        <CardContent className="pt-6">
          <div className="flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
          <p className="text-center text-muted-foreground mt-4">
            Verifying reset link...
          </p>
        </CardContent>
      </Card>
    );
  }

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
              {tokenError ||
                "Reset links expire after a certain time for security. Please request a new reset link."}
            </AlertDescription>
          </Alert>
        </CardContent>
        <CardFooter>
          <Button
            className="w-full"
            onClick={() => router.push("/forgot-password")}
          >
            Request new reset link
          </Button>
        </CardFooter>
      </Card>
    );
  }

  if (success) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <CheckCircle className="h-6 w-6 text-green-600" />
          </div>
          <CardTitle className="text-2xl">Password updated!</CardTitle>
          <CardDescription>
            Your password has been successfully updated. You can now sign in
            with your new password.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>Redirecting you to sign in...</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="text-2xl">Create new password</CardTitle>
        <CardDescription>
          Enter your new password below. Make sure it&apos;s secure and easy to
          remember.
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
                className={
                  password && !isPasswordValid ? "border-destructive" : ""
                }
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3"
                onClick={() => setShowPassword(!showPassword)}
                disabled={loading}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
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
                className={
                  confirmPassword && !passwordsMatch ? "border-destructive" : ""
                }
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                disabled={loading}
              >
                {showConfirmPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
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
              <li
                className={`flex items-center gap-2 ${
                  isPasswordValid ? "text-green-600" : "text-muted-foreground"
                }`}
              >
                <div
                  className={`w-1.5 h-1.5 rounded-full ${
                    isPasswordValid ? "bg-green-600" : "bg-gray-300"
                  }`}
                />
                At least 6 characters
              </li>
              <li
                className={`flex items-center gap-2 ${
                  passwordsMatch && confirmPassword
                    ? "text-green-600"
                    : "text-muted-foreground"
                }`}
              >
                <div
                  className={`w-1.5 h-1.5 rounded-full ${
                    passwordsMatch && confirmPassword
                      ? "bg-green-600"
                      : "bg-gray-300"
                  }`}
                />
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
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Updating password...
              </>
            ) : (
              "Update password"
            )}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
