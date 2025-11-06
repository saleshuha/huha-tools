import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  TrendingUp, TrendingDown, ArrowUpDown, Calendar, User, 
  FileText, ChevronDown, ChevronUp, Package, DollarSign,
  MapPin, Tag, CheckCircle, AlertCircle, Undo2
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';

export interface StockChange {
  id: string;
  created_at: string;
  previous_quantity: number;
  new_quantity: number;
  change_amount: number;
  change_reason: string;
  reference_type?: string;
  reference_id?: string;
  reference_number?: string;
  changed_by?: string;
  fulfillment_source?: string;
  batch_id?: string;
  notes?: string;
  metadata?: any;
  asin?: string;
  sku_number?: string;
  serial_number?: string;
  user_email?: string;
  user_name?: string;
  cost_per_unit?: number;
  total_value?: number;
  warehouse_location?: string;
  tags?: string[];
  approval_status?: string;
  is_reverted?: boolean;
  reverted_at?: string;
}

interface StockHistoryChangeCardProps {
  change: StockChange;
  isExpanded: boolean;
  onToggleExpanded: () => void;
  onRevert?: (changeId: string) => void;
}

const REFERENCE_TYPE_LABELS: Record<string, { label: string; color: string; icon: string }> = {
  po_order: { label: 'PO Fulfillment', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400', icon: '📦' },
  manual: { label: 'Manual Adjustment', color: 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400', icon: '✏️' },
  sale: { label: 'Sale', color: 'bg-rose-100 text-rose-800 dark:bg-rose-900/20 dark:text-rose-400', icon: '💰' },
  restock: { label: 'Restock', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-400', icon: '📥' },
  return: { label: 'Return', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400', icon: '↩️' },
  damage: { label: 'Damage', color: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400', icon: '⚠️' },
  adjustment: { label: 'Adjustment', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400', icon: '⚙️' },
};

export function StockHistoryChangeCard({ 
  change, 
  isExpanded, 
  onToggleExpanded,
  onRevert 
}: StockHistoryChangeCardProps) {
  const refTypeInfo = REFERENCE_TYPE_LABELS[change.reference_type || ''] || REFERENCE_TYPE_LABELS.manual;
  
  const getActivityDescription = () => {
    if (change.change_amount > 0) {
      return `INCREASED stock by ${Math.abs(change.change_amount)} units`;
    } else if (change.change_amount < 0) {
      return `DECREASED stock by ${Math.abs(change.change_amount)} units`;
    }
    return 'Stock quantity unchanged';
  };

  const getChangeIcon = () => {
    if (change.change_amount > 0) return <TrendingUp className="w-6 h-6 text-emerald-600" />;
    if (change.change_amount < 0) return <TrendingDown className="w-6 h-6 text-rose-600" />;
    return <ArrowUpDown className="w-6 h-6 text-muted-foreground" />;
  };

  const hasDetails = change.fulfillment_source || 
                     change.notes || 
                     change.metadata || 
                     change.cost_per_unit ||
                     change.warehouse_location ||
                     change.tags?.length;

  const percentageChange = change.previous_quantity > 0 
    ? ((change.change_amount / change.previous_quantity) * 100).toFixed(1)
    : null;

  return (
    <Card className={`hover:shadow-lg transition-all border-l-4 ${
      change.change_amount > 0 
        ? 'border-l-emerald-500' 
        : change.change_amount < 0 
        ? 'border-l-rose-500' 
        : 'border-l-muted'
    } ${change.is_reverted ? 'opacity-60 border-dashed' : ''}`}>
      <CardContent className="p-4">
        {/* Time and User Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <div>
              <div className="text-xs font-medium text-foreground">
                {formatDistanceToNow(new Date(change.created_at), { addSuffix: true })}
              </div>
              <div className="text-xs text-muted-foreground">
                {format(new Date(change.created_at), 'MMM dd, yyyy • HH:mm')}
              </div>
            </div>
          </div>
          
          {change.is_reverted && (
            <Badge variant="destructive" className="gap-1">
              <Undo2 className="w-3 h-3" />
              Reverted
            </Badge>
          )}
        </div>

        {(change.user_email || change.user_name) && (
          <div className="flex items-center gap-2 mb-2">
            <User className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium">
              {change.user_name || change.user_email}
            </span>
          </div>
        )}

        {/* Activity Description */}
        <div className="flex items-start gap-3 mb-3">
          <div className="shrink-0 mt-1">
            {getChangeIcon()}
          </div>
          <div className="flex-1">
            <div className="text-base font-semibold mb-2 text-foreground">
              {getActivityDescription()}
            </div>
            
            {/* Quantity Flow */}
            <div className="flex items-center gap-2 text-sm mb-2">
              <span className="font-bold text-lg text-muted-foreground">
                {change.previous_quantity}
              </span>
              <span className="text-muted-foreground">→</span>
              <span className="font-bold text-lg text-foreground">
                {change.new_quantity}
              </span>
              {percentageChange && (
                <span className={`text-sm font-medium ${
                  change.change_amount > 0 ? 'text-emerald-600' : 'text-rose-600'
                }`}>
                  ({change.change_amount > 0 ? '+' : ''}{percentageChange}%)
                </span>
              )}
            </div>

            {/* Reference Info */}
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${refTypeInfo.color}`}>
                <span className="text-base">{refTypeInfo.icon}</span>
                {refTypeInfo.label}
                {change.reference_number && (
                  <span className="font-mono">• {change.reference_number}</span>
                )}
              </span>
              
              {change.approval_status && change.approval_status !== 'approved' && (
                <Badge variant="secondary" className="gap-1">
                  {change.approval_status === 'pending' && <AlertCircle className="w-3 h-3" />}
                  {change.approval_status === 'approved' && <CheckCircle className="w-3 h-3" />}
                  {change.approval_status}
                </Badge>
              )}
            </div>

            {/* Reason */}
            <div className="flex items-start gap-2 text-sm text-muted-foreground">
              <FileText className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{change.change_reason}</span>
            </div>
          </div>
        </div>

        {/* Quick Info Badges */}
        {(change.cost_per_unit || change.warehouse_location || change.tags?.length) && (
          <div className="flex flex-wrap gap-1.5 mb-2 pl-8">
            {change.cost_per_unit && (
              <Badge variant="outline" className="gap-1">
                <DollarSign className="w-3 h-3" />
                ${change.cost_per_unit} per unit
              </Badge>
            )}
            {change.warehouse_location && (
              <Badge variant="outline" className="gap-1">
                <MapPin className="w-3 h-3" />
                {change.warehouse_location}
              </Badge>
            )}
            {change.tags?.map(tag => (
              <Badge key={tag} variant="secondary" className="gap-1">
                <Tag className="w-3 h-3" />
                {tag}
              </Badge>
            ))}
          </div>
        )}

        {/* Expandable Details */}
        {hasDetails && (
          <Collapsible open={isExpanded} onOpenChange={onToggleExpanded}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="w-full mt-2">
                {isExpanded ? <ChevronUp className="w-4 h-4 mr-2" /> : <ChevronDown className="w-4 h-4 mr-2" />}
                {isExpanded ? 'Hide Details' : 'Show Details'}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-3 pt-3 border-t pl-10">
              <div className="space-y-3">
                {change.fulfillment_source && (
                  <div className="flex gap-3">
                    <Package className="w-5 h-5 text-muted-foreground shrink-0" />
                    <div className="flex-1">
                      <span className="text-sm text-muted-foreground">Source:</span>
                      <div className="font-medium">{change.fulfillment_source}</div>
                    </div>
                  </div>
                )}
                
                {change.notes && (
                  <div className="flex gap-3">
                    <FileText className="w-5 h-5 text-muted-foreground shrink-0" />
                    <div className="flex-1">
                      <span className="text-sm text-muted-foreground">Notes:</span>
                      <div className="text-sm mt-1">{change.notes}</div>
                    </div>
                  </div>
                )}
                
                {change.total_value && (
                  <div className="flex gap-3">
                    <DollarSign className="w-5 h-5 text-muted-foreground shrink-0" />
                    <div className="flex-1">
                      <span className="text-sm text-muted-foreground">Total Value:</span>
                      <div className="font-semibold text-lg">${change.total_value.toFixed(2)}</div>
                    </div>
                  </div>
                )}
                
                {change.metadata && Object.keys(change.metadata).length > 0 && (
                  <div className="bg-muted/50 rounded-md p-3 mt-2">
                    <div className="text-sm font-medium text-muted-foreground mb-2">Additional Data:</div>
                    <pre className="text-xs overflow-auto max-h-32">
                      {JSON.stringify(change.metadata, null, 2)}
                    </pre>
                  </div>
                )}
                
                {onRevert && !change.is_reverted && change.change_amount !== 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onRevert(change.id)}
                    className="w-full mt-2 gap-2"
                  >
                    <Undo2 className="w-4 h-4" />
                    Revert This Change
                  </Button>
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}
      </CardContent>
    </Card>
  );
}
