import { CheckCircle2, XCircle, Printer, Package, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { ImagePreview } from './ImagePreview';
import { FulfillmentSourceBadge } from '@/components/po/FulfillmentSourceBadge';

interface HistoryItemCardProps {
  item: {
    id: string;
    success: boolean;
    asin?: string;
    sku_code?: string;
    model_number?: string;
    title?: string;
    quantity: number;
    serial_number?: string;
    destination_type: string;
    destination_details?: {
      po_numbers?: string[];
      priorities?: number[];
      group_names?: string[];
      group_ids?: string[];
      inventory_added?: number;
      fulfillment_source?: string;
    };
    printed: boolean;
    created_at: string;
    error_message?: string;
    image_url?: string;
  };
  type: 'po' | 'inventory';
  onReprint?: (id: string) => void;
}

export function HistoryItemCard({ item, type, onReprint }: HistoryItemCardProps) {
  const navigate = useNavigate();
  
  const identifier = item.asin || item.sku_code || item.model_number || 'Unknown';
  const poNumbers = item.destination_details?.po_numbers || [];

  const fulfillmentSource = item.destination_details?.fulfillment_source;

  return (
    <div
      className={`p-4 rounded-lg border transition-all ${
        item.success
          ? 'bg-success/5 border-success/20'
          : 'bg-destructive/5 border-destructive/20'
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Status Icon */}
        <div className="flex-shrink-0 mt-1">
          {item.success ? (
            <CheckCircle2 className="w-5 h-5 text-success" />
          ) : (
            <XCircle className="w-5 h-5 text-destructive" />
          )}
        </div>

        {/* Product Image */}
        <ImagePreview 
          imageUrl={item.image_url}
          alt={item.title || identifier}
          size="md"
          className="shrink-0"
        />

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Primary identifier - large and bold */}
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="font-bold text-foreground text-base">
              {identifier}
            </span>
            {item.sku_code && item.asin && (
              <span className="text-xs text-muted-foreground">
                • {item.sku_code}
              </span>
            )}
          </div>

          {/* Title */}
          {item.title && (
            <div className="text-sm text-muted-foreground truncate mb-2">
              {item.title}
            </div>
          )}

          {/* Destination & Details */}
          <div className="flex items-center gap-2 flex-wrap mb-2">
            {type === 'po' ? (
              <>
                {poNumbers.map((poNumber, index) => (
                  <div key={poNumber} className="flex items-center gap-1 flex-wrap">
                    <Badge
                      variant="secondary"
                      className="cursor-pointer hover:bg-primary/20 text-xs"
                      onClick={() => navigate(`/po-tracker?search=${poNumber}`)}
                    >
                      PO: {poNumber}
                    </Badge>
                    {item.destination_details?.priorities?.[index] && (
                      <Badge variant="outline" className="text-xs">
                        Priority {item.destination_details.priorities[index]}
                      </Badge>
                    )}
                  </div>
                ))}
                {item.destination_details?.group_names?.[0] && (
                  <Badge variant="secondary" className="text-xs gap-1">
                    <Package className="w-3 h-3" />
                    Group: {item.destination_details.group_names[0]}
                  </Badge>
                )}
                {fulfillmentSource && (
                  <FulfillmentSourceBadge source={fulfillmentSource} className="text-xs" />
                )}
              </>
            ) : (
              <Badge variant="outline" className="text-xs">
                → Inventory
              </Badge>
            )}

            <span className="flex items-center gap-1 text-sm text-muted-foreground">
              <Package className="w-3.5 h-3.5" />
              {item.quantity} {item.quantity === 1 ? 'unit' : 'units'}
            </span>
          </div>

          {/* Serial Number */}
          {item.serial_number && (
            <div className="text-xs text-muted-foreground mb-2">
              📦 S/N: <span className="font-mono">{item.serial_number}</span>
            </div>
          )}

          {/* Error message */}
          {item.error_message && (
            <div className="text-sm text-destructive mt-2">
              {item.error_message}
            </div>
          )}

          {/* Timestamp & Print Status */}
          <div className="flex items-center gap-3 mt-2">
            <span 
              className="flex items-center gap-1 text-xs text-muted-foreground"
              title={formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
            >
              <Clock className="w-3 h-3" />
              {new Date(item.created_at).toLocaleString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
              })}
            </span>
            {item.printed && (
              <span className="flex items-center gap-1 text-xs text-success">
                <Printer className="w-3 h-3" />
                Printed
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        {item.success && onReprint && (
          <div className="flex-shrink-0">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onReprint(item.id)}
              title="Reprint label"
              className="h-8 w-8 p-0"
            >
              <Printer className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
