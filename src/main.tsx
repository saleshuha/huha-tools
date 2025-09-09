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
      
      // Set up security promises globally - avoid repeated trust dialogs
      window.qz.security.setCertificatePromise(function(resolve: any, reject: any) {
        console.log('📜 QZ Certificate requested (unsigned mode)');
        resolve(); // Always resolve for unsigned access
      });

      window.qz.security.setSignaturePromise(function(toSign: any) {
        return function(resolve: any, reject: any) {
          // Always resolve immediately for unsigned access - no logging to reduce noise
          resolve();
        };
      });

      // Import and notify the connection manager that security is set up globally
      import('./utils/qz-connection-manager.ts').then(({ qzConnectionManager }) => {
        qzConnectionManager.markSecurityInitialized();
      });

      console.log('✅ Global QZ Tray security initialized');
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
