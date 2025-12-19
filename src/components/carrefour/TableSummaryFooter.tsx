import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Package, 
  DollarSign, 
  TrendingUp, 
  Receipt,
  CheckSquare,
  CreditCard,
  Truck,
  Download
} from "lucide-react";
import { CarrefourSalesOrder } from "@/types/carrefour";

interface TableSummaryFooterProps {
  visibleData: CarrefourSalesOrder[];
  selectedCount: number;
  selectedOrders: Set<string>;
  formatCurrency: (amount: number) => string;
  onBulkStatusUpdate?: (status: 'Delivered' | 'Shipped' | 'Returned' | 'Cancelled' | 'Other') => void;
  onBulkPaymentUpdate?: (status: 'Pending' | 'Received') => void;
  onExportSelected?: () => void;
}

export function TableSummaryFooter({
  visibleData,
  selectedCount,
  selectedOrders,
  formatCurrency,
  onBulkStatusUpdate,
  onBulkPaymentUpdate,
  onExportSelected,
}: TableSummaryFooterProps) {
  // Calculate summary metrics for visible data
  const summary = useMemo(() => {
    const dataToSummarize = selectedCount > 0 
      ? visibleData.filter(order => selectedOrders.has(order.id))
      : visibleData;

    return {
      count: dataToSummarize.length,
      revenue: dataToSummarize.reduce((sum, o) => sum + o.sale_value, 0),
      costs: dataToSummarize.reduce((sum, o) => sum + o.cost, 0),
      fees: dataToSummarize.reduce((sum, o) => sum + o.seller_fees, 0),
      profit: dataToSummarize.reduce((sum, o) => sum + o.profit, 0),
    };
  }, [visibleData, selectedCount, selectedOrders]);

  const isSelected = selectedCount > 0;

  return (
    <div className="sticky bottom-0 z-10 bg-background/95 backdrop-blur-sm border-t shadow-lg">
      <div className="flex flex-wrap items-center justify-between gap-4 px-4 py-3">
        {/* Summary Stats */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Badge variant={isSelected ? "default" : "secondary"} className="h-6">
              <Package className="h-3 w-3 mr-1" />
              {summary.count} {isSelected ? 'selected' : 'visible'}
            </Badge>
          </div>

          <div className="hidden sm:flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1.5 text-emerald-600">
              <DollarSign className="h-4 w-4" />
              <span className="font-medium">Revenue:</span>
              <span className="font-bold">{formatCurrency(summary.revenue)}</span>
            </div>
            
            <div className="h-4 w-px bg-border" />
            
            <div className="flex items-center gap-1.5 text-red-600">
              <Receipt className="h-4 w-4" />
              <span className="font-medium">Costs:</span>
              <span className="font-bold">{formatCurrency(summary.costs)}</span>
            </div>
            
            <div className="h-4 w-px bg-border" />
            
            <div className="flex items-center gap-1.5 text-blue-600">
              <TrendingUp className="h-4 w-4" />
              <span className="font-medium">Profit:</span>
              <span className="font-bold">{formatCurrency(summary.profit)}</span>
            </div>
          </div>
        </div>

        {/* Bulk Actions - Show only when items are selected */}
        {isSelected && (
          <div className="flex items-center gap-2">
            {onBulkStatusUpdate && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 gap-1.5 border-green-200 text-green-700 hover:bg-green-50"
                  onClick={() => onBulkStatusUpdate('Delivered')}
                >
                  <CheckSquare className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Delivered</span>
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 gap-1.5 border-cyan-200 text-cyan-700 hover:bg-cyan-50"
                  onClick={() => onBulkStatusUpdate('Shipped')}
                >
                  <Truck className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Shipped</span>
                </Button>
              </>
            )}
            
            {onBulkPaymentUpdate && (
              <Button
                size="sm"
                variant="outline"
                className="h-8 gap-1.5 border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                onClick={() => onBulkPaymentUpdate('Received')}
              >
                <CreditCard className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Mark Paid</span>
              </Button>
            )}

            {onExportSelected && (
              <Button
                size="sm"
                variant="outline"
                className="h-8 gap-1.5"
                onClick={onExportSelected}
              >
                <Download className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Export</span>
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
