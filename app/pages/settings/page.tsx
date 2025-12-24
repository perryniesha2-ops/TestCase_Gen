// app/pages/settings/page.tsx
import { AppSidebar } from "@/components/pagecomponents/app-sidebar"
import SettingsPage from "@/components/settings/settings-page"
import { SiteHeader } from "@/components/pagecomponents/site-header"



export default function Settings() {
  return (
        <div className="grid min-h-screen w-full md:grid-cols-[240px_1fr] md:gap-x-4 lg:gap-x-6">
          {/* Sidebar */}
          <AppSidebar className="hidden md:block" />
          {/* Main content */}
          <div className="flex min-h-screen flex-col px-4 md:px-6">
            <SiteHeader title="Settings"
        subtitle="Manage your account settings, preferences, and profile information"/>
            
      <SettingsPage />
       </div>
         </div>
  )
}

export const metadata = {
  title: 'Settings - SynthQA',
  description: 'Manage your account settings, preferences, and profile information',
}