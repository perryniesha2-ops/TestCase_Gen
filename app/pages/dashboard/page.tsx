import { TestManagementDashboard  } from "@/components/pagecomponents/dashboard";
import { AppSidebar } from "@/components/pagecomponents/app-sidebar";
import { SiteHeader } from "@/components/pagecomponents/site-header";

export default function Dashboard() {
  return (
    <div className="grid min-h-screen w-full md:grid-cols-[240px_1fr] md:gap-x-4 lg:gap-x-6">
      {/* Sidebar */}
      <AppSidebar className="hidden md:block" />

      {/* Main content */}
      <div className="flex min-h-screen flex-col px-4 md:px-6">
        <SiteHeader />

        {/* Page header block */}
        <div className="mt-6 max-w-4xl mx-auto space-y-3">
          <h1 className="text-3xl font-bold text-center">Test Management Dashboard</h1>
          <p className="text-muted-foreground text-center">
           Overview of your testing activities and quality metrics
          </p>
        </div>

        {/* Centered form */}
        <main className="mt-6 flex-1">
          <div className="mx-auto w-full max-w-3xl">
            {/* For *vertical* centering as well, replace the <main> above with:
                <main className="mt-6 flex-1 grid place-items-center"> */}
            <TestManagementDashboard />
          </div>
        </main>
      </div>
    </div>
  );
}

export const metadata = {
  title: 'Dashboard - SynthQA',
  description: 'Overview of your testing activities and quality metrics.',
}