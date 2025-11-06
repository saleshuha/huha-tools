import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  TrendingUp, TrendingDown, ArrowUpDown, Calendar, User, 
  FileText, ChevronDown, ChevronUp, Package, DollarSign,
  MapPin, Tag, CheckCircle, AlertCircle, Undo2
} from 'lucide-react';
import { format } from 'date-fns';

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
  
  const getChangeIcon = () => {
    if (change.change_amount > 0) return <TrendingUp className="w-4 h-4 text-emerald-600" />;
    if (change.change_amount < 0) return <TrendingDown className="w-4 h-4 text-rose-600" />;
    return <ArrowUpDown className="w-4 h-4 text-muted-foreground" />;
  };

  const hasDetails = change.fulfillment_source || 
                     change.notes || 
                     change.metadata || 
                     change.cost_per_unit ||
                     change.warehouse_location ||
                     change.tags?.length;

  return (
    <Card className={`hover:shadow-md transition-all ${
      change.is_reverted ? 'opacity-60 border-dashed' : ''
    }`}>
      <CardContent className="p-3">
        {/* Header Row */}
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-start gap-2 flex-1 min-w-0">
            {getChangeIcon()}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${refTypeInfo.color}`}>
                  <span>{refTypeInfo.icon}</span>
                  {refTypeInfo.label}
                </span>
                
                {change.reference_number && (
                  <Badge variant="outline" className="text-xs font-mono">
                    {change.reference_number}
                  </Badge>
                )}
                
                {change.approval_status && change.approval_status !== 'approved' && (
                  <Badge variant="secondary" className="text-xs gap-1">
                    {change.approval_status === 'pending' && <AlertCircle className="w-3 h-3" />}
                    {change.approval_status === 'approved' && <CheckCircle className="w-3 h-3" />}
                    {change.approval_status}
                  </Badge>
                )}
                
                {change.is_reverted && (
                  <Badge variant="destructive" className="text-xs gap-1">
                    <Undo2 className="w-3 h-3" />
                    Reverted
                  </Badge>
                )}
                
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Calendar className="w-3 h-3" />
                  {format(new Date(change.created_at), 'MMM dd, yyyy HH:mm')}
                </div>
              </div>
              
              {(change.user_email || change.user_name) && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                  <User className="w-3 h-3" />
                  {change.user_name || change.user_email}
                </div>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2 ml-2">
            <Badge 
              variant={change.change_amount > 0 ? "default" : "destructive"} 
              className="font-mono whitespace-nowrap"
            >
              {change.change_amount > 0 ? '+' : ''}{change.change_amount}
            </Badge>
          </div>
        </div>
        
        {/* Quantities Grid */}
        <div className="grid grid-cols-3 gap-3 text-xs mb-2">
          <div>
            <span className="text-muted-foreground">Previous</span>
            <div className="font-semibold text-base">{change.previous_quantity}</div>
          </div>
          <div>
            <span className="text-muted-foreground">New</span>
            <div className="font-semibold text-base">{change.new_quantity}</div>
          </div>
          <div>
            <span className="text-muted-foreground">Reason</span>
            <div className="font-medium truncate" title={change.change_reason}>
              {change.change_reason}
            </div>
          </div>
        </div>

        {/* Quick Info Badges */}
        {(change.cost_per_unit || change.warehouse_location || change.tags?.length) && (
          <div className="flex flex-wrap gap-2 mb-2">
            {change.cost_per_unit && (
              <Badge variant="outline" className="text-xs gap-1">
                <DollarSign className="w-3 h-3" />
                ${change.cost_per_unit}
              </Badge>
            )}
            {change.warehouse_location && (
              <Badge variant="outline" className="text-xs gap-1">
                <MapPin className="w-3 h-3" />
                {change.warehouse_location}
              </Badge>
            )}
            {change.tags?.map(tag => (
              <Badge key={tag} variant="secondary" className="text-xs gap-1">
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
              <Button variant="ghost" size="sm" className="w-full h-7 text-xs">
                {isExpanded ? <ChevronUp className="w-3 h-3 mr-1" /> : <ChevronDown className="w-3 h-3 mr-1" />}
                {isExpanded ? 'Hide Details' : 'Show Details'}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2 pt-2 border-t">
              <div className="space-y-2 text-xs">
                {change.fulfillment_source && (
                  <div className="flex gap-2">
                    <Package className="w-4 h-4 text-muted-foreground shrink-0" />
                    <div className="flex-1">
                      <span className="text-muted-foreground">Source:</span>
                      <div className="font-medium">{change.fulfillment_source}</div>
                    </div>
                  </div>
                )}
                
                {change.notes && (
                  <div className="flex gap-2">
                    <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                    <div className="flex-1">
                      <span className="text-muted-foreground">Notes:</span>
                      <div className="text-sm">{change.notes}</div>
                    </div>
                  </div>
                )}
                
                {change.total_value && (
                  <div className="flex gap-2">
                    <DollarSign className="w-4 h-4 text-muted-foreground shrink-0" />
                    <div className="flex-1">
                      <span className="text-muted-foreground">Total Value:</span>
                      <div className="font-semibold">${change.total_value.toFixed(2)}</div>
                    </div>
                  </div>
                )}
                
                {change.metadata && Object.keys(change.metadata).length > 0 && (
                  <div className="bg-muted/50 rounded p-2 mt-2">
                    <div className="text-xs font-medium text-muted-foreground mb-1">Additional Data:</div>
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
                    className="w-full mt-2 h-8 text-xs gap-1"
                  >
                    <Undo2 className="w-3 h-3" />
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
