"use client";

import { useState } from "react";
import { ContactSheet } from "@/components/legal/contactSheet";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Lock, Sparkles } from "lucide-react";
import { Logo } from "@/components/pagecomponents/brandlogo";

export default function BetaPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/beta-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (res.ok) {
        router.refresh();
        router.push("/login");
      } else {
        setError("Incorrect password. Please try again.");
        setPassword("");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-8">
        {/* Logo / branding */}
        <div className="text-center space-y-3">
          <div className="flex items-center justify-center gap-2">
            <Logo size="lg" />
          </div>
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight">Private Beta</h1>
            <p className="text-sm text-muted-foreground">
              Enter your access password to continue.
            </p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="password"
                placeholder="Beta access password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-9"
                autoFocus
                disabled={loading}
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={loading || !password.trim()}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Verifying…
              </>
            ) : (
              "Access Beta"
            )}
          </Button>
        </form>

        <div className="text-center text-xs text-muted-foreground flex items-center justify-center gap-1">
          <span>Don&apos;t have access?</span>
          <ContactSheet className="text-xs underline underline-offset-4 hover:text-foreground" />
          <span>Request access</span>
        </div>
      </div>
    </div>
  );
}
