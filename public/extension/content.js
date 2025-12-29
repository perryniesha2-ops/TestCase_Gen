// QA Test Recorder Content Script
console.log('🎯 QA Test Recorder: Content script loaded');

// Set extension installed flag
window.__QA_EXTENSION_INSTALLED = true;

// Dispatch ready event
window.dispatchEvent(new CustomEvent('qa-extension-ready', {
  detail: { installed: true }
}));

console.log('✅ QA Test Recorder: Ready and listening');

// Recording state
let isRecording = false;
let isPaused = false;
let recordingStartTime = null;
let recordedActions = [];

// Message listener
window.addEventListener('message', (event) => {
  if (event.source !== window) return;
  const message = event.data;
  if (!message || message.source !== 'qa-app') return;
  
  console.log('📥 QA Recorder: Received message:', message.type);
  
  switch (message.type) {
    case 'START_RECORDING':
      startRecording(message.testCaseId);
      break;
    case 'STOP_RECORDING':
      stopRecording();
      break;
    case 'PAUSE_RECORDING':
      pauseRecording();
      break;
    case 'RESUME_RECORDING':
      resumeRecording();
      break;
    case 'EXECUTE_ACTION':
      executeAction(message.payload);
      break;
  }
});

function startRecording(testCaseId) {
  isRecording = true;
  isPaused = false;
  recordingStartTime = Date.now();
  recordedActions = [];
  
  console.log('🔴 QA Recorder: Recording started');
  
  showRecordingIndicator();
  attachEventListeners();
  
  recordAction({
    type: 'navigate',
    timestamp: 0,
    url: window.location.href,
    metadata: {}
  });
}

function stopRecording() {
  if (!isRecording) return;
  
  isRecording = false;
  isPaused = false;
  
  console.log('⏹️ QA Recorder: Recording stopped. Actions:', recordedActions.length);
  
  hideRecordingIndicator();
  removeEventListeners();
  
  if (window.opener && !window.opener.closed) {
    window.opener.postMessage({
      type: 'RECORDER_STOP',
      source: 'qa-extension',
      payload: {
        actions: recordedActions,
        duration: Date.now() - recordingStartTime,
        url: window.location.href,
        viewport: { width: window.innerWidth, height: window.innerHeight }
      }
    }, '*');
  }
}

function pauseRecording() {
  isPaused = true;
  console.log('⏸️ QA Recorder: Paused');
}

function resumeRecording() {
  isPaused = false;
  console.log('▶️ QA Recorder: Resumed');
}

function attachEventListeners() {
  document.addEventListener('click', handleClick, true);
  document.addEventListener('input', handleInput, true);
  document.addEventListener('change', handleChange, true);
  document.addEventListener('submit', handleSubmit, true);
}

function removeEventListeners() {
  document.removeEventListener('click', handleClick, true);
  document.removeEventListener('input', handleInput, true);
  document.removeEventListener('change', handleChange, true);
  document.removeEventListener('submit', handleSubmit, true);
}

function handleClick(event) {
  if (!isRecording || isPaused) return;
  const target = event.target;
  if (!target || target === document.body) return;
  
  recordAction({
    type: 'click',
    timestamp: Date.now() - recordingStartTime,
    selector: generateSelector(target),
    xpath: generateXPath(target),
    metadata: {
      elementText: target.textContent?.trim().substring(0, 50) || '',
      tagName: target.tagName.toLowerCase(),
      className: target.className || '',
      id: target.id || ''
    }
  });
}

function handleInput(event) {
  if (!isRecording || isPaused) return;
  const target = event.target;
  if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') return;
  
  clearTimeout(target._recordTimeout);
  target._recordTimeout = setTimeout(() => {
    recordAction({
      type: 'type',
      timestamp: Date.now() - recordingStartTime,
      selector: generateSelector(target),
      xpath: generateXPath(target),
      value: target.value,
      metadata: {
        tagName: target.tagName.toLowerCase(),
        inputType: target.type || ''
      }
    });
  }, 500);
}

function handleChange(event) {
  if (!isRecording || isPaused) return;
  const target = event.target;
  if (target.tagName !== 'SELECT') return;
  
  recordAction({
    type: 'select',
    timestamp: Date.now() - recordingStartTime,
    selector: generateSelector(target),
    xpath: generateXPath(target),
    value: target.value,
    metadata: {
      selectedText: target.options[target.selectedIndex]?.text || ''
    }
  });
}

