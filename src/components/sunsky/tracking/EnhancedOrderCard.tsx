import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  ExternalLink,
  Package,
  Clock,
  Truck,
  CheckCircle,
  AlertTriangle,
  Eye
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { SegmentedProgress } from '@/components/sunsky/SegmentedProgress';
import { calculateOrderProgress } from '@/utils/sunsky-progress';

interface OrderItem {
  id: string;
  sku_code: string;
  title: string;
  item_status?: string;
  quantity?: number;
  unit_price?: number;
  total?: number;
}

interface SunskyOrder {
  id: string;
  number: string;
  status: string | number;
  total?: number;
  currency?: string;
  tracking_number?: string;
  tracking_url?: string;
  gmt_created?: string;
  created_at: string;
  updated_at?: string;
  items?: OrderItem[];
}

interface EnhancedOrderCardProps {
  order: SunskyOrder;
  onViewDetails: () => void;
  onTrack?: () => void;
  productImages?: Map<string, string[]>;
}

const statusIcons: Record<string, any> = {
  '0': AlertTriangle,
  '1': Package,
  '4': CheckCircle,
  '5': Truck,
  '6': CheckCircle,
  unpaid: AlertTriangle,
  ordered: Package,
  paid: CheckCircle,
  shipped: Truck,
  delivered: CheckCircle,
};

const getReadableStatus = (status: string | number): string => {
  const statusStr = String(status);
  switch (statusStr) {
    case '0': return 'Unpaid';
    case '1': return 'Ordered';
    case '4': return 'Paid';
    case '5': return 'Shipped';
    case '6': return 'Delivered';
    default: return statusStr;
  }
};

export function EnhancedOrderCard({
  order,
  onViewDetails,
  onTrack,
  productImages
}: EnhancedOrderCardProps) {
  const StatusIcon = statusIcons[String(order.status)] || Package;
  const progress = calculateOrderProgress(order.status);
  const hasItems = order.items && order.items.length > 0;
  
  // Get first 3 item images for thumbnails
  const thumbnails = order.items?.slice(0, 3).map(item => 
    productImages?.get(item.sku_code)?.[0]
  ).filter(Boolean) || [];

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount);
  };

  return (
    <Card className="hover:shadow-lg transition-all duration-300 border-2 hover:border-primary/30 bg-gradient-to-br from-card to-card/50 cursor-pointer"
      onClick={onViewDetails}>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-3 flex-wrap">
              <div className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center",
                progress.statusColor === 'bg-green-500' && 'bg-green-500/10',
                progress.statusColor === 'bg-blue-500' && 'bg-blue-500/10',
                progress.statusColor === 'bg-purple-500' && 'bg-purple-500/10',
                progress.statusColor === 'bg-orange-500' && 'bg-orange-500/10'
              )}>
                <StatusIcon className={cn(
                  "h-5 w-5",
                  progress.statusColor === 'bg-green-500' && 'text-green-600',
                  progress.statusColor === 'bg-blue-500' && 'text-blue-600',
                  progress.statusColor === 'bg-purple-500' && 'text-purple-600',
                  progress.statusColor === 'bg-orange-500' && 'text-orange-600'
                )} />
              </div>
              
              <div>
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  {order.number}
                  <Badge variant="outline" className="text-xs">
                    {getReadableStatus(order.status)}
                  </Badge>
                </h3>
                <p className="text-sm text-muted-foreground">
                  Created: {formatDate(order.gmt_created || order.created_at)}
                </p>
              </div>
            </div>

            <SegmentedProgress
              currentStep={progress.currentStep}
              totalSteps={progress.totalSteps}
              percentage={progress.percentage}
              statusLabel={progress.statusLabel}
              statusColor={progress.statusColor}
              className="mt-2"
            />
            
            {/* Product Thumbnails */}
            {thumbnails.length > 0 && (
              <div className="flex gap-2 mt-3">
                {thumbnails.map((url, idx) => (
                  <img
                    key={idx}
                    src={url}
                    alt={`Product ${idx + 1}`}
                    className="w-12 h-12 object-cover rounded border border-border"
                    onClick={(e) => e.stopPropagation()}
                  />
                ))}
                {hasItems && order.items!.length > 3 && (
                  <div className="w-12 h-12 rounded border border-border bg-muted flex items-center justify-center text-xs text-muted-foreground">
                    +{order.items!.length - 3}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex flex-col items-end gap-2">
            <div className="text-right">
              <div className="text-2xl font-bold text-primary">
                {formatCurrency(order.total || 0, order.currency)}
              </div>
              {hasItems && (
                <div className="text-xs text-muted-foreground">
                  {order.items.length} item{order.items.length !== 1 ? 's' : ''}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
              {order.tracking_url && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onTrack?.();
                  }}
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              )}
              
              <Button variant="outline" size="sm" onClick={onViewDetails}>
                <Eye className="h-4 w-4 mr-2" />
                View Details
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>
    </Card>
  );
}
