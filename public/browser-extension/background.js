// background.js - Extension background service worker

console.log('🎯 QA Test Recorder extension loaded')

// Programmatically register content scripts (Manifest V3 workaround)
async function registerContentScripts() {
  try {
    // Unregister any existing scripts first
    await chrome.scripting.unregisterContentScripts()
    
    // Register our content script
    await chrome.scripting.registerContentScripts([{
      id: 'qa-content-script',
      matches: ['<all_urls>'],
      js: ['content.js'],
      runAt: 'document_start',
      allFrames: false
    }])
    
    console.log('✅ Content scripts registered successfully')
  } catch (err) {
    console.error('❌ Failed to register content scripts:', err)
  }
}

// Register on install or update
chrome.runtime.onInstalled.addListener((details) => {
  console.log('Extension installed/updated, registering content scripts...')
  registerContentScripts()
  
  if (details.reason === 'install') {
    console.log('🎉 QA Test Recorder installed!')
    
    // Try to detect app URL from open tabs
    chrome.tabs.query({}, (tabs) => {
      const appTab = URL_HELPER.findAppTab(tabs)
      
      let targetUrl
      
      if (appTab) {
        // App detected! Go directly to extension page
        const baseUrl = URL_HELPER.getBaseUrl(appTab.url)
        targetUrl = `${baseUrl}/pages/extension`
        console.log('✅ App detected, opening:', targetUrl)
      } else {
        // App not detected, use redirect page
        targetUrl = `${URL_HELPER.BASE_URL}/pages/extension-redirect`
        console.log('⚠️  App not detected, opening redirect page:', targetUrl)
      }
      
      // Open the welcome page
      chrome.tabs.create({ url: targetUrl })
    })
    
  } else if (details.reason === 'update') {
    console.log('🔄 QA Test Recorder updated to version', chrome.runtime.getManifest().version)
  }
})

// Also register on startup (in case extension is reloaded)
chrome.runtime.onStartup.addListener(() => {
  console.log('Extension starting up, registering content scripts...')
  registerContentScripts()
})

// URL Helper (inline version for background script)
const URL_HELPER = {
  BASE_URL: '__BASE_URL__',
  
  isAppUrl(url) {
    if (!url) return false
    try {
      const urlObj = new URL(url)
      return (
        urlObj.hostname === 'localhost' ||
        urlObj.hostname === '127.0.0.1' ||
        urlObj.hostname.includes('vercel.app') ||
        urlObj.hostname.includes('your-domain.com')
      )
    } catch (e) {
      return false
    }
  },
  
  getBaseUrl(url) {
    try {
      const urlObj = new URL(url)
      return `${urlObj.protocol}//${urlObj.host}`
    } catch (e) {
      return this.BASE_URL
    }
  },
  
  findAppTab(tabs) {
    return tabs.find(tab => tab.url && this.isAppUrl(tab.url))
  }
}

// Listen for messages from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Background received message:', message.type)

  if (message.type === 'EXTENSION_INSTALLED') {
    sendResponse({ success: true, version: '1.0.0' })
  }

  if (message.type === 'GET_TAB_INFO') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        sendResponse({
          tabId: tabs[0].id,
          url: tabs[0].url,
          title: tabs[0].title
        })
      }
    })
    return true // Keep channel open for async response
  }

  if (message.type === 'SAVE_RECORDING') {
    // Store recording in chrome.storage
    chrome.storage.local.set({
      [`recording_${message.recordingId}`]: message.data
    }, () => {
      console.log('✅ Recording saved:', message.recordingId)
      sendResponse({ success: true })
    })
    return true
  }

  if (message.type === 'GET_RECORDING') {
    chrome.storage.local.get([`recording_${message.recordingId}`], (result) => {
      sendResponse({ 
        success: true, 
        data: result[`recording_${message.recordingId}`] 
      })
    })
    return true
  }
})

// Handle extension installation
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('🎉 QA Test Recorder installed!')
    
    // Try to detect app URL from open tabs
    chrome.tabs.query({}, (tabs) => {
      const appTab = URL_HELPER.findAppTab(tabs)
      
      let targetUrl
      
      if (appTab) {
        // App detected! Go directly to extension page
        const baseUrl = URL_HELPER.getBaseUrl(appTab.url)
        targetUrl = `${baseUrl}/pages/extension`
        console.log('✅ App detected, opening:', targetUrl)
      } else {
        // App not detected, use redirect page
        targetUrl = `${URL_HELPER.BASE_URL}/pages/extension-redirect`
        console.log('⚠️  App not detected, opening redirect page:', targetUrl)
      }
      
      // Open the welcome page
      chrome.tabs.create({ url: targetUrl })
    })
    
  } else if (details.reason === 'update') {
    console.log('🔄 QA Test Recorder updated to version', chrome.runtime.getManifest().version)
  }
})