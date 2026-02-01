// components/billing/CancelSubscriptionDialog.tsx
"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertTriangle,
  Calendar,
  Check,
  Loader2,
  X,
  PauseCircle,
  TrendingDown,
} from "lucide-react";
import { toast } from "sonner";

interface CancelSubscriptionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentPeriodEnd?: string; // ISO date string
  planName: string; // "Pro", "Team", etc.
}

const CANCELLATION_REASONS = [
  "Too expensive",
  "Not using it enough",
  "Missing features I need",
  "Found a better alternative",
  "Technical issues",
  "Other",
];

export function CancelSubscriptionDialog({
  open,
  onOpenChange,
  currentPeriodEnd,
  planName,
}: CancelSubscriptionDialogProps) {
  const router = useRouter();
  const [step, setStep] = React.useState<"confirm" | "feedback" | "final">(
    "confirm",
  );
  const [cancelling, setCancelling] = React.useState(false);
  const [selectedReasons, setSelectedReasons] = React.useState<string[]>([]);
  const [feedback, setFeedback] = React.useState("");

  const periodEndDate = currentPeriodEnd
    ? new Date(currentPeriodEnd).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : "the end of your billing cycle";

  // Reset state when dialog closes
  React.useEffect(() => {
    if (!open) {
      setStep("confirm");
      setSelectedReasons([]);
      setFeedback("");
    }
  }, [open]);

  const handleDowngrade = () => {
    onOpenChange(false);
    // Scroll to pricing cards or navigate to billing page
    toast.info("Scroll down to choose a different plan");
  };

  const handleCancel = async () => {
    setCancelling(true);

    try {
      const response = await fetch("/api/billing/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reasons: selectedReasons,
          feedback: feedback.trim() || null,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to cancel subscription");
      }

      // Clear tier cache so middleware updates immediately
      document.cookie = "user_tier=; Max-Age=0; path=/";
      document.cookie = "tier_cache_time=; Max-Age=0; path=/";

      toast.success(
        `Subscription cancelled. You'll have access until ${periodEndDate}.`,
      );

      // Move to final confirmation step
      setStep("final");

      // Refresh the page after a moment
      setTimeout(() => {
        router.refresh();
        onOpenChange(false);
      }, 3000);
    } catch (error) {
      console.error("Cancellation error:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to cancel subscription",
      );
    } finally {
      setCancelling(false);
    }
  };

  const toggleReason = (reason: string) => {
    setSelectedReasons((prev) =>
      prev.includes(reason)
        ? prev.filter((r) => r !== reason)
        : [...prev, reason],
    );
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-2xl">
        {step === "confirm" && (
          <>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2 text-xl">
                <AlertTriangle className="h-5 w-5 text-orange-500" />
                Cancel your {planName} subscription?
              </AlertDialogTitle>
              <AlertDialogDescription className="text-base">
                We'd hate to see you go! Here's what you'll lose:
              </AlertDialogDescription>
            </AlertDialogHeader>

            <div className="space-y-4 my-4">
              {/* What they'll lose */}
              <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4">
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  <X className="h-4 w-4 text-destructive" />
                  Features you'll lose
                </h4>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <X className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <span>500 AI-generated test cases/month</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <X className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <span>Advanced AI models (GPT-4, Claude Opus)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <X className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <span>Cross-platform test generation</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <X className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <span>Test automation export</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <X className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <span>Priority support</span>
                  </li>
                </ul>
              </div>

              {/* What they'll keep */}
              <div className="rounded-lg border border-green-200 bg-green-50 p-4">
                <h4 className="font-medium mb-3 flex items-center gap-2 text-green-800">
                  <Check className="h-4 w-4 text-green-600" />
                  You'll still have access until {periodEndDate}
                </h4>
                <p className="text-sm text-green-700">
                  Your subscription won't renew, but you can continue using all
                  Pro features until the end of your current billing period.
                  After that, you'll be moved to the Free plan.
                </p>
              </div>

              {/* Alternatives */}
              <div className="space-y-2">
                <h4 className="font-medium text-sm">
                  Consider these alternatives:
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-1 gap-2">
                  <Button
                    variant="outline"
                    className="justify-center h-auto py-3 px-4"
                    onClick={handleDowngrade}
                  >
                    <TrendingDown className="h-4 w-4 mr-2 flex-shrink-0" />
                    <div className="text-left">
                      <div className="font-medium">Switch to Free plan</div>
                      <div className="text-xs text-muted-foreground">
                        Keep using basic features
                      </div>
                    </div>
                  </Button>
                </div>
              </div>
            </div>

            <AlertDialogFooter>
              <AlertDialogCancel>Keep my subscription</AlertDialogCancel>
              <Button variant="destructive" onClick={() => setStep("feedback")}>
                Continue to cancel
              </Button>
            </AlertDialogFooter>
          </>
        )}

        {step === "feedback" && (
          <>
            <AlertDialogHeader>
              <AlertDialogTitle>Help us improve</AlertDialogTitle>
              <AlertDialogDescription>
                Before you go, would you mind sharing why you're cancelling?
                This helps us improve our service.
              </AlertDialogDescription>
            </AlertDialogHeader>

            <div className="space-y-4 my-4">
              <div className="space-y-3">
                <Label>What's the main reason for cancelling? (optional)</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {CANCELLATION_REASONS.map((reason) => (
                    <div key={reason} className="flex items-center space-x-2">
                      <Checkbox
                        id={reason}
                        checked={selectedReasons.includes(reason)}
                        onCheckedChange={() => toggleReason(reason)}
                      />
                      <Label
                        htmlFor={reason}
                        className="text-sm font-normal cursor-pointer"
                      >
                        {reason}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="feedback">Additional feedback (optional)</Label>
                <Textarea
                  id="feedback"
                  placeholder="Tell us more about your experience..."
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  rows={4}
                />
              </div>

              <div className="text-xs text-muted-foreground">
                This feedback is optional but helps us improve. You can skip
                this step and cancel immediately.
              </div>
            </div>

            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setStep("confirm")}>
                Go back
              </AlertDialogCancel>
              <Button
                variant="outline"
                onClick={handleCancel}
                disabled={cancelling}
              >
                {cancelling ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Cancelling...
                  </>
                ) : (
                  "Skip & cancel now"
                )}
              </Button>
              <Button
                variant="destructive"
                onClick={handleCancel}
                disabled={cancelling}
              >
                {cancelling ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Cancelling...
                  </>
                ) : (
                  "Submit & cancel"
                )}
              </Button>
            </AlertDialogFooter>
          </>
        )}

        {step === "final" && (
          <>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <Check className="h-5 w-5 text-green-600" />
                Subscription cancelled
              </AlertDialogTitle>
              <AlertDialogDescription>
                Your subscription has been cancelled successfully.
              </AlertDialogDescription>
            </AlertDialogHeader>

            <div className="rounded-lg border border-green-200 bg-green-50 p-4 my-4">
              <div className="flex items-start gap-3">
                <Calendar className="h-5 w-5 text-green-600 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-medium text-green-800 mb-1">
                    Access until {periodEndDate}
                  </h4>
                  <p className="text-sm text-green-700">
                    You'll continue to have full access to all Pro features
                    until {periodEndDate}. After that, you'll be automatically
                    moved to the Free plan.
                  </p>
                  <p className="text-sm text-green-700 mt-2">
                    You can resubscribe anytime from your billing page.
                  </p>
                </div>
              </div>
            </div>

            <AlertDialogFooter>
              <Button onClick={() => onOpenChange(false)}>Close</Button>
            </AlertDialogFooter>
          </>
        )}
      </AlertDialogContent>
    </AlertDialog>
  );
}
