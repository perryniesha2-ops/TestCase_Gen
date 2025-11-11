// components/legal/LegalSheet.tsx
"use client";

import * as React from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

type LegalSheetProps = {
  title: string;
  trigger: React.ReactNode;          
  children: React.ReactNode;          
  side?: "right" | "left" | "top" | "bottom";
  className?: string;
};

export function LegalSheet({ title, trigger, children, side = "right", className }: LegalSheetProps) {
  return (
    <Sheet>
      <SheetTrigger asChild>{trigger}</SheetTrigger>
      <SheetContent side={side} className={cn("p-0 sm:max-w-[780px]", className)}>
        <div className="flex h-full flex-col">
          <SheetHeader className="border-b px-5 py-4">
            <SheetTitle className="text-base">{title}</SheetTitle>
          </SheetHeader>

          <ScrollArea className="flex-1 px-5 py-5">
            <div className="pb-10">{children}</div>
          </ScrollArea>
        </div>
      </SheetContent>
    </Sheet>
  );
}
