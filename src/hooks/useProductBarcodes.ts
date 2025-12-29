// Re-export from BarcodeContext for backward compatibility
import { useBarcodeContext, useBarcodeContextOptional, ProductBarcode, BarcodeProvider } from '@/contexts/BarcodeContext';

export type { ProductBarcode };
export { BarcodeProvider };

// Main hook - uses the shared context
export function useProductBarcodes() {
  const context = useBarcodeContextOptional();
  
  // If we're in a BarcodeProvider, use the shared context
  if (context) {
    return context;
  }
  
  // Fallback error - should always be wrapped in BarcodeProvider
  throw new Error('useProductBarcodes must be used within a BarcodeProvider. Wrap your app with <BarcodeProvider>.');
}
