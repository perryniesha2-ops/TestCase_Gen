"use client"

import { useState } from "react"
import { SessionManager } from "@/lib/session-manager"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { LogOut, Loader2 } from "lucide-react"

interface LogoutButtonProps {
  variant?: "default" | "ghost" | "outline"
  size?: "default" | "sm" | "lg"
  showIcon?: boolean
  showConfirmation?: boolean
  children?: React.ReactNode
}

export function LogoutButton({ 
  variant = "ghost", 
  size = "sm", 
  showIcon = true, 
  showConfirmation = false,
  children 
}: LogoutButtonProps) {
  const [loading, setLoading] = useState(false)

  async function handleLogout() {
    setLoading(true)
    
    try {
      const result = await SessionManager.logout()

      if (!result.success) {
        throw new Error(result.error || 'Logout failed')
      }

      toast.success('Logged out successfully', {
        description: 'You have been signed out of SynthQA'
      })

      setTimeout(() => {
        SessionManager.forceReload()
      }, 1000)

    } catch (error) {
      console.error('Logout error:', error)
      toast.error('Logout failed', {
        description: error instanceof Error ? error.message : 'An unexpected error occurred'
      })
      setLoading(false)
    }
  }

  const buttonContent = (
    <Button 
      variant={variant} 
      size={size} 
      onClick={showConfirmation ? undefined : handleLogout}
      disabled={loading}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
      ) : (
        showIcon && <LogOut className="h-4 w-4 mr-2" />
      )}
      {children || (loading ? 'Signing out...' : 'Logout')}
    </Button>
  )

  if (showConfirmation) {
    return (
      <AlertDialog>
        <AlertDialogTrigger asChild>
          {buttonContent}
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sign out of SynthQA?</AlertDialogTitle>
            <AlertDialogDescription>
              You will be redirected to the login page. Any unsaved work may be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleLogout}
              disabled={loading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Signing out...
                </>
              ) : (
                <>
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign out
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    )
  }

  return buttonContent
}