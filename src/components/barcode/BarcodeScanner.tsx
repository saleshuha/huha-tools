import { useEffect, useState, useCallback } from 'react';
import { Scanner, IDetectedBarcode } from '@yudiel/react-qr-scanner';
import { Camera, CameraOff, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface BarcodeScannerProps {
  onScan: (barcode: string, format: string) => void;
  onError?: (error: string) => void;
  className?: string;
  active?: boolean;
}

export function BarcodeScanner({ onScan, onError, className, active = true }: BarcodeScannerProps) {
  const [error, setError] = useState<string | null>(null);
  const [hasScanned, setHasScanned] = useState(false);

  // Reset scanned state when active changes
  useEffect(() => {
    if (active) {
      setHasScanned(false);
      setError(null);
    }
  }, [active]);

  const handleScan = useCallback((detectedCodes: IDetectedBarcode[]) => {
    if (hasScanned || detectedCodes.length === 0) return;
    
    const code = detectedCodes[0];
    console.log('[BarcodeScanner] Scanned:', code.rawValue, code.format);
    
    // Vibrate on scan if supported
    if (navigator.vibrate) {
      navigator.vibrate(100);
    }
    
    // Play a beep sound
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      oscillator.frequency.value = 1000;
      gainNode.gain.value = 0.1;
      oscillator.start();
      oscillator.stop(audioContext.currentTime + 0.1);
    } catch (audioErr) {
      // Ignore audio errors
    }
    
    setHasScanned(true);
    onScan(code.rawValue, code.format);
  }, [hasScanned, onScan]);

  const handleError = useCallback((err: unknown) => {
    console.error('[BarcodeScanner] Error:', err);
    const errorMessage = err instanceof Error ? err.message : 'Camera access failed';
    
    // Only set error for actual failures, not for "no barcode found" type errors
    if (errorMessage.toLowerCase().includes('permission') || 
        errorMessage.toLowerCase().includes('notallowed') ||
        errorMessage.toLowerCase().includes('not found')) {
      setError(errorMessage);
      onError?.(errorMessage);
    }
  }, [onError]);

  const handleRetry = useCallback(() => {
    setError(null);
    setHasScanned(false);
  }, []);

  if (error) {
    return (
      <div className={cn("flex flex-col items-center justify-center p-8 bg-muted rounded-lg", className)}>
        <CameraOff className="h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-sm text-muted-foreground text-center mb-4">{error}</p>
        <Button onClick={handleRetry} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </div>
    );
  }

  if (!active) {
    return (
      <div className={cn("relative", className)}>
        <div className="w-full aspect-[4/3] bg-muted rounded-lg flex items-center justify-center">
          <Camera className="h-12 w-12 text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className={cn("relative", className)}>
      {/* Scanner Container */}
      <div className="w-full aspect-[4/3] bg-black rounded-lg overflow-hidden">
        <Scanner
          onScan={handleScan}
          onError={handleError}
          formats={[
            'ean_13',
            'ean_8',
            'upc_a',
            'upc_e',
            'code_128',
            'code_39',
            'code_93',
            'codabar',
            'itf',
            'qr_code',
            'data_matrix',
          ]}
          constraints={{
            facingMode: 'environment',
          }}
          components={{
            torch: true,
            zoom: true,
            finder: true,
          }}
          styles={{
            container: {
              width: '100%',
              height: '100%',
            },
            video: {
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            },
          }}
          scanDelay={100}
        />
      </div>
      
      {/* Scanning overlay with corner markers */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-44">
          <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-primary" />
          <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-primary" />
          <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-primary" />
          <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-primary" />
        </div>
      </div>
    </div>
  );
}
