// components/testcase-management/dialogs/delete-test-case-dialog.tsx

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import type { TestCase, CrossPlatformTestCase } from "@/types/test-cases";

interface DeleteTestCaseDialogProps {
  testCase: (TestCase | CrossPlatformTestCase) | null; // ✅ Accept both types
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

// ✅ Type guard
function isRegularTestCase(
  tc: TestCase | CrossPlatformTestCase,
): tc is TestCase {
  return "test_steps" in tc && "test_type" in tc;
}

export function DeleteTestCaseDialog({
  testCase,
  open,
  onClose,
  onSuccess,
}: DeleteTestCaseDialogProps) {
  const [deleting, setDeleting] = useState(false);

  if (!testCase) return null;

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const supabase = createClient();

      // ✅ Determine which table to delete from
      const table = isRegularTestCase(testCase)
        ? "test_cases"
        : "platform_test_cases";

      const { error } = await supabase
        .from(table)
        .delete()
        .eq("id", testCase.id);

      if (error) throw error;

      toast.success("Test case deleted");
      onSuccess();
      onClose();
    } catch (error) {
      console.error("Delete error:", error);
      toast.error("Failed to delete test case");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Test Case</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete "{testCase.title}"? This action
            cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={deleting}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={deleting}
          >
            {deleting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Deleting...
              </>
            ) : (
              "Delete"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
