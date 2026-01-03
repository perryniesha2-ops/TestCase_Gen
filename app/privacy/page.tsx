// app/privacy/page.tsx
import { PrivacyContent } from "@/components/legal/legalcontents";
import { AppSidebar } from "@/components/pagecomponents/app-sidebar";
import { SiteHeader } from "@/components/pagecomponents/site-header"

export const metadata = { title: "Privacy Policy — SynthQA" };

export default function PrivacyPage() {
  return (
<div className="grid min-h-screen w-full md:grid-cols-[240px_1fr] md:gap-x-4 lg:gap-x-6">
      {/* Sidebar */}
      <AppSidebar className="hidden md:block" />
      {/* Main content */}
      <div className="flex min-h-screen flex-col px-4 md:px-6">
        <SiteHeader />  
        <div className="mt-6 max-w-4xl mx-auto space-y-3">
          <h1 className="text-3xl font-bold text-left">Privacy Policy</h1>
        </div>                 
            <PrivacyContent />
         </div>
        </div>
        
              
  );
}
