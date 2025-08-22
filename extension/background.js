// Desktop Automation Companion - Background Script
const SUPABASE_URL = 'https://vfqqlifvhooefxvvyebm.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZmcXFsaWZ2aG9vZWZ4dnZ5ZWJtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI0MzY1OTgsImV4cCI6MjA2ODAxMjU5OH0.u-iIilnOACJTo_3AUCkmhREXdVV84JmbswtM_-NJJBM';

let currentUserId = null;
let isElementPickerActive = false;

// Initialize extension
chrome.runtime.onInstalled.addListener(() => {
  console.log('Desktop Automation Companion installed');
});

// Handle messages from popup and content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case 'AUTHENTICATE':
      handleAuthentication(message.accessToken);
      sendResponse({ success: true });
      break;
      
    case 'START_ELEMENT_PICKER':
      startElementPicker(sender.tab?.id);
      sendResponse({ success: true });
      break;
      
    case 'STOP_ELEMENT_PICKER':
      stopElementPicker(sender.tab?.id);
      sendResponse({ success: true });
      break;
      
    case 'CAPTURE_ELEMENT':
      handleElementCapture(message.data, sender.tab);
      sendResponse({ success: true });
      break;
      
    case 'STREAM_DATA':
      handleDataStream(message.data, sender.tab);
      sendResponse({ success: true });
      break;
      
    default:
      sendResponse({ error: 'Unknown message type' });
  }
  
  return true; // Keep message channel open for async response
});

// Authentication handler
async function handleAuthentication(accessToken) {
  try {
    // Store auth token
    await chrome.storage.local.set({ accessToken });
    
    // Verify token and get user ID
    const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'apikey': SUPABASE_ANON_KEY
      }
    });
    
    if (response.ok) {
      const user = await response.json();
      currentUserId = user.id;
      await chrome.storage.local.set({ userId: currentUserId });
      console.log('Authentication successful, user ID:', currentUserId);
    }
  } catch (error) {
    console.error('Authentication error:', error);
  }
}

// Element picker control
async function startElementPicker(tabId) {
  if (!tabId) return;
  
  isElementPickerActive = true;
  await chrome.storage.local.set({ elementPickerActive: true });
  
  // Inject picker script into the active tab
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      function: activateElementPicker
    });
  } catch (error) {
    console.error('Failed to inject picker script:', error);
  }
}

async function stopElementPicker(tabId) {
  if (!tabId) return;
  
  isElementPickerActive = false;
  await chrome.storage.local.set({ elementPickerActive: false });
  
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      function: deactivateElementPicker
    });
  } catch (error) {
    console.error('Failed to remove picker script:', error);
  }
}

// Element capture handler
async function handleElementCapture(elementData, tab) {
  if (!currentUserId || !elementData) return;
  
  try {
    const { accessToken } = await chrome.storage.local.get('accessToken');
    
    const captureEvent = {
      user_id: currentUserId,
      site_url: tab.url,
      site_origin: new URL(tab.url).origin,
      css: elementData.css,
      xpath: elementData.xpath,
      tag: elementData.tagName,
      inner_text: elementData.text,
      attributes: elementData.attributes || {}
    };
    
    // Send to Supabase
    const response = await fetch(`${SUPABASE_URL}/rest/v1/automation_capture_events`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'apikey': SUPABASE_ANON_KEY,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify(captureEvent)
    });
    
    if (response.ok) {
      console.log('Element capture recorded successfully');
      
      // Notify popup if open
      chrome.runtime.sendMessage({
        type: 'ELEMENT_CAPTURED',
        data: elementData
      }).catch(() => {}); // Ignore if popup not open
    }
  } catch (error) {
    console.error('Failed to record element capture:', error);
  }
}

// Data streaming handler
async function handleDataStream(streamData, tab) {
  if (!currentUserId || !streamData) return;
  
  try {
    const { accessToken } = await chrome.storage.local.get('accessToken');
    
    // Log the data stream event
    console.log('Data stream received:', streamData);
    
    // You can extend this to handle different types of data streaming
    // such as form submissions, file uploads, etc.
    
  } catch (error) {
    console.error('Failed to handle data stream:', error);
  }
}

