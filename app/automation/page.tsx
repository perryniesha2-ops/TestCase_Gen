// app/(authenticated)/automation/page.tsx
import { AppSidebar } from "@/components/pagecomponents/app-sidebar";
import { SiteFooter } from "@/components/pagecomponents/site-footer";
import { SiteHeader } from "@/components/pagecomponents/site-header";
import { AutomationHub } from "@/components/automation/automation-hub";

export default function AutomationPage() {
  return (
    <div className="grid min-h-screen w-full md:grid-cols-[240px_1fr] md:gap-x-4 lg:gap-x-6">
      <AppSidebar className="hidden md:block" />
      <div className="flex min-h-screen flex-col px-4 md:px-6">
        <SiteHeader
          title="Automation"
          subtitle="Manage and monitor automated test runs across all suites"
        />
        <main className="max-w-6xl mx-auto w-full mt-6">
          <AutomationHub />
        </main>
        <div className="h-4" />
        <SiteFooter />
      </div>
    </div>
  );
}

export const metadata = {
  title: "Automation Hub - SynthQA",
  description: "Monitor and manage automated test runs across all suites.",
};
