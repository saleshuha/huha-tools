import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Global QZ Tray initialization
declare global {
  interface Window {
    qz: any;
    qzTrusted?: boolean; // Track trust status
  }
}

// Initialize QZ Tray security globally once
function initializeQZTray() {
  // Wait for QZ Tray script to load
  const checkQZ = () => {
    if (typeof window.qz !== 'undefined') {
      console.log('🔧 Setting up global QZ Tray security...');
      
      // Set certificate promise ONCE globally
      if (!window.qz.security.getCertificatePromise()) {
        window.qz.security.setCertificatePromise(function(resolve: any, reject: any) {
          console.log('📜 QZ Certificate requested (auto-approve)');
          resolve(); // Always resolve for unsigned access
        });
      }

      // Set signature promise ONCE globally  
      if (!window.qz.security.getSignaturePromise()) {
        window.qz.security.setSignaturePromise(function(toSign: any) {
          return function(resolve: any, reject: any) {
            // Always resolve immediately without dialog
            resolve();
          };
        });
      }

      // Mark as trusted globally
      window.qzTrusted = true;

      // Import and notify the connection manager that security is set up globally
      import('./utils/qz-connection-manager.ts').then(({ qzConnectionManager }) => {
        qzConnectionManager.markSecurityInitialized();
      });

      console.log('✅ Global QZ Tray security initialized - no more trust dialogs needed');
    } else {
      // Retry if QZ script not loaded yet
      setTimeout(checkQZ, 100);
    }
  };
  
  checkQZ();
}

// Initialize QZ Tray on app startup
initializeQZTray();

createRoot(document.getElementById("root")!).render(<App />);
