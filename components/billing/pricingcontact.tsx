"use client";

import * as React from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

type Props = {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  action?: string;
  defaultSubject?: string;
  defaultMessage?: string;
  title?: string;
  description?: string;
};

export function PricingContactSheet({
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  action = "/api/send-support-emails",
  defaultSubject = "",
  defaultMessage = "",
  title = "Contact Sales",
  description = "Tell us about your needs and we'll get back to you shortly.",
}: Props) {
  const [internalOpen, setInternalOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);

  // Use controlled state if provided, otherwise use internal state
  const open = controlledOpen ?? internalOpen;
  const setOpen = controlledOnOpenChange ?? setInternalOpen;

  // Update form when defaults change
  React.useEffect(() => {
    if (open && defaultSubject) {
      const subjectInput = document.getElementById(
        "subject"
      ) as HTMLInputElement;
      if (subjectInput) subjectInput.value = defaultSubject;
    }
    if (open && defaultMessage) {
      const messageInput = document.getElementById(
        "message"
      ) as HTMLTextAreaElement;
      if (messageInput) messageInput.value = defaultMessage;
    }
  }, [open, defaultSubject, defaultMessage]);

  async function onSubmit(form: HTMLFormElement) {
    setLoading(true);
    const data = Object.fromEntries(new FormData(form).entries()) as Record<
      string,
      string
    >;

    const email = (data.email || "").trim().toLowerCase();
    const name = (data.name || "").trim();
    const subject = (data.subject || "").trim();
    const message = (data.message || "").trim();
    const hp = (data.company || "").trim();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error("Please enter a valid email address.");
      setLoading(false);
      return;
    }
    if (!name || !subject || !message) {
      toast.error("Please fill in all required fields.");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(action, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, subject, message, hp }),
      });
      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        toast.error(
          json?.error || "We couldn't send your message. Please try again."
        );
      } else {
        toast.success(
          "Thanks! Your message has been sent. We'll be in touch soon!"
        );
        form.reset();
        setOpen(false);
      }
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent
        side="right"
        className="flex h-full flex-col p-0 sm:max-w-[560px]"
      >
        <div className="border-b px-6 py-4">
          <SheetHeader>
            <SheetTitle>{title}</SheetTitle>
            <p className="text-sm text-muted-foreground">{description}</p>
          </SheetHeader>
        </div>

        <ScrollArea className="flex-1 px-6 py-5">
          <form
            id="contact-form"
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              onSubmit(e.currentTarget);
            }}
            noValidate
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">
                  Your Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="name"
                  name="name"
                  placeholder="Ada Lovelace"
                  autoComplete="name"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">
                  Your Email <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="you@example.com"
                  autoComplete="email"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="subject">
                Subject <span className="text-destructive">*</span>
              </Label>
              <Input
                id="subject"
                name="subject"
                placeholder="What can we help with?"
                defaultValue={defaultSubject}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="message">
                Message <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="message"
                name="message"
                placeholder="Tell us about your needs..."
                className="min-h-[160px]"
                defaultValue={defaultMessage}
                required
              />
              <p className="text-xs text-muted-foreground">
                Include your company name, team size, and specific requirements.
              </p>
            </div>

            {/* Honeypot (keep empty) */}
            <input
              type="text"
              name="company"
              id="company"
              tabIndex={-1}
              className="hidden"
              autoComplete="off"
              aria-hidden="true"
            />
          </form>
        </ScrollArea>

        <Separator />

        <SheetFooter className="px-6 py-4">
          <div className="ml-auto flex gap-2">
            <Button
              variant="ghost"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button form="contact-form" type="submit" disabled={loading}>
              {loading ? "Sending..." : "Send Message"}
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