// Functions to be injected into the page
function activateElementPicker() {
  // Remove existing picker if any
  const existingOverlay = document.getElementById('automation-picker-overlay');
  if (existingOverlay) existingOverlay.remove();
  
  // Create picker overlay
  const overlay = document.createElement('div');
  overlay.id = 'automation-picker-overlay';
  overlay.style.cssText = `
    position: fixed !important;
    top: 0 !important;
    left: 0 !important;
    width: 100% !important;
    height: 100% !important;
    background: rgba(59, 130, 246, 0.1) !important;
    z-index: 999999 !important;
    cursor: crosshair !important;
    pointer-events: all !important;
  `;
  
  // Create tooltip
  const tooltip = document.createElement('div');
  tooltip.id = 'automation-picker-tooltip';
  tooltip.style.cssText = `
    position: fixed !important;
    background: #1f2937 !important;
    color: white !important;
    padding: 8px 12px !important;
    border-radius: 6px !important;
    font-size: 12px !important;
    font-family: monospace !important;
    z-index: 1000000 !important;
    pointer-events: none !important;
    display: none !important;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1) !important;
  `;
  
  let lastHighlighted = null;
  
  // Element selector generation
  function getElementSelector(element) {
    // Generate CSS selector
    let css = '';
    if (element.id) {
      css = '#' + element.id;
    } else if (element.className) {
      const classes = element.className.split(' ').filter(c => c.trim());
      css = element.tagName.toLowerCase() + (classes.length ? '.' + classes.join('.') : '');
    } else {
      // Generate path-based selector
      const path = [];
      let current = element;
      while (current && current !== document.body) {
        let selector = current.tagName.toLowerCase();
        if (current.id) {
          selector += '#' + current.id;
          path.unshift(selector);
          break;
        } else if (current.className) {
          const classes = current.className.split(' ').filter(c => c.trim());
          if (classes.length) selector += '.' + classes.join('.');
        }
        
        // Add nth-child if necessary
        const siblings = Array.from(current.parentElement?.children || []);
        const sameTagSiblings = siblings.filter(s => s.tagName === current.tagName);
        if (sameTagSiblings.length > 1) {
          const index = sameTagSiblings.indexOf(current) + 1;
          selector += `:nth-of-type(${index})`;
        }
        
        path.unshift(selector);
        current = current.parentElement;
      }
      css = path.join(' > ');
    }
    
    // Generate XPath
    function getXPath(el) {
      if (el.id) return `//*[@id="${el.id}"]`;
      
      const parts = [];
      let current = el;
      while (current && current.nodeType === Node.ELEMENT_NODE && current !== document.documentElement) {
        let part = current.tagName.toLowerCase();
        const siblings = Array.from(current.parentElement?.children || []);
        const sameTagSiblings = siblings.filter(s => s.tagName === current.tagName);
        if (sameTagSiblings.length > 1) {
          const index = sameTagSiblings.indexOf(current) + 1;
          part += `[${index}]`;
        }
        parts.unshift(part);
        current = current.parentElement;
      }
      return '//' + parts.join('/');
    }
    
    return {
      css,
      xpath: getXPath(element),
      tagName: element.tagName.toLowerCase(),
      text: element.textContent?.trim() || element.getAttribute('placeholder') || element.getAttribute('value') || '',
      attributes: {
        id: element.id || '',
        className: element.className || '',
        type: element.getAttribute('type') || '',
        name: element.getAttribute('name') || '',
        placeholder: element.getAttribute('placeholder') || '',
        value: element.getAttribute('value') || ''
      }
    };
  }
  
  // Mouse move handler
  overlay.addEventListener('mousemove', (e) => {
    const target = document.elementFromPoint(e.clientX, e.clientY);
    if (target && target !== overlay && target !== tooltip) {
      // Remove previous highlight
      if (lastHighlighted) {
        lastHighlighted.style.outline = '';
        lastHighlighted.style.backgroundColor = '';
      }
      
      // Highlight current element
      target.style.outline = '2px solid #3b82f6';
      target.style.backgroundColor = 'rgba(59, 130, 246, 0.1)';
      lastHighlighted = target;
      
      // Show tooltip
      tooltip.style.display = 'block';
      tooltip.style.left = (e.clientX + 10) + 'px';
      tooltip.style.top = (e.clientY - 30) + 'px';
      
      const selectorInfo = getElementSelector(target);
      tooltip.textContent = `${selectorInfo.tagName}${selectorInfo.attributes.id ? '#' + selectorInfo.attributes.id : ''}${selectorInfo.attributes.className ? '.' + selectorInfo.attributes.className.split(' ').join('.') : ''}`;
    }
  });
  
  // Click handler
  overlay.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    const target = document.elementFromPoint(e.clientX, e.clientY);
    if (target && target !== overlay && target !== tooltip) {
      const selectorData = getElementSelector(target);
      
      // Send to background script
      chrome.runtime.sendMessage({
        type: 'CAPTURE_ELEMENT',
        data: selectorData
      });
      
      // Visual feedback
      target.style.outline = '3px solid #10b981';
      target.style.backgroundColor = 'rgba(16, 185, 129, 0.2)';
      setTimeout(() => {
        target.style.outline = '';
        target.style.backgroundColor = '';
      }, 1500);
    }
  });
  
  // Mouse leave handler
  overlay.addEventListener('mouseleave', () => {
    if (lastHighlighted) {
      lastHighlighted.style.outline = '';
      lastHighlighted.style.backgroundColor = '';
    }
    tooltip.style.display = 'none';
  });
  
  document.body.appendChild(overlay);
  document.body.appendChild(tooltip);
}

function deactivateElementPicker() {
  const overlay = document.getElementById('automation-picker-overlay');
  const tooltip = document.getElementById('automation-picker-tooltip');
  
  if (overlay) overlay.remove();
  if (tooltip) tooltip.remove();
  
  // Remove highlights from all elements
  document.querySelectorAll('*').forEach(el => {
    el.style.outline = '';
    el.style.backgroundColor = '';
  });
}