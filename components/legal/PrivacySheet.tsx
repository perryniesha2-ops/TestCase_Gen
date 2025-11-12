// components/legal/PrivacySheet.tsx
"use client";
import { Button } from "@/components/ui/button";
import { LegalSheet } from "./LegalSheet";
import { PrivacyContent } from "./legalcontents";
import { ScrollArea } from "@/components/ui/scroll-area"


export function PrivacySheet({
  triggerLabel = "Privacy",
  side = "right",
}: { triggerLabel?: string; side?: "right" | "left" | "top" | "bottom" }) {
  return (
    <LegalSheet
      title="Synth QA - Privacy Policy"
      side={side}
      trigger={<Button variant="ghost" size="sm">{triggerLabel}</Button>}
    >
    <ScrollArea className="h-[700px] w-[750px] rounded-md border p-4">
      <PrivacyContent />
       </ScrollArea>
    </LegalSheet>
  );
}
