import { useState, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Barcode, X, Copy, Check } from 'lucide-react';
import { useBarcodeContextOptional } from '@/contexts/BarcodeContext';
import { useProductBarcodes } from '@/hooks/useProductBarcodes';
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
  const barcodeContext = useBarcodeContextOptional();
  const { unlinkBarcode } = useProductBarcodes();
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [unlinkDialogOpen, setUnlinkDialogOpen] = useState(false);
  const [barcodeToUnlink, setBarcodeToUnlink] = useState<{ id: string; barcode: string } | null>(null);

  // Filter barcodes from context based on props
  const barcodes = useMemo(() => {
    if (!barcodeContext?.barcodes) return [];
    
    return barcodeContext.barcodes.filter(b => {
      if (poOrderId && b.po_order_id === poOrderId) return true;
      if (asin && b.asin === asin) return true;
      if (skuCode && b.sku_code === skuCode) return true;
      return false;
    });
  }, [barcodeContext?.barcodes, asin, skuCode, poOrderId]);

  const handleCopy = async (barcode: string, id: string) => {
    await navigator.clipboard.writeText(barcode);
    setCopiedId(id);
    toast.success('Barcode copied');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleUnlinkClick = (barcodeId: string, barcode: string) => {
    setBarcodeToUnlink({ id: barcodeId, barcode });
    setUnlinkDialogOpen(true);
  };

  const handleConfirmUnlink = async () => {
    if (!barcodeToUnlink) return;
    
    const success = await unlinkBarcode(barcodeToUnlink.id);
    if (success) {
      onUnlink?.(barcodeToUnlink.id);
    }
    
    setUnlinkDialogOpen(false);
    setBarcodeToUnlink(null);
  };

  if (barcodeContext?.loading || barcodes.length === 0) {
    return null;
  }

  if (barcodes.length === 1) {
    return (
      <>
        <Badge variant="secondary" className={cn("flex items-center gap-1 font-mono text-xs", className)}>
          <Barcode className="h-3 w-3" />
          {barcodes[0].barcode}
          {showUnlink && (
            <Button
              variant="ghost"
              size="icon"
              className="h-4 w-4 p-0 ml-1 text-destructive hover:text-destructive"
              onClick={(e) => {
                e.stopPropagation();
                handleUnlinkClick(barcodes[0].id, barcodes[0].barcode);
              }}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </Badge>
        
        <AlertDialog open={unlinkDialogOpen} onOpenChange={setUnlinkDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Unlink Barcode</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to unlink barcode <span className="font-mono font-bold">{barcodeToUnlink?.barcode}</span>? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleConfirmUnlink} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Unlink
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </>
    );
  }

  return (
    <>
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
                      onClick={() => handleUnlinkClick(barcode.id, barcode.barcode)}
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
      
      <AlertDialog open={unlinkDialogOpen} onOpenChange={setUnlinkDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unlink Barcode</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to unlink barcode <span className="font-mono font-bold">{barcodeToUnlink?.barcode}</span>? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmUnlink} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Unlink
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
