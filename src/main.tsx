import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { qzGlobal } from './utils/qz-global'

// Initialize QZ Tray security globally on app start
// This prevents repeated security prompts across the application
if (typeof window !== 'undefined') {
  // Wait a bit for QZ Tray script to load, then initialize
  setTimeout(() => {
    qzGlobal.initializeGlobally().catch(error => {
      console.log('QZ Tray not available at startup:', error.message);
    });
  }, 1000);
}

createRoot(document.getElementById("root")!).render(<App />);
