import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Global QZ Tray initialization
declare global {
  interface Window {
    qz: any;
    qzSecurityInitialized?: boolean; // Track if security is initialized
  }
}

// Initialize QZ Tray security globally once
function initializeQZTray() {
  console.log('🚀 Starting QZ Tray initialization...');
  
  // Wait for QZ Tray script to load
  const checkQZ = () => {
    console.log('🔍 Checking for QZ Tray script...');
    
    if (typeof window.qz !== 'undefined') {
      console.log('✅ QZ Tray script found!');
      
      // Check if already initialized to prevent duplicate setup
      if (window.qzSecurityInitialized) {
        console.log('🔧 QZ Tray security already initialized, skipping...');
        return;
      }

      console.log('🔧 Setting up global QZ Tray security...');
      
      try {
        // Set certificate promise ONCE globally - simple auto-approve
        window.qz.security.setCertificatePromise(function(resolve: any, reject: any) {
          console.log('📜 Global QZ Certificate request (auto-approving to prevent dialogs)');
          resolve(); // Always auto-approve to prevent excessive signing requests
        });

        // Set signature promise ONCE globally - simple auto-approve 
        window.qz.security.setSignaturePromise(function(toSign: any) {
          return function(resolve: any, reject: any) {
            console.log('✍️ Global QZ Signature request (auto-approving to prevent dialogs)');
            resolve(); // Always auto-approve to prevent excessive signing requests
          };
        });

        // Mark as initialized globally - prevents other code from overriding this setup
        window.qzSecurityInitialized = true;

        // Import and notify the connection manager that security is set up globally
        import('./utils/qz-connection-manager.ts').then(({ qzConnectionManager }) => {
          qzConnectionManager.markSecurityInitialized();
        });

        console.log('✅ Global QZ Tray security initialized with auto-approve - no signing dialogs needed');
      } catch (error) {
        console.error('❌ Failed to initialize QZ Tray security:', error);
      }
    } else {
      console.log('⏳ QZ Tray script not loaded yet, retrying...');
      // Retry if QZ script not loaded yet
      setTimeout(checkQZ, 100);
    }
  };
  
  checkQZ();
}

// Initialize QZ Tray on app startup
initializeQZTray();

createRoot(document.getElementById("root")!).render(<App />);
