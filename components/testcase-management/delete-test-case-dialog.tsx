// app/pages/test-cases/components/delete-test-case-dialog.tsx

"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Loader2, Trash2 } from "lucide-react"
import type { TestCase } from "@/types/test-cases"

interface DeleteTestCaseDialogProps {
  testCase: TestCase | null
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

export function DeleteTestCaseDialog({
  testCase,
  open,
  onClose,
  onSuccess,
}: DeleteTestCaseDialogProps) {
  const [deleting, setDeleting] = useState(false)

  async function handleDelete() {
    if (!testCase) return

    setDeleting(true)
    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        toast.error("You must be logged in to delete test cases")
        return
      }

      // STEP 1: Delete test_executions first (foreign key constraint)
      const { error: executionsError } = await supabase
        .from("test_executions")
        .delete()
        .eq("test_case_id", testCase.id)

      if (executionsError) {
        console.error("Error deleting test executions:", executionsError)
        throw new Error("Failed to delete test executions")
      }

      // STEP 2: Delete test_suite_cases associations
      const { error: suiteRelationsError } = await supabase
        .from("test_suite_cases")
        .delete()
        .eq("test_case_id", testCase.id)

      if (suiteRelationsError) {
        console.error("Error deleting suite associations:", suiteRelationsError)
        throw new Error("Failed to delete suite associations")
      }

      // STEP 3: Now delete the test case itself
      const { error } = await supabase
        .from("test_cases")
        .delete()
        .eq("id", testCase.id)
        .eq("user_id", user.id) // Security: Ensure user owns this test case

      if (error) {
        console.error("Error deleting test case:", error)
        throw error
      }

      toast.success("Test case deleted successfully")
      onSuccess()
      onClose()
    } catch (error) {
      console.error("Error deleting test case:", error)
      toast.error("Failed to delete test case")
    } finally {
      setDeleting(false)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Test Case</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete &quot;{testCase?.title}&quot;? This action cannot be
            undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            disabled={deleting}
          >
            {deleting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}