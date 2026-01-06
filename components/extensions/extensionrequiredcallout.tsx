"use client";

import { useEffect, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ExternalLink, Plug, RefreshCw } from "lucide-react";
import { detectExtensionInstalled } from "@/lib/extensions/detectExtension";

export function ExtensionRequiredCallout({
  docHref = "/docs/browser-extension",
  onDetected,
}: {
  docHref?: string;
  onDetected?: (installed: boolean) => void;
}) {
  const [installed, setInstalled] = useState<boolean | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [checking, setChecking] = useState(false);

  async function check() {
    setChecking(true);
    const ok = await detectExtensionInstalled();
    setInstalled(ok);
    onDetected?.(ok);
    setChecking(false);
  }

  useEffect(() => {
    void check();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (dismissed) return null;

  // While unknown, show nothing (or a tiny inline state if you prefer)
  if (installed === null) return null;

  if (installed) return null;

  return (
    <Alert className="border-amber-300 bg-amber-50">
      <div className="flex items-start gap-3">
        <div className="mt-0.5">
          <Plug className="h-5 w-5 text-amber-700" />
        </div>

        <div className="flex-1 space-y-2">
          <AlertTitle className="text-amber-900">
            Browser extension required for Capture
          </AlertTitle>
          <AlertDescription className="text-amber-900/80">
            To capture screenshots (and recordings), install the SynthQA
            Evidence Capture extension.
            <ol className="list-decimal ml-5 mt-2 space-y-1 text-sm">
              <li>Download/install the extension</li>
              <li>Pin it to your toolbar (optional, recommended)</li>
              <li>
                Open your app-under-test tab, click the extension icon, then
                Capture
              </li>
            </ol>
          </AlertDescription>

          <div className="flex flex-wrap gap-2 pt-1">
            <Button asChild size="sm" variant="outline">
              <a href={docHref} target="_blank" rel="noreferrer">
                View install steps <ExternalLink className="h-4 w-4 ml-2" />
              </a>
            </Button>

            <Button
              size="sm"
              variant="secondary"
              onClick={check}
              disabled={checking}
            >
              <RefreshCw
                className={`h-4 w-4 mr-2 ${checking ? "animate-spin" : ""}`}
              />
              Re-check
            </Button>

            <Button
              size="sm"
              variant="ghost"
              onClick={() => setDismissed(true)}
            >
              Dismiss
            </Button>
          </div>
        </div>
      </div>
    </Alert>
  );
}
