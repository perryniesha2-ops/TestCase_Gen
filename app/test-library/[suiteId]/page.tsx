// app/test-library/[suiteId]/page.tsx
import { AppSidebar } from "@/components/pagecomponents/app-sidebar";
import { SiteFooter } from "@/components/pagecomponents/site-footer";
import { SiteHeader } from "@/components/pagecomponents/site-header";
import { SuiteDetailsPageClient } from "@/components/testcase-management/test_suites/test-suite-details";

type PageProps = {
  params: { suiteId: string } | Promise<{ suiteId: string }>;
};

async function unwrapParams<T>(p: T | Promise<T>): Promise<T> {
  return await Promise.resolve(p);
}

export default async function TestSuiteRoute({ params }: PageProps) {
  const { suiteId } = await unwrapParams(params);

  return (
    <div className="grid min-h-screen w-full md:grid-cols-[240px_1fr] md:gap-x-4 lg:gap-x-6">
      <AppSidebar className="hidden md:block" />
      <div className="flex min-h-screen flex-col px-4 md:px-6">
        <SiteHeader
          title="Test Suite"
          subtitle="Manage suite details, assignments, and execution readiness"
        />
        <main className="max-w-6xl mx-auto w-full mt-6">
          <SuiteDetailsPageClient suiteId={suiteId} />
        </main>
        <SiteFooter />
      </div>
    </div>
  );
}

export const metadata = {
  title: "Test Suite Details - SynthQA",
  description:
    "Manage a test suite: details, assigned test cases, and available cases.",
};
