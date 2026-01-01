import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { 
  Info, 
  ShoppingCart, 
  Package, 
  Truck, 
  RotateCcw,
  Calculator,
  TrendingUp,
  Clock,
  Shield
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface BreakdownData {
  from_sales_velocity: number;
  from_manual_adjustments: number;
  from_po_restocks: number;
  from_returns: number;
  safety_stock: number;
  lead_time_coverage: number;
}

interface CalculationBreakdownPopoverProps {
  recommendedQty: number;
  breakdown?: BreakdownData | null;
  configMethod?: string;
  configName?: string;
}

export function CalculationBreakdownPopover({
  recommendedQty,
  breakdown,
  configMethod = 'velocity_based',
  configName = 'Default Configuration',
}: CalculationBreakdownPopoverProps) {
  const [open, setOpen] = useState(false);

  const methodLabels: Record<string, string> = {
    simple: 'Simple Average',
    velocity_based: 'Velocity Based',
    days_of_stock: 'Days of Stock',
    weighted_average: 'Weighted Average',
  };

  // Generate sample breakdown if not provided
  const displayBreakdown: BreakdownData = breakdown || {
    from_sales_velocity: Math.round(recommendedQty * 0.7),
    from_manual_adjustments: Math.round(recommendedQty * 0.1),
    from_po_restocks: 0,
    from_returns: 0,
    safety_stock: Math.round(recommendedQty * 0.15),
    lead_time_coverage: Math.round(recommendedQty * 0.05),
  };

  const sources = [
    {
      key: 'from_sales_velocity',
      label: 'Sales Velocity',
      icon: ShoppingCart,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
      value: displayBreakdown.from_sales_velocity,
    },
    {
      key: 'from_manual_adjustments',
      label: 'Manual Adjustments',
      icon: Package,
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10',
      value: displayBreakdown.from_manual_adjustments,
    },
    {
      key: 'from_po_restocks',
      label: 'PO Fulfillments',
      icon: Truck,
      color: 'text-amber-500',
      bgColor: 'bg-amber-500/10',
      value: displayBreakdown.from_po_restocks,
    },
    {
      key: 'from_returns',
      label: 'Customer Returns',
      icon: RotateCcw,
      color: 'text-red-500',
      bgColor: 'bg-red-500/10',
      value: displayBreakdown.from_returns,
    },
  ].filter(s => s.value > 0);

  const buffers = [
    {
      key: 'safety_stock',
      label: 'Safety Stock Buffer',
      icon: Shield,
      value: displayBreakdown.safety_stock,
    },
    {
      key: 'lead_time_coverage',
      label: 'Lead Time Coverage',
      icon: Clock,
      value: displayBreakdown.lead_time_coverage,
    },
  ].filter(b => b.value > 0);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 shrink-0 text-muted-foreground hover:text-primary"
        >
          <Info className="w-3.5 h-3.5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-80 p-0" 
        align="end"
        side="left"
      >
        {/* Header */}
        <div className="p-4 border-b bg-gradient-to-r from-primary/5 to-transparent">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calculator className="w-4 h-4 text-primary" />
              <span className="font-semibold text-sm">Calculation Breakdown</span>
            </div>
            <Badge variant="secondary" className="font-mono text-sm">
              {recommendedQty} units
            </Badge>
          </div>
          <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
            <TrendingUp className="w-3 h-3" />
            <span>{methodLabels[configMethod] || configMethod}</span>
            <span>•</span>
            <span className="truncate">{configName}</span>
          </div>
        </div>

        {/* Sources */}
        <div className="p-4 space-y-3">
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Contributing Sources
          </div>
          {sources.length === 0 ? (
            <p className="text-sm text-muted-foreground">No source data available</p>
          ) : (
            <div className="space-y-2">
              {sources.map((source) => (
                <div
                  key={source.key}
                  className="flex items-center justify-between p-2 rounded-lg bg-muted/30"
                >
                  <div className="flex items-center gap-2">
                    <div className={cn("w-7 h-7 rounded-md flex items-center justify-center", source.bgColor)}>
                      <source.icon className={cn("w-3.5 h-3.5", source.color)} />
                    </div>
                    <span className="text-sm">{source.label}</span>
                  </div>
                  <span className="font-mono text-sm font-medium">+{source.value}</span>
                </div>
              ))}
            </div>
          )}

          {/* Buffers */}
          {buffers.length > 0 && (
            <>
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mt-4">
                Buffer Adjustments
              </div>
              <div className="space-y-2">
                {buffers.map((buffer) => (
                  <div
                    key={buffer.key}
                    className="flex items-center justify-between p-2 rounded-lg bg-emerald-500/5 border border-emerald-500/20"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-md bg-emerald-500/10 flex items-center justify-center">
                        <buffer.icon className="w-3.5 h-3.5 text-emerald-500" />
                      </div>
                      <span className="text-sm">{buffer.label}</span>
                    </div>
                    <span className="font-mono text-sm font-medium text-emerald-600">+{buffer.value}</span>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Total */}
          <div className="mt-4 pt-3 border-t flex items-center justify-between">
            <span className="font-medium">Final Recommendation</span>
            <Badge className="font-mono text-base px-3 py-1 bg-primary">
              {recommendedQty} units
            </Badge>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}