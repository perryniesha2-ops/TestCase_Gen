// components/legal/TermsSheet.tsx
"use client";
import { Button } from "@/components/ui/button";
import { LegalSheet } from "./LegalSheet";
import { TermsContent } from "./legalcontents";
import { ScrollArea } from "@/components/ui/scroll-area"


export  function TermsSheet({
  triggerLabel = "Terms",
  side = "right",
}: { triggerLabel?: string; side?: "right" | "left" | "top" | "bottom" }) {
  return (
    <LegalSheet
      title="Synth QA - Terms of Service"
      side={side}
      trigger={<Button variant="ghost" size="sm">{triggerLabel}</Button>}
    >
      <ScrollArea className="h-[700px] w-[750px] rounded-md border p-4">
      <TermsContent />
      </ScrollArea>
    </LegalSheet>
  );
}
