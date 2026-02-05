// app/test-cases/[testCaseId]/page.tsx
import { AppSidebar } from "@/components/pagecomponents/app-sidebar";
import { SiteFooter } from "@/components/pagecomponents/site-footer";
import { SiteHeader } from "@/components/pagecomponents/site-header";
import { TestCaseDetailsPageClient } from "@/components/testcase-management/test-cases/testcasedetails";

type PageProps = {
  params: { testCaseId: string } | Promise<{ testCaseId: string }>;
};

async function unwrapParams<T>(p: T | Promise<T>): Promise<T> {
  return await Promise.resolve(p);
}

export default async function TestCaseRoute({ params }: PageProps) {
  const { testCaseId } = await unwrapParams(params);

  return (
    <div className="grid min-h-screen w-full md:grid-cols-[240px_1fr] md:gap-x-4 lg:gap-x-6">
      <AppSidebar className="hidden md:block" />
      <div className="flex min-h-screen flex-col px-4 md:px-6">
        <SiteHeader
          title="Test Case Details"
          subtitle="View and manage test case details, steps, and execution history"
        />
        <main className="max-w-6xl mx-auto w-full mt-6">
          <TestCaseDetailsPageClient testCaseId={testCaseId} />
        </main>
        <SiteFooter />
      </div>
    </div>
  );
}

export const metadata = {
  title: "Test Case Details - SynthQA",
  description:
    "View and manage test case details, steps, and execution history.",
};
