// app/reports/[reportId]/edit/page.tsx
import { ReportBuilder } from "@/components/reports/reportbuilder";
import { AppSidebar } from "@/components/pagecomponents/app-sidebar";
import { SiteFooter } from "@/components/pagecomponents/site-footer";
import { SiteHeader } from "@/components/pagecomponents/site-header";

type PageProps = {
  params: Promise<{ reportId: string }> | { reportId: string };
};

export default async function EditReportPage({ params }: PageProps) {
  const resolvedParams =
    typeof (params as any)?.then === "function"
      ? await (params as Promise<{ reportId: string }>)
      : (params as { reportId: string });

  const reportId = resolvedParams.reportId;

  return (
    <div className="grid min-h-screen w-full md:grid-cols-[240px_1fr] md:gap-x-4 lg:gap-x-6">
      <AppSidebar className="hidden md:block" />
      <div className="flex min-h-screen flex-col px-4 md:px-6">
        <SiteHeader
          title="Reports"
          subtitle="Edit your custom report with metrics that are important to you and your team."
        />
        <main className="mt-6 flex-1 w-full">
          <ReportBuilder reportId={reportId} />
        </main>
        <div className="h-4" />
        <SiteFooter />
      </div>
    </div>
  );
}

export const metadata = {
  title: "Edit Report - SynthQA",
  description:
    "Edit your custom report with metrics that are important to you and your team.",
};
