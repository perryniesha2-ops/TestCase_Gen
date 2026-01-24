import { AppSidebar } from "@/components/pagecomponents/app-sidebar";
import { SiteFooter } from "@/components/pagecomponents/site-footer";
import { SiteHeader } from "@/components/pagecomponents/site-header";
import { RunReviewPage } from "@/components/testcase-management/test_suites/runreviewpage";

type PageProps = {
  params: Promise<{ runId: string }> | { runId: string };
};

export default async function RunReviewRoute({ params }: PageProps) {
  const resolvedParams =
    typeof (params as any)?.then === "function"
      ? await (params as Promise<{ runId: string }>)
      : (params as { runId: string });

  const runId = resolvedParams.runId;

  return (
    <div className="grid min-h-screen w-full md:grid-cols-[240px_1fr] md:gap-x-4 lg:gap-x-6">
      <AppSidebar className="hidden md:block" />
      <div className="flex min-h-screen flex-col px-4 md:px-6">
        <SiteHeader
          title="Post-Run Review"
          subtitle="Review test executions, mark updates, and create issues"
        />
        <main className="mt-6 flex-1 w-full">
          <RunReviewPage runId={runId} />
        </main>
        <div className="h-4" />

        <SiteFooter />
      </div>
    </div>
  );
}

export const metadata = {
  title: "Run Review - SynthQA",
  description: "Review test execution results and create issues",
};
