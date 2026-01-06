// lib/extensions/extensionRequest.ts
export async function extensionRequest<TResponse = any>(
  command: string,
  payload?: Record<string, any>
): Promise<TResponse> {
  const requestId = crypto.randomUUID();
  const channel = "synthqa-evidence-extension";

  return new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      window.removeEventListener("message", onMessage);
      reject(
        new Error("Extension request timed out (is the extension installed?)")
      );
    }, 8000);

    const onMessage = (event: MessageEvent) => {
      const msg = event.data;
      if (!msg || msg.channel !== channel) return;
      if (msg.type !== "RESPONSE" || msg.requestId !== requestId) return;

      window.clearTimeout(timeout);
      window.removeEventListener("message", onMessage);

      if (!msg.ok) reject(new Error(msg.error || "Extension request failed"));
      else resolve(msg.response as TResponse);
    };

    window.addEventListener("message", onMessage);

    window.postMessage(
      { channel, type: "REQUEST", requestId, command, payload: payload ?? {} },
      "*"
    );
  });
}
