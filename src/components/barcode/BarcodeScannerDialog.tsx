import { useState, useCallback, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { BarcodeScanner } from './BarcodeScanner';
import { Camera, Keyboard, Check, Loader2, Barcode } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BarcodeScannerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onBarcodeScanned: (barcode: string, format: string) => void;
  title?: string;
  productInfo?: {
    title?: string;
    asin?: string;
    sku?: string;
  };
  isLinking?: boolean;
}

export function BarcodeScannerDialog({
  open,
  onOpenChange,
  onBarcodeScanned,
  title = 'Scan Barcode',
  productInfo,
  isLinking = false,
}: BarcodeScannerDialogProps) {
  const [activeTab, setActiveTab] = useState<'camera' | 'manual'>('camera');
  const [manualBarcode, setManualBarcode] = useState('');
  const [scannedBarcode, setScannedBarcode] = useState<{ code: string; format: string } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setScannedBarcode(null);
      setManualBarcode('');
    }
  }, [open]);

  // Focus input when switching to manual mode
  useEffect(() => {
    if (activeTab === 'manual' && inputRef.current) {
      inputRef.current.focus();
    }
  }, [activeTab]);

  const handleScan = useCallback((barcode: string, format: string) => {
    setScannedBarcode({ code: barcode, format });
  }, []);

  const handleConfirm = useCallback(() => {
    if (scannedBarcode) {
      onBarcodeScanned(scannedBarcode.code, scannedBarcode.format);
      onOpenChange(false);
    }
  }, [scannedBarcode, onBarcodeScanned, onOpenChange]);

  const handleManualSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (manualBarcode.trim()) {
      onBarcodeScanned(manualBarcode.trim(), 'manual');
      onOpenChange(false);
    }
  }, [manualBarcode, onBarcodeScanned, onOpenChange]);

  // Handle hardware scanner input (keyboard mode)
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && manualBarcode.trim()) {
      e.preventDefault();
      onBarcodeScanned(manualBarcode.trim(), 'hardware_scanner');
      onOpenChange(false);
    }
  }, [manualBarcode, onBarcodeScanned, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Barcode className="h-5 w-5" />
            {title}
          </DialogTitle>
          {productInfo && (
            <DialogDescription className="space-y-1">
              <p className="font-medium text-foreground line-clamp-1">{productInfo.title}</p>
              <div className="flex gap-2 text-xs">
                {productInfo.asin && <span>ASIN: {productInfo.asin}</span>}
                {productInfo.sku && <span>SKU: {productInfo.sku}</span>}
              </div>
            </DialogDescription>
          )}
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'camera' | 'manual')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="camera" className="flex items-center gap-2">
              <Camera className="h-4 w-4" />
              Camera
            </TabsTrigger>
            <TabsTrigger value="manual" className="flex items-center gap-2">
              <Keyboard className="h-4 w-4" />
              Manual
            </TabsTrigger>
          </TabsList>

          <TabsContent value="camera" className="space-y-4">
            <BarcodeScanner 
              onScan={handleScan} 
              active={open && activeTab === 'camera'}
              className="mt-4"
            />
            
            {scannedBarcode && (
              <div className="p-4 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg space-y-3">
                <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
                  <Check className="h-5 w-5" />
                  <span className="font-medium">Barcode Detected!</span>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-mono text-lg font-semibold">{scannedBarcode.code}</p>
                    <Badge variant="outline" className="mt-1">{scannedBarcode.format}</Badge>
                  </div>
                </div>
                <Button 
                  onClick={handleConfirm} 
                  className="w-full"
                  disabled={isLinking}
                >
                  {isLinking ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Linking...
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      Link This Barcode
                    </>
                  )}
                </Button>
              </div>
            )}

            {!scannedBarcode && (
              <p className="text-sm text-muted-foreground text-center">
                Point your camera at the product barcode
              </p>
            )}
          </TabsContent>

          <TabsContent value="manual" className="space-y-4">
            <form onSubmit={handleManualSubmit} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="barcode-input">Enter Barcode</Label>
                <Input
                  id="barcode-input"
                  ref={inputRef}
                  value={manualBarcode}
                  onChange={(e) => setManualBarcode(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Scan with hardware scanner or type barcode..."
                  className="font-mono text-lg"
                  autoComplete="off"
                  autoFocus
                />
                <p className="text-xs text-muted-foreground">
                  Use a handheld scanner or type the barcode manually
                </p>
              </div>
              
              <Button 
                type="submit" 
                className="w-full"
                disabled={!manualBarcode.trim() || isLinking}
              >
                {isLinking ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Linking...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Link Barcode
                  </>
                )}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
