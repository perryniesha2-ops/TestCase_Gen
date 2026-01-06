const channel = "synthqa-evidence-extension";
console.log("[SynthQA Extension] content script injected:", location.href);

// page -> SW bridge (extensionRequest)
window.addEventListener("message", (event) => {
  if (event.source !== window) return;
  const msg = event.data;
  if (!msg || msg.channel !== channel) return;
  if (msg.type !== "REQUEST") return;

  chrome.runtime.sendMessage({ command: msg.command, payload: msg.payload ?? {} }, (resp) => {
    const err = chrome.runtime.lastError;
    window.postMessage(
      {
        channel,
        type: "RESPONSE",
        requestId: msg.requestId,
        ok: !err && resp?.ok !== false,
        response: resp?.data ?? resp,
        error: err ? err.message : resp?.error
      },
      "*"
    );
  });
});

// SW -> content script (from capture) -> page
chrome.runtime.onMessage.addListener((msg) => {
  if (msg?.channel === channel && (msg?.type === "EVIDENCE_CAPTURED" || msg?.type === "VIDEO_CAPTURED")) {
    window.postMessage(msg, "*");
  }
});
