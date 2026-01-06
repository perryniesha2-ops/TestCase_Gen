// lib/extensions/detectExtension.ts
import { extensionRequest } from "@/lib/extensions/extensionRequest";

export async function detectExtensionInstalled(
  timeoutMs = 800
): Promise<boolean> {
  try {
    // use a short timeout so UI stays snappy
    const resp = await Promise.race([
      extensionRequest<{ installed: boolean }>("PING"),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("timeout")), timeoutMs)
      ),
    ]);

    // extensionRequest returns the response payload when ok
    return !!(resp as any)?.installed;
  } catch {
    return false;
  }
}
