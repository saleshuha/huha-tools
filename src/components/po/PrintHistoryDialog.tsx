import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Clock, MapPin, Package, FileText } from 'lucide-react';
import { format } from 'date-fns';

interface PrintHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: {
    po_number: string;
    title?: string;
    asin?: string;
    quantity: number;
    printed_quantity?: number;
    label_printed_at?: string;
    notes?: string;
  };
}

export function PrintHistoryDialog({ open, onOpenChange, order }: PrintHistoryDialogProps) {
  // Determine print source from notes
  const getPrintSource = () => {
    if (!order.notes) return 'Unknown';
    
    if (order.notes.includes('Received:') || order.notes.includes('Received (Qty:')) {
      return 'Stock Receiving';
    }
    
    return 'PO Tracker - Direct Print';
  };

  // Extract serial number from notes if available
  const getSerialNumber = () => {
    if (!order.notes) return null;
    
    const match = order.notes.match(/Received: ([^\s(]+)/);
    return match ? match[1] : null;
  };

  const printSource = getPrintSource();
  const serialNumber = getSerialNumber();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            Print History - {order.po_number}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Product Info */}
          <div className="p-3 bg-muted/30 rounded-lg">
            <div className="text-sm font-medium text-foreground mb-1">
              {order.title || order.asin || 'No Title'}
            </div>
            {order.asin && (
              <div className="text-xs text-muted-foreground">
                ASIN: {order.asin}
              </div>
            )}
          </div>

          {/* Print Status */}
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-green-500/5 border border-green-500/20 rounded-lg">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm font-medium">Print Status</span>
              </div>
              <Badge 
                variant="default"
                className="bg-green-500/15 text-green-700 dark:text-green-300 border-green-500/30"
              >
                {order.printed_quantity === order.quantity ? 'Fully Printed' : 'Partially Printed'}
              </Badge>
            </div>

            {/* Quantity Info */}
            <div className="flex items-center justify-between p-3 bg-muted/20 rounded-lg">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Printed Quantity</span>
              </div>
              <span className="text-sm font-semibold">
                {order.printed_quantity || 0} / {order.quantity}
              </span>
            </div>

            {/* Print Source */}
            <div className="flex items-center justify-between p-3 bg-muted/20 rounded-lg">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Printed From</span>
              </div>
              <Badge 
                variant="outline"
                className={printSource === 'Stock Receiving' 
                  ? 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30' 
                  : 'bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/30'
                }
              >
                {printSource}
              </Badge>
            </div>

            {/* Print Timestamp */}
            {order.label_printed_at && (
              <div className="flex items-center justify-between p-3 bg-muted/20 rounded-lg">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Printed At</span>
                </div>
                <span className="text-sm text-muted-foreground">
                  {format(new Date(order.label_printed_at), 'MMM dd, yyyy HH:mm')}
                </span>
              </div>
            )}

            {/* Serial Number (if from Stock Receiving) */}
            {serialNumber && (
              <div className="flex items-center justify-between p-3 bg-muted/20 rounded-lg">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Serial Number</span>
                </div>
                <span className="text-sm font-mono text-muted-foreground">
                  {serialNumber}
                </span>
              </div>
            )}

            {/* Notes */}
            {order.notes && (
              <div className="p-3 bg-muted/20 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Notes</span>
                </div>
                <p className="text-xs text-muted-foreground whitespace-pre-wrap">
                  {order.notes}
                </p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
