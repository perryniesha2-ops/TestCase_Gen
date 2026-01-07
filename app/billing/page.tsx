// app/billing/page.tsx
import { Suspense } from "react";
import { AppSidebar } from "@/components/pagecomponents/app-sidebar";
import BillingPage from "@/components/billing/billingmanagment";
import { SiteHeader } from "@/components/pagecomponents/site-header";
import { SiteFooter } from "@/components/pagecomponents/site-footer";
import { Loader2 } from "lucide-react";

export default function Billing() {
  return (
    <div className="grid min-h-screen w-full md:grid-cols-[240px_1fr] md:gap-x-4 lg:gap-x-6">
      <AppSidebar className="hidden md:block" />

      <div className="flex min-h-screen flex-col px-4 md:px-6">
        <SiteHeader
          title="Billing"
          subtitle="Manage and Update Your Subsription"
        />
        <main>
          <Suspense
            fallback={
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            }
          >
            <BillingPage />
          </Suspense>
        </main>
      </div>
      <div className="pt-10"></div>
      <SiteFooter />
    </div>
  );
}

export const metadata = {
  title: "Billing - SynthQA",
  description: "Manage and Update Your Subsription",
};
