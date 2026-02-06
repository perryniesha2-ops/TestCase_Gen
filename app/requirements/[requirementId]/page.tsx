// app/requirements/[requirementId]/page.tsx
import { AppSidebar } from "@/components/pagecomponents/app-sidebar";
import { SiteFooter } from "@/components/pagecomponents/site-footer";
import { SiteHeader } from "@/components/pagecomponents/site-header";
import RequirementDetailsPageClient from "@/components/requirements/requirement-details-page";

type PageProps = {
  params: Promise<{ requirementId: string }> | { requirementId: string };
};

export default async function RequirementRoute({ params }: PageProps) {
  const resolvedParams =
    typeof (params as any)?.then === "function"
      ? await (params as Promise<{ requirementId: string }>)
      : (params as { requirementId: string });

  const requirementId = resolvedParams.requirementId;

  return (
    <div className="grid min-h-screen w-full md:grid-cols-[240px_1fr] md:gap-x-4 lg:gap-x-6">
      <AppSidebar className="hidden md:block" />
      <div className="flex min-h-screen flex-col px-4 md:px-6">
        <SiteHeader
          title="Requirement"
          subtitle="View and manage requirement details"
        />
        <main className="mt-6 flex-1 w-full">
          <RequirementDetailsPageClient requirementId={requirementId} />
        </main>
        <SiteFooter />
      </div>
    </div>
  );
}

export const metadata = {
  title: "Requirement - SynthQA",
  description: "Requirement details",
};
