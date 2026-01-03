// app/privacy/page.tsx
import { PrivacyContent } from "@/components/legal/legalcontents";
import { AppSidebar } from "@/components/pagecomponents/app-sidebar";
import { SiteFooter } from "@/components/pagecomponents/site-footer";
import { SiteHeader } from "@/components/pagecomponents/site-header";

export default function PrivacyPage() {
  return (
    <div className="grid min-h-screen w-full md:grid-cols-[240px_1fr] md:gap-x-4 lg:gap-x-6">
      {/* Sidebar */}
      <AppSidebar className="hidden md:block" />
      {/* Main content */}
      <div className="flex min-h-screen flex-col px-4 md:px-6">
        <SiteHeader
          title="Privacy Policy"
          subtitle="Learn how we collect, use, and protect your data."
        />{" "}
        <main className="mt-6 flex-1 w-full">
          <PrivacyContent />
        </main>
        <SiteFooter />
      </div>
    </div>
  );
}
export const metadata = {
  title: "Privacy Policy — SynthQA",
  description: "Learn how we collect, use, and protect your data.",
};
