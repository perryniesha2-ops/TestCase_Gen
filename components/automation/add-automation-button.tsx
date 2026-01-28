"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Zap, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface AddAutomationButtonProps {
    testCaseIds?: string[];
    suiteId?: string;
    applicationUrl?: string;
    onComplete?: () => void;
    variant?: "default" | "outline" | "ghost";
    size?: "default" | "sm" | "lg";
}

export function AddAutomationButton({
                                        testCaseIds,
                                        suiteId,
                                        applicationUrl,
                                        onComplete,
                                        variant = "outline",
                                        size = "default",
                                    }: AddAutomationButtonProps) {
    const [isGenerating, setIsGenerating] = useState(false);

    async function handleGenerate() {
        setIsGenerating(true);

        try {
            const response = await fetch("/api/automation/generate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    test_case_ids: testCaseIds,
                    suite_id: suiteId,
                    application_url: applicationUrl,
                }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || "Failed to generate automation");
            }

            const data = await response.json();

            if (data.enhanced_count === 0 && data.skipped_count > 0) {
                toast.info("Already automated", {
                    description: "All test cases already have automation data",
                });
            } else {
                toast.success("Automation added!", {
                    description: `Enhanced ${data.enhanced_count} test case${data.enhanced_count !== 1 ? "s" : ""} with automation`,
                });
            }

            if (data.failed_count > 0) {
                toast.warning(`${data.failed_count} test case${data.failed_count !== 1 ? "s" : ""} failed to enhance`);
            }

            onComplete?.();
        } catch (error) {
            console.error("Automation generation error:", error);
            toast.error("Failed to add automation", {
                description: error instanceof Error ? error.message : "Unknown error",
            });
        } finally {
            setIsGenerating(false);
        }
    }

    return (
        <Button
            onClick={handleGenerate}
            disabled={isGenerating}
            variant={variant}
            size={size}
        >
            {isGenerating ? (
                <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating...
                </>
            ) : (
                <>
                    <Zap className="h-4 w-4 mr-2" />
                    Add Automation
                </>
            )}
        </Button>
    );
}