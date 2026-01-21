"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth/auth-context";
import { SessionManager } from "@/lib/session-manager";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type SessionTimeoutProviderProps = {
  children: React.ReactNode;
  /** Minutes of inactivity before we log the user out */
  timeoutMinutes?: number;
  /** Minutes before timeout to show a warning dialog */
  warnMinutesBefore?: number;
};

/**
 * Tracks user activity (mouse / keyboard / touch) and logs out after X minutes
 * of inactivity. Uses AuthProvider for centralized auth state.
 */
export function SessionTimeoutProvider({
  children,
  timeoutMinutes = 60,
  warnMinutesBefore = 5,
}: SessionTimeoutProviderProps) {
  const { user } = useAuth();
  const router = useRouter();

  const [showWarning, setShowWarning] = useState(false);
  const [timeLeft, setTimeLeft] = useState(warnMinutesBefore * 60);

  const lastActivityRef = useRef<number>(Date.now());
  const logoutTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warningTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Clear timers
  const clearTimers = () => {
    if (logoutTimeoutRef.current) {
      clearTimeout(logoutTimeoutRef.current);
      logoutTimeoutRef.current = null;
    }
    if (warningTimeoutRef.current) {
      clearTimeout(warningTimeoutRef.current);
      warningTimeoutRef.current = null;
    }
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
  };

  const handleLogout = async () => {
    try {
      clearTimers();
      setShowWarning(false);
      await SessionManager.logout();
      toast.error("You have been signed out due to inactivity.", {
        duration: 5000,
      });
      SessionManager.forceReload();
    } catch (err) {
      console.error("Error during auto sign-out:", err);
      router.push("/login?reason=timeout");
    }
  };

  const handleStayLoggedIn = () => {
    setShowWarning(false);
    scheduleTimers();
  };

  const scheduleTimers = () => {
    clearTimers();

    // Don't schedule timers if user is not logged in
    if (!user) return;

    const timeoutMs = timeoutMinutes * 60 * 1000;
    const warnMs = (timeoutMinutes - warnMinutesBefore) * 60 * 1000;

    // Warning dialog
    if (warnMs > 0 && warnMinutesBefore > 0) {
      warningTimeoutRef.current = setTimeout(() => {
        setShowWarning(true);
        setTimeLeft(warnMinutesBefore * 60);

        // Start countdown
        countdownRef.current = setInterval(() => {
          setTimeLeft((prev) => {
            if (prev <= 1) {
              handleLogout();
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      }, warnMs);
    }

    // Final logout
    logoutTimeoutRef.current = setTimeout(handleLogout, timeoutMs);
  };

  const handleActivity = () => {
    // Don't reset if warning is showing (user must explicitly choose)
    if (showWarning) return;

    const now = Date.now();
    lastActivityRef.current = now;
    scheduleTimers();
  };

  useEffect(() => {
    // Only run if user is logged in
    if (!user) {
      clearTimers();
      return;
    }

    // Register activity listeners
    const events = ["mousemove", "keydown", "click", "scroll", "touchstart"];
    events.forEach((event) => window.addEventListener(event, handleActivity));

    // Initial schedule
    scheduleTimers();

    return () => {
      events.forEach((event) =>
        window.removeEventListener(event, handleActivity),
      );
      clearTimers();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, timeoutMinutes, warnMinutesBefore, showWarning]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <>
      {children}

      {/* Warning Dialog */}
      <AlertDialog open={showWarning} onOpenChange={setShowWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Session Expiring Soon</AlertDialogTitle>
            <AlertDialogDescription>
              Your session will expire in{" "}
              <strong className="text-foreground">
                {formatTime(timeLeft)}
              </strong>{" "}
              due to inactivity. Would you like to stay logged in?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleLogout}>
              Log Out Now
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleStayLoggedIn}>
              Stay Logged In
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
