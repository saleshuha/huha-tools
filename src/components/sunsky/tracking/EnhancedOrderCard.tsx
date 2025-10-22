import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Package,
  Clock,
  Truck,
  CheckCircle,
  AlertTriangle,
  Eye
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { SegmentedProgress } from '@/components/sunsky/SegmentedProgress';
import { ItemStatusBadge } from '@/components/sunsky/ItemStatusBadge';
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
  isExpanded: boolean;
  onToggleExpand: () => void;
  onViewDetails?: () => void;
  onTrack?: () => void;
  onGetLabels?: () => void;
  isLoadingLabels?: boolean;
  labels?: any[];
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
  isExpanded,
  onToggleExpand,
  onViewDetails,
  onTrack,
  onGetLabels,
  isLoadingLabels,
  labels
}: EnhancedOrderCardProps) {
  const StatusIcon = statusIcons[String(order.status)] || Package;
  const progress = calculateOrderProgress(order.status);
  const hasItems = order.items && order.items.length > 0;

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
    <Collapsible open={isExpanded} onOpenChange={onToggleExpand}>
      <Card className="hover:shadow-lg transition-all duration-300 border-2 hover:border-primary/30 bg-gradient-to-br from-card to-card/50">
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-accent/5 transition-colors">
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

                <div className="flex items-center gap-2">
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
                  
                  {isExpanded ? (
                    <ChevronUp className="h-5 w-5 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="pt-0 space-y-4">
            {/* Order Info */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted/50 rounded-lg">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Order Number</p>
                <p className="font-mono text-sm font-semibold">{order.number}</p>
              </div>
              {order.tracking_number && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Tracking</p>
                  <p className="font-mono text-sm font-semibold">{order.tracking_number}</p>
                </div>
              )}
              <div>
                <p className="text-xs text-muted-foreground mb-1">Updated</p>
                <p className="text-sm">{formatDate(order.updated_at || order.created_at)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Total</p>
                <p className="text-sm font-semibold">{formatCurrency(order.total || 0, order.currency)}</p>
              </div>
            </div>

            {/* Items List */}
            {hasItems && (
              <div className="space-y-2">
                <h4 className="font-semibold text-sm flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Order Items ({order.items.length})
                </h4>
                <div className="space-y-2">
                  {order.items.map((item, idx) => (
                    <div
                      key={item.id || idx}
                      className="flex items-center justify-between p-3 bg-card border rounded-lg hover:bg-accent/5 transition-colors"
                    >
                      <div className="flex-1">
                        <p className="font-medium text-sm">{item.title}</p>
                        <p className="text-xs text-muted-foreground font-mono">{item.sku_code}</p>
                      </div>
                      <div className="flex items-center gap-4">
                        {item.item_status && (
                          <ItemStatusBadge status={item.item_status} />
                        )}
                        <div className="text-right">
                          <p className="text-sm font-semibold">
                            {formatCurrency(item.total || 0, order.currency)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Qty: {item.quantity || 1}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center gap-2 pt-2">
              {onViewDetails && (
                <Button variant="outline" size="sm" onClick={onViewDetails}>
                  <Eye className="h-4 w-4 mr-2" />
                  View Details
                </Button>
              )}
              
              {order.tracking_url && onTrack && (
                <Button variant="outline" size="sm" onClick={onTrack}>
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Track Package
                </Button>
              )}

              {onGetLabels && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onGetLabels}
                  disabled={isLoadingLabels}
                >
                  <Package className="h-4 w-4 mr-2" />
                  {isLoadingLabels ? 'Loading...' : labels?.length ? 'View Labels' : 'Get Labels'}
                </Button>
              )}
            </div>

            {/* Labels */}
            {labels && labels.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-semibold text-sm">Shipping Labels</h4>
                <div className="grid grid-cols-2 gap-2">
                  {labels.map((label, idx) => (
                    <Button
                      key={idx}
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(label.url || label.label_url, '_blank')}
                      className="justify-start"
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Label {idx + 1}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
