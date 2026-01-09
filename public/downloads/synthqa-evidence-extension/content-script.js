const channel = "synthqa-evidence-extension";
console.log("[SynthQA Extension] content script injected:", location.href);

// page -> SW bridge (extensionRequest)
window.addEventListener("message", (event) => {
  if (event.source !== window) return;

  // Require same-origin to prevent spoofing from injected frames/scripts
  if (event.origin !== window.location.origin) return;

  const msg = event.data;
  if (!msg || msg.channel !== channel) return;
  if (msg.type !== "REQUEST") return;

  chrome.runtime.sendMessage(
    { command: msg.command, payload: msg.payload ?? {} },
    (resp) => {
      const err = chrome.runtime.lastError;

      window.postMessage(
        {
          channel,
          type: "RESPONSE",
          requestId: msg.requestId,
          ok: !err && resp?.ok !== false,
          response: resp?.data ?? resp,
          error: err ? err.message : resp?.error,
        },
        window.location.origin
      );
    }
  );
});

// SW -> content script -> page (optional push events)
chrome.runtime.onMessage.addListener((msg) => {
  if (msg?.channel !== channel) return;

  if (msg?.type === "EVIDENCE_CAPTURED" || msg?.type === "VIDEO_CAPTURED") {
    window.postMessage(msg, window.location.origin);
  }
});
