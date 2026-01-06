const statusEl = document.getElementById("status");
const shotBtn = document.getElementById("shot");
const startBtn = document.getElementById("start");
const stopBtn = document.getElementById("stop");

let ctx = null;
let rec = { isRecording: false };

function render() {
  const isRecording = !!rec?.isRecording;

  // Not armed
  if (!ctx?.executionId) {
    statusEl.innerHTML = `
      <div><strong>Not armed</strong></div>
      <div class="muted">Go to SynthQA and click Open target.</div>
      ${
        isRecording
          ? `<div class="muted">Recording in progress (you can stop it).</div>`
          : ""
      }
    `;

    shotBtn.disabled = true;
    startBtn.disabled = isRecording; // can't start another recording
    stopBtn.disabled = !isRecording; // allow stop if something is recording
    return;
  }

  statusEl.innerHTML = `
    <div><strong>Armed for active tab</strong></div>
    <div class="row"><span>Execution</span><span>${ctx.executionId}</span></div>
    <div class="row"><span>Test Case</span><span>${ctx.testCaseId}</span></div>
    <div class="row"><span>Step</span><span>${
      ctx.stepNumber ?? "-"
    }</span></div>
    ${isRecording ? `<div class="muted">Recording in progress…</div>` : ""}
  `;

  shotBtn.disabled = false;
  startBtn.disabled = isRecording; // disable start while recording
  stopBtn.disabled = !isRecording; // only enable stop while recording
}

async function loadContext() {
  const [ctxResp, recResp] = await Promise.all([
    chrome.runtime.sendMessage({ command: "GET_ACTIVE_TAB_CONTEXT" }),
    chrome.runtime.sendMessage({ command: "GET_RECORDING_STATUS" }),
  ]);

  ctx = ctxResp?.data || null;
  rec = recResp?.data || { isRecording: false };

  render();
}

shotBtn.addEventListener("click", async () => {
  shotBtn.disabled = true;
  try {
    const resp = await chrome.runtime.sendMessage({
      command: "CAPTURE_SCREENSHOT_ACTIVE_TAB",
    });
    if (!resp?.ok) throw new Error(resp?.error || "Capture failed");
  } catch (e) {
    alert(e?.message || "Capture failed");
  } finally {
    shotBtn.disabled = false;
    await loadContext();
  }
});

startBtn.addEventListener("click", async () => {
  startBtn.disabled = true;
  try {
    const resp = await chrome.runtime.sendMessage({
      command: "START_RECORDING_ACTIVE_TAB",
    });
    if (!resp?.ok) throw new Error(resp?.error || "Start failed");
  } catch (e) {
    alert(e?.message || "Start failed");
  } finally {
    await loadContext();
  }
});

// Recommended stop behavior: stop whichever tab is currently recording
stopBtn.addEventListener("click", async () => {
  stopBtn.disabled = true;
  try {
    const resp = await chrome.runtime.sendMessage({
      command: "STOP_RECORDING_CURRENT",
    });
    if (!resp?.ok) throw new Error(resp?.error || "Stop failed");
  } catch (e) {
    alert(e?.message || "Stop failed");
  } finally {
    await loadContext();
  }
});

loadContext();
