// Desktop Automation Companion - Popup Script
let isConnected = false;
let isPickerActive = false;
let capturedElementsCount = 0;

// DOM elements
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

// Initialize popup
document.addEventListener('DOMContentLoaded', async () => {
  await checkConnectionStatus();
  setupEventListeners();
});

// Check if already connected
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

// Setup event listeners
function setupEventListeners() {
  connectBtnEl.addEventListener('click', handleConnect);
  disconnectBtnEl.addEventListener('click', handleDisconnect);
  pickerBtnEl.addEventListener('click', handlePickerToggle);
  openAppBtnEl.addEventListener('click', handleOpenApp);
  
  // Listen for messages from background script
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'ELEMENT_CAPTURED') {
      capturedElementsCount++;
      updateCaptureCount();
    }
  });
  
  // Check picker status periodically
  setInterval(checkPickerStatus, 1000);
}

// Handle connection
async function handleConnect() {
  const accessToken = accessTokenEl.value.trim();
  
  if (!accessToken) {
    alert('Please enter your access token');
    return;
  }
  
  try {
    connectBtnEl.textContent = 'Connecting...';
    connectBtnEl.disabled = true;
    
    // Send token to background script for verification
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

// Handle disconnection
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

// Handle picker toggle
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
      await chrome.runtime.sendMessage({
        type: 'STOP_ELEMENT_PICKER'
      });
      isPickerActive = false;
    } else {
      await chrome.runtime.sendMessage({
        type: 'START_ELEMENT_PICKER'
      });
      isPickerActive = true;
    }
    
    updatePickerButton();
  } catch (error) {
    console.error('Picker toggle error:', error);
    alert('Failed to toggle element picker');
  }
}

// Handle open app
function handleOpenApp() {
  chrome.tabs.create({
    url: 'https://your-app-domain.com/desktop-automation' // Replace with actual app URL
  });
}

// Check picker status
async function checkPickerStatus() {
  try {
    const { elementPickerActive } = await chrome.storage.local.get('elementPickerActive');
    if (elementPickerActive !== isPickerActive) {
      isPickerActive = elementPickerActive || false;
      updatePickerButton();
    }
  } catch (error) {
    // Ignore errors
  }
}

// Update UI based on connection status
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

// Update picker button
function updatePickerButton() {
  if (isPickerActive) {
    pickerBtnEl.className = 'button danger';
    pickerTextEl.textContent = 'Stop Element Picker';
  } else {
    pickerBtnEl.className = 'button';
    pickerTextEl.textContent = 'Start Element Picker';
  }
}

// Update capture count
function updateCaptureCount() {
  captureCountTextEl.textContent = `${capturedElementsCount} elements captured this session`;
}