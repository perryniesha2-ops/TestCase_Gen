// QA Test Recorder Background Script
console.log('🎯 QA Test Recorder: Background script loaded');

// Listen for extension icon clicks
chrome.action.onClicked.addListener(async (tab) => {
  console.log('Extension icon clicked on tab:', tab.id);
});

// Keep service worker alive
chrome.runtime.onInstalled.addListener(() => {
  console.log('✅ QA Test Recorder: Extension installed');
});