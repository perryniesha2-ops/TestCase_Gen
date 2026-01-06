// app/contact/page.tsx (or wherever your route lives)
"use client";

import * as React from "react";
import Link from "next/link";
import { AppSidebar } from "@/components/pagecomponents/app-sidebar";
import { SiteHeader } from "@/components/pagecomponents/site-header";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  Mail,
  MessageSquare,
  LifeBuoy,
  Clock,
  Shield,
  ArrowRight,
} from "lucide-react";
import { SiteFooter } from "@/components/pagecomponents/site-footer";

export default function ContactUs() {
  const [loading, setLoading] = React.useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = {
      name: (form.elements.namedItem("name") as HTMLInputElement).value.trim(),
      email: (
        form.elements.namedItem("email") as HTMLInputElement
      ).value.trim(),
      subject: (
        form.elements.namedItem("subject") as HTMLInputElement
      ).value.trim(),
      message: (
        form.elements.namedItem("message") as HTMLTextAreaElement
      ).value.trim(),
      hp: "", // honeypot (not shown on this form)
    };

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.toLowerCase())) {
      toast.error("Please enter a valid email address.");
      return;
    }
    if (!data.name || !data.subject || !data.message) {
      toast.error("Please fill in all required fields.");
      return;
    }

    try {
      setLoading(true);
      const res = await fetch("/api/send-support-emails", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok)
        throw new Error(json?.error || "We couldn’t send your message.");

      toast.success("Thanks! Your message has been sent.");
      form.reset();
    } catch (error) {
      toast.error("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid min-h-screen w-full md:grid-cols-[240px_1fr]">
      <AppSidebar className="hidden md:block" />
      <div className="flex min-h-screen flex-col">
        {/* Page hero */}
        <section className="relative">
          <div className="absolute inset-0 -z-10 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />
          <div className="px-4 md:px-8 pt-6">
            <div className="max-w-5xl">
              <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
                Contact Us
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Have a question about SynthQA or ran into an issue? We’re here
                to help.
              </p>
              <p className="mt-4 text-sm text-muted-foreground"></p>
            </div>
          </div>
        </section>

        <main className="px-4 md:px-8 pb-10">
          <div className="mx-auto grid max-w-5xl gap-8 md:grid-cols-5">
            {/* Left: Info / quick help */}
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Get help fast</CardTitle>
                <CardDescription>
                  Common links and support channels.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Link
                  href="/docs/guides"
                  className="group flex items-start gap-3 rounded-md border p-3 hover:bg-accent transition"
                >
                  <LifeBuoy className="mt-0.5 h-4 w-4 text-primary" />
                  <div className="flex-1">
                    <div className="font-medium">Help Center</div>
                    <p className="text-sm text-muted-foreground">
                      Guides for generating, managing, and exporting test cases.
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 opacity-0 transition group-hover:opacity-100" />
                </Link>

                <Link
                  href="/privacy"
                  className="group flex items-start gap-3 rounded-md border p-3 hover:bg-accent transition"
                >
                  <Shield className="mt-0.5 h-4 w-4 text-primary" />
                  <div className="flex-1">
                    <div className="font-medium">Privacy</div>
                    <p className="text-sm text-muted-foreground">
                      How we handle your data.
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 opacity-0 transition group-hover:opacity-100" />
                </Link>

                <Link
                  href="/terms"
                  className="group flex items-start gap-3 rounded-md border p-3 hover:bg-accent transition"
                >
                  <Shield className="mt-0.5 h-4 w-4 text-primary" />
                  <div className="flex-1">
                    <div className="font-medium">Terms</div>
                    <p className="text-sm text-muted-foreground">
                      Rules for using SynthQA
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 opacity-0 transition group-hover:opacity-100" />
                </Link>

                <div className="flex items-start gap-3 rounded-md border p-3">
                  <Clock className="mt-0.5 h-4 w-4 text-primary" />
                  <div>
                    <div className="font-medium">Response time</div>
                    <p className="text-sm text-muted-foreground">
                      Mon–Fri, 9am–6pm ET. We usually reply within 1 business
                      day.
                    </p>
                  </div>
                </div>

                <Separator />

                <div className="flex items-center gap-3 text-sm">
                  <Mail className="h-4 w-4 text-primary" />
                  <span>
                    Prefer email? Write us at{" "}
                    <a className="underline" href="mailto:support@synthqa.app">
                      support@synthqa.app
                    </a>
                    .
                  </span>
                </div>

                <div className="flex items-center gap-3 text-sm">
                  <MessageSquare className="h-4 w-4 text-primary" />
                  <span>
                    Need to report a bug? Include steps to reproduce and
                    screenshots if possible.
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Right: Contact form */}
            <Card className="md:col-span-3">
              <CardHeader>
                <CardTitle>Send us a message</CardTitle>
                <CardDescription>
                  We’ll email you back as soon as we can.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={onSubmit} className="grid gap-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="name">Your name</Label>
                      <Input
                        id="name"
                        name="name"
                        placeholder="Ada Lovelace"
                        required
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        placeholder="you@example.com"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="subject">Subject</Label>
                    <Input
                      id="subject"
                      name="subject"
                      placeholder="Issue summary"
                      required
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="message">Message</Label>
                    <Textarea
                      id="message"
                      name="message"
                      placeholder="Describe what you need help with…"
                      className="min-h-[160px]"
                      required
                    />
                    <p className="text-xs text-muted-foreground">
                      Include steps to reproduce, relevant URLs, and your
                      browser/device.
                    </p>
                  </div>

                  {/* honeypot (hidden) */}
                  <input
                    type="text"
                    name="company"
                    className="hidden"
                    tabIndex={-1}
                    aria-hidden="true"
                  />
                  <input type="hidden" name="hp" value="" />
                  <CardFooter className="px-0">
                    <Button type="submit" disabled={loading}>
                      {loading ? "Sending…" : "Send message"}
                    </Button>
                    <span className="ml-3 text-xs text-muted-foreground">
                      By sending, you agree to our{" "}
                      <Link href="/terms" className="underline">
                        Terms
                      </Link>{" "}
                      and{" "}
                      <Link href="/privacy" className="underline">
                        Privacy Policy
                      </Link>
                      .
                    </span>
                  </CardFooter>
                </form>
              </CardContent>
            </Card>
          </div>
        </main>
        <SiteFooter />
      </div>
    </div>
  );
}
