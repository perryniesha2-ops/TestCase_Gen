import { TestManagementDashboard  } from "@/components/dashboard/dashboard";
import { AppSidebar } from "@/components/pagecomponents/app-sidebar";
import { SiteHeader } from "@/components/pagecomponents/site-header";

export default function Dashboard() {
  return (
    <div className="grid min-h-screen w-full md:grid-cols-[240px_1fr] md:gap-x-4 lg:gap-x-6">
      {/* Sidebar */}
      <AppSidebar className="hidden md:block" />

      {/* Main content */}
      <div className="flex min-h-screen flex-col px-4 md:px-6">
        <SiteHeader  title="Dashboard"
        subtitle="Overview of your testing activities and quality metrics."/>

       

        {/* Centered form */}
        <main className="mt-6 flex-1">
          <div className="mx-auto w-full max-w-3xl">
          
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