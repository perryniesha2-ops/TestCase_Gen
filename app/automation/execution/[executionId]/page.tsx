import { AppSidebar } from "@/components/pagecomponents/app-sidebar";
import { SiteFooter } from "@/components/pagecomponents/site-footer";
import { SiteHeader } from "@/components/pagecomponents/site-header";
import { ExecutionDetailsClient } from "@/components/automation/execution-details-client";

type PageProps = {
    params: Promise<{ executionId: string }> | { executionId: string };
};

export default async function ExecutionDetailsRoute({ params }: PageProps) {
    const resolvedParams =
        typeof (params as any)?.then === "function"
            ? await (params as Promise<{ executionId: string }>)
            : (params as { executionId: string });

    const executionId = resolvedParams.executionId;

    return (
        <div className="grid min-h-screen w-full md:grid-cols-[240px_1fr] md:gap-x-4 lg:gap-x-6">
            <AppSidebar className="hidden md:block" />
            <div className="flex min-h-screen flex-col px-4 md:px-6">
                <SiteHeader
                    title="Test Execution"
                    subtitle="View detailed test execution results"
                />
                <main className="mt-6 flex-1 w-full">
                    <ExecutionDetailsClient executionId={executionId} />
                </main>
                <SiteFooter />
            </div>
        </div>
    );
}

export const metadata = {
    title: "Test Execution - SynthQA",
    description: "View detailed test execution results",
};