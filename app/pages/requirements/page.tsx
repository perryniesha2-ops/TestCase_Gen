import { RequirementsList } from "@/components/pagecomponents/requirements-list";
import { AddRequirementModal } from "@/components/pagecomponents/add-requirement-modal";
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
        <SiteHeader />

        {/* Page header block (centered) */}
        <header className="mt-8 max-w-3xl mx-auto text-center space-y-2">
          <h1 className="text-3xl font-bold">Requirements</h1>
          <p className="text-muted-foreground">
            Manage and organize your project requirements to generate targeted test cases.
          </p>
        </header>

        {/* Actions row (right-aligned) */}
        <section className="max-w-5xl mx-auto mt-6 space-y-4 w-full">
          <div className="flex items-center justify-end gap-2">
            <AddRequirementModal />
            <Button asChild variant="outline">
              <Link href="/pages/generate">
                <Sparkles className="h-4 w-4 mr-2" />
                Generate Tests
              </Link>
            </Button>
          </div>
        </section>

        {/* List (centered container) */}
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