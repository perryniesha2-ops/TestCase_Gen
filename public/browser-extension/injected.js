// injected.js - Runs in page context, has access to window object

(function() {
  'use strict'
  
  console.log('🎬 QA Test Recorder injected script loaded')

  // Set global flag that extension is installed
  window.__QA_EXTENSION_INSTALLED = true
  window.__QA_EXTENSION_VERSION = '1.0.0'

  // Check if recording should auto-start from chrome.storage via content script
  // Send request to content script to check storage
  window.postMessage({
    type: 'QA_CHECK_STORAGE',
    key: 'activeRecording'
  }, '*')

  // Recording state
  let isRecording = false
  let recordedActions = []
  let currentRecordingId = null
  let sessionStartTime = null

  // Helper to update chrome.storage with current recording state
  function updateRecordingInStorage() {
    if (!currentRecordingId) return
    
    window.postMessage({
      type: 'QA_STORAGE_SET',
      key: 'activeRecording',
      value: {
        id: currentRecordingId,
        actionCount: recordedActions.length,
        actions: recordedActions,
        startTime: sessionStartTime
      }
    }, '*')
  }

  // Element selector generator with fallback strategies
  function generateSelector(element) {
    const selectors = []

    // Strategy 1: Test ID (most reliable)
    if (element.getAttribute('data-testid')) {
      selectors.push({
        strategy: 'testid',
        value: `[data-testid="${element.getAttribute('data-testid')}"]`
      })
    }

    // Strategy 2: Unique ID
    if (element.id) {
      selectors.push({
        strategy: 'id',
        value: `#${element.id}`
      })
    }

    // Strategy 3: Name attribute
    if (element.name) {
      selectors.push({
        strategy: 'name',
        value: `[name="${element.name}"]`
      })
    }

    // Strategy 4: CSS Path
    const cssPath = getCSSPath(element)
    if (cssPath) {
      selectors.push({
        strategy: 'css',
        value: cssPath
      })
    }

    // Strategy 5: Text content (for buttons/links)
    const text = element.textContent?.trim()
    if (text && text.length < 50 && (element.tagName === 'BUTTON' || element.tagName === 'A')) {
      selectors.push({
        strategy: 'text',
        value: text
      })
    }

    return {
      primary: selectors[0] || { strategy: 'xpath', value: getXPath(element) },
      fallbacks: selectors.slice(1),
      elementInfo: {
        tagName: element.tagName,
        type: element.type,
        textContent: text,
        placeholder: element.placeholder
      }
    }
  }

  function getCSSPath(element) {
    const path = []
    let current = element

    while (current && current.nodeType === Node.ELEMENT_NODE) {
      let selector = current.tagName.toLowerCase()
      
      if (current.id) {
        selector += `#${current.id}`
        path.unshift(selector)
        break
      } else if (current.className) {
        const classes = current.className.split(' ').filter(c => c && !c.startsWith('css-'))
        if (classes.length > 0) {
          selector += `.${classes.join('.')}`
        }
      }

      path.unshift(selector)
      current = current.parentElement

      // Limit depth
      if (path.length > 5) break
    }

    return path.join(' > ')
  }

  function getXPath(element) {
    if (element.id) {
      return `//*[@id="${element.id}"]`
    }
    
    const paths = []
    let current = element

    while (current && current.nodeType === Node.ELEMENT_NODE) {
      let index = 0
      let sibling = current.previousSibling

      while (sibling) {
        if (sibling.nodeType === Node.ELEMENT_NODE && sibling.tagName === current.tagName) {
          index++
        }
        sibling = sibling.previousSibling
      }

      const tagName = current.tagName.toLowerCase()
      const pathIndex = index > 0 ? `[${index + 1}]` : ''
      paths.unshift(`${tagName}${pathIndex}`)
      current = current.parentElement
    }

    return `/${paths.join('/')}`
  }

  // Capture click events
  function handleClick(event) {
    if (!isRecording) return

    const target = event.target
    const selector = generateSelector(target)

    const action = {
      type: 'click',
      timestamp: Date.now() - sessionStartTime,
      selector: selector,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight
      }
    }

    recordedActions.push(action)
    console.log('📝 Recorded click:', action)

    // Send to page for syncing
    window.postMessage({
      type: 'QA_ACTION_RECORDED',
      action: action
    }, '*')
    
    // Update chrome.storage for cross-tab sync
    updateRecordingInStorage()
  }

  // Capture input events
  function handleInput(event) {
    if (!isRecording) return

    const target = event.target
    const selector = generateSelector(target)

    const action = {
      type: 'type',
      timestamp: Date.now() - sessionStartTime,
      selector: selector,
      value: target.value,
      inputType: target.type
    }

    recordedActions.push(action)
    console.log('📝 Recorded input:', action)

    window.postMessage({
      type: 'QA_ACTION_RECORDED',
      action: action
    }, '*')
    
    // Update chrome.storage for cross-tab sync
    updateRecordingInStorage()
  }

  // Capture navigation
  let lastUrl = location.href
  function checkNavigation() {
    if (!isRecording) return

    const currentUrl = location.href
    if (currentUrl !== lastUrl) {
      const action = {
        type: 'navigate',
        timestamp: Date.now() - sessionStartTime,
        url: currentUrl,
        from: lastUrl
      }

      recordedActions.push(action)
      console.log('📝 Recorded navigation:', action)

      window.postMessage({
        type: 'QA_ACTION_RECORDED',
        action: action
      }, '*')

      lastUrl = currentUrl
    }
  }

  // Start recording
  function startRecording(recordingId) {
    if (isRecording) {
      console.warn('Already recording')
      return
    }

    console.log('🔴 Recording started:', recordingId)
    isRecording = true
    currentRecordingId = recordingId
    sessionStartTime = Date.now()
    recordedActions = []

    // Add event listeners
    document.addEventListener('click', handleClick, true)
    document.addEventListener('input', handleInput, true)
    
    // Check for navigation every 500ms
    setInterval(checkNavigation, 500)

    // Record initial page
    recordedActions.push({
      type: 'navigate',
      timestamp: 0,
      url: location.href
    })

    window.postMessage({
      type: 'QA_RECORDING_STARTED',
      recordingId: recordingId
    }, '*')
  }

  // Stop recording
  function stopRecording() {
    if (!isRecording) {
      console.warn('Not recording')
      return
    }

    console.log('⏹️ Recording stopped')
    isRecording = false

    // Remove event listeners
    document.removeEventListener('click', handleClick, true)
    document.removeEventListener('input', handleInput, true)

    const recording = {
      recordingId: currentRecordingId,
      actions: recordedActions,
      duration: Date.now() - sessionStartTime,
      startTime: sessionStartTime,
      url: location.href,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight
      }
    }

    // Save completed recording to chrome.storage
    window.postMessage({
      type: 'QA_STORAGE_SET',
      key: 'completedRecording',
      value: recording
    }, '*')

    window.postMessage({
      type: 'QA_RECORDING_STOPPED',
      recording: recording
    }, '*')

    // Clear active recording from storage
    window.postMessage({
      type: 'QA_STORAGE_DELETE',
      key: 'activeRecording'
    }, '*')

    return recording
  }

  // Execute test
  async function executeTest(recording, options = {}) {
    console.log('▶️ Executing test with', recording.actions.length, 'actions')

    const results = {
      success: true,
      actions: [],
      screenshots: [],
      errors: []
    }

    for (let i = 0; i < recording.actions.length; i++) {
      const action = recording.actions[i]
      const stepResult = {
        actionIndex: i,
        type: action.type,
        success: false,
        error: null
      }

      try {
        // Wait for delay if specified
        if (options.delayBetweenActions) {
          await new Promise(resolve => setTimeout(resolve, options.delayBetweenActions))
        }

        if (action.type === 'navigate') {
          if (location.href !== action.url) {
            window.location.href = action.url
            await new Promise(resolve => setTimeout(resolve, 2000))
          }
          stepResult.success = true
        }

        if (action.type === 'click') {
          const element = findElement(action.selector)
          if (!element) {
            throw new Error(`Element not found: ${action.selector.primary.value}`)
          }

          element.scrollIntoView({ behavior: 'smooth', block: 'center' })
          await new Promise(resolve => setTimeout(resolve, 300))
          element.click()
          stepResult.success = true
        }

        if (action.type === 'type') {
          const element = findElement(action.selector)
          if (!element) {
            throw new Error(`Element not found: ${action.selector.primary.value}`)
          }

          element.scrollIntoView({ behavior: 'smooth', block: 'center' })
          element.value = action.value
          element.dispatchEvent(new Event('input', { bubbles: true }))
          element.dispatchEvent(new Event('change', { bubbles: true }))
          stepResult.success = true
        }

        // Capture screenshot (mock - would need actual implementation)
        if (options.captureScreenshots) {
          results.screenshots.push({
            actionIndex: i,
            timestamp: Date.now()
          })
        }

      } catch (error) {
        console.error(`❌ Error at step ${i}:`, error)
        stepResult.success = false
        stepResult.error = error.message
        results.success = false
        results.errors.push({
          actionIndex: i,
          error: error.message
        })

        if (options.stopOnError) {
          break
        }
      }

      results.actions.push(stepResult)

      // Notify progress
      window.postMessage({
        type: 'QA_EXECUTION_PROGRESS',
        progress: {
          current: i + 1,
          total: recording.actions.length,
          action: stepResult
        }
      }, '*')
    }

    window.postMessage({
      type: 'QA_EXECUTION_COMPLETE',
      results: results
    }, '*')

    return results
  }

  // Find element using selector with fallbacks
  function findElement(selector) {
    // Try primary selector
    let element = querySelectorByStrategy(selector.primary)
    if (element) return element

    // Try fallbacks
    if (selector.fallbacks) {
      for (const fallback of selector.fallbacks) {
        element = querySelectorByStrategy(fallback)
        if (element) {
          console.log(`✅ Found element using fallback: ${fallback.strategy}`)
          return element
        }
      }
    }

    return null
  }

  function querySelectorByStrategy(selector) {
    try {
      if (selector.strategy === 'testid') {
        return document.querySelector(selector.value)
      }
      if (selector.strategy === 'id') {
        return document.querySelector(selector.value)
      }
      if (selector.strategy === 'name') {
        return document.querySelector(selector.value)
      }
      if (selector.strategy === 'css') {
        return document.querySelector(selector.value)
      }
      if (selector.strategy === 'text') {
        const buttons = document.querySelectorAll('button, a')
        for (const button of buttons) {
          if (button.textContent?.trim() === selector.value) {
            return button
          }
        }
      }
      if (selector.strategy === 'xpath') {
        const result = document.evaluate(
          selector.value,
          document,
          null,
          XPathResult.FIRST_ORDERED_NODE_TYPE,
          null
        )
        return result.singleNodeValue
      }
    } catch (error) {
      console.warn(`Failed to find element with ${selector.strategy}:`, error)
    }
    return null
  }

  // Expose API to window
  window.__QA_RECORDER = {
    startRecording,
    stopRecording,
    executeTest,
    isRecording: () => isRecording,
    getActions: () => recordedActions
  }

  // Listen for commands from page
  window.addEventListener('message', (event) => {
    if (event.source !== window) return

    const message = event.data
    if (!message.type || !message.type.startsWith('QA_')) return

    console.log('🎯 Injected.js received:', message.type)

    // Handle storage response (from content script)
    if (message.type === 'QA_STORAGE_RESPONSE') {
      const activeRecording = message.value
      if (activeRecording) {
        console.log('🎬 Auto-starting recording from storage:', activeRecording.id)
        // Start recording after everything is set up
        setTimeout(() => {
          startRecording(activeRecording.id)
        }, 500)
      }
      return
    }

    // Handle command messages
    if (message.type === 'QA_COMMAND_START_RECORDING') {
      startRecording(message.recordingId)
      return
    }

    if (message.type === 'QA_COMMAND_STOP_RECORDING') {
      stopRecording()
      return
    }

    if (message.type === 'QA_COMMAND_EXECUTE_TEST') {
      executeTest(message.recording, message.options)
      return
    }
    
    // Storage commands - forward to content script
    if (message.type === 'QA_STORAGE_SET') {
      console.log('📤 Forwarding storage SET to content script:', message.key)
      // Forward to content script which has chrome.storage access
      window.postMessage({
        type: 'QA_TO_CONTENT_STORAGE_SET',
        key: message.key,
        value: message.value
      }, '*')
      return
    }
    
    if (message.type === 'QA_STORAGE_DELETE') {
      console.log('📤 Forwarding storage DELETE to content script:', message.key)
      // Forward to content script
      window.postMessage({
        type: 'QA_TO_CONTENT_STORAGE_DELETE',
        key: message.key
      }, '*')
      return
    }
    
    if (message.type === 'QA_CHECK_STORAGE') {
      console.log('📤 Forwarding storage CHECK to content script:', message.key)
      // Forward storage check to content script
      window.postMessage({
        type: 'QA_TO_CONTENT_CHECK_STORAGE',
        key: message.key
      }, '*')
      return
    }
  })

  console.log('✅ QA Test Recorder ready')
})()