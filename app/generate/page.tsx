import { GeneratorForm } from "@/components/generator/generatorform";
import { AppSidebar } from "@/components/pagecomponents/app-sidebar";
import { SiteHeader } from "@/components/pagecomponents/site-header";

export default function GeneratePage() {
  return (
    <div className="grid min-h-screen w-full md:grid-cols-[240px_1fr] md:gap-x-4 lg:gap-x-6">
      {/* Sidebar */}
      <AppSidebar className="hidden md:block" />

      {/* Main content */}
      <div className="flex min-h-screen flex-col px-4 md:px-6">
        <SiteHeader
          title="Generate"
          subtitle="Use AI to automatically create comprehensive test cases from your requirements."
        />
        {/* Centered form */}
        <main className="mt-6 flex-1">
          <div className="mx-auto w-full max-w-3xl">
            <GeneratorForm />
          </div>
        </main>
      </div>
    </div>
  );
}
export const metadata = {
  title: "Generate - SynthQA",
  description:
    "Use AI to automatically create comprehensive test cases from your requirements.",
};
