console.log("[SynthQA Extension] service worker started");

const ARMED_KEY = "armedByTabId"; // { [tabId]: { url, executionId, testCaseId, stepNumber, synthqaTabId, updatedAt } }
const recordingMeta = new Map();  // tabId -> { synthqaTabId, ctx }

function normalizeUrl(url) {
  const s = String(url || "").trim();
  if (!s) return "";
  if (!/^https?:\/\//i.test(s)) return "https://" + s;
  return s;
}

async function getArmedMap() {
  const obj = await chrome.storage.local.get(ARMED_KEY);
  return obj[ARMED_KEY] || {};
}

async function setArmedMap(map) {
  await chrome.storage.local.set({ [ARMED_KEY]: map });
}

chrome.tabs.onRemoved.addListener(async (tabId) => {
  const map = await getArmedMap();
  if (map[String(tabId)]) {
    delete map[String(tabId)];
    await setArmedMap(map);
  }
  recordingMeta.delete(tabId);
});

async function getActiveTab() {
  const [active] = await chrome.tabs.query({ active: true, currentWindow: true });
  return active || null;
}

async function ensureOffscreen() {
  const has = await chrome.offscreen.hasDocument?.();
  if (has) return;

  await chrome.offscreen.createDocument({
    url: "offscreen.html",
    reasons: ["USER_MEDIA"],
    justification: "Tab recording for SynthQA evidence capture"
  });
}

async function sendToSynthQA(synthqaTabId, message) {
  // Send to SynthQA tab's content script; that script forwards to the page via window.postMessage
  await chrome.tabs.sendMessage(synthqaTabId, message);
}

function waitForTabComplete(tabId, timeoutMs = 12000) {
  return new Promise((resolve) => {
    const start = Date.now();

    const done = () => {
      chrome.tabs.onUpdated.removeListener(onUpdated);
      resolve(true);
    };

    const onUpdated = (updatedTabId, info) => {
      if (updatedTabId !== tabId) return;
      if (info.status === "complete") done();
    };

    chrome.tabs.onUpdated.addListener(onUpdated);

    // fail-safe timeout
    const tick = () => {
      if (Date.now() - start > timeoutMs) {
        chrome.tabs.onUpdated.removeListener(onUpdated);
        resolve(false);
        return;
      }
      setTimeout(tick, 250);
    };
    tick();
  });
}


chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    try {
      if (message?.command === "PING") {
  return sendResponse({ ok: true, data: { installed: true, version: "0.1.0" } });
}
      // ---- Called from SynthQA web app ----
      if (message?.command === "OPEN_TARGET") {
        const url = normalizeUrl(message?.payload?.url);
        if (!url) return sendResponse({ ok: false, error: "Missing URL" });

        const synthqaTabId = sender?.tab?.id;
        if (!synthqaTabId) return sendResponse({ ok: false, error: "Could not identify SynthQA tab" });

        // Try to find an existing tab with the same URL (optional; simple exact match)
        const existing = (await chrome.tabs.query({ url })).find(t => t.id);
        let targetTab = existing;

        if (!targetTab) {
          targetTab = await chrome.tabs.create({ url, active: true });
        } else {
          await chrome.tabs.update(targetTab.id, { active: true });
          if (targetTab.windowId != null) await chrome.windows.update(targetTab.windowId, { focused: true });
        }

        const map = await getArmedMap();
        map[String(targetTab.id)] = {
          url,
          executionId: message?.payload?.executionId ?? null,
          testCaseId: message?.payload?.testCaseId ?? null,
          stepNumber: message?.payload?.stepNumber ?? null,
          synthqaTabId,
          updatedAt: Date.now()
        };
        await setArmedMap(map);

        return sendResponse({ ok: true, data: { targetTabId: targetTab.id, url } });
      }




      // ---- Called from popup ----
      if (message?.command === "GET_ACTIVE_TAB_CONTEXT") {
        const tab = await getActiveTab();
        if (!tab?.id) return sendResponse({ ok: true, data: null });

        const map = await getArmedMap();
        return sendResponse({ ok: true, data: map[String(tab.id)] || null });
      }
// ---- Called from SynthQA web app ----
// Capture based on a provided targetUrl. Opens/focuses target, captures visible tab,
// returns dataUrl to the web app (so your upload code works).
if (message?.command === "CAPTURE_SCREENSHOT") {
  const targetUrl = normalizeUrl(
    message?.payload?.targetUrl || message?.payload?.url
  );
  if (!targetUrl) return sendResponse({ ok: false, error: "Missing targetUrl" });

  const synthqaTabId = sender?.tab?.id;
  if (!synthqaTabId) return sendResponse({ ok: false, error: "Could not identify SynthQA tab" });

  // open/focus target tab (reuse your OPEN_TARGET logic inline)
  const existing = (await chrome.tabs.query({ url: targetUrl })).find(t => t.id);
  let targetTab = existing;

  if (!targetTab) {
    targetTab = await chrome.tabs.create({ url: targetUrl, active: true });
  } else {
    await chrome.tabs.update(targetTab.id, { active: true });
    if (targetTab.windowId != null) await chrome.windows.update(targetTab.windowId, { focused: true });
  }

  // arm the tab (optional but keeps your context model consistent)
  const map = await getArmedMap();
  map[String(targetTab.id)] = {
    url: targetUrl,
    executionId: message?.payload?.executionId ?? null,
    testCaseId: message?.payload?.testCaseId ?? null,
    stepNumber: message?.payload?.stepNumber ?? null,
    synthqaTabId,
    updatedAt: Date.now()
  };
  await setArmedMap(map);

  // wait best-effort for load (helps first-run)
  await waitForTabComplete(targetTab.id);

  // capture the visible tab in that window
  const dataUrl = await chrome.tabs.captureVisibleTab(targetTab.windowId ?? null, { format: "png" });

  // return data back to the web app (this is what your React uploader expects)
  return sendResponse({
    ok: true,
    data: {
      dataUrl,
      mimeType: "image/png",
      fileName: `screenshot-${Date.now()}.png`,
      capturedTabId: targetTab.id,
      url: targetUrl,
    }
  });
}
      if (message?.command === "CAPTURE_SCREENSHOT_ACTIVE_TAB") {
        const tab = await getActiveTab();
        if (!tab?.id) return sendResponse({ ok: false, error: "No active tab" });

        const map = await getArmedMap();
        const ctx = map[String(tab.id)];
        if (!ctx?.synthqaTabId) return sendResponse({ ok: false, error: "Active tab is not armed. Open target from SynthQA first." });

        const dataUrl = await chrome.tabs.captureVisibleTab(null, { format: "png" });

        await sendToSynthQA(ctx.synthqaTabId, {
          channel: "synthqa-evidence-extension",
          type: "EVIDENCE_CAPTURED",
          payload: {
            dataUrl,
            mimeType: "image/png",
            fileName: `screenshot-${Date.now()}.png`,
            context: {
              executionId: ctx.executionId,
              testCaseId: ctx.testCaseId,
              stepNumber: ctx.stepNumber,
              url: ctx.url,
              capturedTabId: tab.id
            }
          }
        });

        return sendResponse({ ok: true,
          data: {
             dataUrl,
              mimeType: "image/png",
              fileName: `screenshot-${Date.now()}.png`,
          }
             
         });
      }

      if (message?.command === "START_RECORDING_ACTIVE_TAB") {
        const tab = await getActiveTab();
        if (!tab?.id) return sendResponse({ ok: false, error: "No active tab" });

        const map = await getArmedMap();
        const ctx = map[String(tab.id)];
        if (!ctx?.synthqaTabId) return sendResponse({ ok: false, error: "Active tab is not armed. Open target from SynthQA first." });

        // ensure tab is focused (tabCapture behaves best)
        await chrome.tabs.update(tab.id, { active: true });
        if (tab.windowId != null) await chrome.windows.update(tab.windowId, { focused: true });

        await ensureOffscreen();
        recordingMeta.set(tab.id, { synthqaTabId: ctx.synthqaTabId, ctx });

        await chrome.runtime.sendMessage({ command: "OFFSCREEN_START_RECORDING", payload: { tabId: tab.id } });
        return sendResponse({ ok: true });
      }

      if (message?.command === "STOP_RECORDING_ACTIVE_TAB") {
        const tab = await getActiveTab();
        if (!tab?.id) return sendResponse({ ok: false, error: "No active tab" });

        await ensureOffscreen();
        await chrome.runtime.sendMessage({ command: "OFFSCREEN_STOP_RECORDING", payload: { tabId: tab.id } });

        return sendResponse({ ok: true });
      }

      // ---- From offscreen -> SW when recording is done ----
      if (message?.command === "OFFSCREEN_RECORDING_DONE") {
        const { tabId, dataUrl, mimeType, fileName } = message?.payload || {};
        if (!tabId || !dataUrl) return sendResponse({ ok: false, error: "Missing recording payload" });

        const meta = recordingMeta.get(tabId);
        if (!meta?.synthqaTabId) return sendResponse({ ok: false, error: "No SynthQA destination for recording" });

        const ctx = meta.ctx;

        await sendToSynthQA(meta.synthqaTabId, {
          channel: "synthqa-evidence-extension",
          type: "VIDEO_CAPTURED",
          payload: {
            dataUrl,
            mimeType: mimeType || "video/webm",
            fileName: fileName || `recording-${Date.now()}.webm`,
            context: {
              executionId: ctx.executionId,
              testCaseId: ctx.testCaseId,
              stepNumber: ctx.stepNumber,
              url: ctx.url,
              capturedTabId: tabId
            }
          }
        });

        recordingMeta.delete(tabId);
        return sendResponse({ ok: true });
      }

      return sendResponse({ ok: false, error: "Unknown command" });
    } catch (e) {
      console.error("[SynthQA Extension] SW error:", e);
      return sendResponse({ ok: false, error: e?.message || "Extension error" });
    }
  })();

  return true;
});
