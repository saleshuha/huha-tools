// Desktop Automation Companion - Content Script
console.log('Desktop Automation Companion: Content script loaded');

// Listen for messages from the background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Content script received message:', message.type);
  
  switch (message.type) {
    case 'INJECT_PICKER':
      injectElementPicker();
      sendResponse({ success: true });
      break;
      
    case 'REMOVE_PICKER':
      removeElementPicker();
      sendResponse({ success: true });
      break;
      
    default:
      sendResponse({ error: 'Unknown message type' });
  }
  
  return true;
});

// Monitor for specific page events that might be useful for automation
function monitorPageEvents() {
  // Monitor form submissions
  document.addEventListener('submit', (e) => {
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());
    
    chrome.runtime.sendMessage({
      type: 'STREAM_DATA',
      data: {
        event: 'form_submit',
        url: window.location.href,
        formData: data,
        timestamp: Date.now()
      }
    });
  });
  
  // Monitor file input changes
  document.addEventListener('change', (e) => {
    if (e.target.type === 'file') {
      chrome.runtime.sendMessage({
        type: 'STREAM_DATA',
        data: {
          event: 'file_selected',
          url: window.location.href,
          fileName: e.target.files[0]?.name,
          fileCount: e.target.files.length,
          timestamp: Date.now()
        }
      });
    }
  });
  
  // Monitor navigation changes
  let lastUrl = location.href;
  new MutationObserver(() => {
    const url = location.href;
    if (url !== lastUrl) {
      lastUrl = url;
      chrome.runtime.sendMessage({
        type: 'STREAM_DATA',
        data: {
          event: 'navigation',
          url: url,
          timestamp: Date.now()
        }
      });
    }
  }).observe(document, { subtree: true, childList: true });
}

// Initialize content script
function init() {
  // Only run on noon.partners domains
  if (window.location.hostname.includes('noon.partners')) {
    monitorPageEvents();
    console.log('Desktop Automation Companion: Monitoring enabled for', window.location.hostname);
  }
}

// Start monitoring when page is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}