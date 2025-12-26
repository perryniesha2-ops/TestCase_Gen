// popup.js - Extension popup logic

document.addEventListener('DOMContentLoaded', () => {
  console.log('QA Test Recorder popup loaded')

  // Update dashboard URL based on environment
  const dashboardButton = document.querySelector('.button-primary')
  const docsButton = document.querySelector('.button-secondary')

  // Check if running in production
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const currentTab = tabs[0]
    
    // Extract base URL from current tab if it's the app
    if (currentTab.url) {
      const url = new URL(currentTab.url)
      const baseUrl = `${url.protocol}//${url.host}`
      
      // Update button URLs to match current environment
      if (currentTab.url.includes('localhost') || currentTab.url.includes('127.0.0.1')) {
        dashboardButton.href = 'http://localhost:3000/pages/test-cases'
        docsButton.href = 'http://localhost:3000/pages/browserextensions'
      } else {
        // Production URL
        dashboardButton.href = `${baseUrl}/pages/test-cases`
        docsButton.href = `${baseUrl}/pages/browserextensions`
      }
    }
  })

  // Check extension status
  chrome.runtime.sendMessage({ type: 'EXTENSION_INSTALLED' }, (response) => {
    if (response && response.success) {
      console.log('Extension version:', response.version)
    }
  })
})