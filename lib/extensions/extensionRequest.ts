// lib/extensions/extensionRequest.ts
export async function extensionRequest<TResponse = any>(
  command: string,
  payload?: Record<string, any>
): Promise<TResponse> {
  const requestId = crypto.randomUUID();
  const channel = "synthqa-evidence-extension";
  const targetOrigin = window.location.origin;

  return new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      window.removeEventListener("message", onMessage);
      reject(
        new Error(
          `Extension request "${command}" timed out (is the extension installed and enabled?)`
        )
      );
    }, 8000);

    const onMessage = (event: MessageEvent) => {
      // Only accept messages from our own origin
      if (event.origin !== targetOrigin) return;

      const msg = event.data;
      if (!msg || msg.channel !== channel) return;
      if (msg.type !== "RESPONSE" || msg.requestId !== requestId) return;

      window.clearTimeout(timeout);
      window.removeEventListener("message", onMessage);

      if (!msg.ok) {
        const raw = msg.error || "Extension request failed";
        // Provide a nicer hint for a common dev error
        const hint =
          typeof raw === "string" &&
          raw.includes("Extension context invalidated")
            ? "Extension context invalidated (did the extension reload?). Try refreshing the page."
            : raw;

        reject(new Error(hint));
      } else {
        resolve(msg.response as TResponse);
      }
    };

    window.addEventListener("message", onMessage);

    // Send only to our own origin (safer than "*")
    window.postMessage(
      { channel, type: "REQUEST", requestId, command, payload: payload ?? {} },
      window.location.origin
    );
  });
}
