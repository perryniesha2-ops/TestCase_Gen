// app/reports/[reportId]/print/page.tsx
import { createClient } from "@/lib/supabase/server";
import { ReportViewer } from "@/components/reports/reportviewer";
import type { ReportConfig } from "@/components/reports/reportbuilder";

type PageProps = {
  params: Promise<{ reportId: string }> | { reportId: string };
};

export default async function ReportPrintPage({ params }: PageProps) {
  const resolvedParams =
    typeof (params as any)?.then === "function"
      ? await (params as Promise<{ reportId: string }>)
      : (params as { reportId: string });

  const supabase = await createClient();
  const { data: report } = await supabase
    .from("reports")
    .select("*")
    .eq("id", resolvedParams.reportId)
    .single();

  if (!report) return <p>Report not found</p>;

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <ReportViewer
        config={report.config as ReportConfig}
        reportName={report.name}
        reportId={report.id}
        showExport={false}
      />
    </div>
  );
}
