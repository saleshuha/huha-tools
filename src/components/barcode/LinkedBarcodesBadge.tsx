import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Barcode, X, Copy, Check } from 'lucide-react';
import { useProductBarcodes, ProductBarcode } from '@/hooks/useProductBarcodes';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface LinkedBarcodesBadgeProps {
  asin?: string;
  skuCode?: string;
  poOrderId?: string;
  className?: string;
  onUnlink?: (barcodeId: string) => void;
  showUnlink?: boolean;
}

export function LinkedBarcodesBadge({
  asin,
  skuCode,
  poOrderId,
  className,
  onUnlink,
  showUnlink = false,
}: LinkedBarcodesBadgeProps) {
  const { fetchBarcodesForProduct, unlinkBarcode } = useProductBarcodes();
  const [barcodes, setBarcodes] = useState<ProductBarcode[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    const loadBarcodes = async () => {
      setLoading(true);
      const data = await fetchBarcodesForProduct({ asin, skuCode, poOrderId });
      setBarcodes(data);
      setLoading(false);
    };

    if (asin || skuCode || poOrderId) {
      loadBarcodes();
    } else {
      setBarcodes([]);
      setLoading(false);
    }
  }, [asin, skuCode, poOrderId, fetchBarcodesForProduct]);

  const handleCopy = async (barcode: string, id: string) => {
    await navigator.clipboard.writeText(barcode);
    setCopiedId(id);
    toast.success('Barcode copied');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleUnlink = async (barcodeId: string) => {
    const success = await unlinkBarcode(barcodeId);
    if (success) {
      setBarcodes(prev => prev.filter(b => b.id !== barcodeId));
      onUnlink?.(barcodeId);
    }
  };

  if (loading || barcodes.length === 0) {
    return null;
  }

  if (barcodes.length === 1) {
    return (
      <Badge variant="secondary" className={cn("flex items-center gap-1 font-mono text-xs", className)}>
        <Barcode className="h-3 w-3" />
        {barcodes[0].barcode}
      </Badge>
    );
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Badge 
          variant="secondary" 
          className={cn("cursor-pointer hover:bg-secondary/80 flex items-center gap-1", className)}
        >
          <Barcode className="h-3 w-3" />
          {barcodes.length} barcodes
        </Badge>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-2" align="start">
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground mb-2">Linked Barcodes</p>
          {barcodes.map((barcode) => (
            <div 
              key={barcode.id}
              className="flex items-center justify-between p-2 rounded bg-muted/50 text-sm"
            >
              <span className="font-mono text-xs truncate flex-1">{barcode.barcode}</span>
              <div className="flex items-center gap-1 ml-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => handleCopy(barcode.barcode, barcode.id)}
                >
                  {copiedId === barcode.id ? (
                    <Check className="h-3 w-3 text-green-500" />
                  ) : (
                    <Copy className="h-3 w-3" />
                  )}
                </Button>
                {showUnlink && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-destructive hover:text-destructive"
                    onClick={() => handleUnlink(barcode.id)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
