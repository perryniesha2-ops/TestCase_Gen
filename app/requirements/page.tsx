import { RequirementsList } from "@/components/requirements/requirements-list";
import { AddRequirementModal } from "@/components/requirements/add-requirement-modal";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import { AppSidebar } from "@/components/pagecomponents/app-sidebar";
import { SiteHeader } from "@/components/pagecomponents/site-header";

export default function RequirementsPage() {
  return (
    <div className="grid min-h-screen w-full md:grid-cols-[240px_1fr] md:gap-x-4 lg:gap-x-6">
      {/* Sidebar */}
      <AppSidebar className="hidden md:block" />

      {/* Main content */}
      <div className="flex min-h-screen flex-col px-4 md:px-6">
         <SiteHeader  title="Requirements"
        subtitle="Manage and organize your project requirements to generate targeted test cases"/>
        <main className="max-w-5xl mx-auto w-full mt-6">
          <RequirementsList />
        </main>
      </div>
    </div>
  );
}
export const metadata = {
  title: 'Requirements - SynthQA',
  description: 'Manage and organize your project requirements to generate targeted test cases.',
}