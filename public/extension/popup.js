// Popup script
document.addEventListener('DOMContentLoaded', async () => {
  const statusEl = document.getElementById('status');
  const openAppBtn = document.getElementById('openApp');

  // Check if extension is active on current tab
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    // Try to execute a simple script to check if content script is loaded
    try {
      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
          return window.__QA_EXTENSION_INSTALLED === true;
        }
      });

      const isActive = results && results[0] && results[0].result === true;

      if (isActive) {
        statusEl.className = 'status active';
        statusEl.innerHTML = '<span class="status-dot"></span><span>Active on this page</span>';
      } else {
        statusEl.className = 'status inactive';
        statusEl.innerHTML = '<span class="status-dot"></span><span>Inactive on this page</span>';
      }
    } catch (err) {
      statusEl.className = 'status inactive';
      statusEl.innerHTML = '<span class="status-dot"></span><span>Inactive on this page</span>';
    }
  } catch (err) {
    console.error('Error checking status:', err);
    statusEl.className = 'status inactive';
    statusEl.innerHTML = '<span class="status-dot"></span><span>Error checking status</span>';
  }

  // Open app button
  openAppBtn.addEventListener('click', () => {
    chrome.tabs.create({ url: 'http://localhost:3000' });
  });
});