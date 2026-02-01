// hooks/useProAccess.ts
"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function useProAccess() {
  const [isPro, setIsPro] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkAccess() {
      const supabase = createClient();

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setIsPro(false);
        setLoading(false);
        return;
      }

      const { data: profile } = await supabase
        .from("user_profiles")
        .select("subscription_tier, subscription_status")
        .eq("id", user.id)
        .single();

      const tier = profile?.subscription_tier || "free";
      const status = profile?.subscription_status || "inactive";

      const hasProAccess =
        (tier === "pro" || tier === "team" || tier === "enterprise") &&
        (status === "active" || status === "trial");

      setIsPro(hasProAccess);
      setLoading(false);
    }

    void checkAccess();
  }, []);

  return { isPro, loading };
}

// ─────────────────────────────────────────────────────────────────────────────
// Example: Component with inline upgrade CTA
// ─────────────────────────────────────────────────────────────────────────────

/*
"use client";

import { useProAccess } from "@/hooks/useProAccess";
import { Button } from "@/components/ui/button";
import { Lock } from "lucide-react";
import Link from "next/link";

export function AutomationButton() {
  const { isPro, loading } = useProAccess();

  if (loading) {
    return <Button disabled>Loading...</Button>;
  }

  if (!isPro) {
    return (
      <Button asChild variant="outline" className="gap-2">
        <Link href="/billing?upgrade=required&feature=automation">
          <Lock className="h-4 w-4" />
          Upgrade to use Automation
        </Link>
      </Button>
    );
  }

  return (
    <Button onClick={() => {/* automation logic *\/}}>
      Generate Automation
    </Button>
  );
}
*/

// ─────────────────────────────────────────────────────────────────────────────
// Example: Disable features for free users with tooltip
// ─────────────────────────────────────────────────────────────────────────────

/*
"use client";

import { useProAccess } from "@/hooks/useProAccess";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Lock } from "lucide-react";

export function ProFeatureButton({
  children,
  onClick,
  feature = "premium-feature",
}: {
  children: React.ReactNode;
  onClick: () => void;
  feature?: string;
}) {
  const { isPro, loading } = useProAccess();

  if (loading) {
    return <Button disabled>{children}</Button>;
  }

  if (!isPro) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button disabled className="gap-2">
              <Lock className="h-4 w-4" />
              {children}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>This feature requires a Pro subscription</p>
            <a 
              href={`/billing?upgrade=required&feature=${feature}`}
              className="text-xs text-primary underline"
            >
              Upgrade now
            </a>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return <Button onClick={onClick}>{children}</Button>;
}
*/
