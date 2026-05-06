"use client";

import * as React from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Mail } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Props = {
  action?: string;
  className?: string;
};

export function ContactSheet({
  action = "/api/send-support-emails",
  className,
}: Props) {
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);

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
          json?.error || "We couldn't send your message. Please try again.",
        );
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
            "inline-flex items-center gap-2 text-sm font-medium text-gray-500 transition-colors duration-200 hover:text-gray-800 dark:text-white/30 dark:hover:text-white/70",
            className,
          )}
        >
          <Mail className="h-4 w-4" />
        </button>
      </SheetTrigger>

      <SheetContent
        side="right"
        className="flex h-full flex-col p-0 sm:max-w-[560px] border-l border-gray-200 bg-white dark:border-white/10 dark:bg-[#080f1e]"
      >
        {/* Header */}
        <div className="relative border-b border-gray-200 px-6 py-5 dark:border-white/8">
          {/* Aqua rim light — dark mode */}
          <div
            className="pointer-events-none absolute bottom-0 left-[5%] right-[5%] h-[1px] hidden dark:block"
            style={{
              background:
                "linear-gradient(90deg, transparent, #06b6d4 30%, #38bdf8 50%, #06b6d4 70%, transparent)",
              opacity: 0.35,
            }}
          />
          {/* Top glow — dark mode */}
          <div
            className="pointer-events-none absolute inset-0 hidden dark:block"
            style={{
              background:
                "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(6,182,212,0.06), transparent 70%)",
            }}
          />
          <SheetHeader>
            <SheetTitle className="text-lg font-semibold text-gray-900 dark:text-white">
              Contact Support
            </SheetTitle>
            <p className="text-sm text-gray-500 dark:text-white/40">
              Tell us a bit about the issue and we'll reply to your email.
            </p>
          </SheetHeader>
        </div>

        <ScrollArea className="flex-1 px-6 py-5">
          <form
            id="contact-support-form"
            className="space-y-5"
            onSubmit={(e) => {
              e.preventDefault();
              onSubmit(e.currentTarget);
            }}
            noValidate
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label
                  htmlFor="name"
                  className="text-sm font-medium text-gray-700 dark:text-white/60"
                >
                  Your Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  name="name"
                  placeholder="Ada Lovelace"
                  autoComplete="name"
                  required
                  className="border-gray-200 bg-white text-gray-900 placeholder:text-gray-400 focus:border-blue-400 focus:ring-blue-400/20 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-white/25 dark:focus:border-cyan-400/50 dark:focus:ring-cyan-400/10"
                />
              </div>
              <div className="space-y-2">
                <Label
                  htmlFor="email"
                  className="text-sm font-medium text-gray-700 dark:text-white/60"
                >
                  Your Email <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="you@example.com"
                  autoComplete="email"
                  required
                  className="border-gray-200 bg-white text-gray-900 placeholder:text-gray-400 focus:border-blue-400 focus:ring-blue-400/20 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-white/25 dark:focus:border-cyan-400/50 dark:focus:ring-cyan-400/10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="subject"
                className="text-sm font-medium text-gray-700 dark:text-white/60"
              >
                Subject <span className="text-red-500">*</span>
              </Label>
              <Input
                id="subject"
                name="subject"
                placeholder="Issue summary"
                required
                className="border-gray-200 bg-white text-gray-900 placeholder:text-gray-400 focus:border-blue-400 focus:ring-blue-400/20 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-white/25 dark:focus:border-cyan-400/50 dark:focus:ring-cyan-400/10"
              />
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="message"
                className="text-sm font-medium text-gray-700 dark:text-white/60"
              >
                Message <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="message"
                name="message"
                placeholder="Describe what you need help with..."
                className="min-h-[160px] border-gray-200 bg-white text-gray-900 placeholder:text-gray-400 focus:border-blue-400 focus:ring-blue-400/20 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-white/25 dark:focus:border-cyan-400/50 dark:focus:ring-cyan-400/10"
                required
              />
              <p className="text-xs text-gray-400 dark:text-white/25">
                Include steps to reproduce, screenshots, and your browser/device
                if relevant.
              </p>
            </div>

            {/* Honeypot */}
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

        {/* Footer divider with aqua glow */}
        <div className="relative">
          <div className="h-px w-full bg-gray-200 dark:bg-white/8" />
          <div
            className="pointer-events-none absolute inset-0 hidden dark:block"
            style={{
              background:
                "linear-gradient(90deg, transparent, #06b6d4 30%, #38bdf8 50%, #06b6d4 70%, transparent)",
              opacity: 0.25,
            }}
          />
        </div>

        <SheetFooter className="px-6 py-4">
          <div className="ml-auto flex gap-2">
            <Button
              variant="ghost"
              onClick={() => setOpen(false)}
              disabled={loading}
              className="text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-white/50 dark:hover:bg-white/8 dark:hover:text-white"
            >
              Cancel
            </Button>
            <Button
              form="contact-support-form"
              type="submit"
              disabled={loading}
              className="rounded-full bg-cyan-700 px-6 text-white shadow-md shadow-blue-600/20 hover:bg-cyan-500 disabled:opacity-50 dark:bg-cyan-500 dark:shadow-cyan-900/40 dark:hover:bg-cyan-400"
            >
              {loading ? "Sending..." : "Send to Support"}
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
