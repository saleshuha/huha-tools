import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { TableRow, TableCell } from '@/components/ui/table';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronRight, Package, FileText, DollarSign, MapPin } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { StockChange } from './StockHistoryChangeCard';

const TYPE_CONFIG: Record<string, { label: string; className: string }> = {
  po_order: { label: 'PO', className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  manual: { label: 'B2B', className: 'bg-muted text-muted-foreground' },
  stock_receiving: { label: 'Received', className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
  sale: { label: 'Sale', className: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400' },
  restock: { label: 'Restock', className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
  return: { label: 'Return', className: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' },
  damage: { label: 'Damage', className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
  adjustment: { label: 'Adjust', className: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' },
};

interface StockLedgerRowProps {
  change: StockChange;
  runningBalance: number;
}

export function StockLedgerRow({ change, runningBalance }: StockLedgerRowProps) {
  const [expanded, setExpanded] = useState(false);
  const typeInfo = TYPE_CONFIG[change.reference_type || ''] || TYPE_CONFIG.manual;
  const isPositive = change.change_amount > 0;
  const isNegative = change.change_amount < 0;
  
  const hasDetails = change.fulfillment_source || change.notes || change.metadata || 
                     change.cost_per_unit || change.warehouse_location;

  const userName = change.user_name || change.user_email || 'System';
  const truncatedUser = userName.length > 12 ? userName.slice(0, 11) + '…' : userName;
  const truncatedReason = change.change_reason?.length > 30 
    ? change.change_reason.slice(0, 29) + '…' 
    : change.change_reason;

  return (
    <>
      <TableRow 
        className={cn(
          "cursor-pointer transition-colors text-xs",
          change.is_reverted && "opacity-50 line-through"
        )}
        onClick={() => hasDetails && setExpanded(!expanded)}
      >
        {/* Date */}
        <TableCell className="py-2 px-3 whitespace-nowrap font-mono text-muted-foreground">
          <div>{format(new Date(change.created_at), 'MMM dd')}</div>
          <div className="text-[10px]">{format(new Date(change.created_at), 'HH:mm')}</div>
        </TableCell>

        {/* User */}
        <TableCell className="py-2 px-3" title={userName}>
          {truncatedUser}
        </TableCell>

        {/* Type */}
        <TableCell className="py-2 px-3">
          <span className={cn(
            "inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide",
            typeInfo.className
          )}>
            {typeInfo.label}
          </span>
          {change.reference_number && (
            <div className="text-[10px] text-muted-foreground font-mono mt-0.5">
              {change.reference_number}
            </div>
          )}
        </TableCell>

        {/* Change */}
        <TableCell className={cn(
          "py-2 px-3 font-bold font-mono text-right",
          isPositive && "text-emerald-600 dark:text-emerald-400",
          isNegative && "text-rose-600 dark:text-rose-400",
          !isPositive && !isNegative && "text-muted-foreground"
        )}>
          {isPositive ? '+' : ''}{change.change_amount}
        </TableCell>

        {/* Balance */}
        <TableCell className="py-2 px-3 font-mono text-right font-medium">
          {runningBalance}
        </TableCell>

        {/* Reason */}
        <TableCell className="py-2 px-3 text-muted-foreground max-w-[200px]" title={change.change_reason}>
          <div className="flex items-center gap-1">
            <span className="truncate">{truncatedReason || '—'}</span>
            {hasDetails && (
              <ChevronRight className={cn(
                "w-3 h-3 shrink-0 transition-transform text-muted-foreground/50",
                expanded && "rotate-90"
              )} />
            )}
          </div>
        </TableCell>
      </TableRow>

      {/* Expanded details row */}
      {expanded && hasDetails && (
        <TableRow className="bg-muted/30 hover:bg-muted/30">
          <TableCell colSpan={6} className="py-3 px-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              {change.fulfillment_source && (
                <div className="flex items-start gap-1.5">
                  <Package className="w-3.5 h-3.5 text-muted-foreground mt-0.5" />
                  <div>
                    <div className="text-muted-foreground">Source</div>
                    <div className="font-medium">{change.fulfillment_source}</div>
                  </div>
                </div>
              )}
              {change.cost_per_unit && (
                <div className="flex items-start gap-1.5">
                  <DollarSign className="w-3.5 h-3.5 text-muted-foreground mt-0.5" />
                  <div>
                    <div className="text-muted-foreground">Cost/Unit</div>
                    <div className="font-medium">${change.cost_per_unit}</div>
                    {change.total_value && (
                      <div className="text-muted-foreground">Total: ${change.total_value.toFixed(2)}</div>
                    )}
                  </div>
                </div>
              )}
              {change.warehouse_location && (
                <div className="flex items-start gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-muted-foreground mt-0.5" />
                  <div>
                    <div className="text-muted-foreground">Location</div>
                    <div className="font-medium">{change.warehouse_location}</div>
                  </div>
                </div>
              )}
              {change.notes && (
                <div className="flex items-start gap-1.5 col-span-2">
                  <FileText className="w-3.5 h-3.5 text-muted-foreground mt-0.5" />
                  <div>
                    <div className="text-muted-foreground">Notes</div>
                    <div className="font-medium">{change.notes}</div>
                  </div>
                </div>
              )}
              {change.metadata && Object.keys(change.metadata).length > 0 && (
                <div className="col-span-full">
                  <div className="bg-muted/50 rounded p-2 mt-1">
                    <div className="text-muted-foreground mb-1">Metadata</div>
                    <pre className="text-[10px] overflow-auto max-h-24 font-mono">
                      {JSON.stringify(change.metadata, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}
