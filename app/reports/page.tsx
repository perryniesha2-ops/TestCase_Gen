import { ReportsPage } from "@/components/reports/reportspage";
import { AppSidebar } from "@/components/pagecomponents/app-sidebar";
import { SiteHeader } from "@/components/pagecomponents/site-header";
import { SiteFooter } from "@/components/pagecomponents/site-footer";

export default function RequirementsPage() {
  return (
    <div className="grid min-h-screen w-full md:grid-cols-[240px_1fr] md:gap-x-4 lg:gap-x-6">
      {/* Sidebar */}
      <AppSidebar className="hidden md:block" />

      {/* Main content */}
      <div className="flex min-h-screen flex-col px-4 md:px-6">
        <SiteHeader
          title="Reports"
          subtitle=" Build custom reports with the metrics that matter to your team — pass
        rates, coverage, flaky tests, automation runs, and more."
        />
        <main className="max-w-5xl mx-auto w-full mt-6">
          <ReportsPage />
        </main>
        <div className="h-4" />

        <SiteFooter />
      </div>
    </div>
  );
}
export const metadata = {
  title: "Reports - SynthQA",
  description:
    "Build custom reports with the metrics that matter to your team.",
};
