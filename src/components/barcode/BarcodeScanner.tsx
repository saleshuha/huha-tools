import { useEffect, useRef, useState, useCallback } from 'react';
import { Html5Qrcode, Html5QrcodeScannerState, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { Camera, CameraOff, FlashlightOff, Flashlight, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface BarcodeScannerProps {
  onScan: (barcode: string, format: string) => void;
  onError?: (error: string) => void;
  className?: string;
  active?: boolean;
}

// Supported barcode formats for better detection
const SUPPORTED_FORMATS = [
  Html5QrcodeSupportedFormats.EAN_13,
  Html5QrcodeSupportedFormats.EAN_8,
  Html5QrcodeSupportedFormats.UPC_A,
  Html5QrcodeSupportedFormats.UPC_E,
  Html5QrcodeSupportedFormats.CODE_128,
  Html5QrcodeSupportedFormats.CODE_39,
  Html5QrcodeSupportedFormats.CODE_93,
  Html5QrcodeSupportedFormats.CODABAR,
  Html5QrcodeSupportedFormats.ITF,
  Html5QrcodeSupportedFormats.QR_CODE,
  Html5QrcodeSupportedFormats.DATA_MATRIX,
];

export function BarcodeScanner({ onScan, onError, className, active = true }: BarcodeScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [hasFlash, setHasFlash] = useState(false);
  const [flashOn, setFlashOn] = useState(false);
  const [cameras, setCameras] = useState<{ id: string; label: string }[]>([]);
  const [currentCameraIndex, setCurrentCameraIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const stopScanner = useCallback(async () => {
    if (scannerRef.current) {
      try {
        const state = scannerRef.current.getState();
        if (state === Html5QrcodeScannerState.SCANNING) {
          await scannerRef.current.stop();
        }
      } catch (err) {
        console.error('Error stopping scanner:', err);
      }
    }
    setIsScanning(false);
  }, []);

  const startScanner = useCallback(async () => {
    if (!containerRef.current || !active) return;

    try {
      // Get available cameras
      const devices = await Html5Qrcode.getCameras();
      if (devices.length === 0) {
        setError('No cameras found');
        onError?.('No cameras found');
        return;
      }
      
      setCameras(devices);
      console.log('[BarcodeScanner] Available cameras:', devices);
      
      // Prefer back camera
      let cameraIndex = devices.findIndex(d => 
        d.label.toLowerCase().includes('back') || 
        d.label.toLowerCase().includes('rear') ||
        d.label.toLowerCase().includes('environment')
      );
      if (cameraIndex === -1) cameraIndex = 0;
      setCurrentCameraIndex(cameraIndex);

      // Initialize scanner with supported formats (disable experimental BarcodeDetector)
      if (!scannerRef.current) {
        scannerRef.current = new Html5Qrcode('barcode-scanner-container', {
          formatsToSupport: SUPPORTED_FORMATS,
          experimentalFeatures: {
            useBarCodeDetectorIfSupported: false // Disable native API - more reliable with WASM
          },
          verbose: false
        });
      }

      console.log('[BarcodeScanner] Starting scanner with camera:', devices[cameraIndex].label);

      await scannerRef.current.start(
        devices[cameraIndex].id,
        {
          fps: 5, // Lower FPS for better processing on mobile
          qrbox: { width: 280, height: 180 }, // Larger scanning area
          aspectRatio: 1.5,
        },
        (decodedText, decodedResult) => {
          console.log('[BarcodeScanner] Scanned:', decodedText, decodedResult.result.format?.formatName);
          
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
          
          onScan(decodedText, decodedResult.result.format?.formatName || 'unknown');
        },
        (errorMessage) => {
          // Ignore scanning errors - they're expected when no code is in view
        }
      );

      setIsScanning(true);
      setError(null);

      // Apply iOS Safari workaround - reset video constraints to trigger proper focus
      try {
        const capabilities = scannerRef.current.getRunningTrackCameraCapabilities?.();
        if (capabilities) {
          console.log('[BarcodeScanner] Camera capabilities:', capabilities);
          
          // Apply optimized video constraints for mobile
          const videoConstraints: MediaTrackConstraints = {
            width: { ideal: 1280 },
            height: { ideal: 720 },
          };
          
          await scannerRef.current.applyVideoConstraints(videoConstraints);
          console.log('[BarcodeScanner] Applied video constraints');
        }
      } catch (constraintErr) {
        console.log('[BarcodeScanner] Could not apply video constraints:', constraintErr);
      }

      // Check for flash capability
      try {
        const capabilities = (scannerRef.current as any).getRunningTrackCameraCapabilities?.();
        if (capabilities?.torchFeature?.isSupported?.()) {
          setHasFlash(true);
        }
      } catch {
        setHasFlash(false);
      }

    } catch (err: any) {
      console.error('[BarcodeScanner] Error starting scanner:', err);
      setError(err.message || 'Failed to start camera');
      onError?.(err.message || 'Failed to start camera');
    }
  }, [active, onScan, onError]);

  const toggleFlash = useCallback(async () => {
    if (!scannerRef.current || !hasFlash) return;
    
    try {
      const capabilities = await (scannerRef.current as any).getRunningTrackCameraCapabilities?.();
      if (capabilities?.torchFeature) {
        if (flashOn) {
          await capabilities.torchFeature.disable();
        } else {
          await capabilities.torchFeature.enable();
        }
        setFlashOn(!flashOn);
      }
    } catch (err) {
      console.error('Error toggling flash:', err);
    }
  }, [hasFlash, flashOn]);

  const switchCamera = useCallback(async () => {
    if (cameras.length <= 1) return;
    
    await stopScanner();
    const nextIndex = (currentCameraIndex + 1) % cameras.length;
    setCurrentCameraIndex(nextIndex);
    
    // Clear the scanner ref to reinitialize with new settings
    scannerRef.current = null;
    
    // Restart with new camera
    setTimeout(startScanner, 200);
  }, [cameras, currentCameraIndex, stopScanner, startScanner]);

  useEffect(() => {
    if (active) {
      startScanner();
    } else {
      stopScanner();
    }

    return () => {
      stopScanner();
    };
  }, [active, startScanner, stopScanner]);

  if (error) {
    return (
      <div className={cn("flex flex-col items-center justify-center p-8 bg-muted rounded-lg", className)}>
        <CameraOff className="h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-sm text-muted-foreground text-center mb-4">{error}</p>
        <Button onClick={startScanner} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className={cn("relative", className)}>
      {/* Scanner Container */}
      <div 
        id="barcode-scanner-container" 
        ref={containerRef}
        className="w-full aspect-[4/3] bg-black rounded-lg overflow-hidden"
      />
      
      {/* Scanning overlay animation */}
      {isScanning && (
        <div className="absolute inset-0 pointer-events-none">
          {/* Scan line animation */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-44 border-2 border-primary/50 rounded-lg">
            <div className="absolute inset-x-0 h-0.5 bg-primary animate-scan-line" />
          </div>
          
          {/* Corner markers */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-44">
            <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-primary" />
            <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-primary" />
            <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-primary" />
            <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-primary" />
          </div>
        </div>
      )}
      
      {/* Controls */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
        {hasFlash && (
          <Button 
            variant="secondary" 
            size="icon" 
            onClick={toggleFlash}
            className="rounded-full bg-background/80 backdrop-blur-sm"
          >
            {flashOn ? <Flashlight className="h-4 w-4" /> : <FlashlightOff className="h-4 w-4" />}
          </Button>
        )}
        {cameras.length > 1 && (
          <Button 
            variant="secondary" 
            size="icon" 
            onClick={switchCamera}
            className="rounded-full bg-background/80 backdrop-blur-sm"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        )}
      </div>

      {!isScanning && !error && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted rounded-lg">
          <Camera className="h-12 w-12 text-muted-foreground animate-pulse" />
        </div>
      )}
    </div>
  );
}
