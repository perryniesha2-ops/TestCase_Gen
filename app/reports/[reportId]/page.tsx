// app/reports/[reportId]/page.tsx
import { ReportViewer } from "@/components/reports/reportviewer";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Pencil } from "lucide-react";
import Link from "next/link";
import { AppSidebar } from "@/components/pagecomponents/app-sidebar";
import { SiteFooter } from "@/components/pagecomponents/site-footer";
import { SiteHeader } from "@/components/pagecomponents/site-header";

type PageProps = {
  params: Promise<{ reportId: string }> | { reportId: string };
};

export default async function ReportPage({ params }: PageProps) {
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
          title="Report Details"
          subtitle="View and export your custom report."
        />
        <main className="mt-6 flex-1 w-full space-y-4">
          {/* Navigation row */}
          <div className="flex items-center justify-between">
            <Button variant="outline" size="sm" asChild>
              <Link href="/reports">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Reports
              </Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href={`/reports/${reportId}/edit`}>
                <Pencil className="h-4 w-4 mr-2" />
                Edit Report
              </Link>
            </Button>
          </div>

          <ReportViewer reportId={reportId} />
        </main>
        <div className="h-4" />

        <SiteFooter />
      </div>
    </div>
  );
}

export const metadata = {
  title: "Report",
};
