const statusEl = document.getElementById("status");
const shotBtn = document.getElementById("shot");
const startBtn = document.getElementById("start");
const stopBtn = document.getElementById("stop");

let ctx = null;

function render() {
  if (!ctx?.executionId) {
    statusEl.innerHTML = `
      <div><strong>Not armed</strong></div>
      <div class="muted">Go to SynthQA and click Open target.</div>
    `;
    shotBtn.disabled = true;
    startBtn.disabled = true;
    stopBtn.disabled = true;
    return;
  }

  statusEl.innerHTML = `
    <div><strong>Armed for active tab</strong></div>
    <div class="row"><span>Execution</span><span>${ctx.executionId}</span></div>
    <div class="row"><span>Test Case</span><span>${ctx.testCaseId}</span></div>
    <div class="row"><span>Step</span><span>${ctx.stepNumber ?? "-"}</span></div>
  `;
  shotBtn.disabled = false;
  startBtn.disabled = false;
  stopBtn.disabled = false;
}

async function loadContext() {
  const resp = await chrome.runtime.sendMessage({ command: "GET_ACTIVE_TAB_CONTEXT" });
  ctx = resp?.data || null;
  render();
}

async function run(command, labelDuring) {
  const old = shotBtn.textContent;
  if (labelDuring) shotBtn.textContent = labelDuring;
  try {
    const resp = await chrome.runtime.sendMessage({ command });
    if (!resp?.ok) throw new Error(resp?.error || "Failed");
  } finally {
    if (labelDuring) shotBtn.textContent = old;
  }
}

shotBtn.addEventListener("click", async () => {
  shotBtn.disabled = true;
  try {
    const resp = await chrome.runtime.sendMessage({ command: "CAPTURE_SCREENSHOT_ACTIVE_TAB" });
    if (!resp?.ok) throw new Error(resp?.error || "Capture failed");
  } catch (e) {
    alert(e.message || "Capture failed");
  } finally {
    shotBtn.disabled = false;
    loadContext();
  }
});

startBtn.addEventListener("click", async () => {
  startBtn.disabled = true;
  try {
    const resp = await chrome.runtime.sendMessage({ command: "START_RECORDING_ACTIVE_TAB" });
    if (!resp?.ok) throw new Error(resp?.error || "Start failed");
  } catch (e) {
    alert(e.message || "Start failed");
  } finally {
    startBtn.disabled = false;
  }
});

stopBtn.addEventListener("click", async () => {
  stopBtn.disabled = true;
  try {
    const resp = await chrome.runtime.sendMessage({ command: "STOP_RECORDING_ACTIVE_TAB" });
    if (!resp?.ok) throw new Error(resp?.error || "Stop failed");
  } catch (e) {
    alert(e.message || "Stop failed");
  } finally {
    stopBtn.disabled = false;
  }
});

loadContext();
