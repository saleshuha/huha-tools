import React from 'react';
import { Badge } from '@/components/ui/badge';
import { 
  AlertTriangle, Package, CheckCircle, Truck, Clock, AlertCircle, 
  PackageCheck, Timer, ShoppingCart, Wrench
} from 'lucide-react';

interface ItemStatusBadgeProps {
  status: string | number;
  isDelayed?: boolean;
  daysInStatus?: number;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  className?: string;
}

// Status configurations using semantic tokens
const statusConfig = {
  pending: { 
    label: 'Pending', 
    icon: Clock, 
    className: 'bg-warning/10 text-warning border-warning/20 hover:bg-warning/15' 
  },
  unpaid: { 
    label: 'Unpaid', 
    icon: AlertTriangle, 
    className: 'bg-warning/10 text-warning border-warning/20 hover:bg-warning/15' 
  },
  preparing: { 
    label: 'Preparing', 
    icon: Wrench, 
    className: 'bg-blue/10 text-blue border-blue/20 hover:bg-blue/15' 
  },
  ready_to_ship: { 
    label: 'Ready to Ship', 
    icon: PackageCheck, 
    className: 'bg-cyan/10 text-cyan border-cyan/20 hover:bg-cyan/15' 
  },
  delay_to_ship: { 
    label: 'Delay to Ship', 
    icon: Timer, 
    className: 'bg-orange/10 text-orange border-orange/20 hover:bg-orange/15' 
  },
  packed_to_ship: { 
    label: 'Packed to Ship', 
    icon: Package, 
    className: 'bg-indigo/10 text-indigo border-indigo/20 hover:bg-indigo/15' 
  },
  error: { 
    label: 'Error', 
    icon: AlertCircle, 
    className: 'bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/15' 
  },
  api_error: { 
    label: 'API Error', 
    icon: AlertCircle, 
    className: 'bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/15' 
  },
  ordered: { 
    label: 'Ordered', 
    icon: ShoppingCart, 
    className: 'bg-sky/10 text-sky border-sky/20 hover:bg-sky/15' 
  },
  paid: { 
    label: 'Paid', 
    icon: CheckCircle, 
    className: 'bg-primary/10 text-primary border-primary/20 hover:bg-primary/15' 
  },
  shipped: { 
    label: 'Shipped', 
    icon: Truck, 
    className: 'bg-teal/10 text-teal border-teal/20 hover:bg-teal/15' 
  },
  delivered: { 
    label: 'Delivered', 
    icon: CheckCircle, 
    className: 'bg-success/10 text-success border-success/20 hover:bg-success/15' 
  },
  cancelled: { 
    label: 'Cancelled', 
    icon: AlertCircle, 
    className: 'bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/15' 
  },
  out_of_stock: { 
    label: 'Out of Stock', 
    icon: AlertTriangle, 
    className: 'bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/15' 
  },
  delayed: { 
    label: 'Delayed', 
    icon: AlertTriangle, 
    className: 'bg-warning/10 text-warning border-warning/20 hover:bg-warning/15' 
  },
  // Numeric status mappings from Sunsky API
  '0': { 
    label: 'Unpaid', 
    icon: AlertTriangle, 
    className: 'bg-warning/10 text-warning border-warning/20 hover:bg-warning/15' 
  },
  '1': { 
    label: 'Ordered', 
    icon: ShoppingCart, 
    className: 'bg-sky/10 text-sky border-sky/20 hover:bg-sky/15' 
  },
  '2': { 
    label: 'Preparing', 
    icon: Wrench, 
    className: 'bg-blue/10 text-blue border-blue/20 hover:bg-blue/15' 
  },
  '3': { 
    label: 'Ready to Ship', 
    icon: PackageCheck, 
    className: 'bg-cyan/10 text-cyan border-cyan/20 hover:bg-cyan/15' 
  },
  '4': { 
    label: 'Paid', 
    icon: CheckCircle, 
    className: 'bg-primary/10 text-primary border-primary/20 hover:bg-primary/15' 
  },
  '5': { 
    label: 'Shipped', 
    icon: Truck, 
    className: 'bg-teal/10 text-teal border-teal/20 hover:bg-teal/15' 
  },
  '6': { 
    label: 'Delivered', 
    icon: CheckCircle, 
    className: 'bg-success/10 text-success border-success/20 hover:bg-success/15' 
  },
};

// Map Sunsky numeric status to readable text
const normalizeStatus = (status: string | number): string => {
  const statusStr = String(status);
  switch (statusStr) {
    case '0': return 'unpaid';
    case '1': return 'ordered';
    case '2': return 'preparing';
    case '3': return 'ready_to_ship';
    case '4': return 'paid';
    case '5': return 'shipped';
    case '6': return 'delivered';
    // Handle string-based statuses
    case 'delay to ship': return 'delay_to_ship';
    case 'packed to ship': return 'packed_to_ship';
    case 'ready to ship': return 'ready_to_ship';
    default: return statusStr.toLowerCase().replace(/\s+/g, '_');
  }
};

export function ItemStatusBadge({ 
  status, 
  isDelayed = false, 
  daysInStatus,
  size = 'md', 
  showIcon = true,
  className = ''
}: ItemStatusBadgeProps) {
  const normalizedStatus = normalizeStatus(status);
  const displayStatus = isDelayed ? 'delayed' : normalizedStatus;
  const config = statusConfig[displayStatus as keyof typeof statusConfig] || {
    label: String(status),
    icon: AlertCircle,
    className: 'bg-muted text-muted-foreground border-border'
  };

  const IconComponent = config.icon;

  const sizeClasses = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-2.5 py-1.5',
    lg: 'text-base px-3 py-2'
  };

  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-3.5 w-3.5',
    lg: 'h-4 w-4'
  };

  const displayLabel = isDelayed && daysInStatus 
    ? `Delayed (${daysInStatus}d)`
    : config.label;

  return (
    <Badge 
      className={`
        ${config.className} 
        ${sizeClasses[size]} 
        ${showIcon ? 'flex items-center gap-1.5' : ''} 
        ${className}
        transition-all duration-200 border font-medium
      `}
    >
      {showIcon && (
        <IconComponent className={iconSizes[size]} />
      )}
      {displayLabel}
    </Badge>
  );
}

export default ItemStatusBadge;