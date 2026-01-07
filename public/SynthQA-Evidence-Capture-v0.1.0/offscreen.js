console.log("[SynthQA Extension] offscreen ready");

const recorders = new Map(); // tabId -> { recorder, chunks, stream }

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    try {
      if (message?.command === "OFFSCREEN_START_RECORDING") {
        const tabId = message?.payload?.tabId;
        const streamId = message?.payload?.streamId;

        if (!tabId) return sendResponse({ ok: false, error: "Missing tabId" });
        if (!streamId)
          return sendResponse({ ok: false, error: "Missing streamId" });
        if (recorders.has(tabId))
          return sendResponse({
            ok: false,
            error: "Already recording this tab",
          });

        // MV3 tab capture in offscreen: use getUserMedia + chromeMediaSourceId
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            mandatory: {
              chromeMediaSource: "tab",
              chromeMediaSourceId: streamId,
            },
          },
        });

        const chunks = [];
        // Let browser pick best supported type if vp8 is not supported
        const options = { mimeType: "video/webm;codecs=vp8" };
        let recorder;
        try {
          recorder = new MediaRecorder(stream, options);
        } catch {
          recorder = new MediaRecorder(stream);
        }

        recorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) chunks.push(e.data);
        };

        recorder.onerror = (e) => {
          console.error("[SynthQA Extension] recorder error:", e);
        };

        recorder.onstop = async () => {
          try {
            const blob = new Blob(chunks, {
              type: recorder.mimeType || "video/webm",
            });
            const dataUrl = await blobToDataUrl(blob);

            await chrome.runtime.sendMessage({
              command: "OFFSCREEN_RECORDING_DONE",
              payload: {
                tabId,
                dataUrl,
                mimeType: blob.type || "video/webm",
                fileName: `recording-${Date.now()}.webm`,
              },
            });
          } finally {
            try {
              stream.getTracks().forEach((t) => t.stop());
            } catch {}
            recorders.delete(tabId);
          }
        };

        recorders.set(tabId, { recorder, chunks, stream });
        recorder.start(1000); // timeslice
        return sendResponse({ ok: true });
      }

      if (message?.command === "OFFSCREEN_STOP_RECORDING") {
        const tabId = message?.payload?.tabId;
        if (!tabId) return sendResponse({ ok: false, error: "Missing tabId" });

        const entry = recorders.get(tabId);
        if (!entry)
          return sendResponse({ ok: false, error: "Not recording this tab" });

        entry.recorder.stop();
        return sendResponse({ ok: true });
      }

      return sendResponse({ ok: false, error: "Unknown offscreen command" });
    } catch (e) {
      console.error("[SynthQA Extension] offscreen error:", e);
      return sendResponse({
        ok: false,
        error: e?.message || "Offscreen error",
      });
    }
  })();

  return true;
});

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = () => reject(new Error("FileReader failed"));
    r.readAsDataURL(blob);
  });
}
