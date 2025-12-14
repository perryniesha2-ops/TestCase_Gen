"use client"

import { useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"

type SessionTimeoutProviderProps = {
  children: React.ReactNode
  /** Minutes of inactivity before we log the user out */
  timeoutMinutes?: number
  /** Optional: minutes before timeout to show a warning toast */
  warnMinutesBefore?: number
}

/**
 * Tracks user activity (mouse / keyboard / touch) and logs out after X minutes
 * of inactivity. Intended to wrap ONLY authenticated sections of the app.
 */
export function SessionTimeoutProvider({
  children,
  timeoutMinutes = 60,
  warnMinutesBefore = 5,
}: SessionTimeoutProviderProps) {
  const router = useRouter()
  const supabase = createClient()

  const lastActivityRef = useRef<number>(Date.now())
  const logoutTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const warningTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Clear timers
  const clearTimers = () => {
    if (logoutTimeoutRef.current) {
      clearTimeout(logoutTimeoutRef.current)
      logoutTimeoutRef.current = null
    }
    if (warningTimeoutRef.current) {
      clearTimeout(warningTimeoutRef.current)
      warningTimeoutRef.current = null
    }
  }

  const scheduleTimers = () => {
    clearTimers()

    const timeoutMs = timeoutMinutes * 60 * 1000
    const warnMs =
      warnMinutesBefore > 0
        ? (timeoutMinutes - warnMinutesBefore) * 60 * 1000
        : null

    // Warning toast (optional)
    if (warnMs !== null && warnMs > 0) {
      warningTimeoutRef.current = setTimeout(() => {
        toast.warning("You will be signed out soon due to inactivity.", {
          description: `Your session will expire in ${warnMinutesBefore} minute${
            warnMinutesBefore === 1 ? "" : "s"
          }. Move your mouse or interact with the page to stay signed in.`,
          duration: 4000,
        })
      }, warnMs)
    }

    // Final logout
    logoutTimeoutRef.current = setTimeout(async () => {
      try {
        clearTimers()
        await supabase.auth.signOut()
        toast.error("You have been signed out due to inactivity.", {
          duration: 5000,
        })
        router.push("/pages/login?reason=timeout")
      } catch (err) {
        console.error("Error during auto sign-out:", err)
        router.push("/pages/login?reason=timeout")
      }
    }, timeoutMs)
  }

  const handleActivity = () => {
    const now = Date.now()
    lastActivityRef.current = now
    scheduleTimers()
  }

  useEffect(() => {
    // Register activity listeners
    const events = ["mousemove", "keydown", "click", "scroll", "touchstart"]
    events.forEach((event) => window.addEventListener(event, handleActivity))

    // Initial schedule
    scheduleTimers()

    return () => {
      events.forEach((event) => window.removeEventListener(event, handleActivity))
      clearTimers()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeoutMinutes, warnMinutesBefore])

  return <>{children}</>
}
