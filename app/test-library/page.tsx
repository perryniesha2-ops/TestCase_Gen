import { TestSuitesPage } from "@/components/testcase-management/test_suites/tests-suites";

import { AppSidebar } from "@/components/pagecomponents/app-sidebar";
import { SiteHeader } from "@/components/pagecomponents/site-header";
import { SiteFooter } from "@/components/pagecomponents/site-footer";

export default function TestCaseManager() {
  return (
    <div className="grid min-h-screen w-full md:grid-cols-[240px_1fr] md:gap-x-4 lg:gap-x-6">
      <AppSidebar className="hidden md:block" />

      <div className="flex min-h-screen flex-col px-4 md:px-6">
        <SiteHeader
          title="Test Suites"
          subtitle="Organize and execute your test cases"
        />

        {/* Full-width content */}
        <main className="mt-6 flex-1 w-full">
          <TestSuitesPage />
        </main>
        <SiteFooter />
      </div>
    </div>
  );
}

export const metadata = {
  title: "Test Suites - SynthQA",
  description: "Organize and execute your test cases",
};
