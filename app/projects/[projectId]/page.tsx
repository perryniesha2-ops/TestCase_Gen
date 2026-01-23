// app/projects/[projectId]/page.tsx
import { AppSidebar } from "@/components/pagecomponents/app-sidebar";
import { SiteFooter } from "@/components/pagecomponents/site-footer";
import { SiteHeader } from "@/components/pagecomponents/site-header";
import { ProjectPageClient } from "@/components/projects/projectpage";

type PageProps = {
  params: Promise<{ projectId: string }> | { projectId: string };
};

export default async function ProjectRoute({ params }: PageProps) {
  const resolvedParams =
    typeof (params as any)?.then === "function"
      ? await (params as Promise<{ projectId: string }>)
      : (params as { projectId: string });

  const projectId = resolvedParams.projectId;

  return (
    <div className="grid min-h-screen w-full md:grid-cols-[240px_1fr] md:gap-x-4 lg:gap-x-6">
      <AppSidebar className="hidden md:block" />
      <div className="flex min-h-screen flex-col px-4 md:px-6">
        <SiteHeader
          title="Project"
          subtitle="Manage project details and work"
        />
        <main className="mt-6 flex-1 w-full">
          <ProjectPageClient projectId={projectId} />
        </main>
        <SiteFooter />
      </div>
    </div>
  );
}

export const metadata = {
  title: "Project - SynthQA",
  description: "Project overview",
};
