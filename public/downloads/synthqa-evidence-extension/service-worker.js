// service-worker.js
console.log("[SynthQA Extension] service worker started");

const CHANNEL = "synthqa-evidence-extension";
const ARMED_KEY = "armedByTabId"; // { [tabId]: { url, executionId, testCaseId, stepNumber, synthqaTabId, updatedAt } }

// -------------------------
// Utilities
// -------------------------
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

async function getActiveTab() {
  const [active] = await chrome.tabs.query({
    active: true,
    currentWindow: true,
  });
  return active || null;
}

async function waitForTabComplete(tabId, timeoutMs = 12000) {
  const start = Date.now();

  const current = await chrome.tabs.get(tabId).catch(() => null);
  if (current?.status === "complete") return true;

  return await new Promise((resolve) => {
    const onUpdated = (updatedTabId, info) => {
      if (updatedTabId !== tabId) return;
      if (info.status === "complete") {
        chrome.tabs.onUpdated.removeListener(onUpdated);
        resolve(true);
      }
    };

    chrome.tabs.onUpdated.addListener(onUpdated);

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

async function openOrFocusTargetTab(targetUrl) {
  const url = normalizeUrl(targetUrl);
  if (!url) throw new Error("Missing targetUrl");

  const existing = (await chrome.tabs.query({ url })).find((t) => t?.id);
  let targetTab = existing;

  if (!targetTab) {
    targetTab = await chrome.tabs.create({ url, active: true });
  } else {
    await chrome.tabs.update(targetTab.id, { active: true });
    if (targetTab.windowId != null) {
      await chrome.windows.update(targetTab.windowId, { focused: true });
    }
  }

  await waitForTabComplete(targetTab.id);

  // Small settle delay helps avoid capturing an old frame right after load/focus.
  await new Promise((r) => setTimeout(r, 150));

  return targetTab; // {id, windowId, ...}
}

async function armTargetTab({
  targetTabId,
  synthqaTabId,
  url,
  executionId,
  testCaseId,
  stepNumber,
}) {
  const map = await getArmedMap();
  map[String(targetTabId)] = {
    url,
    executionId: executionId ?? null,
    testCaseId: testCaseId ?? null,
    stepNumber: stepNumber ?? null,
    synthqaTabId,
    updatedAt: Date.now(),
  };
  await setArmedMap(map);
}

chrome.tabs.onRemoved.addListener(async (tabId) => {
  const map = await getArmedMap();
  if (map[String(tabId)]) {
    delete map[String(tabId)];
    await setArmedMap(map);
  }
});

// -------------------------
// Region Selection (injected)
// -------------------------
async function selectRegionOnTab(tabId) {
  const [{ result }] = await chrome.scripting.executeScript({
    target: { tabId },
    func: () => {
      return new Promise((resolve, reject) => {
        const dpr = window.devicePixelRatio || 1;

        // Overlay
        const overlay = document.createElement("div");
        overlay.style.position = "fixed";
        overlay.style.inset = "0";
        overlay.style.zIndex = "2147483647";
        overlay.style.cursor = "crosshair";
        overlay.style.background = "rgba(0,0,0,0.15)";
        overlay.style.userSelect = "none";

        const box = document.createElement("div");
        box.style.position = "fixed";
        box.style.border = "2px solid #fff";
        box.style.boxShadow = "0 0 0 9999px rgba(0,0,0,0.35)";
        box.style.pointerEvents = "none";
        box.style.display = "none";

        const tip = document.createElement("div");
        tip.textContent = "Drag to select region • Enter=Confirm • Esc=Cancel";
        tip.style.position = "fixed";
        tip.style.top = "12px";
        tip.style.left = "12px";
        tip.style.padding = "8px 10px";
        tip.style.borderRadius = "10px";
        tip.style.font = "12px system-ui, sans-serif";
        tip.style.background = "rgba(0,0,0,0.75)";
        tip.style.color = "#fff";

        document.documentElement.appendChild(overlay);
        document.documentElement.appendChild(box);
        document.documentElement.appendChild(tip);

        let startX = 0,
          startY = 0;
        let curX = 0,
          curY = 0;
        let dragging = false;

        const rectFromPoints = () => {
          const x = Math.min(startX, curX);
          const y = Math.min(startY, curY);
          const width = Math.abs(curX - startX);
          const height = Math.abs(curY - startY);
          return { x, y, width, height };
        };

        const draw = () => {
          const r = rectFromPoints();
          box.style.display = "block";
          box.style.left = `${r.x}px`;
          box.style.top = `${r.y}px`;
          box.style.width = `${r.width}px`;
          box.style.height = `${r.height}px`;
        };

        const onMouseDown = (e) => {
          dragging = true;
          startX = e.clientX;
          startY = e.clientY;
          curX = startX;
          curY = startY;
          draw();
        };

        const onMouseMove = (e) => {
          if (!dragging) return;
          curX = e.clientX;
          curY = e.clientY;
          draw();
        };

        const cleanup = () => {
          overlay.removeEventListener("mousedown", onMouseDown, true);
          overlay.removeEventListener("mousemove", onMouseMove, true);
          overlay.removeEventListener("mouseup", onMouseUp, true);
          window.removeEventListener("keydown", onKey, true);
          overlay.remove();
          box.remove();
          tip.remove();
        };

        const finishIfValid = () => {
          const r = rectFromPoints();
          if (r.width < 5 || r.height < 5) return false;
          cleanup();
          resolve({ ...r, dpr });
          return true;
        };

        const onMouseUp = () => {
          dragging = false;
          // Optional: auto-confirm on mouseup for “infallible” UX
          // Comment out if you want explicit Enter-only confirmation.
          finishIfValid();
        };

        const onKey = (e) => {
          if (e.key === "Escape") {
            cleanup();
            reject(new Error("Selection cancelled"));
            return;
          }
          if (e.key === "Enter") {
            finishIfValid();
          }
        };

        overlay.addEventListener("mousedown", onMouseDown, true);
        overlay.addEventListener("mousemove", onMouseMove, true);
        overlay.addEventListener("mouseup", onMouseUp, true);
        window.addEventListener("keydown", onKey, true);
      });
    },
  });

  // If user cancels, result can be undefined depending on failure mode.
  if (!result) throw new Error("Selection cancelled");
  return result; // { x,y,width,height,dpr }
}

// -------------------------
// Cropping (Service Worker)
// -------------------------
async function cropDataUrl(fullDataUrl, rectCssPx) {
  const resp = await fetch(fullDataUrl);
  const blob = await resp.blob();
  const bitmap = await createImageBitmap(blob);

  const maxW = bitmap.width;
  const maxH = bitmap.height;

  const dpr = rectCssPx?.dpr || 1;

  const sx = Math.max(0, Math.min(maxW - 1, Math.floor(rectCssPx.x * dpr)));
  const sy = Math.max(0, Math.min(maxH - 1, Math.floor(rectCssPx.y * dpr)));

  const sw = Math.max(
    1,
    Math.min(maxW - sx, Math.floor(rectCssPx.width * dpr))
  );
  const sh = Math.max(
    1,
    Math.min(maxH - sy, Math.floor(rectCssPx.height * dpr))
  );

  const canvas = new OffscreenCanvas(sw, sh);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not create 2D context");

  ctx.drawImage(bitmap, sx, sy, sw, sh, 0, 0, sw, sh);

  const outBlob = await canvas.convertToBlob({ type: "image/png" });

  const outDataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Failed to encode cropped image"));
    reader.readAsDataURL(outBlob);
  });

  return { dataUrl: outDataUrl, mimeType: "image/png" };
}

// -------------------------
// Command handler
// -------------------------
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    try {
      // --- Health check ---
      if (message?.command === "PING") {
        return sendResponse({
          ok: true,
          data: { installed: true, version: "0.1.0" },
        });
      }

      // --- Popup helper (optional) ---
      if (message?.command === "GET_ACTIVE_TAB_CONTEXT") {
        const tab = await getActiveTab();
        if (!tab?.id) return sendResponse({ ok: true, data: null });
        const map = await getArmedMap();
        return sendResponse({ ok: true, data: map[String(tab.id)] || null });
      }

      // -----------------------
      // FULL SCREEN CAPTURE
      // -----------------------
      if (message?.command === "CAPTURE_SCREENSHOT") {
        const targetUrl = normalizeUrl(
          message?.payload?.targetUrl || message?.payload?.url
        );
        if (!targetUrl)
          return sendResponse({ ok: false, error: "Missing targetUrl" });

        const synthqaTabId = sender?.tab?.id;
        if (!synthqaTabId)
          return sendResponse({
            ok: false,
            error: "Could not identify SynthQA tab",
          });

        const targetTab = await openOrFocusTargetTab(targetUrl);

        await armTargetTab({
          targetTabId: targetTab.id,
          synthqaTabId,
          url: targetUrl,
          executionId: message?.payload?.executionId,
          testCaseId: message?.payload?.testCaseId,
          stepNumber: message?.payload?.stepNumber,
        });

        const dataUrl = await chrome.tabs.captureVisibleTab(
          targetTab.windowId ?? null,
          { format: "png" }
        );

        return sendResponse({
          ok: true,
          data: {
            dataUrl,
            mimeType: "image/png",
            fileName: `screenshot-${Date.now()}.png`,
            capturedTabId: targetTab.id,
            url: targetUrl,
          },
        });
      }

      // -----------------------
      // REGION CAPTURE
      // -----------------------
      if (message?.command === "CAPTURE_REGION") {
        const targetUrl = normalizeUrl(
          message?.payload?.targetUrl || message?.payload?.url
        );
        if (!targetUrl)
          return sendResponse({ ok: false, error: "Missing targetUrl" });

        const synthqaTabId = sender?.tab?.id;
        if (!synthqaTabId)
          return sendResponse({
            ok: false,
            error: "Could not identify SynthQA tab",
          });

        const targetTab = await openOrFocusTargetTab(targetUrl);

        await armTargetTab({
          targetTabId: targetTab.id,
          synthqaTabId,
          url: targetUrl,
          executionId: message?.payload?.executionId,
          testCaseId: message?.payload?.testCaseId,
          stepNumber: message?.payload?.stepNumber,
        });

        // 1) User selects region (CSS px)
        const rect = await selectRegionOnTab(targetTab.id);

        // 2) Capture visible tab (full viewport)
        const fullDataUrl = await chrome.tabs.captureVisibleTab(
          targetTab.windowId ?? null,
          { format: "png" }
        );

        // 3) Crop
        const cropped = await cropDataUrl(fullDataUrl, rect);

        return sendResponse({
          ok: true,
          data: {
            dataUrl: cropped.dataUrl,
            mimeType: cropped.mimeType,
            fileName: `screenshot-region-${Date.now()}.png`,
            capturedTabId: targetTab.id,
            url: targetUrl,
          },
        });
      }

      return sendResponse({ ok: false, error: "Unknown command" });
    } catch (e) {
      console.error("[SynthQA Extension] SW error:", e);
      return sendResponse({
        ok: false,
        error: e?.message || "Extension error",
      });
    }
  })();

  return true;
});
