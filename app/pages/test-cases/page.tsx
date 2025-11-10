// app/pages/test-cases/page.tsx (Server Component)
import { Suspense } from "react";
import { TabbedTestCaseTable } from "@/components/pagecomponents/test-case-table";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Plus } from "lucide-react";
import { AppSidebar } from "@/components/pagecomponents/app-sidebar";
import { SiteHeader } from "@/components/pagecomponents/site-header";

export default function TestCasesPage() {
  return (
    <div className="grid min-h-screen w-full md:grid-cols-[240px_1fr] md:gap-x-4 lg:gap-x-6">
      <AppSidebar className="hidden md:block" />

      <div className="flex min-h-screen flex-col px-4 md:px-6">
        <SiteHeader />

        <header className="mt-6 max-w-6xl mx-auto space-y-2">
          <h1 className="text-3xl font-bold">Test Cases</h1>
          <p className="text-muted-foreground">Manage and organize your test cases across all projects.</p>
        </header>

        <section className="max-w-6xl mx-auto mt-6 space-y-4 w-full">
          <div className="flex items-center justify-end">
            <Button asChild>
              <Link href="/generator">
                <Plus className="mr-2 h-4 w-4" /> New Test Case
              </Link>
            </Button>
          </div>
        </section>

        <main className="max-w-6xl mx-auto mt-6 w-full">
          <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Loading test cases…</div>}>
            <TabbedTestCaseTable/>
          </Suspense>
        </main>
      </div>
    </div>
  );
}
