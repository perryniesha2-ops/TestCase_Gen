import { ExportPageContent } from "@/components/automation/export-page-content";

interface PageProps {
  params: {
    suiteId: string;
  };
}

export default function ExportPage({ params }: PageProps) {
  return <ExportPageContent suiteId={params.suiteId} />;
}
