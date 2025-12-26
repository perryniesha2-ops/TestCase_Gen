// app/pages/settings/page.tsx
import { AppSidebar } from "@/components/pagecomponents/app-sidebar"
import { SiteHeader } from "@/components/pagecomponents/site-header"
import ExtensionRedirectPage from "@/components/browser-extensions/extensions-redirect"



export default function BrowserExtensionsPage() {
  return (
        <div className="grid min-h-screen w-full md:grid-cols-[240px_1fr] md:gap-x-4 lg:gap-x-6">
          {/* Sidebar */}
          <AppSidebar className="hidden md:block" />
          {/* Main content */}
          <div className="flex min-h-screen flex-col px-4 md:px-6">
            <SiteHeader title="Extensions"
        subtitle=""/>
            
      <ExtensionRedirectPage />
       </div>
         </div>
  )
}

export const metadata = {
  title: 'Browser Extensions - SynthQA',
  description: '',
}