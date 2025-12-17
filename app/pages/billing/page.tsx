// app/billing/page.tsx
import { AppSidebar } from "@/components/pagecomponents/app-sidebar"
import BillingPage from "@/components/pagecomponents/billingmanagment"
import { SiteHeader } from "@/components/pagecomponents/site-header";
import PromotionalBanner from "@/components/pagecomponents/billingmanagment"



export default function Billing() {
  return (
    <div className="grid min-h-screen w-full md:grid-cols-[240px_1fr] md:gap-x-4 lg:gap-x-6">
      <AppSidebar className="hidden md:block" />

      <div className="flex min-h-screen flex-col px-4 md:px-6">
        <SiteHeader  title="Billing"
        subtitle="Manage and Update Your Subsription"/>

            <BillingPage />
    </div>
          </div>
  )
}export const metadata = {
  title: 'Billing - SynthQA',
  description: 'Manage and Update Your Subsription',
}