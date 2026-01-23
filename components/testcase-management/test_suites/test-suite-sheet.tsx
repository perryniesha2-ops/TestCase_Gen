"use client";

import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetClose,
} from "@/components/ui/sheet";
import { Edit3, Play, Settings, Trash2, Code2 } from "lucide-react";
import type { TestSuite } from "@/types/test-cases";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;

  suite: TestSuite | null;

  // injected presentation helpers (keeps component reusable)
  getStatusBadge: (status: string) => React.ReactNode;
  getSuiteTypeColor: (type: string) => string;
  getDisplaySuiteType: (suite: TestSuite) => string;

  // actions
  onRun: (suite: TestSuite) => void;
  onManage: (suite: TestSuite) => void;
  onEdit: (suite: TestSuite) => void;
  onDelete: (suite: TestSuite) => Promise<void> | void;
};
export function TestSuiteSheet({
  open,
  onOpenChange,
  suite,
  getStatusBadge,
  getSuiteTypeColor,
  getDisplaySuiteType,
  onRun,
  onManage,
  onEdit,
  onDelete,
}: Props) {
  const router = useRouter();
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="
          w-[720px] sm:w-[820px] lg:w-[960px]
          max-w-[95vw]
          h-dvh
          p-0
          overflow-hidden
        "
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="border-b px-6 py-5">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <SheetTitle className="truncate">
                  {suite?.name ?? "Suite"}
                </SheetTitle>
                <SheetDescription className="mt-1" />

                {suite && (
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {getStatusBadge(suite.status)}
                    <Badge
                      className={getSuiteTypeColor(getDisplaySuiteType(suite))}
                    >
                      {getDisplaySuiteType(suite)}
                    </Badge>
                    <Badge variant="outline" className="text-muted-foreground">
                      {suite.test_case_count ?? 0} cases
                    </Badge>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-6 py-5">
            {suite ? (
              <div className="space-y-6">
                {/* Primary actions */}
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    size="sm"
                    className="h-9 gap-2"
                    onClick={() => onRun(suite)}
                  >
                    <Play className="h-4 w-4" />
                    Run tests
                  </Button>

                  <Button
                    onClick={() =>
                      router.push(`/automation/suites/${suite.id}`)
                    }
                  >
                    <Code2 className="h-4 w-4" />
                    Automation
                  </Button>
                </div>

                {/* Configuration */}
                <div className="rounded-lg border bg-background">
                  <div className="border-b px-4 py-3">
                    <p className="text-sm font-medium">Configuration</p>
                  </div>
                  <div className="px-4 py-4 space-y-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full h-9 justify-start gap-2"
                      onClick={() => onManage(suite)}
                    >
                      <Settings className="h-4 w-4" />
                      Manage Suite
                    </Button>
                    <p className="text-sm font-medium text-destructive">
                      Add test cases to your suite.
                    </p>
                  </div>
                </div>

                {/* Danger zone */}
                <div className="rounded-lg border border-destructive/40 bg-background">
                  <div className="border-b px-4 py-3">
                    <p className="text-sm font-medium text-destructive">
                      Danger zone
                    </p>
                  </div>

                  <div className="px-4 py-4 space-y-3">
                    <Button
                      size="sm"
                      variant="destructive"
                      className="w-full h-9 gap-2"
                      onClick={() => onDelete(suite)}
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete suite
                    </Button>

                    <div className="text-xs text-muted-foreground">
                      This deletes the suite and related sessions/executions.
                      This cannot be undone.
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">
                No suite selected.
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t px-6 py-4 bg-background">
            <div className="flex items-center justify-end gap-2">
              <SheetClose asChild>
                <Button size="sm" variant="outline" className="h-8 px-3">
                  Close
                </Button>
              </SheetClose>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
