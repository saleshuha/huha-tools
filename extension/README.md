# Desktop Automation Companion Extension

A Chrome/Edge browser extension that works with the Desktop Automation app to provide accurate element selection and real-time data streaming capabilities.

## Features

- **Accurate Element Selection**: Capture CSS selectors and XPath from live web pages
- **Real-time Communication**: Stream captured data directly to your Desktop Automation app via Supabase
- **Secure Authentication**: Connect using your app's access token
- **Visual Feedback**: Interactive element highlighting and selection
- **Domain-Specific**: Works specifically with noon.partners websites

## Installation

### Chrome/Edge Installation

1. Download or clone the extension files to a folder on your computer
2. Open Chrome and go to `chrome://extensions/` (or `edge://extensions/` for Edge)
3. Enable "Developer mode" in the top-right corner
4. Click "Load unpacked" and select the extension folder
5. The extension icon should appear in your browser toolbar

### Firefox Installation

1. Open Firefox and go to `about:debugging`
2. Click "This Firefox"
3. Click "Load Temporary Add-on"
4. Select the `manifest.json` file from the extension folder

## Usage

### 1. Connect to Your App

1. Click the extension icon in your browser toolbar
2. Get your access token from the Desktop Automation app (Settings tab)
3. Paste the token into the extension popup and click "Connect to App"

### 2. Element Selection

1. Navigate to any noon.partners website
2. Click "Start Element Picker" in the extension popup
3. Hover over elements to see them highlighted
4. Click on elements you want to capture
5. All captured elements will appear in your Desktop Automation app

### 3. View Results

- Open your Desktop Automation app
- Go to the "Selector Picker" tab to see captured elements
- Go to the "Activity" tab to see real-time events and automation runs

## Technical Details

### Communication Flow

1. **Extension ↔ Supabase**: Real-time data sync using REST API
2. **App ↔ Supabase**: Real-time updates using Supabase subscriptions
3. **Extension ↔ App**: Indirect communication via Supabase database

### Database Tables Used

- `automation_capture_events`: Stores captured element data
- `automation_configs`: Stores saved configurations per user/site
- `automation_runs`: Tracks automation execution history

### Security

- All communication is secured with user authentication tokens
- Extension only works on whitelisted domains (noon.partners)
- No sensitive data is stored locally in the extension

## Troubleshooting

### Extension Not Working

1. Make sure you're on a noon.partners website
2. Check that the extension is enabled in your browser
3. Verify your access token is valid (try reconnecting)
4. Check browser console for error messages

### Element Picker Not Highlighting

1. Refresh the page and try again
2. Make sure the extension popup shows "Connected to App"
3. Check if the website has security restrictions
4. Try disabling other browser extensions temporarily

### Data Not Appearing in App

1. Verify you're logged in with the same account in both extension and app
2. Check your internet connection
3. Try refreshing the Desktop Automation app
4. Look for any error messages in the browser console

## Development

### File Structure

```
extension/
├── manifest.json       # Extension configuration
├── background.js       # Service worker for Chrome API handling
├── content.js         # Injected script for page monitoring
├── popup.html         # Extension popup interface
├── popup.js          # Popup logic and UI handling
└── icons/            # Extension icons (16x16, 48x48, 128x128)
```

### Key Components

- **Background Script**: Handles authentication, element capture, and Supabase communication
- **Content Script**: Monitors page events and injects element picker functionality
- **Popup**: User interface for connection and control
- **Element Picker**: Dynamic injection system for accurate element selection

## Support

For support and feature requests, please contact your system administrator or check the Desktop Automation app documentation.