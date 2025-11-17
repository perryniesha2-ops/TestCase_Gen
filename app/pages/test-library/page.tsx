import { TestSuiteManager } from "@/components/pagecomponents/test-suite-manager";
import { AppSidebar } from "@/components/pagecomponents/app-sidebar";
import { SiteHeader } from "@/components/pagecomponents/site-header";

export default function GeneratePage() {
  return (
    <div className="grid min-h-screen w-full md:grid-cols-[240px_1fr] md:gap-x-4 lg:gap-x-6">
      {/* Sidebar */}
      <AppSidebar className="hidden md:block" />

      {/* Main content */}
      <div className="flex min-h-screen flex-col px-4 md:px-6">
        <SiteHeader />

        {/* Page header block */}
        <div className="mt-6 max-w-4xl mx-auto space-y-3">
          <h1 className="text-3xl font-bold text-center">Test Suites</h1>
          <p className="text-muted-foreground text-center">
            Organize and execute your test cases
          </p>
        </div>

        {/* Centered form */}
        <main className="mt-6 flex-1">
          <div className="mx-auto w-full max-w-3xl">
            {/* For *vertical* centering as well, replace the <main> above with:
                <main className="mt-6 flex-1 grid place-items-center"> */}
            <TestSuiteManager />
          </div>
        </main>
      </div>
    </div>
  );
}
