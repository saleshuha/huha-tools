import { useState } from 'react';
import { TableRow, TableCell } from '@/components/ui/table';
import { ChevronRight, Package, FileText, DollarSign, MapPin } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { StockChange } from './StockHistoryChangeCard';

const TYPE_CONFIG: Record<string, { label: string; className: string }> = {
  po_order: { label: 'PO', className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  manual: { label: 'Restock', className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
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
  isEven?: boolean;
}

export function StockLedgerRow({ change, runningBalance, isEven }: StockLedgerRowProps) {
  const [expanded, setExpanded] = useState(false);
  const typeInfo = TYPE_CONFIG[change.reference_type || ''] || TYPE_CONFIG.manual;
  const isPositive = change.change_amount > 0;
  const isNegative = change.change_amount < 0;
  
  const hasDetails = change.fulfillment_source || change.notes || change.metadata || 
                     change.cost_per_unit || change.warehouse_location;

  const userName = change.user_name || change.user_email || 'System';
  const userInitials = userName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  const truncatedReason = change.change_reason?.length > 30 
    ? change.change_reason.slice(0, 29) + '…' 
    : change.change_reason;

  const prevQty = change.previous_quantity ?? (change.new_quantity - change.change_amount);
  const newQty = change.new_quantity;
  const pctChange = prevQty !== 0 ? Math.round(((newQty - prevQty) / prevQty) * 100) : null;

  const relativeTime = formatDistanceToNow(new Date(change.created_at), { addSuffix: true });

  // Border color based on change direction
  const borderColor = isPositive
    ? 'border-l-emerald-500'
    : isNegative
    ? 'border-l-rose-500'
    : 'border-l-muted-foreground/30';

  return (
    <>
      <TableRow 
        className={cn(
          "cursor-pointer transition-colors text-xs border-l-[3px]",
          borderColor,
          isEven ? "bg-transparent" : "bg-muted/30",
          change.is_reverted && "opacity-50 line-through",
          "hover:bg-accent/50"
        )}
        onClick={() => hasDetails && setExpanded(!expanded)}
      >
        {/* Date */}
        <TableCell className="py-2 px-3 whitespace-nowrap">
          <div className="font-mono font-medium text-foreground">{format(new Date(change.created_at), 'MMM dd')}</div>
          <div className="text-[10px] text-muted-foreground">{relativeTime}</div>
        </TableCell>

        {/* User with avatar */}
        <TableCell className="py-2 px-3">
          <div className="flex items-center gap-1.5">
            <div className={cn(
              "w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold shrink-0",
              "bg-primary/10 text-primary"
            )}>
              {userInitials}
            </div>
            <span className="truncate max-w-[70px]" title={userName}>
              {userName.length > 10 ? userName.slice(0, 9) + '…' : userName}
            </span>
          </div>
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

        {/* Prev → New */}
        <TableCell className="py-2 px-3 text-center">
          <div className="flex items-center justify-center gap-1 font-mono text-[11px]">
            <span className="text-muted-foreground">{prevQty}</span>
            <span className="text-muted-foreground/50">→</span>
            <span className="font-semibold text-foreground">{newQty}</span>
          </div>
          {pctChange !== null && pctChange !== 0 && (
            <div className={cn(
              "text-[9px] font-semibold mt-0.5",
              pctChange > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
            )}>
              {pctChange > 0 ? '+' : ''}{pctChange}%
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
        <TableRow className="bg-muted/20 hover:bg-muted/20 border-l-[3px] border-l-primary/30">
          <TableCell colSpan={7} className="py-0 px-3">
            <div className="py-3 px-3">
              <div className="bg-card border border-border rounded-lg divide-y divide-border overflow-hidden">
                {change.fulfillment_source && (
                  <DetailRow icon={<Package className="w-3.5 h-3.5" />} label="Source" value={change.fulfillment_source} />
                )}
                {change.cost_per_unit && (
                  <DetailRow icon={<DollarSign className="w-3.5 h-3.5" />} label="Cost/Unit" value={`$${change.cost_per_unit}`}>
                    {change.total_value && (
                      <span className="text-muted-foreground ml-2">Total: ${change.total_value.toFixed(2)}</span>
                    )}
                  </DetailRow>
                )}
                {change.warehouse_location && (
                  <DetailRow icon={<MapPin className="w-3.5 h-3.5" />} label="Location" value={change.warehouse_location} />
                )}
                {change.notes && (
                  <DetailRow icon={<FileText className="w-3.5 h-3.5" />} label="Notes" value={change.notes} />
                )}
                {change.metadata && Object.keys(change.metadata).length > 0 && (
                  <div className="px-3 py-2.5">
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5 font-semibold">Metadata</div>
                    <pre className="text-[10px] overflow-auto max-h-24 font-mono bg-muted/50 rounded p-2">
                      {JSON.stringify(change.metadata, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

function DetailRow({ icon, label, value, children }: { icon: React.ReactNode; label: string; value: string; children?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2.5 px-3 py-2 text-xs">
      <span className="text-muted-foreground">{icon}</span>
      <span className="text-muted-foreground w-16 shrink-0 text-[10px] uppercase tracking-wider font-semibold">{label}</span>
      <span className="font-medium text-foreground">{value}</span>
      {children}
    </div>
  );
}
