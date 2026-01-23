// lib/toast-utils.ts
import { toast, type ExternalToast } from "sonner";

// Track recently shown toasts to prevent duplicates
const recentToasts = new Set<string>();

function showToast(
  message: string,
  options?: ExternalToast & { type?: "success" | "error" | "info" | "warning" },
) {
  const type = options?.type || "success";

  // Create unique ID from message
  const toastId = `${type}-${message}`;

  // Skip if recently shown
  if (recentToasts.has(toastId)) {
    return;
  }

  // Mark as shown
  recentToasts.add(toastId);

  // Show toast with ID to prevent Sonner duplicates
  const toastFn = toast[type];
  toastFn(message, {
    id: toastId,
    ...options, // Spread all other options (description, duration, etc.)
  });

  // Clear after 1 second so same message can be shown again later
  setTimeout(() => {
    recentToasts.delete(toastId);
  }, 1000);
}

export const toastSuccess = (message: string, options?: ExternalToast) =>
  showToast(message, { ...options, type: "success" });

export const toastError = (message: string, options?: ExternalToast) =>
  showToast(message, { ...options, type: "error" });

export const toastInfo = (message: string, options?: ExternalToast) =>
  showToast(message, { ...options, type: "info" });

export const toastWarning = (message: string, options?: ExternalToast) =>
  showToast(message, { ...options, type: "warning" });
