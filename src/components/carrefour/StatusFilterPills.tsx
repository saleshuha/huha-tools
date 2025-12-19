import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Package, Truck, RotateCcw, XCircle, HelpCircle, CheckCircle, Clock } from "lucide-react";

interface StatusCounts {
  deliveredItems: number;
  shippedItems: number;
  returnedItems: number;
  cancelledItems: number;
  otherItems: number;
  totalPendingPayments: number;
  totalPaidPayments: number;
}

interface StatusFilterPillsProps {
  statusCounts: StatusCounts;
  activeFilter: string | null;
  onFilterChange: (filterType: string, title: string) => void;
}

const statusConfig = [
  {
    id: 'delivered',
    label: 'Delivered',
    countKey: 'deliveredItems' as keyof StatusCounts,
    icon: Package,
    activeClass: 'bg-green-600 text-white hover:bg-green-700 border-green-600',
    inactiveClass: 'border-green-200 text-green-700 hover:bg-green-50 dark:border-green-800 dark:text-green-400 dark:hover:bg-green-950',
    dotClass: 'bg-green-500',
  },
  {
    id: 'shipped',
    label: 'Shipped',
    countKey: 'shippedItems' as keyof StatusCounts,
    icon: Truck,
    activeClass: 'bg-cyan-600 text-white hover:bg-cyan-700 border-cyan-600',
    inactiveClass: 'border-cyan-200 text-cyan-700 hover:bg-cyan-50 dark:border-cyan-800 dark:text-cyan-400 dark:hover:bg-cyan-950',
    dotClass: 'bg-cyan-500',
  },
  {
    id: 'returned',
    label: 'Returned',
    countKey: 'returnedItems' as keyof StatusCounts,
    icon: RotateCcw,
    activeClass: 'bg-red-600 text-white hover:bg-red-700 border-red-600',
    inactiveClass: 'border-red-200 text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950',
    dotClass: 'bg-red-500',
  },
  {
    id: 'cancelled',
    label: 'Cancelled',
    countKey: 'cancelledItems' as keyof StatusCounts,
    icon: XCircle,
    activeClass: 'bg-gray-600 text-white hover:bg-gray-700 border-gray-600',
    inactiveClass: 'border-gray-200 text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-900',
    dotClass: 'bg-gray-500',
  },
  {
    id: 'other',
    label: 'Other',
    countKey: 'otherItems' as keyof StatusCounts,
    icon: HelpCircle,
    activeClass: 'bg-indigo-600 text-white hover:bg-indigo-700 border-indigo-600',
    inactiveClass: 'border-indigo-200 text-indigo-700 hover:bg-indigo-50 dark:border-indigo-800 dark:text-indigo-400 dark:hover:bg-indigo-950',
    dotClass: 'bg-indigo-500',
  },
];

const paymentConfig = [
  {
    id: 'pending',
    label: 'Pending',
    countKey: 'totalPendingPayments' as keyof StatusCounts,
    icon: Clock,
    activeClass: 'bg-orange-600 text-white hover:bg-orange-700 border-orange-600',
    inactiveClass: 'border-orange-200 text-orange-700 hover:bg-orange-50 dark:border-orange-800 dark:text-orange-400 dark:hover:bg-orange-950',
    dotClass: 'bg-orange-500',
  },
  {
    id: 'paid',
    label: 'Received',
    countKey: 'totalPaidPayments' as keyof StatusCounts,
    icon: CheckCircle,
    activeClass: 'bg-emerald-600 text-white hover:bg-emerald-700 border-emerald-600',
    inactiveClass: 'border-emerald-200 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-400 dark:hover:bg-emerald-950',
    dotClass: 'bg-emerald-500',
  },
];

export function StatusFilterPills({ statusCounts, activeFilter, onFilterChange }: StatusFilterPillsProps) {
  return (
    <div className="flex flex-wrap gap-4">
      {/* Order Status Pills */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Status:</span>
        {statusConfig.map((status) => {
          const isActive = activeFilter === status.id;
          const Icon = status.icon;
          const count = statusCounts[status.countKey];
          
          return (
            <button
              key={status.id}
              onClick={() => onFilterChange(status.id, `${status.label} Orders`)}
              className={cn(
                "inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-medium transition-all duration-200",
                isActive ? status.activeClass : status.inactiveClass
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{status.label}</span>
              <Badge 
                variant="secondary" 
                className={cn(
                  "h-5 min-w-[20px] px-1.5 text-xs font-bold",
                  isActive ? "bg-white/20 text-inherit" : "bg-muted"
                )}
              >
                {count}
              </Badge>
            </button>
          );
        })}
      </div>

      {/* Divider */}
      <div className="hidden sm:block w-px h-8 bg-border self-center" />

      {/* Payment Status Pills */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Payment:</span>
        {paymentConfig.map((payment) => {
          const isActive = activeFilter === payment.id;
          const Icon = payment.icon;
          const count = statusCounts[payment.countKey];
          
          return (
            <button
              key={payment.id}
              onClick={() => onFilterChange(payment.id, `${payment.label} Payments`)}
              className={cn(
                "inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-medium transition-all duration-200",
                isActive ? payment.activeClass : payment.inactiveClass
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{payment.label}</span>
              <Badge 
                variant="secondary" 
                className={cn(
                  "h-5 min-w-[20px] px-1.5 text-xs font-bold",
                  isActive ? "bg-white/20 text-inherit" : "bg-muted"
                )}
              >
                {count}
              </Badge>
            </button>
          );
        })}
      </div>

      {/* Clear Filter */}
      {activeFilter && (
        <button
          onClick={() => onFilterChange('all', 'All Orders')}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors self-center"
        >
          Clear filter
        </button>
      )}
    </div>
  );
}