function handleSubmit(event) {
  if (!isRecording || isPaused) return;
  
  recordAction({
    type: 'submit',
    timestamp: Date.now() - recordingStartTime,
    selector: generateSelector(event.target),
    xpath: generateXPath(event.target),
    metadata: {}
  });
}

function recordAction(action) {
  recordedActions.push(action);
  console.log('📝 QA Recorder: Action recorded:', action.type);
  
  if (window.opener && !window.opener.closed) {
    window.opener.postMessage({
      type: 'RECORDER_ACTION',
      source: 'qa-extension',
      payload: action
    }, '*');
  }
}

function generateSelector(element) {
  if (!element) return '';
  if (element.id) return '#' + element.id;
  
  if (element.className && typeof element.className === 'string') {
    const classes = element.className.trim().split(/\s+/).filter(c => c && !c.startsWith('_'));
    if (classes.length > 0) {
      return element.tagName.toLowerCase() + '.' + classes[0];
    }
  }
  
  const parent = element.parentElement;
  if (!parent) return element.tagName.toLowerCase();
  
  const siblings = Array.from(parent.children);
  const index = siblings.indexOf(element) + 1;
  return element.tagName.toLowerCase() + ':nth-child(' + index + ')';
}

function generateXPath(element) {
  if (!element) return '';
  if (element.id) return '//*[@id="' + element.id + '"]';
  
  const parts = [];
  let current = element;
  
  while (current && current.nodeType === 1) {
    let index = 1;
    let sibling = current.previousSibling;
    
    while (sibling) {
      if (sibling.nodeType === 1 && sibling.nodeName === current.nodeName) {
        index++;
      }
      sibling = sibling.previousSibling;
    }
    
    const tagName = current.nodeName.toLowerCase();
    const pathIndex = index > 1 ? '[' + index + ']' : '';
    parts.unshift(tagName + pathIndex);
    
    current = current.parentElement;
    if (parts.length > 5) break;
  }
  
  return '/' + parts.join('/');
}

function showRecordingIndicator() {
  if (document.getElementById('qa-recording-indicator')) return;
  
  const indicator = document.createElement('div');
  indicator.id = 'qa-recording-indicator';
  
  const dot = document.createElement('span');
  const text = document.createElement('span');
  text.textContent = 'Recording';
  
  indicator.appendChild(dot);
  indicator.appendChild(text);
  document.body.appendChild(indicator);
}

function hideRecordingIndicator() {
  const el = document.getElementById('qa-recording-indicator');
  if (el) el.remove();
}

async function executeAction(payload) {
  const { action, stepIndex } = payload;
  
  try {
    switch (action.type) {
      case 'click':
        await executeClick(action);
        break;
      case 'type':
        await executeType(action);
        break;
      case 'select':
        await executeSelect(action);
        break;
      case 'navigate':
        await executeNavigate(action);
        break;
    }
    
    window.opener?.postMessage({
      type: 'ACTION_EXECUTED',
      source: 'qa-extension',
      payload: { stepIndex, success: true }
    }, '*');
  } catch (error) {
    window.opener?.postMessage({
      type: 'ACTION_FAILED',
      source: 'qa-extension',
      payload: { stepIndex, error: error.message }
    }, '*');
  }
}

async function executeClick(action) {
  const el = findElement(action);
  if (!el) throw new Error('Element not found');
  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  await sleep(300);
  el.click();
}

async function executeType(action) {
  const el = findElement(action);
  if (!el) throw new Error('Element not found');
  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  await sleep(300);
  el.focus();
  el.value = action.value;
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
}

async function executeSelect(action) {
  const el = findElement(action);
  if (!el) throw new Error('Element not found');
  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  await sleep(300);
  el.value = action.value;
  el.dispatchEvent(new Event('change', { bubbles: true }));
}

async function executeNavigate(action) {
  window.location.href = action.url;
  await sleep(2000);
}

function findElement(action) {
  if (action.selector.startsWith('#')) {
    return document.querySelector(action.selector);
  }
  return document.querySelector(action.selector) || 
         document.evaluate(action.xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}