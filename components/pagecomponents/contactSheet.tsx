"use client";

import * as React from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetFooter } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Mail } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Props = {
 
  action?: string; 
 
  className?: string;
 
  triggerLabel?: string; 
};

export function ContactSheet({
  action = "/api/send-support-emails",
  className,
  triggerLabel = "Contact",
}: Props) {
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);

  async function onSubmit(form: HTMLFormElement) {
    setLoading(true);
    const data = Object.fromEntries(new FormData(form).entries()) as Record<string, string>;

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
        toast.error(json?.error || "We couldn’t send your message. Please try again.");
      } else {
        toast.success("Thanks! Your message has been sent.");
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
      <SheetTrigger asChild>
        <button
          type="button"
          className={cn(
            "text-sm font-medium text-muted-foreground hover:text-foreground inline-flex items-center gap-2",
            className
          )}
        >
          <Mail className="h-4 w-4" />
          <span>{triggerLabel}</span>
        </button>
      </SheetTrigger>

      {/* Make the sheet content a flex column and the middle area a ScrollArea */}
      <SheetContent side="right" className="flex h-full flex-col p-0 sm:max-w-[560px]">
        <div className="border-b px-6 py-4">
          <SheetHeader>
            <SheetTitle>Contact Support</SheetTitle>
            <p className="text-sm text-muted-foreground">
              Tell us a bit about the issue and we’ll reply to your email.
            </p>
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
                <Label htmlFor="name">Your Name</Label>
                <Input id="name" name="name" placeholder="example: Ada Lovelace" autoComplete="name" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Your Email</Label>
                <Input id="email" name="email" type="email" placeholder="example: you@example.com" autoComplete="email" required />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="subject">Subject</Label>
              <Input id="subject" name="subject" placeholder="Issue summary" required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="message">Message</Label>
              <Textarea
                id="message"
                name="message"
                placeholder="Describe what you need help with..."
                className="min-h-[160px]"
                required
              />
              <p className="text-xs text-muted-foreground">
                Include steps to reproduce, screenshots, and your browser/device if relevant.
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
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={loading}>
              Cancel
            </Button>
            <Button form="contact-form" type="submit" disabled={loading}>
              {loading ? "Sending..." : "Send to Support"}
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
