import { AutomationPage } from "@/components/automation/automationpage";
import { AppSidebar } from "@/components/pagecomponents/app-sidebar";
import { SiteHeader } from "@/components/pagecomponents/site-header";

type PageProps = {
  params: Promise<{ suiteId: string }> | { suiteId: string };
};

export default async function AutomationSuiteRoute({ params }: PageProps) {
  const resolvedParams =
    typeof (params as any)?.then === "function"
      ? await (params as Promise<{ suiteId: string }>)
      : (params as { suiteId: string });

  const suiteId = resolvedParams.suiteId;

  return (
    <div className="grid min-h-screen w-full md:grid-cols-[240px_1fr] md:gap-x-4 lg:gap-x-6">
      <AppSidebar className="hidden md:block" />
      <div className="flex min-h-screen flex-col px-4 md:px-6">
        <SiteHeader title="Automation" subtitle="" />
        <main className="max-w-5xl mx-auto w-full mt-6">
          <AutomationPage suiteId={suiteId} />
        </main>
      </div>
    </div>
  );
}
