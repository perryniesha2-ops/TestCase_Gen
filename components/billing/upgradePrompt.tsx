// components/billing/UpgradePrompt.tsx
"use client";

import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Lock, Zap, TrendingUp, Code2, Layers } from "lucide-react";

const FEATURE_INFO: Record<
  string,
  { title: string; icon: any; description: string }
> = {
  automation: {
    title: "Test Automation",
    icon: Code2,
    description:
      "Generate Playwright, Selenium, and Cypress automation scripts from your test cases.",
  },
  "cross-platform": {
    title: "Cross-Platform Testing",
    icon: Layers,
    description:
      "Create unified test suites across Web, Mobile, API, and Accessibility platforms.",
  },
  "test-library": {
    title: "Advanced Test Library",
    icon: TrendingUp,
    description:
      "Organize test suites, track execution history, and manage test dependencies.",
  },
  analytics: {
    title: "Analytics Dashboard",
    icon: TrendingUp,
    description:
      "View detailed metrics, trends, and insights about your testing efforts.",
  },
  integrations: {
    title: "Integrations",
    icon: Zap,
    description:
      "Connect with Jira, TestRail, GitHub, and other tools in your workflow.",
  },
};

export function UpgradePrompt() {
  const searchParams = useSearchParams();

  const upgradeRequired = searchParams.get("upgrade") === "required";
  const feature = searchParams.get("feature");
  const redirect = searchParams.get("redirect");

  if (!upgradeRequired || !feature) {
    return null;
  }

  const featureInfo = FEATURE_INFO[feature] || {
    title: "Premium Feature",
    icon: Lock,
    description: "This feature requires a Pro subscription.",
  };

  const Icon = featureInfo.icon;

  return (
    <Card className="mb-6 border-primary/50 bg-primary/5">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Icon className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <CardTitle className="flex items-center gap-2">
              {featureInfo.title}
              <Badge variant="secondary" className="ml-2">
                <Lock className="mr-1 h-3 w-3" />
                Pro
              </Badge>
            </CardTitle>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Alert>
          <AlertDescription className="text-sm">
            <p className="mb-2 font-medium">
              Upgrade to Pro to unlock this feature
            </p>
            <p className="text-muted-foreground">{featureInfo.description}</p>
            {redirect && (
              <p className="mt-2 text-xs text-muted-foreground">
                After upgrading, you'll be redirected back to continue.
              </p>
            )}
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}
