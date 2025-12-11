
import { TemplateManager } from "@/components/pagecomponents/templatemanager"
import { AppSidebar } from "@/components/pagecomponents/app-sidebar";
import { SiteHeader } from "@/components/pagecomponents/site-header";

export default function TemplatesPage() {
  return (
     <div className="grid min-h-screen w-full md:grid-cols-[240px_1fr] md:gap-x-4 lg:gap-x-6">
          {/* Sidebar */}
          <AppSidebar className="hidden md:block" />
    
          {/* Main content */}
          <div className="flex min-h-screen flex-col px-4 md:px-6">
            <SiteHeader />
             <header className="mt-8 max-w-3xl mx-auto text-center space-y-2">
          <h1 className="text-3xl font-bold">Templates</h1>
           <p className="text-muted-foreground">
            Create and manage reusable test case generation templates
          </p>
          </header>

      <TemplateManager />
    </div>
    </div>

  )
}
export const metadata = {
  title: 'Templates - SynthQA',
  description: 'Create and manage reusable test case generation templates',
}