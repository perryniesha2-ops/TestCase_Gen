
import { ProjectManager } from "@/components/pagecomponents/project-manager"
import { AppSidebar } from "@/components/pagecomponents/app-sidebar";
import { SiteHeader } from "@/components/pagecomponents/site-header";

export default function ProjectManagerPage() {
  return (
     <div className="grid min-h-screen w-full md:grid-cols-[240px_1fr] md:gap-x-4 lg:gap-x-6">
          {/* Sidebar */}
          <AppSidebar className="hidden md:block" />
    
          {/* Main content */}
          <div className="flex min-h-screen flex-col px-4 md:px-6">

            <SiteHeader title="Projects"
        subtitle="Organize your test suites, requirements, and templates"/>

                     <main className="mt-6 flex-1 w-full">

      <ProjectManager />
              </main>

    </div>
    </div>

  )
}

export const metadata = {
  title: 'Projects - SynthQA',
  description: 'Organize your test suites, requirements, and templates',
}