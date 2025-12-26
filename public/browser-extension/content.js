// content.js - Content script that runs on all pages

console.log('🎯 QA Test Recorder content script loaded')

// Inject the script into the page context
const script = document.createElement('script')
script.src = chrome.runtime.getURL('injected.js')

script.onload = function() {
  console.log('✅ injected.js loaded successfully')
  this.remove()
}

script.onerror = function(error) {
  console.error('❌ Failed to load injected.js:', error)
  console.error('Script src:', this.src)
}

// Try to inject
try {
  const target = document.head || document.documentElement
  if (target) {
    target.appendChild(script)
    console.log('📤 Injected script element into:', target.tagName)
  } else {
    console.error('❌ No valid injection target found')
  }
} catch (error) {
  console.error('❌ Error injecting script:', error)
}

// Listen for messages from the injected script (page context)
window.addEventListener('message', (event) => {
  // Only accept messages from same origin
  if (event.source !== window) return
  
  const message = event.data
  
  // Ignore messages that aren't for our extension
  if (!message.type || !message.type.startsWith('QA_')) return

  console.log('Content script received:', message.type)

  // Handle storage operations (bridge to chrome.storage)
  if (message.type === 'QA_TO_CONTENT_STORAGE_SET') {
    chrome.storage.local.set({
      [message.key]: message.value
    }, () => {
      console.log('✅ Saved to chrome.storage:', message.key)
      // Notify page it was saved
      window.postMessage({
        type: 'QA_STORAGE_SET_COMPLETE',
        key: message.key
      }, '*')
    })
    return
  }
  
  if (message.type === 'QA_TO_CONTENT_STORAGE_DELETE') {
    chrome.storage.local.remove([message.key], () => {
      console.log('🗑️ Deleted from chrome.storage:', message.key)
      window.postMessage({
        type: 'QA_STORAGE_DELETE_COMPLETE',
        key: message.key
      }, '*')
    })
    return
  }
  
  if (message.type === 'QA_TO_CONTENT_CHECK_STORAGE') {
    chrome.storage.local.get([message.key], (result) => {
      console.log('📦 Retrieved from chrome.storage:', message.key, result[message.key])
      // Send back to page
      window.postMessage({
        type: 'QA_STORAGE_RESPONSE',
        key: message.key,
        value: result[message.key] || null
      }, '*')
    })
    return
  }

  // Forward to background script if needed
  if (message.type === 'QA_SAVE_TO_SUPABASE') {
    // This would be handled by the page's own code
    // Content script just passes it through
    console.log('Forwarding to page:', message)
  }

  // Handle requests from injected script
  if (message.type === 'QA_GET_EXTENSION_INFO') {
    window.postMessage({
      type: 'QA_EXTENSION_INFO_RESPONSE',
      data: {
        installed: true,
        version: chrome.runtime.getManifest().version,
        id: chrome.runtime.id
      }
    }, '*')
  }
})

// Send initial signal that extension is ready
setTimeout(() => {
  window.postMessage({
    type: 'QA_EXTENSION_READY',
    data: { installed: true }
  }, '*')
}, 100)