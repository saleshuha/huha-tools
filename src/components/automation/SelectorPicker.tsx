import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Copy, Download, Chrome, Trash2, Save, Eye } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAutomationCapture } from '@/hooks/useAutomationCapture';
import { useAutomationConfig } from '@/hooks/useAutomationConfig';
import { supabase } from '@/integrations/supabase/client';

const AUTOMATION_FIELDS = [
  { key: 'usernameField', label: 'Username Field' },
  { key: 'passwordField', label: 'Password Field' },
  { key: 'loginButton', label: 'Login Button' },
  { key: 'importsMenu', label: 'Imports Menu' },
  { key: 'uploadMenu', label: 'Upload Menu' },
  { key: 'fileInput', label: 'File Input' },
  { key: 'uploadButton', label: 'Upload Button' },
  { key: 'successMessage', label: 'Success Message' },
  { key: 'errorMessage', label: 'Error Message' },
  { key: 'processingMessage', label: 'Processing Message' },
];

export const SelectorPicker = () => {
  const [accessToken, setAccessToken] = useState('');
  const { toast } = useToast();
  const { captureEvents, isLoading, mapElementToField, clearCaptureEvents } = useAutomationCapture();
  const { configs, saveConfig } = useAutomationConfig();

  const generateAccessToken = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        setAccessToken(session.access_token);
        toast({
          title: "Access Token Generated",
          description: "Copy this token to the browser extension to connect"
        });
      } else {
        toast({
          title: "Error",
          description: "Please log in to generate an access token",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error generating access token:', error);
      toast({
        title: "Error",
        description: "Failed to generate access token",
        variant: "destructive"
      });
    }
  };

  const copyToken = () => {
    navigator.clipboard.writeText(accessToken);
    toast({
      title: "Token Copied",
      description: "Access token copied to clipboard"
    });
  };

  const downloadExtension = () => {
    // Create the extension files content
    const extensionFiles = {
      'manifest.json': JSON.stringify({
        "manifest_version": 3,
        "name": "Desktop Automation Companion",
        "version": "1.0.0",
        "description": "Companion extension for Desktop Automation - captures element selectors and enables real-time data streaming",
        "permissions": [
          "activeTab",
          "storage",
          "tabs",
          "scripting"
        ],
        "host_permissions": [
          "https://noon.partners/*",
          "https://*.noon.partners/*",
          "https://vfqqlifvhooefxvvyebm.supabase.co/*"
        ],
        "background": {
          "service_worker": "background.js"
        },
        "content_scripts": [{
          "matches": ["https://noon.partners/*", "https://*.noon.partners/*"],
          "js": ["content.js"],
          "run_at": "document_end"
        }],
        "action": {
          "default_popup": "popup.html",
          "default_title": "Desktop Automation Companion"
        },
        "icons": {
          "16": "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%233b82f6' stroke-width='2'%3E%3Cpath d='M12 2L2 7l10 5 10-5-10-5z'/%3E%3Cpath d='M2 17l10 5 10-5'/%3E%3Cpath d='M2 12l10 5 10-5'/%3E%3C/svg%3E",
          "48": "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='48' height='48' viewBox='0 0 24 24' fill='none' stroke='%233b82f6' stroke-width='2'%3E%3Cpath d='M12 2L2 7l10 5 10-5-10-5z'/%3E%3Cpath d='M2 17l10 5 10-5'/%3E%3Cpath d='M2 12l10 5 10-5'/%3E%3C/svg%3E",
          "128": "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='128' height='128' viewBox='0 0 24 24' fill='none' stroke='%233b82f6' stroke-width='2'%3E%3Cpath d='M12 2L2 7l10 5 10-5-10-5z'/%3E%3Cpath d='M2 17l10 5 10-5'/%3E%3Cpath d='M2 12l10 5 10-5'/%3E%3C/svg%3E"
        }
      }, null, 2),
      
      'background.js': `// Desktop Automation Companion - Background Script
const SUPABASE_URL = 'https://vfqqlifvhooefxvvyebm.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZmcXFsaWZ2aG9vZWZ4dnZ5ZWJtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI0MzY1OTgsImV4cCI6MjA2ODAxMjU5OH0.u-iIilnOACJTo_3AUCkmhREXdVV84JmbswtM_-NJJBM';

let currentUserId = null;
let isElementPickerActive = false;

chrome.runtime.onInstalled.addListener(() => {
  console.log('Desktop Automation Companion installed');
});

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
    default:
      sendResponse({ error: 'Unknown message type' });
  }
  return true;
});

async function handleAuthentication(accessToken) {
  try {
    await chrome.storage.local.set({ accessToken });
    const response = await fetch(\`\${SUPABASE_URL}/auth/v1/user\`, {
      headers: {
        'Authorization': \`Bearer \${accessToken}\`,
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

async function startElementPicker(tabId) {
  if (!tabId) return;
  isElementPickerActive = true;
  await chrome.storage.local.set({ elementPickerActive: true });
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
    const response = await fetch(\`\${SUPABASE_URL}/rest/v1/automation_capture_events\`, {
      method: 'POST',
      headers: {
        'Authorization': \`Bearer \${accessToken}\`,
        'apikey': SUPABASE_ANON_KEY,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify(captureEvent)
    });
    if (response.ok) {
      console.log('Element capture recorded successfully');
      chrome.runtime.sendMessage({
        type: 'ELEMENT_CAPTURED',
        data: elementData
      }).catch(() => {});
    }
  } catch (error) {
    console.error('Failed to record element capture:', error);
  }
}

function activateElementPicker() {
  const existingOverlay = document.getElementById('automation-picker-overlay');
  if (existingOverlay) existingOverlay.remove();
  
  const overlay = document.createElement('div');
  overlay.id = 'automation-picker-overlay';
  overlay.style.cssText = \`
    position: fixed !important; top: 0 !important; left: 0 !important;
    width: 100% !important; height: 100% !important;
    background: rgba(59, 130, 246, 0.1) !important; z-index: 999999 !important;
    cursor: crosshair !important; pointer-events: all !important;
  \`;
  
  const tooltip = document.createElement('div');
  tooltip.id = 'automation-picker-tooltip';
  tooltip.style.cssText = \`
    position: fixed !important; background: #1f2937 !important; color: white !important;
    padding: 8px 12px !important; border-radius: 6px !important; font-size: 12px !important;
    font-family: monospace !important; z-index: 1000000 !important;
    pointer-events: none !important; display: none !important;
  \`;
  
  let lastHighlighted = null;
  
  function getElementSelector(element) {
    let css = '';
    if (element.id) {
      css = '#' + element.id;
    } else if (element.className) {
      const classes = element.className.split(' ').filter(c => c.trim());
      css = element.tagName.toLowerCase() + (classes.length ? '.' + classes.join('.') : '');
    } else {
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
        const siblings = Array.from(current.parentElement?.children || []);
        const sameTagSiblings = siblings.filter(s => s.tagName === current.tagName);
        if (sameTagSiblings.length > 1) {
          const index = sameTagSiblings.indexOf(current) + 1;
          selector += \`:nth-of-type(\${index})\`;
        }
        path.unshift(selector);
        current = current.parentElement;
      }
      css = path.join(' > ');
    }
    
    function getXPath(el) {
      if (el.id) return \`//*[@id="\${el.id}"]\`;
      const parts = [];
      let current = el;
      while (current && current.nodeType === Node.ELEMENT_NODE && current !== document.documentElement) {
        let part = current.tagName.toLowerCase();
        const siblings = Array.from(current.parentElement?.children || []);
        const sameTagSiblings = siblings.filter(s => s.tagName === current.tagName);
        if (sameTagSiblings.length > 1) {
          const index = sameTagSiblings.indexOf(current) + 1;
          part += \`[\${index}]\`;
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
        name: element.getAttribute('name') || ''
      }
    };
  }
  
  overlay.addEventListener('mousemove', (e) => {
    const target = document.elementFromPoint(e.clientX, e.clientY);
    if (target && target !== overlay && target !== tooltip) {
      if (lastHighlighted) {
        lastHighlighted.style.outline = '';
        lastHighlighted.style.backgroundColor = '';
      }
      target.style.outline = '2px solid #3b82f6';
      target.style.backgroundColor = 'rgba(59, 130, 246, 0.1)';
      lastHighlighted = target;
      tooltip.style.display = 'block';
      tooltip.style.left = (e.clientX + 10) + 'px';
      tooltip.style.top = (e.clientY - 30) + 'px';
      const selectorInfo = getElementSelector(target);
      tooltip.textContent = \`\${selectorInfo.tagName}\${selectorInfo.attributes.id ? '#' + selectorInfo.attributes.id : ''}\`;
    }
  });
  
  overlay.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    const target = document.elementFromPoint(e.clientX, e.clientY);
    if (target && target !== overlay && target !== tooltip) {
      const selectorData = getElementSelector(target);
      chrome.runtime.sendMessage({
        type: 'CAPTURE_ELEMENT',
        data: selectorData
      });
      target.style.outline = '3px solid #10b981';
      target.style.backgroundColor = 'rgba(16, 185, 129, 0.2)';
      setTimeout(() => {
        target.style.outline = '';
        target.style.backgroundColor = '';
      }, 1500);
    }
  });
  
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
  document.querySelectorAll('*').forEach(el => {
    el.style.outline = '';
    el.style.backgroundColor = '';
  });
}`,

      'popup.html': `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {
      width: 350px; padding: 16px; font-family: system-ui, -apple-system, sans-serif; margin: 0;
    }
    .header {
      display: flex; align-items: center; gap: 8px; margin-bottom: 16px;
      padding-bottom: 12px; border-bottom: 1px solid #e5e7eb;
    }
    .icon {
      width: 24px; height: 24px; background: #3b82f6; border-radius: 4px;
      display: flex; align-items: center; justify-content: center; color: white; font-weight: bold;
    }
    .status {
      padding: 12px; border-radius: 6px; margin-bottom: 16px;
      display: flex; align-items: center; gap: 8px;
    }
    .status.connected { background: #dcfce7; color: #166534; border: 1px solid #bbf7d0; }
    .status.disconnected { background: #fef2f2; color: #991b1b; border: 1px solid #fecaca; }
    .button {
      width: 100%; padding: 10px 16px; border: 1px solid #d1d5db; border-radius: 6px;
      background: white; cursor: pointer; font-size: 14px; margin-bottom: 8px;
      display: flex; align-items: center; justify-content: center; gap: 8px;
    }
    .button:hover { background: #f9fafb; }
    .button.primary { background: #3b82f6; color: white; border-color: #3b82f6; }
    .button.primary:hover { background: #2563eb; }
    .button.danger { background: #ef4444; color: white; border-color: #ef4444; }
    .button.danger:hover { background: #dc2626; }
    .button:disabled { opacity: 0.5; cursor: not-allowed; }
    .input {
      width: 100%; padding: 8px 12px; border: 1px solid #d1d5db; border-radius: 4px;
      font-size: 14px; margin-bottom: 12px; box-sizing: border-box;
    }
    .label {
      display: block; font-size: 12px; font-weight: 600; color: #374151; margin-bottom: 4px;
    }
    .captured-count {
      font-size: 12px; color: #6b7280; text-align: center; margin-top: 12px;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="icon">A</div>
    <div>
      <div style="font-weight: 600;">Desktop Automation</div>
      <div style="font-size: 12px; color: #6b7280;">Companion Extension</div>
    </div>
  </div>

  <div id="status" class="status disconnected">
    <span>●</span>
    <span id="statusText">Not Connected</span>
  </div>

  <div id="authSection">
    <label class="label" for="accessToken">Access Token:</label>
    <input type="password" id="accessToken" class="input" placeholder="Paste your access token here">
    <button id="connectBtn" class="button primary">Connect to App</button>
  </div>

  <div id="controlsSection" style="display: none;">
    <button id="pickerBtn" class="button">
      <span>🎯</span>
      <span id="pickerText">Start Element Picker</span>
    </button>
    
    <button id="openAppBtn" class="button">
      <span>🚀</span>
      <span>Open Desktop Automation App</span>
    </button>
    
    <button id="disconnectBtn" class="button" style="border-color: #ef4444; color: #ef4444;">
      <span>🔌</span>
      <span>Disconnect</span>
    </button>
  </div>

  <div id="capturedCount" class="captured-count" style="display: none;">
    <span id="captureCountText">0 elements captured this session</span>
  </div>

  <script src="popup.js"></script>
</body>
</html>`,

      'popup.js': `let isConnected = false;
let isPickerActive = false;
let capturedElementsCount = 0;

const statusEl = document.getElementById('status');
const statusTextEl = document.getElementById('statusText');
const authSectionEl = document.getElementById('authSection');
const controlsSectionEl = document.getElementById('controlsSection');
const accessTokenEl = document.getElementById('accessToken');
const connectBtnEl = document.getElementById('connectBtn');
const pickerBtnEl = document.getElementById('pickerBtn');
const pickerTextEl = document.getElementById('pickerText');
const openAppBtnEl = document.getElementById('openAppBtn');
const disconnectBtnEl = document.getElementById('disconnectBtn');
const capturedCountEl = document.getElementById('capturedCount');
const captureCountTextEl = document.getElementById('captureCountText');

document.addEventListener('DOMContentLoaded', async () => {
  await checkConnectionStatus();
  setupEventListeners();
});

async function checkConnectionStatus() {
  try {
    const { accessToken, userId } = await chrome.storage.local.get(['accessToken', 'userId']);
    if (accessToken && userId) {
      isConnected = true;
      updateUI();
    }
  } catch (error) {
    console.error('Error checking connection status:', error);
  }
}

function setupEventListeners() {
  connectBtnEl.addEventListener('click', handleConnect);
  disconnectBtnEl.addEventListener('click', handleDisconnect);
  pickerBtnEl.addEventListener('click', handlePickerToggle);
  openAppBtnEl.addEventListener('click', handleOpenApp);
  
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'ELEMENT_CAPTURED') {
      capturedElementsCount++;
      updateCaptureCount();
    }
  });
  
  setInterval(checkPickerStatus, 1000);
}

async function handleConnect() {
  const accessToken = accessTokenEl.value.trim();
  if (!accessToken) {
    alert('Please enter your access token');
    return;
  }
  try {
    connectBtnEl.textContent = 'Connecting...';
    connectBtnEl.disabled = true;
    const response = await chrome.runtime.sendMessage({
      type: 'AUTHENTICATE',
      accessToken: accessToken
    });
    if (response.success) {
      isConnected = true;
      accessTokenEl.value = '';
      updateUI();
    } else {
      throw new Error('Authentication failed');
    }
  } catch (error) {
    alert('Connection failed. Please check your access token.');
    console.error('Connection error:', error);
  } finally {
    connectBtnEl.textContent = 'Connect to App';
    connectBtnEl.disabled = false;
  }
}

async function handleDisconnect() {
  try {
    await chrome.storage.local.clear();
    isConnected = false;
    isPickerActive = false;
    capturedElementsCount = 0;
    updateUI();
  } catch (error) {
    console.error('Disconnect error:', error);
  }
}

async function handlePickerToggle() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) {
      alert('No active tab found');
      return;
    }
    if (!tab.url.includes('noon.partners')) {
      alert('Element picker only works on noon.partners websites');
      return;
    }
    if (isPickerActive) {
      await chrome.runtime.sendMessage({ type: 'STOP_ELEMENT_PICKER' });
      isPickerActive = false;
    } else {
      await chrome.runtime.sendMessage({ type: 'START_ELEMENT_PICKER' });
      isPickerActive = true;
    }
    updatePickerButton();
  } catch (error) {
    console.error('Picker toggle error:', error);
    alert('Failed to toggle element picker');
  }
}

function handleOpenApp() {
  chrome.tabs.create({ url: window.location.origin + '/desktop-automation' });
}

async function checkPickerStatus() {
  try {
    const { elementPickerActive } = await chrome.storage.local.get('elementPickerActive');
    if (elementPickerActive !== isPickerActive) {
      isPickerActive = elementPickerActive || false;
      updatePickerButton();
    }
  } catch (error) {}
}

function updateUI() {
  if (isConnected) {
    statusEl.className = 'status connected';
    statusTextEl.textContent = 'Connected to App';
    authSectionEl.style.display = 'none';
    controlsSectionEl.style.display = 'block';
    capturedCountEl.style.display = 'block';
    updateCaptureCount();
  } else {
    statusEl.className = 'status disconnected';
    statusTextEl.textContent = 'Not Connected';
    authSectionEl.style.display = 'block';
    controlsSectionEl.style.display = 'none';
    capturedCountEl.style.display = 'none';
  }
  updatePickerButton();
}

function updatePickerButton() {
  if (isPickerActive) {
    pickerBtnEl.className = 'button danger';
    pickerTextEl.textContent = 'Stop Element Picker';
  } else {
    pickerBtnEl.className = 'button';
    pickerTextEl.textContent = 'Start Element Picker';
  }
}

function updateCaptureCount() {
  captureCountTextEl.textContent = \`\${capturedElementsCount} elements captured this session\`;
}`,

      'content.js': `console.log('Desktop Automation Companion: Content script loaded');

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Content script received message:', message.type);
  sendResponse({ success: true });
  return true;
});

function monitorPageEvents() {
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
}

function init() {
  if (window.location.hostname.includes('noon.partners')) {
    monitorPageEvents();
    console.log('Desktop Automation Companion: Monitoring enabled for', window.location.hostname);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}`,

      'README.md': `# Desktop Automation Companion Extension

## Installation Instructions

### Chrome/Edge:
1. Open Chrome and go to chrome://extensions/
2. Enable "Developer mode" (top-right toggle)
3. Click "Load unpacked"
4. Select the extracted extension folder
5. The extension icon will appear in your browser toolbar

### Firefox:
1. Open Firefox and go to about:debugging
2. Click "This Firefox"
3. Click "Load Temporary Add-on"
4. Select the manifest.json file

## Usage:
1. Click the extension icon in your browser
2. Get your access token from the Desktop Automation app
3. Paste the token and click "Connect to App"
4. Navigate to noon.partners
5. Click "Start Element Picker" 
6. Click on elements to capture them
7. View results in your Desktop Automation app

## Troubleshooting:
- Make sure you're on a noon.partners website
- Check that your access token is valid
- Refresh the page if picker stops working
- Check browser console for error messages

For support, refer to the Desktop Automation app documentation.`
    };

    // Create and download files as individual downloads
    Object.entries(extensionFiles).forEach(([filename, content]) => {
      const blob = new Blob([content], { type: filename.endsWith('.json') ? 'application/json' : 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });

    toast({
      title: "Extension Files Downloaded",
      description: "All extension files have been downloaded. Extract them to a folder and load in your browser.",
    });
  };

  return (
    <div className="space-y-6">
      {/* Extension Setup */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Chrome className="h-5 w-5" />
            Browser Extension Setup
          </CardTitle>
          <CardDescription>
            Install the companion browser extension to capture accurate element selectors
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <Chrome className="h-4 w-4" />
            <AlertDescription>
              <strong>Step 1:</strong> Download and install the Desktop Automation Companion extension from the project files.
              <br />
              <strong>Step 2:</strong> Generate an access token below and paste it into the extension popup.
              <br />
              <strong>Step 3:</strong> Navigate to noon.partners and start capturing elements.
            </AlertDescription>
          </Alert>

          <div className="flex gap-2">
            <Button onClick={downloadExtension} className="flex items-center gap-2">
              <Download className="h-4 w-4" />
              Download Extension Files
            </Button>
            <Button onClick={generateAccessToken} variant="outline" className="flex items-center gap-2">
              <Save className="h-4 w-4" />
              Generate Access Token
            </Button>
          </div>

          {accessToken && (
            <div className="space-y-2">
              <Label>Access Token (paste this into the extension):</Label>
              <div className="flex gap-2">
                <Input 
                  value={accessToken} 
                  readOnly 
                  className="font-mono text-sm"
                  type="password"
                />
                <Button onClick={copyToken} variant="outline" size="sm">
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Captured Elements */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Captured Elements ({captureEvents.length})</CardTitle>
              <CardDescription>
                Real-time element captures from the browser extension
              </CardDescription>
            </div>
            <Button onClick={clearCaptureEvents} variant="outline" size="sm">
              <Trash2 className="h-4 w-4" />
              Clear All
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {captureEvents.length === 0 ? (
            <Alert>
              <Eye className="h-4 w-4" />
              <AlertDescription>
                No elements captured yet. Install the browser extension, connect with your access token, and start capturing elements from noon.partners.
              </AlertDescription>
            </Alert>
          ) : (
            <ScrollArea className="h-[400px]">
              <div className="space-y-4">
                {captureEvents.slice(0, 20).map((event) => (
                  <div
                    key={event.id}
                    className="border rounded-lg p-4 space-y-3"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline">{event.tag}</Badge>
                          {event.mapped_field && (
                            <Badge className="bg-green-100 text-green-800">
                              Mapped to {event.mapped_field}
                            </Badge>
                          )}
                          <span className="text-sm text-muted-foreground">
                            {new Date(event.created_at).toLocaleTimeString()}
                          </span>
                        </div>
                        
                        {event.inner_text && (
                          <p className="text-sm mb-2 p-2 bg-muted rounded">
                            Text: "{event.inner_text.substring(0, 100)}{event.inner_text.length > 100 ? '...' : ''}"
                          </p>
                        )}
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                          <div>
                            <Label className="text-xs font-medium">CSS Selector:</Label>
                            <Input 
                              value={event.css || ''} 
                              readOnly 
                              className="mt-1 font-mono text-xs"
                            />
                          </div>
                          <div>
                            <Label className="text-xs font-medium">XPath:</Label>
                            <Input 
                              value={event.xpath || ''} 
                              readOnly 
                              className="mt-1 font-mono text-xs"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Label className="text-sm font-medium">Map to field:</Label>
                      <Select
                        value={event.mapped_field || ""}
                        onValueChange={(value) => mapElementToField(event.id, value)}
                      >
                        <SelectTrigger className="w-48">
                          <SelectValue placeholder="Select field..." />
                        </SelectTrigger>
                        <SelectContent>
                          {AUTOMATION_FIELDS.map((field) => (
                            <SelectItem key={field.key} value={field.key}>
                              {field.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
};